import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ChatIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor">
    <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z" />
  </svg>
);

export default function Login() {
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const { login, loading, error, setError } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!userId.trim() || !password.trim()) {
      setError('Please enter your ID and password');
      return;
    }
    try {
      const userObj = await login(userId.trim(), password);
      if (userObj.role === 'admin') {
        navigate('/admin');
      } else {
        navigate('/chat');
      }
    } catch {
      // Error already set in context
    }
  };

  return (
    <div className="login-wrapper">
      <div className="login-card">
        {/* Logo */}
        <div className="login-logo">
          <div className="icon">
            <ChatIcon />
          </div>
          <h1>Govt Chat</h1>
          <p>Sign in to start chatting</p>
        </div>

        {/* Error */}
        {error && (
          <div className="error-msg">
            <span>⚠️</span> {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>User ID</label>
            <input
              type="text"
              className="form-input"
              placeholder="Enter your user ID"
              value={userId}
              onChange={(e) => { setUserId(e.target.value); setError(''); }}
              autoFocus
              autoComplete="username"
            />
          </div>

          <div className="form-group">
            <label>Password</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPass ? 'text' : 'password'}
                className="form-input"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(''); }}
                autoComplete="current-password"
                style={{ paddingRight: '48px' }}
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                style={{
                  position: 'absolute', right: '0', top: '0', bottom: '0',
                  width: '48px',
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'var(--text-secondary)', fontSize: '1.2rem',
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}
              >
                {showPass ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
            style={{ marginTop: '12px' }}
          >
            {loading ? (
              <>
                <span className="spinner" style={{ width: 18, height: 18, borderWidth: 2, marginRight: 8 }} />
                Signing in…
              </>
            ) : (
              'Sign In'
            )}
          </button>
        </form>

        <p style={{
          textAlign: 'center', marginTop: '24px',
          fontSize: '.85rem', color: 'var(--text-secondary)'
        }}>
          Contact your admin if you don't have an account
        </p>
      </div>
    </div>
  );
}
