/**
 * Teacher Timetable Page
 * Shows personalized weekly schedule for logged-in teacher
 */

import { useState, useEffect } from 'react';
import { TeacherLayout } from '../components/layout/TeacherLayout';
import { Card } from '../components/ui/Card';
import { Skeleton } from '../components/ui/Skeleton';
import { ErrorState } from '../components/ui/ErrorState';
import { useAuth } from '../hooks/useAuth';
import { apiService } from '../services/api';
import { Calendar, Clock, BookOpen, Users } from 'lucide-react';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

interface TimetableEntry {
  id: string;
  day_of_week: number;
  period_no: number;
  subject_id: string;
  subject_name: string;
  teacher_id: string;
  teacher_name?: string;
  classroom_id: string;
  classroom_name: string;
  start_time?: string;
  end_time?: string;
}

export function TeacherTimetable() {
  const { user, logout } = useAuth();
  const [entries, setEntries] = useState<TimetableEntry[]>([]);
  const [periodTimings, setPeriodTimings] = useState<any[]>([]);
  const [classrooms, setClassrooms] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedClassroom, setSelectedClassroom] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadClassrooms();
  }, []);

  useEffect(() => {
    if (selectedClassroom) {
      loadTimetable(selectedClassroom);
    }
  }, [selectedClassroom]);

  const loadClassrooms = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await apiService.getMyTimetable();
      console.log('[TeacherTimetable] API Response:', response);
      
      // Load period timings to show breaks
      if (response.data.timetable?.academic_year_id) {
        const periodTimingsRes = await apiService.getPeriodTimings(response.data.timetable.academic_year_id);
        setPeriodTimings(periodTimingsRes.data || []);
      }
      
      // Extract unique classrooms from entries
      const allEntries = response.data.entries || [];
      const uniqueClassrooms = Array.from(
        new Map(
          allEntries.map((e: TimetableEntry) => [e.classroom_id, { id: e.classroom_id, name: e.classroom_name }])
        ).values()
      );
      
      setClassrooms(uniqueClassrooms);
      
      // Auto-select first classroom if available
      if (uniqueClassrooms.length > 0) {
        setSelectedClassroom(uniqueClassrooms[0].id);
        setEntries(allEntries.filter((e: TimetableEntry) => e.classroom_id === uniqueClassrooms[0].id));
      }
    } catch (err) {
      console.error('[TeacherTimetable] Error loading classrooms:', err);
      setError(err instanceof Error ? err.message : 'Failed to load classrooms');
    } finally {
      setIsLoading(false);
    }
  };

  const loadTimetable = async (classroomId: string) => {
    try {
      const response = await apiService.getMyTimetable();
      const allEntries = response.data.entries || [];
      setEntries(allEntries.filter((e: TimetableEntry) => e.classroom_id === classroomId));
    } catch (err) {
      console.error('[TeacherTimetable] Error loading timetable:', err);
      setError(err instanceof Error ? err.message : 'Failed to load timetable');
    }
  };

  const getPeriodNumbers = () => {
    // Use period timings if available, otherwise fall back to entries
    if (periodTimings.length > 0) {
      return periodTimings
        .sort((a, b) => a.period_no - b.period_no)
        .map(pt => ({
          period_no: pt.period_no,
          label: pt.label,
          start_time: pt.start_time,
          end_time: pt.end_time,
          is_break: pt.is_break
        }));
    }
    
    const periods = new Set(entries.map(e => e.period_no));
    return Array.from(periods).sort((a, b) => a - b).map(pn => ({
      period_no: pn,
      label: `Period ${pn}`,
      start_time: '',
      end_time: '',
      is_break: false
    }));
  };

  const getEntryForDayAndPeriod = (dayIndex: number, periodNo: number) => {
    return entries.find(e => e.day_of_week === dayIndex + 1 && e.period_no === periodNo);
  };

  if (!user) return null;

  if (isLoading) {
    return (
      <TeacherLayout schoolName={'SMS'} principalName={user.loginId || 'Teacher'} onLogout={logout}>
        <div style={{ padding: '32px' }}>
          <Skeleton height="600px" />
        </div>
      </TeacherLayout>
    );
  }

  if (error) {
    return (
      <TeacherLayout schoolName={'SMS'} principalName={user.loginId || 'Teacher'} onLogout={logout}>
        <div style={{ padding: '32px' }}>
          <ErrorState message={error} onRetry={loadClassrooms} />
        </div>
      </TeacherLayout>
    );
  }

  const periods = getPeriodNumbers();
  const totalClasses = entries.length;
  const uniqueSubjects = new Set(entries.map(e => e.subject_name)).size;
  const uniqueClassrooms = new Set(entries.map(e => e.classroom_name)).size;

  return (
    <TeacherLayout schoolName={'SMS'} principalName={user.loginId || 'Teacher'} onLogout={logout}>
      <div style={{ padding: '32px' }}>
        <div style={{ marginBottom: '24px' }}>
          <h1 style={{ fontSize: '28px', fontWeight: 600, color: '#0f172a', marginBottom: '8px' }}>
            My Timetable
          </h1>
          <p style={{ fontSize: '14px', color: '#64748b' }}>
            Your weekly teaching schedule
          </p>
        </div>

        {/* Classroom Selector */}
        {classrooms.length > 1 && (
          <Card>
            <div style={{ padding: '20px', marginBottom: '24px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#0f172a', marginBottom: '12px' }}>
                Select Classroom
              </h3>
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                {classrooms.map((classroom) => (
                  <button
                    key={classroom.id}
                    onClick={() => setSelectedClassroom(classroom.id)}
                    style={{
                      padding: '10px 20px',
                      background: selectedClassroom === classroom.id ? '#3b82f6' : '#f1f5f9',
                      color: selectedClassroom === classroom.id ? '#ffffff' : '#64748b',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '14px',
                      fontWeight: 500,
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                  >
                    {classroom.name}
                  </button>
                ))}
              </div>
            </div>
          </Card>
        )}

        {classrooms.length === 0 ? (
          <Card>
            <div style={{ padding: '48px', textAlign: 'center' }}>
              <Calendar size={64} style={{ color: '#cbd5e1', margin: '0 auto 16px' }} />
              <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#0f172a', marginBottom: '8px' }}>
                No Classes Assigned
              </h3>
              <p style={{ fontSize: '14px', color: '#64748b' }}>
                You don't have any teaching assignments yet
              </p>
            </div>
          </Card>
        ) : (
          <>
            {/* Summary Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
              <Card>
                <div style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ padding: '12px', background: '#eff6ff', borderRadius: '8px' }}>
                    <Calendar size={24} style={{ color: '#3b82f6' }} />
                  </div>
                  <div>
                    <div style={{ fontSize: '24px', fontWeight: 600, color: '#0f172a' }}>{totalClasses}</div>
                    <div style={{ fontSize: '14px', color: '#64748b' }}>Classes per Week</div>
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
                    <Users size={24} style={{ color: '#f59e0b' }} />
                  </div>
                  <div>
                    <div style={{ fontSize: '24px', fontWeight: 600, color: '#0f172a' }}>{uniqueClassrooms}</div>
                    <div style={{ fontSize: '14px', color: '#64748b' }}>Classrooms</div>
                  </div>
                </div>
              </Card>
            </div>
          </>
        )}

        {entries.length === 0 && selectedClassroom ? (
          <Card>
            <div style={{ padding: '48px', textAlign: 'center' }}>
              <Calendar size={64} style={{ color: '#cbd5e1', margin: '0 auto 16px' }} />
              <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#0f172a', marginBottom: '8px' }}>
                No Timetable Available
              </h3>
              <p style={{ fontSize: '14px', color: '#64748b' }}>
                Timetable for this classroom hasn't been created yet
              </p>
            </div>
          </Card>
        ) : entries.length > 0 ? (
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
                    {periods.map(period => (
                      <th key={period.period_no} style={{ 
                        padding: '12px', 
                        textAlign: 'center', 
                        borderBottom: '2px solid #e2e8f0', 
                        fontSize: '14px', 
                        fontWeight: 600, 
                        color: '#64748b',
                        minWidth: '150px',
                        background: period.is_break ? '#fef3c7' : 'transparent'
                      }}>
                        {period.label || `Period ${period.period_no}`}
                        {period.start_time && (
                          <div style={{ fontSize: '12px', fontWeight: 'normal', color: '#94a3b8', marginTop: '4px' }}>
                            {period.start_time} - {period.end_time}
                          </div>
                        )}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {DAYS.map((day, dayIndex) => {
                    // Show ALL days, not just days with entries

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
                        {periods.map(period => {
                          const entry = getEntryForDayAndPeriod(dayIndex, period.period_no);
                          
                          // If it's a break period, show "Break"
                          if (period.is_break) {
                            return (
                              <td key={period.period_no} style={{ 
                                padding: '12px', 
                                textAlign: 'center',
                                background: '#fef3c7',
                                color: '#92400e',
                                fontWeight: 600,
                                borderBottom: '1px solid #e2e8f0'
                              }}>
                                {period.label || 'Break'}
                              </td>
                            );
                          }
                          
                          return (
                            <td key={period.period_no} style={{ 
                              padding: '8px', 
                              borderBottom: '1px solid #e2e8f0',
                              verticalAlign: 'top'
                            }}>
                              {entry ? (
                                <div style={{
                                  padding: '12px',
                                  background: '#eff6ff',
                                  border: '1px solid #bfdbfe',
                                  borderRadius: '6px',
                                  minHeight: '80px'
                                }}>
                                  <div style={{ 
                                    fontSize: '14px', 
                                    fontWeight: 600, 
                                    color: '#1e40af',
                                    marginBottom: '6px'
                                  }}>
                                    {entry.subject_name}
                                  </div>
                                  {entry.teacher_name && (
                                    <div style={{ 
                                      fontSize: '13px', 
                                      color: '#64748b',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '4px',
                                      marginBottom: '4px'
                                    }}>
                                      <Users size={14} />
                                      {entry.teacher_name}
                                    </div>
                                  )}
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
        ) : null}
      </div>
    </TeacherLayout>
  );
}
