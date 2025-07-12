const express = require('express');
const router = express.Router();
const masterController = require('../controllers/masterController');

// -------- DASHBOARD ROUTES --------
router.get('/dashboard-summary', masterController.getDashboardSummary);

// -------- OFFICE ROUTES --------
router.get('/offices', masterController.getAllOffices);
router.post('/offices', masterController.createOffice);
router.post('/offices-with-positions', masterController.createOfficeWithPositions);
router.get('/office-positions', masterController.getOfficePositions);
router.get('/office-position-details/:officeId/:positionId', masterController.getOfficePositionDetails);

// -------- POSITION ROUTES --------
router.get('/positions', masterController.getAllPositions);
router.post('/positions', masterController.createPosition);
router.post('/office-specific-position', masterController.createOfficeSpecificPosition);

module.exports = router;