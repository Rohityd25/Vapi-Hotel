/**
 * =============================================
 *  AUTH MIDDLEWARE - JWT Protection
 * =============================================
 * Protects routes by verifying JWT tokens.
 * Used as: router.get('/profile', protect, getProfile)
 */
const jwt  = require('jsonwebtoken');
const User = require('../models/User');

// ─── Protect: Verify JWT & attach user to request ──────────────────────────────
const protect = async (req, res, next) => {
  let token;

  // Check Authorization header: "Bearer <token>"
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }
  // Also check cookie (if you decide to use cookie-based auth later)
  else if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Access denied. Please login to continue.',
    });
  }

  try {
    // Verify the token using our secret key
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Attach user to request (fetch fresh from DB to get latest role/status)
    req.user = await User.findById(decoded.id);

    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'User no longer exists.',
      });
    }

    if (!req.user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Your account has been deactivated. Contact support.',
      });
    }

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired token. Please login again.',
    });
  }
};

// ─── Authorize: Role-based access control ──────────────────────────────────────
// Usage: authorize('admin') or authorize('admin', 'manager')
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Role '${req.user.role}' is not authorized to access this resource.`,
      });
    }
    next();
  };
};

module.exports = { protect, authorize };
