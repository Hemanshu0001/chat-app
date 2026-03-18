import { useState, useEffect, useRef, useCallback } from 'react';
import MessageBubble from './MessageBubble';
import ConfirmModal from './ConfirmModal';
import VideoCall from './VideoCall';
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
  
  // Selection mode for multi-delete
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedMessages, setSelectedMessages] = useState(new Set());
  const [deleting, setDeleting] = useState(false);
  
  // Confirm modal state
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: null
  });
  const [pendingDeleteId, setPendingDeleteId] = useState(null);
  
  // Video call states
  const [showVideoCall, setShowVideoCall] = useState(false);
  const [incomingCall, setIncomingCall] = useState(null);
  
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const chatAreaRef = useRef(null);

  const isOnline = onlineUsers.includes(selectedUser?.userId);

  // Handle mobile keyboard visibility
  useEffect(() => {
    if (typeof window === 'undefined' || !window.visualViewport) return;
    
    const handleResize = () => {
      // When keyboard opens, scroll to keep input visible
      if (document.activeElement === inputRef.current) {
        setTimeout(() => {
          inputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 100);
      }
    };
    
    window.visualViewport.addEventListener('resize', handleResize);
    return () => window.visualViewport.removeEventListener('resize', handleResize);
  }, []);

  // Scroll to bottom
  const scrollToBottom = useCallback((smooth = true) => {
    messagesEndRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' });
  }, []);

  // Load message history
  useEffect(() => {
    if (!selectedUser) return;
    setMessages([]);
    setLoading(true);
    setSelectionMode(false);
    setSelectedMessages(new Set());

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
    
    // Handle messages deleted by other user
    const handleMessagesDeleted = ({ messageIds }) => {
      if (messageIds && messageIds.length > 0) {
        setMessages((prev) => prev.filter((m) => !messageIds.includes(m._id)));
        // Also remove from selection if in selection mode
        setSelectedMessages((prev) => {
          const newSet = new Set(prev);
          messageIds.forEach(id => newSet.delete(id));
          return newSet;
        });
      }
    };

    socket.on('receive_message', handleReceive);
    socket.on('message_sent', handleSent);
    socket.on('user_typing', handleTyping);
    socket.on('messages_deleted', handleMessagesDeleted);

    return () => {
      socket.off('receive_message', handleReceive);
      socket.off('message_sent', handleSent);
      socket.off('user_typing', handleTyping);
      socket.off('messages_deleted', handleMessagesDeleted);
    };
  }, [socket, selectedUser, currentUser, scrollToBottom]);

  // Persistent listener for incoming calls - NOT dependent on selectedUser
  useEffect(() => {
    if (!socket) return;

    const handleIncomingCall = (data) => {
      console.log('🔔 INCOMING CALL DETECTED from:', data?.from);
      console.log('📱 Call data:', data);
      setIncomingCall(data);
      setShowVideoCall(true);
    };

    socket.on('incoming-call', handleIncomingCall);

    return () => {
      socket.off('incoming-call', handleIncomingCall);
    };
  }, [socket]);
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

  // Toggle message selection
  const toggleMessageSelection = (msgId) => {
    setSelectedMessages((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(msgId)) {
        newSet.delete(msgId);
      } else {
        newSet.add(msgId);
      }
      return newSet;
    });
  };

  // Select all messages
  const selectAllMessages = () => {
    const allMsgIds = messages.map((m) => m._id);
    setSelectedMessages(new Set(allMsgIds));
  };

  // Clear selection and exit selection mode
  const cancelSelection = () => {
    setSelectionMode(false);
    setSelectedMessages(new Set());
  };

  // Close confirm modal
  const closeConfirmModal = () => {
    setConfirmModal({ isOpen: false, title: '', message: '', onConfirm: null });
    setPendingDeleteId(null);
  };

  // Show delete single message confirmation
  const handleDeleteSingle = (msgId) => {
    setPendingDeleteId(msgId);
    setConfirmModal({
      isOpen: true,
      title: 'Delete Message',
      message: 'Are you sure you want to delete this message? This action cannot be undone.',
      onConfirm: () => confirmDeleteSingle(msgId)
    });
  };

  // Confirm and execute single delete
  const confirmDeleteSingle = async (msgId) => {
    setDeleting(true);
    try {
      const { data } = await API.delete(`/api/messages/${msgId}`);
      setMessages((prev) => prev.filter((m) => m._id !== msgId));
      
      // Notify receiver via socket
      if (socket && socket.connected) {
        socket.emit('delete_messages', { 
          messageIds: [msgId], 
          receiverId: data.receiverId 
        });
      }
      closeConfirmModal();
    } catch (err) {
      console.error('Delete failed:', err);
      closeConfirmModal();
      // Show error toast or alert
      alert(err.response?.data?.message || 'Failed to delete message');
    } finally {
      setDeleting(false);
    }
  };

  // Show delete multiple messages confirmation
  const handleDeleteSelected = () => {
    if (selectedMessages.size === 0) return;
    
    const count = selectedMessages.size;
    setConfirmModal({
      isOpen: true,
      title: 'Delete Messages',
      message: `Are you sure you want to delete ${count} message${count > 1 ? 's' : ''}? This action cannot be undone.`,
      onConfirm: confirmDeleteSelected
    });
  };

  // Confirm and execute multiple delete
  const confirmDeleteSelected = async () => {
    setDeleting(true);
    try {
      const messageIds = Array.from(selectedMessages);
      const { data } = await API.post('/api/messages/delete-multiple', { messageIds });
      
      // Remove deleted messages from state
      const deletedSet = new Set(data.deletedIds);
      setMessages((prev) => prev.filter((m) => !deletedSet.has(m._id)));
      
      // Notify receivers via socket
      if (socket && socket.connected && data.receivers) {
        data.receivers.forEach(receiverId => {
          socket.emit('delete_messages', { 
            messageIds: data.deletedIds, 
            receiverId 
          });
        });
      }
      
      closeConfirmModal();
      cancelSelection();
    } catch (err) {
      console.error('Delete failed:', err);
      closeConfirmModal();
      alert(err.response?.data?.message || 'Failed to delete messages');
    } finally {
      setDeleting(false);
    }
  };

  // Get count of total messages
  const totalMessagesCount = messages.length;

  // Close video call modal
  const handleCloseVideoCall = () => {
    setShowVideoCall(false);
    setIncomingCall(null);
  };

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
        <div style={{ flex: 1 }}>
          <div className="user-name">{selectedUser.userId}</div>
          <div className="user-status">
            {isTyping
              ? '✏️ typing…'
              : isOnline
              ? '🟢 Online'
              : '⚫ Offline'}
          </div>
        </div>
        
        {/* Video Call Button - only show when both users are online */}
        {isOnline && (
          <button 
            className="btn-icon" 
            onClick={() => {
              console.log('📹 Video call button clicked for:', selectedUser.userId);
              setShowVideoCall(true);
              setIncomingCall(null); // Clear any incoming call state
            }}
            title="Start video call"
          >
            📹
          </button>
        )}
        
        {/* Selection mode toggle button */}
        {totalMessagesCount > 0 && !selectionMode && (
          <button 
            className="btn-icon" 
            onClick={() => setSelectionMode(true)}
            title="Select messages to delete"
          >
            ☑️
          </button>
        )}
      </div>
      
      {/* Selection Mode Action Bar */}
      {selectionMode && (
        <div className="selection-bar">
          <span className="selection-count">
            {selectedMessages.size} selected
          </span>
          <div className="selection-actions">
            <button 
              className="btn btn-sm btn-ghost" 
              onClick={selectAllMessages}
            >
              Select All ({totalMessagesCount})
            </button>
            <button 
              className="btn btn-sm btn-delete" 
              onClick={handleDeleteSelected}
              disabled={selectedMessages.size === 0 || deleting}
            >
              {deleting ? '⏳' : `🗑️ Delete (${selectedMessages.size})`}
            </button>
            <button 
              className="btn btn-sm btn-ghost" 
              onClick={cancelSelection}
            >
              ✕ Cancel
            </button>
          </div>
        </div>
      )}

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
                  selectionMode={selectionMode}
                  isSelected={selectedMessages.has(msg._id)}
                  onSelect={toggleMessageSelection}
                  onDelete={handleDeleteSingle}
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
      
      {/* Confirm Delete Modal */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmText="Delete"
        cancelText="Cancel"
        confirmStyle="danger"
        onConfirm={confirmModal.onConfirm}
        onCancel={closeConfirmModal}
        loading={deleting}
      />
      
      {/* Video Call Component */}
      {showVideoCall && (
        <VideoCall 
          currentUser={currentUser}
          socket={socket}
          incomingCall={incomingCall}
          onClose={handleCloseVideoCall}
          activeChatUser={showVideoCall ? selectedUser : null}
        />
      )}
    </div>
  );
}
