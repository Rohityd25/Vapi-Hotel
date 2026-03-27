/**
 * =============================================
 *  BOOKING CONTROLLER
 * =============================================
 * Handles: Create booking, cancel, history,
 * single booking, check-in/out status updates.
 */
const Booking = require('../models/Booking');
const Room    = require('../models/Room');
const { sendEmail } = require('../utils/sendEmail');

// ─── @route   POST /api/bookings ──────────────────────────────────────────────
// ─── @access  Private
const createBooking = async (req, res) => {
  const { roomId, checkIn, checkOut, numOfGuests, specialRequests, guestInfo } = req.body;

  // Validate dates
  const checkInDate  = new Date(checkIn);
  const checkOutDate = new Date(checkOut);

  if (checkInDate < new Date()) {
    return res.status(400).json({ success: false, message: 'Check-in date cannot be in the past.' });
  }

  if (checkOutDate <= checkInDate) {
    return res.status(400).json({ success: false, message: 'Check-out must be after check-in.' });
  }

  // Get room details
  const room = await Room.findById(roomId);
  if (!room) {
    return res.status(404).json({ success: false, message: 'Room not found.' });
  }

  if (!room.isAvailable) {
    return res.status(400).json({ success: false, message: 'This room is not available for booking.' });
  }

  // Check for date conflicts (real-time availability check)
  const conflict = await Booking.findOne({
    room:          roomId,
    bookingStatus: { $in: ['pending', 'confirmed', 'checked-in'] },
    $or: [
      { checkIn: { $lt: checkOutDate }, checkOut: { $gt: checkInDate } },
    ],
  });

  if (conflict) {
    return res.status(409).json({
      success: false,
      message: 'Room is already booked for the selected dates. Please choose different dates.',
      bookedUntil: conflict.checkOut,
    });
  }

  // Calculate pricing
  const nights      = Math.ceil((checkOutDate - checkInDate) / (1000 * 60 * 60 * 24));
  const subtotal    = room.pricePerNight * nights;
  const taxRate     = 0.18; // 18% GST
  const taxAmount   = Math.round(subtotal * taxRate);
  const totalAmount = subtotal + taxAmount;

  // Create booking
  const booking = await Booking.create({
    room:          roomId,
    user:          req.user._id,
    checkIn:       checkInDate,
    checkOut:      checkOutDate,
    numOfGuests:   numOfGuests || 1,
    specialRequests,
    guestInfo: {
      name:  guestInfo?.name  || req.user.name,
      email: guestInfo?.email || req.user.email,
      phone: guestInfo?.phone || req.user.phone || 'N/A',
    },
    priceBreakdown: {
      pricePerNight: room.pricePerNight,
      numOfNights:   nights,
      taxRate,
      taxAmount,
      totalAmount,
    },
  });

  // Populate room info before returning
  await booking.populate('room', 'name roomNumber roomType images');

  // Send confirmation email
  try {
    await sendEmail({
      to:      booking.guestInfo.email,
      subject: `Booking Confirmed! #${booking.confirmationNumber} - Hotel Vapi`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;">
          <div style="background:#1a1a2e;color:white;padding:20px;text-align:center;">
            <h1>🏨 Hotel Vapi</h1>
            <h2>Booking Confirmed!</h2>
          </div>
          <div style="padding:20px;background:#f9f9f9;">
            <p>Dear <strong>${booking.guestInfo.name}</strong>,</p>
            <p>Your booking has been confirmed. Here are your details:</p>
            <table style="width:100%;border-collapse:collapse;">
              <tr><td style="padding:8px;font-weight:bold;">Confirmation #:</td><td style="padding:8px;">${booking.confirmationNumber}</td></tr>
              <tr style="background:#fff;"><td style="padding:8px;font-weight:bold;">Room:</td><td style="padding:8px;">${booking.room.name} (${booking.room.roomNumber})</td></tr>
              <tr><td style="padding:8px;font-weight:bold;">Check-In:</td><td style="padding:8px;">${checkInDate.toDateString()}</td></tr>
              <tr style="background:#fff;"><td style="padding:8px;font-weight:bold;">Check-Out:</td><td style="padding:8px;">${checkOutDate.toDateString()}</td></tr>
              <tr><td style="padding:8px;font-weight:bold;">Nights:</td><td style="padding:8px;">${nights}</td></tr>
              <tr style="background:#fff;"><td style="padding:8px;font-weight:bold;">Total Amount:</td><td style="padding:8px;">₹${totalAmount.toLocaleString()} (incl. GST)</td></tr>
            </table>
            <p style="margin-top:20px;color:#888;">We look forward to hosting you!</p>
          </div>
          <div style="background:#c9a96e;color:white;padding:10px;text-align:center;">
            <p>Hotel Vapi | Vapi, Gujarat | +91-XXXXXXXXXX</p>
          </div>
        </div>
      `,
    });
  } catch (emailErr) {
    console.error('Booking confirmation email failed:', emailErr.message);
  }

  res.status(201).json({
    success: true,
    message: `Booking confirmed! Your confirmation number is ${booking.confirmationNumber}`,
    booking,
  });
};

// ─── @route   GET /api/bookings/my-bookings ─────────────────────────────────────
// ─── @access  Private
const getMyBookings = async (req, res) => {
  const bookings = await Booking.find({ user: req.user._id })
    .populate('room', 'name roomNumber roomType images pricePerNight')
    .sort('-createdAt');

  res.status(200).json({
    success: true,
    count:   bookings.length,
    bookings,
  });
};

// ─── @route   GET /api/bookings/:id ────────────────────────────────────────────
// ─── @access  Private
const getBookingById = async (req, res) => {
  const booking = await Booking.findById(req.params.id)
    .populate('room', 'name roomNumber roomType images amenities')
    .populate('user', 'name email phone');

  if (!booking) {
    return res.status(404).json({ success: false, message: 'Booking not found.' });
  }

  // Only allow the booking owner or admin to see it
  if (booking.user._id.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Access denied.' });
  }

  res.status(200).json({ success: true, booking });
};

// ─── @route   PUT /api/bookings/:id/cancel ──────────────────────────────────────
// ─── @access  Private
const cancelBooking = async (req, res) => {
  const booking = await Booking.findById(req.params.id)
    .populate('room', 'name roomNumber');

  if (!booking) {
    return res.status(404).json({ success: false, message: 'Booking not found.' });
  }

  // Only booking owner or admin can cancel
  if (booking.user.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Access denied.' });
  }

  // Cannot cancel already cancelled or completed bookings
  if (['cancelled', 'checked-out'].includes(booking.bookingStatus)) {
    return res.status(400).json({
      success: false,
      message: `Booking cannot be cancelled (status: ${booking.bookingStatus}).`,
    });
  }

  // Refund policy: Full refund if cancelled 48h before check-in
  const hoursUntilCheckIn = (booking.checkIn - Date.now()) / (1000 * 60 * 60);
  const refundAmount =
    hoursUntilCheckIn > 48
      ? booking.priceBreakdown.totalAmount
      : Math.round(booking.priceBreakdown.totalAmount * 0.5); // 50% refund after 48h

  booking.bookingStatus        = 'cancelled';
  booking.cancellation         = {
    cancelledAt:  new Date(),
    reason:       req.body.reason || 'Cancelled by user',
    refundAmount,
  };
  booking.payment.status = bookingCancelledStatus(booking.payment.status);
  await booking.save();

  // Send cancellation email
  try {
    await sendEmail({
      to:      booking.guestInfo.email,
      subject: `Booking Cancelled - #${booking.confirmationNumber} | Hotel Vapi`,
      html: `
        <h2>Booking Cancellation Confirmed</h2>
        <p>Your booking <strong>#${booking.confirmationNumber}</strong> has been cancelled.</p>
        <p>Refund Amount: <strong>₹${refundAmount.toLocaleString()}</strong></p>
        <p>Refunds are processed within 5-7 business days.</p>
      `,
    });
  } catch (e) { /* silent fail */ }

  res.status(200).json({
    success: true,
    message: 'Booking cancelled successfully.',
    refundAmount,
    booking,
  });
};

// Helper: determine refund status based on payment status
function bookingCancelledStatus(paymentStatus) {
  if (paymentStatus === 'paid') return 'refunded';
  return paymentStatus;
}

module.exports = {
  createBooking,
  getMyBookings,
  getBookingById,
  cancelBooking,
};
