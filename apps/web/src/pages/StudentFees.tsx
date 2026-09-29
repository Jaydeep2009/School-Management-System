/**
 * Student Fees Page
 * 
 * Shows:
 * - Total charged, total paid, and balance
 * - List of receipts (payments) with download capability
 * - Client-side PDF generation for receipts
 */

import { useState, useEffect } from 'react';
import { Layout } from '../components/layout/Layout';
import { Card } from '../components/ui/Card';
import { Skeleton } from '../components/ui/Skeleton';
import { ErrorState } from '../components/ui/ErrorState';
import { useAuth } from '../hooks/useAuth';
import { useAcademicYear } from '../contexts/AcademicYearContext';
import { apiService } from '../services/api';
import { IndianRupee, Download, Receipt, CheckCircle, Calendar, FileImage } from 'lucide-react';
import { generateReceiptPDF, generateReceiptImage } from '../utils/receiptGenerator';

export function StudentFees() {
  const { user, logout } = useAuth();
  const { selectedYear } = useAcademicYear();
  
  const [profile, setProfile] = useState<any>(null);
  const [fees, setFees] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (selectedYear?.id) {
      loadData();
    }
  }, [selectedYear]);

  const loadData = async () => {
    if (!selectedYear?.id) return;
    
    try {
      setIsLoading(true);
      setError(null);
      
      const [profileRes, feesRes] = await Promise.all([
        apiService.getStudentMe(),
        apiService.getStudentMeFees(selectedYear.id)
      ]);

      setProfile(profileRes.data);
      
      // Convert paise to dollars
      const feesData = feesRes.data;
      if (feesData && feesData.summary) {
        feesData.summary.total_charged = (feesData.summary.total_charged_paise || 0) / 100;
        feesData.summary.total_paid = (feesData.summary.total_paid_paise || 0) / 100;
        feesData.summary.balance = (feesData.summary.balance_paise || 0) / 100;
      }
      
      // Convert ledger amounts
      if (feesData && feesData.ledger) {
        feesData.ledger = feesData.ledger.map((entry: any) => ({
          ...entry,
          amount: (entry.amount_paise || 0) / 100,
        }));
      }
      
      setFees(feesData);
    } catch (err) {
      console.error('Failed to load fees:', err);
      setError(err instanceof Error ? err.message : 'Failed to load fees');
    } finally {
      setIsLoading(false);
    }
  };

  const downloadReceiptAsPDF = (payment: any) => {
    generateReceiptPDF({
      receipt_no: payment.receipt_no,
      date: payment.date,
      student_name: profile?.full_name || 'N/A',
      classroom_code: profile?.classroom_code || 'N/A',
      roll_number: profile?.roll_number || 'N/A',
      admission_number: profile?.admission_number || 'N/A',
      amount: payment.amount,
      payment_method: getPaymentMethodLabel(payment.method),
      reference: payment.reference
    });
  };

  const downloadReceiptAsImage = (payment: any) => {
    generateReceiptImage({
      receipt_no: payment.receipt_no,
      date: payment.date,
      student_name: profile?.full_name || 'N/A',
      classroom_code: profile?.classroom_code || 'N/A',
      roll_number: profile?.roll_number || 'N/A',
      admission_number: profile?.admission_number || 'N/A',
      amount: payment.amount,
      payment_method: getPaymentMethodLabel(payment.method),
      reference: payment.reference
    });
  };

  const getPaymentMethodLabel = (method: string) => {
    const labels: Record<string, string> = {
      'cash': 'Cash',
      'card': 'Card',
      'upi': 'UPI',
      'bank_transfer': 'Bank Transfer',
      'cheque': 'Cheque',
      'online': 'Online'
    };
    return labels[method] || method;
  };

  if (!user) return null;

  const balance = fees?.summary?.balance || 0;
  const balanceStatus = balance > 0 ? 'pending' : balance < 0 ? 'overpaid' : 'paid';

  return (
    <Layout
      schoolName={'SMS'}
      principalName={profile?.full_name || user.loginId || 'Student'}
      onLogout={logout}
      role="student"
    >
      <div style={{ padding: '32px' }}>
        <div style={{ marginBottom: '24px' }}>
          <h1 style={{ fontSize: '28px', fontWeight: 600, color: '#0f172a', marginBottom: '8px' }}>
            My Fees
          </h1>
          <p style={{ fontSize: '14px', color: '#64748b' }}>
            View your fee status and payment receipts for {profile?.academic_year || 'current academic year'}
          </p>
        </div>

        {error && !isLoading && (
          <ErrorState message={error} onRetry={loadData} />
        )}

        {/* Fee Summary */}
        {!error && (
          <div style={{ marginBottom: '32px' }}>
            <Card>
              <div style={{ padding: '32px' }}>
                <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#0f172a', marginBottom: '24px' }}>
                  Fee Summary
                </h2>
                
                {isLoading ? (
                  <Skeleton height="200px" />
                ) : (
                  <div>
                    {/* Balance Display */}
                    <div style={{ 
                      textAlign: 'center', 
                      padding: '40px',
                      background: balanceStatus === 'paid' 
                        ? 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)'
                        : balanceStatus === 'overpaid'
                        ? 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)'
                        : 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                      borderRadius: '12px',
                      color: 'white',
                      marginBottom: '24px'
                    }}>
                      <div style={{ fontSize: '16px', opacity: 0.9, marginBottom: '8px' }}>
                        {balanceStatus === 'paid' ? 'All Paid' : balanceStatus === 'overpaid' ? 'Overpaid' : 'Balance Due'}
                      </div>
                      <div style={{ fontSize: '56px', fontWeight: 700, marginBottom: '8px' }}>
                        ₹{Math.abs(balance).toLocaleString('en-IN')}
                      </div>
                      {balanceStatus === 'pending' && (
                        <div style={{ fontSize: '14px', opacity: 0.9 }}>
                          Please make payment at the earliest
                        </div>
                      )}
                      {balanceStatus === 'overpaid' && (
                        <div style={{ fontSize: '14px', opacity: 0.9 }}>
                          Excess amount will be adjusted
                        </div>
                      )}
                    </div>

                    {/* Breakdown */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' }}>
                      <div style={{ padding: '24px', background: '#f8fafc', borderRadius: '8px', border: '2px solid #e2e8f0' }}>
                        <div style={{ fontSize: '14px', color: '#64748b', marginBottom: '8px' }}>
                          Total Charged
                        </div>
                        <div style={{ fontSize: '32px', fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <IndianRupee size={28} />
                          {fees?.summary?.total_charged?.toLocaleString('en-IN') || '0'}
                        </div>
                      </div>

                      <div style={{ padding: '24px', background: '#dcfce7', borderRadius: '8px', border: '2px solid #86efac' }}>
                        <div style={{ fontSize: '14px', color: '#166534', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <CheckCircle size={16} />
                          Total Paid
                        </div>
                        <div style={{ fontSize: '32px', fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <IndianRupee size={28} />
                          {fees?.summary?.total_paid?.toLocaleString('en-IN') || '0'}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </Card>
          </div>
        )}

        {/* Payment Receipts */}
        {!error && (
          <Card>
            <div style={{ padding: '24px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#0f172a', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Receipt size={20} />
                Payment Receipts
              </h2>

              {isLoading ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {[1, 2, 3].map(i => <Skeleton key={i} height="100px" />)}
                </div>
              ) : !fees?.ledger || fees.ledger.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '48px', color: '#94a3b8' }}>
                  <Receipt size={64} style={{ margin: '0 auto 16px', opacity: 0.3 }} />
                  <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#64748b', marginBottom: '8px' }}>
                    No Transactions
                  </h3>
                  <p style={{ fontSize: '14px' }}>
                    No charges or payments have been recorded yet
                  </p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {fees.ledger
                    .filter((entry: any) => entry.type === 'payment' && !entry.is_voided)
                    .map((payment: any) => (
                    <div 
                      key={payment.id}
                      style={{ 
                        padding: '20px', 
                        background: payment.is_voided ? '#fef3c7' : '#f8fafc',
                        borderRadius: '8px',
                        border: `1px solid ${payment.is_voided ? '#fde68a' : '#e2e8f0'}`
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                            <div style={{ 
                              fontSize: '16px', 
                              fontWeight: 600, 
                              color: '#0f172a',
                              fontFamily: 'monospace'
                            }}>
                              #{payment.receipt_no}
                            </div>
                            {payment.is_voided && (
                              <span style={{ 
                                padding: '4px 8px',
                                background: '#dc2626',
                                color: 'white',
                                borderRadius: '4px',
                                fontSize: '12px',
                                fontWeight: 600
                              }}>
                                VOIDED
                              </span>
                            )}
                          </div>
                          <div style={{ display: 'flex', gap: '16px', fontSize: '13px', color: '#64748b' }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <Calendar size={14} />
                              {new Date(payment.date).toLocaleDateString()}
                            </span>
                            <span style={{ 
                              padding: '2px 8px',
                              background: '#e0e7ff',
                              color: '#4f46e5',
                              borderRadius: '4px',
                              fontWeight: 500
                            }}>
                              {getPaymentMethodLabel(payment.method)}
                            </span>
                          </div>
                          {payment.reference && (
                            <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px', fontFamily: 'monospace' }}>
                              Ref: {payment.reference}
                            </div>
                          )}
                        </div>
                        <div style={{ textAlign: 'right', marginLeft: '16px' }}>
                          <div style={{ 
                            fontSize: '28px', 
                            fontWeight: 700, 
                            color: payment.is_voided ? '#94a3b8' : '#16a34a',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}>
                            <IndianRupee size={24} />
                            {payment.amount.toLocaleString('en-IN')}
                          </div>
                          {!payment.is_voided && (
                            <div style={{ marginTop: '12px', display: 'flex', gap: '8px' }}>
                              <button
                                onClick={() => downloadReceiptAsPDF(payment)}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '6px',
                                  padding: '8px 12px',
                                  background: '#2563eb',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: '6px',
                                  fontSize: '13px',
                                  fontWeight: 500,
                                  cursor: 'pointer',
                                  transition: 'background 0.2s'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.background = '#1d4ed8'}
                                onMouseLeave={(e) => e.currentTarget.style.background = '#2563eb'}
                                title="Download as PDF"
                              >
                                <Download size={14} />
                                PDF
                              </button>
                              <button
                                onClick={() => downloadReceiptAsImage(payment)}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '6px',
                                  padding: '8px 12px',
                                  background: '#059669',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: '6px',
                                  fontSize: '13px',
                                  fontWeight: 500,
                                  cursor: 'pointer',
                                  transition: 'background 0.2s'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.background = '#047857'}
                                onMouseLeave={(e) => e.currentTarget.style.background = '#059669'}
                                title="Download as Image"
                              >
                                <FileImage size={14} />
                                Image
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>
        )}

        {/* Payment Information */}
        {!error && balance > 0 && (
          <div style={{ marginTop: '24px' }}>
          <Card>
            <div style={{ padding: '24px', background: '#fef3c7', borderRadius: '8px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#92400e', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <IndianRupee size={18} />
                Payment Information
              </h3>
              <p style={{ fontSize: '14px', color: '#78350f', lineHeight: '1.6' }}>
                Please make the payment of <strong>₹{balance.toLocaleString('en-IN')}</strong> at the school office. 
                Accepted payment methods: Cash, Card, UPI, Bank Transfer, and Cheque.
                <br /><br />
                For online payment or any fee-related queries, please contact the school administration.
              </p>
            </div>
          </Card>
          </div>
        )}
      </div>
    </Layout>
  );
}
