/**
 * Button Component
 */

import { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '../../lib/utils';
import './Button.css';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'small' | 'medium' | 'large';
  fullWidth?: boolean;
}

export function Button({
  children,
  variant = 'primary',
  size = 'medium',
  fullWidth = false,
  className,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        'button',
        `button-${variant}`,
        `button-${size}`,
        fullWidth && 'button-full-width',
        disabled && 'button-disabled',
        className
      )}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
}
