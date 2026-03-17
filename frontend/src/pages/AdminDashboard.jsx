import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import API from '../utils/api';
import { getAvatarColor, formatDate } from '../utils/helpers';

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newUserId, setNewUserId] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [addLoading, setAddLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const [search, setSearch] = useState('');
  const [actionLoading, setActionLoading] = useState(null); // userId being toggled

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchUsers = useCallback(async () => {
    try {
      const { data } = await API.get('/api/admin/users');
      setUsers(data);
    } catch {
      showToast('Failed to load users', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleAddUser = async (e) => {
    e.preventDefault();
    if (!newUserId.trim() || !newPassword.trim()) {
      showToast('User ID and password are required', 'error');
      return;
    }
    if (newPassword.length < 4) {
      showToast('Password must be at least 4 characters', 'error');
      return;
    }
    setAddLoading(true);
    try {
      const { data } = await API.post('/api/admin/add-user', {
        userId: newUserId.trim(),
        password: newPassword,
      });
      setUsers((prev) => [data.user, ...prev]);
      setNewUserId('');
      setNewPassword('');
      showToast(`✅ User "${data.user.userId}" added!`);
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to add user', 'error');
    } finally {
      setAddLoading(false);
    }
  };

  const handleToggleBlock = async (u) => {
    setActionLoading(u._id);
    try {
      const { data } = await API.put(`/api/admin/block-user/${u._id}`);
      setUsers((prev) =>
        prev.map((x) => (x._id === u._id ? { ...x, isBlocked: data.user.isBlocked, isOnline: data.user.isOnline } : x))
      );
      showToast(`User ${data.user.isBlocked ? 'blocked' : 'unblocked'} successfully`);
    } catch {
      showToast('Failed to update user', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (u) => {
    if (!window.confirm(`Delete user "${u.userId}"? This cannot be undone.`)) return;
    try {
      await API.delete(`/api/admin/delete-user/${u._id}`);
      setUsers((prev) => prev.filter((x) => x._id !== u._id));
      showToast('User deleted');
    } catch {
      showToast('Failed to delete user', 'error');
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const filtered = users.filter((u) =>
    u.userId.toLowerCase().includes(search.toLowerCase())
  );
  const onlineCount  = users.filter((u) => u.isOnline).length;
  const blockedCount = users.filter((u) => u.isBlocked).length;

  return (
    <div className="admin-wrapper">
      {/* Header */}
      <header className="admin-header">
        <h1>
          <span style={{ fontSize: '1.4rem' }}>💬</span>
          <span> SimpleChat</span>
          <span style={{ fontSize: '.75rem', opacity: .7, marginLeft: 8, fontWeight: 400 }}>Admin Panel</span>
        </h1>
        <div className="admin-nav">
          <span style={{ fontSize: '.85rem', opacity: .8, marginRight: 8 }}>👋 {user?.userId}</span>
          <button className="logout-btn" onClick={handleLogout}>
            🚪 Logout
          </button>
        </div>
      </header>

      <div className="admin-content">
        {/* Stats */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon" style={{ background: '#eff6ff' }}>
              <span style={{ fontSize: '1.4rem' }}>👥</span>
            </div>
            <div>
              <div className="stat-label">Total Users</div>
              <div className="stat-value">{users.length}</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon" style={{ background: '#f0fdf4' }}>
              <span style={{ fontSize: '1.4rem' }}>🟢</span>
            </div>
            <div>
              <div className="stat-label">Online Now</div>
              <div className="stat-value" style={{ color: '#16a34a' }}>{onlineCount}</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon" style={{ background: '#fef2f2' }}>
              <span style={{ fontSize: '1.4rem' }}>🚫</span>
            </div>
            <div>
              <div className="stat-label">Blocked</div>
              <div className="stat-value" style={{ color: '#dc2626' }}>{blockedCount}</div>
            </div>
          </div>
        </div>

        {/* Add User */}
        <div className="card">
          <div className="card-title">
            <span>➕</span> Add New User
          </div>
          <form onSubmit={handleAddUser} className="add-user-form">
            <input
              type="text"
              className="form-input"
              placeholder="User ID (e.g. john_doe)"
              value={newUserId}
              onChange={(e) => setNewUserId(e.target.value)}
            />
            <input
              type="password"
              className="form-input"
              placeholder="Password (min 4 chars)"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
            <button
              type="submit"
              className="btn btn-success"
              disabled={addLoading}
              style={{ whiteSpace: 'nowrap' }}
            >
              {addLoading ? '⏳ Adding…' : '✅ Add User'}
            </button>
          </form>
        </div>

        {/* Users Table */}
        <div className="card">
          <div className="card-title" style={{ justifyContent: 'space-between' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span>📋</span> All Users ({users.length})
            </span>
            <input
              type="text"
              className="search-input"
              placeholder="🔍 Search users…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ width: 'auto', maxWidth: 200 }}
            />
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
              <div className="spinner" style={{ margin: '0 auto 12px' }} />
              Loading users…
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
              {search ? 'No users match your search.' : 'No users yet. Add one above!'}
            </div>
          ) : (
            <div className="users-table-wrap">
              <table className="users-table">
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Status</th>
                    <th>Joined</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((u) => (
                    <tr key={u._id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div
                            className="avatar avatar-sm"
                            style={{ background: getAvatarColor(u.userId) }}
                          >
                            {u.userId.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div style={{ fontWeight: 600 }}>{u.userId}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        {u.isBlocked ? (
                          <span className="badge badge-blocked">🚫 Blocked</span>
                        ) : u.isOnline ? (
                          <span className="badge badge-online">🟢 Online</span>
                        ) : (
                          <span className="badge badge-offline">⚫ Offline</span>
                        )}
                      </td>
                      <td style={{ color: '#667781', fontSize: '.85rem' }}>
                        {formatDate(u.createdAt)}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          <button
                            className={`btn btn-sm ${u.isBlocked ? 'btn-outline' : 'btn-danger'}`}
                            onClick={() => handleToggleBlock(u)}
                            disabled={actionLoading === u._id}
                          >
                            {actionLoading === u._id
                              ? '⏳'
                              : u.isBlocked ? '✅ Unblock' : '🚫 Block'}
                          </button>
                          <button
                            className="btn btn-sm"
                            style={{ background: '#fee2e2', color: '#991b1b' }}
                            onClick={() => handleDelete(u)}
                          >
                            🗑️ Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div className={`toast ${toast.type}`}>{toast.msg}</div>
      )}
    </div>
  );
}
