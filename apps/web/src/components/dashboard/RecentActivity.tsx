/**
 * Recent Activity Component
 * Architecturally ready for future audit-read endpoint
 */

import { Card } from '../ui/Card';
import { Skeleton } from '../ui/Skeleton';
import { EmptyState } from '../ui/EmptyState';
import { ErrorState } from '../ui/ErrorState';
import { Activity } from 'lucide-react';
import './RecentActivity.css';

interface ActivityItem {
  id: string;
  action: string;
  actor: string;
  timestamp: Date;
  category: string;
}

interface RecentActivityProps {
  activities?: ActivityItem[];
  loading?: boolean;
  error?: string;
  onRetry?: () => void;
}

export function RecentActivity({ 
  activities, 
  loading, 
  error, 
  onRetry 
}: RecentActivityProps) {
  if (loading) {
    return (
      <Card title="Recent Activity">
        <div style={{ padding: '24px' }}>
          {[1, 2, 3, 4].map((i) => (
            <div key={i} style={{ marginBottom: '16px' }}>
              <Skeleton height={16} width="80%" />
              <Skeleton height={12} width="40%" style={{ marginTop: '8px' }} />
            </div>
          ))}
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card title="Recent Activity">
        <ErrorState message={error} onRetry={onRetry} />
      </Card>
    );
  }

  // Empty state - no activities available yet
  // This component is ready for future /audit/recent endpoint
  if (!activities || activities.length === 0) {
    return (
      <Card title="Recent Activity">
        <EmptyState
          icon={<Activity size={32} />}
          title="No recent activity"
          description="Activity logs will appear here"
        />
      </Card>
    );
  }

  const formatTimeAgo = (date: Date): string => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  return (
    <Card title="Recent Activity">
      <div className="recent-activity">
        {activities.map((activity) => (
          <div key={activity.id} className="activity-item">
            <div className="activity-content">
              <div className="activity-action">{activity.action}</div>
              <div className="activity-meta">
                <span className="activity-actor">{activity.actor}</span>
                <span className="activity-divider">•</span>
                <span className="activity-time">
                  {formatTimeAgo(activity.timestamp)}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
