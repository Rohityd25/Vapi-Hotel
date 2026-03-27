/**
 * =============================================
 *  ROOM CONTROLLER
 * =============================================
 * Handles: Get all rooms, single room, 
 * create/update/delete, availability check,
 * reviews, and search/filter.
 */
const Room    = require('../models/Room');
const Booking = require('../models/Booking');

// ─── @route   GET /api/rooms ────────────────────────────────────────────────────
// ─── @access  Public
// Supports filtering, sorting, pagination
const getAllRooms = async (req, res) => {
  // Build query from URL params: ?roomType=Suite&minPrice=1000&maxPrice=5000
  const queryObj = { ...req.query };

  // Fields to exclude from filter (they're for pagination/sort, not filter)
  ['page', 'limit', 'sort', 'fields', 'keyword'].forEach(
    (field) => delete queryObj[field]
  );

  // Build base filter
  let filter = { isAvailable: true };

  if (queryObj.roomType) filter.roomType = queryObj.roomType;

  if (queryObj.minPrice || queryObj.maxPrice) {
    filter.pricePerNight = {};
    if (queryObj.minPrice) filter.pricePerNight.$gte = Number(queryObj.minPrice);
    if (queryObj.maxPrice) filter.pricePerNight.$lte = Number(queryObj.maxPrice);
  }

  if (queryObj.capacity) filter.capacity = { $gte: Number(queryObj.capacity) };

  // Text search in name & description
  if (req.query.keyword) {
    filter.$text = { $search: req.query.keyword };
  }

  // Date availability filter: exclude rooms booked on those dates
  if (req.query.checkIn && req.query.checkOut) {
    const checkIn  = new Date(req.query.checkIn);
    const checkOut = new Date(req.query.checkOut);

    // Find rooms that ARE booked (overlapping dates)
    const bookedRooms = await Booking.find({
      bookingStatus: { $in: ['pending', 'confirmed', 'checked-in'] },
      $or: [
        { checkIn: { $lt: checkOut }, checkOut: { $gt: checkIn } },
      ],
    }).distinct('room');

    // Exclude those booked rooms
    filter._id = { $nin: bookedRooms };
  }

  // Sorting: ?sort=-pricePerNight (desc) or ?sort=pricePerNight (asc)
  const sort = req.query.sort ? req.query.sort.replace(',', ' ') : '-createdAt';

  // Pagination
  const page  = Math.max(1, parseInt(req.query.page)  || 1);
  const limit = Math.min(50, parseInt(req.query.limit) || 12);
  const skip  = (page - 1) * limit;

  // Execute query
  const [rooms, totalRooms] = await Promise.all([
    Room.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(), // .lean() returns plain JS objects - faster
    Room.countDocuments(filter),
  ]);

  const totalPages = Math.ceil(totalRooms / limit);

  res.status(200).json({
    success: true,
    count:      rooms.length,
    totalRooms,
    totalPages,
    currentPage: page,
    rooms,
  });
};

// ─── @route   GET /api/rooms/:id ───────────────────────────────────────────────
// ─── @access  Public
const getRoomById = async (req, res) => {
  const room = await Room.findById(req.params.id).populate('createdBy', 'name email');

  if (!room) {
    return res.status(404).json({ success: false, message: 'Room not found.' });
  }

  res.status(200).json({ success: true, room });
};

// ─── @route   POST /api/rooms ──────────────────────────────────────────────────
// ─── @access  Admin only
const createRoom = async (req, res) => {
  // Attach the creating admin's ID
  req.body.createdBy = req.user._id;

  const room = await Room.create(req.body);

  res.status(201).json({
    success: true,
    message: `Room "${room.name}" created successfully.`,
    room,
  });
};

