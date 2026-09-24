/**
 * Promotion Batch Form - Create Promotion Batches
 */

import { useState, useEffect, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../components/layout/Layout';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { useAuth } from '../hooks/useAuth';
import { apiService } from '../services/api';
import { ArrowLeft, Save } from 'lucide-react';

interface PromotionBatchFormData {
  from_academic_year_id: string;
  to_academic_year_id: string;
  from_classroom_id: string;
  to_classroom_id: string;
  description: string;
}

export function PromotionBatchForm() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState<PromotionBatchFormData>({
    from_academic_year_id: '',
    to_academic_year_id: '',
    from_classroom_id: '',
    to_classroom_id: '',
    description: '',
  });

  const [academicYears, setAcademicYears] = useState<any[]>([]);
  const [classrooms, setClassrooms] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [yearsRes, classroomsRes] = await Promise.all([
        apiService.getAcademicYears(),
        apiService.getClassrooms(),
      ]);
      
      setAcademicYears(yearsRes.data);
      setClassrooms(classroomsRes.data);

      // Auto-select current year as "from" year
      const currentYear = yearsRes.data.find((y: any) => y.is_current);
      if (currentYear) {
        setFormData(prev => ({ ...prev, from_academic_year_id: currentYear.id }));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.from_academic_year_id) {
      setError('Source academic year is required');
      return;
    }
    if (!formData.to_academic_year_id) {
      setError('Target academic year is required');
      return;
    }
    if (!formData.from_classroom_id) {
      setError('Source classroom is required');
      return;
    }
    if (!formData.to_classroom_id) {
      setError('Target classroom is required');
      return;
    }
    if (formData.from_academic_year_id === formData.to_academic_year_id) {
      setError('Source and target academic years must be different');
      return;
    }

    setIsSubmitting(true);

    try {
      const fromClassroom = classrooms.find(c => c.id === formData.from_classroom_id);
      const toClassroom = classrooms.find(c => c.id === formData.to_classroom_id);
      const submitData = {
        name: `${fromClassroom?.classroom_name || 'Unknown'} → ${toClassroom?.classroom_name || 'Unknown'}`,
        from_academic_year_id: formData.from_academic_year_id,
        to_academic_year_id: formData.to_academic_year_id,
        from_classroom_id: formData.from_classroom_id,
        to_classroom_id: formData.to_classroom_id,
        description: formData.description,
      };
      const response = await apiService.createPromotionBatch(submitData);
      navigate(`/promotions/${response.data.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create promotion batch');
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateField = (field: keyof PromotionBatchFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  if (!user) return null;

  const fromClassrooms = classrooms.filter(c => c.academic_year_id === formData.from_academic_year_id);
  const toClassrooms = classrooms.filter(c => c.academic_year_id === formData.to_academic_year_id);

  return (
    <Layout schoolName={'SMS'} principalName={"User"} onLogout={logout}>
      <div style={{ padding: '32px', maxWidth: '800px', margin: '0 auto' }}>
        <div style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Button variant="secondary" onClick={() => navigate('/promotions')}>
            <ArrowLeft size={16} />
          </Button>
          <div>
            <h1 style={{ fontSize: '28px', fontWeight: 600, color: '#0f172a' }}>
              Create Promotion Batch
            </h1>
            <p style={{ fontSize: '14px', color: '#64748b' }}>
              Promote students from one classroom to another
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
              {/* From Academic Year */}
              <div>
                <label htmlFor="from_academic_year_id" style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#0f172a', marginBottom: '6px' }}>
                  From Academic Year <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <select
                  id="from_academic_year_id"
                  value={formData.from_academic_year_id}
                  onChange={(e) => updateField('from_academic_year_id', e.target.value)}
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

              {/* From Classroom */}
              <div>
                <label htmlFor="from_classroom_id" style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#0f172a', marginBottom: '6px' }}>
                  From Classroom <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <select
                  id="from_classroom_id"
                  value={formData.from_classroom_id}
                  onChange={(e) => updateField('from_classroom_id', e.target.value)}
                  disabled={isSubmitting || !formData.from_academic_year_id}
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
                  {fromClassrooms.map(classroom => (
                    <option key={classroom.id} value={classroom.id}>{classroom.classroom_name}</option>
                  ))}
                </select>
              </div>

              <div style={{ borderTop: '2px solid #e2e8f0', margin: '8px 0' }} />

              {/* To Academic Year */}
              <div>
                <label htmlFor="to_academic_year_id" style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#0f172a', marginBottom: '6px' }}>
                  To Academic Year <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <select
                  id="to_academic_year_id"
                  value={formData.to_academic_year_id}
                  onChange={(e) => updateField('to_academic_year_id', e.target.value)}
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

              {/* To Classroom */}
              <div>
                <label htmlFor="to_classroom_id" style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#0f172a', marginBottom: '6px' }}>
                  To Classroom <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <select
                  id="to_classroom_id"
                  value={formData.to_classroom_id}
                  onChange={(e) => updateField('to_classroom_id', e.target.value)}
                  disabled={isSubmitting || !formData.to_academic_year_id}
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
                  {toClassrooms.map(classroom => (
                    <option key={classroom.id} value={classroom.id}>{classroom.classroom_name}</option>
                  ))}
                </select>
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
                  placeholder="Optional notes about this promotion"
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
                  {isSubmitting ? 'Creating...' : 'Create Batch'}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => navigate('/promotions')}
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





