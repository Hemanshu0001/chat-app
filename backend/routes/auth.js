const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

// Generate JWT token
const generateToken = (userId, role) => {
  return jwt.sign({ userId, role }, process.env.JWT_SECRET, { expiresIn: '7d' });
};

// @route   POST /api/login
// @desc    Login user or admin
// @access  Public
router.post('/login', async (req, res) => {
  const { userId, password } = req.body;

  if (!userId || !password) {
    return res.status(400).json({ message: 'Please provide userId and password' });
  }

  try {
    // Check if it's admin
    if (userId === process.env.ADMIN_ID) {
      const isMatch = password === process.env.ADMIN_PASSWORD;
      if (!isMatch) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }
      const token = generateToken(userId, 'admin');
      return res.json({
        token,
        user: { userId, role: 'admin' }
      });
    }

    // Regular user
    const user = await User.findOne({ userId });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    if (user.isBlocked) {
      return res.status(403).json({ message: 'Your account has been blocked. Contact admin.' });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Update online status
    await User.findOneAndUpdate({ userId }, { isOnline: true, lastSeen: new Date() });

    const token = generateToken(user.userId, user.role);
    return res.json({
      token,
      user: { userId: user.userId, role: user.role }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/logout
// @desc    Logout user
// @access  Private
router.post('/logout', async (req, res) => {
  try {
    const { userId } = req.body;
    if (userId) {
      await User.findOneAndUpdate({ userId }, { isOnline: false, lastSeen: new Date() });
    }
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
