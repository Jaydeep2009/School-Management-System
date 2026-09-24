/**
 * Attendance Management Page
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
import type { AttendanceSession } from '../types/entities';
import { ClipboardCheck, Plus, Calendar } from 'lucide-react';

export function Attendance() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<AttendanceSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    try {
      setIsLoading(true);
      setError(null);
      // Get current academic year from user or default
      const academicYearId = '';
      if (academicYearId) {
        const response = await apiService.getAttendanceSessions({ academic_year_id: academicYearId });
        setSessions(response.data || response);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load attendance sessions');
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) return null;

  return (
    <Layout
      schoolName={'SMS'}
      principalName={"User"}
      onLogout={logout}
    >
      <div style={{ padding: '32px' }}>
        <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ fontSize: '28px', fontWeight: 600, color: '#0f172a', marginBottom: '8px' }}>
              Attendance
            </h1>
            <p style={{ fontSize: '14px', color: '#64748b' }}>
              View and manage attendance sessions
            </p>
          </div>
          <Button onClick={() => navigate('/attendance/new')}>
            <Plus size={16} style={{ marginRight: '8px' }} />
            New Session
          </Button>
        </div>

        <Card>
          <div style={{ padding: '24px' }}>
            {isLoading && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {[1, 2, 3].map((i) => <Skeleton key={i} height="80px" />)}
              </div>
            )}

            {error && !isLoading && <ErrorState message={error} onRetry={loadSessions} />}

            {!isLoading && !error && sessions.length === 0 && (
              <div style={{ textAlign: 'center', padding: '48px 24px' }}>
                <ClipboardCheck size={48} style={{ color: '#cbd5e1', marginBottom: '16px' }} />
                <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#0f172a', marginBottom: '8px' }}>
                  No attendance sessions
                </h3>
                <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '24px' }}>
                  Start by creating your first attendance session
                </p>
                <Button onClick={() => navigate('/attendance/new')}>
                  Create Session
                </Button>
              </div>
            )}

            {!isLoading && !error && sessions.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {sessions.map((session) => (
                  <div
                    key={session.id}
                    style={{
                      padding: '16px',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      cursor: 'pointer',
                    }}
                    onClick={() => navigate(`/attendance/${session.id}`)}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '8px' }}>
                      <div>
                        <div style={{ fontWeight: 600, color: '#0f172a', marginBottom: '4px' }}>
                          {session.classroom_name}
                          {session.subject_name && ` - ${session.subject_name}`}
                        </div>
                        <div style={{ fontSize: '14px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Calendar size={14} />
                          {new Date(session.session_date).toLocaleDateString()}
                          <span>•</span>
                          {session.session_type.replace('_', ' ').toUpperCase()}
                        </div>
                      </div>
                      <span style={{
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '12px',
                        fontWeight: 500,
                        background: session.status === 'submitted' ? '#dcfce7' : session.status === 'locked' ? '#f1f5f9' : '#fef3c7',
                        color: session.status === 'submitted' ? '#166534' : session.status === 'locked' ? '#64748b' : '#92400e',
                      }}>
                        {session.status}
                      </span>
                    </div>
                    {session.present_count !== undefined && (
                      <div style={{ fontSize: '14px', color: '#64748b' }}>
                        Present: {session.present_count}/{session.total_students || 0}
                      </div>
                    )}
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





