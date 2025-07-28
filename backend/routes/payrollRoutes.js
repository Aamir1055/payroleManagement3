const express = require('express');
const router = express.Router();
const payrollController = require('../controllers/payrollController');

// Get payroll reports with filters
router.get('/reports', payrollController.getPayrollReports);

// Get detailed employee payroll data
router.get('/employee/:employeeId', payrollController.getEmployeePayrollDetails);

// Get offices for filter dropdown
router.get('/offices', payrollController.getOfficesForFilter);

// Get positions for filter dropdown
router.get('/positions', payrollController.getPositionsForFilter);

// Generate payroll for date range
router.post('/generate', payrollController.generatePayrollForDateRange);

// Get attendance days in month
router.get('/attendance-days', payrollController.getAttendanceDaysInMonth);

// Get employee pending attendance days (FIXED: removed extra /api prefix)
router.get('/attendance/pending-days', payrollController.getEmployeePendingAttendanceDays);

// DELETE ROUTES - Attendance data deletion
router.delete('/attendance/month', payrollController.deleteAttendanceByMonth);
router.delete('/attendance/employee-month', payrollController.deleteAttendanceByEmployeeMonth);

module.exports = router;
