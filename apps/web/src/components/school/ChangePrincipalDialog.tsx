/**
 * Change Principal Dialog
 * Replaces existing principal with a new one
 */

import { useState, FormEvent } from 'react';
import { Button } from '../ui/Button';
import { apiService } from '../../services/api';
import type { PrincipalCredentials } from '../../types/super-admin';

interface ChangePrincipalDialogProps {
  schoolId: string;
  schoolName: string;
  currentPrincipalLogin: string;
  open: boolean;
  onClose: () => void;
  onSuccess: (credentials: PrincipalCredentials) => void;
}

export function ChangePrincipalDialog({
  schoolId,
  schoolName,
  currentPrincipalLogin,
  open,
  onClose,
  onSuccess,
}: ChangePrincipalDialogProps) {
  const [fullName, setFullName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [gender, setGender] = useState<'male' | 'female' | 'other'>('male');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!fullName.trim()) {
      setError('Full name is required');
      return;
    }

    if (!dateOfBirth) {
      setError('Date of birth is required');
      return;
    }

    setIsSubmitting(true);

    try {
      console.log('[ChangePrincipalDialog] Submitting...');

      const response = await apiService.changePrincipal(schoolId, {
        full_name: fullName.trim(),
        date_of_birth: dateOfBirth,
        gender,
      });

      console.log('[ChangePrincipalDialog] Success:', response.data);
      onSuccess(response.data);
    } catch (err) {
      console.error('[ChangePrincipalDialog] Error:', err);
      const message = err instanceof Error ? err.message : 'Failed to change principal';
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!open) return null;

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
      onClick={onClose}
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
        onClick={(e) => e.stopPropagation()}
      >
        <h2 style={{ fontSize: '20px', fontWeight: 600, color: '#0f172a', marginBottom: '8px' }}>
          Change Principal
        </h2>
        
        {/* Warning */}
        <div
          style={{
            padding: '12px',
            backgroundColor: '#fef3c7',
            border: '1px solid #fbbf24',
            borderRadius: '8px',
            marginBottom: '16px',
          }}
        >
          <p style={{ fontSize: '14px', color: '#92400e', marginBottom: '8px', fontWeight: 600 }}>
            ⚠️ Warning: Changing Principal
          </p>
          <p style={{ fontSize: '13px', color: '#92400e', marginBottom: '4px' }}>
            • Current principal ({currentPrincipalLogin}) will be disabled
          </p>
          <p style={{ fontSize: '13px', color: '#92400e', marginBottom: '4px' }}>
            • All their active sessions will be revoked
          </p>
          <p style={{ fontSize: '13px', color: '#92400e' }}>
            • A new principal account will be created
          </p>
        </div>

        <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '20px' }}>
          Create a new principal account for <strong>{schoolName}</strong>
        </p>

        <form onSubmit={handleSubmit}>
          {error && (
            <div
              style={{
                padding: '12px',
                background: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: '6px',
                marginBottom: '16px',
              }}
            >
              <span style={{ fontSize: '14px', color: '#dc2626' }}>{error}</span>
            </div>
          )}

          <div style={{ marginBottom: '16px' }}>
            <label
              htmlFor="fullName"
              style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: 500,
                color: '#0f172a',
                marginBottom: '8px',
              }}
            >
              Full Name *
            </label>
            <input
              id="fullName"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="e.g., Dr. John Smith"
              disabled={isSubmitting}
              style={{
                width: '100%',
                padding: '8px 12px',
                fontSize: '14px',
                border: '1px solid #e2e8f0',
                borderRadius: '6px',
                outline: 'none',
              }}
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label
              htmlFor="dateOfBirth"
              style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: 500,
                color: '#0f172a',
                marginBottom: '8px',
              }}
            >
              Date of Birth *
            </label>
            <input
              id="dateOfBirth"
              type="date"
              value={dateOfBirth}
              onChange={(e) => setDateOfBirth(e.target.value)}
              disabled={isSubmitting}
              style={{
                width: '100%',
                padding: '8px 12px',
                fontSize: '14px',
                border: '1px solid #e2e8f0',
                borderRadius: '6px',
                outline: 'none',
              }}
            />
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label
              htmlFor="gender"
              style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: 500,
                color: '#0f172a',
                marginBottom: '8px',
              }}
            >
              Gender *
            </label>
            <select
              id="gender"
              value={gender}
              onChange={(e) => setGender(e.target.value as 'male' | 'female' | 'other')}
              disabled={isSubmitting}
              style={{
                width: '100%',
                padding: '8px 12px',
                fontSize: '14px',
                border: '1px solid #e2e8f0',
                borderRadius: '6px',
                outline: 'none',
                background: 'white',
              }}
            >
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
            <Button type="button" variant="secondary" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Changing Principal...' : 'Change Principal'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
