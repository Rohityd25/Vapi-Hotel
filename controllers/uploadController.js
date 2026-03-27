/**
 * =============================================
 *  UPLOAD CONTROLLER - Image Upload
 * =============================================
 * Handles image uploads to Cloudinary.
 */
const cloudinary = require('../config/cloudinary');
const path       = require('path');
const fs         = require('fs');

// ─── @route   POST /api/upload/room-image ──────────────────────────────────────
// ─── @access  Admin only
const uploadRoomImage = async (req, res) => {
  if (!req.files || !req.files.image) {
    return res.status(400).json({ success: false, message: 'Please upload an image file.' });
  }

  const file = req.files.image;

  // Validate file type
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  if (!allowedTypes.includes(file.mimetype)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid file type. Please upload JPEG, PNG, or WebP images.',
    });
  }

  // Validate file size (max 5MB)
  if (file.size > 5 * 1024 * 1024) {
    return res.status(400).json({ success: false, message: 'File size exceeds 5MB limit.' });
  }

  try {
    // Upload to Cloudinary
    const result = await cloudinary.uploader.upload(file.tempFilePath, {
      folder:         'hotel-vapi/rooms',
      transformation: [
        { width: 1200, height: 800, crop: 'fill', quality: 'auto' },
      ],
    });

    // Delete temp file
    fs.unlinkSync(file.tempFilePath);

    res.status(200).json({
      success:   true,
      message:   'Image uploaded successfully.',
      public_id: result.public_id,
      url:       result.secure_url,
    });
  } catch (error) {
    // ── Fallback: Save to local /uploads folder if Cloudinary fails ──
    const filename       = `room_${Date.now()}${path.extname(file.name)}`;
    const uploadDir      = path.join(__dirname, '..', 'uploads', 'rooms');

    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    await file.mv(path.join(uploadDir, filename));

    res.status(200).json({
      success:   true,
      message:   'Image saved locally (Cloudinary unavailable).',
      public_id: filename,
      url:       `/uploads/rooms/${filename}`,
    });
  }
};

// ─── @route   DELETE /api/upload/room-image/:public_id ─────────────────────────
// ─── @access  Admin only
const deleteRoomImage = async (req, res) => {
  const { public_id } = req.params;

  try {
    await cloudinary.uploader.destroy(public_id);
    res.status(200).json({ success: true, message: 'Image deleted from Cloudinary.' });
  } catch (error) {
    // Try local delete
    const localPath = path.join(__dirname, '..', 'uploads', 'rooms', public_id);
    if (fs.existsSync(localPath)) {
      fs.unlinkSync(localPath);
    }
    res.status(200).json({ success: true, message: 'Image deleted.' });
  }
};

module.exports = { uploadRoomImage, deleteRoomImage };
