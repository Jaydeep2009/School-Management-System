/**
 * Student Dashboard - Overview for Student Role
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../components/layout/Layout';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Skeleton } from '../components/ui/Skeleton';
import { useAuth } from '../hooks/useAuth';
import { apiService } from '../services/api';
import { BookOpen, Calendar, DollarSign, FileText, TrendingUp } from 'lucide-react';

export function StudentDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [stats, setStats] = useState({
    assignments: 0,
    assessments: 0,
    attendance: 0,
    feesPending: 0,
  });
  const [recentAssignments, setRecentAssignments] = useState<any[]>([]);
  const [recentMarks, setRecentMarks] = useState<any[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setIsLoading(true);
      
      // Load student profile
      const profileRes = await apiService.getMyProfile();
      setProfile(profileRes.data.profile);
      
      // Load student's assignments
      const assignmentsRes = await apiService.getMyAssignments();
      setRecentAssignments((assignmentsRes.data || []).slice(0, 5));
      
      // Load student's marks
      const marksRes = await apiService.getMyMarks();
      setRecentMarks((marksRes.data || []).slice(0, 5));
      
      // Load attendance summary
      const attendanceRes = await apiService.getMyAttendance();
      const attendancePercentage = attendanceRes.data?.attendance_percentage || 0;
      
      // Set stats
      setStats({
        assignments: assignmentsRes.data?.length || 0,
        assessments: marksRes.data?.length || 0,
        attendance: Math.round(attendancePercentage),
        feesPending: 0, // Would load from fee details
      });
    } catch (err) {
      console.error('Failed to load dashboard:', err);
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) return null;

  const studentName = profile?.full_name || 'Student';

  return (
    <Layout
      schoolName="SMS"
      principalName={studentName}
      onLogout={logout}
    >
      <div style={{ padding: '32px' }}>
        <div style={{ marginBottom: '24px' }}>
          <h1 style={{ fontSize: '28px', fontWeight: 600, color: '#0f172a', marginBottom: '8px' }}>
            Student Dashboard
          </h1>
          <p style={{ fontSize: '14px', color: '#64748b' }}>
            Welcome back, {studentName}
          </p>
        </div>

        {isLoading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
            {[1, 2, 3, 4].map(i => <Skeleton key={i} height="120px" />)}
          </div>
        ) : (
          <>
            {/* Stats Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginBottom: '24px' }}>
              <Card>
                <div style={{ padding: '20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                    <div style={{ padding: '8px', background: '#eff6ff', borderRadius: '8px' }}>
                      <BookOpen size={20} style={{ color: '#2563eb' }} />
                    </div>
                    <div>
                      <div style={{ fontSize: '24px', fontWeight: 600, color: '#0f172a' }}>{stats.assignments}</div>
                      <div style={{ fontSize: '14px', color: '#64748b' }}>Assignments</div>
                    </div>
                  </div>
                </div>
              </Card>

              <Card>
                <div style={{ padding: '20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                    <div style={{ padding: '8px', background: '#f0fdf4', borderRadius: '8px' }}>
                      <FileText size={20} style={{ color: '#16a34a' }} />
                    </div>
                    <div>
                      <div style={{ fontSize: '24px', fontWeight: 600, color: '#0f172a' }}>{stats.assessments}</div>
                      <div style={{ fontSize: '14px', color: '#64748b' }}>Assessments</div>
                    </div>
                  </div>
                </div>
              </Card>

              <Card>
                <div style={{ padding: '20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                    <div style={{ padding: '8px', background: '#fef3c7', borderRadius: '8px' }}>
                      <Calendar size={20} style={{ color: '#ca8a04' }} />
                    </div>
                    <div>
                      <div style={{ fontSize: '24px', fontWeight: 600, color: '#0f172a' }}>{stats.attendance}%</div>
                      <div style={{ fontSize: '14px', color: '#64748b' }}>Attendance</div>
                    </div>
                  </div>
                </div>
              </Card>

              <Card>
                <div style={{ padding: '20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                    <div style={{ padding: '8px', background: '#fce7f3', borderRadius: '8px' }}>
                      <DollarSign size={20} style={{ color: '#db2777' }} />
                    </div>
                    <div>
                      <div style={{ fontSize: '24px', fontWeight: 600, color: '#0f172a' }}>{stats.feesPending}</div>
                      <div style={{ fontSize: '14px', color: '#64748b' }}>Pending Fees</div>
                    </div>
                  </div>
                </div>
              </Card>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px' }}>
              {/* Upcoming Assignments */}
              <Card>
                <div style={{ padding: '24px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#0f172a' }}>Upcoming Assignments</h2>
                    <Button variant="secondary" onClick={() => navigate('/assignments')}>
                      View All
                    </Button>
                  </div>
                  
                  {recentAssignments.length === 0 ? (
                    <p style={{ color: '#64748b', textAlign: 'center', padding: '24px' }}>No assignments</p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {recentAssignments.map((assignment: any) => (
                        <div
                          key={assignment.id}
                          style={{
                            padding: '12px',
                            border: '1px solid #e2e8f0',
                            borderRadius: '8px',
                            cursor: 'pointer',
                          }}
                          onClick={() => navigate(`/assignments/${assignment.id}`)}
                        >
                          <div style={{ fontWeight: 500, color: '#0f172a', marginBottom: '4px' }}>
                            {assignment.title}
                          </div>
                          <div style={{ fontSize: '13px', color: '#64748b' }}>
                            {assignment.subject_name}
                            {assignment.due_date && ` • Due: ${new Date(assignment.due_date).toLocaleDateString()}`}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </Card>

              {/* Recent Marks */}
              <Card>
                <div style={{ padding: '24px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#0f172a' }}>Recent Marks</h2>
                    <Button variant="secondary" onClick={() => navigate('/marks')}>
                      View All
                    </Button>
                  </div>
                  
                  {recentMarks.length === 0 ? (
                    <p style={{ color: '#64748b', textAlign: 'center', padding: '24px' }}>No marks published yet</p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {recentMarks.map((mark: any) => (
                        <div
                          key={mark.id}
                          style={{
                            padding: '12px',
                            border: '1px solid #e2e8f0',
                            borderRadius: '8px',
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                            <div style={{ fontWeight: 500, color: '#0f172a' }}>
                              {mark.assessment_name || 'Assessment'}
                            </div>
                            <div style={{ fontWeight: 600, color: '#2563eb' }}>
                              {mark.marks_obtained}/{mark.max_marks}
                            </div>
                          </div>
                          <div style={{ fontSize: '13px', color: '#64748b' }}>
                            {mark.subject_name}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </Card>
            </div>

            {/* Quick Links */}
            <div style={{ marginTop: '24px' }}>
              <Card>
                <div style={{ padding: '24px' }}>
                  <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#0f172a', marginBottom: '16px' }}>
                    Quick Links
                  </h2>
                  <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                    <Button onClick={() => navigate('/timetable')}>
                      <Calendar size={16} style={{ marginRight: '8px' }} />
                      My Timetable
                    </Button>
                    <Button variant="secondary" onClick={() => navigate('/attendance')}>
                      <TrendingUp size={16} style={{ marginRight: '8px' }} />
                      My Attendance
                    </Button>
                    <Button variant="secondary" onClick={() => navigate('/fees')}>
                      <DollarSign size={16} style={{ marginRight: '8px' }} />
                      Fee Status
                    </Button>
                  </div>
                </div>
              </Card>
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}





