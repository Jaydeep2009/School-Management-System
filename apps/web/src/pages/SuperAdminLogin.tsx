/**
 * Super Admin Login Page
 */

import { useState, useEffect, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSuperAdminAuth } from '../hooks/useSuperAdminAuth';
import { Button } from '../components/ui/Button';
import './Login.css';

export function SuperAdminLogin() {
  const navigate = useNavigate();
  const { superAdmin, login, isLoading: authLoading } = useSuperAdminAuth();

  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Redirect if already authenticated
  useEffect(() => {
    if (superAdmin && !authLoading) {
      navigate('/super-admin', { replace: true });
    }
  }, [superAdmin, authLoading, navigate]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    // Clear previous errors
    setError('');

    // Validate password (loginId is optional for simple auth)
    if (!password) {
      setError('Password is required');
      return;
    }

    setIsSubmitting(true);

    try {
      // Use loginId if provided, otherwise use empty string (simple auth)
      await login(loginId.trim() || 'admin', password);
      // Navigation handled by useSuperAdminAuth hook
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Login failed';

      // Show user-friendly error
      if (message.includes('credentials') || message.includes('401')) {
        setError('Invalid credentials');
      } else if (message.includes('failed')) {
        setError('Authentication failed');
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
          <div className="login-logo">
            <svg
              width="48"
              height="48"
              viewBox="0 0 48 48"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <rect width="48" height="48" rx="8" fill="#2563eb" />
              <path
                d="M24 14L32 19V29L24 34L16 29V19L24 14Z"
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M24 24V34"
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M16 19L24 24L32 19"
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <h1 className="login-title">Super Admin</h1>
          <p className="login-subtitle">Platform Administration</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          {error && (
            <div className="login-error">
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" />
                <path
                  d="M8 4V9"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
                <circle cx="8" cy="11.5" r="0.75" fill="currentColor" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          <div className="login-form-group">
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
              disabled={isSubmitting}
              autoComplete="username"
              autoFocus
            />
          </div>

          <div className="login-form-group">
            <label htmlFor="password" className="login-label">
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="login-input"
                placeholder="Enter your password"
                disabled={isSubmitting}
                autoComplete="current-password"
                style={{ paddingRight: '40px' }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="login-password-toggle"
                tabIndex={-1}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 20 20"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M3 3L17 17"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    />
                    <path
                      d="M10 7C11.6569 7 13 8.34315 13 10C13 10.3588 12.9398 10.7033 12.8293 11.0229"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    />
                    <path
                      d="M6.5 6.5C5.10786 7.50785 4 9.14286 4 10C4 12 6.5 15 10 15C11.3571 15 12.5 14.5 13.5 13.5"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    />
                  </svg>
                ) : (
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 20 20"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <circle
                      cx="10"
                      cy="10"
                      r="2"
                      stroke="currentColor"
                      strokeWidth="1.5"
                    />
                    <path
                      d="M4 10C4 8 6.5 5 10 5C13.5 5 16 8 16 10C16 12 13.5 15 10 15C6.5 15 4 12 4 10Z"
                      stroke="currentColor"
                      strokeWidth="1.5"
                    />
                  </svg>
                )}
              </button>
            </div>
          </div>

          <Button
            type="submit"
            variant="primary"
            fullWidth
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Logging in...' : 'Login'}
          </Button>
        </form>

        <div className="login-footer">
          <p className="login-footer-text">
            School user?{' '}
            <a
              href="/login"
              className="login-footer-link"
              onClick={(e) => {
                e.preventDefault();
                navigate('/login');
              }}
            >
              Login here
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}





