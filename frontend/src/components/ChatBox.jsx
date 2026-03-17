import { useState, useEffect, useRef, useCallback } from 'react';
import MessageBubble from './MessageBubble';
import { getAvatarColor, getInitials, formatDate } from '../utils/helpers';
import API from '../utils/api';

export default function ChatBox({
  selectedUser,
  currentUser,
  socket,
  onlineUsers,
  onBack,
}) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [typingTimeout, setTypingTimeout] = useState(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const isOnline = onlineUsers.includes(selectedUser?.userId);

  // Scroll to bottom
  const scrollToBottom = useCallback((smooth = true) => {
    messagesEndRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' });
  }, []);

  // Load message history
  useEffect(() => {
    if (!selectedUser) return;
    setMessages([]);
    setLoading(true);

    API.get(`/api/messages/${selectedUser.userId}`)
      .then(({ data }) => {
        setMessages(data);
        setTimeout(() => scrollToBottom(false), 50);
      })
      .catch(() => {})
      .finally(() => setLoading(false));

    inputRef.current?.focus();
  }, [selectedUser, scrollToBottom]);

  // Socket listeners
  useEffect(() => {
    if (!socket) return;

    const handleReceive = (msg) => {
      if (
        (msg.senderId === selectedUser?.userId && msg.receiverId === currentUser.userId) ||
        (msg.senderId === currentUser.userId && msg.receiverId === selectedUser?.userId)
      ) {
        setMessages((prev) => {
          // Avoid duplicates
          if (prev.some((m) => m._id === msg._id)) return prev;
          return [...prev, msg];
        });
        setTimeout(() => scrollToBottom(), 80);
      }
    };

    const handleSent = (msg) => {
      setMessages((prev) => {
        if (prev.some((m) => m._id === msg._id)) return prev;
        return [...prev, msg];
      });
      setTimeout(() => scrollToBottom(), 80);
    };

    const handleTyping = ({ senderId, isTyping: typing }) => {
      if (senderId === selectedUser?.userId) setIsTyping(typing);
    };

    socket.on('receive_message', handleReceive);
    socket.on('message_sent', handleSent);
    socket.on('user_typing', handleTyping);

    return () => {
      socket.off('receive_message', handleReceive);
      socket.off('message_sent', handleSent);
      socket.off('user_typing', handleTyping);
    };
  }, [socket, selectedUser, currentUser, scrollToBottom]);

  // Handle typing indicator
  const handleInputChange = (e) => {
    setInput(e.target.value);

    if (socket && selectedUser) {
      socket.emit('typing', { receiverId: selectedUser.userId, isTyping: true });
      if (typingTimeout) clearTimeout(typingTimeout);
      const t = setTimeout(() => {
        socket.emit('typing', { receiverId: selectedUser.userId, isTyping: false });
      }, 1500);
      setTypingTimeout(t);
    }
  };

  // Send message
  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || sending || !selectedUser) return;

    setSending(true);
    setInput('');

    // Stop typing indicator
    if (socket) {
      socket.emit('typing', { receiverId: selectedUser.userId, isTyping: false });
      if (typingTimeout) clearTimeout(typingTimeout);
    }

    try {
      if (socket && socket.connected) {
        socket.emit('send_message', {
          receiverId: selectedUser.userId,
          message: text,
        });
      } else {
        // REST fallback
        const { data } = await API.post('/api/messages', {
          receiverId: selectedUser.userId,
          message: text,
        });
        setMessages((prev) => [...prev, data]);
        setTimeout(() => scrollToBottom(), 80);
      }
    } catch (err) {
      console.error('Send failed:', err);
      setInput(text); // restore input on failure
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  }, [input, sending, selectedUser, socket, typingTimeout, scrollToBottom]);

  // Enter key to send
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Group messages by date
  const groupedMessages = messages.reduce((groups, msg) => {
    const dateKey = formatDate(msg.timestamp);
    if (!groups[dateKey]) groups[dateKey] = [];
    groups[dateKey].push(msg);
    return groups;
  }, {});

  if (!selectedUser) return null;

  return (
    <div className="chat-area visible">
      {/* Chat Header */}
      <div className="chat-header">
        <button className="back-btn" onClick={onBack}>←</button>
        <div className="avatar avatar-sm" style={{ background: getAvatarColor(selectedUser.userId) }}>
          {getInitials(selectedUser.userId)}
          {isOnline && <span className="online-dot" />}
        </div>
        <div>
          <div className="user-name">{selectedUser.userId}</div>
          <div className="user-status">
            {isTyping
              ? '✏️ typing…'
              : isOnline
              ? '🟢 Online'
              : '⚫ Offline'}
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="messages-container">
        {loading ? (
          <div style={{ textAlign: 'center', color: '#999', padding: '40px 0' }}>
            <div className="spinner" style={{ margin: '0 auto 10px' }} />
            Loading messages…
          </div>
        ) : messages.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#999', padding: '40px 0', fontSize: '.9rem' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '10px' }}>👋</div>
            Say hi to <strong>{selectedUser.userId}</strong>!
          </div>
        ) : (
          Object.entries(groupedMessages).map(([date, msgs]) => (
            <div key={date}>
              <div className="date-divider">
                <span>{date}</span>
              </div>
              {msgs.map((msg) => (
                <MessageBubble
                  key={msg._id}
                  message={msg}
                  isSent={msg.senderId === currentUser.userId}
                />
              ))}
            </div>
          ))
        )}

        {/* Typing indicator */}
        {isTyping && (
          <div className="typing-indicator">
            <span className="typing-dot" />
            <span className="typing-dot" />
            <span className="typing-dot" />
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Bar */}
      <div className="chat-input-bar">
        <textarea
          ref={inputRef}
          className="chat-input"
          placeholder={`Message ${selectedUser.userId}…`}
          value={input}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          rows={1}
          style={{ height: 'auto' }}
          onInput={(e) => {
            e.target.style.height = 'auto';
            e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
          }}
        />
        <button
          className="send-btn"
          onClick={sendMessage}
          disabled={!input.trim() || sending}
          title="Send message (Enter)"
        >
          {sending ? (
            <span style={{ fontSize: '.7rem' }}>⏳</span>
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
            </svg>
          )}
        </button>
      </div>
    </div>
  );
}
