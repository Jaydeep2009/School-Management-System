/**
 * Stat Card Component - KPI Cards
 */

import { LucideIcon } from 'lucide-react';
import { Card } from '../ui/Card';
import { Skeleton } from '../ui/Skeleton';
import { ErrorState } from '../ui/ErrorState';
import './StatCard.css';

interface StatCardProps {
  title: string;
  value: number | string;
  icon: LucideIcon;
  color?: string;
  loading?: boolean;
  error?: string;
  onRetry?: () => void;
}

export function StatCard({ 
  title, 
  value, 
  icon: Icon, 
  color = '#2563eb',
  loading,
  error,
  onRetry
}: StatCardProps) {
  if (loading) {
    return (
      <Card>
        <div className="stat-card">
          <Skeleton width={100} height={16} />
          <Skeleton width={60} height={32} style={{ marginTop: '12px' }} />
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <ErrorState 
          title="Failed to load" 
          message={error}
          onRetry={onRetry}
        />
      </Card>
    );
  }

  return (
    <Card>
      <div className="stat-card">
        <div className="stat-card-header">
          <span className="stat-card-title">{title}</span>
          <div 
            className="stat-card-icon" 
            style={{ background: `${color}15`, color }}
          >
            <Icon size={20} />
          </div>
        </div>
        <div className="stat-card-value">{value}</div>
      </div>
    </Card>
  );
}
