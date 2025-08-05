// payrollController.js
console.log("==> payrollController.js loaded");

const db = require('../db');
const moment = require('moment');
const axios = require('axios');

// Configure moment to use consistent timezone handling
moment.suppressDeprecationWarnings = true;

// Utility function for consistent date formatting
const formatDateForDB = (date) => {
  if (!date) return null;
  return moment(date).format('YYYY-MM-DD');
};

// Utility function for safe database transactions
const executeTransaction = async (operations) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const results = [];
    for (const operation of operations) {
      const result = await connection.query(operation.sql, operation.params);
      results.push(result);
    }
    await connection.commit();
    return results;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

/* ------------------------------------------------------------------
   Fetch working-days for a month as COUNT or as ARRAY (dates)
------------------------------------------------------------------ */
const fetchWorkingDaysCount = async (year, month) => {
  try {
    const { data } = await axios.get(
      `http://localhost:${process.env.PORT || 5000}/api/holidays/working-days`,
      { params: { year, month } }
    );
    return data.workingDays ?? 26;
  } catch (e) {
    console.error('Could not fetch working-days', e.message);
    return 26;
  }
};

const fetchWorkingDaysArray = async (year, month) => {
  try {
    // Input validation
    const yearNum = parseInt(year, 10);
    const monthNum = parseInt(month, 10);
    if (isNaN(yearNum) || isNaN(monthNum) || yearNum < 2000 || yearNum > 2100 || monthNum < 1 || monthNum > 12) {
      throw new Error(`Invalid year (${year}) or month (${month})`);
    }

    const { data } = await axios.get(
      `http://localhost:${process.env.PORT || 5000}/api/holidays/working-days`,
      { params: { year: yearNum, month: monthNum }, timeout: 5000 }
    );
    
    if (Array.isArray(data.days)) return data.days;
    
    // Generate fallback working days (exclude Sundays)
    const fallback = [];
    const daysInMonth = moment({ year: yearNum, month: monthNum - 1 }).daysInMonth();
    
    for (let d = 1; d <= daysInMonth; d++) {
      const date = moment({ year: yearNum, month: monthNum - 1, day: d });
      // Skip Sundays (day 0)
      if (date.day() !== 0) {
        fallback.push(date.format('YYYY-MM-DD'));
      }
    }
    return fallback;
  } catch (e) {
    console.error('Could not fetch working-days', e.message);
    // Return empty array to prevent processing with invalid data
    throw new Error(`Holiday service unavailable: ${e.message}`);
  }
};

/* ------------------------------------------------------------------
   Employee timing config
------------------------------------------------------------------ */
const getEmployeeTimingConfig = async (employee) => {
  if (!employee.office_id || !employee.position_id) {
    return { duty_hours: 8, reporting_time: '09:00:00' };
  }
  const [rows] = await db.query(
    `SELECT reporting_time, duty_hours
     FROM office_positions
     WHERE office_id = ? AND position_id = ?
     LIMIT 1`,
    [employee.office_id, employee.position_id]
  );
  return {
    reporting_time: rows[0]?.reporting_time || '09:00:00',
    duty_hours: parseFloat(rows[0]?.duty_hours) || 8
  };
};

