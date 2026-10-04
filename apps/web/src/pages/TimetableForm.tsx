/**
 * Timetable Form - Create and Edit Timetables
 */

import { useState, useEffect, FormEvent } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Layout } from '../components/layout/Layout';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { useAuth } from '../hooks/useAuth';
import { apiService } from '../services/api';
import { ArrowLeft, Save } from 'lucide-react';

interface TimetableFormData {
  academic_year_id: string;
  classroom_id: string;
  name: string;
  effective_from: string;
  effective_until: string;
}

export function TimetableForm() {
  const { id } = useParams<{ id: string }>();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const isEditMode = id && id !== 'new';

  const [formData, setFormData] = useState<TimetableFormData>({
    academic_year_id: '',
    classroom_id: '',
    name: '',
    effective_from: '',
    effective_until: '',
  });

  const [academicYears, setAcademicYears] = useState<any[]>([]);
  const [classrooms, setClassrooms] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (isEditMode && id) {
      loadTimetable();
    }
  }, [id, isEditMode]);

  const loadData = async () => {
    try {
      const [yearsRes, classroomsRes] = await Promise.all([
        apiService.getAcademicYears(),
        apiService.getClassrooms(),
      ]);
      
      setAcademicYears(yearsRes.data);
      setClassrooms(classroomsRes.data);

      const currentYear = yearsRes.data.find((y: any) => y.is_current);
      if (currentYear) {
        setFormData(prev => ({ ...prev, academic_year_id: currentYear.id }));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    }
  };

  const loadTimetable = async () => {
    if (!id) return;
    try {
      setIsLoading(true);
      const response = await apiService.getTimetable(id);
      const timetable = response.data;
      setFormData({
        academic_year_id: timetable.academic_year_id || '',
        classroom_id: timetable.classroom_id || '',
        name: timetable.name || '',
        effective_from: timetable.effective_from ? new Date(timetable.effective_from).toISOString().split('T')[0] : '',
        effective_until: timetable.effective_until ? new Date(timetable.effective_until).toISOString().split('T')[0] : '',
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load timetable');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.academic_year_id) {
      setError('Academic year is required');
      return;
    }
    if (!formData.classroom_id) {
      setError('Classroom is required');
      return;
    }
    if (!formData.name.trim()) {
      setError('Timetable name is required');
      return;
    }

    setIsSubmitting(true);

    try {
      const submitData = {
        ...formData,
        effective_from: formData.effective_from ? new Date(formData.effective_from).getTime() : undefined,
        effective_until: formData.effective_until ? new Date(formData.effective_until).getTime() : undefined,
      };

      if (isEditMode && id) {
        await apiService.updateTimetable(id, submitData);
        navigate(`/timetable/${id}`);
      } else {
        const response = await apiService.createTimetable(submitData);
        // Navigate to builder for new timetables
        navigate(`/timetable/builder/${response.data.id}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save timetable');
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateField = (field: keyof TimetableFormData, value: string) => {
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

  const filteredClassrooms = classrooms.filter(c => 
    !formData.academic_year_id || c.academic_year_id === formData.academic_year_id
  );

  return (
    <Layout schoolName={'SMS'} principalName={"User"} onLogout={logout}>
      <div style={{ padding: '32px', maxWidth: '800px', margin: '0 auto' }}>
        <div style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Button variant="secondary" onClick={() => navigate('/timetable')}>
            <ArrowLeft size={16} />
          </Button>
          <div>
            <h1 style={{ fontSize: '28px', fontWeight: 600, color: '#0f172a' }}>
              {isEditMode ? 'Edit Timetable' : 'Create Timetable'}
            </h1>
            <p style={{ fontSize: '14px', color: '#64748b' }}>
              {isEditMode ? 'Update timetable details' : 'Create a new timetable'}
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
              {/* Academic Year */}
              <div>
                <label htmlFor="academic_year_id" style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#0f172a', marginBottom: '6px' }}>
                  Academic Year <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <select
                  id="academic_year_id"
                  value={formData.academic_year_id}
                  onChange={(e) => updateField('academic_year_id', e.target.value)}
                  disabled={isSubmitting || !!isEditMode}
                  required
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    fontSize: '14px',
                    border: '1px solid #e2e8f0',
                    borderRadius: '6px',
                  }}
                >
                  <option value="">Select Academic Year</option>
                  {academicYears.map(year => (
                    <option key={year.id} value={year.id}>{year.label}</option>
                  ))}
                </select>
              </div>

              {/* Classroom */}
              <div>
                <label htmlFor="classroom_id" style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#0f172a', marginBottom: '6px' }}>
                  Classroom <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <select
                  id="classroom_id"
                  value={formData.classroom_id}
                  onChange={(e) => updateField('classroom_id', e.target.value)}
                  disabled={isSubmitting || !!isEditMode}
                  required
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    fontSize: '14px',
                    border: '1px solid #e2e8f0',
                    borderRadius: '6px',
                  }}
                >
                  <option value="">Select Classroom</option>
                  {filteredClassrooms.map(classroom => (
                    <option key={classroom.id} value={classroom.id}>
                      {classroom.name || classroom.classroom_name || classroom.code || 'Unnamed Classroom'}
                    </option>
                  ))}
                </select>
              </div>

              {/* Timetable Name */}
              <div>
                <label htmlFor="name" style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#0f172a', marginBottom: '6px' }}>
                  Timetable Name <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <input
                  id="name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => updateField('name', e.target.value)}
                  disabled={isSubmitting}
                  placeholder="e.g., Spring 2024"
                  required
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    fontSize: '14px',
                    border: '1px solid #e2e8f0',
                    borderRadius: '6px',
                  }}
                />
              </div>

              {/* Date Range */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label htmlFor="effective_from" style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#0f172a', marginBottom: '6px' }}>
                    Effective From
                  </label>
                  <input
                    id="effective_from"
                    type="date"
                    value={formData.effective_from}
                    onChange={(e) => updateField('effective_from', e.target.value)}
                    disabled={isSubmitting}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      fontSize: '14px',
                      border: '1px solid #e2e8f0',
                      borderRadius: '6px',
                    }}
                  />
                </div>

                <div>
                  <label htmlFor="effective_until" style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#0f172a', marginBottom: '6px' }}>
                    Effective Until
                  </label>
                  <input
                    id="effective_until"
                    type="date"
                    value={formData.effective_until}
                    onChange={(e) => updateField('effective_until', e.target.value)}
                    disabled={isSubmitting}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      fontSize: '14px',
                      border: '1px solid #e2e8f0',
                      borderRadius: '6px',
                    }}
                  />
                </div>
              </div>

              {/* Form Actions */}
              <div style={{ display: 'flex', gap: '12px', paddingTop: '16px', borderTop: '1px solid #e2e8f0' }}>
                <Button type="submit" disabled={isSubmitting}>
                  <Save size={16} style={{ marginRight: '8px' }} />
                  {isSubmitting ? 'Saving...' : isEditMode ? 'Update Timetable' : 'Create Timetable'}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => navigate(isEditMode && id ? `/timetable/${id}` : '/timetable')}
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





