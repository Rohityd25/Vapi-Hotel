/**
 * =============================================
 *  ROOM MODEL - MongoDB Schema
 * =============================================
 * Stores hotel room information including
 * type, price, amenities, and availability.
 */
const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Room name is required'],
      trim: true,
    },

    description: {
      type: String,
      required: [true, 'Room description is required'],
    },

    // Room category
    roomType: {
      type: String,
      required: [true, 'Room type is required'],
      enum: ['Standard', 'Deluxe', 'Suite', 'Presidential', 'Family'],
    },

    // Price per night in Indian Rupees
    pricePerNight: {
      type: Number,
      required: [true, 'Price per night is required'],
      min: [0, 'Price cannot be negative'],
    },

    // Max guests allowed
    capacity: {
      type: Number,
      required: [true, 'Room capacity is required'],
      min: [1, 'Capacity must be at least 1'],
      max: [10, 'Capacity cannot exceed 10'],
    },

    // Room floor number
    floor: {
      type: Number,
      default: 1,
    },

    // Room number (e.g. "101", "202")
    roomNumber: {
      type: String,
      required: [true, 'Room number is required'],
      unique: true,
    },

    // Amenities checklist
    amenities: {
      wifi:         { type: Boolean, default: true },
      ac:           { type: Boolean, default: true },
      tv:           { type: Boolean, default: true },
      minibar:      { type: Boolean, default: false },
      balcony:      { type: Boolean, default: false },
      jacuzzi:      { type: Boolean, default: false },
      breakfast:    { type: Boolean, default: false },
      parking:      { type: Boolean, default: false },
      gym:          { type: Boolean, default: false },
      swimmingPool: { type: Boolean, default: false },
    },

    // Room images array
    images: [
      {
        public_id: String, // Cloudinary public ID
        url: String,       // Cloudinary URL
      },
    ],

    // Is the room active/listed?
    isAvailable: {
      type: Boolean,
      default: true,
    },

    // Overall rating (calculated from reviews)
    ratings: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },

    numOfReviews: {
      type: Number,
      default: 0,
    },

    // Reviews array
    reviews: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
          required: true,
        },
        name:    { type: String, required: true },
        rating:  { type: Number, required: true, min: 1, max: 5 },
        comment: { type: String, required: true },
        date:    { type: Date, default: Date.now },
      },
    ],

    // Who created this room (admin)
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
    toJSON:   { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ─── Index for faster search/filter queries ─────────────────────────────────────
roomSchema.index({ pricePerNight: 1, roomType: 1, isAvailable: 1 });
roomSchema.index({ name: 'text', description: 'text' }); // full-text search

module.exports = mongoose.model('Room', roomSchema);
