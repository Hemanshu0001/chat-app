import { getAvatarColor, getInitials, formatTime } from '../utils/helpers';

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
        <h2>💬 Government Portal</h2>
        <button className="btn-ghost" onClick={onLogout} title="Logout">
          🚪
        </button>
      </div>

      {/* Current user info */}
      <div style={{
        padding: '10px 16px',
        background: '#493b01ff',
        borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', gap: 10
      }}>
        <div className="avatar avatar-sm" style={{ background: getAvatarColor(currentUser?.userId || '') }}>
          {getInitials(currentUser?.userId)}
        </div>
        <div>
          <div style={{ fontSize: '.85rem', fontWeight: 600 }}>{currentUser?.userId}</div>
          <div style={{ fontSize: '.72rem', color: 'var(--text-secondary)' }}>🟢 Online</div>
        </div>
      </div>

      {/* Search */}
      <div className="sidebar-search">
        <input
          type="text"
          className="search-input"
          placeholder="🔍 Search users…"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>

      {/* User list */}
      <div className="user-list">
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#999' }}>
            <div className="spinner" style={{ margin: '0 auto 10px' }} />
            Loading…
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
                    {isOnline ? '🟢 Online' : '⚫ Offline'}
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
