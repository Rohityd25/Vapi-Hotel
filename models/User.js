/**
 * =============================================
 *  USER MODEL - MongoDB Schema
 * =============================================
 * Stores user information, hashed passwords,
 * and role (user/admin).
 */
const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');
const jwt      = require('jsonwebtoken');
const crypto   = require('crypto');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please enter your name'],
      trim: true,
      maxLength: [50, 'Name cannot exceed 50 characters'],
    },

    email: {
      type: String,
      required: [true, 'Please enter your email'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        'Please enter a valid email address',
      ],
    },

    password: {
      type: String,
      required: [true, 'Please enter a password'],
      minLength: [6, 'Password must be at least 6 characters'],
      select: false, // Never return password in queries by default
    },

    phone: {
      type: String,
      trim: true,
    },

    avatar: {
      public_id: String,  // Cloudinary image ID
      url: {
        type: String,
        default: 'https://ui-avatars.com/api/?background=c9a96e&color=fff&size=200&name=User',
      },
    },

    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user',
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    // Password reset token fields
    resetPasswordToken:   String,
    resetPasswordExpire:  Date,
  },
  {
    timestamps: true, // auto-adds createdAt and updatedAt
  }
);

// ─── MIDDLEWARE: Hash password before saving ────────────────────────────────────
// This runs every time a user is saved (created or updated)
userSchema.pre('save', async function (next) {
  // Only hash if password was actually modified (not on profile updates)
  if (!this.isModified('password')) return next();

  const saltRounds = 10; // Higher = more secure but slower
  this.password = await bcrypt.hash(this.password, saltRounds);
  next();
});

// ─── METHOD: Compare entered password with hashed one ──────────────────────────
userSchema.methods.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// ─── METHOD: Generate JWT Token ─────────────────────────────────────────────────
userSchema.methods.generateJWT = function () {
  return jwt.sign(
    { id: this._id, role: this.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE || '30d' }
  );
};

// ─── METHOD: Generate Password Reset Token ──────────────────────────────────────
userSchema.methods.generateResetToken = function () {
  // Create a random token
  const resetToken = crypto.randomBytes(20).toString('hex');

  // Hash the token and save (never store plain tokens in DB)
  this.resetPasswordToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

  // Token expires in 10 minutes
  this.resetPasswordExpire = Date.now() + 10 * 60 * 1000;

  return resetToken; // Return the plain token (sent via email)
};

module.exports = mongoose.model('User', userSchema);
