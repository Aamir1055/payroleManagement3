const express = require('express');
const router = express.Router();
const { query } = require('../utils/dbPromise');

// Get employee attendance summary for a specific month/year
router.get('/employee-summary', async (req, res) => {
  try {
    const { month, year } = req.query;
    
    if (!month || !year) {
      return res.status(400).json({ error: 'Month and year parameters are required' });
    }

    // Get all employees and generate dummy attendance data
    const employees = await query(`
      SELECT 
        e.employee_id as employeeId,
        e.name,
        o.name as office,
        p.title as position
      FROM Employees e
      LEFT JOIN Offices o ON e.office_id = o.id
      LEFT JOIN Positions p ON e.position_id = p.id
      WHERE e.status = 1
      ORDER BY e.name
    `);
    
    // Generate dummy attendance data for each employee
    const results = employees.map(emp => {
      const workingDays = 22; // Typical working days in a month
      const presentDays = Math.floor(Math.random() * 3) + 18; // 18-20 days
      const lateDays = Math.floor(Math.random() * 4); // 0-3 late days
      const absentDays = workingDays - presentDays;
      const attendancePercentage = Math.round((presentDays / workingDays) * 100);
      
      return {
        ...emp,
        presentDays,
        absentDays,
        lateDays,
        totalDays: workingDays,
        attendancePercentage
      };
    });
    res.json(results);
  } catch (error) {
    console.error('Error fetching employee summary:', error);
    res.status(500).json({ error: 'Failed to fetch employee attendance summary' });
  }
});

// Get detailed attendance for a specific employee
router.get('/employee-detail/:employeeId', async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { month, year } = req.query;
    
    if (!month || !year) {
      return res.status(400).json({ error: 'Month and year parameters are required' });
    }

    // Get employee information
    const employeeInfo = await query(`
      SELECT 
        e.employee_id as employeeId, 
        e.name, 
        o.name as office, 
        p.title as position, 
        COALESCE(op.reporting_time, '09:00') as reportingTime
      FROM Employees e
      LEFT JOIN Offices o ON e.office_id = o.id
      LEFT JOIN Positions p ON e.position_id = p.id
      LEFT JOIN OfficePositions op ON e.office_id = op.office_id AND e.position_id = op.position_id
      WHERE e.employee_id = ? AND e.status = 1
    `, [employeeId]);

    if (employeeInfo.length === 0) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    // Get attendance details for the month (create dummy data for now as Attendance table might be empty)
    const attendanceData = [];
    // Generate sample attendance data for the month
    const daysInMonth = new Date(year, month, 0).getDate();
    for (let day = 1; day <= Math.min(daysInMonth, 10); day++) {
      const date = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
      const isWeekend = new Date(date).getDay() === 0; // Sunday
      if (!isWeekend) {
        attendanceData.push({
          date,
          punchIn: '09:00',
          punchOut: '18:00',
          status: Math.random() > 0.1 ? 'present' : 'absent',
          isLate: Math.random() > 0.8,
          lateMinutes: Math.random() > 0.8 ? Math.floor(Math.random() * 30) : 0
        });
      }
    }

    // Calculate summary
    const presentDays = attendanceData.filter(day => ['present', 'late'].includes(day.status)).length;
    const absentDays = attendanceData.filter(day => day.status === 'absent').length;
    const lateDays = attendanceData.filter(day => day.status === 'late').length;
    const totalDays = attendanceData.length;
    const attendancePercentage = totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 0;

    const response = {
      ...employeeInfo[0],
      attendance: attendanceData,
      summary: {
        presentDays,
        absentDays,
        lateDays,
        totalDays,
        attendancePercentage
      }
    };

    res.json(response);
  } catch (error) {
    console.error('Error fetching employee detail:', error);
    res.status(500).json({ error: 'Failed to fetch employee attendance details' });
  }
});

module.exports = router;