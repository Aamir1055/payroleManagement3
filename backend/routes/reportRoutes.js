// const express = require('express');
// const router = express.Router();
// const reportController = require('../controllers/reportController');

// router.get('/monthly', reportController.monthlyReport);
// router.get('/employee/:id', reportController.employeeReport);

// module.exports = router;

// routes/payrollRoutes.js
const express = require('express');
const router = express.Router();
const payrollController = require('../controllers/reportController');

router.get('/report', payrollController.generatePayrollReport);
router.get('/summary', payrollController.getPayrollSummary);
router.post('/save', payrollController.savePayroll);

module.exports = router;
