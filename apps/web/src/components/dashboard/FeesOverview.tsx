/**
 * Fees Overview Component - Shows fees collection summary
 */

import { useNavigate } from 'react-router-dom';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Skeleton } from '../ui/Skeleton';
import { EmptyState } from '../ui/EmptyState';
import { ErrorState } from '../ui/ErrorState';
import { DollarSign, TrendingUp, Clock, CheckCircle } from 'lucide-react';
import './FeesOverview.css';

interface FeesData {
  totalCollected: number;
  totalPending: number;
  totalCharges: number;
  chargeCount: number;
  paymentCount: number;
}

interface FeesOverviewProps {
  data?: FeesData;
  loading?: boolean;
  error?: string;
  onRetry?: () => void;
}

export function FeesOverview({ data, loading, error, onRetry }: FeesOverviewProps) {
  const navigate = useNavigate();

  if (loading) {
    return (
      <Card title="Fees Collection">
        <div style={{ padding: '24px' }}>
          <Skeleton height={200} />
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card title="Fees Collection">
        <ErrorState message={error} onRetry={onRetry} />
      </Card>
    );
  }

  if (!data || data.totalCharges === 0) {
    return (
      <Card title="Fees Collection">
        <EmptyState
          icon={<DollarSign size={32} />}
          title="No fees data"
          description="No fee charges have been created yet"
        />
      </Card>
    );
  }

  const collectionRate = data.totalCharges > 0 
    ? ((data.totalCollected / data.totalCharges) * 100).toFixed(1) 
    : '0';

  // Convert paise to currency
  const formatAmount = (paise: number) => {
    return `₹${(paise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <Card title="Fees Collection">
      <div className="fees-overview">
        {/* Collection Rate */}
        <div className="fees-collection-rate">
          <div className="fees-rate-circle">
            <svg className="fees-rate-svg" viewBox="0 0 120 120">
              <circle
                className="fees-rate-bg"
                cx="60"
                cy="60"
                r="54"
                fill="none"
                stroke="#e2e8f0"
                strokeWidth="12"
              />
              <circle
                className="fees-rate-progress"
                cx="60"
                cy="60"
                r="54"
                fill="none"
                stroke="#10b981"
                strokeWidth="12"
                strokeDasharray={`${(parseFloat(collectionRate) / 100) * 339.292} 339.292`}
                strokeLinecap="round"
                transform="rotate(-90 60 60)"
              />
            </svg>
            <div className="fees-rate-center">
              <div className="fees-rate-percentage">{collectionRate}%</div>
              <div className="fees-rate-label">Collected</div>
            </div>
          </div>
        </div>

        {/* Fees Stats */}
        <div className="fees-stats">
          <div className="fees-stat-item">
            <div className="fees-stat-icon" style={{ background: '#dcfce7', color: '#166534' }}>
              <CheckCircle size={20} />
            </div>
            <div className="fees-stat-info">
              <div className="fees-stat-label">Collected</div>
              <div className="fees-stat-value" style={{ color: '#166534' }}>
                {formatAmount(data.totalCollected)}
              </div>
              <div className="fees-stat-sublabel">{data.paymentCount} payments</div>
            </div>
          </div>

          <div className="fees-stat-item">
            <div className="fees-stat-icon" style={{ background: '#fee2e2', color: '#dc2626' }}>
              <Clock size={20} />
            </div>
            <div className="fees-stat-info">
              <div className="fees-stat-label">Pending</div>
              <div className="fees-stat-value" style={{ color: '#dc2626' }}>
                {formatAmount(data.totalPending)}
              </div>
              <div className="fees-stat-sublabel">{data.chargeCount} charges</div>
            </div>
          </div>

          <div className="fees-stat-item">
            <div className="fees-stat-icon" style={{ background: '#dbeafe', color: '#1e40af' }}>
              <TrendingUp size={20} />
            </div>
            <div className="fees-stat-info">
              <div className="fees-stat-label">Total Charges</div>
              <div className="fees-stat-value" style={{ color: '#1e40af' }}>
                {formatAmount(data.totalCharges)}
              </div>
              <div className="fees-stat-sublabel">this year</div>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="fees-action">
          <Button onClick={() => navigate('/fees')} variant="secondary" style={{ width: '100%' }}>
            View All Fees
          </Button>
        </div>
      </div>
    </Card>
  );
}
