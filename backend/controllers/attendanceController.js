const db = require('../db');
const XLSX = require('xlsx');
const axios = require('axios');

// Helper function to get user's office names
async function getUserOfficeNames(req) {
  if (!req.userOffices || req.userOffices.length === 0) {
    return [];
  }
  
  try {
    const placeholders = req.userOffices.map(() => '?').join(',');
    const [offices] = await db.query(
      `SELECT name FROM offices WHERE id IN (${placeholders})`,
      req.userOffices
    );
    return offices.map(office => office.name);
  } catch (error) {
    console.error('Error fetching office names:', error);
    return [];
  }
}

// Helper: Convert Excel serial date to YYYY-MM-DD
function excelDateToJSDate(serial) {
  // Excel dates are 1-based, JavaScript dates are 0-based, and Excel's epoch is 1900-01-01
  const utcDays = Math.floor(serial - 1);
  const utcValue = utcDays * 86400 * 1000;
  const date = new Date(utcValue);
  // Handle Excel's leap year bug (1900 is not a leap year, but Excel thinks it is)
  if (serial >= 60) {
    date.setUTCDate(date.getUTCDate() + 1);
  }
  return date;
}

// Improved robust date formatter
function formatDateForDB(date) {
  if (!date) return null;

  if (typeof date === 'string') {
    if (/^\d{4}-\d{2}-\d{2}$/.test(date)) return date;

    // Support MM/DD/YY or M/D/YY or MM/DD/YYYY formats
    const mdy = /^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/.exec(date);
    if (mdy) {
      let [_, mm, dd, yy] = mdy;
      mm = mm.padStart(2, '0');
      dd = dd.padStart(2, '0');
      // Handle two-digit year as 20xx (assume 2000-2099 window)
      if (yy.length === 2) {
        yy = parseInt(yy, 10);
        yy = (yy < 50) ? (2000 + yy) : (1900 + yy);
      } else {
        yy = parseInt(yy, 10);
      }
      return `${yy}-${mm}-${dd}`;
    }

    // Try Date parser as fallback (for eg. MM-DD-YYYY, etc.)
    const parsedDate = new Date(date);
    if (!isNaN(parsedDate.getTime())) {
      return parsedDate.toISOString().split('T')[0];
    }
    return null;
  }

  if (typeof date === 'number' && date > 59 && date < 60000) {
    // Excel serial number conversion
    const jsDate = excelDateToJSDate(date);
    return jsDate.toISOString().split('T')[0];
  }

  if (date instanceof Date && !isNaN(date)) {
    return date.toISOString().split('T')[0];
  }

  // Unsupported format
  return null;
}




