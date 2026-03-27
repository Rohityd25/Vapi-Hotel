/**
 * AUTH ROUTES
 * Base: /api/auth
 */
const express = require('express');
const router  = express.Router();
const {
  register,
  login,
  getMe,
  updateProfile,
  changePassword,
  forgotPassword,
  resetPassword,
} = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

router.post('/register',         register);         // POST /api/auth/register
router.post('/login',            login);            // POST /api/auth/login
router.get( '/me',      protect, getMe);            // GET  /api/auth/me
router.put( '/profile', protect, updateProfile);    // PUT  /api/auth/profile
router.put( '/change-password', protect, changePassword); // PUT /api/auth/change-password
router.post('/forgot-password',  forgotPassword);   // POST /api/auth/forgot-password
router.post('/reset-password/:token', resetPassword); // POST /api/auth/reset-password/:token

module.exports = router;
