/**
 * Teacher Dashboard - Main dashboard for teacher role
 * Shows: Today's classes, My teaching assignments, Attendance, Marks
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../components/layout/Layout';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { useAuth } from '../hooks/useAuth';
import { apiService } from '../services/api';
import { 
  BookOpen, 
  Calendar, 
  Users, 
  CheckCircle, 
  AlertCircle,
  FileText
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
  classroom_name: string;
  subject_name: string;
  period?: string;
  hasAttendance: boolean;
}

export function TeacherDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  
  const [teachings, setTeachings] = useState<TeachingAssignment[]>([]);
  const [todayClasses, setTodayClasses] = useState<TodayClass[]>([]);
  const [classTeacherOf, setClassTeacherOf] = useState<TeachingAssignment | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Load teacher's teaching assignments
      const teachingsRes = await apiService.getMyTeaching();
      const assignments = teachingsRes.data || [];
      setTeachings(assignments);

      // Find if teacher is a class teacher
      const classTeacher = assignments.find((t: TeachingAssignment) => t.is_class_teacher);
      setClassTeacherOf(classTeacher || null);

      // TODO: Load today's attendance status
      // For now, mock today's classes from teachings
      const today = assignments.map((a: TeachingAssignment) => ({
        classroom_name: a.classroom_name || a.classroom_code || 'Unknown',
        subject_name: a.subject_name || 'Unknown Subject',
        hasAttendance: false // Will be checked against actual attendance records
      }));
      setTodayClasses(today);

    } catch (err) {
      console.error('Failed to load dashboard:', err);
      setError(err instanceof Error ? err.message : 'Failed to load dashboard');
    } finally {
      setIsLoading(false);
    }
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
        <div style={{ padding: '32px', textAlign: 'center' }}>
          <div>Loading...</div>
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
        <div style={{ marginBottom: '32px' }}>
          <h1 style={{ fontSize: '28px', fontWeight: 600, color: '#0f172a', marginBottom: '8px' }}>
            Welcome back, {user.loginId.split('_')[0] || 'Teacher'}!
          </h1>
          <p style={{ fontSize: '14px', color: '#64748b' }}>
            {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>

        {error && (
          <Card>
            <div style={{ padding: '16px', background: '#fee2e2', color: '#dc2626' }}>
              {error}
            </div>
          </Card>
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
                <div style={{ padding: '12px', background: '#fee2e2', borderRadius: '8px' }}>
                  <AlertCircle size={24} style={{ color: '#dc2626' }} />
                </div>
                <div>
                  <div style={{ fontSize: '24px', fontWeight: 700, color: '#0f172a' }}>
                    {pendingAttendance}
                  </div>
                  <div style={{ fontSize: '14px', color: '#64748b' }}>
                    Pending Attendance
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {classTeacherOf && (
            <Card>
              <div style={{ padding: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ padding: '12px', background: '#dcfce7', borderRadius: '8px' }}>
                      <Users size={24} style={{ color: '#16a34a' }} />
                    </div>
                    <div>
                      <div style={{ fontSize: '16px', fontWeight: 600, color: '#0f172a' }}>
                        Class Teacher
                      </div>
                      <div style={{ fontSize: '14px', color: '#64748b' }}>
                        {classTeacherOf.classroom_name || classTeacherOf.classroom_code}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => navigate(`/teacher/classroom/${classTeacherOf.classroom_id}/attendance`)}
                      style={{
                        padding: '8px 16px',
                        background: '#16a34a',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: 500,
                      }}
                    >
                      Attendance
                    </button>
                    <button
                      onClick={() => navigate(`/teacher/classroom/${classTeacherOf.classroom_id}/marks`)}
                      style={{
                        padding: '8px 16px',
                        background: '#2563eb',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: 500,
                      }}
                    >
                      Marks Report
                    </button>
                  </div>
                </div>
              </div>
            </Card>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px' }}>
          {/* Today's Classes */}
          <Card>
            <div style={{ padding: '24px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#0f172a', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Calendar size={20} />
                Today's Classes
              </h2>

              {todayClasses.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '32px', color: '#64748b' }}>
                  No classes scheduled for today
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {todayClasses.slice(0, 5).map((cls, idx) => (
                    <div
                      key={idx}
                      style={{
                        padding: '12px',
                        border: '1px solid #e2e8f0',
                        borderRadius: '6px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 500, color: '#0f172a' }}>
                          {cls.classroom_name}
                        </div>
                        <div style={{ fontSize: '13px', color: '#64748b' }}>
                          {cls.subject_name}
                        </div>
                      </div>
                      {cls.hasAttendance ? (
                        <CheckCircle size={20} style={{ color: '#16a34a' }} />
                      ) : (
                        <Button
                          size="small"
                          onClick={() => navigate('/teacher/attendance')}
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

          {/* My Teaching */}
          <Card>
            <div style={{ padding: '24px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#0f172a', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <BookOpen size={20} />
                My Teaching
              </h2>

              {teachings.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '32px', color: '#64748b' }}>
                  No teaching assignments yet
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
                        cursor: 'pointer',
                        transition: 'background 0.2s',
                      }}
                      onClick={() => navigate(`/teacher/teaching/${teaching.id}`)}
                      onMouseEnter={(e) => e.currentTarget.style.background = '#f8fafc'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
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

              <div style={{ marginTop: '16px' }}>
                <Button
                  variant="secondary"
                  onClick={() => navigate('/teacher/teaching')}
                  style={{ width: '100%' }}
                >
                  View All Teachings
                </Button>
              </div>
            </div>
          </Card>
        </div>

        {/* Quick Actions */}
        <div style={{ marginTop: '32px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#0f172a', marginBottom: '16px' }}>
            Quick Actions
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
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
          </div>
        </div>
      </div>
    </Layout>
  );
}
