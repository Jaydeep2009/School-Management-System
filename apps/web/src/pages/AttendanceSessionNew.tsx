/**
 * New Attendance Session Page
 */

import { useState, useEffect, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../components/layout/Layout';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { useAuth } from '../hooks/useAuth';
import { apiService } from '../services/api';
import { ArrowLeft, Save } from 'lucide-react';

export function AttendanceSessionNew() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    academic_year_id: '',
    classroom_id: '',
    subject_id: '',
    session_date: new Date().toISOString().split('T')[0],
    period_no: 1,
  });

  const [academicYears, setAcademicYears] = useState<any[]>([]);
  const [classrooms, setClassrooms] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [yearsRes, classroomsRes, subjectsRes] = await Promise.all([
        apiService.getAcademicYears(),
        apiService.getClassrooms(),
        apiService.getSubjects(),
      ]);
      
      setAcademicYears(yearsRes.data);
      setClassrooms(classroomsRes.data);
      setSubjects(subjectsRes.data);

      // Set default to current academic year
      const currentYear = yearsRes.data.find((y: any) => y.is_current);
      if (currentYear) {
        setFormData(prev => ({ ...prev, academic_year_id: currentYear.id }));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.academic_year_id || !formData.classroom_id || !formData.subject_id) {
      setError('Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await apiService.createAttendanceSession(formData);
      navigate(`/attendance/${response.data.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create session');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!user) return null;

  return (
    <Layout schoolName={'SMS'} principalName={"User"} onLogout={logout}>
      <div style={{ padding: '32px', maxWidth: '800px', margin: '0 auto' }}>
        <div style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Button variant="secondary" onClick={() => navigate('/attendance')}>
            <ArrowLeft size={16} />
          </Button>
          <div>
            <h1 style={{ fontSize: '28px', fontWeight: 600, color: '#0f172a' }}>
              New Attendance Session
            </h1>
            <p style={{ fontSize: '14px', color: '#64748b' }}>
              Create a new attendance session
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
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#0f172a', marginBottom: '6px' }}>
                  Academic Year <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <select
                  value={formData.academic_year_id}
                  onChange={(e) => setFormData(prev => ({ ...prev, academic_year_id: e.target.value }))}
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

              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#0f172a', marginBottom: '6px' }}>
                  Classroom <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <select
                  value={formData.classroom_id}
                  onChange={(e) => setFormData(prev => ({ ...prev, classroom_id: e.target.value }))}
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
                  {classrooms.map(classroom => (
                    <option key={classroom.id} value={classroom.id}>{classroom.classroom_name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#0f172a', marginBottom: '6px' }}>
                  Subject <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <select
                  value={formData.subject_id}
                  onChange={(e) => setFormData(prev => ({ ...prev, subject_id: e.target.value }))}
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
                  <option value="">Select Subject</option>
                  {subjects.map(subject => (
                    <option key={subject.id} value={subject.id}>{subject.subject_name}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#0f172a', marginBottom: '6px' }}>
                    Session Date <span style={{ color: '#dc2626' }}>*</span>
                  </label>
                  <input
                    type="date"
                    value={formData.session_date}
                    onChange={(e) => setFormData(prev => ({ ...prev, session_date: e.target.value }))}
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

                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#0f172a', marginBottom: '6px' }}>
                    Period No. <span style={{ color: '#dc2626' }}>*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={formData.period_no}
                    onChange={(e) => setFormData(prev => ({ ...prev, period_no: parseInt(e.target.value) || 1 }))}
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
              </div>

              <div style={{ display: 'flex', gap: '12px', paddingTop: '16px', borderTop: '1px solid #e2e8f0' }}>
                <Button type="submit" disabled={isSubmitting}>
                  <Save size={16} style={{ marginRight: '8px' }} />
                  {isSubmitting ? 'Creating...' : 'Create Session'}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => navigate('/attendance')}
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





