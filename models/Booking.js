/**
 * =============================================
 *  BOOKING MODEL - MongoDB Schema
 * =============================================
 * Stores all booking information including
 * guest details, dates, payment status.
 */
const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema(
  {
    // Which room was booked
    room: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Room',
      required: [true, 'Room is required for booking'],
    },

    // Who made the booking
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User is required for booking'],
    },

    // Guest info snapshot (stored so it doesn't change if user updates profile)
    guestInfo: {
      name:  { type: String, required: true },
      email: { type: String, required: true },
      phone: { type: String, required: true },
    },

    // Check-in and check-out dates
    checkIn: {
      type: Date,
      required: [true, 'Check-in date is required'],
    },

    checkOut: {
      type: Date,
      required: [true, 'Check-out date is required'],
    },

    // Number of nights (calculated automatically)
    numOfNights: {
      type: Number,
    },

    // Number of guests
    numOfGuests: {
      type: Number,
      required: true,
      min: [1, 'At least 1 guest required'],
      default: 1,
    },

    // Price breakdown
    priceBreakdown: {
      pricePerNight: { type: Number, required: true },
      numOfNights:   { type: Number, required: true },
      taxRate:       { type: Number, default: 0.18 },  // 18% GST
      taxAmount:     { type: Number },
      totalAmount:   { type: Number, required: true },
    },

    // Booking status workflow
    bookingStatus: {
      type: String,
      enum: ['pending', 'confirmed', 'checked-in', 'checked-out', 'cancelled'],
      default: 'pending',
    },

    // Payment information
    payment: {
      method: {
        type: String,
        enum: ['razorpay', 'cash', 'card', 'mock'],
        default: 'mock',
      },
      status: {
        type: String,
        enum: ['pending', 'paid', 'refunded', 'failed'],
        default: 'pending',
      },
      razorpay_order_id:   String,
      razorpay_payment_id: String,
      razorpay_signature:  String,
      paidAt:              Date,
    },

    // Special requests from guest
    specialRequests: {
      type: String,
      maxLength: [500, 'Special requests cannot exceed 500 characters'],
    },

    // Cancellation info
    cancellation: {
      cancelledAt: Date,
      reason:      String,
      refundAmount: Number,
    },

    // Confirmation number (human-readable)
    confirmationNumber: {
      type: String,
      unique: true,
    },
  },
  {
    timestamps: true,
    toJSON:   { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ─── Auto-generate confirmation number and calculate nights ────────────────────
bookingSchema.pre('save', function (next) {
  // Generate confirmation number only for new bookings
  if (this.isNew) {
    this.confirmationNumber = 'HV' + Date.now().toString().slice(-8).toUpperCase();
  }

  // Calculate number of nights
  if (this.checkIn && this.checkOut) {
    const diff = this.checkOut - this.checkIn;
    this.numOfNights = Math.ceil(diff / (1000 * 60 * 60 * 24));
    this.priceBreakdown.numOfNights = this.numOfNights;

    // Calculate tax and total
    const subtotal = this.priceBreakdown.pricePerNight * this.numOfNights;
    this.priceBreakdown.taxAmount  = Math.round(subtotal * this.priceBreakdown.taxRate);
    this.priceBreakdown.totalAmount = subtotal + this.priceBreakdown.taxAmount;
  }

  next();
});

// ─── Validate check-out is after check-in ──────────────────────────────────────
bookingSchema.pre('validate', function (next) {
  if (this.checkOut <= this.checkIn) {
    next(new Error('Check-out date must be after check-in date'));
  }
  next();
});

// ─── Index for faster date-range queries ────────────────────────────────────────
bookingSchema.index({ room: 1, checkIn: 1, checkOut: 1 });
bookingSchema.index({ user: 1, bookingStatus: 1 });

module.exports = mongoose.model('Booking', bookingSchema);
