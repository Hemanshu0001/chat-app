require('dotenv').config();
const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const Message = require('./models/Message');
const User = require('./models/User');

const app = express();
const server = http.createServer(app);

// Socket.io setup with CORS
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Middleware — allow all origins (sandbox + production)
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// Routes
app.use('/api', require('./routes/auth'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api', require('./routes/chat'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'SimpleChat API is running' });
});

// ─────────────────────────────────────────────────
//  Serve React build (production / sandbox mode)
// ─────────────────────────────────────────────────
const frontendDist = path.join(__dirname, '../frontend/dist');
app.use(express.static(frontendDist));

// All non-API routes → React app (Express 5 compatible)
app.use((req, res, next) => {
  if (!req.path.startsWith('/api') && !req.path.startsWith('/socket.io')) {
    res.sendFile(path.join(frontendDist, 'index.html'));
  } else {
    next();
  }
});

// ─────────────────────────────────────────────────
//  Socket.io — Real-time chat
// ─────────────────────────────────────────────────
const onlineUsers = new Map(); // userId -> socketId

io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) return next(new Error('Authentication error'));

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.userId = decoded.userId;
    socket.role = decoded.role;
    next();
  } catch {
    next(new Error('Invalid token'));
  }
});

io.on('connection', async (socket) => {
  const userId = socket.userId;
  console.log(`✅ User connected: ${userId} (${socket.id})`);

  // Register user as online
  onlineUsers.set(userId, socket.id);

  // Update DB online status
  try {
    await User.findOneAndUpdate({ userId }, { isOnline: true, lastSeen: new Date() });
  } catch (e) {
    // Admin may not be in DB — ignore
  }

  // Broadcast online users list to everyone
  io.emit('online_users', Array.from(onlineUsers.keys()));

  // ── Handle sending a message ──
  socket.on('send_message', async (data) => {
    const { receiverId, message } = data;

    if (!receiverId || !message || !message.trim()) return;

    try {
      // Check receiver exists & not blocked
      const receiver = await User.findOne({ userId: receiverId });
      if (!receiver || receiver.isBlocked) return;

      // Save to DB
      const savedMsg = await Message.create({
        senderId: userId,
        receiverId,
        message: message.trim()
      });

      const msgPayload = {
        _id: savedMsg._id,
        senderId: userId,
        receiverId,
        message: savedMsg.message,
        timestamp: savedMsg.timestamp,
        isRead: false
      };

      // Send to receiver if online
      const receiverSocketId = onlineUsers.get(receiverId);
      if (receiverSocketId) {
        io.to(receiverSocketId).emit('receive_message', msgPayload);
      }

      // Echo back to sender for confirmation
      socket.emit('message_sent', msgPayload);
    } catch (err) {
      console.error('Send message socket error:', err);
      socket.emit('message_error', { error: 'Failed to send message' });
    }
  });

  // ── Handle typing indicator ──
  socket.on('typing', ({ receiverId, isTyping }) => {
    const receiverSocketId = onlineUsers.get(receiverId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit('user_typing', { senderId: userId, isTyping });
    }
  });

  // ── Handle WebRTC Signaling ──
  socket.on('call-user', (data) => {
    const { to, offer } = data;
    const receiverSocketId = onlineUsers.get(to);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit('incoming-call', { from: userId, offer });
    }
  });

  socket.on('answer-call', (data) => {
    const { to, answer } = data;
    const receiverSocketId = onlineUsers.get(to);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit('call-answered', { from: userId, answer });
    }
  });

  socket.on('ice-candidate', (data) => {
    const { to, candidate } = data;
    const receiverSocketId = onlineUsers.get(to);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit('ice-candidate', { from: userId, candidate });
    }
  });

  socket.on('reject-call', (data) => {
    const { to } = data;
    const receiverSocketId = onlineUsers.get(to);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit('call-rejected', { from: userId });
    }
  });

  socket.on('end-call', (data) => {
    const { to } = data;
    const receiverSocketId = onlineUsers.get(to);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit('call-ended', { from: userId });
    }
  });

  // ── Handle message deletion ──
  socket.on('delete_messages', ({ messageIds, receiverId }) => {
    if (!messageIds || !receiverId) return;
    
    // Notify the receiver about deleted messages
    const receiverSocketId = onlineUsers.get(receiverId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit('messages_deleted', { 
        messageIds, 
        deletedBy: userId 
      });
    }
  });

  // ── Handle disconnection ──
  socket.on('disconnect', async () => {
    console.log(`❌ User disconnected: ${userId}`);
    onlineUsers.delete(userId);

    try {
      await User.findOneAndUpdate({ userId }, { isOnline: false, lastSeen: new Date() });
    } catch (e) {
      // Admin ignore
    }

    io.emit('online_users', Array.from(onlineUsers.keys()));
  });
});

// ─────────────────────────────────────────────────
//  Connect to MongoDB & Start Server
// ─────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;

mongoose
  .connect(process.env.MONGO_URI)
  .then(async () => {
    console.log('✅ MongoDB connected');
    server.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('❌ MongoDB connection error:', err.message);
    process.exit(1);
  });