/* ------------------------------------------------------------------
   Attendance metrics (fully fixed for absent/excess rule)
------------------------------------------------------------------ */
const calculateAttendanceMetrics = async (employee, attRecords, workingDays) => {
  const { duty_hours, reporting_time } = await getEmployeeTimingConfig(employee);
  const dutyMinutes = Math.round(Number(duty_hours) * 60);
  const repMoment = moment(reporting_time, ['HH:mm:ss', 'HH:mm']);

  let presentDays = 0, halfDays = 0, lateDays = 0;
  let dayStatus = [];
  let lateRecords = []; // Track late records separately to avoid index issues

  // Sort records by date for consistent processing
  const sortedRecords = attRecords.slice().sort((a, b) => moment(a.date).diff(moment(b.date)));

  // Process each attendance record
  for (const rec of sortedRecords) {
    const punchInStr = rec.punch_in?.toString().trim();
    const punchOutStr = rec.punch_out?.toString().trim();
    
    // Validate punch times with multiple formats
    const punchIn = moment(punchInStr, ['HH:mm:ss', 'HH:mm'], true);
    const punchOut = moment(punchOutStr, ['HH:mm:ss', 'HH:mm'], true);
    
    // Check for invalid or missing punch data
    if (
      !punchInStr || !punchOutStr ||
      punchInStr === "00:00" || punchOutStr === "00:00" ||
      punchInStr === "00:00:00" || punchOutStr === "00:00:00" ||
      !punchIn.isValid() || !punchOut.isValid()
    ) {
      dayStatus.push({ date: formatDateForDB(rec.date), status: 'A' });
      continue;
    }

    const worked = punchOut.diff(punchIn, 'minutes');
    const lateMins = punchIn.diff(repMoment, 'minutes');
    
    // Validate worked time
    if (isNaN(worked) || worked <= 0 || worked > 24 * 60) {
      dayStatus.push({ date: formatDateForDB(rec.date), status: 'A' });
      continue;
    }

    // Employee is present if they have valid punch in/out
    presentDays++;
    const isLate = lateMins >= 1;
    const isFullDay = worked >= dutyMinutes;
    
    if (isLate) {
      lateDays++;
      lateRecords.push({
        date: formatDateForDB(rec.date),
        index: dayStatus.length,
        isFullDay
      });
    }
    
    // Determine status based on work hours and punctuality
    let status;
    if (isFullDay) {
      status = isLate ? 'PL' : 'P'; // Present Late or Present
    } else {
      halfDays++;
      status = isLate ? 'HDL' : 'HD'; // Half Day Late or Half Day
    }
    
    dayStatus.push({ date: formatDateForDB(rec.date), status });
  }

  // Handle excess late days (convert to half days after 3rd occurrence)
  // Process in reverse order to avoid index shifting issues
  const excessLateRecords = lateRecords.slice(3); // After 3rd late occurrence
  for (const lateRecord of excessLateRecords.reverse()) {
    if (dayStatus[lateRecord.index].status === 'PL') {
      dayStatus[lateRecord.index].status = 'HDL';
      presentDays--;
      halfDays++;
    }
  }

  // Rest of your function remains the same...
  dayStatus.sort((a, b) => moment(a.date).diff(moment(b.date)));
  let currStreak = 0;
  let absentDaysFinal = 0;
  let excessLeaves = 0;
  let streakMasks = {};

  for (let i = 0; i <= dayStatus.length; i++) {
    const atEnd = i === dayStatus.length;
    const isAbsent = !atEnd && dayStatus[i].status === 'A';
    if (isAbsent) {
      currStreak++;
    }
    if (!isAbsent || atEnd) {
      if (currStreak > 0) {
        for (let j = i - currStreak; j < i; j++) {
          if ((j - (i - currStreak)) < 2) {
            absentDaysFinal += 1;
            streakMasks[dayStatus[j].date] = { absent: 1, excess: 0 };
          } else {
            excessLeaves += 1;
            streakMasks[dayStatus[j].date] = { absent: 0, excess: 1 };
          }
        }
        currStreak = 0;
      }
    }
  }

  return {
    presentDays,
    halfDays,
    lateDays,
    absentDays: absentDaysFinal,
    excessLeaves,
    dayStatus,
    streakMasks
  };
};


/* ------------------------------------------------------------------
   Salary & deductions
------------------------------------------------------------------ */
const calculateSalaryAndDeductions = (employee, metrics, workingDays) => {
  const baseSalary = parseFloat(employee.monthlySalary || 0);
  const perDaySalary = workingDays ? (baseSalary / workingDays) : 0;
  
  // Calculate deductions only if there are actual issues
  let totalDeductions = 0;
  
  // Only apply deductions if there are absent days, half days, or excess leaves
  if (metrics.absentDays > 0) {
    totalDeductions += metrics.absentDays * perDaySalary;
  }
  
  if (metrics.halfDays > 0) {
    totalDeductions += metrics.halfDays * (perDaySalary / 2);
  }
  
  if (metrics.excessLeaves > 0) {
    totalDeductions += metrics.excessLeaves * 2 * perDaySalary;
  }
  
  // Cap deductions to not exceed base salary
  const cappedDeductions = Math.min(totalDeductions, baseSalary);
  const netSalary = baseSalary - cappedDeductions;
  
  return { baseSalary, perDaySalary, totalDeductions: cappedDeductions, netSalary };
};

