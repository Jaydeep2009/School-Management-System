/**
 * Fee Charge Form - Create Fee Charges
 */

import { useState, useEffect, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../components/layout/Layout';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { useAuth } from '../hooks/useAuth';
import { apiService } from '../services/api';
import { ArrowLeft, Save } from 'lucide-react';

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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [chargeType, setChargeType] = useState<'individual' | 'classroom'>('classroom');

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (formData.classroom_id) {
      loadStudentsInClassroom(formData.classroom_id);
    }
  }, [formData.classroom_id]);

  const loadData = async () => {
    try {
      const [categoriesRes, yearsRes, classroomsRes] = await Promise.all([
        apiService.getFeeCategories(),
        apiService.getAcademicYears(),
        apiService.getClassrooms(),
      ]);
      
      setCategories(categoriesRes.data);
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

  const loadStudentsInClassroom = async (classroomId: string) => {
    try {
      const response = await apiService.getStudents({ classroom_id: classroomId });
      setStudents(response.data);
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
      const submitData = {
        ...formData,
        due_at: formData.due_date ? new Date(formData.due_date).getTime() : undefined,
      };

      if (chargeType === 'classroom') {
        // Backend handles creating charges for all students in classroom
        delete (submitData as any).student_id;
      } else {
        // Individual charge
        delete (submitData as any).classroom_id;
      }

      await apiService.createFeeCharge(submitData);
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

  if (!user) return null;

  const filteredClassrooms = classrooms.filter(c => 
    !formData.academic_year_id || c.academic_year_id === formData.academic_year_id
  );

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
                    <option key={cat.id} value={cat.id}>{cat.category_name}</option>
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

              {/* Classroom (for classroom charge type) */}
              {chargeType === 'classroom' && (
                <div>
                  <label htmlFor="classroom_id" style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#0f172a', marginBottom: '6px' }}>
                    Classroom <span style={{ color: '#dc2626' }}>*</span>
                  </label>
                  <select
                    id="classroom_id"
                    value={formData.classroom_id}
                    onChange={(e) => updateField('classroom_id', e.target.value)}
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
                    <option value="">Select Classroom</option>
                    {filteredClassrooms.map(classroom => (
                      <option key={classroom.id} value={classroom.id}>{classroom.classroom_name}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Student (for individual charge type) */}
              {chargeType === 'individual' && (
                <>
                  <div>
                    <label htmlFor="classroom_id_filter" style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#0f172a', marginBottom: '6px' }}>
                      Filter by Classroom
                    </label>
                    <select
                      id="classroom_id_filter"
                      value={formData.classroom_id}
                      onChange={(e) => updateField('classroom_id', e.target.value)}
                      disabled={isSubmitting}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        fontSize: '14px',
                        border: '1px solid #e2e8f0',
                        borderRadius: '6px',
                      }}
                    >
                      <option value="">All Students</option>
                      {filteredClassrooms.map(classroom => (
                        <option key={classroom.id} value={classroom.id}>{classroom.classroom_name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="student_id" style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#0f172a', marginBottom: '6px' }}>
                      Student <span style={{ color: '#dc2626' }}>*</span>
                    </label>
                    <select
                      id="student_id"
                      value={formData.student_id}
                      onChange={(e) => updateField('student_id', e.target.value)}
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
                      <option value="">Select Student</option>
                      {students.map(student => (
                        <option key={student.id} value={student.id}>
                          {student.name} {student.student_code && `(${student.student_code})`}
                        </option>
                      ))}
                    </select>
                  </div>
                </>
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
                  placeholder="Optional description"
                  rows={3}
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





