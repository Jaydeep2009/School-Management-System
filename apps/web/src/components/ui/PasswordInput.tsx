/**
 * Password Input Component with Strength Indicator
 * Shows real-time password requirements validation
 */

import { useState } from 'react';
import { Eye, EyeOff, Check, X } from 'lucide-react';
import './PasswordInput.css';

interface PasswordRequirement {
  label: string;
  test: (password: string) => boolean;
}

const requirements: PasswordRequirement[] = [
  { label: 'At least 8 characters', test: (pwd) => pwd.length >= 8 },
  { label: 'One uppercase letter (A-Z)', test: (pwd) => /[A-Z]/.test(pwd) },
  { label: 'One lowercase letter (a-z)', test: (pwd) => /[a-z]/.test(pwd) },
  { label: 'One number (0-9)', test: (pwd) => /[0-9]/.test(pwd) },
];

interface PasswordInputProps {
  id?: string;
  name?: string;
  value: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  required?: boolean;
  showStrengthIndicator?: boolean;
  disabled?: boolean;
  autoComplete?: string;
}

export function PasswordInput({
  id,
  name = 'password',
  value,
  onChange,
  label,
  placeholder = 'Enter password',
  required = false,
  showStrengthIndicator = true,
  disabled = false,
  autoComplete = 'current-password',
}: PasswordInputProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  // Calculate password strength
  const metRequirements = requirements.filter(req => req.test(value));
  const strength = metRequirements.length;
  // const isStrong = strength === requirements.length; // Reserved for future use

  // Show indicator only if enabled and (focused or has value)
  const showIndicator = showStrengthIndicator && (isFocused || value.length > 0);

  return (
    <div className="password-input-container">
      {label && (
        <label htmlFor={id} className="password-input-label">
          {label}
          {required && <span className="required-asterisk">*</span>}
        </label>
      )}
      
      <div className="password-input-wrapper">
        <input
          id={id}
          name={name}
          type={showPassword ? 'text' : 'password'}
          value={value}
          onChange={handleChange}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          autoComplete={autoComplete}
          className="password-input-field"
        />
        <button
          type="button"
          onClick={togglePasswordVisibility}
          className="password-toggle-button"
          tabIndex={-1}
          disabled={disabled}
          aria-label={showPassword ? 'Hide password' : 'Show password'}
        >
          {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>

      {showIndicator && (
        <div className="password-strength-indicator">
          <div className="password-strength-bars">
            <div
              className={`strength-bar ${strength >= 1 ? 'active' : ''} ${
                strength >= 4 ? 'strong' : strength >= 2 ? 'medium' : 'weak'
              }`}
            />
            <div
              className={`strength-bar ${strength >= 2 ? 'active' : ''} ${
                strength >= 4 ? 'strong' : strength >= 2 ? 'medium' : 'weak'
              }`}
            />
            <div
              className={`strength-bar ${strength >= 3 ? 'active' : ''} ${
                strength >= 4 ? 'strong' : strength >= 2 ? 'medium' : 'weak'
              }`}
            />
            <div
              className={`strength-bar ${strength >= 4 ? 'active' : ''} ${
                strength >= 4 ? 'strong' : 'weak'
              }`}
            />
          </div>
          
          <div className="password-requirements">
            <p className="requirements-title">Password must have:</p>
            <ul className="requirements-list">
              {requirements.map((req, index) => {
                const isMet = req.test(value);
                return (
                  <li key={index} className={`requirement ${isMet ? 'met' : 'unmet'}`}>
                    <span className="requirement-icon">
                      {isMet ? <Check size={14} /> : <X size={14} />}
                    </span>
                    <span className="requirement-label">{req.label}</span>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
