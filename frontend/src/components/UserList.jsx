import { getAvatarColor, getInitials, formatTime } from '../utils/helpers';
import { FaCommentAlt, FaDoorOpen, FaCircle } from 'react-icons/fa';

export default function UserList({
  users,
  selectedUser,
  onSelectUser,
  onlineUsers,
  unreadCounts,
  searchQuery,
  onSearchChange,
  currentUser,
  onLogout,
  loading,
}) {
  const filtered = users.filter((u) =>
    u.userId.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="sidebar">
      {/* Header */}
      <div className="sidebar-header">
        <h2><FaCommentAlt style={{ marginRight: '8px', color: '#10b981' }} /> Government Portal</h2>
        <button className="btn-ghost" onClick={onLogout} title="Logout">
          <FaDoorOpen />
        </button>
      </div>

      {/* Current user info */}
      <div style={{
        padding: '10px 16px',
        background: '#0B1839',
        borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', gap: 10
      }}>
        <div className="avatar avatar-sm" style={{ background: getAvatarColor(currentUser?.userId || '') }}>
          {getInitials(currentUser?.userId)}
        </div>
        <div>
          <div style={{ fontSize: '.85rem', fontWeight: 600 }}>{currentUser?.userId}</div>
          <div style={{ fontSize: '.72rem', color: 'var(--text-secondary)' }}><FaCircle style={{ fontSize: '0.6em', marginRight: '4px', color: '#22c55e' }} /> Online</div>
        </div>
      </div>

      {/* Search */}
      <div className="sidebar-search">
        <input
          type="text"
          className="search-input"
          placeholder="Search users…"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>

      {/* User list */}
      <div className="user-list">
        {loading ? (
          <div style={{ padding: '16px' }}>
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
                <div className="skeleton skeleton-avatar" />
                <div style={{ flex: 1 }}>
                  <div className="skeleton skeleton-text" />
                  <div className="skeleton skeleton-text short" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: '40px 20px', textAlign: 'center', color: '#999', fontSize: '.9rem' }}>
            {searchQuery ? 'No users found' : 'No users available to chat'}
          </div>
        ) : (
          filtered.map((u) => {
            const isOnline = onlineUsers.includes(u.userId);
            const unread = unreadCounts[u.userId] || 0;
            const isSelected = selectedUser?.userId === u.userId;

            return (
              <div
                key={u._id || u.userId}
                className={`user-item ${isSelected ? 'active' : ''}`}
                onClick={() => onSelectUser(u)}
              >
                {/* Avatar */}
                <div className="avatar" style={{ background: getAvatarColor(u.userId) }}>
                  {getInitials(u.userId)}
                  {isOnline && <span className="online-dot" />}
                </div>

                {/* Info */}
                <div className="user-info">
                  <div className="user-name">{u.userId}</div>
                  <div className="user-status">
                    {isOnline ? <><FaCircle style={{ fontSize: '0.6em', marginRight: '4px', color: '#22c55e' }} /> Online</> : <><FaCircle style={{ fontSize: '0.6em', marginRight: '4px', color: '#6b7280' }} /> Offline</>}
                  </div>
                </div>

                {/* Unread badge */}
                {unread > 0 && (
                  <div className="unread-badge">{unread > 99 ? '99+' : unread}</div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
