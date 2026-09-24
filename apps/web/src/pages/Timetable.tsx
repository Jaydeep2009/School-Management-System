/**
 * Timetable List Page
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../components/layout/Layout';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Skeleton } from '../components/ui/Skeleton';
import { ErrorState } from '../components/ui/ErrorState';
import { useAuth } from '../hooks/useAuth';
import { apiService } from '../services/api';
import { Calendar, Plus, ArrowRight } from 'lucide-react';

export function Timetable() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [timetables, setTimetables] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadTimetables();
  }, []);

  const loadTimetables = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await apiService.getTimetables();
      setTimetables(response.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load timetables');
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) return null;

  if (isLoading) {
    return (
      <Layout schoolName={'SMS'} principalName={"User"} onLogout={logout}>
        <div style={{ padding: '32px' }}>
          <Skeleton height="400px" />
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout schoolName={'SMS'} principalName={"User"} onLogout={logout}>
        <div style={{ padding: '32px' }}>
          <ErrorState message={error} onRetry={loadTimetables} />
        </div>
      </Layout>
    );
  }

  return (
    <Layout schoolName={'SMS'} principalName={"User"} onLogout={logout}>
      <div style={{ padding: '32px' }}>
        <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ fontSize: '28px', fontWeight: 600, color: '#0f172a', marginBottom: '8px' }}>Timetable</h1>
            <p style={{ fontSize: '14px', color: '#64748b' }}>Manage school timetables and schedules</p>
          </div>
          <Button onClick={() => navigate('/timetable/new')}>
            <Plus size={16} style={{ marginRight: '8px' }} />
            New Timetable
          </Button>
        </div>

        <Card>
          <div style={{ padding: '24px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#0f172a', marginBottom: '16px' }}>
              Timetables ({timetables.length})
            </h2>

            {timetables.length === 0 ? (
              <div style={{ padding: '48px', textAlign: 'center', color: '#64748b' }}>
                <Calendar size={48} style={{ color: '#cbd5e1', marginBottom: '16px', margin: '0 auto' }} />
                <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#0f172a', marginBottom: '8px' }}>No timetables</h3>
                <p style={{ fontSize: '14px', marginBottom: '24px' }}>Create a timetable to manage class schedules</p>
                <Button onClick={() => navigate('/timetable/new')}>Create Timetable</Button>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #e2e8f0' }}>
                      <th style={{ padding: '12px', textAlign: 'left', fontSize: '14px', fontWeight: 600, color: '#64748b' }}>Name</th>
                      <th style={{ padding: '12px', textAlign: 'left', fontSize: '14px', fontWeight: 600, color: '#64748b' }}>Classroom</th>
                      <th style={{ padding: '12px', textAlign: 'left', fontSize: '14px', fontWeight: 600, color: '#64748b' }}>Academic Year</th>
                      <th style={{ padding: '12px', textAlign: 'center', fontSize: '14px', fontWeight: 600, color: '#64748b' }}>Status</th>
                      <th style={{ padding: '12px', textAlign: 'right', fontSize: '14px', fontWeight: 600, color: '#64748b' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {timetables.map((tt) => {
                      const status = tt.status || 'draft';
                      return (
                        <tr key={tt.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                          <td style={{ padding: '12px', fontSize: '14px', fontWeight: 500, color: '#0f172a' }}>
                            {tt.name}
                          </td>
                          <td style={{ padding: '12px', fontSize: '14px', color: '#64748b' }}>
                            {tt.classroom_name}
                          </td>
                          <td style={{ padding: '12px', fontSize: '14px', color: '#64748b' }}>
                            {tt.academic_year_name}
                          </td>
                          <td style={{ padding: '12px', textAlign: 'center' }}>
                            {status === 'draft' && (
                              <span style={{
                                padding: '4px 8px',
                                background: '#f1f5f9',
                                color: '#64748b',
                                borderRadius: '4px',
                                fontSize: '12px',
                                fontWeight: 500,
                              }}>
                                Draft
                              </span>
                            )}
                            {status === 'published' && (
                              <span style={{
                                padding: '4px 8px',
                                background: '#dcfce7',
                                color: '#166534',
                                borderRadius: '4px',
                                fontSize: '12px',
                                fontWeight: 500,
                              }}>
                                Published
                              </span>
                            )}
                            {status === 'archived' && (
                              <span style={{
                                padding: '4px 8px',
                                background: '#f1f5f9',
                                color: '#64748b',
                                borderRadius: '4px',
                                fontSize: '12px',
                                fontWeight: 500,
                              }}>
                                Archived
                              </span>
                            )}
                          </td>
                          <td style={{ padding: '12px', textAlign: 'right' }}>
                            <Button
                              variant="secondary"
                              onClick={() => navigate(`/timetable/${tt.id}`)}
                            >
                              <ArrowRight size={16} />
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </Card>
      </div>
    </Layout>
  );
}





