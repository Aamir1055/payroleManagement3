// Routes for approved leave functionality
const express = require('express');
const router = express.Router();
const { verifyToken, addUserOffices } = require('../middleware/auth');
const {
  addApprovedLeave,
  removeApprovedLeave,
  getApprovedLeaves
} = require('../controllers/approvedLeaveController');

// All routes require authentication and office access
router.use(verifyToken);
router.use(addUserOffices);

// Add approved leave for an employee on a specific date
// POST /api/approved-leaves/add
router.post('/add', addApprovedLeave);

// Remove approved leave for an employee on a specific date
// DELETE /api/approved-leaves/remove
router.delete('/remove', removeApprovedLeave);

// Get all approved leaves for an employee in a specific month
// GET /api/approved-leaves/:employeeId?year=2024&month=7
router.get('/:employeeId', getApprovedLeaves);

module.exports = router;
