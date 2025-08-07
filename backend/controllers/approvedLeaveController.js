// Controller for handling approved leaves with separate table
const db = require('../db');
const moment = require('moment');

// Add an approved leave for an employee on a specific date
const addApprovedLeave = async (req, res) => {
  try {
    const { employee_id, date, approved_by, reason } = req.body;
    
    if (!employee_id || !date) {
      return res.status(400).json({ 
        success: false, 
        message: 'Employee ID and date are required' 
      });
    }

    // Check if employee exists and user has access
    const { buildOfficeFilter } = require('../middleware/auth');
    const { whereClause, params } = buildOfficeFilter(req, 'e');
    
    let employeeQuery = 'SELECT employeeId FROM employees e WHERE employeeId = ?';
    let queryParams = [employee_id];
    
    if (whereClause) {
      employeeQuery += ` AND ${whereClause}`;
      queryParams.push(...params);
    }
    
    const [empRows] = await db.query(employeeQuery, queryParams);
    if (empRows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Employee not found or access denied' 
      });
    }

    // Insert or update approved leave
    await db.query(
      `INSERT INTO approved_leaves (employee_id, date, approved_by, reason) 
       VALUES (?, ?, ?, ?) 
       ON DUPLICATE KEY UPDATE 
         approved_by = VALUES(approved_by), 
         reason = VALUES(reason), 
         updated_at = NOW()`,
      [employee_id, date, approved_by || null, reason || null]
    );

    res.json({ 
      success: true, 
      message: 'Approved leave added successfully',
      data: { employee_id, date, approved_by, reason }
    });
  } catch (err) {
    console.error('Error adding approved leave:', err.message);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to add approved leave: ' + err.message 
    });
  }
};

// Remove an approved leave
const removeApprovedLeave = async (req, res) => {
  try {
    const { employee_id, date } = req.body;
    
    if (!employee_id || !date) {
      return res.status(400).json({ 
        success: false, 
        message: 'Employee ID and date are required' 
      });
    }

    const [result] = await db.query(
      'DELETE FROM approved_leaves WHERE employee_id = ? AND date = ?',
      [employee_id, date]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Approved leave record not found' 
      });
    }

    res.json({ 
      success: true, 
      message: 'Approved leave removed successfully' 
    });
  } catch (err) {
    console.error('Error removing approved leave:', err.message);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to remove approved leave: ' + err.message 
    });
  }
};

// Get approved leaves for an employee in a specific month
const getApprovedLeaves = async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { year, month } = req.query;
    
    if (!year || !month) {
      return res.status(400).json({ 
        success: false, 
        message: 'Year and month are required' 
      });
    }

    // Check office access
    const { buildOfficeFilter } = require('../middleware/auth');
    const { whereClause, params } = buildOfficeFilter(req, 'e');
    
    let sql = `
      SELECT al.date, al.approved_by, al.reason, al.created_at
      FROM approved_leaves al
      INNER JOIN employees e ON al.employee_id = e.employeeId
      WHERE al.employee_id = ? AND YEAR(al.date) = ? AND MONTH(al.date) = ?
    `;
    let queryParams = [employeeId, year, month];
    
    if (whereClause) {
      sql += ` AND ${whereClause}`;
      queryParams.push(...params);
    }
    
    sql += ` ORDER BY al.date`;
    
    const [rows] = await db.query(sql, queryParams);
    
    res.json({ 
      success: true, 
      data: rows.map(row => ({
        ...row,
        date: moment(row.date).format('YYYY-MM-DD')
      }))
    });
  } catch (err) {
    console.error('Error fetching approved leaves:', err.message);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch approved leaves: ' + err.message 
    });
  }
};

// Calculate approved leaves count for payroll (internal function)
const calculateApprovedLeavesCount = async (employeeId, year, month) => {
  try {
    const [rows] = await db.query(
      'SELECT COUNT(*) as count FROM approved_leaves WHERE employee_id = ? AND YEAR(date) = ? AND MONTH(date) = ?',
      [employeeId, year, month]
    );
    return rows[0].count;
  } catch (err) {
    console.error('Error calculating approved leaves count:', err.message);
    return 0;
  }
};

// Enhanced function to calculate payroll metrics with approved leaves
const calculatePayrollWithApprovedLeaves = async (employeeId, attendanceRecords, year, month) => {
  try {
    // Get approved leaves for this employee and month
    const approvedLeavesCount = await calculateApprovedLeavesCount(employeeId, year, month);
    
    // Get approved leave dates
    const [approvedLeaveDates] = await db.query(
      'SELECT date FROM approved_leaves WHERE employee_id = ? AND YEAR(date) = ? AND MONTH(date) = ?',
      [employeeId, year, month]
    );
    
    const approvedDates = new Set(
      approvedLeaveDates.map(row => moment(row.date).format('YYYY-MM-DD'))
    );
    
    // Calculate absent streak excluding approved leaves
    let consecutiveAbsents = 0;
    let excessLeaves = 0;
    let normalAbsents = 0;
    
    // Sort attendance records by date
    const sortedRecords = attendanceRecords.sort((a, b) => 
      moment(a.date).diff(moment(b.date))
    );
    
    for (const record of sortedRecords) {
      const dateStr = moment(record.date).format('YYYY-MM-DD');
      const isAbsent = !record.punch_in && !record.punch_out;
      const isApprovedLeave = approvedDates.has(dateStr);
      
      if (isAbsent && !isApprovedLeave) {
        consecutiveAbsents++;
        normalAbsents++;
        
        // After 2 consecutive absents, mark as excess leave
        if (consecutiveAbsents > 2) {
          excessLeaves++;
          normalAbsents--; // Remove from normal absents as it's now excess
        }
      } else {
        // Reset consecutive absent count if present or approved leave
        consecutiveAbsents = 0;
      }
    }
    
    return {
      approvedLeavesCount,
      normalAbsents,
      excessLeaves
    };
  } catch (err) {
    console.error('Error calculating payroll with approved leaves:', err.message);
    return {
      approvedLeavesCount: 0,
      normalAbsents: 0,
      excessLeaves: 0
    };
  }
};

module.exports = {
  addApprovedLeave,
  removeApprovedLeave,
  getApprovedLeaves,
  calculateApprovedLeavesCount,
  calculatePayrollWithApprovedLeaves
};
