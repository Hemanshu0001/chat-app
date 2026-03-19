import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import UserList from '../components/UserList';
import ChatBox from '../components/ChatBox';
import VideoCall from '../components/VideoCall';
import API from '../utils/api';
import { connectSocket, getSocket } from '../utils/socket';

// Welcome screen when no chat is selected (desktop only)
function WelcomeScreen() {
  return (
    <div className="chat-empty">
      <div className="icon-circle">
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z" />
        </svg>
      </div>
      <h3>Welcome to SimpleChat</h3>
      <p>Select a user from the left to start chatting</p>
    </div>
  );
}

export default function ChatPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [unreadCounts, setUnreadCounts] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  const [usersLoading, setUsersLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [isMobileChat, setIsMobileChat] = useState(false); // mobile: show chat or list
  const socketRef = useRef(null);

  const [showVideoCall, setShowVideoCall] = useState(false);
  const [incomingCall, setIncomingCall] = useState(null);
  const [activeCallUser, setActiveCallUser] = useState(null);
  const globalIceCandidates = useRef([]); // Capture candidates that arrive before VideoCall mounts

  const showToast = (msg, type = 'info') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Connect socket on mount
  useEffect(() => {
    const token = localStorage.getItem('sc_token');
    if (!token) {
      navigate('/login');
      return;
    }
    socketRef.current = connectSocket(token);

    const sock = socketRef.current;

    sock.on('connect', () => {
      console.log('Socket connected:', sock.id);
    });

    sock.on('online_users', (list) => {
      setOnlineUsers(list);
    });

    sock.on('connect_error', (err) => {
      console.warn('Socket error:', err.message);
    });

    const handleIncomingCall = (data) => {
      console.log('🔔 INCOMING CALL DETECTED from:', data?.from);
      globalIceCandidates.current = []; // Reset on new call
      setIncomingCall(data);
      setShowVideoCall(true);
    };

    const handleGlobalIce = (data) => {
      globalIceCandidates.current.push(data);
    };

    sock.on('incoming-call', handleIncomingCall);
    sock.on('ice-candidate', handleGlobalIce);

    return () => {
      // Don't disconnect on unmount — keep connection alive across re-renders
      sock.off('incoming-call', handleIncomingCall);
      sock.off('ice-candidate', handleGlobalIce);
    };
  }, [navigate]);

  // Fetch users list
  const fetchUsers = useCallback(async () => {
    try {
      const { data } = await API.get('/api/users');
      setUsers(data);
    } catch (err) {
      if (err.response?.status !== 401) {
        showToast('Failed to load users', 'error');
      }
    } finally {
      setUsersLoading(false);
    }
  }, []);

  // Fetch unread counts
  const fetchUnreadCounts = useCallback(async () => {
    try {
      const { data } = await API.get('/api/unread-counts');
      setUnreadCounts(data);
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    fetchUsers();
    fetchUnreadCounts();
    // Poll unread counts every 15s
    const interval = setInterval(fetchUnreadCounts, 15000);
    return () => clearInterval(interval);
  }, [fetchUsers, fetchUnreadCounts]);

  // When a new message arrives for another chat, update unread count
  useEffect(() => {
    const sock = getSocket();
    if (!sock) return;

    const handleReceive = (msg) => {
      // If message is from someone other than selected user → increment unread
      if (msg.senderId !== selectedUser?.userId) {
        setUnreadCounts((prev) => ({
          ...prev,
          [msg.senderId]: (prev[msg.senderId] || 0) + 1,
        }));
      }
    };

    sock.on('receive_message', handleReceive);
    return () => sock.off('receive_message', handleReceive);
  }, [selectedUser]);

  const handleSelectUser = (u) => {
    setSelectedUser(u);
    setIsMobileChat(true);
    // Clear unread count for this user
    setUnreadCounts((prev) => ({ ...prev, [u.userId]: 0 }));
  };

  const handleBack = () => {
    setIsMobileChat(false);
    setSelectedUser(null);
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const handleCloseVideoCall = () => {
    setShowVideoCall(false);
    setIncomingCall(null);
    setActiveCallUser(null);
  };

  return (
    <div className="app-shell">
      {/* Sidebar */}
      <div className={`sidebar ${isMobileChat ? 'hidden' : ''}`}>
        <UserList
          users={users}
          selectedUser={selectedUser}
          onSelectUser={handleSelectUser}
          onlineUsers={onlineUsers}
          unreadCounts={unreadCounts}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          currentUser={user}
          onLogout={handleLogout}
          loading={usersLoading}
        />
      </div>

      {/* Chat area */}
      {selectedUser ? (
        <ChatBox
          selectedUser={selectedUser}
          currentUser={user}
          socket={socketRef.current}
          onlineUsers={onlineUsers}
          onBack={handleBack}
          onStartVideoCall={() => {
            setActiveCallUser(selectedUser);
            setShowVideoCall(true);
            setIncomingCall(null);
          }}
        />
      ) : (
        /* Desktop: show welcome screen; mobile: hidden (sidebar is shown) */
        <div className="chat-area" style={{ display: isMobileChat ? 'none' : 'flex' }}>
          <WelcomeScreen />
        </div>
      )}

      {/* Toast */}
      {toast && <div className={`toast ${toast.type}`}>{toast.msg}</div>}

      {/* Video Call Component */}
      {showVideoCall && (
        <VideoCall 
          currentUser={user}
          socket={socketRef.current}
          incomingCall={incomingCall}
          onClose={handleCloseVideoCall}
          activeChatUser={showVideoCall ? activeCallUser : null}
          globalIceCandidates={globalIceCandidates.current}
        />
      )}
    </div>
  );
}
