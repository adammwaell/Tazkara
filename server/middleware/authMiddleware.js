/**
 * Auth Middleware
 * protect   — verifies JWT, attaches user to req.user
 * adminOnly — restricts to admin role
 */

const jwt  = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
  try {
    const auth = req.headers.authorization;
    if (!auth?.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'No token provided' });
    }
    const decoded = jwt.verify(auth.split(' ')[1], process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-__v');
    if (!user) return res.status(401).json({ success: false, message: 'User not found' });
    if (!user.isApproved) return res.status(403).json({ success: false, message: 'Account not approved' });
    req.user = user;
    next();
  } catch (err) {
    const msg = err.name === 'TokenExpiredError' ? 'Token expired' : 'Invalid token';
    res.status(401).json({ success: false, message: msg });
  }
};

const adminOnly = (req, res, next) => {
  if (req.user?.role !== 'admin' && req.user?.role !== 'superadmin') {
    return res.status(403).json({ success: false, message: 'Admin access required' });
  }
  next();
};

// Super Admin only - for sensitive operations
const superadminOnly = (req, res, next) => {
  if (req.user?.role !== 'superadmin') {
    return res.status(403).json({ success: false, message: 'Super Admin access required' });
  }
  next();
};

// Allows admin OR users with canScan permission
const scannerAccess = (req, res, next) => {
  if (req.user?.role !== 'admin' && req.user?.role !== 'superadmin' && req.user?.permissions?.canScan !== true) {
    return res.status(403).json({ success: false, message: 'Scanner access denied' });
  }
  next();
};

module.exports = { protect, adminOnly, scannerAccess, superadminOnly };
