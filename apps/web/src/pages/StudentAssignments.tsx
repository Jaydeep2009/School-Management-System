/**
 * Student Assignments Page
 * 
 * Shows:
 * - List of assignments for student's classroom
 * - Filter by subject and due date
 * - Download attachments (view-only, no submission capability)
 */

import { useState, useEffect } from 'react';
import { Layout } from '../components/layout/Layout';
import { Card } from '../components/ui/Card';
import { Skeleton } from '../components/ui/Skeleton';
import { ErrorState } from '../components/ui/ErrorState';
import { useAuth } from '../hooks/useAuth';
import { apiService } from '../services/api';
import { FileText, Calendar, Download, Filter, AlertCircle } from 'lucide-react';

export function StudentAssignments() {
  const { user, logout } = useAuth();
  
  const [profile, setProfile] = useState<any>(null);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [filteredAssignments, setFilteredAssignments] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all'); // all, upcoming, past
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    filterAssignments();
  }, [assignments, selectedSubject, filterStatus]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const [profileRes, assignmentsRes] = await Promise.all([
        apiService.getStudentMe(),
        apiService.getStudentMeAssignments()
      ]);

      // Extract the nested profile object
      setProfile(profileRes.data?.profile || profileRes.data);
      setAssignments(assignmentsRes.data || []);

      // Extract unique subjects
      const uniqueSubjects = Array.from(
        new Map(
          (assignmentsRes.data || []).map((a: any) => [a.subject_id, {
            id: a.subject_id,
            name: a.subject_name,
            code: a.subject_code
          }])
        ).values()
      );
      setSubjects(uniqueSubjects);
    } catch (err) {
      console.error('Failed to load assignments:', err);
      setError(err instanceof Error ? err.message : 'Failed to load assignments');
    } finally {
      setIsLoading(false);
    }
  };

  const filterAssignments = () => {
    let filtered = [...assignments];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Filter by subject
    if (selectedSubject !== 'all') {
      filtered = filtered.filter(a => a.subject_id === selectedSubject);
    }

    // Filter by status
    if (filterStatus === 'upcoming') {
      filtered = filtered.filter(a => new Date(a.due_date) >= today);
    } else if (filterStatus === 'past') {
      filtered = filtered.filter(a => new Date(a.due_date) < today);
    }

    // Sort by due date (upcoming first)
    filtered.sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime());

    setFilteredAssignments(filtered);
  };

  const isOverdue = (dueDate: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(dueDate);
    due.setHours(0, 0, 0, 0);
    return due < today;
  };

  const getDueDateLabel = (dueDate: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(dueDate);
    due.setHours(0, 0, 0, 0);
    const diffTime = due.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return `${Math.abs(diffDays)} days overdue`;
    if (diffDays === 0) return 'Due today';
    if (diffDays === 1) return 'Due tomorrow';
    if (diffDays <= 7) return `Due in ${diffDays} days`;
    return new Date(dueDate).toLocaleDateString();
  };

  const handleDownload = async (assignment: any, attachment: any) => {
    try {
      const baseUrl = 'https://sms-api.nmvpmsms.workers.dev';
      const token = localStorage.getItem('token');
      
      const url = `${baseUrl}/assignments/${assignment.id}/attachments/${attachment.id}`;
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Download failed');
      }
      
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = attachment.file_name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (err) {
      alert('Failed to download attachment');
    }
  };

  if (!user) return null;

  const upcomingCount = assignments.filter(a => !isOverdue(a.due_date)).length;
  const pastCount = assignments.filter(a => isOverdue(a.due_date)).length;

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
            My Assignments
          </h1>
          <p style={{ fontSize: '14px', color: '#64748b' }}>
            View and download assignments for {profile?.classroom_code || 'your class'}
          </p>
        </div>

        {error && !isLoading && (
          <ErrorState message={error} onRetry={loadData} />
        )}

        {/* Summary Cards */}
        {!error && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
            <Card>
              <div style={{ padding: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ padding: '10px', background: '#dbeafe', borderRadius: '8px' }}>
                    <FileText size={20} style={{ color: '#2563eb' }} />
                  </div>
                  <div>
                    <div style={{ fontSize: '24px', fontWeight: 700, color: '#0f172a' }}>
                      {assignments.length}
                    </div>
                    <div style={{ fontSize: '13px', color: '#64748b' }}>
                      Total Assignments
                    </div>
                  </div>
                </div>
              </div>
            </Card>

            <Card>
              <div style={{ padding: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ padding: '10px', background: '#fef3c7', borderRadius: '8px' }}>
                    <AlertCircle size={20} style={{ color: '#f59e0b' }} />
                  </div>
                  <div>
                    <div style={{ fontSize: '24px', fontWeight: 700, color: '#0f172a' }}>
                      {upcomingCount}
                    </div>
                    <div style={{ fontSize: '13px', color: '#64748b' }}>
                      Upcoming
                    </div>
                  </div>
                </div>
              </div>
            </Card>

            <Card>
              <div style={{ padding: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ padding: '10px', background: '#f3f4f6', borderRadius: '8px' }}>
                    <Calendar size={20} style={{ color: '#6b7280' }} />
                  </div>
                  <div>
                    <div style={{ fontSize: '24px', fontWeight: 700, color: '#0f172a' }}>
                      {pastCount}
                    </div>
                    <div style={{ fontSize: '13px', color: '#64748b' }}>
                      Past Due
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* Filters */}
        {!error && (
          <Card>
            <div style={{ padding: '16px', display: 'flex', gap: '16px', flexWrap: 'wrap', marginBottom: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Filter size={16} style={{ color: '#64748b' }} />
                <span style={{ fontSize: '14px', fontWeight: 500, color: '#64748b' }}>Filters:</span>
              </div>

              <div style={{ flex: '1 1 200px' }}>
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
                  {subjects.map((subject: any) => (
                    <option key={subject.id} value={subject.id}>
                      {subject.name}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ flex: '1 1 200px' }}>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #e2e8f0',
                    borderRadius: '6px',
                    fontSize: '14px',
                  }}
                >
                  <option value="all">All Assignments</option>
                  <option value="upcoming">Upcoming Only</option>
                  <option value="past">Past Due Only</option>
                </select>
              </div>
            </div>
          </Card>
        )}

        {/* Assignments List */}
        {!error && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {isLoading ? (
              <>
                {[1, 2, 3].map(i => (
                  <Card key={i}>
                    <div style={{ padding: '24px' }}>
                      <Skeleton height="120px" />
                    </div>
                  </Card>
                ))}
              </>
            ) : filteredAssignments.length === 0 ? (
              <Card>
                <div style={{ padding: '48px', textAlign: 'center', color: '#94a3b8' }}>
                  <FileText size={64} style={{ margin: '0 auto 16px', opacity: 0.3 }} />
                  <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#64748b', marginBottom: '8px' }}>
                    No Assignments Found
                  </h3>
                  <p style={{ fontSize: '14px' }}>
                    {selectedSubject !== 'all' || filterStatus !== 'all'
                      ? 'Try changing your filters'
                      : 'No assignments have been posted yet'}
                  </p>
                </div>
              </Card>
            ) : (
              filteredAssignments.map((assignment) => {
                const overdue = isOverdue(assignment.due_date);
                return (
                  <Card key={assignment.id}>
                    <div style={{ 
                      padding: '24px',
                      borderLeft: `4px solid ${overdue ? '#ef4444' : '#2563eb'}`
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                        <div style={{ flex: 1 }}>
                          <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#0f172a', marginBottom: '8px' }}>
                            {assignment.title}
                          </h3>
                          <div style={{ display: 'flex', gap: '12px', fontSize: '13px', color: '#64748b', marginBottom: '8px' }}>
                            <span style={{ 
                              padding: '4px 8px', 
                              background: '#e0e7ff', 
                              color: '#4f46e5',
                              borderRadius: '4px',
                              fontWeight: 500
                            }}>
                              {assignment.subject_name}
                            </span>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <Calendar size={14} />
                              Assigned: {new Date(assignment.assigned_on).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                        <div style={{ 
                          padding: '8px 16px',
                          background: overdue ? '#fee2e2' : '#dbeafe',
                          color: overdue ? '#dc2626' : '#2563eb',
                          borderRadius: '8px',
                          fontSize: '13px',
                          fontWeight: 600,
                          textAlign: 'center',
                          minWidth: '140px'
                        }}>
                          {getDueDateLabel(assignment.due_date)}
                        </div>
                      </div>

                      {assignment.description && (
                        <p style={{ 
                          fontSize: '14px', 
                          color: '#64748b', 
                          marginBottom: '16px',
                          lineHeight: '1.6'
                        }}>
                          {assignment.description}
                        </p>
                      )}

                      {assignment.attachments && assignment.attachments.length > 0 && (
                        <div style={{ 
                          marginTop: '16px',
                          paddingTop: '16px',
                          borderTop: '1px solid #e2e8f0'
                        }}>
                          <h4 style={{ fontSize: '13px', fontWeight: 600, color: '#64748b', marginBottom: '8px' }}>
                            Attachments ({assignment.attachments.length}):
                          </h4>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {assignment.attachments.map((attachment: any) => (
                              <button
                                key={attachment.id}
                                onClick={() => handleDownload(assignment, attachment)}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '8px',
                                  padding: '10px 16px',
                                  background: '#f8fafc',
                                  border: '1px solid #e2e8f0',
                                  borderRadius: '6px',
                                  fontSize: '14px',
                                  fontWeight: 500,
                                  color: '#2563eb',
                                  cursor: 'pointer',
                                  transition: 'all 0.2s',
                                  textAlign: 'left',
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.background = '#2563eb';
                                  e.currentTarget.style.color = 'white';
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.background = '#f8fafc';
                                  e.currentTarget.style.color = '#2563eb';
                                }}
                              >
                                <Download size={16} />
                                <span style={{ flex: 1 }}>{attachment.file_name}</span>
                                {attachment.size_bytes && (
                                  <span style={{ fontSize: '13px', opacity: 0.8 }}>
                                    ({(attachment.size_bytes / 1024).toFixed(1)} KB)
                                  </span>
                                )}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </Card>
                );
              })
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}
