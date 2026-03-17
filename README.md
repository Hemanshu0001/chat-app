# 💬 SimpleChat

A clean, minimal, beginner-friendly **real-time chat application** built with React, Node.js, Express, MongoDB, and Socket.io.

---

## 🌐 Live URL

| Service | URL |
|---------|-----|
| **App (Frontend + Backend)** | `https://5000-<sandbox>.novita.ai` |
| **API Base** | `https://5000-<sandbox>.novita.ai/api` |

---

## ✅ Completed Features

### 🔐 Authentication
- Login with User ID + Password (no signup — admin controls users)
- JWT-based authentication (7-day tokens)
- bcrypt password hashing
- Blocked users are denied login with a clear error message
- Role-based routing: `admin` → Admin Panel, `user` → Chat Page

### 🛡️ Admin Panel
- View all users in a table with online/offline/blocked status
- Add new users (User ID + Password)
- Block / Unblock users
- Delete users
- Real-time stats: Total users, Online count, Blocked count
- User search/filter

### 💬 Chat System
- One-to-one real-time messaging via **Socket.io**
- Messages stored in MongoDB
- Message history loaded on conversation open
- Unread message badge counter per user
- Auto-scroll to latest message
- Date grouping ("Today", "Yesterday", date)
- Message read receipts (✓ / ✓✓)

### 🟢 Online Presence
- Real-time online/offline indicators
- Online dot on user avatars
- "typing…" indicator with animated dots

### 📱 Responsive Design
- **Mobile**: Full-screen chat, collapsible user list with back button
- **Tablet + Desktop**: WhatsApp-style split layout (sidebar + chat)
- Clean WhatsApp-inspired UI with custom CSS (no heavy UI libraries)

---

## 📂 Project Structure

```
webapp/
├── backend/
│   ├── models/
│   │   ├── User.js          # Mongoose user schema
│   │   └── Message.js       # Mongoose message schema
│   ├── routes/
│   │   ├── auth.js          # POST /api/login, POST /api/logout
│   │   ├── admin.js         # Admin CRUD routes
│   │   └── chat.js          # Users list, messages routes
│   ├── middleware/
│   │   └── auth.js          # JWT protect, adminOnly, userOnly
│   ├── server.js            # Express + Socket.io + MongoDB + static serving
│   ├── .env                 # Environment variables
│   └── package.json
│
└── frontend/
    ├── src/
    │   ├── pages/
    │   │   ├── Login.jsx
    │   │   ├── AdminDashboard.jsx
    │   │   └── ChatPage.jsx
    │   ├── components/
    │   │   ├── UserList.jsx
    │   │   ├── ChatBox.jsx
    │   │   └── MessageBubble.jsx
    │   ├── context/
    │   │   └── AuthContext.jsx
    │   ├── utils/
    │   │   ├── api.js        # Axios instance with JWT interceptor
    │   │   ├── socket.js     # Socket.io client manager
    │   │   └── helpers.js    # Formatting utilities
    │   ├── App.jsx           # Routes with protected/public guards
    │   ├── main.jsx
    │   └── index.css         # All global styles
    └── package.json
```

---

## 🔌 API Endpoints

| Method | Endpoint | Role | Description |
|--------|----------|------|-------------|
| POST | `/api/login` | Public | Login (admin or user) |
| POST | `/api/logout` | Public | Logout + update online status |
| POST | `/api/admin/add-user` | Admin | Add new user |
| GET | `/api/admin/users` | Admin | List all users |
| PUT | `/api/admin/block-user/:id` | Admin | Toggle block/unblock |
| DELETE | `/api/admin/delete-user/:id` | Admin | Delete user |
| GET | `/api/users` | User | Get chattable users |
| GET | `/api/messages/:userId` | User | Get conversation |
| POST | `/api/messages` | User | Send message (REST fallback) |
| GET | `/api/unread-counts` | User | Unread counts per sender |
| GET | `/api/health` | Public | Health check |

---

## 🗃️ Data Models

### User
```js
{ userId, password (bcrypt), role: 'admin'|'user', isBlocked, isOnline, lastSeen }
```

### Message
```js
{ senderId, receiverId, message, timestamp, isRead }
```

---

## ⚙️ Setup Instructions

### Prerequisites
- Node.js v18+
- MongoDB (running locally on port 27017)

### Backend
```bash
cd backend
npm install
# Edit .env if needed:
# PORT=5000
# MONGO_URI=mongodb://localhost:27017/simplechat
# JWT_SECRET=your_secret_key
# ADMIN_ID=admin
# ADMIN_PASSWORD=admin123
node server.js
```

### Frontend (Development)
```bash
cd frontend
npm install
# Edit .env:
# VITE_API_URL=http://localhost:5000
# VITE_SOCKET_URL=http://localhost:5000
npm run dev   # Starts on port 3000 with proxy to backend
```

### Frontend (Production)
```bash
cd frontend && npm run build
# Backend serves the built dist/ folder automatically at /
```

---

## 🔑 Default Credentials

| Role | User ID | Password |
|------|---------|----------|
| Admin | `admin` | `admin123` |
| Test User 1 | `alice` | `alice123` |
| Test User 2 | `bob` | `bob123` |

---

## 🔒 Security

- Passwords hashed with **bcrypt** (10 salt rounds)
- Routes protected with **JWT middleware**
- Role-based access control (admin / user)
- Blocked users denied access at login
- CORS enabled with proper headers

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, React Router v7, Vite |
| Backend | Node.js, Express 5 |
| Realtime | Socket.io v4 |
| Database | MongoDB 7 + Mongoose |
| Auth | JWT + bcryptjs |
| Styling | Custom CSS (WhatsApp-inspired) |
| HTTP Client | Axios |

---

*Last updated: 2026-03-17*
