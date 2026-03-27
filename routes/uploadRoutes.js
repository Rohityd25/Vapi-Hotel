/**
 * UPLOAD ROUTES
 * Base: /api/upload
 */
const express = require('express');
const router  = express.Router();
const { uploadRoomImage, deleteRoomImage } = require('../controllers/uploadController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.post('/room-image',        protect, authorize('admin'), uploadRoomImage);
router.delete('/room-image/:public_id', protect, authorize('admin'), deleteRoomImage);

module.exports = router;