/* ------------------------------------------------------------------
   Upsert payroll
------------------------------------------------------------------ */
const savePayroll = async (p) => {
  const sql = `
    INSERT INTO payroll (employeeId, month, year, present_days, half_days, late_days,
                        leaves, excess_leaves, deductions_amount, net_salary,
                        created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
    ON DUPLICATE KEY UPDATE
      present_days=VALUES(present_days),
      half_days=VALUES(half_days),
      late_days=VALUES(late_days),
      leaves=VALUES(leaves),
      excess_leaves=VALUES(excess_leaves),
      deductions_amount=VALUES(deductions_amount),
      net_salary=VALUES(net_salary),
      updated_at=NOW()
  `;
  await db.query(sql, [
    p.employeeId, p.month, p.year,
    p.present_days, p.half_days, p.late_days,
    p.leaves, p.excess_leaves,
    p.deductions_amount, p.net_salary
  ]);
};

/* ------------------------------------------------------------------
   Enhanced payroll calculation with missing attendance handling
------------------------------------------------------------------ */
const getPayrollReports = async (req, res) => {
  console.log("==> getPayrollReports CALLED");
  const connection = await db.getConnection();
  
  try {
    const { fromDate, toDate, office, position, page = 1, pageSize = 10 } = req.query;
    
    // Input validation
    if (!fromDate || !toDate) {
      return res.status(400).json({ error: 'From date and to date are required' });
    }
    
    const fromMoment = moment(fromDate);
    const toMoment = moment(toDate);
    
    if (!fromMoment.isValid() || !toMoment.isValid()) {
      return res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD' });
    }
    
    if (toMoment.isBefore(fromMoment)) {
      return res.status(400).json({ error: 'To date must be after from date' });
    }
    
    // Check if date range spans multiple months
    if (fromMoment.month() !== toMoment.month() || fromMoment.year() !== toMoment.year()) {
      return res.status(400).json({ error: 'Date range must be within the same month' });
    }

    const year = fromMoment.year();
    const month = fromMoment.month() + 1;
    
    let workingDays, workingDaysArray;
    try {
      [workingDays, workingDaysArray] = await Promise.all([
        fetchWorkingDaysCount(year, month),
        fetchWorkingDaysArray(year, month)
      ]);
    } catch (holidayError) {
      console.error('Holiday service error:', holidayError.message);
      return res.status(503).json({ 
        error: 'Holiday service is currently unavailable. Please try again later.',
        details: holidayError.message 
      });
    }

    // Get office filter for user access control
    const { buildOfficeFilter } = require('../middleware/auth');
    const { whereClause: officeAccessClause, params: officeAccessParams } = buildOfficeFilter(req, 'e');

    // BUILD BASE QUERY AND PARAMS
    let baseQuery = `
      FROM employees e
      LEFT JOIN offices o ON e.office_id = o.id
      LEFT JOIN positions p ON e.position_id = p.id
      INNER JOIN attendance a ON e.employeeId = a.employee_id AND a.date BETWEEN ? AND ?
      WHERE 1=1
    `;
    let qParams = [fromDate, toDate, ...officeAccessParams];
    
    if (officeAccessClause) {
      baseQuery += ` AND ${officeAccessClause}`;
    }
    if (office) { baseQuery += ' AND o.id=?'; qParams.push(office); }
    if (position) { baseQuery += ' AND p.id=?'; qParams.push(position); }

    // GET TOTAL COUNT
    const countQuery = `SELECT COUNT(DISTINCT e.employeeId) as totalEmployees ${baseQuery}`;
    const [countRows] = await db.query(countQuery, qParams);
    const totalEmployees = countRows[0].totalEmployees;

    // GET PAGINATED EMPLOYEE DATA
    const empQuery = `
      SELECT DISTINCT e.employeeId, e.name, e.email, e.office_id, e.position_id, e.monthlySalary,
        o.name as officeName, p.title as positionTitle
      ${baseQuery}
      ORDER BY e.name LIMIT ? OFFSET ?
    `;
    const pageNum = parseInt(page);
    const pageSizeNum = parseInt(pageSize);
    const offset = (pageNum - 1) * pageSizeNum;
    
    const [empRows] = await db.query(empQuery, [...qParams, pageSizeNum, offset]);
    const employees = empRows;
    if (!employees.length)
      return res.json({ success: true, data: [], message: 'No employees found' });

    const [attRows] = await db.query(
      `SELECT employee_id, date, punch_in, punch_out
       FROM attendance
       WHERE date BETWEEN ? AND ?`,
      [fromDate, toDate]
    );
    const attByEmp = {};
    attRows.forEach(r => {
      if (!attByEmp[r.employee_id]) attByEmp[r.employee_id] = [];
      attByEmp[r.employee_id].push(r);
    });

    // Process employees in chunks to prevent memory issues
    const CHUNK_SIZE = 50;
    let payrollData = [], totalNetSalary = 0, totalDeductions = 0;
    
    for (let i = 0; i < employees.length; i += CHUNK_SIZE) {
      const chunk = employees.slice(i, i + CHUNK_SIZE);
      const chunkPromises = chunk.map(async (employee) => {
        const id = employee.employeeId;
        const empAtt = attByEmp[id] || [];
        
        // Get dates that have attendance records
        const attendedDates = new Set(
          empAtt.map(att => formatDateForDB(att.date))
        );
        
        // Calculate missing days (working days without attendance records)
        const missingDays = workingDaysArray.filter(date => !attendedDates.has(date)).length;

        const metrics = await calculateAttendanceMetrics(employee, empAtt, workingDays);
        
        // Fix: Don't double-count missing days that are already marked as absent
        // Missing days are truly absent (no record), metrics.absentDays are days with invalid punch data
        const totalAbsentDays = metrics.absentDays + missingDays;
        
        const metricsForSalary = {
          ...metrics,
          absentDays: totalAbsentDays,
          excessLeaves: metrics.excessLeaves
        };
        
        const salaryData = calculateSalaryAndDeductions(employee, metricsForSalary, workingDays);

        // Save payroll data
        await savePayroll({
          employeeId: id,
          present_days: metrics.presentDays,
          half_days: metrics.halfDays,
          late_days: metrics.lateDays,
          leaves: totalAbsentDays, // Use total absent days including missing
          excess_leaves: metrics.excessLeaves,
          deductions_amount: salaryData.totalDeductions,
          net_salary: salaryData.netSalary,
          month,
          year
        });

        return {
          employeeId: id,
          name: employee.name,
          email: employee.email,
          officeName: employee.officeName,
          positionTitle: employee.positionTitle,
          presentDays: metrics.presentDays,
          lateDays: metrics.lateDays,
          halfDays: metrics.halfDays,
          absentDays: totalAbsentDays, // Use total absent days
          missingDays: missingDays, // Show missing days separately
          excessLeaves: metrics.excessLeaves,
          baseSalary: salaryData.baseSalary,
          perDaySalary: salaryData.perDaySalary,
          totalDeductions: salaryData.totalDeductions,
          netSalary: salaryData.netSalary
        };
      });
      
      const chunkResults = await Promise.all(chunkPromises);
      payrollData.push(...chunkResults);
      
      // Update totals
      chunkResults.forEach(result => {
        totalNetSalary += result.netSalary;
        totalDeductions += result.totalDeductions;
      });
    }

    res.json({
      success: true,
      data: payrollData,
      summary: {
        totalEmployees: totalEmployees,
        totalNetSalary: totalNetSalary.toFixed(2),
        totalDeductions: totalDeductions.toFixed(2),
        netPayroll: totalNetSalary.toFixed(2),
        workingDays
      },
      dateRange: { fromDate, toDate }
    });
  } catch (error) {
    console.error('Error in getPayrollReports:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch payroll reports', 
      details: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  } finally {
    if (connection) connection.release();
  }
};

/* ------------------------------------------------------------------
   individual employee details (per-day metrics, fixed for working hours)
------------------------------------------------------------------ */
const getEmployeePayrollDetails = async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { fromDate, toDate } = req.query;
    if (!fromDate || !toDate)
      return res.status(400).json({ error: 'From date and to date are required' });

    // Check office access
    const { buildOfficeFilter } = require('../middleware/auth');
    const { whereClause, params } = buildOfficeFilter(req, 'e');
    
    let sql = `
      SELECT e.employeeId, e.name, e.email, e.office_id, e.position_id, e.monthlySalary, e.joiningDate
      FROM employees e
      WHERE e.employeeId = ?
    `;
    
    if (whereClause) {
      sql += ` AND ${whereClause}`;
    }
    
    const [empRows] = await db.query(sql, [employeeId, ...params]);
    if (!empRows.length) return res.status(404).json({ error: 'Employee not found or access denied' });
    const employee = empRows[0];

    const year = moment(fromDate).year();
    const month = moment(fromDate).month() + 1;
    const workingDays = await fetchWorkingDaysCount(year, month);
    const workingDaysArray = await fetchWorkingDaysArray(year, month);

    const [attRows] = await db.query(
      `SELECT date, punch_in, punch_out
       FROM attendance
       WHERE employee_id=? AND date BETWEEN ? AND ?`,
      [employeeId, fromDate, toDate]
    );

    const attendedDates = new Set(attRows.map(att => moment(att.date).format('YYYY-MM-DD')));
    const missingDays = workingDaysArray.filter(date => !attendedDates.has(date)).length;
    const overallMetrics = await calculateAttendanceMetrics(employee, attRows, workingDays);
    const totalAbsentDays = overallMetrics.absentDays + missingDays;
    const metricsForSalary = {
      ...overallMetrics,
      absentDays: totalAbsentDays,
      excessLeaves: overallMetrics.excessLeaves
    };
    const salaryData = calculateSalaryAndDeductions(employee, metricsForSalary, workingDays);

    // Use fixed logic for working hours (display 0 if invalid/00:00)
    const dailyRows = overallMetrics.dayStatus.map(ds => {
  const att = attRows.find(row =>
    moment(row.date).format('YYYY-MM-DD') === moment(ds.date).format('YYYY-MM-DD')
  );
  let workingHours = 0;
  let punch_in = att?.punch_in ? att.punch_in.trim() : "";
  let punch_out = att?.punch_out ? att.punch_out.trim() : "";
  
  if (
    punch_in && punch_out &&
    punch_in !== "00:00" && punch_out !== "00:00"
  ) {
    const punchIn = moment(punch_in, ['HH:mm:ss', 'HH:mm']);
    const punchOut = moment(punch_out, ['HH:mm:ss', 'HH:mm']);
    const workedMinutes = punchOut.diff(punchIn, 'minutes');
    if (!isNaN(workedMinutes) && workedMinutes > 0) {
      workingHours = parseFloat((workedMinutes / 60).toFixed(2));
    }
  }

  let absentDays = 0, excessLeaves = 0;
  if (overallMetrics.streakMasks && overallMetrics.streakMasks[ds.date]) {
    absentDays = overallMetrics.streakMasks[ds.date].absent;
    excessLeaves = overallMetrics.streakMasks[ds.date].excess;
  }

  // Updated logic to handle combined statuses
  const isPresent = ['P', 'PL', 'HD', 'HDL'].includes(ds.status) ? 1 : 0;
  const isLate = ['PL', 'HDL', 'L'].includes(ds.status) ? 1 : 0;
  const isHalfDay = ['HD', 'HDL'].includes(ds.status) ? 1 : 0;

  return {
    employeeId: employee.employeeId,
    date: ds.date,
    punch_in,
    punch_out,
    workingHours,
    presentDays: isPresent,
    lateDays: isLate,
    halfDays: isHalfDay,
    absentDays,
    excessLeaves
  };
});


    dailyRows.sort((a, b) => moment(a.date).diff(moment(b.date)));

    res.json({
      success: true,
      employee: {
        ...employee,
        presentDays: overallMetrics.presentDays,
        lateDays: overallMetrics.lateDays,
        halfDays: overallMetrics.halfDays,
        absentDays: overallMetrics.absentDays,
        excessLeaves: overallMetrics.excessLeaves,
        baseSalary: salaryData.baseSalary,
        totalDeductions: salaryData.totalDeductions,
        netSalary: salaryData.netSalary,
        workingDays,
        missingAttendanceDays: missingDays
      },
      dailyRows
    });
  } catch (error) {
    console.error('Error getting payroll details:', error);
    res.status(500).json({ error: 'Failed to fetch employee payroll details', details: error.message });
  }
};

