const express = require('express');
const router = express.Router();
const db = require('../db');
//const mysql = require('mysql2/promise');

// Upload attendance data from Excel
router.post('/upload', async (req, res) => {
  try {
    const { attendanceData } = req.body;
    
    if (!attendanceData || !Array.isArray(attendanceData)) {
      return res.status(400).json({ error: 'Invalid attendance data format' });
    }

    // Process each attendance record
    for (const record of attendanceData) {
      const { employeeId, punchInTime, punchOutTime, date } = record;
      
      // Check if employee exists
      const [employee] = await db.query('SELECT * FROM Employees WHERE employee_id = ?', [employeeId]);
      if (employee.length === 0) {
        console.warn(`Employee ${employeeId} not found, skipping record`);
        continue;
      }

      // Determine status based on punch times and employee reporting time
      const employeeData = employee[0];
      const reportingTime = employeeData.reporting_time || '09:00';
      const isLate = punchInTime > reportingTime;
      let status = 'present';
      if (isLate) {
        status = 'late';
      }

      // Insert or update attendance record
      await db.query(`
        INSERT INTO Attendance (employee_id, date, punch_in, punch_out, status)
        VALUES (?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
        punch_in = VALUES(punch_in),
        punch_out = VALUES(punch_out),
        status = VALUES(status)
      `, [employeeId, date, punchInTime, punchOutTime, status]);
    }

    res.json({ message: `Successfully processed ${attendanceData.length} attendance records` });
  } catch (error) {
    console.error('Error uploading attendance:', error);
    res.status(500).json({ error: 'Failed to upload attendance data' });
  }
});

module.exports = router;