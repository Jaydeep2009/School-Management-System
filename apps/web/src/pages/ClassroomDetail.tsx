/**
 * Classroom Detail Page
 * Shows classroom information, enrolled students, and class teacher
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Layout } from '../components/layout/Layout';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Skeleton } from '../components/ui/Skeleton';
import { ErrorState } from '../components/ui/ErrorState';
import { useAuth } from '../hooks/useAuth';
import { apiService } from '../services/api';
import { ArrowLeft, Edit, Users, GraduationCap } from 'lucide-react';

interface ClassroomDetail {
  id: string;
  classroom_code: string;
  grade_name: string;
  division_name: string;
  grade_level: number;
  academic_year_id: string;
  academic_year_label?: string;
  class_teacher_id: string | null;
  class_teacher_name?: string;
  status: string;
}

interface Enrollment {
  id: string;
  student_id: string;
  student_name?: string;
  roll_number?: string;
  status: string;
}

export function ClassroomDetail() {
  const { id } = useParams<{ id: string }>();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [classroom, setClassroom] = useState<ClassroomDetail | null>(null);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    if (!id) return;
    try {
      setIsLoading(true);
      setError(null);
      
      // Load classroom details and enrollments in parallel
      const [classroomRes, enrollmentsRes] = await Promise.all([
        apiService.getClassroom(id),
        apiService.getEnrollments({ classroom_id: id })
      ]);
      
      setClassroom(classroomRes.data);
      setEnrollments(enrollmentsRes.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load classroom details');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    
    setIsDeleting(true);
    setError(null);
    
    try {
      await apiService.deleteClassroom(id);
      // Navigate back to academic structure page after successful deletion
      navigate('/academic');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete classroom');
      setShowDeleteModal(false);
    } finally {
      setIsDeleting(false);
    }
  };

  if (!user) return null;

  if (isLoading) {
    return (
      <Layout schoolName={'SMS'} principalName={"User"} onLogout={logout}>
        <div style={{ padding: '32px' }}>
          <Skeleton height="200px" />
        </div>
      </Layout>
    );
  }

  if (error || !classroom) {
    return (
      <Layout schoolName={'SMS'} principalName={"User"} onLogout={logout}>
        <div style={{ padding: '32px' }}>
          <ErrorState message={error || 'Classroom not found'} onRetry={loadData} />
        </div>
      </Layout>
    );
  }

  return (
    <Layout schoolName={'SMS'} principalName={"User"} onLogout={logout}>
      <div style={{ padding: '32px' }}>
        {/* Header */}
        <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Button variant="secondary" onClick={() => navigate('/academic')}>
              <ArrowLeft size={16} />
            </Button>
            <div>
              <h1 style={{ fontSize: '28px', fontWeight: 600, color: '#0f172a', marginBottom: '4px' }}>
                {classroom.classroom_code}
              </h1>
              <p style={{ fontSize: '14px', color: '#64748b' }}>
                {classroom.grade_name} {classroom.division_name} • Grade Level {classroom.grade_level}
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <Button variant="secondary" onClick={() => navigate(`/classrooms/${id}/edit`)}>
              <Edit size={16} style={{ marginRight: '8px' }} />
              Edit Classroom
            </Button>
            <Button 
              variant="secondary" 
              onClick={() => setShowDeleteModal(true)}
              style={{ 
                color: '#dc2626',
                borderColor: '#fca5a5',
              }}
            >
              Delete
            </Button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px' }}>
          {/* Classroom Information */}
          <Card>
            <div style={{ padding: '24px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#0f172a', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <GraduationCap size={20} />
                Classroom Information
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <InfoField label="Classroom Code" value={classroom.classroom_code} />
                <InfoField label="Grade Name" value={classroom.grade_name} />
                <InfoField label="Division" value={classroom.division_name} />
                <InfoField label="Grade Level" value={classroom.grade_level.toString()} />
                <InfoField label="Academic Year" value={classroom.academic_year_label || '—'} />
                <InfoField label="Class Teacher" value={classroom.class_teacher_name || 'Not assigned'} />
                <InfoField 
                  label="Status" 
                  value={
                    <span style={{
                      padding: '4px 8px',
                      borderRadius: '4px',
                      fontSize: '12px',
                      fontWeight: 500,
                      background: classroom.status === 'active' ? '#dcfce7' : '#f1f5f9',
                      color: classroom.status === 'active' ? '#166534' : '#64748b',
                    }}>
                      {classroom.status}
                    </span>
                  } 
                />
              </div>
            </div>
          </Card>

          {/* Enrolled Students */}
          <Card>
            <div style={{ padding: '24px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#0f172a', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Users size={20} />
                Enrolled Students ({enrollments.length})
              </h2>
              
              {enrollments.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '32px', color: '#64748b' }}>
                  No students enrolled yet
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '400px', overflowY: 'auto' }}>
                  {enrollments.map((enrollment) => (
                    <div
                      key={enrollment.id}
                      style={{
                        padding: '12px',
                        border: '1px solid #e2e8f0',
                        borderRadius: '6px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        cursor: 'pointer',
                        transition: 'background 0.2s',
                      }}
                      onClick={() => navigate(`/students/${enrollment.student_id}`)}
                      onMouseEnter={(e) => e.currentTarget.style.background = '#f8fafc'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
                    >
                      <div>
                        <div style={{ fontWeight: 500, color: '#0f172a' }}>
                          {enrollment.student_name || 'Unknown Student'}
                        </div>
                        {enrollment.roll_number && (
                          <div style={{ fontSize: '13px', color: '#64748b', marginTop: '2px' }}>
                            Roll No: {enrollment.roll_number}
                          </div>
                        )}
                      </div>
                      <span style={{
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '12px',
                        fontWeight: 500,
                        background: enrollment.status === 'active' ? '#dcfce7' : '#f1f5f9',
                        color: enrollment.status === 'active' ? '#166534' : '#64748b',
                      }}>
                        {enrollment.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
        }}>
          <div style={{
            background: 'white',
            borderRadius: '8px',
            padding: '24px',
            maxWidth: '400px',
            width: '90%',
          }}>
            <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#0f172a', marginBottom: '12px' }}>
              Delete Classroom
            </h3>
            <p style={{ color: '#64748b', marginBottom: '20px' }}>
              Are you sure you want to delete <strong>{classroom.classroom_code}</strong>? 
              {enrollments.length > 0 && (
                <span style={{ color: '#dc2626', display: 'block', marginTop: '8px' }}>
                  Warning: This classroom has {enrollments.length} enrolled student(s). 
                  You must remove all enrollments before deleting.
                </span>
              )}
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <Button
                variant="secondary"
                onClick={() => setShowDeleteModal(false)}
                disabled={isDeleting}
              >
                Cancel
              </Button>
              <Button
                onClick={handleDelete}
                disabled={isDeleting || enrollments.length > 0}
                style={{
                  background: '#dc2626',
                  color: 'white',
                }}
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}

function InfoField({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>
        {label}
      </div>
      <div style={{ fontSize: '14px', color: '#0f172a' }}>
        {value}
      </div>
    </div>
  );
}
