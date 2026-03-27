/**
 * =============================================
 *  AUTH CONTROLLER
 * =============================================
 * Handles: Register, Login, Profile, Logout
 */
const User   = require('../models/User');
const crypto = require('crypto');
const { sendEmail } = require('../utils/sendEmail');

// ─── Helper: Create token and send response ─────────────────────────────────────
const sendTokenResponse = (user, statusCode, res, message = 'Success') => {
  const token = user.generateJWT();

  res.status(statusCode).json({
    success: true,
    message,
    token,
    user: {
      _id:    user._id,
      name:   user.name,
      email:  user.email,
      role:   user.role,
      avatar: user.avatar,
      phone:  user.phone,
    },
  });
};

// ─── @route   POST /api/auth/register ──────────────────────────────────────────
// ─── @access  Public
const register = async (req, res) => {
  const { name, email, password, phone } = req.body;

  // Check if user already exists
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return res.status(400).json({ success: false, message: 'Email already registered. Please login.' });
  }

  // Create new user (password gets hashed by model middleware)
  const user = await User.create({ name, email, password, phone });

  // Send welcome email (non-blocking - don't fail if email fails)
  try {
    await sendEmail({
      to:      email,
      subject: 'Welcome to Hotel Vapi! 🏨',
      html: `
        <h2>Welcome, ${name}!</h2>
        <p>Thank you for registering with <strong>Hotel Vapi</strong>.</p>
        <p>You can now browse and book our premium rooms.</p>
        <br/>
        <p>Best regards,<br/>Hotel Vapi Team</p>
      `,
    });
  } catch (emailError) {
    console.error('Welcome email failed:', emailError.message);
  }

  sendTokenResponse(user, 201, res, 'Registration successful! Welcome to Hotel Vapi.');
};

// ─── @route   POST /api/auth/login ─────────────────────────────────────────────
// ─── @access  Public
const login = async (req, res) => {
  const { email, password } = req.body;

  // Validate required fields
  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Please provide email and password.' });
  }

  // Find user and explicitly select password (it's excluded by default)
  const user = await User.findOne({ email }).select('+password');

  if (!user) {
    return res.status(401).json({ success: false, message: 'Invalid email or password.' });
  }

  // Check if account is active
  if (!user.isActive) {
    return res.status(401).json({ success: false, message: 'Account deactivated. Contact support.' });
  }

  // Compare passwords
  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    return res.status(401).json({ success: false, message: 'Invalid email or password.' });
  }

  sendTokenResponse(user, 200, res, `Welcome back, ${user.name}!`);
};

// ─── @route   GET /api/auth/me ──────────────────────────────────────────────────
// ─── @access  Private (requires JWT)
const getMe = async (req, res) => {
  const user = await User.findById(req.user._id);
  res.status(200).json({ success: true, user });
};

// ─── @route   PUT /api/auth/profile ────────────────────────────────────────────
// ─── @access  Private
const updateProfile = async (req, res) => {
  const { name, phone } = req.body;

  const user = await User.findByIdAndUpdate(
    req.user._id,
    { name, phone },
    { new: true, runValidators: true }
  );

  res.status(200).json({ success: true, message: 'Profile updated successfully.', user });
};

// ─── @route   PUT /api/auth/change-password ────────────────────────────────────
// ─── @access  Private
const changePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  const user = await User.findById(req.user._id).select('+password');

  const isMatch = await user.comparePassword(currentPassword);
  if (!isMatch) {
    return res.status(400).json({ success: false, message: 'Current password is incorrect.' });
  }

  user.password = newPassword;
  await user.save();

  sendTokenResponse(user, 200, res, 'Password changed successfully.');
};

// ─── @route   POST /api/auth/forgot-password ───────────────────────────────────
// ─── @access  Public
const forgotPassword = async (req, res) => {
  const user = await User.findOne({ email: req.body.email });

  if (!user) {
    // Don't reveal if email exists (security best practice)
    return res.status(200).json({
      success: true,
      message: 'If this email exists, a reset link has been sent.',
    });
  }

  const resetToken = user.generateResetToken();
  await user.save({ validateBeforeSave: false });

  const resetUrl = `${req.protocol}://${req.get('host')}/reset-password.html?token=${resetToken}`;

  try {
    await sendEmail({
      to:      user.email,
      subject: 'Hotel Vapi - Password Reset Request',
      html: `
        <h2>Password Reset</h2>
        <p>You requested a password reset for your Hotel Vapi account.</p>
        <p>Click below to reset your password (valid for 10 minutes):</p>
        <a href="${resetUrl}" style="background:#c9a96e;color:white;padding:12px 24px;text-decoration:none;border-radius:4px;">
          Reset Password
        </a>
        <p>If you didn't request this, ignore this email.</p>
      `,
    });

    res.status(200).json({ success: true, message: 'Password reset email sent.' });
  } catch (error) {
    user.resetPasswordToken  = undefined;
    user.resetPasswordExpire = undefined;
    await user.save({ validateBeforeSave: false });

    res.status(500).json({ success: false, message: 'Email could not be sent. Try again.' });
  }
};

// ─── @route   POST /api/auth/reset-password/:token ─────────────────────────────
// ─── @access  Public
const resetPassword = async (req, res) => {
  // Hash the incoming token to compare with what's stored in DB
  const hashedToken = crypto
    .createHash('sha256')
    .update(req.params.token)
    .digest('hex');

  const user = await User.findOne({
    resetPasswordToken:  hashedToken,
    resetPasswordExpire: { $gt: Date.now() }, // Token not expired
  });

  if (!user) {
    return res.status(400).json({ success: false, message: 'Invalid or expired reset token.' });
  }

  user.password            = req.body.password;
  user.resetPasswordToken  = undefined;
  user.resetPasswordExpire = undefined;
  await user.save();

  sendTokenResponse(user, 200, res, 'Password reset successfully.');
};

module.exports = {
  register,
  login,
  getMe,
  updateProfile,
  changePassword,
  forgotPassword,
  resetPassword,
};
