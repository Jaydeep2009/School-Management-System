/**
 * Birthdays Page
 */

import { useState, useEffect } from 'react';
import { Layout } from '../components/layout/Layout';
import { Card } from '../components/ui/Card';
import { Skeleton } from '../components/ui/Skeleton';
import { ErrorState } from '../components/ui/ErrorState';
import { useAuth } from '../hooks/useAuth';
import { apiService } from '../services/api';
import type { Birthday } from '../types/entities';
import { Cake } from 'lucide-react';

export function Birthdays() {
  const { user, logout } = useAuth();
  const [birthdays, setBirthdays] = useState<Birthday[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadBirthdays();
  }, []);

  const loadBirthdays = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await apiService.getUpcomingBirthdays({});
      setBirthdays(response.data || response);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load birthdays');
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) return null;

  return (
    <Layout schoolName={'SMS'} principalName={"User"} onLogout={logout}>
      <div style={{ padding: '32px' }}>
        <div style={{ marginBottom: '24px' }}>
          <h1 style={{ fontSize: '28px', fontWeight: 600, color: '#0f172a', marginBottom: '8px' }}>Birthdays</h1>
          <p style={{ fontSize: '14px', color: '#64748b' }}>Upcoming birthdays for teachers and students</p>
        </div>

        <Card>
          <div style={{ padding: '24px' }}>
            {isLoading && <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>{[1, 2, 3].map((i) => <Skeleton key={i} height="60px" />)}</div>}
            {error && !isLoading && <ErrorState message={error} onRetry={loadBirthdays} />}
            {!isLoading && !error && birthdays.length === 0 && (
              <div style={{ textAlign: 'center', padding: '48px 24px' }}>
                <Cake size={48} style={{ color: '#cbd5e1', marginBottom: '16px' }} />
                <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#0f172a', marginBottom: '8px' }}>No upcoming birthdays</h3>
                <p style={{ fontSize: '14px', color: '#64748b' }}>There are no birthdays in the near future</p>
              </div>
            )}
            {!isLoading && !error && birthdays.length > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
                {birthdays.map((birthday, index) => (
                  <div
                    key={index}
                    style={{
                      padding: '16px',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      background: birthday.days_until === 0 ? '#fef3c7' : 'white',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'start', gap: '12px' }}>
                      <div style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '50%',
                        background: '#fef3c7',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}>
                        <Cake size={20} style={{ color: '#92400e' }} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, color: '#0f172a', marginBottom: '4px' }}>{birthday.full_name}</div>
                        <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '4px', textTransform: 'capitalize' }}>{birthday.role}</div>
                        <div style={{ fontSize: '13px', color: '#64748b' }}>
                          {new Date(birthday.date_of_birth).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}
                          {birthday.days_until !== undefined && (
                            <span style={{ marginLeft: '8px', fontWeight: 500, color: birthday.days_until === 0 ? '#92400e' : '#64748b' }}>
                              {birthday.days_until === 0 ? 'Today!' : `In ${birthday.days_until} days`}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>
      </div>
    </Layout>
  );
}





