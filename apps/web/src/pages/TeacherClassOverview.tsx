/**
 * Teacher Class Overview Page
 * Read-only view for class teachers showing:
 * - Students × Subjects attendance matrix
 * - Students × Assessments marks matrix
 * Only visible to teachers who are class teachers of at least one classroom
 */

import { useState, useEffect } from 'react';
import { Layout } from '../components/layout/Layout';
import { Card } from '../components/ui/Card';
import { Skeleton } from '../components/ui/Skeleton';
import { ErrorState } from '../components/ui/ErrorState';
import { useAuth } from '../hooks/useAuth';
import { apiService } from '../services/api';
import { Users, TrendingUp, Calendar, Eye } from 'lucide-react';

interface TeachingAssignment {
  id: string;
  classroom_id: string;
  classroom_name?: string;
  is_class_teacher: boolean;
}

interface Student {
  id: string;
  full_name: string;
  roll_number?: string;
}

interface Subject {
  id: string;
  subject_name: string;
}

interface AttendanceSummary {
  student_id: string;
  subject_id: string;
  present: number;
  total: number;
  percentage: number;
}

interface MarksEntry {
  student_id: string;
  assessment_id: string;
  marks_obtained?: number;
  is_absent?: boolean;
  is_exempt?: boolean;
}

interface Assessment {
  id: string;
  name: string;
  subject_id: string;
  max_marks: number;
  status: string;
}

