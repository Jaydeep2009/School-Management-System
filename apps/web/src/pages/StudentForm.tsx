/**
 * Student Form Page
 * Create and edit students
 */

import { useState, useEffect, FormEvent } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Layout } from '../components/layout/Layout';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { useAuth } from '../hooks/useAuth';
import { apiService } from '../services/api';
import { ArrowLeft, Save } from 'lucide-react';

interface StudentFormData {
  admission_number: string;
  first_name: string;
  middle_name?: string;
  last_name: string;
  gender?: 'male' | 'female' | 'other';
  date_of_birth?: string;
  phone?: string;
  email?: string;
  address?: string;
  parent_name?: string;
  parent_phone?: string;
}

export function StudentForm() {
  const { id } = useParams<{ id: string }>();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const isEditMode = id && id !== 'new';

  const [formData, setFormData] = useState<StudentFormData>({
    admission_number: '',
    first_name: '',
    middle_name: '',
    last_name: '',
    gender: undefined,
    date_of_birth: '',
    phone: '',
    email: '',
    address: '',
    parent_name: '',
    parent_phone: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isEditMode) {
      loadStudent();
    }
  }, [id]);

  const loadStudent = async () => {
    if (!id) return;
    try {
      setIsLoading(true);
      const response = await apiService.getStudent(id);
      const student = response.data;
      setFormData({
        admission_number: student.admission_number || '',
        first_name: student.first_name || '',
        middle_name: student.middle_name || '',
        last_name: student.last_name || '',
        gender: student.gender,
        date_of_birth: student.date_of_birth || '',
        phone: student.phone || '',
        email: student.email || '',
        address: student.address || '',
        parent_name: student.parent_name || '',
        parent_phone: student.parent_phone || '',
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load student');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!formData.admission_number.trim()) {
      setError('Admission number is required');
      return;
    }
    if (!formData.first_name.trim()) {
      setError('First name is required');
      return;
    }
    if (!formData.last_name.trim()) {
      setError('Last name is required');
    }

    setIsSubmitting(true);

    try {
      if (isEditMode && id) {
        // Update existing student
        await apiService.updateStudent(id, formData);
        navigate(`/students/${id}`);
      } else {
        // Create new student
        const response = await apiService.createStudent(formData);
        const credentials = response.data;
        
        // Show credentials dialog
        alert(
          `Student created successfully!\n\n` +
          `Login ID: ${credentials.login_id}\n` +
          `Temporary Password: ${credentials.temporary_password}\n\n` +
          `Please save these credentials and share with the student.`
        );
        
        navigate(`/students/${credentials.profile_id}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save student');
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateField = (field: keyof StudentFormData, value: any) => {
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
          <Button variant="secondary" onClick={() => navigate('/students')}>
            <ArrowLeft size={16} />
          </Button>
          <div>
            <h1 style={{ fontSize: '28px', fontWeight: 600, color: '#0f172a' }}>
              {isEditMode ? 'Edit Student' : 'Add New Student'}
            </h1>
            <p style={{ fontSize: '14px', color: '#64748b' }}>
              {isEditMode ? 'Update student information' : 'Create a new student account'}
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
              {/* Admission Number */}
              <div>
                <label htmlFor="admission_number" style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#0f172a', marginBottom: '6px' }}>
                  Admission Number <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <input
                  id="admission_number"
                  type="text"
                  value={formData.admission_number}
                  onChange={(e) => updateField('admission_number', e.target.value)}
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

              {/* Gender and DOB */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label htmlFor="gender" style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#0f172a', marginBottom: '6px' }}>
                    Gender
                  </label>
                  <select
                    id="gender"
                    value={formData.gender || ''}
                    onChange={(e) => updateField('gender', e.target.value || undefined)}
                    disabled={isSubmitting}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      fontSize: '14px',
                      border: '1px solid #e2e8f0',
                      borderRadius: '6px',
                      outline: 'none',
                      background: 'white',
                    }}
                  >
                    <option value="">Select gender</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="date_of_birth" style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#0f172a', marginBottom: '6px' }}>
                    Date of Birth
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
                  />
                </div>
              </div>

              {/* Contact Information */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label htmlFor="phone" style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#0f172a', marginBottom: '6px' }}>
                    Phone
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
                  />
                </div>

                <div>
                  <label htmlFor="email" style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#0f172a', marginBottom: '6px' }}>
                    Email
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => updateField('email', e.target.value)}
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
              </div>

              {/* Address */}
              <div>
                <label htmlFor="address" style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#0f172a', marginBottom: '6px' }}>
                  Address
                </label>
                <textarea
                  id="address"
                  value={formData.address}
                  onChange={(e) => updateField('address', e.target.value)}
                  disabled={isSubmitting}
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    fontSize: '14px',
                    border: '1px solid #e2e8f0',
                    borderRadius: '6px',
                    outline: 'none',
                    resize: 'vertical',
                  }}
                />
              </div>

              {/* Parent Information */}
              <div style={{ paddingTop: '16px', borderTop: '1px solid #e2e8f0' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#0f172a', marginBottom: '16px' }}>
                  Parent/Guardian Information
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label htmlFor="parent_name" style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#0f172a', marginBottom: '6px' }}>
                      Parent Name
                    </label>
                    <input
                      id="parent_name"
                      type="text"
                      value={formData.parent_name}
                      onChange={(e) => updateField('parent_name', e.target.value)}
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
                    <label htmlFor="parent_phone" style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#0f172a', marginBottom: '6px' }}>
                      Parent Phone
                    </label>
                    <input
                      id="parent_phone"
                      type="tel"
                      value={formData.parent_phone}
                      onChange={(e) => updateField('parent_phone', e.target.value)}
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
                </div>
              </div>

              {/* Form Actions */}
              <div style={{ display: 'flex', gap: '12px', paddingTop: '16px', borderTop: '1px solid #e2e8f0' }}>
                <Button type="submit" disabled={isSubmitting}>
                  <Save size={16} style={{ marginRight: '8px' }} />
                  {isSubmitting ? 'Saving...' : isEditMode ? 'Update Student' : 'Create Student'}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => navigate(isEditMode && id ? `/students/${id}` : '/students')}
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





