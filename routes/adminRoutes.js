/**
 * ADMIN ROUTES
 * Base: /api/admin
 * All routes require admin role
 */
const express = require('express');
const router  = express.Router();
const {
  getDashboardStats,
  getAllBookings,
  updateBookingStatus,
  getAllUsers,
  toggleUserStatus,
  deleteUser,
} = require('../controllers/adminController');
const { protect, authorize } = require('../middleware/authMiddleware');

// All admin routes require authentication + admin role
router.use(protect, authorize('admin'));

router.get('/dashboard',                   getDashboardStats);   // GET /api/admin/dashboard
router.get('/bookings',                    getAllBookings);       // GET /api/admin/bookings
router.put('/bookings/:id/status',         updateBookingStatus); // PUT /api/admin/bookings/:id/status
router.get('/users',                       getAllUsers);          // GET /api/admin/users
router.put('/users/:id/toggle-status',     toggleUserStatus);    // PUT /api/admin/users/:id/toggle-status
router.delete('/users/:id',                deleteUser);          // DELETE /api/admin/users/:id

module.exports = router;
