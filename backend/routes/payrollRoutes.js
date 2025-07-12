// routes/payrollRoutes.js
const express = require('express');
const router = express.Router();
const payrollController = require('../controllers/payrollController');

router.get('/report', payrollController.generatePayrollReport);
router.get('/summary', payrollController.getPayrollSummary);
router.post('/save', payrollController.savePayroll);

module.exports = router;