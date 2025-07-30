const express = require('express');
const router = express.Router();
const payrollController = require('../controllers/payrollController');
const { requireAuth, addUserOffices, requireManager } = require('../middleware/auth');

// Get payroll reports with filters
router.get('/reports', requireAuth, addUserOffices, payrollController.getPayrollReports);

// Get detailed employee payroll data
router.get('/employee/:employeeId', requireAuth, addUserOffices, payrollController.getEmployeePayrollDetails);

// Get offices for filter dropdown
router.get('/offices', requireAuth, addUserOffices, payrollController.getOfficesForFilter);

// Get positions for filter dropdown
router.get('/positions', requireAuth, payrollController.getPositionsForFilter);

// Generate payroll for date range
router.post('/generate', requireAuth, addUserOffices, payrollController.generatePayrollForDateRange);

// Get attendance days in month
router.get('/attendance-days', requireAuth, addUserOffices, payrollController.getAttendanceDaysInMonth);

// Get employee pending attendance days (FIXED: removed extra /api prefix)
router.get('/attendance/pending-days', requireAuth, addUserOffices, payrollController.getEmployeePendingAttendanceDays);

// DELETE ROUTES - Attendance data deletion (Admin only for data deletion)
router.delete('/attendance/month', requireAuth, requireManager, payrollController.deleteAttendanceByMonth);
router.delete('/attendance/employee-month', requireAuth, requireManager, payrollController.deleteAttendanceByEmployeeMonth);

module.exports = router;
