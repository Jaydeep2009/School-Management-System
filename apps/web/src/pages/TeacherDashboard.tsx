/**
 * Teacher Dashboard - Main dashboard for teacher role
 * Shows: Today's classes, My teaching assignments, Attendance, Marks
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../components/layout/Layout';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Skeleton } from '../components/ui/Skeleton';
import { useAuth } from '../hooks/useAuth';
import { useAcademicYear } from '../contexts/AcademicYearContext';
import { apiService } from '../services/api';
import { 
  BookOpen, 
  Calendar, 
  Users, 
  CheckCircle, 
  AlertCircle,
  FileText,
  RefreshCw,
  Cake
} from 'lucide-react';

interface TeachingAssignment {
  id: string;
  classroom_id: string;
  classroom_code?: string;
  classroom_name?: string;
  subject_id: string;
  subject_name?: string;
  academic_year_id: string;
  is_class_teacher: boolean;
}

interface TodayClass {
  id?: string;
  classroom_id: string;
  classroom_name: string;
  subject_id: string;
  subject_name: string;
  period?: number;
  hasAttendance: boolean;
  session_id?: string;
}

interface ClassroomStats {
  student_count: number;
}

interface Birthday {
  user_id: string;
  full_name: string;
  role: 'student';
  days_until: number;
  date_of_birth: string;
  classroom?: string;
}

export function TeacherDashboard() {
  const { user, logout } = useAuth();
  const { selectedYear } = useAcademicYear();
  const navigate = useNavigate();
  
  const [teachings, setTeachings] = useState<TeachingAssignment[]>([]);
  const [todayClasses, setTodayClasses] = useState<TodayClass[]>([]);
  const [classTeacherOf, setClassTeacherOf] = useState<TeachingAssignment | null>(null);
  const [classroomStats, setClassroomStats] = useState<ClassroomStats | null>(null);
  const [birthdays, setBirthdays] = useState<Birthday[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  useEffect(() => {
    loadDashboardData();
  }, [selectedYear]);

  const loadDashboardData = async (refresh = false) => {
    try {
      if (refresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setError(null);

      // Load teacher's teaching assignments (already filtered by current year in backend)
      const teachingsRes = await apiService.getMyTeaching();
      const assignments = teachingsRes.data || [];
      setTeachings(assignments);

      // Find if teacher is a class teacher (check for truthy value - can be 1 or true)
      const classTeacher = assignments.find((t: TeachingAssignment) => !!t.is_class_teacher);
      setClassTeacherOf(classTeacher || null);

      // Load classroom stats for class teacher
      if (classTeacher?.classroom_id) {
        try {
          const enrollmentsRes = await apiService.getClassroomEnrollments(classTeacher.classroom_id);
          const activeEnrollments = (enrollmentsRes.data || []).filter(
            (e: any) => e.status === 'active'
          );
          setClassroomStats({ student_count: activeEnrollments.length });
        } catch (err) {
          console.error('Failed to load classroom stats:', err);
          setClassroomStats({ student_count: 0 });
        }
      }

      // Load today's attendance status
      await loadTodayAttendanceStatus(assignments);

      // Load upcoming birthdays
      await loadBirthdays();

      setLastUpdated(new Date());
    } catch (err) {
      console.error('Failed to load dashboard:', err);
      setError(err instanceof Error ? err.message : 'Failed to load dashboard');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const loadTodayAttendanceStatus = async (assignments: TeachingAssignment[]) => {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      // Get attendance sessions for today
      const sessionsRes = await apiService.getAttendanceSessions({
        date: today,
      });
      const todaySessions = sessionsRes.data || [];

      // Map teaching assignments to today's classes with attendance status
      const classesWithStatus: TodayClass[] = assignments.map((a: TeachingAssignment) => {
        // Find if there's an attendance session for this class/subject today
        const session = todaySessions.find(
          (s: any) =>
            s.classroom_id === a.classroom_id &&
            s.subject_id === a.subject_id &&
            s.marked_on?.startsWith(today)
        );

        return {
          id: a.id,
          classroom_id: a.classroom_id,
          classroom_name: a.classroom_name || a.classroom_code || 'Unknown',
          subject_id: a.subject_id,
          subject_name: a.subject_name || 'Unknown Subject',
          hasAttendance: !!session,
          session_id: session?.id,
        };
      });

      setTodayClasses(classesWithStatus);
    } catch (err) {
      console.error('Failed to load attendance status:', err);
      // Fallback: show all classes without attendance
      const fallbackClasses: TodayClass[] = assignments.map((a: TeachingAssignment) => ({
        id: a.id,
        classroom_id: a.classroom_id,
        classroom_name: a.classroom_name || a.classroom_code || 'Unknown',
        subject_id: a.subject_id,
        subject_name: a.subject_name || 'Unknown Subject',
        hasAttendance: false,
      }));
      setTodayClasses(fallbackClasses);
    }
  };

  const loadBirthdays = async () => {
    try {
      const response = await apiService.getUpcomingBirthdays({ thisWeek: true });
      setBirthdays((response.data || []).slice(0, 5));
    } catch (err) {
      console.error('Failed to load birthdays:', err);
      setBirthdays([]);
    }
  };

  const handleRefresh = () => {
    loadDashboardData(true);
  };

  const handleRetry = () => {
    loadDashboardData(false);
  };

  if (!user) return null;

  if (isLoading) {
    return (
      <Layout 
        schoolName={'SMS'} 
        principalName={user.loginId || 'Teacher'} 
        onLogout={logout}
        role="teacher"
        isClassTeacher={!!classTeacherOf}
      >
        <div style={{ padding: '32px' }}>
          {/* Header Skeleton */}
          <div style={{ marginBottom: '32px' }}>
            <Skeleton height="36px" width="300px" style={{ marginBottom: '8px' }} />
            <Skeleton height="20px" width="400px" />
          </div>

          {/* Stats Skeleton */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '24px', marginBottom: '32px' }}>
            <Skeleton height="120px" />
            <Skeleton height="120px" />
            <Skeleton height="120px" />
          </div>

          {/* Cards Skeleton */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px' }}>
            <Skeleton height="400px" />
            <Skeleton height="400px" />
          </div>
        </div>
      </Layout>
    );
  }

  const pendingAttendance = todayClasses.filter(c => !c.hasAttendance).length;

  return (
    <Layout 
      schoolName={'SMS'} 
      principalName={user.loginId || 'Teacher'} 
      onLogout={logout}
      role="teacher"
      isClassTeacher={!!classTeacherOf}
    >
      <div style={{ padding: '32px' }}>
        {/* Header */}
        <div style={{ marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
          <div>
            <h1 style={{ fontSize: '28px', fontWeight: 600, color: '#0f172a', marginBottom: '8px' }}>
              Welcome back, {user.loginId?.split('_')[0] || 'Teacher'}!
            </h1>
            <p style={{ fontSize: '14px', color: '#64748b' }}>
              {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
            <p style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>
              Last updated: {lastUpdated.toLocaleTimeString()}
            </p>
          </div>
          <Button
            variant="secondary"
            size="small"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw size={16} style={{ marginRight: '8px' }} className={isRefreshing ? 'spin' : ''} />
            Refresh
          </Button>
        </div>

        {error && (
          <div style={{ marginBottom: '24px' }}>
            <Card>
              <div style={{ padding: '16px', background: '#fee2e2', color: '#dc2626', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>{error}</div>
                <Button size="small" variant="secondary" onClick={handleRetry}>
                  Retry
                </Button>
              </div>
            </Card>
          </div>
        )}

        {/* Quick Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '24px', marginBottom: '32px' }}>
          <Card>
            <div style={{ padding: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <div style={{ padding: '12px', background: '#dbeafe', borderRadius: '8px' }}>
                  <BookOpen size={24} style={{ color: '#2563eb' }} />
                </div>
                <div>
                  <div style={{ fontSize: '24px', fontWeight: 700, color: '#0f172a' }}>
                    {teachings.length}
                  </div>
                  <div style={{ fontSize: '14px', color: '#64748b' }}>
                    Teaching Assignments
                  </div>
                </div>
              </div>
            </div>
          </Card>

          <Card>
            <div style={{ padding: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <div style={{ padding: '12px', background: pendingAttendance > 0 ? '#fee2e2' : '#dcfce7', borderRadius: '8px' }}>
                  {pendingAttendance > 0 ? (
                    <AlertCircle size={24} style={{ color: '#dc2626' }} />
                  ) : (
                    <CheckCircle size={24} style={{ color: '#16a34a' }} />
                  )}
                </div>
                <div>
                  <div style={{ fontSize: '24px', fontWeight: 700, color: '#0f172a' }}>
                    {pendingAttendance}
                  </div>
                  <div style={{ fontSize: '14px', color: '#64748b' }}>
                    {pendingAttendance === 0 ? 'All Attendance Marked' : 'Pending Attendance'}
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {classTeacherOf && (
            <Card>
              <div style={{ padding: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                  <div style={{ padding: '12px', background: '#dcfce7', borderRadius: '8px' }}>
                    <Users size={24} style={{ color: '#16a34a' }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '16px', fontWeight: 600, color: '#0f172a' }}>
                      Class Teacher
                    </div>
                    <div style={{ fontSize: '14px', color: '#64748b' }}>
                      {classTeacherOf.classroom_name || classTeacherOf.classroom_code}
                    </div>
                    {classroomStats && (
                      <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                        {classroomStats.student_count} students
                      </div>
                    )}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px', marginTop: '12px', flexWrap: 'wrap' }}>
                  <button
                    onClick={() => navigate(`/teacher/classroom/${classTeacherOf.classroom_id}/attendance`)}
                    style={{
                      padding: '8px 12px',
                      background: '#16a34a',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '13px',
                      fontWeight: 500,
                      flex: '1',
                      minWidth: '100px',
                    }}
                  >
                    Attendance
                  </button>
                  <button
                    onClick={() => navigate(`/teacher/classroom/${classTeacherOf.classroom_id}/marks`)}
                    style={{
                      padding: '8px 12px',
                      background: '#2563eb',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '13px',
                      fontWeight: 500,
                      flex: '1',
                      minWidth: '100px',
                    }}
                  >
                    Marks
                  </button>
                </div>
              </div>
            </Card>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px', marginBottom: '32px' }}>
          {/* Today's Classes */}
          <Card>
            <div style={{ padding: '24px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#0f172a', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Calendar size={20} />
                Today's Classes
              </h2>

              {todayClasses.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '32px', color: '#64748b' }}>
                  <Calendar size={48} style={{ color: '#cbd5e1', marginBottom: '16px' }} />
                  <p>No classes scheduled</p>
                  <p style={{ fontSize: '13px', marginTop: '8px' }}>
                    {teachings.length === 0 
                      ? 'Contact your principal to get teaching assignments'
                      : 'All your teaching assignments are listed below'}
                  </p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '400px', overflowY: 'auto' }}>
                  {todayClasses.map((cls, idx) => (
                    <div
                      key={idx}
                      style={{
                        padding: '12px',
                        border: '1px solid #e2e8f0',
                        borderRadius: '6px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        background: cls.hasAttendance ? '#f0fdf4' : 'white',
                      }}
                    >
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 500, color: '#0f172a' }}>
                          {cls.classroom_name}
                        </div>
                        <div style={{ fontSize: '13px', color: '#64748b' }}>
                          {cls.subject_name}
                        </div>
                      </div>
                      {cls.hasAttendance ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#16a34a' }}>
                          <CheckCircle size={20} />
                          <span style={{ fontSize: '13px', fontWeight: 500 }}>Marked</span>
                        </div>
                      ) : (
                        <Button
                          size="small"
                          onClick={() => navigate('/teacher/attendance/new', {
                            state: {
                              classroom_id: cls.classroom_id,
                              subject_id: cls.subject_id,
                            }
                          })}
                        >
                          Mark Attendance
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>

          {/* My Teaching & Birthdays */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* My Teaching */}
            <Card>
              <div style={{ padding: '24px' }}>
                <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#0f172a', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <BookOpen size={20} />
                  My Teaching
                </h2>

                {teachings.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '32px', color: '#64748b' }}>
                    <BookOpen size={48} style={{ color: '#cbd5e1', marginBottom: '16px' }} />
                    <p style={{ fontWeight: 500, marginBottom: '8px' }}>No teaching assignments yet</p>
                    <p style={{ fontSize: '13px' }}>
                      Contact your principal to get assigned to classes and subjects
                    </p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {teachings.map((teaching) => (
                      <div
                        key={teaching.id}
                        style={{
                          padding: '12px',
                          border: '1px solid #e2e8f0',
                          borderRadius: '6px',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <div style={{ fontWeight: 500, color: '#0f172a' }}>
                              {teaching.classroom_name || teaching.classroom_code}
                            </div>
                            <div style={{ fontSize: '13px', color: '#64748b' }}>
                              {teaching.subject_name}
                            </div>
                          </div>
                          {teaching.is_class_teacher && (
                            <span style={{
                              padding: '4px 8px',
                              borderRadius: '4px',
                              fontSize: '12px',
                              fontWeight: 500,
                              background: '#dcfce7',
                              color: '#166534',
                            }}>
                              Class Teacher
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Card>

            {/* Upcoming Birthdays */}
            {birthdays.length > 0 && (
              <Card>
                <div style={{ padding: '24px' }}>
                  <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#0f172a', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Cake size={20} />
                    Upcoming Birthdays
                  </h2>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {birthdays.map((birthday) => (
                      <div
                        key={birthday.user_id}
                        style={{
                          padding: '12px',
                          border: '1px solid #e2e8f0',
                          borderRadius: '6px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                          background: birthday.days_until === 0 ? '#fef3c7' : 'white',
                        }}
                      >
                        <div style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: '50%',
                          background: '#fef3c7',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}>
                          <Cake size={18} style={{ color: '#92400e' }} />
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 500, color: '#0f172a', fontSize: '14px' }}>
                            {birthday.full_name}
                          </div>
                          <div style={{ fontSize: '12px', color: '#64748b' }}>
                            {birthday.classroom}
                          </div>
                        </div>
                        <div style={{ fontSize: '12px', fontWeight: 500, color: birthday.days_until === 0 ? '#92400e' : '#64748b' }}>
                          {birthday.days_until === 0 ? 'Today!' : `In ${birthday.days_until} days`}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div style={{ marginTop: '12px' }}>
                    <Button
                      variant="secondary"
                      size="small"
                      onClick={() => navigate('/teacher/birthdays')}
                      style={{ width: '100%' }}
                    >
                      View All Birthdays
                    </Button>
                  </div>
                </div>
              </Card>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div style={{ marginTop: '32px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#0f172a', marginBottom: '16px' }}>
            Quick Actions
          </h2>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
            gap: '16px'
          }}>
            <Button onClick={() => navigate('/teacher/attendance')}>
              <CheckCircle size={16} style={{ marginRight: '8px' }} />
              Take Attendance
            </Button>
            <Button variant="secondary" onClick={() => navigate('/teacher/marks')}>
              <FileText size={16} style={{ marginRight: '8px' }} />
              Enter Marks
            </Button>
            <Button variant="secondary" onClick={() => navigate('/teacher/assignments')}>
              <BookOpen size={16} style={{ marginRight: '8px' }} />
              Assignments
            </Button>
            {classTeacherOf && (
              <Button variant="secondary" onClick={() => navigate('/teacher/class-overview')}>
                <Users size={16} style={{ marginRight: '8px' }} />
                Class Overview
              </Button>
            )}
            <Button variant="secondary" onClick={() => navigate('/teacher/birthdays')}>
              <Cake size={16} style={{ marginRight: '8px' }} />
              Birthdays
            </Button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .spin {
          animation: spin 1s linear infinite;
        }
      `}</style>
    </Layout>
  );
}
