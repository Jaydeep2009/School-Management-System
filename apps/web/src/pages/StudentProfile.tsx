/**
 * Student Profile Page
 * 
 * Shows:
 * - Read-only profile information (name, class, admission number, etc.)
 * - Change password form
 */

import { useState, useEffect } from 'react';
import { Layout } from '../components/layout/Layout';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Skeleton } from '../components/ui/Skeleton';
import { ErrorState } from '../components/ui/ErrorState';
import { useAuth } from '../hooks/useAuth';
import { apiService } from '../services/api';
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Calendar,
  Users,
  GraduationCap,
  Lock,
  Eye,
  EyeOff,
  CheckCircle
} from 'lucide-react';

export function StudentProfile() {
  const { user, logout } = useAuth();
  
  const [profile, setProfile] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const profileRes = await apiService.getStudentMe();
      // Extract the nested profile object
      setProfile(profileRes.data?.profile || profileRes.data);
    } catch (err) {
      console.error('Failed to load profile:', err);
      setError(err instanceof Error ? err.message : 'Failed to load profile');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setPasswordError(null);
    setPasswordSuccess(false);

    // Validation
    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError('All fields are required');
      return;
    }

    if (newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match');
      return;
    }

    if (currentPassword === newPassword) {
      setPasswordError('New password must be different from current password');
      return;
    }

    try {
      setIsChangingPassword(true);
      
      await apiService.changeStudentPassword({
        current_password: currentPassword,
        new_password: newPassword
      });

      setPasswordSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');

      // Auto-hide success message after 3 seconds
      setTimeout(() => setPasswordSuccess(false), 3000);
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : 'Failed to change password');
    } finally {
      setIsChangingPassword(false);
    }
  };

  if (!user) return null;

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
            My Profile
          </h1>
          <p style={{ fontSize: '14px', color: '#64748b' }}>
            View your account information and manage your password
          </p>
        </div>

        {error && !isLoading && (
          <ErrorState message={error} onRetry={loadData} />
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
          {/* Profile Information */}
          <Card>
            <div style={{ padding: '24px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#0f172a', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <User size={20} />
                Personal Information
              </h2>

              {isLoading ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} height="60px" />)}
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {/* Name */}
                  <div style={{ padding: '16px', background: '#f8fafc', borderRadius: '8px' }}>
                    <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px', fontWeight: 500 }}>
                      Full Name
                    </div>
                    <div style={{ fontSize: '16px', color: '#0f172a', fontWeight: 600 }}>
                      {profile?.full_name || '-'}
                    </div>
                  </div>

                  {/* Student Code */}
                  <div style={{ padding: '16px', background: '#f8fafc', borderRadius: '8px' }}>
                    <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <GraduationCap size={14} />
                      Student Code
                    </div>
                    <div style={{ fontSize: '16px', color: '#0f172a', fontWeight: 600, fontFamily: 'monospace' }}>
                      {profile?.student_code || '-'}
                    </div>
                  </div>

                  {/* Admission Number */}
                  <div style={{ padding: '16px', background: '#f8fafc', borderRadius: '8px' }}>
                    <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px', fontWeight: 500 }}>
                      Admission Number
                    </div>
                    <div style={{ fontSize: '16px', color: '#0f172a', fontWeight: 600, fontFamily: 'monospace' }}>
                      {profile?.admission_number || '-'}
                    </div>
                  </div>

                  {/* Class */}
                  <div style={{ padding: '16px', background: '#dbeafe', borderRadius: '8px' }}>
                    <div style={{ fontSize: '12px', color: '#1e40af', marginBottom: '4px', fontWeight: 500 }}>
                      Current Class
                    </div>
                    <div style={{ fontSize: '16px', color: '#0f172a', fontWeight: 600 }}>
                      {profile?.classroom_code || '-'}
                    </div>
                    {profile?.roll_number && (
                      <div style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>
                        Roll No: {profile.roll_number}
                      </div>
                    )}
                  </div>

                  {/* Gender & DOB */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div style={{ padding: '16px', background: '#f8fafc', borderRadius: '8px' }}>
                      <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px', fontWeight: 500 }}>
                        Gender
                      </div>
                      <div style={{ fontSize: '16px', color: '#0f172a', fontWeight: 600, textTransform: 'capitalize' }}>
                        {profile?.gender || '-'}
                      </div>
                    </div>
                    <div style={{ padding: '16px', background: '#f8fafc', borderRadius: '8px' }}>
                      <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Calendar size={14} />
                        Date of Birth
                      </div>
                      <div style={{ fontSize: '16px', color: '#0f172a', fontWeight: 600 }}>
                        {profile?.date_of_birth ? new Date(profile.date_of_birth).toLocaleDateString() : '-'}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </Card>

          {/* Contact Information & Parents */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Contact Info */}
            <Card>
              <div style={{ padding: '24px' }}>
                <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#0f172a', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Phone size={20} />
                  Contact Information
                </h2>

                {isLoading ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {[1, 2, 3].map(i => <Skeleton key={i} height="60px" />)}
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {/* Email */}
                    <div style={{ padding: '16px', background: '#f8fafc', borderRadius: '8px' }}>
                      <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Mail size={14} />
                        Email
                      </div>
                      <div style={{ fontSize: '15px', color: '#0f172a', fontWeight: 500 }}>
                        {profile?.email || '-'}
                      </div>
                    </div>

                    {/* Phone */}
                    <div style={{ padding: '16px', background: '#f8fafc', borderRadius: '8px' }}>
                      <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Phone size={14} />
                        Phone
                      </div>
                      <div style={{ fontSize: '15px', color: '#0f172a', fontWeight: 500, fontFamily: 'monospace' }}>
                        {profile?.phone || '-'}
                      </div>
                    </div>

                    {/* Address */}
                    {profile?.address && (
                      <div style={{ padding: '16px', background: '#f8fafc', borderRadius: '8px' }}>
                        <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <MapPin size={14} />
                          Address
                        </div>
                        <div style={{ fontSize: '14px', color: '#0f172a', lineHeight: '1.5' }}>
                          {profile.address}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </Card>

            {/* Parent Information */}
            <Card>
              <div style={{ padding: '24px' }}>
                <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#0f172a', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Users size={20} />
                  Parent/Guardian
                </h2>

                {isLoading ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {[1, 2].map(i => <Skeleton key={i} height="60px" />)}
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div style={{ padding: '16px', background: '#f8fafc', borderRadius: '8px' }}>
                      <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px', fontWeight: 500 }}>
                        Name
                      </div>
                      <div style={{ fontSize: '15px', color: '#0f172a', fontWeight: 600 }}>
                        {profile?.parent_name || '-'}
                      </div>
                    </div>

                    <div style={{ padding: '16px', background: '#f8fafc', borderRadius: '8px' }}>
                      <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px', fontWeight: 500 }}>
                        Phone
                      </div>
                      <div style={{ fontSize: '15px', color: '#0f172a', fontWeight: 500, fontFamily: 'monospace' }}>
                        {profile?.parent_phone || '-'}
                      </div>
                    </div>

                    {profile?.parent_email && (
                      <div style={{ padding: '16px', background: '#f8fafc', borderRadius: '8px' }}>
                        <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px', fontWeight: 500 }}>
                          Email
                        </div>
                        <div style={{ fontSize: '15px', color: '#0f172a', fontWeight: 500 }}>
                          {profile.parent_email}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </Card>
          </div>
        </div>

        {/* Change Password Section */}
        <div style={{ marginTop: '24px' }}>
        <Card>
          <div style={{ padding: '24px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#0f172a', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Lock size={20} />
              Change Password
            </h2>

            <form onSubmit={handleChangePassword} style={{ maxWidth: '500px' }}>
              {/* Current Password */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#0f172a', marginBottom: '8px' }}>
                  Current Password
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showCurrentPassword ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter current password"
                    style={{
                      width: '100%',
                      padding: '10px 40px 10px 12px',
                      border: '1px solid #e2e8f0',
                      borderRadius: '6px',
                      fontSize: '14px',
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    style={{
                      position: 'absolute',
                      right: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: '#64748b'
                    }}
                  >
                    {showCurrentPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {/* New Password */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#0f172a', marginBottom: '8px' }}>
                  New Password
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password (min 8 characters)"
                    style={{
                      width: '100%',
                      padding: '10px 40px 10px 12px',
                      border: '1px solid #e2e8f0',
                      borderRadius: '6px',
                      fontSize: '14px',
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    style={{
                      position: 'absolute',
                      right: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: '#64748b'
                    }}
                  >
                    {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#0f172a', marginBottom: '8px' }}>
                  Confirm New Password
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter new password"
                    style={{
                      width: '100%',
                      padding: '10px 40px 10px 12px',
                      border: '1px solid #e2e8f0',
                      borderRadius: '6px',
                      fontSize: '14px',
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    style={{
                      position: 'absolute',
                      right: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: '#64748b'
                    }}
                  >
                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {/* Error Message */}
              {passwordError && (
                <div style={{
                  padding: '12px',
                  background: '#fee2e2',
                  border: '1px solid #fecaca',
                  borderRadius: '6px',
                  color: '#dc2626',
                  fontSize: '14px',
                  marginBottom: '16px'
                }}>
                  {passwordError}
                </div>
              )}

              {/* Success Message */}
              {passwordSuccess && (
                <div style={{
                  padding: '12px',
                  background: '#dcfce7',
                  border: '1px solid #bbf7d0',
                  borderRadius: '6px',
                  color: '#16a34a',
                  fontSize: '14px',
                  marginBottom: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <CheckCircle size={18} />
                  Password changed successfully!
                </div>
              )}

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={isChangingPassword}
              >
                {isChangingPassword ? 'Changing Password...' : 'Change Password'}
              </Button>
            </form>
          </div>
        </Card>
        </div>
      </div>
    </Layout>
  );
}
