const express = require('express');
const router = express.Router();
const attendanceController = require('../controllers/attendanceController');
const upload = require('../middleware/upload');
const { requireAuth, addUserOffices, requireManager } = require('../middleware/auth');
// Handle file upload for attendance data (Manager access required)
router.post('/upload', requireAuth, requireManager, addUserOffices, upload.single('file'), attendanceController.upload);

// Fetch all attendance records
router.get('/', requireAuth, addUserOffices, attendanceController.getAll);

// Filter attendance by date range (this needs to be before the /:employeeId route)
router.get('/filter', requireAuth, addUserOffices, attendanceController.filterByDate);

// Fetch attendance for a specific employee
router.get('/:employeeId', requireAuth, addUserOffices, attendanceController.getByEmployee);

// CRUD operations
router.post('/', requireAuth, addUserOffices, attendanceController.createOrUpdate);
router.get('/:employeeId/:date', requireAuth, addUserOffices, attendanceController.getOne);
router.put('/:employeeId/:date', requireAuth, addUserOffices, attendanceController.update);
router.delete('/:employeeId/:date', requireAuth, requireManager, attendanceController.remove);

module.exports = router;
