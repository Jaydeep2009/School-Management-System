/**
 * Badge Component
 */

import { ReactNode } from 'react';
import { cn } from '../../lib/utils';
import './Badge.css';

interface BadgeProps {
  children: ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info';
  className?: string;
}

export function Badge({ children, variant = 'default', className }: BadgeProps) {
  return (
    <span className={cn('badge', `badge-${variant}`, className)}>
      {children}
    </span>
  );
}