/* ------------------------------------------------------------------
   Dropdowns (unchanged)
------------------------------------------------------------------ */
const getOfficesForFilter = async (req, res) => {
  try {
    const { buildOfficeFilter } = require('../middleware/auth');
    const { whereClause, params } = buildOfficeFilter(req, 'o');
    
    let sql = `SELECT o.id, o.name FROM offices o`;
    if (whereClause) {
      sql += ` WHERE ${whereClause}`;
    }
    sql += ` ORDER BY o.name`;
    
    const [rows] = await db.query(sql, params);
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch offices', details: error.message });
  }
};

const getPositionsForFilter = async (req, res) => {
  try {
    const [rows] = await db.query(`SELECT id, title FROM positions ORDER BY title`);
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch positions', details: error.message });
  }
};

const generatePayrollForDateRange = async (req, res) => {
  try {
    req.query = { ...req.body, ...req.query };
    await getPayrollReports(req, res);
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate payroll', details: error.message });
  }
};

const getAttendanceDaysInMonth = async (req, res) => {
  try {
    const { year, month } = req.query;
    if (!year || !month)
      return res.status(400).json({ error: 'year and month required' });

    // Add office filtering
    const { buildOfficeFilter } = require('../middleware/auth');
    const { whereClause, params } = buildOfficeFilter(req, 'e');
    
    let sql = `
      SELECT DISTINCT DATE(a.date) AS d
      FROM attendance a
      INNER JOIN employees e ON a.employee_id = e.employeeId
      WHERE YEAR(a.date)=? AND MONTH(a.date)=?
    `;
    
    let queryParams = [year, month];
    
    if (whereClause) {
      sql += ` AND ${whereClause}`;
      queryParams.push(...params);
    }
    
    sql += ` ORDER BY d`;
    
    const [rows] = await db.query(sql, queryParams);
    const days = rows.map(r => r.d);
    res.json({ success: true, days });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch attendance days', details: error.message });
  }
};

