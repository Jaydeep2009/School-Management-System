/**
 * Teacher Form Page
 * Create and edit teachers
 */

import { useState, useEffect, FormEvent } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Layout } from '../components/layout/Layout';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { useAuth } from '../hooks/useAuth';
import { apiService } from '../services/api';
import { ArrowLeft, Save, Copy, Check } from 'lucide-react';

interface TeacherFormData {
  first_name: string;
  middle_name?: string;
  last_name: string;
  phone?: string;
  date_of_birth?: string;
  joining_date?: string;
}

export function TeacherForm() {
  const { id } = useParams<{ id: string }>();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const isEditMode = id && id !== 'new';

  const [formData, setFormData] = useState<TeacherFormData>({
    first_name: '',
    middle_name: '',
    last_name: '',
    phone: '',
    date_of_birth: '',
    joining_date: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showCredentials, setShowCredentials] = useState(false);
  const [credentials, setCredentials] = useState<{ login_id: string; temporary_password: string; profile_id: string } | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  useEffect(() => {
    if (isEditMode) {
      loadTeacher();
    }
  }, [id]);

  const loadTeacher = async () => {
    if (!id) return;
    try {
      setIsLoading(true);
      const response = await apiService.getTeacher(id);
      const teacher = response.data;
      setFormData({
        first_name: teacher.first_name || '',
        middle_name: teacher.middle_name || '',
        last_name: teacher.last_name || '',
        phone: teacher.phone || '',
        date_of_birth: teacher.date_of_birth || '',
        joining_date: teacher.joining_date || '',
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load teacher');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!formData.first_name.trim()) {
      setError('First name is required');
      return;
    }
    if (!formData.last_name.trim()) {
      setError('Last name is required');
      return;
    }
    if (!isEditMode && !formData.phone) {
      setError('Phone is required for new teachers');
      return;
    }
    if (!isEditMode && !formData.date_of_birth) {
      setError('Date of birth is required for new teachers');
      return;
    }
    if (!isEditMode && !formData.joining_date) {
      setError('Joining date is required for new teachers');
      return;
    }

    setIsSubmitting(true);

    try {
      if (isEditMode && id) {
        // Update existing teacher
        await apiService.updateTeacher(id, formData);
        navigate(`/teachers/${id}`);
      } else {
        // Create new teacher
        const response = await apiService.createTeacher(formData);
        const createdCredentials = response.data;
        
        // Show credentials modal
        setCredentials(createdCredentials);
        setShowCredentials(true);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save teacher');
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleCloseCredentials = () => {
    setShowCredentials(false);
    if (credentials) {
      navigate(`/teachers/${credentials.profile_id}`);
    }
  };

  const updateField = (field: keyof TeacherFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  if (!user) return null;

  if (isLoading) {
    return (
      <Layout schoolName={'SMS'} principalName={"User"} onLogout={logout}>
        <div style={{ padding: '32px', textAlign: 'center' }}>Loading...</div>
      </Layout>
    );
  }

  return (
    <Layout schoolName={'SMS'} principalName={"User"} onLogout={logout}>
      <div style={{ padding: '32px', maxWidth: '800px', margin: '0 auto' }}>
        {/* Credentials Modal */}
        {showCredentials && credentials && (
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
              borderRadius: '12px',
              padding: '32px',
              maxWidth: '500px',
              width: '90%',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
            }}>
              <h2 style={{ fontSize: '24px', fontWeight: 600, color: '#0f172a', marginBottom: '8px' }}>
                ✅ Teacher Created Successfully
              </h2>
              <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '24px' }}>
                Save these credentials and share them with the teacher. They will need to change their password on first login.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* Login ID */}
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: '#64748b', marginBottom: '6px' }}>
                    Login ID
                  </label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                      type="text"
                      value={credentials.login_id}
                      readOnly
                      style={{
                        flex: 1,
                        padding: '10px 12px',
                        fontSize: '14px',
                        fontFamily: 'monospace',
                        border: '1px solid #e2e8f0',
                        borderRadius: '6px',
                        background: '#f8fafc',
                      }}
                    />
                    <Button
                      variant="secondary"
                      onClick={() => copyToClipboard(credentials.login_id, 'loginId')}
                      style={{ padding: '10px 16px' }}
                    >
                      {copiedField === 'loginId' ? <Check size={16} /> : <Copy size={16} />}
                    </Button>
                  </div>
                </div>

                {/* Temporary Password */}
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: '#64748b', marginBottom: '6px' }}>
                    Temporary Password
                  </label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                      type="text"
                      value={credentials.temporary_password}
                      readOnly
                      style={{
                        flex: 1,
                        padding: '10px 12px',
                        fontSize: '14px',
                        fontFamily: 'monospace',
                        border: '1px solid #e2e8f0',
                        borderRadius: '6px',
                        background: '#f8fafc',
                      }}
                    />
                    <Button
                      variant="secondary"
                      onClick={() => copyToClipboard(credentials.temporary_password, 'password')}
                      style={{ padding: '10px 16px' }}
                    >
                      {copiedField === 'password' ? <Check size={16} /> : <Copy size={16} />}
                    </Button>
                  </div>
                </div>
              </div>

              <div style={{
                marginTop: '24px',
                padding: '12px',
                background: '#fef3c7',
                border: '1px solid #fde68a',
                borderRadius: '6px',
              }}>
                <p style={{ fontSize: '13px', color: '#92400e', margin: 0 }}>
                  ⚠️ <strong>Important:</strong> These credentials will not be shown again. Make sure to save them before closing this window.
                </p>
              </div>

              <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end' }}>
                <Button onClick={handleCloseCredentials}>
                  I've Saved the Credentials
                </Button>
              </div>
            </div>
          </div>
        )}

        <div style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Button variant="secondary" onClick={() => navigate('/teachers')}>
            <ArrowLeft size={16} />
          </Button>
          <div>
            <h1 style={{ fontSize: '28px', fontWeight: 600, color: '#0f172a' }}>
              {isEditMode ? 'Edit Teacher' : 'Add New Teacher'}
            </h1>
            <p style={{ fontSize: '14px', color: '#64748b' }}>
              {isEditMode ? 'Update teacher information' : 'Create a new teacher account'}
            </p>
          </div>
        </div>

        <Card>
          <form onSubmit={handleSubmit} style={{ padding: '24px' }}>
            {error && (
              <div style={{
                padding: '12px',
                background: '#fee2e2',
                border: '1px solid #fecaca',
                borderRadius: '6px',
                color: '#dc2626',
                marginBottom: '24px',
                fontSize: '14px',
              }}>
                {error}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Name Fields */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                <div>
                  <label htmlFor="first_name" style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#0f172a', marginBottom: '6px' }}>
                    First Name <span style={{ color: '#dc2626' }}>*</span>
                  </label>
                  <input
                    id="first_name"
                    type="text"
                    value={formData.first_name}
                    onChange={(e) => updateField('first_name', e.target.value)}
                    disabled={isSubmitting}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      fontSize: '14px',
                      border: '1px solid #e2e8f0',
                      borderRadius: '6px',
                      outline: 'none',
                    }}
                    required
                  />
                </div>

                <div>
                  <label htmlFor="middle_name" style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#0f172a', marginBottom: '6px' }}>
                    Middle Name
                  </label>
                  <input
                    id="middle_name"
                    type="text"
                    value={formData.middle_name}
                    onChange={(e) => updateField('middle_name', e.target.value)}
                    disabled={isSubmitting}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      fontSize: '14px',
                      border: '1px solid #e2e8f0',
                      borderRadius: '6px',
                      outline: 'none',
                    }}
                  />
                </div>

                <div>
                  <label htmlFor="last_name" style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#0f172a', marginBottom: '6px' }}>
                    Last Name <span style={{ color: '#dc2626' }}>*</span>
                  </label>
                  <input
                    id="last_name"
                    type="text"
                    value={formData.last_name}
                    onChange={(e) => updateField('last_name', e.target.value)}
                    disabled={isSubmitting}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      fontSize: '14px',
                      border: '1px solid #e2e8f0',
                      borderRadius: '6px',
                      outline: 'none',
                    }}
                    required
                  />
                </div>
              </div>

              {/* Contact Information */}
              <div>
                <label htmlFor="phone" style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#0f172a', marginBottom: '6px' }}>
                  Phone {!isEditMode && <span style={{ color: '#dc2626' }}>*</span>}
                </label>
                <input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => updateField('phone', e.target.value)}
                  disabled={isSubmitting}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    fontSize: '14px',
                    border: '1px solid #e2e8f0',
                    borderRadius: '6px',
                    outline: 'none',
                  }}
                  required={!isEditMode}
                />
              </div>

              {/* Dates */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label htmlFor="date_of_birth" style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#0f172a', marginBottom: '6px' }}>
                    Date of Birth {!isEditMode && <span style={{ color: '#dc2626' }}>*</span>}
                  </label>
                  <input
                    id="date_of_birth"
                    type="date"
                    value={formData.date_of_birth}
                    onChange={(e) => updateField('date_of_birth', e.target.value)}
                    disabled={isSubmitting}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      fontSize: '14px',
                      border: '1px solid #e2e8f0',
                      borderRadius: '6px',
                      outline: 'none',
                    }}
                    required={!isEditMode}
                  />
                </div>

                <div>
                  <label htmlFor="joining_date" style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#0f172a', marginBottom: '6px' }}>
                    Joining Date {!isEditMode && <span style={{ color: '#dc2626' }}>*</span>}
                  </label>
                  <input
                    id="joining_date"
                    type="date"
                    value={formData.joining_date}
                    onChange={(e) => updateField('joining_date', e.target.value)}
                    disabled={isSubmitting}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      fontSize: '14px',
                      border: '1px solid #e2e8f0',
                      borderRadius: '6px',
                      outline: 'none',
                    }}
                    required={!isEditMode}
                  />
                </div>
              </div>

              {/* Form Actions */}
              <div style={{ display: 'flex', gap: '12px', paddingTop: '16px', borderTop: '1px solid #e2e8f0' }}>
                <Button type="submit" disabled={isSubmitting}>
                  <Save size={16} style={{ marginRight: '8px' }} />
                  {isSubmitting ? 'Saving...' : isEditMode ? 'Update Teacher' : 'Create Teacher'}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => navigate(isEditMode && id ? `/teachers/${id}` : '/teachers')}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </form>
        </Card>
      </div>
    </Layout>
  );
}





