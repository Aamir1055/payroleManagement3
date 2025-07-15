const express = require('express');
const router = express.Router();
const attendanceController = require('../controllers/attendanceController');
const upload = require('../middleware/upload');

// Handle file upload for attendance data
router.post('/upload', upload.single('file'), attendanceController.upload);

// Fetch all attendance records
router.get('/', attendanceController.getAll);

// Fetch attendance for a specific employee
router.get('/:employeeId', attendanceController.getByEmployee);

// Filter attendance by date range
router.get('/filter', attendanceController.filterByDate);

module.exports = router;
