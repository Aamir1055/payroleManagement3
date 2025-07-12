const express = require('express');
const router = express.Router();
const holidaysController = require('../controllers/holidaysController');

// Get all holidays
router.get('/', holidaysController.getAllHolidays);

// Get holidays for a specific month/year
router.get('/month', holidaysController.getHolidaysByMonth);

// Get working days calculation
router.get('/working-days', holidaysController.getWorkingDays);

// Get upcoming holidays
router.get('/upcoming', holidaysController.getUpcomingHolidays);

// Add new holiday
router.post('/', holidaysController.addHoliday);

// Update holiday
router.put('/:id', holidaysController.updateHoliday);

// Delete holiday
router.delete('/:id', holidaysController.deleteHoliday);

module.exports = router;
