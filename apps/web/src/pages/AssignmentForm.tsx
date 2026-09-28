/**
 * Assignment Form Page - Create and Edit Assignments
 */

import { useState, useEffect, FormEvent } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Layout } from '../components/layout/Layout';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { useAuth } from '../hooks/useAuth';
import { useAcademicYear } from '../contexts/AcademicYearContext';
import { apiService } from '../services/api';
import { ArrowLeft, Save } from 'lucide-react';

interface AssignmentFormData {
  classroom_id: string;
  subject_id: string;
  title: string;
  description: string;
  due_date: string;
}

export function AssignmentForm() {
  const { id } = useParams<{ id: string }>();
  const { user, logout } = useAuth();
  const { selectedYear } = useAcademicYear();
  const navigate = useNavigate();
  const isEditMode = id && id !== 'new';

  const [formData, setFormData] = useState<AssignmentFormData>({
    classroom_id: '',
    subject_id: '',
    title: '',
    description: '',
    due_date: '',
  });

  const [academicYears, setAcademicYears] = useState<any[]>([]);
  const [classrooms, setClassrooms] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [selectedAcademicYear, setSelectedAcademicYear] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (isEditMode && id) {
      loadAssignment();
    }
  }, [id, isEditMode]);

  const loadData = async () => {
    try {
      const classroomParams = selectedYear?.id ? { academic_year_id: selectedYear.id } : {};
      const [yearsRes, classroomsRes, subjectsRes] = await Promise.all([
        apiService.getAcademicYears(),
        apiService.getClassrooms(classroomParams),
        apiService.getSubjects(),
      ]);
      
      setAcademicYears(yearsRes.data);
      setClassrooms(classroomsRes.data);
      setSubjects(subjectsRes.data);

      const currentYear = yearsRes.data.find((y: any) => y.is_current);
      if (currentYear) {
        setSelectedAcademicYear(currentYear.id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    }
  };

  const loadAssignment = async () => {
    if (!id) return;
    try {
      setIsLoading(true);
      const response = await apiService.getAssignment(id);
      const assignment = response.data;
      setFormData({
        classroom_id: assignment.classroom_id || '',
        subject_id: assignment.subject_id || '',
        title: assignment.title || '',
        description: assignment.description || '',
        due_date: assignment.due_date ? new Date(assignment.due_date).toISOString().split('T')[0] : '',
      });
      setSelectedAcademicYear(assignment.academic_year_id || '');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load assignment');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.classroom_id) {
      setError('Classroom is required');
      return;
    }
    if (!formData.subject_id) {
      setError('Subject is required');
      return;
    }
    if (!formData.title.trim()) {
      setError('Assignment title is required');
      return;
    }

    setIsSubmitting(true);

    try {
      // Prepare data with academic_year_id
      const submitData = {
        ...formData,
        academic_year_id: selectedYear?.id || selectedAcademicYear,
        due_at: formData.due_date ? new Date(formData.due_date).getTime() : undefined,
      };

      if (isEditMode && id) {
        await apiService.updateAssignment(id, submitData);
        navigate(`/assignments/${id}`);
      } else {
        const response = await apiService.createAssignment(submitData);
        navigate(`/assignments/${response.data.id}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save assignment');
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateField = (field: keyof AssignmentFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  if (!user) return null;

  if (!selectedYear) {
    return (
      <Layout schoolName={'SMS'} principalName={"User"} onLogout={logout}>
        <div style={{ padding: '32px', textAlign: 'center', color: '#64748b' }}>
          <p style={{ fontSize: '16px', marginBottom: '8px' }}>Please select an academic year</p>
          <p style={{ fontSize: '14px' }}>Use the dropdown in the header to select a year</p>
        </div>
      </Layout>
    );
  }

  if (isLoading) {
    return (
      <Layout schoolName={'SMS'} principalName={"User"} onLogout={logout}>
        <div style={{ padding: '32px', textAlign: 'center' }}>Loading...</div>
      </Layout>
    );
  }

  const filteredClassrooms = classrooms.filter(c => 
    !selectedAcademicYear || c.academic_year_id === selectedAcademicYear
  );

  return (
    <Layout schoolName={'SMS'} principalName={"User"} onLogout={logout}>
      <div style={{ padding: '32px', maxWidth: '800px', margin: '0 auto' }}>
        <div style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Button variant="secondary" onClick={() => navigate('/assignments')}>
            <ArrowLeft size={16} />
          </Button>
          <div>
            <h1 style={{ fontSize: '28px', fontWeight: 600, color: '#0f172a' }}>
              {isEditMode ? 'Edit Assignment' : 'Create Assignment'}
            </h1>
            <p style={{ fontSize: '14px', color: '#64748b' }}>
              {isEditMode ? 'Update assignment details' : 'Create a new assignment'}
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
              {/* Academic Year (for filtering) */}
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#0f172a', marginBottom: '6px' }}>
                  Academic Year
                </label>
                <select
                  value={selectedAcademicYear}
                  onChange={(e) => setSelectedAcademicYear(e.target.value)}
                  disabled={isSubmitting || !!isEditMode}
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
                    <option key={classroom.id} value={classroom.id}>{classroom.classroom_name}</option>
                  ))}
                </select>
              </div>

              {/* Subject */}
              <div>
                <label htmlFor="subject_id" style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#0f172a', marginBottom: '6px' }}>
                  Subject <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <select
                  id="subject_id"
                  value={formData.subject_id}
                  onChange={(e) => updateField('subject_id', e.target.value)}
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
                  <option value="">Select Subject</option>
                  {subjects.map(subject => (
                    <option key={subject.id} value={subject.id}>{subject.subject_name}</option>
                  ))}
                </select>
              </div>

              {/* Title */}
              <div>
                <label htmlFor="title" style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#0f172a', marginBottom: '6px' }}>
                  Title <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <input
                  id="title"
                  type="text"
                  value={formData.title}
                  onChange={(e) => updateField('title', e.target.value)}
                  disabled={isSubmitting}
                  placeholder="e.g., Chapter 5 Homework"
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

              {/* Description */}
              <div>
                <label htmlFor="description" style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#0f172a', marginBottom: '6px' }}>
                  Description
                </label>
                <textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => updateField('description', e.target.value)}
                  disabled={isSubmitting}
                  placeholder="Assignment instructions and details"
                  rows={5}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    fontSize: '14px',
                    border: '1px solid #e2e8f0',
                    borderRadius: '6px',
                    fontFamily: 'inherit',
                    resize: 'vertical',
                  }}
                />
              </div>

              {/* Due Date */}
              <div>
                <label htmlFor="due_date" style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#0f172a', marginBottom: '6px' }}>
                  Due Date
                </label>
                <input
                  id="due_date"
                  type="date"
                  value={formData.due_date}
                  onChange={(e) => updateField('due_date', e.target.value)}
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

              {/* Form Actions */}
              <div style={{ display: 'flex', gap: '12px', paddingTop: '16px', borderTop: '1px solid #e2e8f0' }}>
                <Button type="submit" disabled={isSubmitting}>
                  <Save size={16} style={{ marginRight: '8px' }} />
                  {isSubmitting ? 'Saving...' : isEditMode ? 'Update Assignment' : 'Create Assignment'}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => navigate(isEditMode && id ? `/assignments/${id}` : '/assignments')}
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






