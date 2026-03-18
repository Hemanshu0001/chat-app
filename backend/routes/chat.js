const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Message = require('../models/Message');
const { protect } = require('../middleware/auth');

// All chat routes require authentication
router.use(protect);

// @route   GET /api/users
// @desc    Get all unblocked users (except self)
// @access  Protected
router.get('/users', async (req, res) => {
  try {
    const users = await User.find({
      role: 'user',
      isBlocked: false,
      userId: { $ne: req.user.userId }
    }).select('-password').sort({ isOnline: -1, userId: 1 });

    res.json(users);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/messages/:userId
// @desc    Get conversation between two users
// @access  Protected
router.get('/messages/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUser = req.user.userId;

    const messages = await Message.find({
      $or: [
        { senderId: currentUser, receiverId: userId },
        { senderId: userId, receiverId: currentUser }
      ]
    }).sort({ timestamp: 1 }).limit(100);

    // Mark messages as read
    await Message.updateMany(
      { senderId: userId, receiverId: currentUser, isRead: false },
      { isRead: true }
    );

    res.json(messages);
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/messages
// @desc    Send a message (REST fallback)
// @access  Protected
router.post('/messages', async (req, res) => {
  const { receiverId, message } = req.body;

  if (!receiverId || !message) {
    return res.status(400).json({ message: 'receiverId and message are required' });
  }

  try {
    // Check receiver exists and is not blocked
    const receiver = await User.findOne({ userId: receiverId });
    if (!receiver) {
      return res.status(404).json({ message: 'Receiver not found' });
    }
    if (receiver.isBlocked) {
      return res.status(403).json({ message: 'Cannot send message to blocked user' });
    }

    const newMessage = await Message.create({
      senderId: req.user.userId,
      receiverId,
      message: message.trim()
    });

    res.status(201).json(newMessage);
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/unread-counts
// @desc    Get unread message counts per sender
// @access  Protected
router.get('/unread-counts', async (req, res) => {
  try {
    const counts = await Message.aggregate([
      {
        $match: {
          receiverId: req.user.userId,
          isRead: false
        }
      },
      {
        $group: {
          _id: '$senderId',
          count: { $sum: 1 }
        }
      }
    ]);

    const result = {};
    counts.forEach(item => {
      result[item._id] = item.count;
    });

    res.json(result);
  } catch (error) {
    console.error('Unread counts error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/messages/delete-multiple
// @desc    Delete multiple messages (only sender's messages)
// @access  Protected
// NOTE: This route MUST be defined BEFORE /messages/:id to avoid route conflicts
router.post('/messages/delete-multiple', async (req, res) => {
  const { messageIds } = req.body;
  
  if (!messageIds || !Array.isArray(messageIds) || messageIds.length === 0) {
    return res.status(400).json({ message: 'messageIds array is required' });
  }
  
  try {
    // Find all messages that belong to the current user
    const messages = await Message.find({
      _id: { $in: messageIds },
      senderId: req.user.userId
    });
    
    if (messages.length === 0) {
      return res.status(404).json({ message: 'No deletable messages found' });
    }
    
    const deletableIds = messages.map(m => m._id);
    const receivers = [...new Set(messages.map(m => m.receiverId))];
    
    // Delete the messages
    await Message.deleteMany({ _id: { $in: deletableIds } });
    
    res.json({ 
      message: `${deletableIds.length} message(s) deleted successfully`,
      deletedIds: deletableIds.map(id => id.toString()),
      receivers
    });
  } catch (error) {
    console.error('Delete multiple messages error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   DELETE /api/messages/:id
// @desc    Delete a single message (only sender can delete)
// @access  Protected
router.delete('/messages/:id', async (req, res) => {
  try {
    const message = await Message.findById(req.params.id);
    
    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }
    
    // Only the sender can delete their message
    if (message.senderId !== req.user.userId) {
      return res.status(403).json({ message: 'You can only delete your own messages' });
    }
    
    await Message.findByIdAndDelete(req.params.id);
    
    res.json({ 
      message: 'Message deleted successfully',
      deletedId: req.params.id,
      receiverId: message.receiverId
    });
  } catch (error) {
    console.error('Delete message error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
