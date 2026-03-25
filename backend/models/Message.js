const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  senderId: {
    type: String,
    required: true
  },
  receiverId: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true,
    trim: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  isRead: {
    type: Boolean,
    default: false
  }
}, { timestamps: true });

// Index for faster query on conversations
messageSchema.index({ senderId: 1, receiverId: 1, timestamp: -1 });
messageSchema.index({ receiverId: 1, senderId: 1, timestamp: -1 });
messageSchema.index({ receiverId: 1, isRead: 1 }); // For unread counts query
messageSchema.index({ timestamp: -1 });

module.exports = mongoose.model('Message', messageSchema);
