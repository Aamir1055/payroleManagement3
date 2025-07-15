const db = require('../db');

// Create attendance table if it doesn't exist
const createAttendanceTable = async () => {
  const createAttendanceTableQuery = `
    CREATE TABLE IF NOT EXISTS Attendance (
      id INT PRIMARY KEY AUTO_INCREMENT,
      employee_id VARCHAR(10) NOT NULL,
      date DATE NOT NULL,
      punch_in TIME,
      punch_out TIME,
      status ENUM('present', 'absent', 'half_day', 'late') DEFAULT 'present',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY unique_employee_date (employee_id, date),
      FOREIGN KEY (employee_id) REFERENCES Employees(employee_id) ON DELETE CASCADE
    )
  `;

  try {
    await db.query(createAttendanceTableQuery);
  } catch (err) {
    console.error('Error creating Attendance table:', err);
  }
};

// Initialize attendance table
createAttendanceTable();

exports.generatePayrollReport = async (req, res) => {
  try {
    const { month, year } = req.query;
    if (!month || !year) {
      return res.status(400).json({ error: 'Month and year are required' });
    }

    const monthNum = parseInt(month, 10);
    const yearNum = parseInt(year, 10);
    const daysInMonth = new Date(yearNum, monthNum, 0).getDate();
    const startDate = `${yearNum}-${String(monthNum).padStart(2, '0')}-01`;
    const endDate = `${yearNum}-${String(monthNum).padStart(2, '0')}-${daysInMonth}`;
    const totalWorkingDays = 26;

    const sql = `
      SELECT 
        e.employeeId,
        e.name,
        o.name as office,
        p.title as position,
        e.monthlySalary as monthlySalary,
        op.duty_hours as dutyHours,
        op.reporting_time as reportingTime,
        3 as allowedLateDays,
        COUNT(a.date) AS presentDays,
        SUM(CASE 
          WHEN a.punch_in IS NOT NULL AND TIME(a.punch_in) > op.reporting_time THEN 1
          ELSE 0
        END) AS lateDays
      FROM Employees e
      LEFT JOIN Offices o ON e.office_id = o.id
      LEFT JOIN Positions p ON e.position_id = p.id
      LEFT JOIN OfficePositions op ON e.office_id = op.office_id AND e.position_id = op.position_id
      LEFT JOIN Attendance a ON e.employeeId= a.employee_id 
        AND a.date BETWEEN ? AND ?
        
      WHERE e.status = 1
      GROUP BY e.employeeId
    `;

    const [rows] = await db.query(sql, [startDate, endDate]);

    const report = rows.map(emp => {
      const perDaySalary = emp.monthlySalary / totalWorkingDays;
      const presentDays = emp.presentDays || 0;
      const absentDays = totalWorkingDays - presentDays;
      const lateDays = emp.lateDays || 0;
      const allowedLateDays = emp.allowedLateDays || 3;

      const extraLateDays = Math.max(0, lateDays - allowedLateDays);
      const halfDays = extraLateDays;

      const leaves = absentDays;
      let leaveDeduction = 0;
      if (leaves <= 2) {
        leaveDeduction = leaves * perDaySalary;
      } else {
        const excessLeaves = leaves - 2;
        leaveDeduction = (2 * perDaySalary) + (excessLeaves * 2 * perDaySalary);
      }

      const halfDayDeduction = halfDays * (perDaySalary / 2);
      const totalDeductions = leaveDeduction + halfDayDeduction;
      const netSalary = emp.monthlySalary - totalDeductions;

      return {
        employeeId: emp.employee_id,
        name: emp.name,
        office: emp.office || 'N/A',
        position: emp.position || 'N/A',
        monthlySalary: Number(emp.monthlySalary).toFixed(2),
        presentDays,
        absentDays,
        lateDays,
        allowedLateDays,
        halfDays,
        leaves,
        perDaySalary: perDaySalary.toFixed(2),
        leaveDeduction: leaveDeduction.toFixed(2),
        halfDayDeduction: halfDayDeduction.toFixed(2),
        deductions: totalDeductions.toFixed(2),
        netSalary: netSalary.toFixed(2)
      };
    });

    res.status(200).json(report);
  } catch (err) {
    res.status(500).json({ error: 'Internal server error', details: err.message });
  }
};

exports.getPayrollSummary = async (req, res) => {
  try {
    const { month, year } = req.query;
    if (!month || !year) {
      return res.status(400).json({ error: 'Month and year are required' });
    }

    const sql = `
      SELECT 
        COUNT(*) as totalEmployees,
        SUM(e.salary) as totalMonthlySalary,
        COUNT(DISTINCT o.id) as totalOffices
      FROM Employees e
      LEFT JOIN Offices o ON e.office_id = o.id
      WHERE e.status = 1
    `;

    const [results] = await db.query(sql);
    const summary = results[0];

    res.json({
      totalEmployees: summary.totalEmployees || 0,
      totalMonthlySalary: Number(summary.totalMonthlySalary || 0).toFixed(2),
      totalOffices: summary.totalOffices || 0,
      month: parseInt(month, 10),
      year: parseInt(year, 10)
    });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error', details: err.message });
  }
};

exports.savePayroll = async (req, res) => {
  const { payrollData } = req.body;

  if (!payrollData || !Array.isArray(payrollData)) {
    return res.status(400).json({ error: 'Invalid payroll data' });
  }

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    for (const record of payrollData) {
      const {
        employeeId, month, year, presentDays, halfDays, lateDays,
        leaves, deductions, netSalary, monthlySalary
      } = record;

      const insertQuery = `
        INSERT INTO Payroll 
        (employee_id, month, year, present_days, half_days, late_days, leaves, 
         deductions, gross_salary, net_salary, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'calculated')
        ON DUPLICATE KEY UPDATE
          present_days = VALUES(present_days),
          half_days = VALUES(half_days),
          late_days = VALUES(late_days),
          leaves = VALUES(leaves),
          deductions = VALUES(deductions),
          gross_salary = VALUES(gross_salary),
          net_salary = VALUES(net_salary),
          status = 'calculated'
      `;

      await connection.query(insertQuery, [
        employeeId, month, year, presentDays, halfDays, lateDays,
        leaves, deductions, monthlySalary, netSalary
      ]);
    }

    await connection.commit();
    res.json({ 
      message: 'Payroll data saved successfully',
      recordsSaved: payrollData.length
    });
  } catch (err) {
    await connection.rollback();
    res.status(500).json({ error: 'Failed to save payroll data', details: err.message });
  } finally {
    connection.release();
  }
};
