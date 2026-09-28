/**
 * Fees Management Page - List Fee Charges and Record Payments
 * Now with student grouping for better UX
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
import { DollarSign, Plus, CheckCircle, Folder, ChevronDown, ChevronRight } from 'lucide-react';

interface GroupedStudent {
  student_id: string;
  student_name: string;
  student_code: string;
  charges: any[];
  totalCharged: number;
  totalPaid: number;
  balance: number;
  status: 'pending' | 'partially_paid' | 'paid';
}

export function Fees() {
  const { user, logout } = useAuth();
  const { selectedYear } = useAcademicYear();
  const navigate = useNavigate();

  const [feeCharges, setFeeCharges] = useState<any[]>([]);
  const [groupedCharges, setGroupedCharges] = useState<GroupedStudent[]>([]);
  const [expandedStudents, setExpandedStudents] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [recordingPayment, setRecordingPayment] = useState<string | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<string>('cash');

  useEffect(() => {
    loadFeeCharges();
  }, [selectedYear?.id]);

  const groupChargesByStudent = (charges: any[]): GroupedStudent[] => {
    const studentMap = new Map<string, GroupedStudent>();

    charges.forEach((charge) => {
      const studentId = charge.student_id;
      
      if (!studentMap.has(studentId)) {
        studentMap.set(studentId, {
          student_id: studentId,
          student_name: charge.student_name || 'Unknown',
          student_code: charge.student_code || '',
          charges: [],
          totalCharged: 0,
          totalPaid: 0,
          balance: 0,
          status: 'pending',
        });
      }

      const student = studentMap.get(studentId)!;
      student.charges.push(charge);
      student.totalCharged += charge.amount || 0;
      student.totalPaid += charge.total_paid || 0;
    });

    return Array.from(studentMap.values()).map((student) => {
      student.balance = student.totalCharged - student.totalPaid;
      
      if (student.balance <= 0) {
        student.status = 'paid';
      } else if (student.totalPaid > 0) {
        student.status = 'partially_paid';
      } else {
        student.status = 'pending';
      }
      
      return student;
    }).sort((a, b) => b.balance - a.balance); // Sort by balance descending
  };

  const loadFeeCharges = async () => {
    if (!selectedYear) {
      setFeeCharges([]);
      setGroupedCharges([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const response = await apiService.getFeeCharges({
        academic_year_id: selectedYear.id
      });
      setFeeCharges(response.data);
      
      // Group charges by student
      const grouped = groupChargesByStudent(response.data);
      setGroupedCharges(grouped);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load fee charges');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleStudentExpansion = (studentId: string) => {
    const newExpanded = new Set(expandedStudents);
    if (newExpanded.has(studentId)) {
      newExpanded.delete(studentId);
    } else {
      newExpanded.add(studentId);
    }
    setExpandedStudents(newExpanded);
  };

  const handleRecordPayment = async (studentId: string) => {
    if (!paymentAmount || paymentAmount <= 0) {
      alert('Please enter a valid payment amount');
      return;
    }

    if (!selectedYear) {
      alert('No academic year selected');
      return;
    }

    try {
      await apiService.recordPayment({
        student_id: studentId,
        academic_year_id: selectedYear.id,
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

  if (!selectedYear) {
    return (
      <Layout schoolName={'SMS'} principalName={"User"} onLogout={logout}>
        <div style={{ padding: '32px', textAlign: 'center', color: '#64748b' }}>
          <p style={{ fontSize: '16px', marginBottom: '8px' }}>Please select an academic year to view fee charges</p>
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
            <p style={{ fontSize: '14px', color: '#64748b' }}>
              Viewing fees for: {selectedYear.label} • {groupedCharges.length} student{groupedCharges.length !== 1 ? 's' : ''}
            </p>
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
              Fee Charges by Student
            </h2>
            
            {groupedCharges.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '48px 24px', color: '#64748b' }}>
                <DollarSign size={48} style={{ color: '#cbd5e1', marginBottom: '16px', margin: '0 auto' }} />
                <p>No fee charges found for this academic year</p>
                <p style={{ fontSize: '14px', marginTop: '8px' }}>Click "New Charge" to create one</p>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #e2e8f0' }}>
                      <th style={{ padding: '12px', textAlign: 'left', fontSize: '14px', fontWeight: 600, color: '#64748b', width: '40px' }}></th>
                      <th style={{ padding: '12px', textAlign: 'left', fontSize: '14px', fontWeight: 600, color: '#64748b' }}>Student</th>
                      <th style={{ padding: '12px', textAlign: 'right', fontSize: '14px', fontWeight: 600, color: '#64748b' }}>Total Charged</th>
                      <th style={{ padding: '12px', textAlign: 'right', fontSize: '14px', fontWeight: 600, color: '#64748b' }}>Total Paid</th>
                      <th style={{ padding: '12px', textAlign: 'right', fontSize: '14px', fontWeight: 600, color: '#64748b' }}>Balance</th>
                      <th style={{ padding: '12px', textAlign: 'center', fontSize: '14px', fontWeight: 600, color: '#64748b' }}>Status</th>
                      <th style={{ padding: '12px', textAlign: 'right', fontSize: '14px', fontWeight: 600, color: '#64748b' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {groupedCharges.map((student) => {
                      const isPaid = student.status === 'paid';
                      const isPartiallyPaid = student.status === 'partially_paid';
                      const isExpanded = expandedStudents.has(student.student_id);

                      return (
                        <>
                          {/* Main Student Row */}
                          <tr 
                            key={student.student_id} 
                            style={{ 
                              borderBottom: isExpanded ? 'none' : '1px solid #e2e8f0',
                              backgroundColor: isExpanded ? '#f8fafc' : 'white',
                              cursor: 'pointer'
                            }}
                          >
                            <td 
                              style={{ padding: '12px', textAlign: 'center' }}
                              onClick={() => toggleStudentExpansion(student.student_id)}
                            >
                              {isExpanded ? (
                                <ChevronDown size={16} style={{ color: '#64748b' }} />
                              ) : (
                                <ChevronRight size={16} style={{ color: '#64748b' }} />
                              )}
                            </td>
                            <td 
                              style={{ padding: '12px', fontSize: '14px', fontWeight: 500, color: '#0f172a' }}
                              onClick={() => toggleStudentExpansion(student.student_id)}
                            >
                              {student.student_name}
                              {student.student_code && (
                                <div style={{ fontSize: '12px', color: '#64748b' }}>{student.student_code}</div>
                              )}
                              <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>
                                {student.charges.length} charge{student.charges.length !== 1 ? 's' : ''}
                              </div>
                            </td>
                            <td style={{ padding: '12px', fontSize: '14px', color: '#0f172a', textAlign: 'right', fontWeight: 500 }}>
                              ${student.totalCharged.toFixed(2)}
                            </td>
                            <td style={{ padding: '12px', fontSize: '14px', color: '#16a34a', textAlign: 'right', fontWeight: 500 }}>
                              ${student.totalPaid.toFixed(2)}
                            </td>
                            <td style={{ padding: '12px', fontSize: '14px', color: student.balance > 0 ? '#dc2626' : '#16a34a', textAlign: 'right', fontWeight: 500 }}>
                              ${student.balance.toFixed(2)}
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
                              {!isPaid && recordingPayment !== student.student_id && (
                                <Button
                                  variant="secondary"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setRecordingPayment(student.student_id);
                                    setPaymentAmount(student.balance);
                                  }}
                                >
                                  Record Payment
                                </Button>
                              )}
                            </td>
                          </tr>

                          {/* Expanded Charge Details */}
                          {isExpanded && (
                            <tr key={`${student.student_id}-details`}>
                              <td colSpan={7} style={{ padding: '0 12px 16px 60px', backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                                <div style={{ fontSize: '13px', color: '#475569', fontWeight: 600, marginBottom: '8px', marginTop: '8px' }}>
                                  Individual Charges:
                                </div>
                                <div style={{ background: 'white', borderRadius: '6px', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
                                  {student.charges.map((charge: any, index: number) => (
                                    <div 
                                      key={charge.id} 
                                      style={{ 
                                        display: 'flex', 
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        padding: '10px 16px',
                                        borderBottom: index < student.charges.length - 1 ? '1px solid #f1f5f9' : 'none',
                                        fontSize: '13px'
                                      }}
                                    >
                                      <div>
                                        <div style={{ color: '#0f172a', fontWeight: 500 }}>{charge.category_name || 'Fee'}</div>
                                        {charge.title && charge.title !== charge.category_name && (
                                          <div style={{ color: '#64748b', fontSize: '12px', marginTop: '2px' }}>{charge.title}</div>
                                        )}
                                      </div>
                                      <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                                        <div style={{ textAlign: 'right' }}>
                                          <div style={{ color: '#0f172a', fontWeight: 500 }}>
                                            ${charge.amount.toFixed(2)}
                                          </div>
                                          {charge.total_paid > 0 && (
                                            <div style={{ color: '#16a34a', fontSize: '12px' }}>
                                              Paid: ${charge.total_paid.toFixed(2)}
                                            </div>
                                          )}
                                        </div>
                                        <div style={{ width: '80px', textAlign: 'right' }}>
                                          {charge.status === 'paid' ? (
                                            <span style={{
                                              padding: '3px 6px',
                                              background: '#dcfce7',
                                              color: '#166534',
                                              borderRadius: '3px',
                                              fontSize: '11px',
                                              fontWeight: 500,
                                            }}>
                                              Paid
                                            </span>
                                          ) : charge.status === 'partially_paid' ? (
                                            <span style={{
                                              padding: '3px 6px',
                                              background: '#fef3c7',
                                              color: '#92400e',
                                              borderRadius: '3px',
                                              fontSize: '11px',
                                              fontWeight: 500,
                                            }}>
                                              Partial
                                            </span>
                                          ) : (
                                            <span style={{
                                              padding: '3px 6px',
                                              background: '#fee2e2',
                                              color: '#dc2626',
                                              borderRadius: '3px',
                                              fontSize: '11px',
                                              fontWeight: 500,
                                            }}>
                                              Pending
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </td>
                            </tr>
                          )}
                        </>
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
