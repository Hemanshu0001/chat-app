const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Protect routes - verify JWT token
const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Admin is handled separately (not in DB for hardcoded case)
      if (decoded.role === 'admin') {
        req.user = { userId: decoded.userId, role: 'admin' };
        return next();
      }

      // Regular user - check DB
      const user = await User.findOne({ userId: decoded.userId }).select('-password');
      if (!user) {
        return res.status(401).json({ message: 'User not found' });
      }
      if (user.isBlocked) {
        return res.status(403).json({ message: 'Your account has been blocked' });
      }

      req.user = user;
      next();
    } catch (error) {
      return res.status(401).json({ message: 'Not authorized, token failed' });
    }
  } else {
    return res.status(401).json({ message: 'Not authorized, no token' });
  }
};

// Admin only middleware
const adminOnly = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({ message: 'Access denied: Admins only' });
  }
};

// User only middleware
const userOnly = (req, res, next) => {
  if (req.user && req.user.role === 'user') {
    next();
  } else {
    res.status(403).json({ message: 'Access denied: Users only' });
  }
};

module.exports = { protect, adminOnly, userOnly };
