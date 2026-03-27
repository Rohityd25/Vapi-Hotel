/**
 * =============================================
 *  HOTEL VAPI - Main Server Entry Point
 *  Production-level Node.js + Express Server
 * =============================================
 */

// Load environment variables FIRST (before anything else)
require('dotenv').config();
require('express-async-errors'); // handles async errors automatically

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const fileUpload = require('express-fileupload');
const rateLimit = require('express-rate-limit');

// Database connection
const connectDB = require('./config/db');

// Import all route files
const authRoutes      = require('./routes/authRoutes');
const roomRoutes      = require('./routes/roomRoutes');
const bookingRoutes   = require('./routes/bookingRoutes');
const paymentRoutes   = require('./routes/paymentRoutes');
const adminRoutes     = require('./routes/adminRoutes');
const uploadRoutes    = require('./routes/uploadRoutes');

// Import error handler middleware
const { errorHandler, notFound } = require('./middleware/errorMiddleware');

// ─── Initialize App ────────────────────────────────────────────────────────────
const app = express();

// ─── Connect to MongoDB ─────────────────────────────────────────────────────────
connectDB();

// ─── Security Middleware ────────────────────────────────────────────────────────
// helmet adds security headers (prevents XSS, clickjacking, etc.)
app.use(helmet({
  contentSecurityPolicy: false, // allow inline scripts for our frontend
}));

// CORS: allows frontend (different port/domain) to talk to backend
app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? process.env.FRONTEND_URL  // production domain
    : ['http://localhost:3000', 'http://127.0.0.1:5500', 'http://localhost:5500'],
  credentials: true,
}));

// ─── Rate Limiting ──────────────────────────────────────────────────────────────
// Prevents brute-force attacks: max 100 requests per 15 minutes per IP
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: { success: false, message: 'Too many requests, please try again later.' },
});
app.use('/api/', limiter);

// Stricter limit for auth routes (prevent brute-force login)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { success: false, message: 'Too many login attempts, try again in 15 minutes.' },
});
app.use('/api/auth', authLimiter);

// ─── General Middleware ─────────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));           // parse JSON body
app.use(express.urlencoded({ extended: true }));    // parse form data
app.use(morgan('dev'));                              // request logging

// File upload middleware (for image uploads)
app.use(fileUpload({
  useTempFiles: true,
  tempFileDir: '/tmp/',
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
}));

// ─── Serve Static Files ─────────────────────────────────────────────────────────
// Serve the frontend HTML/CSS/JS from the 'public' folder
app.use(express.static(path.join(__dirname, 'public')));

// Serve uploaded images locally (if not using Cloudinary)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ─── API Routes ────────────────────────────────────────────────────────────────
app.use('/api/auth',     authRoutes);     // register, login, profile
app.use('/api/rooms',    roomRoutes);     // CRUD for rooms
app.use('/api/bookings', bookingRoutes);  // create, cancel, history
app.use('/api/payments', paymentRoutes);  // Razorpay payment routes
app.use('/api/admin',    adminRoutes);    // admin dashboard
app.use('/api/upload',   uploadRoutes);   // image upload

// ─── Health Check ───────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Hotel Vapi API is running!',
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString(),
  });
});

// ─── Serve Frontend for All Other Routes (SPA fallback) ─────────────────────────
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ─── Error Handling Middleware (must be LAST) ───────────────────────────────────
app.use(notFound);
app.use(errorHandler);

// ─── Start Server ───────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
  console.log(`\n🏨 Hotel Vapi Server running!`);
  console.log(`📍 Environment: ${process.env.NODE_ENV}`);
  console.log(`🚀 Server: http://localhost:${PORT}`);
  console.log(`📡 API Base: http://localhost:${PORT}/api`);
  console.log(`✅ Health: http://localhost:${PORT}/api/health\n`);
});

// ─── Handle Unhandled Promise Rejections ───────────────────────────────────────
// (e.g., MongoDB disconnects unexpectedly)
process.on('unhandledRejection', (err) => {
  console.error(`❌ Unhandled Rejection: ${err.message}`);
  server.close(() => process.exit(1));
});

module.exports = app;
