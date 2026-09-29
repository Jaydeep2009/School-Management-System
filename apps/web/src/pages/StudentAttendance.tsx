/**
 * Student Attendance Page
 * Shows student's own attendance per subject and overall
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../components/layout/Layout';
import { Card } from '../components/ui/Card';
import { Skeleton } from '../components/ui/Skeleton';
import { useAuth } from '../hooks/useAuth';
import { apiService } from '../services/api';
import { ArrowLeft, CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react';

export function StudentAttendance() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadAttendanceData();
  }, []);

  const loadAttendanceData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await apiService.getMyAttendance();
      setData(response.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load attendance');
    } finally {
      setIsLoading(false);
    }
  };

  const getPercentageColor = (percentage: number) => {
    if (percentage >= 90) return '#16a34a';
    if (percentage >= 75) return '#eab308';
    return '#ef4444';
  };

  if (!user) return null;

  return (
    <Layout schoolName={'SMS'} principalName={user.loginId || 'Student'} onLogout={logout} role="student">
      <div style={{ padding: '32px', maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={() => navigate('/student/dashboard')}
            style={{
              padding: '8px',
              border: '1px solid #e2e8f0',
              borderRadius: '6px',
              background: 'white',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <h1 style={{ fontSize: '28px', fontWeight: 600, color: '#0f172a' }}>
              My Attendance
            </h1>
            <p style={{ fontSize: '14px', color: '#64748b' }}>
              View your attendance record by subject
            </p>
          </div>
        </div>

        {isLoading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <Skeleton height="150px" />
            <Skeleton height="400px" />
          </div>
        ) : error ? (
          <Card>
            <div style={{ padding: '48px', textAlign: 'center' }}>
              <AlertCircle size={48} style={{ color: '#ef4444', margin: '0 auto 16px' }} />
              <p style={{ color: '#ef4444', marginBottom: '16px' }}>{error}</p>
              <button
                onClick={loadAttendanceData}
                style={{
                  padding: '8px 16px',
                  background: '#2563eb',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                }}
              >
                Try Again
              </button>
            </div>
          </Card>
        ) : (
          <>
            {/* Overall Summary */}
            <Card>
              <div style={{ padding: '32px' }}>
                <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#0f172a', marginBottom: '24px' }}>
                  Overall Attendance
                </h2>
                
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '24px' }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{
                      fontSize: '48px',
                      fontWeight: 700,
                      color: getPercentageColor(data?.summary?.percentage || 0),
                      marginBottom: '8px'
                    }}>
                      {Math.round(data?.summary?.percentage || 0)}%
                    </div>
                    <div style={{ fontSize: '14px', color: '#64748b', fontWeight: 500 }}>
                      Attendance Rate
                    </div>
                  </div>

                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '48px', fontWeight: 700, color: '#16a34a', marginBottom: '8px' }}>
                      {data?.summary?.present || 0}
                    </div>
                    <div style={{ fontSize: '14px', color: '#64748b', fontWeight: 500 }}>
                      <CheckCircle size={16} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} />
                      Present
                    </div>
                  </div>

                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '48px', fontWeight: 700, color: '#ef4444', marginBottom: '8px' }}>
                      {data?.summary?.absent || 0}
                    </div>
                    <div style={{ fontSize: '14px', color: '#64748b', fontWeight: 500 }}>
                      <XCircle size={16} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} />
                      Absent
                    </div>
                  </div>

                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '48px', fontWeight: 700, color: '#0f172a', marginBottom: '8px' }}>
                      {data?.summary?.total_sessions || 0}
                    </div>
                    <div style={{ fontSize: '14px', color: '#64748b', fontWeight: 500 }}>
                      Total Sessions
                    </div>
                  </div>
                </div>

                {data?.summary?.late > 0 || data?.summary?.excused > 0 ? (
                  <div style={{
                    marginTop: '24px',
                    paddingTop: '24px',
                    borderTop: '1px solid #e2e8f0',
                    display: 'flex',
                    gap: '32px',
                    justifyContent: 'center'
                  }}>
                    {data?.summary?.late > 0 && (
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '24px', fontWeight: 600, color: '#f59e0b', marginBottom: '4px' }}>
                          {data.summary.late}
                        </div>
                        <div style={{ fontSize: '13px', color: '#64748b' }}>
                          <Clock size={14} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} />
                          Late
                        </div>
                      </div>
                    )}
                    {data?.summary?.excused > 0 && (
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '24px', fontWeight: 600, color: '#6366f1', marginBottom: '4px' }}>
                          {data.summary.excused}
                        </div>
                        <div style={{ fontSize: '13px', color: '#64748b' }}>
                          <AlertCircle size={14} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} />
                          Excused
                        </div>
                      </div>
                    )}
                  </div>
                ) : null}
              </div>
            </Card>

            {/* Subject-wise Attendance */}
            <div style={{ marginTop: '24px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: 600, color: '#0f172a', marginBottom: '16px' }}>
                Subject-wise Attendance
              </h2>
              
              {!data?.subject_wise || data.subject_wise.length === 0 ? (
                <Card>
                  <div style={{ padding: '48px', textAlign: 'center', color: '#64748b' }}>
                    <CheckCircle size={48} style={{ margin: '0 auto 16px', opacity: 0.3 }} />
                    <p>No attendance records found</p>
                  </div>
                </Card>
              ) : (
                <div style={{ display: 'grid', gap: '16px' }}>
                  {data.subject_wise.map((subject: any) => {
                    const percentage = Math.round(subject.percentage || 0);
                    const color = getPercentageColor(percentage);
                    
                    return (
                      <Card key={subject.subject_id}>
                        <div style={{ padding: '24px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                            <div>
                              <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#0f172a', marginBottom: '4px' }}>
                                {subject.subject_name}
                              </h3>
                              <p style={{ fontSize: '13px', color: '#64748b' }}>
                                {subject.total_sessions} session{subject.total_sessions !== 1 ? 's' : ''}
                              </p>
                            </div>
                            <div style={{
                              padding: '12px 24px',
                              background: `${color}15`,
                              borderRadius: '8px',
                              textAlign: 'center'
                            }}>
                              <div style={{ fontSize: '32px', fontWeight: 700, color }}>
                                {percentage}%
                              </div>
                            </div>
                          </div>

                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
                            <div style={{ padding: '12px', background: '#f0fdf4', borderRadius: '6px', textAlign: 'center' }}>
                              <div style={{ fontSize: '20px', fontWeight: 600, color: '#16a34a', marginBottom: '4px' }}>
                                {subject.present}
                              </div>
                              <div style={{ fontSize: '12px', color: '#64748b' }}>Present</div>
                            </div>

                            <div style={{ padding: '12px', background: '#fef2f2', borderRadius: '6px', textAlign: 'center' }}>
                              <div style={{ fontSize: '20px', fontWeight: 600, color: '#ef4444', marginBottom: '4px' }}>
                                {subject.absent}
                              </div>
                              <div style={{ fontSize: '12px', color: '#64748b' }}>Absent</div>
                            </div>

                            {subject.late > 0 && (
                              <div style={{ padding: '12px', background: '#fef3c7', borderRadius: '6px', textAlign: 'center' }}>
                                <div style={{ fontSize: '20px', fontWeight: 600, color: '#f59e0b', marginBottom: '4px' }}>
                                  {subject.late}
                                </div>
                                <div style={{ fontSize: '12px', color: '#64748b' }}>Late</div>
                              </div>
                            )}

                            {subject.excused > 0 && (
                              <div style={{ padding: '12px', background: '#eef2ff', borderRadius: '6px', textAlign: 'center' }}>
                                <div style={{ fontSize: '20px', fontWeight: 600, color: '#6366f1', marginBottom: '4px' }}>
                                  {subject.excused}
                                </div>
                                <div style={{ fontSize: '12px', color: '#64748b' }}>Excused</div>
                              </div>
                            )}
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}
