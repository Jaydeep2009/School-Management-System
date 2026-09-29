/**
 * Student Dashboard - Home Page
 * 
 * Single-glance summary showing:
 * - Overall attendance percentage
 * - Recent published marks
 * - Upcoming assignment due dates
 * - Current fee balance
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../components/layout/Layout';
import { Card } from '../components/ui/Card';
import { Skeleton } from '../components/ui/Skeleton';
import { useAuth } from '../hooks/useAuth';
import { apiService } from '../services/api';
import { 
  GraduationCap, 
  CheckCircle, 
  FileText, 
  IndianRupee, 
  Calendar,
  TrendingUp,
  AlertCircle
} from 'lucide-react';

export function StudentDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  
  const [profile, setProfile] = useState<any>(null);
  const [attendance, setAttendance] = useState<any>(null);
  const [marks, setMarks] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [fees, setFees] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setIsLoading(true);
      
      // Load all data in parallel
      const [profileRes, attendanceRes, marksRes, assignmentsRes, feesRes] = await Promise.all([
        apiService.getStudentMe(),
        apiService.getStudentMeAttendance(),
        apiService.getStudentMeMarks(),
        apiService.getStudentMeAssignments(),
        apiService.getStudentMeFees()
      ]);

      // Extract the nested profile object
      setProfile(profileRes.data?.profile || profileRes.data);
      setAttendance(attendanceRes.data);
      setMarks(marksRes.data || []);
      setAssignments(assignmentsRes.data || []);
      setFees(feesRes.data);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Get recent marks (latest 3 assessments across all subjects)
  const recentMarks = marks
    .flatMap(subject => 
      subject.assessments.map((assessment: any) => ({
        ...assessment,
        subject_name: subject.subject_name
      }))
    )
    .sort((a, b) => new Date(b.conducted_on).getTime() - new Date(a.conducted_on).getTime())
    .slice(0, 3);

  // Get upcoming assignments (next 3 by due date)
  const upcomingAssignments = assignments
    .filter(a => new Date(a.due_date) >= new Date())
    .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())
    .slice(0, 3);

  const attendancePercentage = attendance?.overall?.percentage || 0;
  const attendanceColor = attendancePercentage >= 75 ? '#22c55e' : attendancePercentage >= 60 ? '#eab308' : '#ef4444';

  if (!user) return null;

  return (
    <Layout
      schoolName={'SMS'}
      principalName={profile?.full_name || user.loginId || 'Student'}
      onLogout={logout}
      role="student"
    >
      <div style={{ padding: '32px' }}>
        {/* Welcome Section */}
        <div style={{ marginBottom: '32px' }}>
          <h1 style={{ fontSize: '28px', fontWeight: 600, color: '#0f172a', marginBottom: '8px' }}>
            Welcome back, {profile?.first_name || 'Student'}!
          </h1>
          <p style={{ fontSize: '14px', color: '#64748b' }}>
            {profile?.classroom_code ? `Class: ${profile.classroom_code}` : 'Dashboard'}
            {profile?.roll_number && ` • Roll No: ${profile.roll_number}`}
          </p>
        </div>

        {/* Summary Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px', marginBottom: '32px' }}>
          {/* Attendance Card */}
          <div
            style={{ cursor: 'pointer', transition: 'transform 0.2s, box-shadow 0.2s' }}
            onClick={() => navigate('/student/attendance')}
            onMouseEnter={(e: React.MouseEvent<HTMLDivElement>) => {
              e.currentTarget.style.transform = 'translateY(-4px)';
              e.currentTarget.style.boxShadow = '0 12px 24px rgba(0,0,0,0.1)';
            }}
            onMouseLeave={(e: React.MouseEvent<HTMLDivElement>) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '';
            }}
          >
            <Card>
            <div style={{ padding: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <div style={{ padding: '12px', background: '#dbeafe', borderRadius: '8px' }}>
                  <CheckCircle size={24} style={{ color: '#2563eb' }} />
                </div>
                <TrendingUp size={20} style={{ color: attendanceColor }} />
              </div>
              {isLoading ? (
                <Skeleton height="60px" />
              ) : (
                <>
                  <div style={{ fontSize: '32px', fontWeight: 700, color: attendanceColor, marginBottom: '4px' }}>
                    {attendancePercentage}%
                  </div>
                  <div style={{ fontSize: '14px', color: '#64748b' }}>
                    Overall Attendance
                  </div>
                  <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '8px' }}>
                    {attendance?.overall?.present_count || 0} present out of {attendance?.overall?.total_sessions || 0} sessions
                  </div>
                </>
              )}
            </div>
          </Card>
          </div>

          {/* Marks Card */}
          <div
            style={{ cursor: 'pointer', transition: 'transform 0.2s, box-shadow 0.2s' }}
            onClick={() => navigate('/student/marks')}
            onMouseEnter={(e: React.MouseEvent<HTMLDivElement>) => {
              e.currentTarget.style.transform = 'translateY(-4px)';
              e.currentTarget.style.boxShadow = '0 12px 24px rgba(0,0,0,0.1)';
            }}
            onMouseLeave={(e: React.MouseEvent<HTMLDivElement>) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '';
            }}
          >
            <Card>
            <div style={{ padding: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <div style={{ padding: '12px', background: '#dcfce7', borderRadius: '8px' }}>
                  <GraduationCap size={24} style={{ color: '#16a34a' }} />
                </div>
              </div>
              {isLoading ? (
                <Skeleton height="60px" />
              ) : (
                <>
                  <div style={{ fontSize: '32px', fontWeight: 700, color: '#0f172a', marginBottom: '4px' }}>
                    {marks.length}
                  </div>
                  <div style={{ fontSize: '14px', color: '#64748b', marginBottom: '8px' }}>
                    Subjects with Marks
                  </div>
                  {recentMarks.length > 0 && (
                    <div style={{ fontSize: '12px', color: '#94a3b8' }}>
                      Latest: {recentMarks[0].marks_obtained}/{recentMarks[0].max_marks} in {recentMarks[0].subject_name}
                    </div>
                  )}
                </>
              )}
            </div>
          </Card>
          </div>

          {/* Assignments Card */}
          <div
            style={{ cursor: 'pointer', transition: 'transform 0.2s, box-shadow 0.2s' }}
            onClick={() => navigate('/student/assignments')}
            onMouseEnter={(e: React.MouseEvent<HTMLDivElement>) => {
              e.currentTarget.style.transform = 'translateY(-4px)';
              e.currentTarget.style.boxShadow = '0 12px 24px rgba(0,0,0,0.1)';
            }}
            onMouseLeave={(e: React.MouseEvent<HTMLDivElement>) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '';
            }}
          >
            <Card>
            <div style={{ padding: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <div style={{ padding: '12px', background: '#fef3c7', borderRadius: '8px' }}>
                  <FileText size={24} style={{ color: '#f59e0b' }} />
                </div>
                {upcomingAssignments.length > 0 && (
                  <AlertCircle size={20} style={{ color: '#f59e0b' }} />
                )}
              </div>
              {isLoading ? (
                <Skeleton height="60px" />
              ) : (
                <>
                  <div style={{ fontSize: '32px', fontWeight: 700, color: '#0f172a', marginBottom: '4px' }}>
                    {upcomingAssignments.length}
                  </div>
                  <div style={{ fontSize: '14px', color: '#64748b', marginBottom: '8px' }}>
                    Upcoming Assignments
                  </div>
                  {upcomingAssignments.length > 0 && (
                    <div style={{ fontSize: '12px', color: '#94a3b8' }}>
                      Next due: {new Date(upcomingAssignments[0].due_date).toLocaleDateString()}
                    </div>
                  )}
                </>
              )}
            </div>
          </Card>
          </div>

          {/* Fees Card */}
          <div
            style={{ cursor: 'pointer', transition: 'transform 0.2s, box-shadow 0.2s' }}
            onClick={() => navigate('/student/fees')}
            onMouseEnter={(e: React.MouseEvent<HTMLDivElement>) => {
              e.currentTarget.style.transform = 'translateY(-4px)';
              e.currentTarget.style.boxShadow = '0 12px 24px rgba(0,0,0,0.1)';
            }}
            onMouseLeave={(e: React.MouseEvent<HTMLDivElement>) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '';
            }}
          >
            <Card>
            <div style={{ padding: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <div style={{ padding: '12px', background: '#fce7f3', borderRadius: '8px' }}>
                  <IndianRupee size={24} style={{ color: '#ec4899' }} />
                </div>
              </div>
              {isLoading ? (
                <Skeleton height="60px" />
              ) : (
                <>
                  <div style={{ 
                    fontSize: '32px', 
                    fontWeight: 700, 
                    color: fees?.balance > 0 ? '#dc2626' : '#16a34a',
                    marginBottom: '4px' 
                  }}>
                    ₹{fees?.balance?.toLocaleString('en-IN') || '0'}
                  </div>
                  <div style={{ fontSize: '14px', color: '#64748b', marginBottom: '8px' }}>
                    Fee Balance
                  </div>
                  <div style={{ fontSize: '12px', color: '#94a3b8' }}>
                    Paid: ₹{fees?.total_paid?.toLocaleString('en-IN') || '0'} of ₹{fees?.total_charged?.toLocaleString('en-IN') || '0'}
                  </div>
                </>
              )}
            </div>
          </Card>
          </div>
        </div>

        {/* Recent Activity */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px' }}>
          {/* Recent Marks */}
          <Card>
            <div style={{ padding: '24px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#0f172a', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <GraduationCap size={20} />
                Recent Marks
              </h2>
              {isLoading ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {[1, 2, 3].map(i => <Skeleton key={i} height="60px" />)}
                </div>
              ) : recentMarks.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '32px', color: '#94a3b8' }}>
                  <GraduationCap size={48} style={{ margin: '0 auto 16px', opacity: 0.3 }} />
                  <p>No published marks yet</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {recentMarks.map((mark, index) => (
                    <div 
                      key={index}
                      style={{ 
                        padding: '16px', 
                        background: '#f8fafc', 
                        borderRadius: '8px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}
                    >
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '14px', fontWeight: 500, color: '#0f172a', marginBottom: '4px' }}>
                          {mark.subject_name}
                        </div>
                        <div style={{ fontSize: '13px', color: '#64748b' }}>
                          {mark.assessment_name}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '20px', fontWeight: 600, color: '#2563eb' }}>
                          {mark.marks_obtained}/{mark.max_marks}
                        </div>
                        <div style={{ fontSize: '12px', color: '#94a3b8' }}>
                          {Math.round((mark.marks_obtained / mark.max_marks) * 100)}%
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>

          {/* Upcoming Assignments */}
          <Card>
            <div style={{ padding: '24px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#0f172a', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Calendar size={20} />
                Upcoming Assignments
              </h2>
              {isLoading ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {[1, 2, 3].map(i => <Skeleton key={i} height="60px" />)}
                </div>
              ) : upcomingAssignments.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '32px', color: '#94a3b8' }}>
                  <Calendar size={48} style={{ margin: '0 auto 16px', opacity: 0.3 }} />
                  <p>No upcoming assignments</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {upcomingAssignments.map((assignment) => (
                    <div 
                      key={assignment.id}
                      style={{ 
                        padding: '16px', 
                        background: '#f8fafc', 
                        borderRadius: '8px'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '14px', fontWeight: 500, color: '#0f172a', marginBottom: '4px' }}>
                            {assignment.title}
                          </div>
                          <div style={{ fontSize: '13px', color: '#64748b' }}>
                            {assignment.subject_name}
                          </div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#f59e0b' }}>
                        <Calendar size={14} />
                        Due: {new Date(assignment.due_date).toLocaleDateString()}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
