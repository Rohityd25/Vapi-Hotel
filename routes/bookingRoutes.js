/**
 * BOOKING ROUTES
 * Base: /api/bookings
 */
const express = require('express');
const router  = express.Router();
const {
  createBooking,
  getMyBookings,
  getBookingById,
  cancelBooking,
} = require('../controllers/bookingController');
const { protect } = require('../middleware/authMiddleware');

// All booking routes require authentication
router.use(protect);

router.post('/',                  createBooking);       // POST   /api/bookings
router.get('/my-bookings',        getMyBookings);       // GET    /api/bookings/my-bookings
router.get('/:id',                getBookingById);      // GET    /api/bookings/:id
router.put('/:id/cancel',         cancelBooking);       // PUT    /api/bookings/:id/cancel

module.exports = router;
