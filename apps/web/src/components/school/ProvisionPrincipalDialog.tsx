/**
 * Provision Principal Dialog Component
 */

import { useState, FormEvent } from 'react';
import { Button } from '../ui/Button';
import { apiService } from '../../services/api';
import type { PrincipalCredentials } from '../../types/super-admin';

interface ProvisionPrincipalDialogProps {
  schoolId: string;
  schoolName: string;
  onSuccess: (credentials: PrincipalCredentials) => void;
  onCancel: () => void;
}

export function ProvisionPrincipalDialog({
  schoolId,
  schoolName,
  onSuccess,
  onCancel,
}: ProvisionPrincipalDialogProps) {
  const [fullName, setFullName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [gender, setGender] = useState<'male' | 'female' | 'other'>('male');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
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
      const response = await apiService.createPrincipal(schoolId, {
        full_name: fullName.trim(),
        date_of_birth: dateOfBirth,
        gender,
      });

      onSuccess(response.data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create Principal';
      setError(message);
    } finally {
      setIsSubmitting(false);
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
      onClick={onCancel}
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
          Provision Principal
        </h2>
        <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '24px' }}>
          Create a Principal account for {schoolName}
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
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
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
                <span style={{ fontSize: '14px', color: '#dc2626' }}>{error}</span>
              </div>
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
              placeholder="Enter Principal's full name"
              disabled={isSubmitting}
              style={{
                width: '100%',
                padding: '8px 12px',
                fontSize: '14px',
                border: '1px solid #e2e8f0',
                borderRadius: '6px',
                outline: 'none',
              }}
              autoFocus
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
            <Button variant="secondary" onClick={onCancel} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Creating...' : 'Create Principal'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