exports.upload = async (req, res) => {
  console.log('[Attendance] Upload endpoint hit. File:', req.file?.originalname);
  if (!req.file) {
    console.error('[Attendance] No file uploaded');
    return res.status(400).json({ success: false, message: 'No file uploaded' });
  }

  try {
    console.log('[Attendance] Reading Excel file:', req.file.path);
    const workbook = XLSX.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];
    console.log('[Attendance] Sheet name:', sheetName);

    const data = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {
      raw: false,       
      dateNF: 'yyyy-mm-dd'
    });
    console.log('[Attendance] First row of data:', data[0]);

    const requiredColumns = ['EmployeeID', 'Date', 'Punch In', 'Punch Out'];
    if (data[0]) {
      console.log('[Attendance] Checking for required columns:', requiredColumns);
      for (const col of requiredColumns) {
        if (!(col in data[0])) {
          console.error(`[Attendance] Missing required column: ${col}`);
          throw new Error(`Required column \"${col}\" not found in Excel file`);
        }
      }
    } else {
      console.error('[Attendance] Excel file has no data rows');
      throw new Error('Excel file has no data');
    }

    // Get employees from user's accessible offices
    const { buildOfficeFilter } = require('../middleware/auth');
    const { whereClause, params } = buildOfficeFilter(req, 'e');
    
    let employeeQuery = 'SELECT e.employeeId, e.office_id FROM employees e';
    if (whereClause) {
      employeeQuery += ` WHERE ${whereClause}`;
    }
    
    const [accessibleEmployees] = await db.query(employeeQuery, params);
    const accessibleEmployeeMap = new Map(accessibleEmployees.map(emp => [emp.employeeId, emp.office_id]));

    const validRecords = [];
    const invalidEmployeeIds = new Set();
    const unauthorizedEmployeeIds = new Set();
    const nonWorkingDayRecords = [];

    for (const row of data) {
      const employeeId = row['EmployeeID'];

      if (!accessibleEmployeeMap.has(employeeId)) {
        if (!invalidEmployeeIds.has(employeeId)) {
          unauthorizedEmployeeIds.add(employeeId);
        }
        continue;
      }

      const dateStr = formatDateForDB(row.Date);
      if (!dateStr || dateStr === '1970-01-01' || dateStr === '0000-00-00') {
        console.log(`[Attendance] Skipping row: Invalid date for employee ${employeeId}`, row.Date);
        continue;
      }

      // Holiday/Sunday validation
      try {
        const recordDate = new Date(dateStr);
        const year = recordDate.getFullYear();
        const month = recordDate.getMonth() + 1;
        const { data: holidaysData } = await axios.get(`http://127.0.0.1:${process.env.PORT || 5000}/api/holidays/working-days`, { params: { year, month } });
        const workingDays = new Set(holidaysData.days || []);
        
        if (!workingDays.has(dateStr)) {
          nonWorkingDayRecords.push({ EmployeeID: employeeId, Date: dateStr });
          continue;
        }
      } catch (holidayError) {
        console.warn(`[Attendance] Could not validate working days for ${dateStr}:`, holidayError.message);
        // Continue with upload if holiday service is unavailable
      }

      validRecords.push({
        employee_id: employeeId,
        date: dateStr,
        punch_in: row['Punch In'] || null,
        punch_out: row['Punch Out'] || null,
      });
    }

    // Check for holiday/Sunday violations after processing all records
    if (nonWorkingDayRecords.length > 0) {
      const recordsList = nonWorkingDayRecords.map(r => `Employee ${r.EmployeeID} on ${r.Date}`).join(', ');
      const errorMessage = `❌ You cannot upload attendance data for holidays or Sundays. Please remove the following records from your file: ${recordsList}. Only working days are allowed for attendance uploads.`;
      console.log(`[Attendance] ${errorMessage}`);
      return res.status(400).json({ success: false, message: errorMessage });
    }

    if (unauthorizedEmployeeIds.size > 0) {
      const unauthorizedList = Array.from(unauthorizedEmployeeIds).join(', ');
      const userOfficeNames = await getUserOfficeNames(req);
      const officeNamesText = userOfficeNames.length > 0 ? userOfficeNames.join(' and ') : 'your assigned offices';
      
      const message = `Access Denied: You can only upload attendance data for employees in ${officeNamesText}. The following Employee IDs are from other offices: ${unauthorizedList}. Please remove these employees from your file or contact your administrator for access.`;
      console.log(`[Attendance] ${message}`);
      return res.status(403).json({
        success: false,
        message,
        unauthorizedEmployeeIds: Array.from(unauthorizedEmployeeIds)
      });
    }

    if (validRecords.length === 0) {
      throw new Error('No valid records found after validation');
    }

    await db.query(
      'INSERT INTO attendance (employee_id, date, punch_in, punch_out) VALUES ?',
      [validRecords.map(r => [r.employee_id, r.date, r.punch_in, r.punch_out])]
    );

    res.json({ success: true, message: 'Attendance data uploaded successfully', recordsProcessed: validRecords.length });
  } catch (err) {
    console.error('[Attendance] Upload failed:', err.message, err.stack);
    res.status(500).json({ success: false, message: 'Upload failed: ' + err.message });
  }
};

