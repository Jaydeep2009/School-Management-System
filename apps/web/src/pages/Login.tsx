/**
 * Login Page
 */

import { useState, useEffect, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Button } from '../components/ui/Button';
import './Login.css';

export function Login() {
  const navigate = useNavigate();
  const { user, login, isLoading: authLoading } = useAuth();
  
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Redirect if already authenticated
  useEffect(() => {
    if (user && !authLoading) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, authLoading, navigate]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    // Clear previous errors
    setError('');
    
    // Validate inputs
    if (!loginId.trim()) {
      setError('Login ID is required');
      return;
    }
    
    if (!password) {
      setError('Password is required');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      await login(loginId.trim(), password);
      // Navigation handled by useAuth hook
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Login failed';
      
      // Show user-friendly error
      if (message.includes('credentials') || message.includes('401')) {
        setError('Invalid login ID or password');
      } else if (message.includes('activated')) {
        setError('Account not activated. Please contact your administrator.');
      } else if (message.includes('disabled')) {
        setError('Account is disabled. Please contact your administrator.');
      } else {
        setError('Login failed. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Show loading screen while checking authentication
  if (authLoading) {
    return (
      <div className="login-container">
        <div className="login-card">
          <div className="login-loading">
            <div className="login-spinner" />
            <p>Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <div className="login-logo">SMS</div>
          <h1 className="login-title">Sign in to your account</h1>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          {error && (
            <div className="login-error" role="alert">
              {error}
            </div>
          )}

          <div className="login-field">
            <label htmlFor="loginId" className="login-label">
              Login ID
            </label>
            <input
              id="loginId"
              type="text"
              value={loginId}
              onChange={(e) => setLoginId(e.target.value)}
              className="login-input"
              placeholder="Enter your login ID"
              autoComplete="username"
              autoFocus
              disabled={isSubmitting}
              required
            />
          </div>

          <div className="login-field">
            <label htmlFor="password" className="login-label">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="login-input"
              placeholder="Enter your password"
              autoComplete="current-password"
              disabled={isSubmitting}
              required
            />
          </div>

          <Button
            type="submit"
            fullWidth
            disabled={isSubmitting}
            className="login-submit"
          >
            {isSubmitting ? 'Signing in...' : 'Sign In'}
          </Button>
        </form>

        <div className="login-footer">
          <p className="login-footer-text">
            First time login?{' '}
            <button
              type="button"
              onClick={() => navigate('/activate')}
              style={{
                background: 'none',
                border: 'none',
                color: '#2563eb',
                cursor: 'pointer',
                textDecoration: 'underline',
                fontSize: 'inherit',
                padding: 0,
              }}
            >
              Activate your account
            </button>
          </p>
          <p className="login-footer-text" style={{ marginTop: '8px' }}>
            Need help? Contact your school administrator.
          </p>
          
          {/* Super Admin Login Button */}
          <div style={{ marginTop: '24px', paddingTop: '24px', borderTop: '1px solid #e5e7eb' }}>
            <Button
              variant="secondary"
              fullWidth
              onClick={() => navigate('/super-admin/login')}
              style={{
                fontSize: '14px',
                padding: '8px 16px',
              }}
            >
              🔐 Super Admin Login
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}





