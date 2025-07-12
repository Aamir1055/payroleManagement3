const express = require('express');
const router = express.Router();
const employeeController = require('../controllers/employeeController');
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });

// Employee data routes
router.get('/', employeeController.getEmployees);
router.get('/next-id', employeeController.getNextEmployeeId);
router.get('/office-position/:officeId/:positionId', employeeController.getOfficePositionData);
router.get('/count', employeeController.getEmployeeCount);
router.get('/salary/total', employeeController.getTotalMonthlySalary);
router.get('/summary-by-office', employeeController.getSummaryByOffice);

// Office/position dropdown options
router.get('/offices/options', employeeController.getOfficeOptions);
router.get('/positions/options', employeeController.getPositionOptions);
router.get('/positions/by-office/:officeId', employeeController.getPositionsByOffice);

// Employee CRUD operations
router.post('/', employeeController.createEmployee);
router.get('/:employeeId', employeeController.getEmployeeById);
router.put('/:employeeId', employeeController.updateEmployee);
router.delete('/:employeeId', employeeController.deleteEmployee);

// Import/export routes
router.get('/template/download', employeeController.exportEmployeesTemplate);
router.post('/import', upload.single('file'), employeeController.importEmployees);

module.exports = router;