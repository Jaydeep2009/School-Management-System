/**
 * Period Setup Page
 * Principal can define/edit the school day structure (period timings)
 */

import { useState, useEffect } from 'react';
import { Layout } from '../components/layout/Layout';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Skeleton } from '../components/ui/Skeleton';
import { ErrorState } from '../components/ui/ErrorState';
import { useAuth } from '../hooks/useAuth';
import { useAcademicYear } from '../contexts/AcademicYearContext';
import { apiService } from '../services/api';
import { Clock, Plus, Edit2, Trash2, Coffee } from 'lucide-react';

interface PeriodTiming {
  id: string;
  period_no: number;
  start_time: string;
  end_time: string;
  label: string | null;
  is_break: number;
}

export function PeriodSetup() {
  const { user, logout } = useAuth();
  const { selectedYear } = useAcademicYear();
  
  const [periods, setPeriods] = useState<PeriodTiming[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    period_no: 0,
    start_time: '',
    end_time: '',
    label: '',
    is_break: false,
  });

  useEffect(() => {
    if (selectedYear) {
      loadPeriods();
    }
  }, [selectedYear]);

  const loadPeriods = async () => {
    if (!selectedYear) return;
    
    try {
      setIsLoading(true);
      setError(null);
      const response = await apiService.getPeriodTimings(selectedYear.id);
      setPeriods(response.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load period timings');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInitialize = async () => {
    if (!selectedYear || !confirm('Initialize default period timings? This will create 8 class periods and 2 breaks.')) return;
    
    try {
      setIsInitializing(true);
      await apiService.initializePeriodTimings(selectedYear.id);
      await loadPeriods();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to initialize periods');
    } finally {
      setIsInitializing(false);
    }
  };

  const handleAdd = () => {
    const nextPeriodNo = periods.length > 0 
      ? Math.max(...periods.map(p => p.period_no)) + 1 
      : 1;
    
    setFormData({
      period_no: nextPeriodNo,
      start_time: '',
      end_time: '',
      label: `Period ${nextPeriodNo}`,
      is_break: false,
    });
    setIsAdding(true);
    setEditingId(null);
  };

  const handleEdit = (period: PeriodTiming) => {
    setFormData({
      period_no: period.period_no,
      start_time: period.start_time,
      end_time: period.end_time,
      label: period.label || '',
      is_break: period.is_break === 1,
    });
    setEditingId(period.id);
    setIsAdding(false);
  };

  const handleSave = async () => {
    if (!selectedYear) return;

    if (!formData.start_time || !formData.end_time || !formData.label) {
      alert('Please fill in all fields');
      return;
    }

    try {
      if (editingId) {
        await apiService.updatePeriodTiming(editingId, {
          start_time: formData.start_time,
          end_time: formData.end_time,
          label: formData.label,
          is_break: formData.is_break,
        });
      } else {
        await apiService.createPeriodTiming({
          academic_year_id: selectedYear.id,
          period_no: formData.period_no,
          start_time: formData.start_time,
          end_time: formData.end_time,
          label: formData.label,
          is_break: formData.is_break,
        });
      }
      
      setIsAdding(false);
      setEditingId(null);
      await loadPeriods();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to save period');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this period? This cannot be undone.')) return;
    
    try {
      await apiService.deletePeriodTiming(id);
      await loadPeriods();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete period');
    }
  };

  const handleCancel = () => {
    setIsAdding(false);
    setEditingId(null);
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

  return (
    <Layout schoolName={'SMS'} principalName={"User"} onLogout={logout}>
      <div style={{ padding: '32px', maxWidth: '900px', margin: '0 auto' }}>
        <div style={{ marginBottom: '24px' }}>
          <h1 style={{ fontSize: '28px', fontWeight: 600, color: '#0f172a', marginBottom: '8px' }}>
            Period Setup
          </h1>
          <p style={{ fontSize: '14px', color: '#64748b' }}>
            Define the school day structure for {selectedYear.label}
          </p>
        </div>

        {isLoading ? (
          <Skeleton height="400px" />
        ) : error ? (
          <ErrorState message={error} onRetry={loadPeriods} />
        ) : (
          <>
            {periods.length === 0 && !isAdding ? (
              <Card>
                <div style={{ padding: '48px', textAlign: 'center' }}>
                  <Clock size={64} style={{ color: '#cbd5e1', margin: '0 auto 16px' }} />
                  <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#0f172a', marginBottom: '8px' }}>
                    No Period Timings Defined
                  </h3>
                  <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '24px' }}>
                    Get started by initializing default periods or adding custom ones
                  </p>
                  <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                    <Button onClick={handleInitialize} disabled={isInitializing}>
                      {isInitializing ? 'Initializing...' : 'Initialize Defaults'}
                    </Button>
                    <Button variant="secondary" onClick={handleAdd}>
                      <Plus size={16} style={{ marginRight: '8px' }} />
                      Add Custom Period
                    </Button>
                  </div>
                </div>
              </Card>
            ) : (
              <Card>
                <div style={{ padding: '24px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#0f172a' }}>
                      Periods ({periods.length})
                    </h2>
                    {periods.length === 0 && (
                      <Button onClick={handleInitialize} disabled={isInitializing}>
                        {isInitializing ? 'Initializing...' : 'Initialize Defaults'}
                      </Button>
                    )}
                    {periods.length > 0 && !isAdding && !editingId && (
                      <Button onClick={handleAdd}>
                        <Plus size={16} style={{ marginRight: '8px' }} />
                        Add Period
                      </Button>
                    )}
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {periods.map((period) => (
                      <div
                        key={period.id}
                        style={{
                          padding: '16px',
                          border: editingId === period.id ? '2px solid #3b82f6' : '1px solid #e2e8f0',
                          borderRadius: '8px',
                          background: period.is_break ? '#fef3c7' : 'white',
                        }}
                      >
                        {editingId === period.id ? (
                          <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr 1fr 1fr auto', gap: '12px', alignItems: 'center' }}>
                            <div>
                              <input
                                type="text"
                                value={formData.label}
                                onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                                style={{
                                  width: '100%',
                                  padding: '8px',
                                  border: '1px solid #e2e8f0',
                                  borderRadius: '4px',
                                  fontSize: '14px',
                                }}
                                placeholder="Label"
                              />
                            </div>
                            <div>
                              <input
                                type="time"
                                value={formData.start_time}
                                onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                                style={{
                                  width: '100%',
                                  padding: '8px',
                                  border: '1px solid #e2e8f0',
                                  borderRadius: '4px',
                                  fontSize: '14px',
                                }}
                              />
                            </div>
                            <div>
                              <input
                                type="time"
                                value={formData.end_time}
                                onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                                style={{
                                  width: '100%',
                                  padding: '8px',
                                  border: '1px solid #e2e8f0',
                                  borderRadius: '4px',
                                  fontSize: '14px',
                                }}
                              />
                            </div>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}>
                              <input
                                type="checkbox"
                                checked={formData.is_break}
                                onChange={(e) => setFormData({ ...formData, is_break: e.target.checked })}
                              />
                              Break
                            </label>
                            <div style={{ display: 'flex', gap: '8px' }}>
                              <Button onClick={handleSave} style={{ padding: '8px 16px' }}>Save</Button>
                              <Button variant="secondary" onClick={handleCancel} style={{ padding: '8px 16px' }}>Cancel</Button>
                            </div>
                          </div>
                        ) : (
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                              {period.is_break && <Coffee size={20} style={{ color: '#f59e0b' }} />}
                              <div>
                                <div style={{ fontWeight: 600, color: '#0f172a', marginBottom: '4px' }}>
                                  {period.label}
                                </div>
                                <div style={{ fontSize: '14px', color: '#64748b' }}>
                                  {period.start_time} - {period.end_time}
                                  {period.is_break && <span style={{ marginLeft: '8px', color: '#f59e0b' }}>(Break)</span>}
                                </div>
                              </div>
                            </div>
                            <div style={{ display: 'flex', gap: '8px' }}>
                              <button
                                onClick={() => handleEdit(period)}
                                style={{
                                  padding: '8px',
                                  border: '1px solid #e2e8f0',
                                  background: 'white',
                                  borderRadius: '4px',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                }}
                              >
                                <Edit2 size={16} style={{ color: '#64748b' }} />
                              </button>
                              <button
                                onClick={() => handleDelete(period.id)}
                                style={{
                                  padding: '8px',
                                  border: '1px solid #e2e8f0',
                                  background: 'white',
                                  borderRadius: '4px',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                }}
                              >
                                <Trash2 size={16} style={{ color: '#ef4444' }} />
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}

                    {/* Add New Period Form */}
                    {isAdding && (
                      <div
                        style={{
                          padding: '16px',
                          border: '2px solid #3b82f6',
                          borderRadius: '8px',
                          background: 'white',
                        }}
                      >
                        <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr 1fr 1fr auto', gap: '12px', alignItems: 'center' }}>
                          <div>
                            <input
                              type="text"
                              value={formData.label}
                              onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                              style={{
                                width: '100%',
                                padding: '8px',
                                border: '1px solid #e2e8f0',
                                borderRadius: '4px',
                                fontSize: '14px',
                              }}
                              placeholder="Label"
                            />
                          </div>
                          <div>
                            <input
                              type="time"
                              value={formData.start_time}
                              onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                              style={{
                                width: '100%',
                                padding: '8px',
                                border: '1px solid #e2e8f0',
                                borderRadius: '4px',
                                fontSize: '14px',
                              }}
                            />
                          </div>
                          <div>
                            <input
                              type="time"
                              value={formData.end_time}
                              onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                              style={{
                                width: '100%',
                                padding: '8px',
                                border: '1px solid #e2e8f0',
                                borderRadius: '4px',
                                fontSize: '14px',
                              }}
                            />
                          </div>
                          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}>
                            <input
                              type="checkbox"
                              checked={formData.is_break}
                              onChange={(e) => setFormData({ ...formData, is_break: e.target.checked })}
                            />
                            Break
                          </label>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <Button onClick={handleSave} style={{ padding: '8px 16px' }}>Add</Button>
                            <Button variant="secondary" onClick={handleCancel} style={{ padding: '8px 16px' }}>Cancel</Button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            )}
          </>
        )}
      </div>
    </Layout>
  );
}
