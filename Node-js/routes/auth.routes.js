const express = require('express');
const AuthController = require('../controllers/auth.controller');
const { authenticate } = require('../middleware/auth.middleware');

const router = express.Router();

// Public routes
router.post('/signup', AuthController.signup);
router.post('/login', AuthController.login);
router.post('/verify-email', AuthController.verifyEmail);
router.post('/resend-otp', AuthController.resendOTP);
router.get('/google/url', AuthController.getGoogleAuthUrl);
router.get('/google', AuthController.googleAuth);

// Protected routes
router.get('/profile', authenticate, AuthController.getProfile);
router.patch('/profile/telegram', authenticate, AuthController.updateTelegramPhone);

module.exports = router;