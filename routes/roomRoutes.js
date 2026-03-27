/**
 * ROOM ROUTES
 * Base: /api/rooms
 */
const express = require('express');
const router  = express.Router();
const {
  getAllRooms,
  getRoomById,
  createRoom,
  updateRoom,
  deleteRoom,
  checkAvailability,
  addReview,
} = require('../controllers/roomController');
const { protect, authorize } = require('../middleware/authMiddleware');

// Public routes
router.get('/',    getAllRooms);    // GET  /api/rooms
router.get('/:id', getRoomById);   // GET  /api/rooms/:id
router.get('/:id/availability', checkAvailability); // GET /api/rooms/:id/availability

// Protected + Admin only
router.post('/',    protect, authorize('admin'), createRoom); // POST /api/rooms
router.put('/:id',  protect, authorize('admin'), updateRoom); // PUT  /api/rooms/:id
router.delete('/:id', protect, authorize('admin'), deleteRoom); // DELETE /api/rooms/:id

// User review (must be logged in)
router.post('/:id/reviews', protect, addReview); // POST /api/rooms/:id/reviews

module.exports = router;
