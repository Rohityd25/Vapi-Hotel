/**
 * =============================================
 *  ERROR HANDLING MIDDLEWARE
 * =============================================
 * Centralized error handling for the entire app.
 * All errors flow through here, keeping controllers clean.
 */

// ─── 404 Not Found Handler ─────────────────────────────────────────────────────
const notFound = (req, res, next) => {
  const error = new Error(`Route not found: ${req.originalUrl}`);
  res.status(404);
  next(error);
};

// ─── Central Error Handler ──────────────────────────────────────────────────────
const errorHandler = (err, req, res, next) => {
  // Default to 500 if status wasn't set
  let statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  let message    = err.message || 'Internal Server Error';

  // ── Mongoose: Invalid ObjectId (e.g., /rooms/notanid) ──
  if (err.name === 'CastError' && err.kind === 'ObjectId') {
    statusCode = 404;
    message    = 'Resource not found (invalid ID format).';
  }

  // ── Mongoose: Duplicate key (e.g., email already exists) ──
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    statusCode  = 400;
    message     = `Duplicate value for field: '${field}'. This value already exists.`;
  }

  // ── Mongoose: Validation errors ──
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message    = Object.values(err.errors)
      .map((val) => val.message)
      .join(', ');
  }

  // ── JWT: Invalid token ──
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message    = 'Invalid token. Please login again.';
  }

  // ── JWT: Token expired ──
  if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message    = 'Token expired. Please login again.';
  }

  // Send error response
  res.status(statusCode).json({
    success: false,
    message,
    // Only show stack trace in development mode
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

module.exports = { notFound, errorHandler };
