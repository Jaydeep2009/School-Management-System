/**
 * Teacher Detail Page
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
import { ArrowLeft, Edit, Power, RefreshCw, User } from 'lucide-react';

interface TeacherDetail {
  id: string;
  employee_code: string;
  first_name: string;
  middle_name?: string;
  last_name: string;
  full_name: string;
  phone?: string;
  date_of_birth?: string;
  joining_date?: string;
  status: string;
  user: {
    id: string;
    login_id: string;
    role: string;
    status: string;
    must_change_password: boolean;
  };
}

export function TeacherDetail() {
  const { id } = useParams<{ id: string }>();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [teacher, setTeacher] = useState<TeacherDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    loadTeacher();
  }, [id]);

  const loadTeacher = async () => {
    if (!id) return;
    try {
      setIsLoading(true);
      setError(null);
      const response = await apiService.getTeacher(id);
      setTeacher(response.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load teacher');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisable = async () => {
    if (!id || !confirm('Are you sure you want to disable this teacher account?')) return;
    try {
      setActionLoading('disable');
      await apiService.disableTeacher(id);
      await loadTeacher();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to disable teacher');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReactivate = async () => {
    if (!id || !confirm('Reactivate this teacher account? The teacher will need to change their password on next login.')) return;
    try {
      setActionLoading('reactivate');
      await apiService.reactivateTeacher(id);
      await loadTeacher();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to reactivate teacher');
    } finally {
      setActionLoading(null);
    }
  };

  const handleResetPassword = async () => {
    if (!id || !confirm('Reset password for this teacher? A new temporary password will be generated.')) return;
    try {
      setActionLoading('reset');
      const response = await apiService.resetTeacherPassword(id);
      alert(`Password reset successful!\n\nLogin ID: ${response.data.login_id}\nTemporary Password: ${response.data.temporary_password}\n\nPlease save these credentials and share with the teacher.`);
      await loadTeacher();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to reset password');
    } finally {
      setActionLoading(null);
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

  if (error || !teacher) {
    return (
      <Layout schoolName={'SMS'} principalName={"User"} onLogout={logout}>
        <div style={{ padding: '32px' }}>
          <ErrorState message={error || 'Teacher not found'} onRetry={loadTeacher} />
        </div>
      </Layout>
    );
  }

  return (
    <Layout schoolName={'SMS'} principalName={"User"} onLogout={logout}>
      <div style={{ padding: '32px' }}>
        <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Button variant="secondary" onClick={() => navigate('/teachers')}>
              <ArrowLeft size={16} />
            </Button>
            <div>
              <h1 style={{ fontSize: '28px', fontWeight: 600, color: '#0f172a', marginBottom: '4px' }}>
                {teacher.full_name}
              </h1>
              <p style={{ fontSize: '14px', color: '#64748b' }}>
                {teacher.employee_code} • {teacher.user.login_id}
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <Button variant="secondary" onClick={() => navigate(`/teachers/${id}/edit`)}>
              <Edit size={16} style={{ marginRight: '8px' }} />
              Edit
            </Button>
            {teacher.user.status === 'active' ? (
              <Button
                variant="secondary"
                onClick={handleDisable}
                disabled={actionLoading === 'disable'}
                style={{ color: '#dc2626' }}
              >
                <Power size={16} style={{ marginRight: '8px' }} />
                {actionLoading === 'disable' ? 'Disabling...' : 'Disable'}
              </Button>
            ) : (
              <Button
                variant="secondary"
                onClick={handleReactivate}
                disabled={actionLoading === 'reactivate'}
                style={{ color: '#16a34a' }}
              >
                <Power size={16} style={{ marginRight: '8px' }} />
                {actionLoading === 'reactivate' ? 'Reactivating...' : 'Reactivate'}
              </Button>
            )}
            <Button
              variant="secondary"
              onClick={handleResetPassword}
              disabled={actionLoading === 'reset'}
            >
              <RefreshCw size={16} style={{ marginRight: '8px' }} />
              {actionLoading === 'reset' ? 'Resetting...' : 'Reset Password'}
            </Button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px' }}>
          {/* Personal Information */}
          <Card>
            <div style={{ padding: '24px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#0f172a', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <User size={20} />
                Personal Information
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <InfoField label="Full Name" value={teacher.full_name} />
                <InfoField label="Employee Code" value={teacher.employee_code} />
                <InfoField label="Date of Birth" value={teacher.date_of_birth || '—'} />
                <InfoField label="Joining Date" value={teacher.joining_date || '—'} />
                <InfoField label="Phone" value={teacher.phone || '—'} />
              </div>
            </div>
          </Card>

          {/* Account Information */}
          <Card>
            <div style={{ padding: '24px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#0f172a', marginBottom: '16px' }}>
                Account Information
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <InfoField label="Login ID" value={teacher.user.login_id} />
                <InfoField label="Role" value={teacher.user.role.charAt(0).toUpperCase() + teacher.user.role.slice(1)} />
                <InfoField 
                  label="Status" 
                  value={
                    <span style={{
                      padding: '4px 8px',
                      borderRadius: '4px',
                      fontSize: '12px',
                      fontWeight: 500,
                      background: teacher.user.status === 'active' ? '#dcfce7' : '#f1f5f9',
                      color: teacher.user.status === 'active' ? '#166534' : '#64748b',
                    }}>
                      {teacher.user.status}
                    </span>
                  } 
                />
                <InfoField 
                  label="Must Change Password" 
                  value={teacher.user.must_change_password ? 'Yes' : 'No'} 
                />
              </div>
            </div>
          </Card>
        </div>
      </div>
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