exports.getAll = async (req, res) => {
  try {
    const { buildOfficeFilter } = require('../middleware/auth');
    const { whereClause, params } = buildOfficeFilter(req, 'e');
    
    let sql = `SELECT a.* FROM attendance a INNER JOIN employees e ON a.employee_id = e.employeeId`;
    if (whereClause) {
      sql += ` WHERE ${whereClause}`;
    }
    
    const [rows] = await db.query(sql, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getByEmployee = async (req, res) => {
  try {
    const { buildOfficeFilter } = require('../middleware/auth');
    const { whereClause, params } = buildOfficeFilter(req, 'e');
    
    let sql = `SELECT a.* FROM attendance a INNER JOIN employees e ON a.employee_id = e.employeeId WHERE a.employee_id = ?`;
    let qParams = [req.params.employeeId, ...params];
    
    if (whereClause) {
      sql += ` AND ${whereClause}`;
    }
    
    const [rows] = await db.query(sql, qParams);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.filterByDate = async (req, res) => {
  const { start, end } = req.query;
  try {
    const { buildOfficeFilter } = require('../middleware/auth');
    const { whereClause, params } = buildOfficeFilter(req, 'e');
    
    let sql = `SELECT a.* FROM attendance a INNER JOIN employees e ON a.employee_id = e.employeeId WHERE a.date BETWEEN ? AND ?`;
    let qParams = [start, end, ...params];
    
    if (whereClause) {
      sql += ` AND ${whereClause}`;
    }
    
    const [rows] = await db.query(sql, qParams);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


// attendance.controller.js  (append to existing file)
// ------------------------------------------------------------------
// CREATE / UPSERT  ─ POST /api/attendance
exports.createOrUpdate = async (req, res) => {
  const { employee_id, date, punch_in, punch_out } = req.body;

  if (!employee_id || !date) {
    return res.status(400).json({ message: 'employee_id and date are required' });
  }

  try {
    // Holiday/Sunday validation
    try {
      const recordDate = new Date(date);
      const year = recordDate.getFullYear();
      const month = recordDate.getMonth() + 1;
      const { data: holidaysData } = await axios.get(`http://127.0.0.1:${process.env.PORT || 5000}/api/holidays/working-days`, { params: { year, month } });
      const workingDays = new Set(holidaysData.days || []);
      
      if (!workingDays.has(date)) {
        return res.status(400).json({ 
          message: '❌ You cannot add attendance data for holidays or Sundays. Only working days are allowed for attendance records.' 
        });
      }
    } catch (holidayError) {
      console.warn(`[Attendance] Could not validate working days for ${date}:`, holidayError.message);
      // Continue with creation if holiday service is unavailable
    }

    // Check office access
    const { buildOfficeFilter } = require('../middleware/auth');
    const { whereClause, params } = buildOfficeFilter(req, 'e');
    
    let employeeQuery = 'SELECT e.employeeId FROM employees e WHERE e.employeeId = ?';
    let queryParams = [employee_id];
    
    if (whereClause) {
      employeeQuery += ` AND ${whereClause}`;
      queryParams.push(...params);
    }
    
    const [empRows] = await db.query(employeeQuery, queryParams);
    if (empRows.length === 0) {
      return res.status(404).json({ message: 'Employee not found or access denied' });
    }

    // MySQL 8.0+: upsert with ON DUPLICATE KEY UPDATE
    await db.query(
      `INSERT INTO attendance (employee_id, date, punch_in, punch_out)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         punch_in  = VALUES(punch_in),
         punch_out = VALUES(punch_out)`,
      [employee_id, date, punch_in, punch_out]
    );

    // Fetch the freshly-inserted/updated row
    const [rows] = await db.query(
      'SELECT * FROM attendance WHERE employee_id = ? AND date = ?',
      [employee_id, date]
    );

    res.json({ success: true, data: rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};

// READ ONE ─ GET /api/attendance/:employeeId/:date
exports.getOne = async (req, res) => {
  const { employeeId, date } = req.params;
  try {
    const { buildOfficeFilter } = require('../middleware/auth');
    const { whereClause, params } = buildOfficeFilter(req, 'e');
    
    let sql = `SELECT a.* FROM attendance a INNER JOIN employees e ON a.employee_id = e.employeeId WHERE a.employee_id = ? AND a.date = ?`;
    let queryParams = [employeeId, date];
    
    if (whereClause) {
      sql += ` AND ${whereClause}`;
      queryParams.push(...params);
    }
    
    const [rows] = await db.query(sql, queryParams);
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Attendance record not found or access denied' });
    }
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// UPDATE ─ PUT /api/attendance/:employeeId/:date
exports.update = async (req, res) => {
  const { employeeId, date } = req.params;
  const { punch_in, punch_out } = req.body;

  try {
    const [result] = await db.query(
      `UPDATE attendance
         SET punch_in = ?, punch_out = ?
       WHERE employee_id = ? AND date = ?`,
      [punch_in, punch_out, employeeId, date]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Record not found' });
    }
    const [rows] = await db.query(
      'SELECT * FROM attendance WHERE employee_id = ? AND date = ?',
      [employeeId, date]
    );
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// DELETE ─ DELETE /api/attendance/:employeeId/:date
exports.remove = async (req, res) => {
  const { employeeId, date } = req.params;
  try {
    const [result] = await db.query(
      'DELETE FROM attendance WHERE employee_id = ? AND date = ?',
      [employeeId, date]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Record not found' });
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};