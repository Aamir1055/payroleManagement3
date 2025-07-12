const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { verifyToken, requireAdmin } = require('../middleware/auth');

// Public routes
router.post('/login', authController.login);

// Protected routes (require authentication)
router.get('/profile', verifyToken, authController.getProfile);

// 2FA routes
router.get('/2fa/setup', verifyToken, authController.generate2FASetup);
router.post('/2fa/verify', verifyToken, authController.verify2FASetup);
router.post('/2fa/disable', verifyToken, authController.disable2FA);

// Admin only routes
router.post('/register', requireAdmin, authController.register);

module.exports = router;