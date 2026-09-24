/**
 * Birthday List Component
 */

import { Card } from '../ui/Card';
import { Avatar } from '../ui/Avatar';
import { Skeleton } from '../ui/Skeleton';
import { EmptyState } from '../ui/EmptyState';
import { ErrorState } from '../ui/ErrorState';
import { Cake } from 'lucide-react';
import './BirthdayList.css';

interface BirthdayPerson {
  id: string;
  name: string;
  type: 'student' | 'teacher';
  classroom?: string;
  day: number;
  month: number;
}

interface BirthdayListProps {
  birthdays?: BirthdayPerson[];
  loading?: boolean;
  error?: string;
  onRetry?: () => void;
}

export function BirthdayList({ birthdays, loading, error, onRetry }: BirthdayListProps) {
  if (loading) {
    return (
      <Card title="Upcoming Birthdays">
        <div style={{ padding: '24px' }}>
          {[1, 2, 3].map((i) => (
            <div key={i} style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
              <Skeleton circle width={40} height={40} />
              <div style={{ flex: 1 }}>
                <Skeleton height={16} width="60%" />
                <Skeleton height={12} width="40%" style={{ marginTop: '8px' }} />
              </div>
            </div>
          ))}
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card title="Upcoming Birthdays">
        <ErrorState message={error} onRetry={onRetry} />
      </Card>
    );
  }

  if (!birthdays || birthdays.length === 0) {
    return (
      <Card title="Upcoming Birthdays">
        <EmptyState
          icon={<Cake size={32} />}
          title="No upcoming birthdays"
          description="No birthdays in the next 30 days"
        />
      </Card>
    );
  }

  const getMonthName = (month: number): string => {
    const months = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
    ];
    return months[month - 1] || '';
  };

  return (
    <Card title="Upcoming Birthdays">
      <div className="birthday-list">
        {birthdays.map((person) => (
          <div key={person.id} className="birthday-item">
            <Avatar name={person.name} size="medium" />
            <div className="birthday-info">
              <div className="birthday-name">{person.name}</div>
              <div className="birthday-meta">
                {person.type === 'student' && person.classroom && (
                  <span className="birthday-classroom">{person.classroom}</span>
                )}
                {person.type === 'teacher' && (
                  <span className="birthday-role">Teacher</span>
                )}
              </div>
            </div>
            <div className="birthday-date">
              {getMonthName(person.month)} {person.day}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
