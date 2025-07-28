const express = require('express');
const router = express.Router();
const roleController = require('../controllers/roleController');

// =================== MAIN USER DATA ROUTES ====================
router.get('/', roleController.getUsers);
router.get('/count', roleController.getUserCount);
router.get('/statistics', roleController.getRoleStatistics);

// =================== OFFICE OPTIONS ROUTES ====================
router.get('/offices/options', roleController.getOfficeOptions);

// =================== CRUD ROUTES (Leave these after static routes) ========
router.post('/', roleController.createUser);
router.get('/:id', roleController.getUserById);
router.put('/:id', roleController.updateUser);
router.delete('/:id', roleController.deleteUser);

module.exports = router;
