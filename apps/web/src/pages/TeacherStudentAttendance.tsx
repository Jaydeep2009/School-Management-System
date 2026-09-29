/**
 * Teacher Student Attendance View
 * Shows:
 * - For subject teachers: Student-wise attendance % for their subject
 * - For class teachers: All subjects' attendance for class students (read-only)
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
import { ArrowLeft, Users, TrendingUp, TrendingDown } from 'lucide-react';

interface TeachingAssignment {
  id: string;
  classroom_id: string;
  subject_id: string;
  classroom_name?: string;
  subject_name?: string;
  is_class_teacher: boolean;
}

interface StudentAttendance {
  student_id: string;
  student_name: string;
  roll_number?: string;
  present_count: number;
  total_sessions: number;
  percentage: number;
}

export function TeacherStudentAttendance() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  
  const [teachingAssignments, setTeachingAssignments] = useState<TeachingAssignment[]>([]);
  const [selectedAssignment, setSelectedAssignment] = useState<string>('');
  const [studentAttendance, setStudentAttendance] = useState<StudentAttendance[]>([]);
  const [classTeacherView, setClassTeacherView] = useState<any[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'my-subject' | 'all-subjects'>('my-subject');

  useEffect(() => {
    loadTeachingAssignments();
  }, []);

  useEffect(() => {
    if (selectedAssignment) {
      loadAttendanceData();
    }
  }, [selectedAssignment, viewMode]);

  const loadTeachingAssignments = async () => {
    try {
      setIsLoading(true);
      const response = await apiService.getMyTeaching();
      const assignments = response.data || [];
      setTeachingAssignments(assignments);
      
      // Auto-select first assignment
      if (assignments.length > 0) {
        setSelectedAssignment(`${assignments[0].classroom_id}:${assignments[0].subject_id}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load assignments');
    } finally {
      setIsLoading(false);
    }
  };

  const loadAttendanceData = async () => {
    if (!selectedAssignment) return;
    
    const [classroom_id, subject_id] = selectedAssignment.split(':');
    
    try {
      setIsLoading(true);
      setError(null);
      
      if (viewMode === 'my-subject') {
        // Load attendance for this specific subject
        const response = await apiService.getClassroomAttendanceReport(classroom_id, { subject_id });
        const students = response.data || [];
        setStudentAttendance(students);
      } else {
        // Load all subjects' attendance for class students (class teacher view)
        const enrollmentsRes = await apiService.getEnrollments({ classroom_id });
        const students = enrollmentsRes.data || [];
        
        // For each student, get their subject-wise attendance
        const studentData = await Promise.all(
          students.map(async (student: any) => {
            try {
              const subjectWiseRes = await apiService.getStudentSubjectWiseAttendance(student.student_id);
              return {
                student_id: student.student_id,
                student_name: student.student_name,
                roll_number: student.roll_number,
                subjects: subjectWiseRes.data || [],
              };
            } catch (err) {
              return {
                student_id: student.student_id,
                student_name: student.student_name,
                roll_number: student.roll_number,
                subjects: [],
              };
            }
          })
        );
        
        setClassTeacherView(studentData);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load attendance data');
    } finally {
      setIsLoading(false);
    }
  };

  const getAttendanceColor = (percentage: number) => {
    if (percentage >= 90) return { bg: '#dcfce7', text: '#166534' };
    if (percentage >= 75) return { bg: '#fef3c7', text: '#92400e' };
    return { bg: '#fee2e2', text: '#991b1b' };
  };

  if (!user) return null;

  const currentAssignment = teachingAssignments.find(
    a => `${a.classroom_id}:${a.subject_id}` === selectedAssignment
  );
  
  const isClassTeacher = currentAssignment?.is_class_teacher || false;

  if (isLoading && teachingAssignments.length === 0) {
    return (
      <Layout schoolName={'SMS'} principalName={user.loginId || 'Teacher'} onLogout={logout} role="teacher">
        <div style={{ padding: '32px' }}>
          <Skeleton height="300px" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout schoolName={'SMS'} principalName={user.loginId || 'Teacher'} onLogout={logout} role="teacher">
      <div style={{ padding: '32px' }}>
        {/* Header */}
        <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Button variant="secondary" onClick={() => navigate('/teacher/attendance')}>
              <ArrowLeft size={16} />
            </Button>
            <div>
              <h1 style={{ fontSize: '28px', fontWeight: 600, color: '#0f172a', marginBottom: '8px' }}>
                Student Attendance
              </h1>
              <p style={{ fontSize: '14px', color: '#64748b' }}>
                View attendance statistics for your students
              </p>
            </div>
          </div>
        </div>

        {teachingAssignments.length === 0 ? (
          <Card>
            <div style={{ padding: '48px', textAlign: 'center' }}>
              <Users size={48} style={{ color: '#64748b', margin: '0 auto 16px' }} />
              <p style={{ fontSize: '16px', color: '#64748b' }}>
                You don't have any teaching assignments yet.
              </p>
            </div>
          </Card>
        ) : (
          <>
            {/* Filters */}
            <Card>
              <div style={{ padding: '16px', display: 'flex', gap: '16px', alignItems: 'end', marginBottom: '24px', flexWrap: 'wrap' }}>
                <div style={{ flex: '1 1 300px' }}>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#0f172a', marginBottom: '8px' }}>
                    Class & Subject
                  </label>
                  <select
                    value={selectedAssignment}
                    onChange={(e) => setSelectedAssignment(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      fontSize: '14px',
                      border: '1px solid #e2e8f0',
                      borderRadius: '6px',
                    }}
                  >
                    {teachingAssignments.map(assignment => (
                      <option 
                        key={assignment.id} 
                        value={`${assignment.classroom_id}:${assignment.subject_id}`}
                      >
                        {assignment.classroom_name} - {assignment.subject_name}
                        {assignment.is_class_teacher ? ' (Class Teacher)' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {isClassTeacher && (
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <Button
                      variant={viewMode === 'my-subject' ? 'primary' : 'secondary'}
                      onClick={() => setViewMode('my-subject')}
                    >
                      My Subject Only
                    </Button>
                    <Button
                      variant={viewMode === 'all-subjects' ? 'primary' : 'secondary'}
                      onClick={() => setViewMode('all-subjects')}
                    >
                      All Subjects
                    </Button>
                  </div>
                )}
              </div>
            </Card>

            {/* Attendance Data */}
            {isLoading ? (
              <Skeleton height="400px" />
            ) : error ? (
              <ErrorState message={error} onRetry={loadAttendanceData} />
            ) : viewMode === 'my-subject' ? (
              <div style={{ marginTop: '24px' }}>
                <Card>
                <div style={{ padding: '24px' }}>
                  <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#0f172a', marginBottom: '16px' }}>
                    {currentAssignment?.subject_name} - Student Attendance
                  </h2>
                  
                  {studentAttendance.length === 0 ? (
                    <div style={{ padding: '48px', textAlign: 'center', color: '#64748b' }}>
                      <p>No attendance data available</p>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {studentAttendance.map((student) => {
                        const colors = getAttendanceColor(student.percentage);
                        
                        return (
                          <div
                            key={student.student_id}
                            style={{
                              padding: '16px',
                              border: '1px solid #e2e8f0',
                              borderRadius: '8px',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                            }}
                          >
                            <div>
                              <div style={{ fontWeight: 600, color: '#0f172a', marginBottom: '4px' }}>
                                {student.student_name}
                              </div>
                              {student.roll_number && (
                                <div style={{ fontSize: '14px', color: '#64748b' }}>
                                  Roll: {student.roll_number}
                                </div>
                              )}
                            </div>
                            
                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                              <div style={{ textAlign: 'right' }}>
                                <div style={{ fontSize: '14px', color: '#64748b' }}>
                                  {student.present_count} / {student.total_sessions} sessions
                                </div>
                              </div>
                              
                              <div style={{
                                padding: '8px 16px',
                                borderRadius: '6px',
                                background: colors.bg,
                                color: colors.text,
                                fontWeight: 600,
                                fontSize: '16px',
                                minWidth: '80px',
                                textAlign: 'center',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                              }}>
                                {student.percentage >= 90 ? <TrendingUp size={16} /> : 
                                 student.percentage < 75 ? <TrendingDown size={16} /> : null}
                                {student.percentage.toFixed(1)}%
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </Card>
              </div>
            ) : (
              <div style={{ marginTop: '24px' }}>
                <Card>
                <div style={{ padding: '24px' }}>
                  <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#0f172a' }}>
                      All Subjects - Class Attendance (Read Only)
                    </h2>
                    <span style={{ fontSize: '14px', color: '#64748b', fontStyle: 'italic' }}>
                      View only - cannot modify
                    </span>
                  </div>
                  
                  {classTeacherView.length === 0 ? (
                    <div style={{ padding: '48px', textAlign: 'center', color: '#64748b' }}>
                      <p>No students enrolled in this class</p>
                    </div>
                  ) : (
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                          <tr style={{ borderBottom: '2px solid #e2e8f0' }}>
                            <th style={{ padding: '12px', textAlign: 'left', fontSize: '14px', fontWeight: 600, color: '#64748b' }}>
                              Student
                            </th>
                            <th style={{ padding: '12px', textAlign: 'left', fontSize: '14px', fontWeight: 600, color: '#64748b' }}>
                              Roll No.
                            </th>
                            {classTeacherView[0]?.subjects.map((subject: any) => (
                              <th key={subject.subject_id} style={{ padding: '12px', textAlign: 'center', fontSize: '14px', fontWeight: 600, color: '#64748b' }}>
                                {subject.subject_name}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {classTeacherView.map((student) => (
                            <tr key={student.student_id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                              <td style={{ padding: '12px', fontWeight: 500, color: '#0f172a' }}>
                                {student.student_name}
                              </td>
                              <td style={{ padding: '12px', fontSize: '14px', color: '#64748b' }}>
                                {student.roll_number || '—'}
                              </td>
                              {student.subjects.map((subject: any) => {
                                const colors = getAttendanceColor(subject.percentage);
                                return (
                                  <td key={subject.subject_id} style={{ padding: '12px', textAlign: 'center' }}>
                                    <div style={{
                                      display: 'inline-block',
                                      padding: '4px 12px',
                                      borderRadius: '6px',
                                      background: colors.bg,
                                      color: colors.text,
                                      fontWeight: 500,
                                      fontSize: '14px',
                                    }}>
                                      {subject.percentage.toFixed(1)}%
                                    </div>
                                    <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                                      {subject.present_count}/{subject.total_sessions}
                                    </div>
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </Card>
              </div>
            )}
          </>
        )}
      </div>
    </Layout>
  );
}
