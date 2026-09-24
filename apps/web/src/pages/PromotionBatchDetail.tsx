/**
 * Promotion Batch Detail - Manage Student Selections and Execute Promotion
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
import { ArrowLeft, CheckCircle, XCircle, PlayCircle, FileText } from 'lucide-react';

export function PromotionBatchDetail() {
  const { id } = useParams<{ id: string }>();
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [batch, setBatch] = useState<any>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isActionLoading, setIsActionLoading] = useState(false);

  useEffect(() => {
    loadBatchData();
  }, [id]);

  const loadBatchData = async () => {
    if (!id) return;
    try {
      setIsLoading(true);
      setError(null);
      const response = await apiService.getPromotionBatch(id);
      setBatch(response.data);

      // Load students from source classroom
      if (response.data.from_classroom_id) {
        const studentsRes = await apiService.getStudents({ classroom_id: response.data.from_classroom_id });
        setStudents(studentsRes.data);

        // Pre-select students already in promotion items
        if (response.data.items && response.data.items.length > 0) {
          const preselected = new Set<string>(response.data.items.map((item: any) => item.student_id));
          setSelectedStudents(preselected);
        } else {
          // Auto-select all students initially
          const allIds = new Set<string>(studentsRes.data.map((s: any) => s.id));
          setSelectedStudents(allIds);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load batch');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleStudent = (studentId: string) => {
    setSelectedStudents(prev => {
      const newSet = new Set(prev);
      if (newSet.has(studentId)) {
        newSet.delete(studentId);
      } else {
        newSet.add(studentId);
      }
      return newSet;
    });
  };

  const toggleAll = () => {
    if (selectedStudents.size === students.length) {
      setSelectedStudents(new Set());
    } else {
      setSelectedStudents(new Set(students.map(s => s.id)));
    }
  };

  const handleSaveSelection = async () => {
    if (!id) return;
    setIsActionLoading(true);
    try {
      const items = Array.from(selectedStudents).map(student_id => ({
        student_id,
        action: 'promote' as const,
      }));
      await apiService.updatePromotionItems(id, items);
      await loadBatchData();
      alert('Student selection saved');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to save selection');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handlePlan = async () => {
    if (!id || !confirm('Plan this promotion batch? This will validate all selections.')) return;
    setIsActionLoading(true);
    try {
      await apiService.planPromotionBatch(id);
      await loadBatchData();
      alert('Promotion batch planned successfully');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to plan batch');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleApply = async () => {
    if (!id || !confirm('Apply this promotion? This will actually promote the students. This action cannot be undone!')) return;
    setIsActionLoading(true);
    try {
      await apiService.applyPromotionBatch(id);
      await loadBatchData();
      alert('Promotion applied successfully!');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to apply promotion');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!id || !confirm('Cancel this promotion batch? This cannot be undone.')) return;
    setIsActionLoading(true);
    try {
      await apiService.cancelPromotionBatch(id);
      await loadBatchData();
      alert('Promotion batch cancelled');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to cancel batch');
    } finally {
      setIsActionLoading(false);
    }
  };

  if (!user) return null;

  if (isLoading) {
    return (
      <Layout schoolName={'SMS'} principalName={"User"} onLogout={logout}>
        <div style={{ padding: '32px' }}>
          <Skeleton height="400px" />
        </div>
      </Layout>
    );
  }

  if (error || !batch) {
    return (
      <Layout schoolName={'SMS'} principalName={"User"} onLogout={logout}>
        <div style={{ padding: '32px' }}>
          <ErrorState message={error || 'Batch not found'} onRetry={loadBatchData} />
        </div>
      </Layout>
    );
  }

  const status = batch.status || 'draft';
  const isDraft = status === 'draft';
  const isPlanned = status === 'planned';
  const isApplied = status === 'applied';
  const isCancelled = status === 'cancelled';

  return (
    <Layout schoolName={'SMS'} principalName={"User"} onLogout={logout}>
      <div style={{ padding: '32px' }}>
        <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
          <div style={{ display: 'flex', alignItems: 'start', gap: '12px' }}>
            <Button variant="secondary" onClick={() => navigate('/promotions')}>
              <ArrowLeft size={16} />
            </Button>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '4px' }}>
                <h1 style={{ fontSize: '28px', fontWeight: 600, color: '#0f172a' }}>
                  Promotion Batch
                </h1>
                {isDraft && (
                  <span style={{
                    padding: '4px 12px',
                    background: '#f1f5f9',
                    color: '#64748b',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontWeight: 500,
                  }}>
                    Draft
                  </span>
                )}
                {isPlanned && (
                  <span style={{
                    padding: '4px 12px',
                    background: '#dbeafe',
                    color: '#1e40af',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontWeight: 500,
                  }}>
                    Planned
                  </span>
                )}
                {isApplied && (
                  <span style={{
                    padding: '4px 12px',
                    background: '#dcfce7',
                    color: '#166534',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontWeight: 500,
                  }}>
                    Applied
                  </span>
                )}
                {isCancelled && (
                  <span style={{
                    padding: '4px 12px',
                    background: '#fee2e2',
                    color: '#dc2626',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontWeight: 500,
                  }}>
                    Cancelled
                  </span>
                )}
              </div>
              <p style={{ fontSize: '14px', color: '#64748b' }}>
                {batch.from_classroom_name} → {batch.to_classroom_name}
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            {isDraft && (
              <>
                <Button onClick={handleSaveSelection} disabled={isActionLoading}>
                  <CheckCircle size={16} style={{ marginRight: '8px' }} />
                  Save Selection
                </Button>
                <Button onClick={handlePlan} disabled={isActionLoading || selectedStudents.size === 0}>
                  <FileText size={16} style={{ marginRight: '8px' }} />
                  Plan
                </Button>
              </>
            )}
            {isPlanned && (
              <Button onClick={handleApply} disabled={isActionLoading}>
                <PlayCircle size={16} style={{ marginRight: '8px' }} />
                Apply Promotion
              </Button>
            )}
            {(isDraft || isPlanned) && (
              <Button variant="secondary" onClick={handleCancel} disabled={isActionLoading}>
                <XCircle size={16} style={{ marginRight: '8px' }} />
                Cancel
              </Button>
            )}
          </div>
        </div>

        {/* Description */}
        {batch.description && (
          <div style={{ marginBottom: '24px' }}>
            <Card>
              <div style={{ padding: '16px' }}>
                <p style={{ fontSize: '14px', color: '#475569' }}>{batch.description}</p>
              </div>
            </Card>
          </div>
        )}

        {/* Student Selection */}
        <Card>
          <div style={{ padding: '24px' }}>
            <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#0f172a' }}>
                Select Students ({selectedStudents.size} of {students.length})
              </h2>
              {isDraft && (
                <Button variant="secondary" onClick={toggleAll}>
                  {selectedStudents.size === students.length ? 'Deselect All' : 'Select All'}
                </Button>
              )}
            </div>

            {students.length === 0 ? (
              <div style={{ padding: '48px', textAlign: 'center', color: '#64748b' }}>
                <p>No students found in source classroom</p>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #e2e8f0' }}>
                      {isDraft && (
                        <th style={{ padding: '12px', textAlign: 'center', fontSize: '14px', fontWeight: 600, color: '#64748b', width: '60px' }}>
                          Select
                        </th>
                      )}
                      <th style={{ padding: '12px', textAlign: 'left', fontSize: '14px', fontWeight: 600, color: '#64748b' }}>Roll No.</th>
                      <th style={{ padding: '12px', textAlign: 'left', fontSize: '14px', fontWeight: 600, color: '#64748b' }}>Student Name</th>
                      <th style={{ padding: '12px', textAlign: 'left', fontSize: '14px', fontWeight: 600, color: '#64748b' }}>Student Code</th>
                      <th style={{ padding: '12px', textAlign: 'center', fontSize: '14px', fontWeight: 600, color: '#64748b' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.map((student) => {
                      const isSelected = selectedStudents.has(student.id);
                      return (
                        <tr key={student.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                          {isDraft && (
                            <td style={{ padding: '12px', textAlign: 'center' }}>
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleStudent(student.id)}
                                style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                              />
                            </td>
                          )}
                          <td style={{ padding: '12px', fontSize: '14px', color: '#64748b' }}>
                            {student.roll_number || '—'}
                          </td>
                          <td style={{ padding: '12px', fontSize: '14px', fontWeight: 500, color: '#0f172a' }}>
                            {student.name}
                          </td>
                          <td style={{ padding: '12px', fontSize: '14px', color: '#64748b' }}>
                            {student.student_code || '—'}
                          </td>
                          <td style={{ padding: '12px', textAlign: 'center' }}>
                            {isSelected ? (
                              <span style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                padding: '4px 8px',
                                background: '#dcfce7',
                                color: '#166534',
                                borderRadius: '4px',
                                fontSize: '12px',
                                fontWeight: 500,
                              }}>
                                <CheckCircle size={12} />
                                Selected
                              </span>
                            ) : (
                              <span style={{
                                padding: '4px 8px',
                                background: '#f1f5f9',
                                color: '#64748b',
                                borderRadius: '4px',
                                fontSize: '12px',
                                fontWeight: 500,
                              }}>
                                Not Selected
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
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





