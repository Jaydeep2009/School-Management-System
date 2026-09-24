/**
 * Fees Management Page - List Fee Charges and Record Payments
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
import { DollarSign, Plus, CheckCircle, Folder } from 'lucide-react';

export function Fees() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [feeCharges, setFeeCharges] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [recordingPayment, setRecordingPayment] = useState<string | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<string>('cash');


  useEffect(() => {
    loadFeeCharges();
  }, []);

  const loadFeeCharges = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await apiService.getFeeCharges();
      setFeeCharges(response.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load fee charges');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRecordPayment = async (chargeId: string) => {
    if (!paymentAmount || paymentAmount <= 0) {
      alert('Please enter a valid payment amount');
      return;
    }

    try {
      await apiService.recordPayment({
        fee_charge_id: chargeId,
        amount: paymentAmount,
        payment_method: paymentMethod,
        payment_date: new Date().toISOString().split('T')[0],
      });
      setRecordingPayment(null);
      setPaymentAmount(0);
      await loadFeeCharges();
      alert('Payment recorded successfully');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to record payment');
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

  if (error) {
    return (
      <Layout schoolName={'SMS'} principalName={"User"} onLogout={logout}>
        <div style={{ padding: '32px' }}>
          <ErrorState message={error} onRetry={loadFeeCharges} />
        </div>
      </Layout>
    );
  }

  return (
    <Layout schoolName={'SMS'} principalName={"User"} onLogout={logout}>
      <div style={{ padding: '32px' }}>
        <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ fontSize: '28px', fontWeight: 600, color: '#0f172a', marginBottom: '8px' }}>Fees Management</h1>
            <p style={{ fontSize: '14px', color: '#64748b' }}>Manage fee charges and payments</p>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <Button variant="secondary" onClick={() => navigate('/fees/categories')}>
              <Folder size={16} style={{ marginRight: '8px' }} />
              Categories
            </Button>
            <Button onClick={() => navigate('/fees/charges/new')}>
              <Plus size={16} style={{ marginRight: '8px' }} />
              New Charge
            </Button>
          </div>
        </div>

        <Card>
          <div style={{ padding: '24px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#0f172a', marginBottom: '16px' }}>
              Fee Charges ({feeCharges.length})
            </h2>
            
            {feeCharges.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '48px 24px', color: '#64748b' }}>
                <DollarSign size={48} style={{ color: '#cbd5e1', marginBottom: '16px', margin: '0 auto' }} />
                <p>No fee charges found</p>
                <p style={{ fontSize: '14px', marginTop: '8px' }}>Click "New Charge" to create one</p>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #e2e8f0' }}>
                      <th style={{ padding: '12px', textAlign: 'left', fontSize: '14px', fontWeight: 600, color: '#64748b' }}>Student</th>
                      <th style={{ padding: '12px', textAlign: 'left', fontSize: '14px', fontWeight: 600, color: '#64748b' }}>Category</th>
                      <th style={{ padding: '12px', textAlign: 'right', fontSize: '14px', fontWeight: 600, color: '#64748b' }}>Amount</th>
                      <th style={{ padding: '12px', textAlign: 'right', fontSize: '14px', fontWeight: 600, color: '#64748b' }}>Paid</th>
                      <th style={{ padding: '12px', textAlign: 'right', fontSize: '14px', fontWeight: 600, color: '#64748b' }}>Balance</th>
                      <th style={{ padding: '12px', textAlign: 'center', fontSize: '14px', fontWeight: 600, color: '#64748b' }}>Status</th>
                      <th style={{ padding: '12px', textAlign: 'right', fontSize: '14px', fontWeight: 600, color: '#64748b' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {feeCharges.map((charge) => {
                      const isPaid = charge.status === 'paid';
                      const isPartiallyPaid = charge.status === 'partially_paid';
                      const balance = charge.amount - (charge.total_paid || 0);

                      return (
                        <tr key={charge.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                          <td style={{ padding: '12px', fontSize: '14px', fontWeight: 500, color: '#0f172a' }}>
                            {charge.student_name || 'Unknown'}
                            {charge.student_code && (
                              <div style={{ fontSize: '12px', color: '#64748b' }}>{charge.student_code}</div>
                            )}
                          </td>
                          <td style={{ padding: '12px', fontSize: '14px', color: '#64748b' }}>
                            {charge.category_name}
                          </td>
                          <td style={{ padding: '12px', fontSize: '14px', color: '#0f172a', textAlign: 'right', fontWeight: 500 }}>
                            ${charge.amount.toFixed(2)}
                          </td>
                          <td style={{ padding: '12px', fontSize: '14px', color: '#16a34a', textAlign: 'right', fontWeight: 500 }}>
                            ${(charge.total_paid || 0).toFixed(2)}
                          </td>
                          <td style={{ padding: '12px', fontSize: '14px', color: '#dc2626', textAlign: 'right', fontWeight: 500 }}>
                            ${balance.toFixed(2)}
                          </td>
                          <td style={{ padding: '12px', textAlign: 'center' }}>
                            {isPaid ? (
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
                                Paid
                              </span>
                            ) : isPartiallyPaid ? (
                              <span style={{
                                padding: '4px 8px',
                                background: '#fef3c7',
                                color: '#92400e',
                                borderRadius: '4px',
                                fontSize: '12px',
                                fontWeight: 500,
                              }}>
                                Partial
                              </span>
                            ) : (
                              <span style={{
                                padding: '4px 8px',
                                background: '#fee2e2',
                                color: '#dc2626',
                                borderRadius: '4px',
                                fontSize: '12px',
                                fontWeight: 500,
                              }}>
                                Pending
                              </span>
                            )}
                          </td>
                          <td style={{ padding: '12px', textAlign: 'right' }}>
                            {!isPaid && recordingPayment !== charge.id && (
                              <Button
                                variant="secondary"
                                onClick={() => {
                                  setRecordingPayment(charge.id);
                                  setPaymentAmount(balance);
                                }}
                              >
                                Record Payment
                              </Button>
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

        {/* Payment Recording Modal */}
        {recordingPayment && (
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
          }}>
            <div style={{ maxWidth: '500px', width: '90%' }}>
              <Card>
                <div style={{ padding: '24px' }}>
                  <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#0f172a', marginBottom: '16px' }}>
                    Record Payment
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#0f172a', marginBottom: '6px' }}>
                        Amount
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={paymentAmount}
                        onChange={(e) => setPaymentAmount(parseFloat(e.target.value) || 0)}
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
                        Payment Method
                      </label>
                      <select
                        value={paymentMethod}
                        onChange={(e) => setPaymentMethod(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          fontSize: '14px',
                          border: '1px solid #e2e8f0',
                          borderRadius: '6px',
                        }}
                      >
                        <option value="cash">Cash</option>
                        <option value="check">Check</option>
                        <option value="bank_transfer">Bank Transfer</option>
                        <option value="online">Online</option>
                      </select>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', paddingTop: '8px' }}>
                      <Button onClick={() => handleRecordPayment(recordingPayment)}>
                        Confirm Payment
                      </Button>
                      <Button
                        variant="secondary"
                        onClick={() => {
                          setRecordingPayment(null);
                          setPaymentAmount(0);
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
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





