/**
 * Account Activation Page
 * For newly provisioned Principals to set their permanent password
 */

import { useState, useEffect, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiService } from '../services/api';
import { Button } from '../components/ui/Button';
import './Login.css';

export function Activate() {
  const navigate = useNavigate();
  const [loginId, setLoginId] = useState('');
  const [activationCode, setActivationCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Clear any existing session tokens on mount
  useEffect(() => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    apiService.setAccessToken(null);
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!loginId.trim()) {
      setError('Login ID is required');
      return;
    }

    if (!activationCode.trim()) {
      setError('Activation code is required');
      return;
    }

    if (!newPassword) {
      setError('New password is required');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setIsSubmitting(true);

    try {
      await apiService.activateAccount({
        loginId: loginId.trim(),
        activationCode: activationCode.trim(),
        newPassword,
      });

      setSuccess(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Activation failed';
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="login-container">
        <div className="login-card">
          <div className="login-header">
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                background: '#dcfce7',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 24px',
              }}
            >
              <svg
                width="32"
                height="32"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <circle cx="12" cy="12" r="10" stroke="#16a34a" strokeWidth="2" />
                <path
                  d="M8 12L11 15L16 9"
                  stroke="#16a34a"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <h1 className="login-title">Account Activated!</h1>
            <p className="login-subtitle">
              Your account has been activated successfully. You can now login with your new password.
            </p>
          </div>

          <Button fullWidth onClick={() => navigate('/login')}>
            Go to Login
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <h1 className="login-title">Activate Account</h1>
          <p className="login-subtitle">
            Set your permanent password to activate your account
          </p>
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
                <circle cx="8" cy="8" r="7" stroke="#dc2626" strokeWidth="1.5" />
                <path d="M8 4V9" stroke="#dc2626" strokeWidth="1.5" strokeLinecap="round" />
                <circle cx="8" cy="11.5" r="0.75" fill="#dc2626" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          <div className="form-group">
            <label htmlFor="loginId" className="form-label">
              Login ID
            </label>
            <input
              id="loginId"
              type="text"
              className="form-input"
              placeholder="e.g., TEST-P-000001"
              value={loginId}
              onChange={(e) => setLoginId(e.target.value)}
              disabled={isSubmitting}
              autoFocus
            />
          </div>

          <div className="form-group">
            <label htmlFor="activationCode" className="form-label">
              Temporary Password / Activation Code
            </label>
            <input
              id="activationCode"
              type="password"
              className="form-input"
              placeholder="Enter temporary password"
              value={activationCode}
              onChange={(e) => setActivationCode(e.target.value)}
              disabled={isSubmitting}
            />
          </div>

          <div className="form-group">
            <label htmlFor="newPassword" className="form-label">
              New Password
            </label>
            <input
              id="newPassword"
              type="password"
              className="form-input"
              placeholder="Create a strong password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              disabled={isSubmitting}
            />
            <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
              Must contain: 8+ characters, uppercase, lowercase, number, special character
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword" className="form-label">
              Confirm New Password
            </label>
            <input
              id="confirmPassword"
              type="password"
              className="form-input"
              placeholder="Re-enter new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={isSubmitting}
            />
          </div>

          <Button
            type="submit"
            fullWidth
            disabled={isSubmitting}
            style={{ marginTop: '8px' }}
          >
            {isSubmitting ? 'Activating...' : 'Activate Account'}
          </Button>

          <div style={{ textAlign: 'center', marginTop: '16px' }}>
            <button
              type="button"
              onClick={() => navigate('/login')}
              style={{
                background: 'none',
                border: 'none',
                color: '#2563eb',
                fontSize: '14px',
                cursor: 'pointer',
                textDecoration: 'underline',
              }}
            >
              Already activated? Login here
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}