const getEmployeePendingAttendanceDays = async (req, res) => {
  try {
    let { employeeId, year, month } = req.query;
    if (!employeeId || !year || !month) {
      return res.status(400).json({ error: "employeeId, month, year are required" });
    }
    year  = String(year).padStart(4, '0');
    month = String(month).padStart(2, '0');
    const workingDaysArray = await fetchWorkingDaysArray(year, month);

    const [rows] = await db.query(
      `SELECT date FROM attendance WHERE employee_id = ? AND YEAR(date)=? AND MONTH(date)=?`,
      [employeeId, year, month]
    );
    const attendedDatesSet = new Set(rows.map(r => moment(r.date).format('YYYY-MM-DD')));
    const pendingDates = workingDaysArray.filter(d => !attendedDatesSet.has(d));
    res.json({
      success: true,
      employeeId,
      year,
      month,
      workingDays: workingDaysArray.length,
      attendanceRecorded: workingDaysArray.length - pendingDates.length,
      pendingAttendanceDates: pendingDates,
      absentDays: pendingDates.length
    });
  } catch (e) {
    console.error('Error in getEmployeePendingAttendanceDays:', e.message);
    res.status(500).json({ error: "Failed to fetch pending attendance", details: e.message });
  }
};


/* ------------------------------------------------------------------
   Delete attendance data for a particular month (all employees)
------------------------------------------------------------------ */
const deleteAttendanceByMonth = async (req, res) => {
  try {
    const { year, month } = req.body;
    
    if (!year || !month) {
      return res.status(400).json({ 
        success: false, 
        error: 'Year and month are required' 
      });
    }

    // Validate year and month
    const yearNum = parseInt(year);
    const monthNum = parseInt(month);
    
    if (yearNum < 2000 || yearNum > 2100 || monthNum < 1 || monthNum > 12) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid year or month provided' 
      });
    }

    // Get count of records that will be deleted
    const [countResult] = await db.query(
      `SELECT COUNT(*) as count FROM attendance WHERE YEAR(date) = ? AND MONTH(date) = ?`,
      [yearNum, monthNum]
    );
    
    const recordCount = countResult[0].count;
    
    if (recordCount === 0) {
      return res.json({
        success: true,
        message: `No attendance records found for ${year}-${String(monthNum).padStart(2, '0')}`,
        deletedRecords: 0
      });
    }

    // Delete attendance records for the specified month
    const [result] = await db.query(
      `DELETE FROM attendance WHERE YEAR(date) = ? AND MONTH(date) = ?`,
      [yearNum, monthNum]
    );

    // Also delete corresponding payroll records for consistency
    await db.query(
      `DELETE FROM payroll WHERE year = ? AND month = ?`,
      [yearNum, monthNum]
    );

    console.log(`✅ Deleted ${result.affectedRows} attendance records for ${year}-${String(monthNum).padStart(2, '0')}`);

    res.json({
      success: true,
      message: `Successfully deleted all attendance data for ${year}-${String(monthNum).padStart(2, '0')}`,
      deletedRecords: result.affectedRows,
      year: yearNum,
      month: monthNum
    });

  } catch (error) {
    console.error('Error deleting attendance by month:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to delete attendance data', 
      details: error.message 
    });
  }
};

