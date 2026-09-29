/**
 * Teacher Attendance Page
 * Shows attendance sessions filtered by teacher's assignments
 * - My Subjects: Full edit access for subjects the teacher teaches
 * - Other Subjects (Class Teacher): Read-only access to all subjects in their class
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
import { ClipboardCheck, Plus, Calendar, Eye, Edit2, Users } from 'lucide-react';

interface TeachingAssignment {
  id: string;
  academic_year_id: string;
  teacher_id: string;
  classroom_id: string;
  subject_id: string;
  classroom_name?: string;
  subject_name?: string;
  is_class_teacher: boolean;
}

interface AttendanceSession {
  id: string;
  academic_year_id: string;
  classroom_id: string;
  subject_id: string;
  session_date: string;
  period_no: number;
  status: 'open' | 'submitted' | 'locked';
  classroom_name?: string;
  subject_name?: string;
  present_count?: number;
  total_students?: number;
}

export function TeacherAttendance() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  
  const [myAssignments, setMyAssignments] = useState<TeachingAssignment[]>([]);
  const [mySessions, setMySessions] = useState<AttendanceSession[]>([]);
  const [classTeacherSessions, setClassTeacherSessions] = useState<AttendanceSession[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [selectedSubject, setSelectedSubject] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('today');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Get teaching assignments
      const assignmentsResponse = await apiService.getMyTeaching();
      const assignments = assignmentsResponse.data || [];
      setMyAssignments(assignments);
      
      // Get classroom IDs where teacher is class teacher
      const classTeacherClassrooms = assignments
        .filter((a: TeachingAssignment) => a.is_class_teacher)
        .map((a: TeachingAssignment) => a.classroom_id);
      
      // Get all attendance sessions
      const today = new Date().toISOString().split('T')[0];
      const sessionsResponse = await apiService.getAttendanceSessions({
        from_date: dateFilter === 'today' ? today : undefined,
        to_date: dateFilter === 'today' ? today : undefined,
      });
      
      const allSessions = sessionsResponse.data || [];
      
      // Filter sessions into "My Subjects" and "Other Subjects (Class Teacher)"
      const mySubjectIds = assignments.map((a: TeachingAssignment) => 
        `${a.classroom_id}:${a.subject_id}`
      );
      
      const mySessions = allSessions.filter((s: AttendanceSession) => 
        mySubjectIds.includes(`${s.classroom_id}:${s.subject_id}`)
      );
      
      const classTeacherSessions = allSessions.filter((s: AttendanceSession) =>
        classTeacherClassrooms.includes(s.classroom_id) &&
        !mySubjectIds.includes(`${s.classroom_id}:${s.subject_id}`)
      );
      
      setMySessions(mySessions);
      setClassTeacherSessions(classTeacherSessions);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load attendance data');
    } finally {
      setIsLoading(false);
    }
  };

  const filterSessions = (sessions: AttendanceSession[]) => {
    if (selectedSubject === 'all') return sessions;
    return sessions.filter(s => s.subject_id === selectedSubject);
  };

  const renderSessionCard = (session: AttendanceSession, editable: boolean) => (
    <div
      key={session.id}
      style={{
        padding: '16px',
        border: '1px solid #e2e8f0',
        borderRadius: '8px',
        cursor: 'pointer',
        opacity: editable ? 1 : 0.85,
        background: editable ? 'white' : '#f8fafc',
      }}
      onClick={() => navigate(`/teacher/attendance/${session.id}`)}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '8px' }}>
        <div>
          <div style={{ fontWeight: 600, color: '#0f172a', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            {session.classroom_name} - {session.subject_name}
            {editable ? (
              <Edit2 size={14} style={{ color: '#3b82f6' }} />
            ) : (
              <Eye size={14} style={{ color: '#64748b' }} />
            )}
          </div>
          <div style={{ fontSize: '14px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Calendar size={14} />
            {new Date(session.session_date).toLocaleDateString()}
            <span>•</span>
            Period {session.period_no}
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
  );

  if (!user) return null;

  const filteredMySessions = filterSessions(mySessions);
  const filteredClassTeacherSessions = filterSessions(classTeacherSessions);
  const hasClassTeacherRole = myAssignments.some(a => a.is_class_teacher);

  return (
    <Layout
      schoolName={'SMS'}
      principalName={user.loginId || 'Teacher'}
      onLogout={logout}
      role="teacher"
      isClassTeacher={hasClassTeacherRole}
    >
      <div style={{ padding: '32px' }}>
        <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ fontSize: '28px', fontWeight: 600, color: '#0f172a', marginBottom: '8px' }}>
              Attendance
            </h1>
            <p style={{ fontSize: '14px', color: '#64748b' }}>
              {hasClassTeacherRole 
                ? 'Mark attendance for your subjects and view attendance for all subjects in your class' 
                : 'Take and view attendance for your assigned subjects'}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <Button variant="secondary" onClick={() => navigate('/teacher/attendance/students')}>
              <Users size={16} style={{ marginRight: '8px' }} />
              Student Attendance
            </Button>
            <Button onClick={() => navigate('/teacher/attendance/new')}>
              <Plus size={16} style={{ marginRight: '8px' }} />
              New Session
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <div style={{ padding: '16px', display: 'flex', gap: '16px', flexWrap: 'wrap', marginBottom: '24px' }}>
            <div style={{ flex: '1 1 200px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#0f172a', marginBottom: '8px' }}>
                Subject Filter
              </label>
              <select
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #e2e8f0',
                  borderRadius: '6px',
                  fontSize: '14px',
                }}
              >
                <option value="all">All Subjects</option>
                {Array.from(new Set(myAssignments.map(a => a.subject_id))).map(subjectId => {
                  const assignment = myAssignments.find(a => a.subject_id === subjectId);
                  return (
                    <option key={subjectId} value={subjectId}>
                      {assignment?.subject_name || subjectId}
                    </option>
                  );
                })}
              </select>
            </div>
            
            <div style={{ flex: '1 1 200px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#0f172a', marginBottom: '8px' }}>
                Date Range
              </label>
              <select
                value={dateFilter}
                onChange={(e) => {
                  setDateFilter(e.target.value);
                  loadData();
                }}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #e2e8f0',
                  borderRadius: '6px',
                  fontSize: '14px',
                }}
              >
                <option value="today">Today</option>
                <option value="week">This Week</option>
                <option value="month">This Month</option>
                <option value="all">All Time</option>
              </select>
            </div>
          </div>
        </Card>

        {isLoading && (
          <Card>
            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {[1, 2, 3].map((i) => <Skeleton key={i} height="80px" />)}
            </div>
          </Card>
        )}

        {error && !isLoading && (
          <Card>
            <div style={{ padding: '24px' }}>
              <ErrorState message={error} onRetry={loadData} />
            </div>
          </Card>
        )}

        {!isLoading && !error && (
          <>
            {/* My Subjects Section */}
            <Card>
              <div style={{ padding: '24px', marginBottom: hasClassTeacherRole ? '24px' : '0' }}>
                <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#0f172a', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Edit2 size={18} style={{ color: '#3b82f6' }} />
                  My Subjects
                  <span style={{ fontSize: '14px', fontWeight: 400, color: '#64748b' }}>
                    (Can mark & edit attendance)
                  </span>
                </h2>

                {filteredMySessions.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '48px 24px' }}>
                    <ClipboardCheck size={48} style={{ color: '#cbd5e1', marginBottom: '16px' }} />
                    <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#0f172a', marginBottom: '8px' }}>
                      No attendance sessions
                    </h3>
                    <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '24px' }}>
                      Create an attendance session to start marking attendance
                    </p>
                    <Button onClick={() => navigate('/teacher/attendance/new')}>
                      Create Session
                    </Button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {filteredMySessions.map((session) => renderSessionCard(session, true))}
                  </div>
                )}
              </div>
            </Card>

            {/* Class Teacher Section - Only show if user is class teacher */}
            {hasClassTeacherRole && (
              <Card>
                <div style={{ padding: '24px' }}>
                  <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#0f172a', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Eye size={18} style={{ color: '#64748b' }} />
                    Other Subjects in My Class
                    <span style={{ fontSize: '14px', fontWeight: 400, color: '#64748b' }}>
                      (View only - Cannot edit)
                    </span>
                  </h2>

                  {filteredClassTeacherSessions.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '32px 24px' }}>
                      <p style={{ fontSize: '14px', color: '#64748b' }}>
                        No other subject sessions found for your class
                      </p>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {filteredClassTeacherSessions.map((session) => renderSessionCard(session, false))}
                    </div>
                  )}
                </div>
              </Card>
            )}
          </>
        )}
      </div>
    </Layout>
  );
}
