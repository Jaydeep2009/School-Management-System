/**
 * Assessment Detail Page with Marks Entry Grid
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Layout } from '../components/layout/Layout';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Skeleton } from '../components/ui/Skeleton';
import { ErrorState } from '../components/ui/ErrorState';
import { useAuth } from '../hooks/useAuth';
import { apiService } from '../services/api';
import { ArrowLeft, Edit, Lock, Unlock, Save, CheckCircle } from 'lucide-react';

interface MarkEntry {
  student_id: string;
  student_name: string;
  student_code?: string;
  roll_number?: string;
  status: 'graded' | 'absent' | 'exempt';
  marks_obtained: number | null;
}

export function AssessmentDetail() {
  const { id } = useParams<{ id: string }>();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  
  const [assessment, setAssessment] = useState<any>(null);
  const [marks, setMarks] = useState<MarkEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState(false);

  useEffect(() => {
    loadAssessmentData();
  }, [id]);

  const loadAssessmentData = async () => {
    if (!id) return;
    try {
      setIsLoading(true);
      setError(null);
      const [assessmentRes, marksRes] = await Promise.all([
        apiService.getAssessment(id),
        apiService.getAssessmentMarks(id),
      ]);
      
      setAssessment(assessmentRes.data);
      
      // Transform marks data into entry format
      const entries: MarkEntry[] = marksRes.data.map((mark: any) => ({
        student_id: mark.student_id,
        student_name: mark.student_name || 'Unknown Student',
        student_code: mark.student_code,
        roll_number: mark.roll_number,
        status: mark.status || 'graded',
        marks_obtained: mark.marks_obtained,
      }));
      
      setMarks(entries);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load assessment');
    } finally {
      setIsLoading(false);
    }
  };

  const updateMarkEntry = (studentId: string, updates: Partial<MarkEntry>) => {
    setMarks(prev => prev.map(entry => 
      entry.student_id === studentId ? { ...entry, ...updates } : entry
    ));
  };

  const handleSave = async () => {
    if (!id) return;
    setIsSaving(true);
    try {
      // Transform to API format
      const entries = marks.map(m => ({
        student_id: m.student_id,
        status: m.status,
        marks_obtained: m.status === 'graded' ? m.marks_obtained : null,
      }));

      await apiService.updateAssessmentMarks(id, entries);
      await loadAssessmentData();
      alert('Marks saved successfully');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to save marks');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePublish = async () => {
    if (!id || !confirm('Publish this assessment? Students will be able to see their marks.')) return;
    setIsActionLoading(true);
    try {
      await apiService.publishAssessment(id);
      await loadAssessmentData();
      alert('Assessment published successfully');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to publish assessment');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleLock = async () => {
    if (!id || !confirm('Lock this assessment? Teachers will not be able to modify marks after locking.')) return;
    setIsActionLoading(true);
    try {
      await apiService.lockAssessment(id);
      await loadAssessmentData();
      alert('Assessment locked successfully');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to lock assessment');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleUnlock = async () => {
    if (!id || !confirm('Unlock this assessment? Teachers will be able to modify marks again.')) return;
    setIsActionLoading(true);
    try {
      // Note: Backend needs unlock endpoint - using update as fallback
      await apiService.updateAssessment(id, { is_locked: false } as any);
      await loadAssessmentData();
      alert('Assessment unlocked successfully');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to unlock assessment');
    } finally {
      setIsActionLoading(false);
    }
  };

  if (!user) return null;

  if (isLoading) {
    return (
      <Layout schoolName={'SMS'} principalName={"User"} onLogout={logout} role={user?.role}>
        <div style={{ padding: '32px' }}>
          <Skeleton height="300px" />
        </div>
      </Layout>
    );
  }

  if (error || !assessment) {
    return (
      <Layout schoolName={'SMS'} principalName={"User"} onLogout={logout} role={user?.role}>
        <div style={{ padding: '32px' }}>
          <ErrorState message={error || 'Assessment not found'} onRetry={loadAssessmentData} />
        </div>
      </Layout>
    );
  }

  const isLocked = assessment.is_locked;
  const isPublished = assessment.is_published;
  const gradedCount = marks.filter(m => m.status === 'graded').length;
  const absentCount = marks.filter(m => m.status === 'absent').length;
  const exemptCount = marks.filter(m => m.status === 'exempt').length;

  return (
    <Layout schoolName={'SMS'} principalName={"User"} onLogout={logout} role={user?.role}>
      <div style={{ padding: '32px' }}>
        <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
          <div style={{ display: 'flex', alignItems: 'start', gap: '12px' }}>
            <Button variant="secondary" onClick={() => navigate(user?.role === 'teacher' ? '/teacher/marks' : '/marks')}>
              <ArrowLeft size={16} />
            </Button>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '4px' }}>
                <h1 style={{ fontSize: '28px', fontWeight: 600, color: '#0f172a' }}>
                  {assessment.name}
                </h1>
                {isPublished && (
                  <span style={{
                    padding: '4px 12px',
                    background: '#dcfce7',
                    color: '#166534',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontWeight: 500,
                  }}>
                    Published
                  </span>
                )}
                {isLocked && (
                  <span style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '4px 12px',
                    background: '#fee2e2',
                    color: '#dc2626',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontWeight: 500,
                  }}>
                    <Lock size={14} />
                    Locked
                  </span>
                )}
              </div>
              <p style={{ fontSize: '14px', color: '#64748b' }}>
                {assessment.classroom_name} • {assessment.subject_name} • Max: {assessment.max_marks} marks
                {assessment.weightage && ` • Weight: ${assessment.weightage}%`}
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <Button variant="secondary" onClick={() => navigate(`/marks/${id}/edit`)}>
              <Edit size={16} style={{ marginRight: '8px' }} />
              Edit
            </Button>
            {!isLocked && (
              <Button onClick={handleSave} disabled={isSaving}>
                <Save size={16} style={{ marginRight: '8px' }} />
                {isSaving ? 'Saving...' : 'Save Marks'}
              </Button>
            )}
            {!isPublished && (
              <Button onClick={handlePublish} disabled={isActionLoading}>
                <CheckCircle size={16} style={{ marginRight: '8px' }} />
                Publish
              </Button>
            )}
            {!isLocked ? (
              <Button variant="secondary" onClick={handleLock} disabled={isActionLoading}>
                <Lock size={16} style={{ marginRight: '8px' }} />
                Lock
              </Button>
            ) : (
              <Button variant="secondary" onClick={handleUnlock} disabled={isActionLoading}>
                <Unlock size={16} style={{ marginRight: '8px' }} />
                Unlock
              </Button>
            )}
          </div>
        </div>

        {/* Summary */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
          <Card>
            <div style={{ padding: '16px', textAlign: 'center' }}>
              <div style={{ fontSize: '32px', fontWeight: 600, color: '#0f172a', marginBottom: '4px' }}>
                {marks.length}
              </div>
              <div style={{ fontSize: '14px', color: '#64748b' }}>Total Students</div>
            </div>
          </Card>
          <Card>
            <div style={{ padding: '16px', textAlign: 'center' }}>
              <div style={{ fontSize: '32px', fontWeight: 600, color: '#16a34a', marginBottom: '4px' }}>
                {gradedCount}
              </div>
              <div style={{ fontSize: '14px', color: '#64748b' }}>Graded</div>
            </div>
          </Card>
          <Card>
            <div style={{ padding: '16px', textAlign: 'center' }}>
              <div style={{ fontSize: '32px', fontWeight: 600, color: '#dc2626', marginBottom: '4px' }}>
                {absentCount}
              </div>
              <div style={{ fontSize: '14px', color: '#64748b' }}>Absent</div>
            </div>
          </Card>
          <Card>
            <div style={{ padding: '16px', textAlign: 'center' }}>
              <div style={{ fontSize: '32px', fontWeight: 600, color: '#6366f1', marginBottom: '4px' }}>
                {exemptCount}
              </div>
              <div style={{ fontSize: '14px', color: '#64748b' }}>Exempt</div>
            </div>
          </Card>
        </div>

        {/* Marks Entry Grid */}
        <Card>
          <div style={{ padding: '24px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#0f172a', marginBottom: '16px' }}>
              Student Marks
            </h2>
            
            {marks.length === 0 ? (
              <div style={{ padding: '48px', textAlign: 'center', color: '#64748b' }}>
                <p>No students enrolled in this class</p>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #e2e8f0' }}>
                      <th style={{ padding: '12px', textAlign: 'left', fontSize: '14px', fontWeight: 600, color: '#64748b' }}>Roll No.</th>
                      <th style={{ padding: '12px', textAlign: 'left', fontSize: '14px', fontWeight: 600, color: '#64748b' }}>Student</th>
                      <th style={{ padding: '12px', textAlign: 'left', fontSize: '14px', fontWeight: 600, color: '#64748b' }}>Code</th>
                      <th style={{ padding: '12px', textAlign: 'center', fontSize: '14px', fontWeight: 600, color: '#64748b' }}>Status</th>
                      <th style={{ padding: '12px', textAlign: 'center', fontSize: '14px', fontWeight: 600, color: '#64748b' }}>Marks</th>
                    </tr>
                  </thead>
                  <tbody>
                    {marks.map((entry) => (
                      <tr key={entry.student_id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                        <td style={{ padding: '12px', fontSize: '14px', color: '#64748b' }}>
                          {entry.roll_number || '—'}
                        </td>
                        <td style={{ padding: '12px', fontSize: '14px', fontWeight: 500, color: '#0f172a' }}>
                          {entry.student_name}
                        </td>
                        <td style={{ padding: '12px', fontSize: '14px', color: '#64748b' }}>
                          {entry.student_code || '—'}
                        </td>
                        <td style={{ padding: '12px' }}>
                          <div style={{ display: 'flex', justifyContent: 'center', gap: '4px' }}>
                            <button
                              onClick={() => updateMarkEntry(entry.student_id, { status: 'graded', marks_obtained: 0 })}
                              disabled={isLocked}
                              style={{
                                padding: '6px 12px',
                                border: entry.status === 'graded' ? '2px solid #16a34a' : '1px solid #e2e8f0',
                                background: entry.status === 'graded' ? '#dcfce7' : 'white',
                                color: entry.status === 'graded' ? '#16a34a' : '#64748b',
                                borderRadius: '4px',
                                fontSize: '12px',
                                fontWeight: 500,
                                cursor: isLocked ? 'not-allowed' : 'pointer',
                              }}
                            >
                              Grade
                            </button>
                            <button
                              onClick={() => updateMarkEntry(entry.student_id, { status: 'absent', marks_obtained: null })}
                              disabled={isLocked}
                              style={{
                                padding: '6px 12px',
                                border: entry.status === 'absent' ? '2px solid #dc2626' : '1px solid #e2e8f0',
                                background: entry.status === 'absent' ? '#fee2e2' : 'white',
                                color: entry.status === 'absent' ? '#dc2626' : '#64748b',
                                borderRadius: '4px',
                                fontSize: '12px',
                                fontWeight: 500,
                                cursor: isLocked ? 'not-allowed' : 'pointer',
                              }}
                            >
                              Absent
                            </button>
                            <button
                              onClick={() => updateMarkEntry(entry.student_id, { status: 'exempt', marks_obtained: null })}
                              disabled={isLocked}
                              style={{
                                padding: '6px 12px',
                                border: entry.status === 'exempt' ? '2px solid #6366f1' : '1px solid #e2e8f0',
                                background: entry.status === 'exempt' ? '#e0e7ff' : 'white',
                                color: entry.status === 'exempt' ? '#4338ca' : '#64748b',
                                borderRadius: '4px',
                                fontSize: '12px',
                                fontWeight: 500,
                                cursor: isLocked ? 'not-allowed' : 'pointer',
                              }}
                            >
                              Exempt
                            </button>
                          </div>
                        </td>
                        <td style={{ padding: '12px', textAlign: 'center' }}>
                          {entry.status === 'graded' ? (
                            <input
                              type="number"
                              min="0"
                              max={assessment.max_marks}
                              value={entry.marks_obtained ?? ''}
                              onChange={(e) => {
                                const value = e.target.value === '' ? null : Math.min(assessment.max_marks, Math.max(0, parseFloat(e.target.value) || 0));
                                updateMarkEntry(entry.student_id, { marks_obtained: value });
                              }}
                              disabled={isLocked}
                              style={{
                                width: '80px',
                                padding: '6px',
                                fontSize: '14px',
                                border: '1px solid #e2e8f0',
                                borderRadius: '4px',
                                textAlign: 'center',
                              }}
                            />
                          ) : (
                            <span style={{ color: '#64748b', fontSize: '14px' }}>
                              {entry.status === 'absent' ? 'Absent' : 'Exempt'}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </Card>
      </div>
    </Layout>
  );
}





