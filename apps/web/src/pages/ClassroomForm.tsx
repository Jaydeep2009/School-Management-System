/**
 * Classroom Form - Create/Edit Classroom
 */

import { useState, useEffect, FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Layout } from '../components/layout/Layout';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { useAuth } from '../hooks/useAuth';
import { apiService } from '../services/api';
import { ArrowLeft, Save } from 'lucide-react';

interface FormData {
  academic_year_id: string;
  classroom_code: string;
  grade_name: string;
  division_name: string;
  grade_level: number;
  class_teacher_id: string;
  status: 'active' | 'inactive' | 'archived';
}

export function ClassroomForm() {
  const { id } = useParams<{ id?: string }>();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [formData, setFormData] = useState<FormData>({
    academic_year_id: '',
    classroom_code: '',
    grade_name: '',
    division_name: '',
    grade_level: 1,
    class_teacher_id: '',
    status: 'active',
  });

  const [academicYears, setAcademicYears] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [teachingAssignments, setTeachingAssignments] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(isEdit);

  useEffect(() => {
    loadDependencies();
    if (isEdit && id) {
      loadClassroom(id);
    }
  }, [id]);

  const loadDependencies = async () => {
    try {
      const [yearsRes, teachersRes, subjectsRes] = await Promise.all([
        apiService.getAcademicYears(),
        apiService.getTeachers(),
        apiService.getSubjects({ status: 'active' }),
      ]);
      
      setAcademicYears(yearsRes.data || []);
      setTeachers(teachersRes.data || []);
      setSubjects(subjectsRes.data || []);

      // Auto-select active academic year for new classrooms
      if (!isEdit) {
        const activeYear = (yearsRes.data || []).find((y: any) => y.status === 'active' || y.status === 'current');
        if (activeYear) {
          setFormData(prev => ({ ...prev, academic_year_id: activeYear.id }));
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    }
  };

  const loadClassroom = async (classroomId: string) => {
    try {
      setIsLoading(true);
      const [classroomRes, assignmentsRes] = await Promise.all([
        apiService.getClassroom(classroomId),
        apiService.getTeachingAssignments({ classroom_id: classroomId }),
      ]);
      
      const classroom = classroomRes.data;
      
      setFormData({
        academic_year_id: classroom.academic_year_id || '',
        classroom_code: classroom.classroom_code || '',
        grade_name: classroom.grade_name || '',
        division_name: classroom.division_name || '',
        grade_level: classroom.grade_level || 1,
        class_teacher_id: classroom.class_teacher_id || '',
        status: classroom.status || 'active',
      });
      
      setTeachingAssignments(assignmentsRes.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load classroom');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!formData.classroom_code.trim()) {
      setError('Classroom code is required');
      return;
    }
    if (!formData.grade_name.trim()) {
      setError('Grade name is required');
      return;
    }
    if (!formData.division_name.trim()) {
      setError('Division name is required');
      return;
    }
    if (!formData.academic_year_id && !isEdit) {
      setError('Academic year is required');
      return;
    }

    setIsSubmitting(true);

    try {
      if (isEdit && id) {
        // Update existing classroom
        const updateData: any = {
          classroom_code: formData.classroom_code,
          grade_name: formData.grade_name,
          division_name: formData.division_name,
          grade_level: formData.grade_level,
          status: formData.status,
        };

        // Only include class_teacher_id if it's set
        if (formData.class_teacher_id) {
          updateData.class_teacher_id = formData.class_teacher_id;
        } else {
          updateData.class_teacher_id = null; // Explicitly unassign
        }

        await apiService.updateClassroom(id, updateData);
        navigate(`/classrooms/${id}`);
      } else {
        // Create new classroom
        const createData: any = {
          academic_year_id: formData.academic_year_id,
          classroom_code: formData.classroom_code,
          grade_name: formData.grade_name,
          division_name: formData.division_name,
          grade_level: formData.grade_level,
        };

        // Only include class_teacher_id if it's set
        if (formData.class_teacher_id) {
          createData.class_teacher_id = formData.class_teacher_id;
        }

        const response = await apiService.createClassroom(createData);
        navigate(`/classrooms/${response.data.id}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to ${isEdit ? 'update' : 'create'} classroom`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddSubjectTeacher = async (subjectId: string, teacherId: string) => {
    if (!id || !formData.academic_year_id) return;
    
    try {
      await apiService.createTeachingAssignment({
        academic_year_id: formData.academic_year_id,
        teacher_id: teacherId,
        classroom_id: id,
        subject_id: subjectId,
      });
      
      // Reload assignments
      const assignmentsRes = await apiService.getTeachingAssignments({ classroom_id: id });
      setTeachingAssignments(assignmentsRes.data || []);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to assign teacher');
    }
  };

  const handleRemoveSubjectTeacher = async (assignmentId: string) => {
    if (!confirm('Remove this subject teacher assignment?')) return;
    
    try {
      await apiService.deleteTeachingAssignment(assignmentId);
      
      // Reload assignments
      if (id) {
        const assignmentsRes = await apiService.getTeachingAssignments({ classroom_id: id });
        setTeachingAssignments(assignmentsRes.data || []);
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to remove assignment');
    }
  };

  if (!user) return null;

  if (isLoading) {
    return (
      <Layout schoolName={'SMS'} principalName={"User"} onLogout={logout}>
        <div style={{ padding: '32px' }}>
          <div>Loading classroom...</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout schoolName={'SMS'} principalName={"User"} onLogout={logout}>
      <div style={{ padding: '32px' }}>
        {/* Header */}
        <div style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Button variant="secondary" onClick={() => navigate('/academic')}>
            <ArrowLeft size={16} />
          </Button>
          <div>
            <h1 style={{ fontSize: '28px', fontWeight: 600, color: '#0f172a' }}>
              {isEdit ? 'Edit Classroom' : 'Create Classroom'}
            </h1>
            <p style={{ fontSize: '14px', color: '#64748b', marginTop: '4px' }}>
              {isEdit ? 'Update classroom details' : 'Add a new classroom to your school'}
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
                color: '#991b1b',
                marginBottom: '24px'
              }}>
                {error}
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
              {/* Academic Year */}
              {!isEdit && (
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 500, color: '#374151' }}>
                    Academic Year *
                  </label>
                  <select
                    value={formData.academic_year_id}
                    onChange={(e) => setFormData({ ...formData, academic_year_id: e.target.value })}
                    required
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      fontSize: '14px',
                    }}
                  >
                    <option value="">Select academic year</option>
                    {academicYears.map(year => (
                      <option key={year.id} value={year.id}>
                        {year.label} {year.status === 'active' || year.status === 'current' ? '(Active)' : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Classroom Code */}
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 500, color: '#374151' }}>
                  Classroom Code *
                </label>
                <input
                  type="text"
                  value={formData.classroom_code}
                  onChange={(e) => setFormData({ ...formData, classroom_code: e.target.value })}
                  placeholder="e.g., 10-A"
                  required
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px',
                  }}
                />
              </div>

              {/* Grade Name */}
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 500, color: '#374151' }}>
                  Grade Name *
                </label>
                <input
                  type="text"
                  value={formData.grade_name}
                  onChange={(e) => setFormData({ ...formData, grade_name: e.target.value })}
                  placeholder="e.g., Grade 10"
                  required
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px',
                  }}
                />
              </div>

              {/* Division Name */}
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 500, color: '#374151' }}>
                  Division *
                </label>
                <input
                  type="text"
                  value={formData.division_name}
                  onChange={(e) => setFormData({ ...formData, division_name: e.target.value })}
                  placeholder="e.g., A, B, C"
                  required
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px',
                  }}
                />
              </div>

              {/* Grade Level */}
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 500, color: '#374151' }}>
                  Grade Level *
                </label>
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={formData.grade_level}
                  onChange={(e) => setFormData({ ...formData, grade_level: parseInt(e.target.value) || 1 })}
                  required
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px',
                  }}
                />
              </div>

              {/* Class Teacher */}
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 500, color: '#374151' }}>
                  Class Teacher
                </label>
                <select
                  value={formData.class_teacher_id}
                  onChange={(e) => setFormData({ ...formData, class_teacher_id: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px',
                  }}
                >
                  <option value="">No teacher assigned</option>
                  {teachers.filter(t => t.status === 'active').map(teacher => (
                    <option key={teacher.user_id} value={teacher.user_id}>
                      {teacher.full_name} ({teacher.employee_code || teacher.login_id})
                    </option>
                  ))}
                </select>
              </div>

              {/* Status (Edit only) */}
              {isEdit && (
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 500, color: '#374151' }}>
                    Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      fontSize: '14px',
                    }}
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div style={{ marginTop: '32px', display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <Button
                type="button"
                variant="secondary"
                onClick={() => navigate('/academic')}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                <Save size={16} style={{ marginRight: '8px' }} />
                {isSubmitting ? 'Saving...' : isEdit ? 'Update Classroom' : 'Create Classroom'}
              </Button>
            </div>
          </form>
        </Card>

        {/* Subject Teachers (Edit mode only) */}
        {isEdit && id && (
          <div style={{ marginTop: '24px' }}>
            <Card>
            <div style={{ padding: '24px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#0f172a', marginBottom: '16px' }}>
                Subject Teachers
              </h2>
              <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '16px' }}>
                Assign teachers to subjects for this classroom
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {subjects.map(subject => {
                  const assignment = teachingAssignments.find(a => a.subject_id === subject.id);
                  
                  return (
                    <div
                      key={subject.id}
                      style={{
                        padding: '16px',
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 600, color: '#0f172a' }}>
                          {subject.name}
                        </div>
                        <div style={{ fontSize: '14px', color: '#64748b', marginTop: '2px' }}>
                          {subject.code}
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        {assignment ? (
                          <>
                            <div style={{ fontSize: '14px', color: '#0f172a' }}>
                              {assignment.teacher_name || 'Teacher assigned'}
                            </div>
                            <Button
                              variant="secondary"
                              onClick={() => handleRemoveSubjectTeacher(assignment.id)}
                              style={{ padding: '6px 12px', fontSize: '14px' }}
                            >
                              Remove
                            </Button>
                          </>
                        ) : (
                          <select
                            onChange={(e) => {
                              if (e.target.value) {
                                handleAddSubjectTeacher(subject.id, e.target.value);
                                e.target.value = ''; // Reset select
                              }
                            }}
                            style={{
                              padding: '6px 12px',
                              border: '1px solid #d1d5db',
                              borderRadius: '6px',
                              fontSize: '14px',
                              minWidth: '200px',
                            }}
                          >
                            <option value="">Assign teacher...</option>
                            {teachers.filter(t => t.status === 'active').map(teacher => (
                              <option key={teacher.user_id} value={teacher.user_id}>
                                {teacher.full_name}
                              </option>
                            ))}
                          </select>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </Card>
          </div>
        )}
      </div>
    </Layout>
  );
}
