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
import { ArrowLeft, Save } from 'lucide-react';

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
        const credentials = response.data;
        
        // Show credentials dialog
        alert(
          `Teacher created successfully!\n\n` +
          `Login ID: ${credentials.login_id}\n` +
          `Temporary Password: ${credentials.temporary_password}\n\n` +
          `Please save these credentials and share with the teacher.`
        );
        
        navigate(`/teachers/${credentials.profile_id}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save teacher');
    } finally {
      setIsSubmitting(false);
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





