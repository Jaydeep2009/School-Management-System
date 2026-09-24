/**
 * Attendance Session Detail Page
 * Mark attendance for students
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
import { ArrowLeft, Lock, Unlock, Save, CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react';

interface AttendanceEntry {
  student_id: string;
  student_name: string;
  roll_number?: string;
  status: 'present' | 'absent' | 'late' | 'excused';
  notes?: string;
}

export function AttendanceSessionDetail() {
  const { id } = useParams<{ id: string }>();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  
  const [session, setSession] = useState<any>(null);
  const [entries, setEntries] = useState<AttendanceEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isLocking, setIsLocking] = useState(false);

  useEffect(() => {
    loadSessionData();
  }, [id]);

  const loadSessionData = async () => {
    if (!id) return;
    try {
      setIsLoading(true);
      setError(null);
      const [sessionRes, entriesRes] = await Promise.all([
        apiService.getAttendanceSession(id),
        apiService.getSessionEntries(id),
      ]);
      setSession(sessionRes.data);
      setEntries(entriesRes.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load session');
    } finally {
      setIsLoading(false);
    }
  };

  const updateStatus = (studentId: string, status: AttendanceEntry['status']) => {
    setEntries(prev => prev.map(entry => 
      entry.student_id === studentId ? { ...entry, status } : entry
    ));
  };

  const handleSave = async () => {
    if (!id) return;
    setIsSaving(true);
    try {
      await apiService.markAttendance(id, entries);
      await loadSessionData();
      alert('Attendance saved successfully');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to save attendance');
    } finally {
      setIsSaving(false);
    }
  };

  const handleLock = async () => {
    if (!id || !confirm('Lock this session? You won\'t be able to edit attendance after locking.')) return;
    setIsLocking(true);
    try {
      await apiService.lockAttendanceSession(id);
      await loadSessionData();
      alert('Session locked successfully');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to lock session');
    } finally {
      setIsLocking(false);
    }
  };

  const handleUnlock = async () => {
    if (!id || !confirm('Unlock this session? Teachers will be able to edit attendance again.')) return;
    setIsLocking(true);
    try {
      await apiService.unlockAttendanceSession(id);
      await loadSessionData();
      alert('Session unlocked successfully');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to unlock session');
    } finally {
      setIsLocking(false);
    }
  };

  if (!user) return null;

  if (isLoading) {
    return (
      <Layout schoolName={'SMS'} principalName={"User"} onLogout={logout}>
        <div style={{ padding: '32px' }}>
          <Skeleton height="300px" />
        </div>
      </Layout>
    );
  }

  if (error || !session) {
    return (
      <Layout schoolName={'SMS'} principalName={"User"} onLogout={logout}>
        <div style={{ padding: '32px' }}>
          <ErrorState message={error || 'Session not found'} onRetry={loadSessionData} />
        </div>
      </Layout>
    );
  }

  const isLocked = session.is_locked;
  const presentCount = entries.filter(e => e.status === 'present').length;
  const absentCount = entries.filter(e => e.status === 'absent').length;
  const lateCount = entries.filter(e => e.status === 'late').length;
  const excusedCount = entries.filter(e => e.status === 'excused').length;

  return (
    <Layout schoolName={'SMS'} principalName={"User"} onLogout={logout}>
      <div style={{ padding: '32px' }}>
        <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
          <div style={{ display: 'flex', alignItems: 'start', gap: '12px' }}>
            <Button variant="secondary" onClick={() => navigate('/attendance')}>
              <ArrowLeft size={16} />
            </Button>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '4px' }}>
                <h1 style={{ fontSize: '28px', fontWeight: 600, color: '#0f172a' }}>
                  Attendance Session
                </h1>
                {isLocked && (
                  <span style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 12px',
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
                {session.classroom_name} • {session.subject_name} • {new Date(session.session_date).toLocaleDateString()} • Period {session.period_no}
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            {!isLocked && (
              <>
                <Button onClick={handleSave} disabled={isSaving}>
                  <Save size={16} style={{ marginRight: '8px' }} />
                  {isSaving ? 'Saving...' : 'Save'}
                </Button>
                <Button variant="secondary" onClick={handleLock} disabled={isLocking}>
                  <Lock size={16} style={{ marginRight: '8px' }} />
                  {isLocking ? 'Locking...' : 'Lock'}
                </Button>
              </>
            )}
            {isLocked && (
              <Button variant="secondary" onClick={handleUnlock} disabled={isLocking}>
                <Unlock size={16} style={{ marginRight: '8px' }} />
                {isLocking ? 'Unlocking...' : 'Unlock'}
              </Button>
            )}
          </div>
        </div>

        {/* Summary */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
          <Card>
            <div style={{ padding: '16px', textAlign: 'center' }}>
              <div style={{ fontSize: '32px', fontWeight: 600, color: '#16a34a', marginBottom: '4px' }}>
                {presentCount}
              </div>
              <div style={{ fontSize: '14px', color: '#64748b' }}>Present</div>
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
              <div style={{ fontSize: '32px', fontWeight: 600, color: '#f59e0b', marginBottom: '4px' }}>
                {lateCount}
              </div>
              <div style={{ fontSize: '14px', color: '#64748b' }}>Late</div>
            </div>
          </Card>
          <Card>
            <div style={{ padding: '16px', textAlign: 'center' }}>
              <div style={{ fontSize: '32px', fontWeight: 600, color: '#6366f1', marginBottom: '4px' }}>
                {excusedCount}
              </div>
              <div style={{ fontSize: '14px', color: '#64748b' }}>Excused</div>
            </div>
          </Card>
        </div>

        {/* Student List */}
        <Card>
          <div style={{ padding: '24px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#0f172a', marginBottom: '16px' }}>
              Students ({entries.length})
            </h2>
            
            {entries.length === 0 ? (
              <div style={{ padding: '48px', textAlign: 'center', color: '#64748b' }}>
                <p>No students enrolled in this class</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {entries.map((entry) => (
                  <div
                    key={entry.student_id}
                    style={{
                      padding: '16px',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600, color: '#0f172a', marginBottom: '4px' }}>
                        {entry.student_name}
                      </div>
                      {entry.roll_number && (
                        <div style={{ fontSize: '14px', color: '#64748b' }}>
                          Roll: {entry.roll_number}
                        </div>
                      )}
                    </div>

                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        onClick={() => updateStatus(entry.student_id, 'present')}
                        disabled={isLocked}
                        style={{
                          padding: '8px 16px',
                          border: entry.status === 'present' ? '2px solid #16a34a' : '1px solid #e2e8f0',
                          background: entry.status === 'present' ? '#dcfce7' : 'white',
                          color: entry.status === 'present' ? '#16a34a' : '#64748b',
                          borderRadius: '6px',
                          fontSize: '14px',
                          fontWeight: 500,
                          cursor: isLocked ? 'not-allowed' : 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                        }}
                      >
                        <CheckCircle size={16} />
                        Present
                      </button>
                      <button
                        onClick={() => updateStatus(entry.student_id, 'absent')}
                        disabled={isLocked}
                        style={{
                          padding: '8px 16px',
                          border: entry.status === 'absent' ? '2px solid #dc2626' : '1px solid #e2e8f0',
                          background: entry.status === 'absent' ? '#fee2e2' : 'white',
                          color: entry.status === 'absent' ? '#dc2626' : '#64748b',
                          borderRadius: '6px',
                          fontSize: '14px',
                          fontWeight: 500,
                          cursor: isLocked ? 'not-allowed' : 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                        }}
                      >
                        <XCircle size={16} />
                        Absent
                      </button>
                      <button
                        onClick={() => updateStatus(entry.student_id, 'late')}
                        disabled={isLocked}
                        style={{
                          padding: '8px 16px',
                          border: entry.status === 'late' ? '2px solid #f59e0b' : '1px solid #e2e8f0',
                          background: entry.status === 'late' ? '#fef3c7' : 'white',
                          color: entry.status === 'late' ? '#92400e' : '#64748b',
                          borderRadius: '6px',
                          fontSize: '14px',
                          fontWeight: 500,
                          cursor: isLocked ? 'not-allowed' : 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                        }}
                      >
                        <Clock size={16} />
                        Late
                      </button>
                      <button
                        onClick={() => updateStatus(entry.student_id, 'excused')}
                        disabled={isLocked}
                        style={{
                          padding: '8px 16px',
                          border: entry.status === 'excused' ? '2px solid #6366f1' : '1px solid #e2e8f0',
                          background: entry.status === 'excused' ? '#e0e7ff' : 'white',
                          color: entry.status === 'excused' ? '#4338ca' : '#64748b',
                          borderRadius: '6px',
                          fontSize: '14px',
                          fontWeight: 500,
                          cursor: isLocked ? 'not-allowed' : 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                        }}
                      >
                        <AlertCircle size={16} />
                        Excused
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>
      </div>
    </Layout>
  );
}





