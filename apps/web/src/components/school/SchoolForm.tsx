/**
 * School Form Component
 * Reusable form for creating and editing schools
 */

import { FormEvent, useState } from 'react';
import { Button } from '../ui/Button';
import type { School } from '../../types/super-admin';

interface SchoolFormData {
  code: string;
  name: string;
  timezone: string;
  phone: string;
  email: string;
  address: string;
}

interface SchoolFormProps {
  school?: School;
  onSubmit: (data: SchoolFormData) => Promise<void>;
  onCancel: () => void;
  isEdit?: boolean;
}

export function SchoolForm({ school, onSubmit, onCancel, isEdit = false }: SchoolFormProps) {
  const [formData, setFormData] = useState<SchoolFormData>({
    code: school?.code || '',
    name: school?.name || '',
    timezone: school?.timezone || 'Asia/Kolkata',
    phone: school?.phone || '',
    email: school?.email || '',
    address: school?.address || '',
  });
  const [errors, setErrors] = useState<Partial<Record<keyof SchoolFormData, string>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof SchoolFormData, string>> = {};

    // Code validation (required, 2-8 chars, uppercase alphanumeric)
    if (!isEdit) {
      // Code is only editable on create
      if (!formData.code.trim()) {
        newErrors.code = 'School code is required';
      } else if (formData.code.length < 2 || formData.code.length > 8) {
        newErrors.code = 'School code must be 2-8 characters';
      } else if (!/^[A-Z0-9]+$/.test(formData.code.toUpperCase())) {
        newErrors.code = 'School code must contain only uppercase letters and numbers';
      }
    }

    // Name validation
    if (!formData.name.trim()) {
      newErrors.name = 'School name is required';
    } else if (formData.name.length > 200) {
      newErrors.name = 'School name is too long (max 200 characters)';
    }

    // Email validation (optional)
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email address';
    }

    // Phone validation (optional, max 20 chars)
    if (formData.phone && formData.phone.length > 20) {
      newErrors.phone = 'Phone number is too long (max 20 characters)';
    }

    // Address validation (optional, max 500 chars)
    if (formData.address && formData.address.length > 500) {
      newErrors.address = 'Address is too long (max 500 characters)';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setApiError(null);

    if (!validate()) {
      return;
    }

    setIsSubmitting(true);

    try {
      // Uppercase the code
      const submitData = {
        ...formData,
        code: formData.code.toUpperCase(),
        // Don't send empty optional fields
        phone: formData.phone || undefined,
        email: formData.email || undefined,
        address: formData.address || undefined,
      } as any;

      await onSubmit(submitData);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save school';
      setApiError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (field: keyof SchoolFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {apiError && (
        <div
          style={{
            padding: '12px',
            background: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: '6px',
            marginBottom: '24px',
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
            <span style={{ fontSize: '14px', color: '#dc2626' }}>{apiError}</span>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gap: '20px' }}>
        {/* School Code (only on create) */}
        {!isEdit && (
          <div>
            <label
              htmlFor="code"
              style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: 500,
                color: '#0f172a',
                marginBottom: '8px',
              }}
            >
              School Code *
            </label>
            <input
              id="code"
              type="text"
              value={formData.code}
              onChange={(e) => handleChange('code', e.target.value.toUpperCase())}
              placeholder="e.g. GPS, SHSS"
              disabled={isSubmitting}
              style={{
                width: '100%',
                padding: '8px 12px',
                fontSize: '14px',
                fontFamily: 'monospace',
                border: `1px solid ${errors.code ? '#dc2626' : '#e2e8f0'}`,
                borderRadius: '6px',
                outline: 'none',
              }}
              maxLength={8}
            />
            {errors.code && (
              <p style={{ fontSize: '13px', color: '#dc2626', marginTop: '4px' }}>{errors.code}</p>
            )}
            <p style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>
              2-8 characters, uppercase letters and numbers only. Used in login IDs.
            </p>
          </div>
        )}

        {/* School Name */}
        <div>
          <label
            htmlFor="name"
            style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: 500,
              color: '#0f172a',
              marginBottom: '8px',
            }}
          >
            School Name *
          </label>
          <input
            id="name"
            type="text"
            value={formData.name}
            onChange={(e) => handleChange('name', e.target.value)}
            placeholder="Enter school name"
            disabled={isSubmitting}
            style={{
              width: '100%',
              padding: '8px 12px',
              fontSize: '14px',
              border: `1px solid ${errors.name ? '#dc2626' : '#e2e8f0'}`,
              borderRadius: '6px',
              outline: 'none',
            }}
          />
          {errors.name && (
            <p style={{ fontSize: '13px', color: '#dc2626', marginTop: '4px' }}>{errors.name}</p>
          )}
        </div>

        {/* Timezone */}
        <div>
          <label
            htmlFor="timezone"
            style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: 500,
              color: '#0f172a',
              marginBottom: '8px',
            }}
          >
            Timezone
          </label>
          <select
            id="timezone"
            value={formData.timezone}
            onChange={(e) => handleChange('timezone', e.target.value)}
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
            <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
            <option value="America/New_York">America/New_York (EST)</option>
            <option value="America/Los_Angeles">America/Los_Angeles (PST)</option>
            <option value="Europe/London">Europe/London (GMT)</option>
            <option value="Asia/Dubai">Asia/Dubai (GST)</option>
            <option value="Asia/Singapore">Asia/Singapore (SGT)</option>
            <option value="Australia/Sydney">Australia/Sydney (AEDT)</option>
          </select>
        </div>

        {/* Email */}
        <div>
          <label
            htmlFor="email"
            style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: 500,
              color: '#0f172a',
              marginBottom: '8px',
            }}
          >
            Email
          </label>
          <input
            id="email"
            type="email"
            value={formData.email}
            onChange={(e) => handleChange('email', e.target.value)}
            placeholder="school@example.com"
            disabled={isSubmitting}
            style={{
              width: '100%',
              padding: '8px 12px',
              fontSize: '14px',
              border: `1px solid ${errors.email ? '#dc2626' : '#e2e8f0'}`,
              borderRadius: '6px',
              outline: 'none',
            }}
          />
          {errors.email && (
            <p style={{ fontSize: '13px', color: '#dc2626', marginTop: '4px' }}>{errors.email}</p>
          )}
        </div>

        {/* Phone */}
        <div>
          <label
            htmlFor="phone"
            style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: 500,
              color: '#0f172a',
              marginBottom: '8px',
            }}
          >
            Phone
          </label>
          <input
            id="phone"
            type="tel"
            value={formData.phone}
            onChange={(e) => handleChange('phone', e.target.value)}
            placeholder="+1 234 567 8900"
            disabled={isSubmitting}
            style={{
              width: '100%',
              padding: '8px 12px',
              fontSize: '14px',
              border: `1px solid ${errors.phone ? '#dc2626' : '#e2e8f0'}`,
              borderRadius: '6px',
              outline: 'none',
            }}
          />
          {errors.phone && (
            <p style={{ fontSize: '13px', color: '#dc2626', marginTop: '4px' }}>{errors.phone}</p>
          )}
        </div>

        {/* Address */}
        <div>
          <label
            htmlFor="address"
            style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: 500,
              color: '#0f172a',
              marginBottom: '8px',
            }}
          >
            Address
          </label>
          <textarea
            id="address"
            value={formData.address}
            onChange={(e) => handleChange('address', e.target.value)}
            placeholder="Enter school address"
            disabled={isSubmitting}
            rows={3}
            style={{
              width: '100%',
              padding: '8px 12px',
              fontSize: '14px',
              border: `1px solid ${errors.address ? '#dc2626' : '#e2e8f0'}`,
              borderRadius: '6px',
              outline: 'none',
              resize: 'vertical',
              fontFamily: 'inherit',
            }}
          />
          {errors.address && (
            <p style={{ fontSize: '13px', color: '#dc2626', marginTop: '4px' }}>
              {errors.address}
            </p>
          )}
        </div>
      </div>

      {/* Form Actions */}
      <div
        style={{
          display: 'flex',
          gap: '12px',
          justifyContent: 'flex-end',
          marginTop: '32px',
          paddingTop: '24px',
          borderTop: '1px solid #e2e8f0',
        }}
      >
        <Button variant="secondary" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Saving...' : isEdit ? 'Save Changes' : 'Create School'}
        </Button>
      </div>
    </form>
  );
}
