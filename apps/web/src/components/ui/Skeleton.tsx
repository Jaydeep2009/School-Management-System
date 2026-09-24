/**
 * Skeleton Loading Component
 */

import { cn } from '../../lib/utils';
import './Skeleton.css';

interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  circle?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export function Skeleton({ width, height, circle, className, style: propStyle }: SkeletonProps) {
  const style: React.CSSProperties = { ...propStyle };
  
  if (width) style.width = typeof width === 'number' ? `${width}px` : width;
  if (height) style.height = typeof height === 'number' ? `${height}px` : height;

  return (
    <div 
      className={cn('skeleton', circle && 'skeleton-circle', className)} 
      style={style}
    />
  );
}

export function SkeletonCard() {
  return (
    <div className="skeleton-card">
      <Skeleton height={24} width="60%" />
      <Skeleton height={16} width="40%" style={{ marginTop: '12px' }} />
      <Skeleton height={100} style={{ marginTop: '16px' }} />
    </div>
  );
}
