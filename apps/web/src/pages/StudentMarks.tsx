/**
 * Student Marks Page
 * 
 * Shows:
 * - Per subject, per assessment marks (only published assessments)
 * - Per-subject aggregate (total obtained / total max)
 * 
 * Read-only view - unpublished assessments are never shown
 */

import { useState, useEffect } from 'react';
import { Layout } from '../components/layout/Layout';
import { Card } from '../components/ui/Card';
import { Skeleton } from '../components/ui/Skeleton';
import { ErrorState } from '../components/ui/ErrorState';
import { useAuth } from '../hooks/useAuth';
import { apiService } from '../services/api';
import { GraduationCap, Award, Calendar } from 'lucide-react';

export function StudentMarks() {
  const { user, logout } = useAuth();
  
  const [profile, setProfile] = useState<any>(null);
  const [marks, setMarks] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const [profileRes, marksRes] = await Promise.all([
        apiService.getStudentMe(),
        apiService.getStudentMeMarks()
      ]);

      // Extract the nested profile object
      setProfile(profileRes.data?.profile || profileRes.data);
      setMarks(marksRes.data || []);
    } catch (err) {
      console.error('Failed to load marks:', err);
      setError(err instanceof Error ? err.message : 'Failed to load marks');
    } finally {
      setIsLoading(false);
    }
  };

  const getPercentageColor = (percentage: number) => {
    if (percentage >= 75) return '#22c55e';
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

  // Calculate overall percentage
  const totalObtained = marks.reduce((sum, sub) => sum + sub.total_obtained, 0);
  const totalMax = marks.reduce((sum, sub) => sum + sub.total_max, 0);
  const overallPercentage = totalMax > 0 ? Math.round((totalObtained / totalMax) * 100) : 0;

  return (
    <Layout
      schoolName={'SMS'}
      principalName={profile?.full_name || user.loginId || 'Student'}
      onLogout={logout}
      role="student"
    >
      <div style={{ padding: '32px' }}>
        <div style={{ marginBottom: '24px' }}>
          <h1 style={{ fontSize: '28px', fontWeight: 600, color: '#0f172a', marginBottom: '8px' }}>
            My Marks
          </h1>
          <p style={{ fontSize: '14px', color: '#64748b' }}>
            View your published assessment results for {profile?.academic_year || 'current academic year'}
          </p>
        </div>

        {error && !isLoading && (
          <ErrorState message={error} onRetry={loadData} />
        )}

        {/* Overall Summary */}
        {!error && (
          <div style={{ marginBottom: '32px' }}>
            <Card>
              <div style={{ padding: '32px' }}>
                <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#0f172a', marginBottom: '24px' }}>
                  Overall Performance
                </h2>
                
                {isLoading ? (
                  <Skeleton height="150px" />
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                    <div style={{ 
                      padding: '24px', 
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', 
                      borderRadius: '12px',
                      color: 'white'
                    }}>
                      <div style={{ fontSize: '14px', opacity: 0.9, marginBottom: '8px' }}>
                        Overall Percentage
                      </div>
                      <div style={{ fontSize: '48px', fontWeight: 700 }}>
                        {overallPercentage}%
                      </div>
                      <div style={{ fontSize: '20px', fontWeight: 600, marginTop: '8px' }}>
                        Grade: {getGrade(overallPercentage)}
                      </div>
                    </div>

                    <div style={{ padding: '24px', background: '#dcfce7', borderRadius: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                        <Award size={20} style={{ color: '#16a34a' }} />
                        <span style={{ fontSize: '14px', color: '#166534', fontWeight: 500 }}>Total Obtained</span>
                      </div>
                      <div style={{ fontSize: '36px', fontWeight: 700, color: '#0f172a' }}>
                        {totalObtained}
                      </div>
                      <div style={{ fontSize: '14px', color: '#64748b', marginTop: '4px' }}>
                        out of {totalMax} marks
                      </div>
                    </div>

                    <div style={{ padding: '24px', background: '#dbeafe', borderRadius: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                        <GraduationCap size={20} style={{ color: '#2563eb' }} />
                        <span style={{ fontSize: '14px', color: '#1e40af', fontWeight: 500 }}>Subjects</span>
                      </div>
                      <div style={{ fontSize: '36px', fontWeight: 700, color: '#0f172a' }}>
                        {marks.length}
                      </div>
                      <div style={{ fontSize: '14px', color: '#64748b', marginTop: '4px' }}>
                        with published marks
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </Card>
          </div>
        )}

        {/* Subject-wise Marks */}
        {!error && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {isLoading ? (
              <>
                {[1, 2, 3].map(i => (
                  <Card key={i}>
                    <div style={{ padding: '24px' }}>
                      <Skeleton height="200px" />
                    </div>
                  </Card>
                ))}
              </>
            ) : marks.length === 0 ? (
              <Card>
                <div style={{ padding: '48px', textAlign: 'center', color: '#94a3b8' }}>
                  <GraduationCap size={64} style={{ margin: '0 auto 16px', opacity: 0.3 }} />
                  <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#64748b', marginBottom: '8px' }}>
                    No Published Marks
                  </h3>
                  <p style={{ fontSize: '14px' }}>
                    Your teachers haven't published any assessment results yet.
                  </p>
                </div>
              </Card>
            ) : (
              marks.map((subject) => (
                <Card key={subject.subject_id}>
                  <div style={{ padding: '24px' }}>
                    {/* Subject Header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', paddingBottom: '16px', borderBottom: '2px solid #e2e8f0' }}>
                      <div>
                        <h3 style={{ fontSize: '20px', fontWeight: 600, color: '#0f172a', marginBottom: '4px' }}>
                          {subject.subject_name}
                        </h3>
                        <p style={{ fontSize: '13px', color: '#64748b' }}>
                          {subject.subject_code}
                        </p>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ 
                          fontSize: '32px', 
                          fontWeight: 700, 
                          color: getPercentageColor(subject.percentage)
                        }}>
                          {subject.percentage}%
                        </div>
                        <div style={{ fontSize: '14px', color: '#64748b' }}>
                          {subject.total_obtained}/{subject.total_max} marks
                        </div>
                        <div style={{ 
                          marginTop: '4px',
                          padding: '4px 12px',
                          background: getPercentageColor(subject.percentage),
                          color: 'white',
                          borderRadius: '12px',
                          fontSize: '14px',
                          fontWeight: 600,
                          display: 'inline-block'
                        }}>
                          Grade {getGrade(subject.percentage)}
                        </div>
                      </div>
                    </div>

                    {/* Assessments */}
                    {subject.assessments.length === 0 ? (
                      <div style={{ padding: '32px', textAlign: 'center', color: '#94a3b8' }}>
                        <p>No published assessments</p>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {subject.assessments.map((assessment: any) => (
                          <div 
                            key={assessment.assessment_id}
                            style={{ 
                              padding: '16px', 
                              background: assessment.marks_obtained !== null ? '#f8fafc' : '#fef3c7',
                              borderRadius: '8px',
                              border: `1px solid ${assessment.marks_obtained !== null ? '#e2e8f0' : '#fde68a'}`
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <div style={{ flex: 1 }}>
                                <div style={{ fontSize: '15px', fontWeight: 600, color: '#0f172a', marginBottom: '4px' }}>
                                  {assessment.assessment_name}
                                </div>
                                <div style={{ fontSize: '13px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <span style={{ 
                                    padding: '2px 8px', 
                                    background: '#e0e7ff', 
                                    color: '#4f46e5',
                                    borderRadius: '4px',
                                    fontSize: '12px',
                                    fontWeight: 500
                                  }}>
                                    {assessment.assessment_type}
                                  </span>
                                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <Calendar size={14} />
                                    {new Date(assessment.conducted_on).toLocaleDateString()}
                                  </span>
                                </div>
                                {assessment.remarks && (
                                  <div style={{ 
                                    marginTop: '8px', 
                                    padding: '8px 12px', 
                                    background: 'white',
                                    borderRadius: '6px',
                                    fontSize: '13px',
                                    color: '#64748b',
                                    fontStyle: 'italic'
                                  }}>
                                    "{assessment.remarks}"
                                  </div>
                                )}
                              </div>
                              <div style={{ textAlign: 'right', marginLeft: '16px' }}>
                                {assessment.marks_obtained !== null ? (
                                  <>
                                    <div style={{ fontSize: '28px', fontWeight: 700, color: '#2563eb' }}>
                                      {assessment.marks_obtained}
                                      <span style={{ fontSize: '18px', color: '#94a3b8' }}>
                                        /{assessment.max_marks}
                                      </span>
                                    </div>
                                    <div style={{ fontSize: '14px', color: '#64748b', marginTop: '4px' }}>
                                      {Math.round((assessment.marks_obtained / assessment.max_marks) * 100)}%
                                    </div>
                                  </>
                                ) : (
                                  <div style={{ fontSize: '14px', color: '#92400e', fontWeight: 500 }}>
                                    Not Graded
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </Card>
              ))
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}
