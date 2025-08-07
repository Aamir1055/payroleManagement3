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
    
    // Generate fallback working days (exclude Saturdays and Sundays for UAE)
    const fallback = [];
    const daysInMonth = moment({ year: yearNum, month: monthNum - 1 }).daysInMonth();
    
    for (let d = 1; d <= daysInMonth; d++) {
      const date = moment({ year: yearNum, month: monthNum - 1, day: d });
      // UAE weekend is Saturday (6) and Sunday (0)
      if (date.day() !== 0 && date.day() !== 6) {
        fallback.push(date.format('YYYY-MM-DD'));
      }
    }
    return fallback;
  } catch (e) {
    console.error('Could not fetch working-days', e.message);
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
   FIXED: Attendance metrics with proper approved leave handling
------------------------------------------------------------------ */
// const calculateAttendanceMetrics = async (employee, attRecords, workingDays, approvedLeavesSet = new Set()) => {
//   const { duty_hours, reporting_time } = await getEmployeeTimingConfig(employee);
//   const dutyMinutes = Math.round(Number(duty_hours) * 60);
//   const repMoment = moment(reporting_time, ['HH:mm:ss', 'HH:mm']);

//   let presentDays = 0, halfDays = 0, lateDays = 0;
//   let dayStatus = [];
//   let lateRecords = [];

//   console.log(`\n🔄 CALCULATING METRICS for ${employee.employeeId}`);
//   console.log(`Approved leaves set:`, Array.from(approvedLeavesSet));

//   // Sort records by date for consistent processing
//   const sortedRecords = attRecords.slice().sort((a, b) => moment(a.date).diff(moment(b.date)));

//   // Process each attendance record
//   for (const rec of sortedRecords) {
//     const dateStr = formatDateForDB(rec.date);
//     const isApprovedLeave = approvedLeavesSet.has(dateStr);
    
//     console.log(`Processing date ${dateStr}: approved_leave=${isApprovedLeave}`);
    
//     // FIXED: If this date has approved leave, skip attendance processing
//     if (isApprovedLeave) {
//       dayStatus.push({ date: dateStr, status: 'AL' }); // Approved Leave
//       console.log(`  -> Marked as Approved Leave`);
//       continue;
//     }

//     const punchInStr = rec.punch_in?.toString().trim();
//     const punchOutStr = rec.punch_out?.toString().trim();
    
//     // Validate punch times with multiple formats
//     const punchIn = moment(punchInStr, ['HH:mm:ss', 'HH:mm'], true);
//     const punchOut = moment(punchOutStr, ['HH:mm:ss', 'HH:mm'], true);
    
//     // Check for invalid or missing punch data
//     if (
//       !punchInStr || !punchOutStr ||
//       punchInStr === "00:00" || punchOutStr === "00:00" ||
//       punchInStr === "00:00:00" || punchOutStr === "00:00:00" ||
//       !punchIn.isValid() || !punchOut.isValid()
//     ) {
//       dayStatus.push({ date: dateStr, status: 'A' });
//       console.log(`  -> Marked as Absent (invalid punch)`);
//       continue;
//     }

//     const worked = punchOut.diff(punchIn, 'minutes');
//     const lateMins = punchIn.diff(repMoment, 'minutes');
    
//     // Validate worked time
//     if (isNaN(worked) || worked <= 0 || worked > 24 * 60) {
//       dayStatus.push({ date: dateStr, status: 'A' });
//       console.log(`  -> Marked as Absent (invalid work hours)`);
//       continue;
//     }

//     // Employee is present if they have valid punch in/out
//     presentDays++;
//     const isLate = lateMins >= 1;
//     const isFullDay = worked >= dutyMinutes;
    
//     if (isLate) {
//       lateDays++;
//       lateRecords.push({
//         date: dateStr,
//         index: dayStatus.length,
//         isFullDay
//       });
//     }
    
//     // Determine status based on work hours and punctuality
//     let status;
//     if (isFullDay) {
//       status = isLate ? 'PL' : 'P'; // Present Late or Present
//     } else {
//       halfDays++;
//       status = isLate ? 'HDL' : 'HD'; // Half Day Late or Half Day
//     }
    
//     dayStatus.push({ date: dateStr, status });
//     console.log(`  -> Marked as ${status}`);
//   }

//   // Handle excess late days (convert to half days after 3rd occurrence)
//   const excessLateRecords = lateRecords.slice(3);
//   for (const lateRecord of excessLateRecords.reverse()) {
//     if (dayStatus[lateRecord.index].status === 'PL') {
//       dayStatus[lateRecord.index].status = 'HDL';
//       presentDays--;
//       halfDays++;
//     }
//   }

//   // FIXED: Process absent streaks excluding approved leaves
//   dayStatus.sort((a, b) => moment(a.date).diff(moment(b.date)));
//   let currStreak = 0;
//   let absentDaysFinal = 0;
//   let excessLeaves = 0;
//   let streakMasks = {};

//   for (let i = 0; i <= dayStatus.length; i++) {
//     const atEnd = i === dayStatus.length;
//     const dateStr = !atEnd ? dayStatus[i].date : null;
    
//     // FIXED: Only count actual absent days (not approved leaves) in streaks
//     const isAbsent = !atEnd && dayStatus[i].status === 'A';
    
//     if (isAbsent) {
//       currStreak++;
//     }
//     if (!isAbsent || atEnd) {
//       if (currStreak > 0) {
//         for (let j = i - currStreak; j < i; j++) {
//           const currentDate = dayStatus[j].date;
          
//           // Original logic: First 2 days in streak = absent, rest = excess leaves
//           if ((j - (i - currStreak)) < 2) {
//             absentDaysFinal += 1;
//             streakMasks[currentDate] = { absent: 1, excess: 0 };
//           } else {
//             // This is an excess leave - don't count as absent for display
//             excessLeaves += 1;
//             streakMasks[currentDate] = { absent: 0, excess: 1 };
//           }
//         }
//         currStreak = 0;
//       }
//     }
//   }
  
//   // FIXED: Count approved leaves separately for display
//   const approvedLeaveDays = approvedLeavesSet.size;
  
//   // Add approved leaves to streak masks for tracking
//   approvedLeavesSet.forEach(dateStr => {
//     if (!streakMasks[dateStr]) {
//       streakMasks[dateStr] = { absent: 1, excess: 0, approved: true };
//     }
//   });

//   console.log(`Final metrics:`, {
//     presentDays,
//     halfDays,
//     lateDays,
//     absentDays: absentDaysFinal,
//     approvedLeaveDays,
//     excessLeaves
//   });

//   return {
//     presentDays,
//     halfDays,
//     lateDays,
//     absentDays: absentDaysFinal,
//     approvedLeaveDays,
//     excessLeaves,
//     dayStatus,
//     streakMasks
//   };
// };



const calculateAttendanceMetrics = async (employee, attRecords, workingDays, approvedLeavesSet = new Set()) => {
  const { duty_hours, reporting_time } = await getEmployeeTimingConfig(employee);
  const dutyMinutes = Math.round(Number(duty_hours) * 60);
  const repMoment = moment(reporting_time, ['HH:mm:ss', 'HH:mm']);

  let presentDays = 0, halfDays = 0, lateDays = 0;
  let dayStatus = [];
  let lateRecords = [];

  console.log(`\n🔄 CALCULATING METRICS for ${employee.employeeId}`);
  console.log(`Approved leaves set:`, Array.from(approvedLeavesSet));

  // Sort records by date for consistent processing
  const sortedRecords = attRecords.slice().sort((a, b) => moment(a.date).diff(moment(b.date)));

  // Process each attendance record
  for (const rec of sortedRecords) {
    const dateStr = formatDateForDB(rec.date);
    const isApprovedLeave = approvedLeavesSet.has(dateStr);
    
    console.log(`Processing date ${dateStr}: approved_leave=${isApprovedLeave}`);
    
    // If this date has approved leave, skip attendance processing
    if (isApprovedLeave) {
      dayStatus.push({ date: dateStr, status: 'AL' }); // Approved Leave
      console.log(`  -> Marked as Approved Leave`);
      continue;
    }

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
      dayStatus.push({ date: dateStr, status: 'A' });
      console.log(`  -> Marked as Absent (invalid punch)`);
      continue;
    }

    const worked = punchOut.diff(punchIn, 'minutes');
    const lateMins = punchIn.diff(repMoment, 'minutes');
    
    // Validate worked time
    if (isNaN(worked) || worked <= 0 || worked > 24 * 60) {
      dayStatus.push({ date: dateStr, status: 'A' });
      console.log(`  -> Marked as Absent (invalid work hours)`);
      continue;
    }

    // Employee is present if they have valid punch in/out
    presentDays++;
    const isLate = lateMins >= 1;
    const isFullDay = worked >= dutyMinutes;
    
    if (isLate) {
      lateDays++;
      lateRecords.push({
        date: dateStr,
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
    
    dayStatus.push({ date: dateStr, status });
    console.log(`  -> Marked as ${status}`);
  }

  // Handle excess late days (convert to half days after 3rd occurrence)
  const excessLateRecords = lateRecords.slice(3);
  for (const lateRecord of excessLateRecords.reverse()) {
    if (dayStatus[lateRecord.index].status === 'PL') {
      dayStatus[lateRecord.index].status = 'HDL';
      presentDays--;
      halfDays++;
    }
  }

  // Sort day status by date for consistent processing
  dayStatus.sort((a, b) => moment(a.date).diff(moment(b.date)));
  
  // Count actual absent days (invalid punch data only) - these count towards excess leave limit
  let actualAbsentDays = 0;
  const absentDates = [];
  
  for (const dayEntry of dayStatus) {
    if (dayEntry.status === 'A') {
      actualAbsentDays++;
      absentDates.push(dayEntry.date);
    }
  }

  // Count approved leaves separately - these DON'T count towards excess leave limit
  const approvedLeaveDays = approvedLeavesSet.size;
  
  console.log(`\n=== ABSENCE BREAKDOWN ===`);
  console.log(`- Actual absent days (invalid punch): ${actualAbsentDays}`);
  console.log(`- Approved leave days: ${approvedLeaveDays}`);
  console.log(`- Total display absent days: ${actualAbsentDays + approvedLeaveDays}`);

  // CORE LOGIC: Calculate excess leaves ONLY from actual absent days
  // Approved leaves NEVER count towards the 2-day tolerance limit
  let excessLeaves = 0;
  let regularAbsentDays = actualAbsentDays;
  
  if (actualAbsentDays > 2) {
    excessLeaves = actualAbsentDays - 2;
    regularAbsentDays = 2; // Only first 2 absent days are regular
    console.log(`✓ Excess leaves applied: ${excessLeaves} (from ${actualAbsentDays} absent days, limit is 2)`);
  } else {
    console.log(`✓ No excess leaves: ${actualAbsentDays} absent days within 2-day limit`);
  }
  
  console.log(`✓ Approved leaves: ${approvedLeaveDays} (never count as excess)`);

  // Create streak masks for tracking and display purposes
  let streakMasks = {};
  
  // Mark approved leaves (always regular, no excess penalty)
  approvedLeavesSet.forEach(dateStr => {
    streakMasks[dateStr] = { absent: 1, excess: 0, approved: true };
  });
  
  // Mark absent days chronologically (first 2 regular, rest excess)
  absentDates.sort(); // Ensure chronological order
  let processedAbsent = 0;
  for (const dateStr of absentDates) {
    if (processedAbsent < 2) {
      streakMasks[dateStr] = { absent: 1, excess: 0 };
      console.log(`  Date ${dateStr}: Regular absent day (${processedAbsent + 1}/2)`);
    } else {
      streakMasks[dateStr] = { absent: 0, excess: 1 };
      console.log(`  Date ${dateStr}: Excess leave day`);
    }
    processedAbsent++;
  }

  console.log(`\n=== FINAL METRICS ===`);
  console.log(`Present days: ${presentDays}`);
  console.log(`Half days: ${halfDays}`);
  console.log(`Late days: ${lateDays}`);
  console.log(`Regular absent days: ${regularAbsentDays} (max 2 from actual absent)`);
  console.log(`Approved leave days: ${approvedLeaveDays} (no excess penalty)`);
  console.log(`Excess leaves: ${excessLeaves} (only from actual absent days > 2)`);
  console.log(`========================\n`);

  return {
    presentDays,
    halfDays,
    lateDays,
    absentDays: regularAbsentDays, // Only regular absent days (max 2)
    approvedLeaveDays,
    excessLeaves, // Only from actual absent days exceeding 2, not from approved leaves
    dayStatus,
    streakMasks
  };
};


/* ------------------------------------------------------------------
   FIXED: Salary & deductions with approved leaves included
------------------------------------------------------------------ */
const calculateSalaryAndDeductions = (employee, metrics, workingDays, workingDaysArray, approvedLeavesSet) => {
  const baseSalary = parseFloat(employee.monthlySalary || 0);
  const perDaySalary = workingDays ? (baseSalary / workingDays) : 0;
  
  console.log(`\n=== SALARY CALCULATION DEBUG for Employee ${employee.employeeId} ===`);
  console.log(`Base Salary: ${baseSalary}`);
  console.log(`Working Days: ${workingDays}`);
  console.log(`Per Day Salary: ${perDaySalary}`);
  
  // FIXED: Calculate total absent days including approved leaves
  const actualAbsentDays = metrics.absentDays; // Days with invalid punch data
  const approvedLeaveDays = metrics.approvedLeaveDays || 0; // Approved leave days
  const totalDisplayAbsentDays = actualAbsentDays + approvedLeaveDays;
  
  console.log(`Absence breakdown:`);
  console.log(`- Actual absent days (invalid punch): ${actualAbsentDays}`);
  console.log(`- Approved leave days: ${approvedLeaveDays}`);
  console.log(`- Total absent days for display: ${totalDisplayAbsentDays}`);
  console.log(`- Missing days: ${metrics.missingDays || 0}`);
  console.log(`- Excess leaves: ${metrics.excessLeaves}`);
  console.log(`- Half days: ${metrics.halfDays}`);
  
  // Calculate deductions
  let totalDeductions = 0;
  let absentDeduction = 0;
  let approvedLeaveDeduction = 0;
  let missingDeduction = 0;
  let excessDeduction = 0;
  let halfDayDeduction = 0;
  
  // Handle actual absent days (days with invalid punch data)
  if (actualAbsentDays > 0) {
    absentDeduction = actualAbsentDays * perDaySalary;
    totalDeductions += absentDeduction;
  }
  
  // FIXED: Handle approved leaves (treated as absent days for deduction)
  if (approvedLeaveDays > 0) {
    approvedLeaveDeduction = approvedLeaveDays * perDaySalary;
    totalDeductions += approvedLeaveDeduction;
  }
  
  // Handle missing days (working days with no attendance records)
  if (metrics.missingDays && metrics.missingDays > 0) {
    missingDeduction = metrics.missingDays * perDaySalary;
    totalDeductions += missingDeduction;
  }
  
  // Excess leaves get 2x penalty
  if (metrics.excessLeaves > 0) {
    excessDeduction = metrics.excessLeaves * 2 * perDaySalary;
    totalDeductions += excessDeduction;
  }
  
  if (metrics.halfDays > 0) {
    halfDayDeduction = metrics.halfDays * (perDaySalary / 2);
    totalDeductions += halfDayDeduction;
  }
  
  console.log(`Deduction Breakdown:`);
  console.log(`- Absent Days (${actualAbsentDays}): ${absentDeduction}`);
  console.log(`- Approved Leaves (${approvedLeaveDays}): ${approvedLeaveDeduction}`);
  console.log(`- Missing Days (${metrics.missingDays || 0}): ${missingDeduction}`);
  console.log(`- Excess Leaves (${metrics.excessLeaves}): ${excessDeduction}`);
  console.log(`- Half Days (${metrics.halfDays}): ${halfDayDeduction}`);
  console.log(`Total Deductions: ${totalDeductions}`);
  
  // Cap deductions to not exceed base salary
  const cappedDeductions = Math.min(totalDeductions, baseSalary);
  const netSalary = baseSalary - cappedDeductions;
  
  console.log(`Capped Deductions: ${cappedDeductions}`);
  console.log(`Net Salary: ${netSalary}`);
  console.log(`=== END SALARY CALCULATION DEBUG ===\n`);
  
  return { 
    baseSalary, 
    perDaySalary, 
    totalDeductions: cappedDeductions, 
    netSalary,
    actualAbsentDays,
    approvedLeaveDays,
    totalDisplayAbsentDays
  };
};

/* ------------------------------------------------------------------
   FIXED: Enhanced payroll calculation with proper approved leave handling
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

    // FIXED: Fetch attendance records WITHOUT approved leave info initially
    const [attRows] = await db.query(
      `SELECT a.date, a.punch_in, a.punch_out
       FROM attendance a
       WHERE a.employee_id=? AND a.date BETWEEN ? AND ?`,
      [employeeId, fromDate, toDate]
    );

    // FIXED: Fetch approved leaves separately and create a Set
    const [approvedLeaveRows] = await db.query(
      `SELECT DATE(al.date) as date
       FROM approved_leaves al
       WHERE al.employee_id = ? AND al.date BETWEEN ? AND ?`,
      [employeeId, fromDate, toDate]
    );
    
    const approvedLeavesSet = new Set(
      approvedLeaveRows.map(row => moment(row.date).format('YYYY-MM-DD'))
    );
    
    console.log(`\n🔍 FETCHED DATA for ${employeeId}:`);
    console.log(`Attendance records: ${attRows.length}`);
    console.log(`Approved leaves: ${approvedLeavesSet.size}`, Array.from(approvedLeavesSet));

    const attendedDates = new Set(attRows.map(att => moment(att.date).format('YYYY-MM-DD')));
    
    // FIXED: Calculate missing days excluding approved leaves
    const missingDays = workingDaysArray.filter(date => 
      !attendedDates.has(date) && !approvedLeavesSet.has(date)
    ).length;
    
    console.log(`Missing days calculation:`);
    console.log(`- Working days: ${workingDaysArray.length}`);
    console.log(`- Attended dates: ${attendedDates.size}`);
    console.log(`- Approved leaves: ${approvedLeavesSet.size}`);
    console.log(`- Missing days: ${missingDays}`);

    // FIXED: Pass approved leaves to calculation
    const overallMetrics = await calculateAttendanceMetrics(employee, attRows, workingDays, approvedLeavesSet);
    
    // Add missing days to metrics
    overallMetrics.missingDays = missingDays;
    
    const salaryData = calculateSalaryAndDeductions(employee, overallMetrics, workingDays, workingDaysArray, approvedLeavesSet);

    // FIXED: Create daily rows with approved leave information
    const dailyRows = [];
    
    // Get all dates that should be shown (attendance + approved leaves)
    const allDates = new Set([
      ...attRows.map(att => moment(att.date).format('YYYY-MM-DD')),
      ...Array.from(approvedLeavesSet)
    ]);
    
    Array.from(allDates).sort().forEach(dateStr => {
      const att = attRows.find(row => moment(row.date).format('YYYY-MM-DD') === dateStr);
      const isApprovedLeave = approvedLeavesSet.has(dateStr);
      
      let workingHours = 0;
      let punch_in = "";
      let punch_out = "";
      
      if (att && !isApprovedLeave) {
        punch_in = att.punch_in ? att.punch_in.trim() : "";
        punch_out = att.punch_out ? att.punch_out.trim() : "";
        
        if (punch_in && punch_out && punch_in !== "00:00" && punch_out !== "00:00") {
          const punchIn = moment(punch_in, ['HH:mm:ss', 'HH:mm']);
          const punchOut = moment(punch_out, ['HH:mm:ss', 'HH:mm']);
          const workedMinutes = punchOut.diff(punchIn, 'minutes');
          if (!isNaN(workedMinutes) && workedMinutes > 0) {
            workingHours = parseFloat((workedMinutes / 60).toFixed(2));
          }
        }
      }

      // FIXED: Determine status for this date
      const dayStatusEntry = overallMetrics.dayStatus.find(ds => ds.date === dateStr);
      const status = dayStatusEntry ? dayStatusEntry.status : (isApprovedLeave ? 'AL' : 'A');
      
      let absentDays = 0, excessLeaves = 0;
      if (overallMetrics.streakMasks && overallMetrics.streakMasks[dateStr]) {
        absentDays = overallMetrics.streakMasks[dateStr].absent || 0;
        excessLeaves = overallMetrics.streakMasks[dateStr].excess || 0;
      }
      
      // FIXED: Handle approved leave display
      if (isApprovedLeave) {
        absentDays = 1; // Approved leaves show as absent
        excessLeaves = 0;
        punch_in = "";
        punch_out = "";
        workingHours = 0;
      }

      // Calculate individual day metrics
      const isPresent = ['P', 'PL', 'HD', 'HDL'].includes(status) ? 1 : 0;
      const isLate = ['PL', 'HDL', 'L'].includes(status) ? 1 : 0;
      const isHalfDay = ['HD', 'HDL'].includes(status) ? 1 : 0;

      dailyRows.push({
        employeeId: employee.employeeId,
        date: dateStr,
        punch_in,
        punch_out,
        workingHours,
        presentDays: isPresent,
        lateDays: isLate,
        halfDays: isHalfDay,
        absentDays,
        excessLeaves
      });
    });

    dailyRows.sort((a, b) => moment(a.date).diff(moment(b.date)));

    // FIXED: Return correct absent days count
    res.json({
      success: true,
      employee: {
        ...employee,
        presentDays: overallMetrics.presentDays,
        lateDays: overallMetrics.lateDays,
        halfDays: overallMetrics.halfDays,
        absentDays: salaryData.totalDisplayAbsentDays, // Include approved leaves
        excessLeaves: overallMetrics.excessLeaves,
        baseSalary: salaryData.baseSalary,
        totalDeductions: salaryData.totalDeductions,
        netSalary: salaryData.netSalary,
        workingDays,
        missingAttendanceDays: missingDays,
        approvedLeaveDays: overallMetrics.approvedLeaveDays
      },
      dailyRows
    });
  } catch (error) {
    console.error('Error getting payroll details:', error);
    res.status(500).json({ error: 'Failed to fetch employee payroll details', details: error.message });
  }
};

// Keep the rest of your existing functions unchanged...
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

// Continue with all your other existing functions...
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

    // FIXED: Fetch attendance records separately
    const [attRows] = await db.query(
      `SELECT a.employee_id, a.date, a.punch_in, a.punch_out
       FROM attendance a
       WHERE a.date BETWEEN ? AND ?`,
      [fromDate, toDate]
    );
    
    // FIXED: Fetch approved leaves separately
    const [approvedLeaveRows] = await db.query(
      `SELECT al.employee_id, DATE(al.date) as date
       FROM approved_leaves al
       WHERE al.date BETWEEN ? AND ?`,
      [fromDate, toDate]
    );
    
    const attByEmp = {};
    attRows.forEach(r => {
      if (!attByEmp[r.employee_id]) attByEmp[r.employee_id] = [];
      attByEmp[r.employee_id].push(r);
    });
    
    const approvedLeavesByEmp = {};
    approvedLeaveRows.forEach(r => {
      if (!approvedLeavesByEmp[r.employee_id]) approvedLeavesByEmp[r.employee_id] = new Set();
      approvedLeavesByEmp[r.employee_id].add(moment(r.date).format('YYYY-MM-DD'));
    });

    // Process employees in chunks to prevent memory issues
    const CHUNK_SIZE = 50;
    let payrollData = [], totalNetSalary = 0, totalDeductions = 0;
    
    for (let i = 0; i < employees.length; i += CHUNK_SIZE) {
      const chunk = employees.slice(i, i + CHUNK_SIZE);
      const chunkPromises = chunk.map(async (employee) => {
        const id = employee.employeeId;
        const empAtt = attByEmp[id] || [];
        const empApprovedLeaves = approvedLeavesByEmp[id] || new Set();
        
        // Get dates that have attendance records
        const attendedDates = new Set(
          empAtt.map(att => formatDateForDB(att.date))
        );
        
        // FIXED: Calculate missing days excluding approved leaves
        const missingDays = workingDaysArray.filter(date => 
          !attendedDates.has(date) && !empApprovedLeaves.has(date)
        ).length;

        const metrics = await calculateAttendanceMetrics(employee, empAtt, workingDays, empApprovedLeaves);
        metrics.missingDays = missingDays;
        
        const salaryData = calculateSalaryAndDeductions(employee, metrics, workingDays, workingDaysArray, empApprovedLeaves);

        // Save payroll data
        await savePayroll({
          employeeId: id,
          present_days: metrics.presentDays,
          half_days: metrics.halfDays,
          late_days: metrics.lateDays,
          leaves: salaryData.totalDisplayAbsentDays,
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
          absentDays: salaryData.totalDisplayAbsentDays,
          missingDays: missingDays,
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

// Keep all your other existing functions unchanged...
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
