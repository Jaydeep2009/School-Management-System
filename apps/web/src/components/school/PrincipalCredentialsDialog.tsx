/**
 * Principal Credentials Display Dialog
 * Shows temporary credentials after Principal creation
 */

import { useState } from 'react';
import { Button } from '../ui/Button';
import type { PrincipalCredentials } from '../../types/super-admin';

interface PrincipalCredentialsDialogProps {
  credentials: PrincipalCredentials;
  onClose: () => void;
}

export function PrincipalCredentialsDialog({
  credentials,
  onClose,
}: PrincipalCredentialsDialogProps) {
  const [copiedField, setCopiedField] = useState<'loginId' | 'password' | null>(null);

  const copyToClipboard = async (text: string, field: 'loginId' | 'password') => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
    >
      <div
        style={{
          background: 'white',
          borderRadius: '12px',
          padding: '24px',
          width: '100%',
          maxWidth: '500px',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
        }}
      >
        <div
          style={{
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            background: '#dcfce7',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '16px',
          }}
        >
          <svg
            width="24"
            height="24"
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

        <h2 style={{ fontSize: '20px', fontWeight: 600, color: '#0f172a', marginBottom: '8px' }}>
          Principal Account Created
        </h2>
        <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '24px' }}>
          The Principal account has been successfully created. These credentials should be
          delivered securely to the Principal.
        </p>

        {/* Warning */}
        <div
          style={{
            padding: '12px',
            background: '#fefce8',
            border: '1px solid #fef08a',
            borderRadius: '6px',
            marginBottom: '24px',
          }}
        >
          <div style={{ display: 'flex', gap: '8px' }}>
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              style={{ flexShrink: 0, marginTop: '2px' }}
            >
              <path
                d="M8 1L15 14H1L8 1Z"
                stroke="#ca8a04"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path d="M8 6V9" stroke="#ca8a04" strokeWidth="1.5" strokeLinecap="round" />
              <circle cx="8" cy="11.5" r="0.75" fill="#ca8a04" />
            </svg>
            <div>
              <p style={{ fontSize: '14px', fontWeight: 500, color: '#854d0e', marginBottom: '4px' }}>
                Important
              </p>
              <p style={{ fontSize: '13px', color: '#a16207' }}>
                This password will only be shown once. The Principal must change it on first
                login.
              </p>
            </div>
          </div>
        </div>

        {/* Credentials */}
        <div style={{ marginBottom: '24px' }}>
          <div style={{ marginBottom: '16px' }}>
            <label
              style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: 500,
                color: '#0f172a',
                marginBottom: '8px',
              }}
            >
              Login ID
            </label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                value={credentials.login_id}
                readOnly
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  fontSize: '14px',
                  fontFamily: 'monospace',
                  border: '1px solid #e2e8f0',
                  borderRadius: '6px',
                  background: '#f8fafc',
                }}
              />
              <Button
                variant="secondary"
                size="small"
                onClick={() => copyToClipboard(credentials.login_id, 'loginId')}
              >
                {copiedField === 'loginId' ? 'Copied!' : 'Copy'}
              </Button>
            </div>
          </div>

          <div>
            <label
              style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: 500,
                color: '#0f172a',
                marginBottom: '8px',
              }}
            >
              Temporary Password
            </label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                value={credentials.temporary_password}
                readOnly
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  fontSize: '14px',
                  fontFamily: 'monospace',
                  border: '1px solid #e2e8f0',
                  borderRadius: '6px',
                  background: '#f8fafc',
                }}
              />
              <Button
                variant="secondary"
                size="small"
                onClick={() => copyToClipboard(credentials.temporary_password, 'password')}
              >
                {copiedField === 'password' ? 'Copied!' : 'Copy'}
              </Button>
            </div>
          </div>
        </div>

        {/* Principal Info */}
        <div
          style={{
            padding: '16px',
            background: '#f8fafc',
            borderRadius: '8px',
            marginBottom: '24px',
          }}
        >
          <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '8px' }}>
            Principal Details
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div style={{ fontSize: '14px', color: '#0f172a' }}>
              <strong>User ID:</strong>{' '}
              <span style={{ fontFamily: 'monospace', fontSize: '13px' }}>{credentials.user_id}</span>
            </div>
            <div style={{ fontSize: '14px', color: '#0f172a' }}>
              <strong>Login ID:</strong>{' '}
              <span style={{ fontFamily: 'monospace', fontSize: '13px' }}>{credentials.login_id}</span>
            </div>
          </div>
        </div>

        <Button fullWidth onClick={onClose}>
          Done
        </Button>
      </div>
    </div>
  );
}
