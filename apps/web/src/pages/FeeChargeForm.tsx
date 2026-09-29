/**
 * Fee Charge Form - Create Fee Charges
 */

import { useState, useEffect, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../components/layout/Layout';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { useAuth } from '../hooks/useAuth';
import { useAcademicYear } from '../contexts/AcademicYearContext';
import { apiService } from '../services/api';
import { ArrowLeft, Save, Search } from 'lucide-react';

interface FeeChargeFormData {
  fee_category_id: string;
  academic_year_id: string;
  classroom_id: string;
  student_id: string;
  amount: number;
  due_date: string;
  description: string;
}

export function FeeChargeForm() {
  const { user, logout } = useAuth();
  const { selectedYear } = useAcademicYear();
  const navigate = useNavigate();

  const [formData, setFormData] = useState<FeeChargeFormData>({
    fee_category_id: '',
    academic_year_id: '',
    classroom_id: '',
    student_id: '',
    amount: 0,
    due_date: '',
    description: '',
  });

  const [categories, setCategories] = useState<any[]>([]);
  const [academicYears, setAcademicYears] = useState<any[]>([]);
  const [classrooms, setClassrooms] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [studentSearch, setStudentSearch] = useState('');
  const [showStudentDropdown, setShowStudentDropdown] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [chargeType, setChargeType] = useState<'individual' | 'classroom'>('classroom');

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (formData.academic_year_id) {
      loadClassrooms(formData.academic_year_id);
    }
  }, [formData.academic_year_id]);

  useEffect(() => {
    if (formData.classroom_id) {
      loadStudentsInClassroom(formData.classroom_id);
    } else if (formData.academic_year_id) {
      loadAllStudents(formData.academic_year_id);
    }
  }, [formData.classroom_id, formData.academic_year_id]);

  const loadData = async () => {
    try {
      const [categoriesRes, yearsRes] = await Promise.all([
        apiService.getFeeCategories(),
        apiService.getAcademicYears(),
      ]);
      
      setCategories(categoriesRes.data);
      setAcademicYears(yearsRes.data);

      const currentYear = yearsRes.data.find((y: any) => y.is_current) || selectedYear;
      if (currentYear) {
        setFormData(prev => ({ ...prev, academic_year_id: currentYear.id }));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    }
  };

  const loadClassrooms = async (academicYearId: string) => {
    try {
      const response = await apiService.getClassrooms({ academic_year_id: academicYearId });
      setClassrooms(response.data || []);
    } catch (err) {
      console.error('Failed to load classrooms:', err);
      setError('Failed to load classrooms');
    }
  };

  const loadStudentsInClassroom = async (classroomId: string) => {
    try {
      const response = await apiService.getStudents({ classroom_id: classroomId });
      setStudents(response.data || []);
    } catch (err) {
      console.error('Failed to load students:', err);
    }
  };

  const loadAllStudents = async (academicYearId: string) => {
    try {
      const response = await apiService.getStudents({ academic_year_id: academicYearId });
      setStudents(response.data || []);
    } catch (err) {
      console.error('Failed to load students:', err);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.fee_category_id) {
      setError('Fee category is required');
      return;
    }
    if (!formData.academic_year_id) {
      setError('Academic year is required');
      return;
    }
    if (chargeType === 'classroom' && !formData.classroom_id) {
      setError('Classroom is required');
      return;
    }
    if (chargeType === 'individual' && !formData.student_id) {
      setError('Student is required');
      return;
    }
    if (formData.amount <= 0) {
      setError('Amount must be greater than 0');
      return;
    }

    setIsSubmitting(true);

    try {
      const category = categories.find(c => c.id === formData.fee_category_id);
      const title = category ? category.name : 'Fee Charge';

      if (chargeType === 'classroom') {
        const response = await apiService.getStudents({ classroom_id: formData.classroom_id });
        const studentsInClass = response.data || [];

        if (studentsInClass.length === 0) {
          setError('No students found in the selected classroom');
          setIsSubmitting(false);
          return;
        }

        let successCount = 0;
        let failCount = 0;

        for (const student of studentsInClass) {
          if (!student.id && !student.user_id) {
            console.error('Student missing ID:', student);
            failCount++;
            continue;
          }

          try {
            const chargeData = {
              fee_category_id: formData.fee_category_id,
              academic_year_id: formData.academic_year_id,
              student_id: student.id || student.user_id,
              amount: formData.amount,
              due_date: formData.due_date,
              title: title,
            };
            
            await apiService.createFeeCharge(chargeData);
            successCount++;
          } catch (err) {
            console.error(`Failed to create charge for student ${student.full_name}:`, err);
            failCount++;
          }
        }

        if (failCount > 0) {
          setError(`Created ${successCount} charges, ${failCount} failed`);
          setIsSubmitting(false);
          return;
        }
      } else {
        await apiService.createFeeCharge({
          fee_category_id: formData.fee_category_id,
          academic_year_id: formData.academic_year_id,
          student_id: formData.student_id,
          amount: formData.amount,
          due_date: formData.due_date,
          title: title,
        });
      }

      navigate('/fees');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create fee charge');
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateField = (field: keyof FeeChargeFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const selectStudent = (student: any) => {
    updateField('student_id', student.id);
    setStudentSearch(`${student.full_name || student.name} ${student.student_code ? `(${student.student_code})` : ''}`);
    setShowStudentDropdown(false);
  };

  const filteredStudents = students.filter(student => {
    if (!studentSearch) return true;
    const search = studentSearch.toLowerCase();
    const name = (student.full_name || student.name || '').toLowerCase();
    const code = (student.student_code || student.admission_number || '').toLowerCase();
    return name.includes(search) || code.includes(search);
  });

  if (!user) return null;

  const selectedStudent = students.find(s => s.id === formData.student_id);

  return (
    <Layout schoolName={'SMS'} principalName={"User"} onLogout={logout}>
      <div style={{ padding: '32px', maxWidth: '800px', margin: '0 auto' }}>
        <div style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Button variant="secondary" onClick={() => navigate('/fees')}>
            <ArrowLeft size={16} />
          </Button>
          <div>
            <h1 style={{ fontSize: '28px', fontWeight: 600, color: '#0f172a' }}>
              Create Fee Charge
            </h1>
            <p style={{ fontSize: '14px', color: '#64748b' }}>
              Charge fees to students or classrooms
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
              {/* Charge Type */}
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#0f172a', marginBottom: '6px' }}>
                  Charge Type <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button
                    type="button"
                    onClick={() => setChargeType('classroom')}
                    disabled={isSubmitting}
                    style={{
                      flex: 1,
                      padding: '12px',
                      border: chargeType === 'classroom' ? '2px solid #6366f1' : '1px solid #e2e8f0',
                      background: chargeType === 'classroom' ? '#eef2ff' : 'white',
                      color: chargeType === 'classroom' ? '#4338ca' : '#64748b',
                      borderRadius: '6px',
                      fontSize: '14px',
                      fontWeight: 500,
                      cursor: 'pointer',
                    }}
                  >
                    Entire Classroom
                  </button>
                  <button
                    type="button"
                    onClick={() => setChargeType('individual')}
                    disabled={isSubmitting}
                    style={{
                      flex: 1,
                      padding: '12px',
                      border: chargeType === 'individual' ? '2px solid #6366f1' : '1px solid #e2e8f0',
                      background: chargeType === 'individual' ? '#eef2ff' : 'white',
                      color: chargeType === 'individual' ? '#4338ca' : '#64748b',
                      borderRadius: '6px',
                      fontSize: '14px',
                      fontWeight: 500,
                      cursor: 'pointer',
                    }}
                  >
                    Individual Student
                  </button>
                </div>
              </div>

              {/* Fee Category */}
              <div>
                <label htmlFor="fee_category_id" style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#0f172a', marginBottom: '6px' }}>
                  Fee Category <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <select
                  id="fee_category_id"
                  value={formData.fee_category_id}
                  onChange={(e) => updateField('fee_category_id', e.target.value)}
                  disabled={isSubmitting}
                  required
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    fontSize: '14px',
                    border: '1px solid #e2e8f0',
                    borderRadius: '6px',
                  }}
                >
                  <option value="">Select Category</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>

              {/* Academic Year */}
              <div>
                <label htmlFor="academic_year_id" style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#0f172a', marginBottom: '6px' }}>
                  Academic Year <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <select
                  id="academic_year_id"
                  value={formData.academic_year_id}
                  onChange={(e) => updateField('academic_year_id', e.target.value)}
                  disabled={isSubmitting}
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

              {/* Classroom Filter */}
              <div>
                <label htmlFor="classroom_id" style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#0f172a', marginBottom: '6px' }}>
                  {chargeType === 'classroom' ? 'Classroom' : 'Filter by Classroom'} {chargeType === 'classroom' && <span style={{ color: '#dc2626' }}>*</span>}
                </label>
                <select
                  id="classroom_id"
                  value={formData.classroom_id}
                  onChange={(e) => updateField('classroom_id', e.target.value)}
                  disabled={isSubmitting}
                  required={chargeType === 'classroom'}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    fontSize: '14px',
                    border: '1px solid #e2e8f0',
                    borderRadius: '6px',
                  }}
                >
                  <option value="">{chargeType === 'classroom' ? 'Select Classroom' : 'All Students'}</option>
                  {classrooms.map(classroom => (
                    <option key={classroom.id} value={classroom.id}>
                      {classroom.classroom_code} - {classroom.grade_name} {classroom.division_name}
                    </option>
                  ))}
                </select>
                {classrooms.length === 0 && formData.academic_year_id && (
                  <div style={{ fontSize: '12px', color: '#dc2626', marginTop: '4px' }}>
                    No classrooms found for the selected academic year
                  </div>
                )}
              </div>

              {/* Student Search (for individual charge type) */}
              {chargeType === 'individual' && (
                <div style={{ position: 'relative' }}>
                  <label htmlFor="student_search" style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#0f172a', marginBottom: '6px' }}>
                    Student <span style={{ color: '#dc2626' }}>*</span>
                  </label>
                  <div style={{ position: 'relative' }}>
                    <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
                    <input
                      id="student_search"
                      type="text"
                      value={studentSearch}
                      onChange={(e) => {
                        setStudentSearch(e.target.value);
                        setShowStudentDropdown(true);
                      }}
                      onFocus={() => setShowStudentDropdown(true)}
                      placeholder="Search by name or student code..."
                      disabled={isSubmitting}
                      autoComplete="off"
                      style={{
                        width: '100%',
                        padding: '8px 12px 8px 40px',
                        fontSize: '14px',
                        border: '1px solid #e2e8f0',
                        borderRadius: '6px',
                      }}
                    />
                  </div>
                  {showStudentDropdown && filteredStudents.length > 0 && (
                    <div style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      right: 0,
                      maxHeight: '300px',
                      overflowY: 'auto',
                      background: 'white',
                      border: '1px solid #e2e8f0',
                      borderRadius: '6px',
                      marginTop: '4px',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                      zIndex: 10,
                    }}>
                      {filteredStudents.map(student => (
                        <div
                          key={student.id}
                          onClick={() => selectStudent(student)}
                          style={{
                            padding: '10px 12px',
                            cursor: 'pointer',
                            borderBottom: '1px solid #f1f5f9',
                            transition: 'background 0.2s',
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.background = '#f8fafc'}
                          onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
                        >
                          <div style={{ fontWeight: 500, color: '#0f172a' }}>
                            {student.full_name || student.name}
                          </div>
                          {(student.student_code || student.admission_number) && (
                            <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                              {student.student_code || student.admission_number}
                              {student.classroom_code && ` • ${student.classroom_code}`}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  {selectedStudent && (
                    <div style={{ fontSize: '12px', color: '#16a34a', marginTop: '4px' }}>
                      ✓ Selected: {selectedStudent.full_name || selectedStudent.name}
                    </div>
                  )}
                  {students.length === 0 && (
                    <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>
                      {formData.classroom_id ? 'No students in selected classroom' : 'No students found'}
                    </div>
                  )}
                </div>
              )}

              {/* Amount */}
              <div>
                <label htmlFor="amount" style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#0f172a', marginBottom: '6px' }}>
                  Amount <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <input
                  id="amount"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) => updateField('amount', parseFloat(e.target.value) || 0)}
                  disabled={isSubmitting}
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
                  {isSubmitting ? 'Creating...' : 'Create Fee Charge'}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => navigate('/fees')}
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
