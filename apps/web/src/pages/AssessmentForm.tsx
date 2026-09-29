/**
 * Assessment Form Page - Create and Edit Assessments
 */

import { useState, useEffect, FormEvent } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Layout } from '../components/layout/Layout';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { useAuth } from '../hooks/useAuth';
import { apiService } from '../services/api';
import { ArrowLeft, Save } from 'lucide-react';

interface AssessmentFormData {
  classroom_id: string;
  subject_id: string;
  name: string;
  max_marks: number;
  weightage: number;
  held_on: string;
}

export function AssessmentForm() {
  console.log('=== AssessmentForm Component Loaded ===');
  const { id } = useParams<{ id: string }>();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const isEditMode = id && id !== 'new';

  const [formData, setFormData] = useState<AssessmentFormData>({
    classroom_id: '',
    subject_id: '',
    name: '',
    max_marks: 100,
    weightage: 0,
    held_on: '',
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
      loadAssessment();
    }
  }, [id, isEditMode]);

  const loadData = async () => {
    try {
      const [yearsRes, classroomsRes, subjectsRes] = await Promise.all([
        apiService.getAcademicYears(),
        apiService.getClassrooms(),
        apiService.getSubjects(),
      ]);
      
      setAcademicYears(yearsRes.data);

      // For teachers, filter to only assigned classrooms/subjects
      if (user?.role === 'teacher') {
        const teachingRes = await apiService.getMyTeaching();
        const assignments = teachingRes.data;
        
        // Get unique classroom IDs and subject IDs from assignments
        const assignedClassroomIds = new Set(assignments.map((a: any) => a.classroom_id));
        const assignedSubjectIds = new Set(assignments.map((a: any) => a.subject_id));
        
        // Filter classrooms and subjects
        const filteredClassrooms = classroomsRes.data.filter((c: any) => assignedClassroomIds.has(c.id));
        const filteredSubjects = subjectsRes.data.filter((s: any) => assignedSubjectIds.has(s.id));
        
        setClassrooms(filteredClassrooms);
        setSubjects(filteredSubjects);
      } else {
        setClassrooms(classroomsRes.data);
        setSubjects(subjectsRes.data);
      }

      const currentYear = yearsRes.data.find((y: any) => y.is_current);
      if (currentYear) {
        setSelectedAcademicYear(currentYear.id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    }
  };

  const loadAssessment = async () => {
    if (!id) return;
    try {
      setIsLoading(true);
      const response = await apiService.getAssessment(id);
      const assessment = response.data;
      setFormData({
        classroom_id: assessment.classroom_id || '',
        subject_id: assessment.subject_id || '',
        name: assessment.name || '',
        max_marks: assessment.max_marks || 100,
        weightage: assessment.weightage || 10,
        held_on: assessment.held_on || '',
      });
      setSelectedAcademicYear(assessment.academic_year_id || '');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load assessment');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    console.log('=== FORM SUBMIT TRIGGERED ===');
    console.log('Form data:', formData);
    setError(null);

    if (!formData.classroom_id) {
      setError('Classroom is required');
      return;
    }
    if (!formData.subject_id) {
      setError('Subject is required');
      return;
    }
    if (!formData.name.trim()) {
      setError('Assessment name is required');
      return;
    }
    if (formData.max_marks <= 0) {
      setError('Max marks must be greater than 0');
      return;
    }

    setIsSubmitting(true);

    try {
      if (isEditMode && id) {
        console.log('Updating assessment:', id, formData);
        await apiService.updateAssessment(id, formData);
        const detailPath = user?.role === 'teacher' ? `/teacher/marks/${id}` : `/marks/${id}`;
        navigate(detailPath);
      } else {
        // Create new assessment
        console.log('Creating assessment with data:', formData);
        const response = await apiService.createAssessment(formData);
        console.log('Assessment created successfully:', response.data);
        const detailPath = user?.role === 'teacher' ? `/teacher/marks/${response.data.id}` : `/marks/${response.data.id}`;
        navigate(detailPath);
      }
    } catch (err) {
      console.error('Error saving assessment:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to save assessment';
      setError(errorMessage);
      alert(errorMessage); // Show alert to make error visible
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateField = (field: keyof AssessmentFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  if (!user) return null;

  if (isLoading) {
    return (
      <Layout schoolName={'SMS'} principalName={"User"} onLogout={logout} role={user?.role}>
        <div style={{ padding: '32px', textAlign: 'center' }}>Loading...</div>
      </Layout>
    );
  }

  const filteredClassrooms = classrooms.filter(c => 
    !selectedAcademicYear || c.academic_year_id === selectedAcademicYear
  );

  return (
    <Layout schoolName={'SMS'} principalName={"User"} onLogout={logout} role={user?.role}>
      <div style={{ padding: '32px', maxWidth: '800px', margin: '0 auto' }}>
        <div style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Button variant="secondary" onClick={() => navigate(user?.role === 'teacher' ? '/teacher/marks' : '/marks')}>
            <ArrowLeft size={16} />
          </Button>
          <div>
            <h1 style={{ fontSize: '28px', fontWeight: 600, color: '#0f172a' }}>
              {isEditMode ? 'Edit Assessment' : 'Create Assessment'}
            </h1>
            <p style={{ fontSize: '14px', color: '#64748b' }}>
              {isEditMode ? 'Update assessment details' : 'Create a new assessment'}
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
              {/* Academic Year (for filtering classrooms) */}
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
                    outline: 'none',
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
                    outline: 'none',
                  }}
                >
                  <option value="">Select Classroom</option>
                  {filteredClassrooms.map(classroom => (
                    <option key={classroom.id} value={classroom.id}>
                      {classroom.grade_name}-{classroom.division_name}
                    </option>
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
                    outline: 'none',
                  }}
                >
                  <option value="">Select Subject</option>
                  {subjects.map(subject => (
                    <option key={subject.id} value={subject.id}>{subject.name}</option>
                  ))}
                </select>
              </div>

              {/* Assessment Name */}
              <div>
                <label htmlFor="name" style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#0f172a', marginBottom: '6px' }}>
                  Assessment Name <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <input
                  id="name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => updateField('name', e.target.value)}
                  disabled={isSubmitting}
                  placeholder="e.g., Unit Test 1"
                  required
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

              {/* Max Marks */}
              <div>
                <label htmlFor="max_marks" style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#0f172a', marginBottom: '6px' }}>
                  Max Marks <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <input
                  id="max_marks"
                  type="number"
                  min="1"
                  value={formData.max_marks}
                  onChange={(e) => updateField('max_marks', parseInt(e.target.value) || 0)}
                  disabled={isSubmitting}
                  required
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

              {/* Held On Date */}
              <div>
                <label htmlFor="held_on" style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#0f172a', marginBottom: '6px' }}>
                  Held On (Optional)
                </label>
                <input
                  id="held_on"
                  type="date"
                  value={formData.held_on}
                  onChange={(e) => updateField('held_on', e.target.value)}
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

              {/* Form Actions */}
              <div style={{ display: 'flex', gap: '12px', paddingTop: '16px', borderTop: '1px solid #e2e8f0' }}>
                <Button type="submit" disabled={isSubmitting}>
                  <Save size={16} style={{ marginRight: '8px' }} />
                  {isSubmitting ? 'Saving...' : isEditMode ? 'Update Assessment' : 'Create Assessment'}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => navigate(isEditMode && id ? `/marks/${id}` : '/marks')}
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





