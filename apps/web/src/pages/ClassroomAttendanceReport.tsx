/**
 * Classroom Attendance Report
 * Shows attendance summary for all students in a classroom
 * Used by class teachers to view their class's attendance
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Layout } from '../components/layout/Layout';
import { Card } from '../components/ui/Card';
import { Skeleton } from '../components/ui/Skeleton';
import { useAuth } from '../hooks/useAuth';
import { apiService } from '../services/api';
import { ArrowLeft, Users, TrendingUp, TrendingDown } from 'lucide-react';

export function ClassroomAttendanceReport() {
  const { classroomId } = useParams<{ classroomId: string }>();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  
  const [students, setStudents] = useState<any[]>([]);
  const [classroom, setClassroom] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (classroomId) {
      loadData();
    }
  }, [classroomId]);

  const loadData = async () => {
    if (!classroomId) return;
    
    try {
      setIsLoading(true);
      setError(null);
      
      const [reportRes, classroomRes] = await Promise.all([
        apiService.getClassroomAttendanceReport(classroomId),
        apiService.getClassroom(classroomId)
      ]);
      
      setStudents(reportRes.data || []);
      setClassroom(classroomRes.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load attendance report');
    } finally {
      setIsLoading(false);
    }
  };

  const getPercentageColor = (percentage: number) => {
    if (percentage >= 90) return '#16a34a';
    if (percentage >= 75) return '#eab308';
    return '#ef4444';
  };

  // Calculate class average
  const classAverage = students.length > 0
    ? students.reduce((sum, s) => sum + (s.percentage || 0), 0) / students.length
    : 0;

  // Count students by attendance tier
  const excellent = students.filter(s => s.percentage >= 90).length;
  const good = students.filter(s => s.percentage >= 75 && s.percentage < 90).length;
  const needsAttention = students.filter(s => s.percentage < 75).length;

  if (!user) return null;

  return (
    <Layout schoolName={'SMS'} principalName={user.loginId || 'Teacher'} onLogout={logout}>
      <div style={{ padding: '32px', maxWidth: '1400px', margin: '0 auto' }}>
        <div style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={() => navigate('/teacher/dashboard')}
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
              Class Attendance Report
            </h1>
            <p style={{ fontSize: '14px', color: '#64748b' }}>
              {classroom ? `${classroom.classroom_name || classroom.classroom_code}` : 'Loading...'}
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
              <p style={{ color: '#ef4444', marginBottom: '16px' }}>{error}</p>
              <button
                onClick={loadData}
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
            {/* Class Summary */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginBottom: '24px' }}>
              <Card>
                <div style={{ padding: '20px', textAlign: 'center' }}>
                  <div style={{ fontSize: '36px', fontWeight: 700, color: getPercentageColor(classAverage), marginBottom: '8px' }}>
                    {Math.round(classAverage)}%
                  </div>
                  <div style={{ fontSize: '14px', color: '#64748b', fontWeight: 500 }}>
                    Class Average
                  </div>
                </div>
              </Card>

              <Card>
                <div style={{ padding: '20px', textAlign: 'center' }}>
                  <div style={{ fontSize: '36px', fontWeight: 700, color: '#16a34a', marginBottom: '8px' }}>
                    {excellent}
                  </div>
                  <div style={{ fontSize: '14px', color: '#64748b', fontWeight: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                    <TrendingUp size={16} />
                    Excellent (≥90%)
                  </div>
                </div>
              </Card>

              <Card>
                <div style={{ padding: '20px', textAlign: 'center' }}>
                  <div style={{ fontSize: '36px', fontWeight: 700, color: '#eab308', marginBottom: '8px' }}>
                    {good}
                  </div>
                  <div style={{ fontSize: '14px', color: '#64748b', fontWeight: 500 }}>
                    Good (75-89%)
                  </div>
                </div>
              </Card>

              <Card>
                <div style={{ padding: '20px', textAlign: 'center' }}>
                  <div style={{ fontSize: '36px', fontWeight: 700, color: '#ef4444', marginBottom: '8px' }}>
                    {needsAttention}
                  </div>
                  <div style={{ fontSize: '14px', color: '#64748b', fontWeight: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                    <TrendingDown size={16} />
                    Needs Attention (&lt;75%)
                  </div>
                </div>
              </Card>
            </div>

            {/* Student List */}
            <Card>
              <div style={{ padding: '24px' }}>
                <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#0f172a', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Users size={20} />
                  Students ({students.length})
                </h2>

                {students.length === 0 ? (
                  <div style={{ padding: '48px', textAlign: 'center', color: '#64748b' }}>
                    <Users size={48} style={{ margin: '0 auto 16px', opacity: 0.3 }} />
                    <p>No students found in this class</p>
                  </div>
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ borderBottom: '2px solid #e2e8f0' }}>
                          <th style={{ padding: '12px', textAlign: 'left', fontSize: '13px', fontWeight: 600, color: '#64748b' }}>
                            Roll No.
                          </th>
                          <th style={{ padding: '12px', textAlign: 'left', fontSize: '13px', fontWeight: 600, color: '#64748b' }}>
                            Student Code
                          </th>
                          <th style={{ padding: '12px', textAlign: 'left', fontSize: '13px', fontWeight: 600, color: '#64748b' }}>
                            Name
                          </th>
                          <th style={{ padding: '12px', textAlign: 'center', fontSize: '13px', fontWeight: 600, color: '#64748b' }}>
                            Present
                          </th>
                          <th style={{ padding: '12px', textAlign: 'center', fontSize: '13px', fontWeight: 600, color: '#64748b' }}>
                            Absent
                          </th>
                          <th style={{ padding: '12px', textAlign: 'center', fontSize: '13px', fontWeight: 600, color: '#64748b' }}>
                            Total
                          </th>
                          <th style={{ padding: '12px', textAlign: 'center', fontSize: '13px', fontWeight: 600, color: '#64748b' }}>
                            Percentage
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {students.map((student, index) => {
                          const percentage = Math.round(student.percentage || 0);
                          const color = getPercentageColor(percentage);
                          
                          return (
                            <tr 
                              key={student.student_id}
                              style={{
                                borderBottom: '1px solid #f1f5f9',
                                background: index % 2 === 0 ? 'white' : '#f8fafc'
                              }}
                            >
                              <td style={{ padding: '16px', fontSize: '14px', color: '#64748b' }}>
                                {student.roll_number || '-'}
                              </td>
                              <td style={{ padding: '16px', fontSize: '14px', color: '#64748b', fontFamily: 'monospace' }}>
                                {student.student_code}
                              </td>
                              <td style={{ padding: '16px', fontSize: '14px', color: '#0f172a', fontWeight: 500 }}>
                                {student.student_name}
                              </td>
                              <td style={{ padding: '16px', textAlign: 'center', fontSize: '14px', color: '#16a34a', fontWeight: 600 }}>
                                {student.present}
                              </td>
                              <td style={{ padding: '16px', textAlign: 'center', fontSize: '14px', color: '#ef4444', fontWeight: 600 }}>
                                {student.absent}
                              </td>
                              <td style={{ padding: '16px', textAlign: 'center', fontSize: '14px', color: '#64748b', fontWeight: 600 }}>
                                {student.total_sessions}
                              </td>
                              <td style={{ padding: '16px', textAlign: 'center' }}>
                                <span style={{
                                  display: 'inline-block',
                                  padding: '6px 16px',
                                  background: `${color}15`,
                                  color,
                                  borderRadius: '6px',
                                  fontSize: '14px',
                                  fontWeight: 700
                                }}>
                                  {percentage}%
                                </span>
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
          </>
        )}
      </div>
    </Layout>
  );
}