// ─── @route   PUT /api/rooms/:id ───────────────────────────────────────────────
// ─── @access  Admin only
const updateRoom = async (req, res) => {
  let room = await Room.findById(req.params.id);

  if (!room) {
    return res.status(404).json({ success: false, message: 'Room not found.' });
  }

  room = await Room.findByIdAndUpdate(req.params.id, req.body, {
    new:            true,  // return updated document
    runValidators:  true,  // run schema validators on update
  });

  res.status(200).json({ success: true, message: 'Room updated successfully.', room });
};

// ─── @route   DELETE /api/rooms/:id ────────────────────────────────────────────
// ─── @access  Admin only
const deleteRoom = async (req, res) => {
  const room = await Room.findById(req.params.id);

  if (!room) {
    return res.status(404).json({ success: false, message: 'Room not found.' });
  }

  // Check for active bookings before deleting
  const activeBookings = await Booking.countDocuments({
    room:          req.params.id,
    bookingStatus: { $in: ['pending', 'confirmed', 'checked-in'] },
  });

  if (activeBookings > 0) {
    return res.status(400).json({
      success: false,
      message: `Cannot delete room with ${activeBookings} active booking(s). Cancel bookings first.`,
    });
  }

  await room.deleteOne();

  res.status(200).json({ success: true, message: 'Room deleted successfully.' });
};

// ─── @route   GET /api/rooms/:id/availability ──────────────────────────────────
// ─── @access  Public
const checkAvailability = async (req, res) => {
  const { checkIn, checkOut } = req.query;

  if (!checkIn || !checkOut) {
    return res.status(400).json({ success: false, message: 'Please provide checkIn and checkOut dates.' });
  }

  const room = await Room.findById(req.params.id);
  if (!room) {
    return res.status(404).json({ success: false, message: 'Room not found.' });
  }

  // Check if there is any overlapping booking
  const overlapping = await Booking.findOne({
    room:          req.params.id,
    bookingStatus: { $in: ['pending', 'confirmed', 'checked-in'] },
    $or: [
      { checkIn: { $lt: new Date(checkOut) }, checkOut: { $gt: new Date(checkIn) } },
    ],
  });

  const isAvailable = !overlapping;
  const nights = Math.ceil(
    (new Date(checkOut) - new Date(checkIn)) / (1000 * 60 * 60 * 24)
  );

  res.status(200).json({
    success:     true,
    isAvailable,
    roomId:      req.params.id,
    checkIn,
    checkOut,
    nights,
    estimatedCost: isAvailable ? room.pricePerNight * nights : null,
  });
};

// ─── @route   POST /api/rooms/:id/reviews ──────────────────────────────────────
// ─── @access  Private (must have stayed in room)
const addReview = async (req, res) => {
  const { rating, comment } = req.body;

  // Verify user actually booked this room
  const booking = await Booking.findOne({
    user:          req.user._id,
    room:          req.params.id,
    bookingStatus: 'checked-out',
  });

  if (!booking) {
    return res.status(403).json({
      success: false,
      message: 'You can only review a room you have stayed in.',
    });
  }

  const room = await Room.findById(req.params.id);

  // Check if user already reviewed
  const alreadyReviewed = room.reviews.find(
    (r) => r.user.toString() === req.user._id.toString()
  );

  if (alreadyReviewed) {
    // Update existing review
    room.reviews = room.reviews.map((r) =>
      r.user.toString() === req.user._id.toString()
        ? { ...r._doc, rating: Number(rating), comment }
        : r
    );
  } else {
    // Add new review
    room.reviews.push({
      user:    req.user._id,
      name:    req.user.name,
      rating:  Number(rating),
      comment,
    });
    room.numOfReviews = room.reviews.length;
  }

  // Recalculate average rating
  room.ratings =
    room.reviews.reduce((acc, r) => acc + r.rating, 0) / room.reviews.length;

  await room.save();

  res.status(200).json({ success: true, message: 'Review added successfully.' });
};

module.exports = {
  getAllRooms,
  getRoomById,
  createRoom,
  updateRoom,
  deleteRoom,
  checkAvailability,
  addReview,
};
