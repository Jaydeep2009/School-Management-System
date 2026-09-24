/**
 * Teacher Dashboard - Overview for Teacher Role
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../components/layout/Layout';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Skeleton } from '../components/ui/Skeleton';
import { useAuth } from '../hooks/useAuth';
import { apiService } from '../services/api';
import { BookOpen, Calendar, ClipboardList, Users, ArrowRight } from 'lucide-react';

export function TeacherDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [stats, setStats] = useState({
    classrooms: 0,
    assignments: 0,
    assessments: 0,
    students: 0,
  });
  const [recentAssignments, setRecentAssignments] = useState<any[]>([]);
  const [teachingAssignments, setTeachingAssignments] = useState<any[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setIsLoading(true);
      
      // Load teacher profile
      const profileRes = await apiService.getMyProfile();
      setProfile(profileRes.data.profile);
      
      // Load teacher's teaching assignments
      const teachingRes = await apiService.getTeachingAssignments();
      setTeachingAssignments(teachingRes.data || []);
      
      // Load recent assignments (simplified - would filter by teacher's classes)
      const assignmentsRes = await apiService.getAssignments();
      setRecentAssignments((assignmentsRes.data || []).slice(0, 5));
      
      // Calculate stats
      setStats({
        classrooms: teachingRes.data?.length || 0,
        assignments: assignmentsRes.data?.length || 0,
        assessments: 0, // Would load teacher's assessments
        students: 0, // Would count unique students across classes
      });
    } catch (err) {
      console.error('Failed to load dashboard:', err);
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) return null;

  const teacherName = profile?.full_name || 'Teacher';

  return (
    <Layout
      schoolName="SMS"
      principalName={teacherName}
      onLogout={logout}
    >
      <div style={{ padding: '32px' }}>
        <div style={{ marginBottom: '24px' }}>
          <h1 style={{ fontSize: '28px', fontWeight: 600, color: '#0f172a', marginBottom: '8px' }}>
            Teacher Dashboard
          </h1>
          <p style={{ fontSize: '14px', color: '#64748b' }}>
            Welcome back, {teacherName}
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
                      <div style={{ fontSize: '24px', fontWeight: 600, color: '#0f172a' }}>{stats.classrooms}</div>
                      <div style={{ fontSize: '14px', color: '#64748b' }}>Classes</div>
                    </div>
                  </div>
                </div>
              </Card>

              <Card>
                <div style={{ padding: '20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                    <div style={{ padding: '8px', background: '#f0fdf4', borderRadius: '8px' }}>
                      <ClipboardList size={20} style={{ color: '#16a34a' }} />
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
                    <div style={{ padding: '8px', background: '#fef3c7', borderRadius: '8px' }}>
                      <Calendar size={20} style={{ color: '#ca8a04' }} />
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
                    <div style={{ padding: '8px', background: '#fce7f3', borderRadius: '8px' }}>
                      <Users size={20} style={{ color: '#db2777' }} />
                    </div>
                    <div>
                      <div style={{ fontSize: '24px', fontWeight: 600, color: '#0f172a' }}>{stats.students}</div>
                      <div style={{ fontSize: '14px', color: '#64748b' }}>Students</div>
                    </div>
                  </div>
                </div>
              </Card>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px' }}>
              {/* My Classes */}
              <Card>
                <div style={{ padding: '24px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#0f172a' }}>My Classes</h2>
                    <Button variant="secondary" onClick={() => navigate('/academic-structure')}>
                      View All
                    </Button>
                  </div>
                  
                  {teachingAssignments.length === 0 ? (
                    <p style={{ color: '#64748b', textAlign: 'center', padding: '24px' }}>No classes assigned</p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {teachingAssignments.slice(0, 5).map((assignment: any) => (
                        <div
                          key={assignment.id}
                          style={{
                            padding: '12px',
                            border: '1px solid #e2e8f0',
                            borderRadius: '8px',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                          }}
                        >
                          <div>
                            <div style={{ fontWeight: 500, color: '#0f172a' }}>
                              {assignment.subject_name}
                            </div>
                            <div style={{ fontSize: '13px', color: '#64748b' }}>
                              {assignment.classroom_name}
                            </div>
                          </div>
                          <ArrowRight size={16} style={{ color: '#64748b' }} />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </Card>

              {/* Recent Assignments */}
              <Card>
                <div style={{ padding: '24px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#0f172a' }}>Recent Assignments</h2>
                    <Button variant="secondary" onClick={() => navigate('/assignments')}>
                      View All
                    </Button>
                  </div>
                  
                  {recentAssignments.length === 0 ? (
                    <p style={{ color: '#64748b', textAlign: 'center', padding: '24px' }}>No assignments yet</p>
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
                            {assignment.classroom_name}
                            {assignment.due_date && ` • Due: ${new Date(assignment.due_date).toLocaleDateString()}`}
                          </div>
                          <div style={{ marginTop: '8px' }}>
                            <span style={{
                              padding: '2px 8px',
                              background: assignment.status === 'published' ? '#dcfce7' : '#f1f5f9',
                              color: assignment.status === 'published' ? '#166534' : '#64748b',
                              borderRadius: '4px',
                              fontSize: '12px',
                              fontWeight: 500,
                            }}>
                              {assignment.status || 'draft'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </Card>
            </div>

            {/* Quick Actions */}
            <div style={{ marginTop: '24px' }}>
              <Card>
                <div style={{ padding: '24px' }}>
                  <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#0f172a', marginBottom: '16px' }}>
                    Quick Actions
                  </h2>
                  <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                    <Button onClick={() => navigate('/marks/new')}>Create Assessment</Button>
                    <Button variant="secondary" onClick={() => navigate('/assignments/new')}>New Assignment</Button>
                    <Button variant="secondary" onClick={() => navigate('/attendance')}>Take Attendance</Button>
                    <Button variant="secondary" onClick={() => navigate('/timetable')}>View Timetable</Button>
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





