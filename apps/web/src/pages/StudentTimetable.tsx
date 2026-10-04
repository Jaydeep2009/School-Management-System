/**
 * Student Timetable Page
 * Shows the complete class timetable for the student's enrolled classroom
 */

import { useState, useEffect } from 'react';
import { Layout } from '../components/layout/Layout';
import { Card } from '../components/ui/Card';
import { Skeleton } from '../components/ui/Skeleton';
import { ErrorState } from '../components/ui/ErrorState';
import { useAuth } from '../hooks/useAuth';
import { apiService } from '../services/api';
import { Calendar, Clock, BookOpen, User } from 'lucide-react';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

interface TimetableEntry {
  id: string;
  day_of_week: number;
  period_no: number;
  subject_id: string;
  subject_name: string;
  teacher_id: string;
  teacher_name: string;
  classroom_id: string;
  classroom_name: string;
  start_time?: string;
  end_time?: string;
}

export function StudentTimetable() {
  const { user, logout } = useAuth();
  const [timetableData, setTimetableData] = useState<{ timetable: any | null; entries: TimetableEntry[] }>({ 
    timetable: null, 
    entries: [] 
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadTimetable();
  }, []);

  const loadTimetable = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await apiService.getMyTimetable();
      setTimetableData(response.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load timetable');
    } finally {
      setIsLoading(false);
    }
  };

  const getPeriodNumbers = () => {
    const periods = new Set(timetableData.entries.map(e => e.period_no));
    return Array.from(periods).sort((a, b) => a - b);
  };

  const getEntryForDayAndPeriod = (dayIndex: number, periodNo: number) => {
    return timetableData.entries.find(e => e.day_of_week === dayIndex + 1 && e.period_no === periodNo);
  };

  if (!user) return null;

  if (isLoading) {
    return (
      <Layout schoolName={'SMS'} principalName={user.loginId || 'Student'} onLogout={logout}>
        <div style={{ padding: '32px' }}>
          <Skeleton height="600px" />
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout schoolName={'SMS'} principalName={user.loginId || 'Student'} onLogout={logout}>
        <div style={{ padding: '32px' }}>
          <ErrorState message={error} onRetry={loadTimetable} />
        </div>
      </Layout>
    );
  }

  const periods = getPeriodNumbers();
  const uniqueSubjects = new Set(timetableData.entries.map(e => e.subject_name)).size;
  const uniqueTeachers = new Set(timetableData.entries.map(e => e.teacher_name)).size;
  const classroomName = timetableData.entries[0]?.classroom_name || 'Your Class';

  return (
    <Layout schoolName={'SMS'} principalName={user.loginId || 'Student'} onLogout={logout}>
      <div style={{ padding: '32px' }}>
        <div style={{ marginBottom: '24px' }}>
          <h1 style={{ fontSize: '28px', fontWeight: 600, color: '#0f172a', marginBottom: '8px' }}>
            Class Timetable
          </h1>
          <p style={{ fontSize: '14px', color: '#64748b' }}>
            {classroomName} - Weekly Schedule
          </p>
        </div>

        {/* Summary Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
          <Card>
            <div style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ padding: '12px', background: '#eff6ff', borderRadius: '8px' }}>
                <Calendar size={24} style={{ color: '#3b82f6' }} />
              </div>
              <div>
                <div style={{ fontSize: '24px', fontWeight: 600, color: '#0f172a' }}>{timetableData.entries.length}</div>
                <div style={{ fontSize: '14px', color: '#64748b' }}>Periods per Week</div>
              </div>
            </div>
          </Card>
          <Card>
            <div style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ padding: '12px', background: '#f0fdf4', borderRadius: '8px' }}>
                <BookOpen size={24} style={{ color: '#22c55e' }} />
              </div>
              <div>
                <div style={{ fontSize: '24px', fontWeight: 600, color: '#0f172a' }}>{uniqueSubjects}</div>
                <div style={{ fontSize: '14px', color: '#64748b' }}>Subjects</div>
              </div>
            </div>
          </Card>
          <Card>
            <div style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ padding: '12px', background: '#fef3c7', borderRadius: '8px' }}>
                <User size={24} style={{ color: '#f59e0b' }} />
              </div>
              <div>
                <div style={{ fontSize: '24px', fontWeight: 600, color: '#0f172a' }}>{uniqueTeachers}</div>
                <div style={{ fontSize: '14px', color: '#64748b' }}>Teachers</div>
              </div>
            </div>
          </Card>
        </div>

        {timetableData.entries.length === 0 ? (
          <Card>
            <div style={{ padding: '48px', textAlign: 'center' }}>
              <Calendar size={64} style={{ color: '#cbd5e1', margin: '0 auto 16px' }} />
              <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#0f172a', marginBottom: '8px' }}>
                No Timetable Available
              </h3>
              <p style={{ fontSize: '14px', color: '#64748b' }}>
                Your class timetable will appear here once it's published by the principal
              </p>
            </div>
          </Card>
        ) : (
          <Card>
            <div style={{ padding: '24px', overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '800px' }}>
                <thead>
                  <tr>
                    <th style={{ 
                      padding: '12px', 
                      textAlign: 'left', 
                      borderBottom: '2px solid #e2e8f0', 
                      fontSize: '14px', 
                      fontWeight: 600, 
                      color: '#64748b',
                      minWidth: '100px'
                    }}>
                      Day / Period
                    </th>
                    {periods.map(periodNo => (
                      <th key={periodNo} style={{ 
                        padding: '12px', 
                        textAlign: 'center', 
                        borderBottom: '2px solid #e2e8f0', 
                        fontSize: '14px', 
                        fontWeight: 600, 
                        color: '#64748b',
                        minWidth: '150px'
                      }}>
                        Period {periodNo}
                        {timetableData.entries.find(e => e.period_no === periodNo)?.start_time && (
                          <div style={{ fontSize: '12px', fontWeight: 'normal', color: '#94a3b8', marginTop: '4px' }}>
                            {timetableData.entries.find(e => e.period_no === periodNo)?.start_time} - {timetableData.entries.find(e => e.period_no === periodNo)?.end_time}
                          </div>
                        )}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {DAYS.map((day, dayIndex) => {
                    const dayEntries = timetableData.entries.filter(e => e.day_of_week === dayIndex + 1);
                    if (dayEntries.length === 0) return null;

                    return (
                      <tr key={day}>
                        <td style={{ 
                          padding: '12px', 
                          fontWeight: 600, 
                          color: '#0f172a', 
                          borderBottom: '1px solid #e2e8f0',
                          background: '#f8fafc'
                        }}>
                          {day}
                        </td>
                        {periods.map(periodNo => {
                          const entry = getEntryForDayAndPeriod(dayIndex, periodNo);
                          
                          return (
                            <td key={`${day}-${periodNo}`} style={{ 
                              padding: '8px', 
                              borderBottom: '1px solid #e2e8f0',
                              verticalAlign: 'top'
                            }}>
                              {entry ? (
                                <div style={{
                                  padding: '12px',
                                  background: '#f0fdf4',
                                  border: '1px solid #bbf7d0',
                                  borderRadius: '6px',
                                  minHeight: '80px'
                                }}>
                                  <div style={{ 
                                    fontSize: '14px', 
                                    fontWeight: 600, 
                                    color: '#15803d',
                                    marginBottom: '6px'
                                  }}>
                                    {entry.subject_name}
                                  </div>
                                  <div style={{ 
                                    fontSize: '13px', 
                                    color: '#64748b',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    marginBottom: '4px'
                                  }}>
                                    <User size={14} />
                                    {entry.teacher_name}
                                  </div>
                                  {entry.start_time && (
                                    <div style={{ 
                                      fontSize: '12px', 
                                      color: '#94a3b8',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '4px'
                                    }}>
                                      <Clock size={12} />
                                      {entry.start_time} - {entry.end_time}
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <div style={{ 
                                  padding: '12px',
                                  minHeight: '80px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  color: '#cbd5e1',
                                  fontSize: '14px'
                                }}>
                                  Free
                                </div>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>
    </Layout>
  );
}
