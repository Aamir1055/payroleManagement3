const express = require('express');
const router = express.Router();
const employeeController = require('../controllers/employeeController');
const multer = require('multer');
const path = require('path');
const { requireAuth, addUserOffices, requireManager } = require('../middleware/auth');

// Setup multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: function (req, file, cb) {
    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel', // .xls
      'text/csv' // .csv
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only Excel (.xlsx, .xls) and CSV files are allowed.'));
    }
  }
});

// =================== IMPORT/EXPORT ROUTES FIRST ===================
router.get('/template', employeeController.exportEmployeesTemplate);
router.post('/import', upload.single('file'), employeeController.importEmployees);
router.post('/import-secondary', upload.single('file'), employeeController.importSecondaryEmployeeData);

// =================== MAIN EMPLOYEE DATA ROUTES ====================
router.get('/', requireAuth, addUserOffices, employeeController.getEmployees);
router.get('/next-id', requireAuth, employeeController.getNextEmployeeId);
router.get('/office-position/:officeId/:positionId', requireAuth, employeeController.getOfficePositionData);
router.get('/count', requireAuth, addUserOffices, employeeController.getEmployeeCount);
router.get('/salary/total', requireAuth, addUserOffices, employeeController.getTotalMonthlySalary);
router.get('/summary-by-office', requireAuth, addUserOffices, employeeController.getSummaryByOffice);
router.get('/summary-by-platform', requireAuth, employeeController.getSummaryByPlatform);

// =================== OFFICE/POSITION/PLATFORM OPTIONS ROUTES ================
router.get('/offices/options', requireAuth, addUserOffices, employeeController.getOfficeOptions);
router.get('/positions/options', requireAuth, employeeController.getPositionOptions);
router.get('/positions/by-office/:officeId', requireAuth, employeeController.getPositionsByOffice);
router.get('/platforms/options', requireAuth, employeeController.getPlatformOptions);

// =================== CRUD (Leave these after static routes) ========
router.post('/', requireAuth, addUserOffices, employeeController.createEmployee);
router.get('/:employeeId', requireAuth, addUserOffices, employeeController.getEmployeeById);
router.put('/:employeeId', requireAuth, addUserOffices, employeeController.updateEmployee);
router.delete('/:employeeId', requireAuth, addUserOffices, employeeController.deleteEmployee);

// =================== ERROR HANDLING MIDDLEWARE =====================
router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File too large. Maximum size is 10MB.' });
    }
  }
  if (error.message.includes('Invalid file type')) {
    return res.status(400).json({ error: error.message });
  }
  next(error);
});

module.exports = router;
