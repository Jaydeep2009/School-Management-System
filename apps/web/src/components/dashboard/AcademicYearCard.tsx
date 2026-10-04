/**
 * Academic Year Card Component
 */

import { useNavigate } from 'react-router-dom';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Skeleton } from '../ui/Skeleton';
import { EmptyState } from '../ui/EmptyState';
import { ErrorState } from '../ui/ErrorState';
import { CalendarDays } from 'lucide-react';
import { formatDate } from '../../lib/utils';
import './AcademicYearCard.css';

interface AcademicYear {
  id: string;
  label: string;
  status: 'upcoming' | 'current' | 'closed';
  startDate: Date;
  endDate: Date;
  totalClasses?: number;
  totalStudents?: number;
}

interface AcademicYearCardProps {
  academicYear?: AcademicYear;
  loading?: boolean;
  error?: string;
  onRetry?: () => void;
}

export function AcademicYearCard({ 
  academicYear, 
  loading, 
  error, 
  onRetry 
}: AcademicYearCardProps) {
  const navigate = useNavigate();

  if (loading) {
    return (
      <Card title="Current Academic Year">
        <div style={{ padding: '24px' }}>
          <Skeleton height={24} width="60%" />
          <Skeleton height={16} style={{ marginTop: '12px' }} />
          <Skeleton height={16} style={{ marginTop: '8px' }} />
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card title="Current Academic Year">
        <ErrorState message={error} onRetry={onRetry} />
      </Card>
    );
  }

  if (!academicYear) {
    return (
      <Card title="Current Academic Year">
        <EmptyState
          icon={<CalendarDays size={32} />}
          title="No academic year"
          description="No current academic year set"
          action={
            <Button onClick={() => navigate('/academic-structure')} size="small">
              Create Academic Year
            </Button>
          }
        />
      </Card>
    );
  }

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'current': return 'success';
      case 'upcoming': return 'info';
      case 'closed': return 'default';
      default: return 'default';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'current': return 'Active';
      case 'upcoming': return 'Upcoming';
      case 'closed': return 'Closed';
      default: return status;
    }
  };

  return (
    <Card title="Current Academic Year">
      <div className="academic-year-card">
        <div className="academic-year-header">
          <h3 className="academic-year-label">{academicYear.label}</h3>
          <Badge variant={getStatusVariant(academicYear.status)}>
            {getStatusLabel(academicYear.status)}
          </Badge>
        </div>

        <div className="academic-year-dates">
          <div className="academic-year-date-item">
            <span className="academic-year-date-label">Start Date</span>
            <span className="academic-year-date-value">
              {formatDate(academicYear.startDate)}
            </span>
          </div>
          <div className="academic-year-date-item">
            <span className="academic-year-date-label">End Date</span>
            <span className="academic-year-date-value">
              {formatDate(academicYear.endDate)}
            </span>
          </div>
        </div>

        {(academicYear.totalClasses !== undefined || academicYear.totalStudents !== undefined) && (
          <div className="academic-year-stats">
            {academicYear.totalClasses !== undefined && (
              <div className="academic-year-stat">
                <span className="academic-year-stat-value">
                  {academicYear.totalClasses}
                </span>
                <span className="academic-year-stat-label">Classes</span>
              </div>
            )}
            {academicYear.totalStudents !== undefined && (
              <div className="academic-year-stat">
                <span className="academic-year-stat-value">
                  {academicYear.totalStudents}
                </span>
                <span className="academic-year-stat-label">Students</span>
              </div>
            )}
          </div>
        )}

        <Button 
          variant="secondary" 
          fullWidth 
          onClick={() => navigate('/academic-structure')}
        >
          Manage Academic Years
        </Button>
      </div>
    </Card>
  );
}
