/**
 * =============================================
 *  ADMIN CONTROLLER
 * =============================================
 * Dashboard stats, manage all bookings/users.
 */
const User    = require('../models/User');
const Room    = require('../models/Room');
const Booking = require('../models/Booking');

// ─── @route   GET /api/admin/dashboard ─────────────────────────────────────────
// ─── @access  Admin only
const getDashboardStats = async (req, res) => {
  // Run all queries in parallel for performance
  const [
    totalUsers,
    totalRooms,
    totalBookings,
    revenueData,
    recentBookings,
    bookingStatusCounts,
    roomTypeStats,
  ] = await Promise.all([
    User.countDocuments({ role: 'user' }),
    Room.countDocuments(),
    Booking.countDocuments(),

    // Total revenue from paid bookings
    Booking.aggregate([
      { $match: { 'payment.status': 'paid' } },
      { $group: { _id: null, total: { $sum: '$priceBreakdown.totalAmount' } } },
    ]),

    // Latest 5 bookings
    Booking.find()
      .populate('room', 'name roomNumber')
      .populate('user', 'name email')
      .sort('-createdAt')
      .limit(5),

    // Count by booking status
    Booking.aggregate([
      { $group: { _id: '$bookingStatus', count: { $sum: 1 } } },
    ]),

    // Room type breakdown
    Room.aggregate([
      { $group: { _id: '$roomType', count: { $sum: 1 }, avgPrice: { $avg: '$pricePerNight' } } },
    ]),
  ]);

  const totalRevenue = revenueData[0]?.total || 0;

  res.status(200).json({
    success: true,
    stats: {
      totalUsers,
      totalRooms,
      totalBookings,
      totalRevenue,
    },
    recentBookings,
    bookingStatusCounts,
    roomTypeStats,
  });
};

// ─── @route   GET /api/admin/bookings ──────────────────────────────────────────
// ─── @access  Admin only
const getAllBookings = async (req, res) => {
  const page  = parseInt(req.query.page)  || 1;
  const limit = parseInt(req.query.limit) || 20;
  const skip  = (page - 1) * limit;

  // Filter by status if provided
  const filter = {};
  if (req.query.status) filter.bookingStatus = req.query.status;

  const [bookings, total] = await Promise.all([
    Booking.find(filter)
      .populate('room', 'name roomNumber roomType')
      .populate('user', 'name email phone')
      .sort('-createdAt')
      .skip(skip)
      .limit(limit),
    Booking.countDocuments(filter),
  ]);

  res.status(200).json({
    success: true,
    count:       bookings.length,
    total,
    totalPages:  Math.ceil(total / limit),
    currentPage: page,
    bookings,
  });
};

// ─── @route   PUT /api/admin/bookings/:id/status ───────────────────────────────
// ─── @access  Admin only
const updateBookingStatus = async (req, res) => {
  const { status } = req.body;

  const booking = await Booking.findByIdAndUpdate(
    req.params.id,
    { bookingStatus: status },
    { new: true, runValidators: true }
  ).populate('room', 'name').populate('user', 'name email');

  if (!booking) {
    return res.status(404).json({ success: false, message: 'Booking not found.' });
  }

  res.status(200).json({
    success: true,
    message: `Booking status updated to '${status}'.`,
    booking,
  });
};

// ─── @route   GET /api/admin/users ─────────────────────────────────────────────
// ─── @access  Admin only
const getAllUsers = async (req, res) => {
  const users = await User.find().sort('-createdAt');
  res.status(200).json({ success: true, count: users.length, users });
};

// ─── @route   PUT /api/admin/users/:id/toggle-status ──────────────────────────
// ─── @access  Admin only
const toggleUserStatus = async (req, res) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    return res.status(404).json({ success: false, message: 'User not found.' });
  }

  // Prevent admin from deactivating themselves
  if (user._id.toString() === req.user._id.toString()) {
    return res.status(400).json({ success: false, message: 'Cannot deactivate your own account.' });
  }

  user.isActive = !user.isActive;
  await user.save();

  res.status(200).json({
    success: true,
    message: `User ${user.isActive ? 'activated' : 'deactivated'} successfully.`,
    user,
  });
};

// ─── @route   DELETE /api/admin/users/:id ──────────────────────────────────────
// ─── @access  Admin only
const deleteUser = async (req, res) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    return res.status(404).json({ success: false, message: 'User not found.' });
  }

  if (user.role === 'admin') {
    return res.status(400).json({ success: false, message: 'Cannot delete an admin account.' });
  }

  await user.deleteOne();

  res.status(200).json({ success: true, message: 'User deleted successfully.' });
};

module.exports = {
  getDashboardStats,
  getAllBookings,
  updateBookingStatus,
  getAllUsers,
  toggleUserStatus,
  deleteUser,
};
