/**
 * Academic Structure Page - Manage Academic Configuration
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../components/layout/Layout';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Skeleton } from '../components/ui/Skeleton';
import { ErrorState } from '../components/ui/ErrorState';
import { useAuth } from '../hooks/useAuth';
import { apiService } from '../services/api';
import { CalendarDays, BookOpen, FileText, Plus, Users, UserCheck, X, Download } from 'lucide-react';
import { useAcademicYear } from '../contexts/AcademicYearContext';

export function AcademicStructure() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { selectedYear } = useAcademicYear();
  const [activeTab, setActiveTab] = useState<'years' | 'classrooms' | 'subjects' | 'teaching' | 'enrollments'>('years');
  const [data, setData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<any>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Additional state for dropdowns
  const [academicYears, setAcademicYears] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [classrooms, setClassrooms] = useState<any[]>([]);
  
  // Teacher assignment modal state
  const [showTeacherModal, setShowTeacherModal] = useState(false);
  const [selectedClassroom, setSelectedClassroom] = useState<any>(null);
  const [teachingAssignments, setTeachingAssignments] = useState<any[]>([]);

  useEffect(() => {
    loadData();
    loadDependencies();
  }, [activeTab, selectedYear?.id]);

  const loadDependencies = async () => {
    try {
      // Load dropdown data
      const params = selectedYear?.id ? { academic_year_id: selectedYear.id } : {};
      const [yearsRes, teachersRes, subjectsRes, classroomsRes] = await Promise.all([
        apiService.getAcademicYears(),
        apiService.getTeachers(),
        apiService.getSubjects(),
        apiService.getClassrooms(params)
      ]);
      
      setAcademicYears(yearsRes.data || []);
      setTeachers(teachersRes.data || []);
      setSubjects(subjectsRes.data || []);
      setClassrooms(classroomsRes.data || []);
    } catch (err) {
      console.error('Failed to load dependencies:', err);
    }
  };

  const loadData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      let response;
      
      switch (activeTab) {
        case 'years':
          response = await apiService.getAcademicYears();
          break;
        case 'classrooms':
          response = await apiService.getClassrooms(
            selectedYear?.id ? { academic_year_id: selectedYear.id } : {}
          );
          break;
        case 'subjects':
          response = await apiService.getSubjects();
          break;
        case 'teaching':
          response = await apiService.getTeachingAssignments(
            selectedYear?.id ? { academic_year_id: selectedYear.id } : {}
          );
          break;
        case 'enrollments':
          response = await apiService.getEnrollments(
            selectedYear?.id ? { academic_year_id: selectedYear.id } : {}
          );
          break;
      }
      
      setData(response.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // ID validation regex - accepts both UUID format and MD5 hash format (32 hex chars)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const md5Regex = /^[0-9a-f]{32}$/i;
    const isValidId = (id: string) => uuidRegex.test(id) || md5Regex.test(id);
    
    try {
      switch (activeTab) {
        case 'years':
          await apiService.createAcademicYear({
            label: formData.label,
            starts_on: formData.starts_on,
            ends_on: formData.ends_on
          });
          break;
        case 'classrooms':
          const gradeLevel = parseInt(formData.grade_level);
          if (isNaN(gradeLevel)) {
            throw new Error('Grade level must be a valid number');
          }
          const classroomData: any = {
            academic_year_id: formData.academic_year_id,
            classroom_code: formData.classroom_code,
            grade_name: formData.grade_name,
            division_name: formData.division_name,
            grade_level: gradeLevel,
          };
          // Only include class_teacher_id if it has a valid ID value
          if (formData.class_teacher_id && formData.class_teacher_id !== '' && isValidId(formData.class_teacher_id)) {
            classroomData.class_teacher_id = formData.class_teacher_id;
          }
          console.log('Creating classroom with data:', JSON.stringify(classroomData, null, 2));
          await apiService.createClassroom(classroomData);
          break;
        case 'subjects':
          await apiService.createSubject({
            subject_code: formData.subject_code,
            name: formData.name,
            description: formData.description || undefined
          });
          break;
        case 'teaching':
          // Validate IDs before submission
          if (!isValidId(formData.teacher_id)) {
            throw new Error('Please select a valid teacher');
          }
          
          if (!isValidId(formData.classroom_id)) {
            throw new Error('Please select a valid classroom');
          }
          
          if (!isValidId(formData.subject_id)) {
            throw new Error('Please select a valid subject');
          }
          
          // Get classroom to find academic_year_id
          const classroom = classrooms.find(c => c.id === formData.classroom_id);
          if (!classroom) {
            throw new Error('Classroom not found. Please refresh the page and try again.');
          }
          
          if (!classroom.academic_year_id) {
            throw new Error('Classroom is missing academic year information');
          }
          
          console.log('Creating teaching assignment:', {
            academic_year_id: classroom.academic_year_id,
            teacher_id: formData.teacher_id,
            classroom_id: formData.classroom_id,
            subject_id: formData.subject_id
          });
          
          await apiService.createTeachingAssignment({
            academic_year_id: classroom.academic_year_id,
            teacher_id: formData.teacher_id,
            classroom_id: formData.classroom_id,
            subject_id: formData.subject_id
          });
          break;
        case 'enrollments':
          await apiService.createEnrollment({
            academic_year_id: formData.academic_year_id,
            classroom_id: formData.classroom_id,
            student_id: formData.student_id,
            roll_number: formData.roll_number || undefined
          });
          break;
      }
      
      setShowForm(false);
      setFormData({});
      await loadData();
      alert(`${activeTab === 'years' ? 'Academic Year' : activeTab === 'classrooms' ? 'Classroom' : activeTab === 'subjects' ? 'Subject' : activeTab === 'teaching' ? 'Teaching Assignment' : 'Enrollment'} created successfully`);
    } catch (err) {
      console.error('Create error:', err);
      const errorMessage = err instanceof Error ? err.message : (typeof err === 'string' ? err : JSON.stringify(err));
      alert(`Failed to create: ${errorMessage}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const openTeacherAssignmentModal = async (classroom: any) => {
    setSelectedClassroom(classroom);
    try {
      const response = await apiService.getTeachingAssignments({ classroom_id: classroom.id });
      setTeachingAssignments(response.data || []);
      setShowTeacherModal(true);
    } catch (err) {
      alert('Failed to load teaching assignments');
    }
  };

  const handleTeacherAssignment = async (subjectId: string, teacherId: string) => {
    try {
      // ID validation - accepts both UUID format and MD5 hash format (32 hex chars)
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      const md5Regex = /^[0-9a-f]{32}$/i;
      const isValidId = (id: string) => uuidRegex.test(id) || md5Regex.test(id);
      
      if (!isValidId(teacherId)) {
        throw new Error('Invalid teacher selected');
      }
      
      if (!isValidId(subjectId)) {
        throw new Error('Invalid subject selected');
      }
      
      if (!selectedClassroom) {
        throw new Error('No classroom selected');
      }
      
      // selectedClassroom should already have academic_year_id from the API
      if (!selectedClassroom.academic_year_id) {
        throw new Error('Classroom is missing academic year information');
      }

      console.log('Creating teaching assignment:', {
        academic_year_id: selectedClassroom.academic_year_id,
        teacher_id: teacherId,
        classroom_id: selectedClassroom.id,
        subject_id: subjectId
      });

      await apiService.createTeachingAssignment({
        academic_year_id: selectedClassroom.academic_year_id,
        teacher_id: teacherId,
        classroom_id: selectedClassroom.id,
        subject_id: subjectId
      });
      
      // Reload assignments
      const response = await apiService.getTeachingAssignments({ classroom_id: selectedClassroom.id });
      setTeachingAssignments(response.data || []);
      alert('Teacher assigned successfully');
    } catch (err) {
      console.error('Teacher assignment error:', err);
      const errorMessage = err instanceof Error ? err.message : (typeof err === 'string' ? err : JSON.stringify(err));
      alert(`Failed to assign teacher: ${errorMessage}`);
    }
  };

  if (!user) return null;

  const tabs = [
    { key: 'years' as const, label: 'Academic Years', icon: CalendarDays },
    { key: 'classrooms' as const, label: 'Classrooms', icon: BookOpen },
    { key: 'subjects' as const, label: 'Subjects', icon: FileText },
    { key: 'teaching' as const, label: 'Teaching', icon: UserCheck },
    { key: 'enrollments' as const, label: 'Enrollments', icon: Users },
  ];

  return (
    <Layout schoolName={'SMS'} principalName={"User"} onLogout={logout}>
      <div style={{ padding: '32px' }}>
        <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ fontSize: '28px', fontWeight: 600, color: '#0f172a', marginBottom: '8px' }}>
              Academic Structure
            </h1>
            <p style={{ fontSize: '14px', color: '#64748b' }}>
              Manage academic configuration
            </p>
          </div>
          {!showForm && (
            <Button onClick={() => setShowForm(true)}>
              <Plus size={16} style={{ marginRight: '8px' }} />
              Add {activeTab === 'years' ? 'Year' : activeTab === 'classrooms' ? 'Classroom' : activeTab === 'subjects' ? 'Subject' : activeTab === 'teaching' ? 'Assignment' : 'Enrollment'}
            </Button>
          )}
        </div>

        {/* Tabs */}
        <div style={{ borderBottom: '1px solid #e2e8f0', marginBottom: '24px' }}>
          <div style={{ display: 'flex', gap: '24px', overflowX: 'auto' }}>
            {tabs.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => { setActiveTab(key); setShowForm(false); }}
                style={{
                  padding: '12px 16px',
                  fontSize: '14px',
                  fontWeight: 500,
                  color: activeTab === key ? '#2563eb' : '#64748b',
                  background: 'none',
                  border: 'none',
                  borderBottom: activeTab === key ? '2px solid #2563eb' : '2px solid transparent',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  whiteSpace: 'nowrap',
                }}
              >
                <Icon size={16} />
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Create Form */}
        {showForm && (
          <div style={{ marginBottom: '24px' }}>
            <Card>
              <form onSubmit={handleSubmit} style={{ padding: '24px' }}>
                <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '16px' }}>
                  Add {activeTab === 'years' ? 'Academic Year' : activeTab === 'classrooms' ? 'Classroom' : activeTab === 'subjects' ? 'Subject' : activeTab === 'teaching' ? 'Teaching Assignment' : 'Enrollment'}
                </h2>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {/* Academic Year Form */}
                  {activeTab === 'years' && (
                    <>
                      <div>
                        <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '4px', color: '#0f172a' }}>
                          Year Label *
                        </label>
                        <input
                          placeholder="e.g., 2024-2025"
                          value={formData.label || ''}
                          onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                          required
                          style={{
                            width: '100%',
                            padding: '8px 12px',
                            border: '1px solid #e2e8f0',
                            borderRadius: '6px',
                            fontSize: '14px',
                          }}
                        />
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                        <div>
                          <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '4px', color: '#0f172a' }}>
                            Start Date *
                          </label>
                          <input
                            type="date"
                            value={formData.starts_on || ''}
                            onChange={(e) => setFormData({ ...formData, starts_on: e.target.value })}
                            required
                            style={{
                              width: '100%',
                              padding: '8px 12px',
                              border: '1px solid #e2e8f0',
                              borderRadius: '6px',
                              fontSize: '14px',
                            }}
                          />
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '4px', color: '#0f172a' }}>
                            End Date *
                          </label>
                          <input
                            type="date"
                            value={formData.ends_on || ''}
                            onChange={(e) => setFormData({ ...formData, ends_on: e.target.value })}
                            required
                            style={{
                              width: '100%',
                              padding: '8px 12px',
                              border: '1px solid #e2e8f0',
                              borderRadius: '6px',
                              fontSize: '14px',
                            }}
                          />
                        </div>
                      </div>
                    </>
                  )}

                  {/* Classroom Form */}
                  {activeTab === 'classrooms' && (
                    <>
                      <div>
                        <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '4px', color: '#0f172a' }}>
                          Academic Year *
                        </label>
                        <select
                          value={formData.academic_year_id || ''}
                          onChange={(e) => setFormData({ ...formData, academic_year_id: e.target.value })}
                          required
                          style={{
                            width: '100%',
                            padding: '8px 12px',
                            border: '1px solid #e2e8f0',
                            borderRadius: '6px',
                            fontSize: '14px',
                            background: 'white',
                          }}
                        >
                          <option value="">Select Academic Year</option>
                          {academicYears.map(year => (
                            <option key={year.id} value={year.id}>{year.label}</option>
                          ))}
                        </select>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                        <div>
                          <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '4px', color: '#0f172a' }}>
                            Classroom Code *
                          </label>
                          <input
                            placeholder="e.g., 10-A"
                            value={formData.classroom_code || ''}
                            onChange={(e) => setFormData({ ...formData, classroom_code: e.target.value })}
                            required
                            style={{
                              width: '100%',
                              padding: '8px 12px',
                              border: '1px solid #e2e8f0',
                              borderRadius: '6px',
                              fontSize: '14px',
                            }}
                          />
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '4px', color: '#0f172a' }}>
                            Grade Level *
                          </label>
                          <input
                            type="number"
                            min="1"
                            max="20"
                            placeholder="e.g., 10"
                            value={formData.grade_level || ''}
                            onChange={(e) => setFormData({ ...formData, grade_level: e.target.value })}
                            required
                            style={{
                              width: '100%',
                              padding: '8px 12px',
                              border: '1px solid #e2e8f0',
                              borderRadius: '6px',
                              fontSize: '14px',
                            }}
                          />
                        </div>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                        <div>
                          <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '4px', color: '#0f172a' }}>
                            Grade Name *
                          </label>
                          <input
                            placeholder="e.g., Grade 10"
                            value={formData.grade_name || ''}
                            onChange={(e) => setFormData({ ...formData, grade_name: e.target.value })}
                            required
                            style={{
                              width: '100%',
                              padding: '8px 12px',
                              border: '1px solid #e2e8f0',
                              borderRadius: '6px',
                              fontSize: '14px',
                            }}
                          />
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '4px', color: '#0f172a' }}>
                            Division Name *
                          </label>
                          <input
                            placeholder="e.g., A"
                            value={formData.division_name || ''}
                            onChange={(e) => setFormData({ ...formData, division_name: e.target.value })}
                            required
                            style={{
                              width: '100%',
                              padding: '8px 12px',
                              border: '1px solid #e2e8f0',
                              borderRadius: '6px',
                              fontSize: '14px',
                            }}
                          />
                        </div>
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '4px', color: '#0f172a' }}>
                          Class Teacher (Optional)
                        </label>
                        <select
                          value={formData.class_teacher_id || ''}
                          onChange={(e) => setFormData({ ...formData, class_teacher_id: e.target.value })}
                          style={{
                            width: '100%',
                            padding: '8px 12px',
                            border: '1px solid #e2e8f0',
                            borderRadius: '6px',
                            fontSize: '14px',
                            background: 'white',
                          }}
                        >
                          <option value="">No Class Teacher</option>
                          {teachers.filter(t => t.status === 'active').map(teacher => (
                            <option key={teacher.id} value={teacher.id}>{teacher.full_name}</option>
                          ))}
                        </select>
                      </div>
                    </>
                  )}

                  {/* Subject Form */}
                  {activeTab === 'subjects' && (
                    <>
                      <div>
                        <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '4px', color: '#0f172a' }}>
                          Subject Code *
                        </label>
                        <input
                          placeholder="e.g., MATH-10"
                          value={formData.subject_code || ''}
                          onChange={(e) => setFormData({ ...formData, subject_code: e.target.value })}
                          required
                          style={{
                            width: '100%',
                            padding: '8px 12px',
                            border: '1px solid #e2e8f0',
                            borderRadius: '6px',
                            fontSize: '14px',
                          }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '4px', color: '#0f172a' }}>
                          Subject Name *
                        </label>
                        <input
                          placeholder="e.g., Mathematics"
                          value={formData.name || ''}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          required
                          style={{
                            width: '100%',
                            padding: '8px 12px',
                            border: '1px solid #e2e8f0',
                            borderRadius: '6px',
                            fontSize: '14px',
                          }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '4px', color: '#0f172a' }}>
                          Description (Optional)
                        </label>
                        <textarea
                          placeholder="Subject description..."
                          value={formData.description || ''}
                          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                          rows={3}
                          style={{
                            width: '100%',
                            padding: '8px 12px',
                            border: '1px solid #e2e8f0',
                            borderRadius: '6px',
                            fontSize: '14px',
                            resize: 'vertical',
                          }}
                        />
                      </div>
                    </>
                  )}

                  {/* Teaching Assignment Form */}
                  {activeTab === 'teaching' && (
                    <>
                      <div>
                        <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '4px', color: '#0f172a' }}>
                          Classroom *
                        </label>
                        <select
                          value={formData.classroom_id || ''}
                          onChange={(e) => setFormData({ ...formData, classroom_id: e.target.value })}
                          required
                          style={{
                            width: '100%',
                            padding: '8px 12px',
                            border: '1px solid #e2e8f0',
                            borderRadius: '6px',
                            fontSize: '14px',
                            background: 'white',
                          }}
                        >
                          <option value="">Select Classroom</option>
                          {classrooms.map(classroom => (
                            <option key={classroom.id} value={classroom.id}>
                              {classroom.classroom_code} - {classroom.grade_name} {classroom.division_name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '4px', color: '#0f172a' }}>
                          Teacher *
                        </label>
                        <select
                          value={formData.teacher_id || ''}
                          onChange={(e) => setFormData({ ...formData, teacher_id: e.target.value })}
                          required
                          style={{
                            width: '100%',
                            padding: '8px 12px',
                            border: '1px solid #e2e8f0',
                            borderRadius: '6px',
                            fontSize: '14px',
                            background: 'white',
                          }}
                        >
                          <option value="">Select Teacher</option>
                          {teachers.filter(t => t.status === 'active').map(teacher => (
                            <option key={teacher.id} value={teacher.id}>{teacher.full_name}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '4px', color: '#0f172a' }}>
                          Subject *
                        </label>
                        <select
                          value={formData.subject_id || ''}
                          onChange={(e) => setFormData({ ...formData, subject_id: e.target.value })}
                          required
                          style={{
                            width: '100%',
                            padding: '8px 12px',
                            border: '1px solid #e2e8f0',
                            borderRadius: '6px',
                            fontSize: '14px',
                            background: 'white',
                          }}
                        >
                          <option value="">Select Subject</option>
                          {subjects.filter(s => s.status === 'active').map(subject => (
                            <option key={subject.id} value={subject.id}>{subject.name}</option>
                          ))}
                        </select>
                      </div>
                    </>
                  )}

                  {/* Enrollment Form - Simplified placeholder */}
                  {activeTab === 'enrollments' && (
                    <div style={{ padding: '16px', background: '#fef3c7', borderRadius: '6px', color: '#78350f' }}>
                      Manual enrollments should be done through the Students section or via Excel import
                    </div>
                  )}
                  
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <Button type="submit" disabled={isSubmitting}>
                      {isSubmitting ? 'Creating...' : 'Create'}
                    </Button>
                    <Button type="button" variant="secondary" onClick={() => { setShowForm(false); setFormData({}); }}>
                      Cancel
                    </Button>
                  </div>
                </div>
              </form>
            </Card>
          </div>
        )}

        {/* Data List */}
        <Card>
          <div style={{ padding: '24px' }}>
            {isLoading && <Skeleton height="200px" />}
            {error && !isLoading && <ErrorState message={error} onRetry={loadData} />}
            
            {!isLoading && !error && (
              <div>
                <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '16px' }}>
                  {tabs.find(t => t.key === activeTab)?.label} ({data.length})
                </h2>
                
                {data.length === 0 ? (
                  <p style={{ color: '#64748b', textAlign: 'center', padding: '48px' }}>
                    No {tabs.find(t => t.key === activeTab)?.label.toLowerCase()} found
                  </p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {data.map((item) => (
                      <div 
                        key={item.id} 
                        style={{ 
                          padding: '16px', 
                          border: '1px solid #e2e8f0', 
                          borderRadius: '8px', 
                          display: 'flex', 
                          justifyContent: 'space-between', 
                          alignItems: 'center',
                          cursor: activeTab === 'classrooms' ? 'pointer' : 'default',
                          transition: 'background 0.2s'
                        }}
                        onClick={() => activeTab === 'classrooms' && navigate(`/classrooms/${item.id}`)}
                        onMouseEnter={(e) => activeTab === 'classrooms' && (e.currentTarget.style.background = '#f8fafc')}
                        onMouseLeave={(e) => activeTab === 'classrooms' && (e.currentTarget.style.background = 'white')}
                      >
                        <div>
                          <div style={{ fontWeight: 600 }}>
                            {item.label || item.name || item.classroom_code || `${item.teacher_name} - ${item.subject_name}`}
                          </div>
                          {item.code && <div style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>Code: {item.code}</div>}
                          {item.classroom_code && (
                            <div style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>
                              {item.grade_name} {item.division_name} (Level {item.grade_level})
                              {item.class_teacher_name && ` â€¢ Class Teacher: ${item.class_teacher_name}`}
                            </div>
                          )}
                          {item.start_date && item.end_date && (
                            <div style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>
                              {new Date(item.start_date).toLocaleDateString()} - {new Date(item.end_date).toLocaleDateString()}
                            </div>
                          )}
                          {item.starts_on && item.ends_on && (
                            <div style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>
                              {new Date(item.starts_on).toLocaleDateString()} - {new Date(item.ends_on).toLocaleDateString()}
                            </div>
                          )}
                          {item.teacher_name && item.subject_name && item.classroom_name && (
                            <div style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>
                              {item.classroom_name}
                            </div>
                          )}
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          {activeTab === 'years' && (
                            <Button
                              variant="secondary"
                              size="small"
                              onClick={async (e) => {
                                e.stopPropagation();
                                try {
                                  const result = await apiService.exportAcademicYearData(item.id);
                                  
                                  // Convert to Excel using xlsx library
                                  const XLSX = await import('xlsx');
                                  const wb = XLSX.utils.book_new();
                                  
                                  // Students sheet
                                  const studentsWs = XLSX.utils.json_to_sheet(result.data.students);
                                  XLSX.utils.book_append_sheet(wb, studentsWs, 'Students');
                                  
                                  // Marks sheet
                                  if (result.data.marks.length > 0) {
                                    const marksWs = XLSX.utils.json_to_sheet(result.data.marks);
                                    XLSX.utils.book_append_sheet(wb, marksWs, 'Marks');
                                  }
                                  
                                  // Attendance sheet
                                  if (result.data.attendance.length > 0) {
                                    const attendanceWs = XLSX.utils.json_to_sheet(result.data.attendance);
                                    XLSX.utils.book_append_sheet(wb, attendanceWs, 'Attendance');
                                  }
                                  
                                  // Fees sheet
                                  if (result.data.fees.length > 0) {
                                    const feesWs = XLSX.utils.json_to_sheet(result.data.fees);
                                    XLSX.utils.book_append_sheet(wb, feesWs, 'Fees');
                                  }
                                  
                                  // Download
                                  XLSX.writeFile(wb, `${item.label}_data.xlsx`);
                                  alert('Academic year data exported successfully!');
                                } catch (err) {
                                  console.error('Export error:', err);
                                  alert(err instanceof Error ? err.message : 'Failed to export data');
                                }
                              }}
                            >
                              <Download size={14} style={{ marginRight: '6px' }} />
                              Export Data
                            </Button>
                          )}
                          {activeTab === 'classrooms' && (
                            <Button 
                              variant="secondary" 
                              size="small"
                              onClick={(e) => {
                                e.stopPropagation();
                                openTeacherAssignmentModal(item);
                              }}
                            >
                              <UserCheck size={14} style={{ marginRight: '6px' }} />
                              Assign Teachers
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </Card>

        {/* Teacher Assignment Modal */}
        {showTeacherModal && selectedClassroom && (
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
            padding: '20px'
          }}>
            <div style={{ maxWidth: '800px', width: '100%', maxHeight: '80vh', overflow: 'auto' }}>
              <Card>
              <div style={{ padding: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  <h2 style={{ fontSize: '20px', fontWeight: 600, color: '#0f172a' }}>
                    Assign Teachers - {selectedClassroom.classroom_code}
                  </h2>
                  <button
                    onClick={() => setShowTeacherModal(false)}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#64748b'
                    }}
                  >
                    <X size={24} />
                  </button>
                </div>

                <div style={{ marginBottom: '20px', padding: '12px', background: '#f1f5f9', borderRadius: '6px', fontSize: '14px', color: '#64748b' }}>
                  <strong>Class:</strong> {selectedClassroom.grade_name} {selectedClassroom.division_name}
                  {selectedClassroom.class_teacher_name && (
                    <span style={{ marginLeft: '16px' }}>
                      <strong>Class Teacher:</strong> {selectedClassroom.class_teacher_name}
                    </span>
                  )}
                </div>

                <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px', color: '#0f172a' }}>
                  Subject Teacher Assignments
                </h3>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {subjects.filter(s => s.status === 'active').map(subject => {
                    const assignment = teachingAssignments.find(ta => ta.subject_id === subject.id);
                    
                    return (
                      <div key={subject.id} style={{
                        padding: '16px',
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}>
                        <div>
                          <div style={{ fontWeight: 600, color: '#0f172a' }}>{subject.name}</div>
                          <div style={{ fontSize: '13px', color: '#64748b', marginTop: '2px' }}>
                            Code: {subject.subject_code}
                          </div>
                          {assignment && (
                            <div style={{ fontSize: '13px', color: '#16a34a', marginTop: '4px', fontWeight: 500 }}>
                              Assigned to: {assignment.teacher_name}
                            </div>
                          )}
                        </div>
                        <div>
                          {!assignment ? (
                            <select
                              onChange={(e) => {
                                const teacherId = e.target.value;
                                console.log('Teacher selected:', teacherId, 'for subject:', subject.id);
                                console.log('Available teachers:', teachers);
                                if (teacherId) {
                                  handleTeacherAssignment(subject.id, teacherId);
                                  e.target.value = '';
                                }
                              }}
                              style={{
                                padding: '6px 12px',
                                border: '1px solid #e2e8f0',
                                borderRadius: '6px',
                                fontSize: '14px',
                                background: 'white',
                                minWidth: '200px'
                              }}
                            >
                              <option value="">Assign Teacher...</option>
                              {teachers.filter(t => t.status === 'active').map(teacher => (
                                <option key={teacher.id || teacher.user_id} value={teacher.id || teacher.user_id}>
                                  {teacher.full_name || `${teacher.first_name} ${teacher.last_name}`}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <span style={{
                              padding: '6px 12px',
                              background: '#dcfce7',
                              color: '#166534',
                              borderRadius: '6px',
                              fontSize: '13px',
                              fontWeight: 500
                            }}>
                              âœ“ Assigned
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {subjects.filter(s => s.status === 'active').length === 0 && (
                  <div style={{ textAlign: 'center', padding: '32px', color: '#64748b' }}>
                    No active subjects found. Create subjects first before assigning teachers.
                  </div>
                )}

                <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end' }}>
                  <Button onClick={() => setShowTeacherModal(false)}>
                    Done
                  </Button>
                </div>
              </div>
            </Card>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}






