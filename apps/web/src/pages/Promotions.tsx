/**
 * Promotions List Page
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../components/layout/Layout';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Skeleton } from '../components/ui/Skeleton';
import { ErrorState } from '../components/ui/ErrorState';
import { useAuth } from '../hooks/useAuth';
import { useAcademicYear } from '../contexts/AcademicYearContext';
import { apiService } from '../services/api';
import { TrendingUp, Plus, ArrowRight } from 'lucide-react';

export function Promotions() {
  const { user, logout } = useAuth();
  const { selectedYear } = useAcademicYear();
  const navigate = useNavigate();

  const [batches, setBatches] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadBatches();
  }, [selectedYear?.id]);

  const loadBatches = async () => {
    if (!selectedYear) {
      setBatches([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const response = await apiService.getPromotionBatches({
        academic_year_id: selectedYear.id
      });
      setBatches(response.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load promotion batches');
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) return null;

  if (!selectedYear) {
    return (
      <Layout schoolName={'SMS'} principalName={"User"} onLogout={logout}>
        <div style={{ padding: '32px', textAlign: 'center', color: '#64748b' }}>
          <p style={{ fontSize: '16px', marginBottom: '8px' }}>Please select an academic year to view promotions</p>
          <p style={{ fontSize: '14px' }}>Use the dropdown in the header to select a year</p>
        </div>
      </Layout>
    );
  }

  if (isLoading) {
    return (
      <Layout schoolName={'SMS'} principalName={"User"} onLogout={logout}>
        <div style={{ padding: '32px' }}>
          <Skeleton height="400px" />
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout schoolName={'SMS'} principalName={"User"} onLogout={logout}>
        <div style={{ padding: '32px' }}>
          <ErrorState message={error} onRetry={loadBatches} />
        </div>
      </Layout>
    );
  }

  return (
    <Layout schoolName={'SMS'} principalName={"User"} onLogout={logout}>
      <div style={{ padding: '32px' }}>
        <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ fontSize: '28px', fontWeight: 600, color: '#0f172a', marginBottom: '8px' }}>Promotions</h1>
            <p style={{ fontSize: '14px', color: '#64748b' }}>
              Viewing promotions for: {selectedYear.label}
            </p>
          </div>
          <Button onClick={() => navigate('/promotions/new')}>
            <Plus size={16} style={{ marginRight: '8px' }} />
            New Promotion Batch
          </Button>
        </div>

        <Card>
          <div style={{ padding: '24px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#0f172a', marginBottom: '16px' }}>
              Promotion Batches ({batches.length})
            </h2>

            {batches.length === 0 ? (
              <div style={{ padding: '48px', textAlign: 'center', color: '#64748b' }}>
                <TrendingUp size={48} style={{ color: '#cbd5e1', marginBottom: '16px', margin: '0 auto' }} />
                <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#0f172a', marginBottom: '8px' }}>No promotion batches</h3>
                <p style={{ fontSize: '14px', marginBottom: '24px' }}>Create a promotion batch to promote students to the next academic year</p>
                <Button onClick={() => navigate('/promotions/new')}>Create Promotion Batch</Button>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #e2e8f0' }}>
                      <th style={{ padding: '12px', textAlign: 'left', fontSize: '14px', fontWeight: 600, color: '#64748b' }}>From</th>
                      <th style={{ padding: '12px', textAlign: 'left', fontSize: '14px', fontWeight: 600, color: '#64748b' }}>To</th>
                      <th style={{ padding: '12px', textAlign: 'center', fontSize: '14px', fontWeight: 600, color: '#64748b' }}>Students</th>
                      <th style={{ padding: '12px', textAlign: 'center', fontSize: '14px', fontWeight: 600, color: '#64748b' }}>Status</th>
                      <th style={{ padding: '12px', textAlign: 'right', fontSize: '14px', fontWeight: 600, color: '#64748b' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {batches.map((batch) => {
                      const status = batch.status || 'draft';
                      const studentCount = batch.items?.length || 0;

                      return (
                        <tr key={batch.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                          <td style={{ padding: '12px', fontSize: '14px', color: '#0f172a' }}>
                            <div style={{ fontWeight: 500 }}>{batch.from_classroom_name}</div>
                            <div style={{ fontSize: '12px', color: '#64748b' }}>{batch.from_academic_year_name}</div>
                          </td>
                          <td style={{ padding: '12px', fontSize: '14px', color: '#0f172a' }}>
                            <div style={{ fontWeight: 500 }}>{batch.to_classroom_name}</div>
                            <div style={{ fontSize: '12px', color: '#64748b' }}>{batch.to_academic_year_name}</div>
                          </td>
                          <td style={{ padding: '12px', fontSize: '14px', color: '#64748b', textAlign: 'center' }}>
                            {studentCount}
                          </td>
                          <td style={{ padding: '12px', textAlign: 'center' }}>
                            {status === 'draft' && (
                              <span style={{
                                padding: '4px 8px',
                                background: '#f1f5f9',
                                color: '#64748b',
                                borderRadius: '4px',
                                fontSize: '12px',
                                fontWeight: 500,
                              }}>
                                Draft
                              </span>
                            )}
                            {status === 'planned' && (
                              <span style={{
                                padding: '4px 8px',
                                background: '#dbeafe',
                                color: '#1e40af',
                                borderRadius: '4px',
                                fontSize: '12px',
                                fontWeight: 500,
                              }}>
                                Planned
                              </span>
                            )}
                            {status === 'applied' && (
                              <span style={{
                                padding: '4px 8px',
                                background: '#dcfce7',
                                color: '#166534',
                                borderRadius: '4px',
                                fontSize: '12px',
                                fontWeight: 500,
                              }}>
                                Applied
                              </span>
                            )}
                            {status === 'cancelled' && (
                              <span style={{
                                padding: '4px 8px',
                                background: '#fee2e2',
                                color: '#dc2626',
                                borderRadius: '4px',
                                fontSize: '12px',
                                fontWeight: 500,
                              }}>
                                Cancelled
                              </span>
                            )}
                          </td>
                          <td style={{ padding: '12px', textAlign: 'right' }}>
                            <Button
                              variant="secondary"
                              onClick={() => navigate(`/promotions/${batch.id}`)}
                            >
                              <ArrowRight size={16} />
                            </Button>
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