/* ------------------------------------------------------------------
   Delete attendance data for a particular employee in a particular month
------------------------------------------------------------------ */
const deleteAttendanceByEmployeeMonth = async (req, res) => {
  try {
    const { employeeId, year, month } = req.body;
    
    if (!employeeId || !year || !month) {
      return res.status(400).json({ 
        success: false, 
        error: 'Employee ID, year, and month are required' 
      });
    }

    // Validate year and month
    const yearNum = parseInt(year);
    const monthNum = parseInt(month);
    
    if (yearNum < 2000 || yearNum > 2100 || monthNum < 1 || monthNum > 12) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid year or month provided' 
      });
    }

    // Check if employee exists
    const [empCheck] = await db.query(
      `SELECT employeeId, name FROM employees WHERE employeeId = ?`,
      [employeeId]
    );
    
    if (empCheck.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: 'Employee not found' 
      });
    }

    const employeeName = empCheck[0].name;

    // Get count of records that will be deleted
    const [countResult] = await db.query(
      `SELECT COUNT(*) as count FROM attendance 
       WHERE employee_id = ? AND YEAR(date) = ? AND MONTH(date) = ?`,
      [employeeId, yearNum, monthNum]
    );
    
    const recordCount = countResult[0].count;
    
    if (recordCount === 0) {
      return res.json({
        success: true,
        message: `No attendance records found for employee ${employeeName} in ${year}-${String(monthNum).padStart(2, '0')}`,
        deletedRecords: 0,
        employeeId,
        employeeName
      });
    }

    // Delete attendance records for the specified employee and month
    const [result] = await db.query(
      `DELETE FROM attendance 
       WHERE employee_id = ? AND YEAR(date) = ? AND MONTH(date) = ?`,
      [employeeId, yearNum, monthNum]
    );

    // Also delete corresponding payroll record for this employee
    await db.query(
      `DELETE FROM payroll WHERE employeeId = ? AND year = ? AND month = ?`,
      [employeeId, yearNum, monthNum]
    );

    console.log(`✅ Deleted ${result.affectedRows} attendance records for employee ${employeeName} (${employeeId}) in ${year}-${String(monthNum).padStart(2, '0')}`);

    res.json({
      success: true,
      message: `Successfully deleted attendance data for employee ${employeeName} in ${year}-${String(monthNum).padStart(2, '0')}`,
      deletedRecords: result.affectedRows,
      employeeId,
      employeeName,
      year: yearNum,
      month: monthNum
    });

  } catch (error) {
    console.error('Error deleting attendance by employee and month:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to delete employee attendance data', 
      details: error.message 
    });
  }
};


module.exports = {
  getPayrollReports,
  getEmployeePayrollDetails,
  getOfficesForFilter,
  getPositionsForFilter,
  generatePayrollForDateRange,
  getAttendanceDaysInMonth,
  fetchWorkingDaysCount,
  getEmployeePendingAttendanceDays,
  deleteAttendanceByMonth,
  deleteAttendanceByEmployeeMonth
};