export function TeacherClassOverview() {
  const { user, logout } = useAuth();
  
  const [myClassrooms, setMyClassrooms] = useState<TeachingAssignment[]>([]);
  const [selectedClassroom, setSelectedClassroom] = useState<string>('');
  
  const [students, setStudents] = useState<Student[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [attendanceSummary, setAttendanceSummary] = useState<AttendanceSummary[]>([]);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [marksEntries, setMarksEntries] = useState<MarksEntry[]>([]);
  
  const [activeTab, setActiveTab] = useState<'attendance' | 'marks'>('attendance');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadClassrooms();
  }, []);

  useEffect(() => {
    if (selectedClassroom) {
      loadClassroomData();
    }
  }, [selectedClassroom, activeTab]);

  const loadClassrooms = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Get teaching assignments and filter class teacher classrooms
      const assignmentsResponse = await apiService.getMyTeaching();
      const assignments = assignmentsResponse.data || [];
      
      const classTeacherClassrooms = assignments.filter(
        (a: TeachingAssignment) => a.is_class_teacher
      );
      
      setMyClassrooms(classTeacherClassrooms);
      
      // Auto-select first classroom
      if (classTeacherClassrooms.length > 0 && !selectedClassroom) {
        setSelectedClassroom(classTeacherClassrooms[0].classroom_id);
      }
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load classrooms');
    } finally {
      setIsLoading(false);
    }
  };

  const loadClassroomData = async () => {
    if (!selectedClassroom) return;
    
    try {
      setIsLoading(true);
      setError(null);
      
      // Load students in classroom
      const enrollmentsResponse = await apiService.getEnrollments({
        classroom_id: selectedClassroom,
      });
      const enrollments = enrollmentsResponse.data || [];
      
      // Extract unique students
      const studentIds = Array.from(new Set(enrollments.map((e: any) => e.student_id)));
      const studentsData: Student[] = [];
      for (const studentId of studentIds) {
        try {
          const studentResponse = await apiService.getStudent(studentId);
          studentsData.push({
            id: studentId,
            full_name: studentResponse.data.full_name,
            roll_number: enrollments.find((e: any) => e.student_id === studentId)?.roll_number,
          });
        } catch (err) {
          console.error(`Failed to load student ${studentId}:`, err);
        }
      }
      setStudents(studentsData.sort((a, b) => (a.roll_number || '').localeCompare(b.roll_number || '')));
      
      if (activeTab === 'attendance') {
        // Load subjects taught in this classroom
        const assignmentsResponse = await apiService.getTeachingAssignments({
          classroom_id: selectedClassroom,
        });
        const classroomAssignments = assignmentsResponse.data || [];
        
        const subjectIds = Array.from(new Set(classroomAssignments.map((a: any) => a.subject_id)));
        const subjectsData: Subject[] = [];
        for (const subjectId of subjectIds) {
          try {
            const subjectResponse = await apiService.getSubject(subjectId);
            subjectsData.push({
              id: subjectId,
              subject_name: subjectResponse.data.subject_name,
            });
          } catch (err) {
            console.error(`Failed to load subject ${subjectId}:`, err);
          }
        }
        setSubjects(subjectsData);
        
        // Load attendance summary for each student-subject combination
        const summaries: AttendanceSummary[] = [];
        for (const student of studentsData) {
          try {
            const summaryResponse = await apiService.getStudentSubjectWiseAttendance(
              student.id,
              { classroom_id: selectedClassroom }
            );
            const studentSummaries = summaryResponse.data || [];
            summaries.push(...studentSummaries);
          } catch (err) {
            console.error(`Failed to load attendance for student ${student.id}:`, err);
          }
        }
        setAttendanceSummary(summaries);
        
      } else {
        // Load assessments for this classroom
        const assessmentsResponse = await apiService.getAssessments({
          classroom_id: selectedClassroom,
        });
        const assessmentsData = assessmentsResponse.data || [];
        setAssessments(assessmentsData.filter((a: Assessment) => a.status === 'published' || a.status === 'locked'));
        
        // Load marks entries
        const entries: MarksEntry[] = [];
        for (const assessment of assessmentsData) {
          try {
            const entriesResponse = await apiService.getMarksEntries({
              assessment_id: assessment.id,
            });
            entries.push(...(entriesResponse.data || []));
          } catch (err) {
            console.error(`Failed to load marks for assessment ${assessment.id}:`, err);
          }
        }
        setMarksEntries(entries);
      }
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load classroom data');
    } finally {
      setIsLoading(false);
    }
  };

  const getAttendancePercentage = (studentId: string, subjectId: string) => {
    const summary = attendanceSummary.find(
      s => s.student_id === studentId && s.subject_id === subjectId
    );
    return summary ? summary.percentage : null;
  };

  const getMarks = (studentId: string, assessmentId: string) => {
    const entry = marksEntries.find(
      e => e.student_id === studentId && e.assessment_id === assessmentId
    );
    if (!entry) return '-';
    if (entry.is_absent) return 'AB';
    if (entry.is_exempt) return 'EX';
    return entry.marks_obtained ?? '-';
  };

  const getAttendanceColor = (percentage: number | null) => {
    if (percentage === null) return '#94a3b8';
    if (percentage >= 90) return '#22c55e';
    if (percentage >= 75) return '#eab308';
    return '#ef4444';
  };

  if (!user) return null;

  // If not a class teacher, show message
  if (!isLoading && myClassrooms.length === 0) {
    return (
      <Layout 
        schoolName={'SMS'} 
        principalName={user.loginId || 'Teacher'} 
        onLogout={logout}
        role="teacher"
        isClassTeacher={false}
      >
        <div style={{ padding: '32px' }}>
          <Card>
            <div style={{ padding: '48px', textAlign: 'center' }}>
              <Users size={48} style={{ color: '#cbd5e1', marginBottom: '16px' }} />
              <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#0f172a', marginBottom: '8px' }}>
                Class Overview Not Available
              </h3>
              <p style={{ fontSize: '14px', color: '#64748b' }}>
                This view is only available for class teachers. You are not currently assigned as a class teacher for any classroom.
              </p>
            </div>
          </Card>
        </div>
      </Layout>
    );
  }

  return (
    <Layout 
      schoolName={'SMS'} 
      principalName={user.loginId || 'Teacher'} 
      onLogout={logout}
      role="teacher"
      isClassTeacher={myClassrooms.length > 0}
    >
      <div style={{ padding: '32px' }}>
        <div style={{ marginBottom: '24px' }}>
          <h1 style={{ fontSize: '28px', fontWeight: 600, color: '#0f172a', marginBottom: '8px' }}>
            Class Overview
          </h1>
          <p style={{ fontSize: '14px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Eye size={14} />
            Read-only view of all subjects in your class. You can only edit attendance and marks for subjects you teach.
          </p>
        </div>

        {/* Classroom Selector */}
        {myClassrooms.length > 1 && (
          <Card>
            <div style={{ padding: '16px', marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#0f172a', marginBottom: '8px' }}>
                Select Classroom
              </label>
              <select
                value={selectedClassroom}
                onChange={(e) => setSelectedClassroom(e.target.value)}
                style={{
                  width: '100%',
                  maxWidth: '300px',
                  padding: '8px 12px',
                  border: '1px solid #e2e8f0',
                  borderRadius: '6px',
                  fontSize: '14px',
                }}
              >
                {myClassrooms.map((classroom) => (
                  <option key={classroom.classroom_id} value={classroom.classroom_id}>
                    {classroom.classroom_name || classroom.classroom_id}
                  </option>
                ))}
              </select>
            </div>
          </Card>
        )}

        {/* Tabs */}
        <div style={{ marginBottom: '24px', display: 'flex', gap: '16px', borderBottom: '2px solid #e2e8f0' }}>
          <button
            onClick={() => setActiveTab('attendance')}
            style={{
              padding: '12px 24px',
              border: 'none',
              background: 'transparent',
              fontSize: '14px',
              fontWeight: 600,
              color: activeTab === 'attendance' ? '#3b82f6' : '#64748b',
              borderBottom: activeTab === 'attendance' ? '2px solid #3b82f6' : 'none',
              marginBottom: '-2px',
              cursor: 'pointer',
            }}
          >
            <Calendar size={16} style={{ display: 'inline', marginRight: '8px', verticalAlign: 'middle' }} />
            Attendance Matrix
          </button>
          <button
            onClick={() => setActiveTab('marks')}
            style={{
              padding: '12px 24px',
              border: 'none',
              background: 'transparent',
              fontSize: '14px',
              fontWeight: 600,
              color: activeTab === 'marks' ? '#3b82f6' : '#64748b',
              borderBottom: activeTab === 'marks' ? '2px solid #3b82f6' : 'none',
              marginBottom: '-2px',
              cursor: 'pointer',
            }}
          >
            <TrendingUp size={16} style={{ display: 'inline', marginRight: '8px', verticalAlign: 'middle' }} />
            Marks Matrix
          </button>
        </div>

        {isLoading && (
          <Card>
            <div style={{ padding: '24px' }}>
              <Skeleton height="200px" />
            </div>
          </Card>
        )}

        {error && !isLoading && (
          <Card>
            <div style={{ padding: '24px' }}>
              <ErrorState message={error} onRetry={loadClassroomData} />
            </div>
          </Card>
        )}

        {!isLoading && !error && selectedClassroom && (
          <Card>
            <div style={{ padding: '24px', overflowX: 'auto' }}>
              {activeTab === 'attendance' && (
                <>
                  <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#0f172a', marginBottom: '8px' }}>
                    Attendance Percentage by Subject
                  </h2>
                  <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '16px' }}>
                    ℹ️ This is a read-only view. To mark attendance, go to the Attendance page.
                  </p>
                  
                  {students.length === 0 || subjects.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '32px', color: '#64748b' }}>
                      No data available
                    </div>
                  ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                      <thead>
                        <tr style={{ borderBottom: '2px solid #e2e8f0' }}>
                          <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600, color: '#0f172a', minWidth: '150px' }}>
                            Student
                          </th>
                          <th style={{ padding: '12px', textAlign: 'center', fontWeight: 600, color: '#0f172a', minWidth: '80px' }}>
                            Roll No.
                          </th>
                          {subjects.map((subject) => (
                            <th key={subject.id} style={{ padding: '12px', textAlign: 'center', fontWeight: 600, color: '#0f172a', minWidth: '120px' }}>
                              {subject.subject_name}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {students.map((student) => (
                          <tr key={student.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '12px', color: '#0f172a' }}>
                              {student.full_name}
                            </td>
                            <td style={{ padding: '12px', textAlign: 'center', color: '#64748b' }}>
                              {student.roll_number || '-'}
                            </td>
                            {subjects.map((subject) => {
                              const percentage = getAttendancePercentage(student.id, subject.id);
                              return (
                                <td key={subject.id} style={{ padding: '12px', textAlign: 'center' }}>
                                  {percentage !== null ? (
                                    <span style={{
                                      padding: '4px 8px',
                                      borderRadius: '4px',
                                      fontWeight: 600,
                                      color: getAttendanceColor(percentage),
                                      background: `${getAttendanceColor(percentage)}15`,
                                    }}>
                                      {percentage.toFixed(1)}%
                                    </span>
                                  ) : (
                                    <span style={{ color: '#cbd5e1' }}>-</span>
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </>
              )}

              {activeTab === 'marks' && (
                <>
                  <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#0f172a', marginBottom: '8px' }}>
                    Marks by Assessment
                  </h2>
                  <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '16px' }}>
                    ℹ️ This is a read-only view. To enter marks, go to the Marks page.
                  </p>
                  
                  {students.length === 0 || assessments.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '32px', color: '#64748b' }}>
                      No published assessments or students found
                    </div>
                  ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                      <thead>
                        <tr style={{ borderBottom: '2px solid #e2e8f0' }}>
                          <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600, color: '#0f172a', minWidth: '150px' }}>
                            Student
                          </th>
                          <th style={{ padding: '12px', textAlign: 'center', fontWeight: 600, color: '#0f172a', minWidth: '80px' }}>
                            Roll No.
                          </th>
                          {assessments.map((assessment) => (
                            <th key={assessment.id} style={{ padding: '12px', textAlign: 'center', fontWeight: 600, color: '#0f172a', minWidth: '120px' }}>
                              <div>{assessment.name}</div>
                              <div style={{ fontSize: '12px', fontWeight: 400, color: '#64748b' }}>
                                (Max: {assessment.max_marks})
                              </div>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {students.map((student) => (
                          <tr key={student.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '12px', color: '#0f172a' }}>
                              {student.full_name}
                            </td>
                            <td style={{ padding: '12px', textAlign: 'center', color: '#64748b' }}>
                              {student.roll_number || '-'}
                            </td>
                            {assessments.map((assessment) => {
                              const marks = getMarks(student.id, assessment.id);
                              return (
                                <td key={assessment.id} style={{ padding: '12px', textAlign: 'center', color: '#0f172a', fontWeight: 500 }}>
                                  {marks}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </>
              )}
            </div>
          </Card>
        )}
      </div>
    </Layout>
  );
}
