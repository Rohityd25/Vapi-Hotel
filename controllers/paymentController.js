/**
 * =============================================
 *  PAYMENT CONTROLLER - Razorpay Integration
 * =============================================
 * Creates payment orders and verifies payments.
 */
const Razorpay = require('razorpay');
const crypto   = require('crypto');
const Booking  = require('../models/Booking');

// Initialize Razorpay
const razorpay = new Razorpay({
  key_id:     process.env.RAZORPAY_KEY_ID     || 'rzp_test_mock',
  key_secret: process.env.RAZORPAY_KEY_SECRET || 'mock_secret',
});

// ─── @route   POST /api/payments/create-order ──────────────────────────────────
// ─── @access  Private
const createOrder = async (req, res) => {
  const { bookingId } = req.body;

  const booking = await Booking.findById(bookingId);

  if (!booking) {
    return res.status(404).json({ success: false, message: 'Booking not found.' });
  }

  if (booking.user.toString() !== req.user._id.toString()) {
    return res.status(403).json({ success: false, message: 'Unauthorized.' });
  }

  if (booking.payment.status === 'paid') {
    return res.status(400).json({ success: false, message: 'Booking is already paid.' });
  }

  // Amount in paise (Razorpay uses smallest currency unit)
  const amountInPaise = booking.priceBreakdown.totalAmount * 100;

  try {
    // Create Razorpay order
    const order = await razorpay.orders.create({
      amount:   amountInPaise,
      currency: 'INR',
      receipt:  booking.confirmationNumber,
      notes: {
        bookingId:          booking._id.toString(),
        confirmationNumber: booking.confirmationNumber,
      },
    });

    // Save order ID to booking
    booking.payment.razorpay_order_id = order.id;
    await booking.save();

    res.status(200).json({
      success:   true,
      order,
      key_id:    process.env.RAZORPAY_KEY_ID || 'rzp_test_mock',
      booking: {
        id:                 booking._id,
        confirmationNumber: booking.confirmationNumber,
        amount:             booking.priceBreakdown.totalAmount,
      },
    });
  } catch (error) {
    console.error('Razorpay order creation failed:', error);

    // ── MOCK PAYMENT FALLBACK (for development/testing) ──
    const mockOrderId = 'order_mock_' + Date.now();
    booking.payment.razorpay_order_id = mockOrderId;
    await booking.save();

    res.status(200).json({
      success: true,
      isMock:  true,
      order: {
        id:       mockOrderId,
        amount:   amountInPaise,
        currency: 'INR',
      },
      key_id: 'rzp_test_mock',
      booking: {
        id:                 booking._id,
        confirmationNumber: booking.confirmationNumber,
        amount:             booking.priceBreakdown.totalAmount,
      },
    });
  }
};

// ─── @route   POST /api/payments/verify ────────────────────────────────────────
// ─── @access  Private
const verifyPayment = async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, bookingId } = req.body;

  const booking = await Booking.findById(bookingId);
  if (!booking) {
    return res.status(404).json({ success: false, message: 'Booking not found.' });
  }

  // ── For mock payments, skip signature verification ──
  if (razorpay_order_id.startsWith('order_mock_')) {
    booking.payment.status              = 'paid';
    booking.payment.razorpay_payment_id = razorpay_payment_id || 'pay_mock_' + Date.now();
    booking.payment.paidAt              = new Date();
    booking.bookingStatus               = 'confirmed';
    await booking.save();

    return res.status(200).json({
      success: true,
      message: 'Payment verified (mock). Booking confirmed!',
      booking,
    });
  }

  // ── Real Razorpay signature verification ──
  const body = razorpay_order_id + '|' + razorpay_payment_id;
  const expectedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(body.toString())
    .digest('hex');

  if (expectedSignature !== razorpay_signature) {
    return res.status(400).json({ success: false, message: 'Payment verification failed. Invalid signature.' });
  }

  // Update booking payment status
  booking.payment.status              = 'paid';
  booking.payment.razorpay_payment_id = razorpay_payment_id;
  booking.payment.razorpay_signature  = razorpay_signature;
  booking.payment.paidAt              = new Date();
  booking.bookingStatus               = 'confirmed';
  await booking.save();

  res.status(200).json({
    success: true,
    message: 'Payment verified successfully! Booking confirmed.',
    booking,
  });
};

// ─── @route   POST /api/payments/mock-pay ──────────────────────────────────────
// ─── @access  Private (development/testing only)
const mockPay = async (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({ success: false, message: 'Mock payment not allowed in production.' });
  }

  const { bookingId } = req.body;

  const booking = await Booking.findById(bookingId);
  if (!booking) {
    return res.status(404).json({ success: false, message: 'Booking not found.' });
  }

  booking.payment.status              = 'paid';
  booking.payment.method              = 'mock';
  booking.payment.razorpay_payment_id = 'pay_mock_' + Date.now();
  booking.payment.paidAt              = new Date();
  booking.bookingStatus               = 'confirmed';
  await booking.save();

  res.status(200).json({
    success: true,
    message: '✅ Mock payment successful! Booking is now confirmed.',
    booking,
  });
};

module.exports = { createOrder, verifyPayment, mockPay };
