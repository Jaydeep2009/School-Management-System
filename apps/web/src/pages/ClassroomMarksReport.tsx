/**
 * Classroom Marks Report
 * Shows marks summary for all students in a classroom across all subjects
 * Used by principals and class teachers
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Layout } from '../components/layout/Layout';
import { Card } from '../components/ui/Card';
import { Skeleton } from '../components/ui/Skeleton';
import { useAuth } from '../hooks/useAuth';
import { apiService } from '../services/api';
import { ArrowLeft, TrendingUp, TrendingDown, Award } from 'lucide-react';

export function ClassroomMarksReport() {
  const { classroomId } = useParams<{ classroomId: string }>();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  
  const [report, setReport] = useState<any[]>([]);
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
      
      // Only load marks report, skip classroom details for now
      const reportRes = await apiService.getClassroomMarksReport(classroomId);
      
      setReport(reportRes.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load marks report');
    } finally {
      setIsLoading(false);
    }
  };

  const getPercentageColor = (percentage: number) => {
    if (percentage >= 75) return '#16a34a';
    if (percentage >= 60) return '#eab308';
    if (percentage >= 40) return '#f59e0b';
    return '#ef4444';
  };

  const getGrade = (percentage: number) => {
    if (percentage >= 90) return 'A+';
    if (percentage >= 80) return 'A';
    if (percentage >= 70) return 'B+';
    if (percentage >= 60) return 'B';
    if (percentage >= 50) return 'C+';
    if (percentage >= 40) return 'C';
    if (percentage >= 33) return 'D';
    return 'F';
  };

  if (!user) return null;

  // Calculate class statistics
  const classAverage = report.length > 0
    ? report.reduce((sum, s) => sum + (s.percentage || 0), 0) / report.length
    : 0;

  const topPerformers = report.filter(s => s.percentage >= 75).length;
  const needsAttention = report.filter(s => s.percentage < 40).length;

  return (
    <Layout schoolName={'SMS'} principalName={user.loginId || 'User'} onLogout={logout} role={user.role}>
      <div style={{ padding: '32px', maxWidth: '1400px', margin: '0 auto' }}>
        <div style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={() => navigate(user.role === 'principal' ? '/dashboard' : '/teacher/dashboard')}
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
              Classroom Marks Report
            </h1>
            <p style={{ fontSize: '14px', color: '#64748b' }}>
              View student performance and marks
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
                  <div style={{ fontSize: '18px', fontWeight: 600, color: '#64748b', marginTop: '4px' }}>
                    {getGrade(classAverage)}
                  </div>
                </div>
              </Card>

              <Card>
                <div style={{ padding: '20px', textAlign: 'center' }}>
                  <div style={{ fontSize: '36px', fontWeight: 700, color: '#16a34a', marginBottom: '8px' }}>
                    {topPerformers}
                  </div>
                  <div style={{ fontSize: '14px', color: '#64748b', fontWeight: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                    <TrendingUp size={16} />
                    Top Performers (≥75%)
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
                    Needs Attention (&lt;40%)
                  </div>
                </div>
              </Card>

              <Card>
                <div style={{ padding: '20px', textAlign: 'center' }}>
                  <div style={{ fontSize: '36px', fontWeight: 700, color: '#0f172a', marginBottom: '8px' }}>
                    {report.length}
                  </div>
                  <div style={{ fontSize: '14px', color: '#64748b', fontWeight: 500 }}>
                    Total Students
                  </div>
                </div>
              </Card>
            </div>

            {/* Student Marks Table */}
            <Card>
              <div style={{ padding: '24px' }}>
                <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#0f172a', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Award size={20} />
                  Student Performance
                </h2>

                {report.length === 0 ? (
                  <div style={{ padding: '48px', textAlign: 'center', color: '#64748b' }}>
                    <Award size={48} style={{ margin: '0 auto 16px', opacity: 0.3 }} />
                    <p>No marks data available for this classroom</p>
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
                            Total Obtained
                          </th>
                          <th style={{ padding: '12px', textAlign: 'center', fontSize: '13px', fontWeight: 600, color: '#64748b' }}>
                            Total Max
                          </th>
                          <th style={{ padding: '12px', textAlign: 'center', fontSize: '13px', fontWeight: 600, color: '#64748b' }}>
                            Percentage
                          </th>
                          <th style={{ padding: '12px', textAlign: 'center', fontSize: '13px', fontWeight: 600, color: '#64748b' }}>
                            Grade
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {report
                          .sort((a, b) => (b.percentage || 0) - (a.percentage || 0))
                          .map((student, index) => {
                            const percentage = Math.round(student.percentage || 0);
                            const color = getPercentageColor(percentage);
                            const grade = getGrade(percentage);
                            
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
                                <td style={{ padding: '16px', textAlign: 'center', fontSize: '14px', color: '#0f172a', fontWeight: 600 }}>
                                  {student.total_obtained}
                                </td>
                                <td style={{ padding: '16px', textAlign: 'center', fontSize: '14px', color: '#64748b', fontWeight: 600 }}>
                                  {student.total_max}
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
                                    {grade}
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
