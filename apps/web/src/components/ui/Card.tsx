/**
 * Card Component
 * Reusable card container
 */

import { ReactNode } from 'react';
import { cn } from '../../lib/utils';
import './Card.css';

interface CardProps {
  children: ReactNode;
  className?: string;
  padding?: 'none' | 'small' | 'medium' | 'large';
  title?: string;
}

export function Card({ children, className, padding = 'none', title }: CardProps) {
  return (
    <div className={cn('card', `card-padding-${padding}`, className)}>
      {title && (
        <div className="card-header">
          <h3 className="card-title">{title}</h3>
        </div>
      )}
      {children}
    </div>
  );
}

interface CardHeaderProps {
  children: ReactNode;
  className?: string;
  action?: ReactNode;
}

export function CardHeader({ children, className, action }: CardHeaderProps) {
  return (
    <div className={cn('card-header', className)}>
      <div className="card-header-content">{children}</div>
      {action && <div className="card-header-action">{action}</div>}
    </div>
  );
}

interface CardTitleProps {
  children: ReactNode;
  className?: string;
}

export function CardTitle({ children, className }: CardTitleProps) {
  return <h3 className={cn('card-title', className)}>{children}</h3>;
}

interface CardContentProps {
  children: ReactNode;
  className?: string;
}

export function CardContent({ children, className }: CardContentProps) {
  return <div className={cn('card-content', className)}>{children}</div>;
}
