/**
 * Timetable View Page - Display uploaded timetable entries
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
import { ArrowLeft, Calendar, CheckCircle, Archive } from 'lucide-react';

interface TimetableEntry {
  id: string;
  day_of_week: number;
  period_no: number;
  subject_name: string;
  teacher_name: string;
  start_time: string;
  end_time: string;
}

const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export function TimetableView() {
  const { id } = useParams<{ id: string }>();
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [timetable, setTimetable] = useState<any>(null);
  const [entries, setEntries] = useState<TimetableEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isActionLoading, setIsActionLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    if (!id) return;
    try {
      setIsLoading(true);
      setError(null);
      
      // Load timetable details
      const timetableRes = await apiService.getTimetable(id);
      setTimetable(timetableRes.data);
      
      // Load timetable entries
      const entriesRes = await apiService.getTimetableEntries(id);
      setEntries(entriesRes.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load timetable');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePublish = async () => {
    if (!id || !confirm('Publish this timetable? It will become active for students and teachers.')) return;
    setIsActionLoading(true);
    try {
      await apiService.publishTimetable(id);
      await loadData();
      alert('Timetable published successfully');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to publish timetable');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleArchive = async () => {
    if (!id || !confirm('Archive this timetable? It will no longer be active.')) return;
    setIsActionLoading(true);
    try {
      await apiService.archiveTimetable(id);
      await loadData();
      alert('Timetable archived successfully');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to archive timetable');
    } finally {
      setIsActionLoading(false);
    }
  };

  if (!user) return null;

  if (isLoading) {
    return (
      <Layout schoolName={'SMS'} principalName={"User"} onLogout={logout}>
        <div style={{ padding: '32px' }}>
          <Skeleton height="500px" />
        </div>
      </Layout>
    );
  }

  if (error || !timetable) {
    return (
      <Layout schoolName={'SMS'} principalName={"User"} onLogout={logout}>
        <div style={{ padding: '32px' }}>
          <ErrorState message={error || 'Timetable not found'} onRetry={loadData} />
        </div>
      </Layout>
    );
  }

  const status = timetable.status || 'draft';
  const isDraft = status === 'draft';
  const isPublished = status === 'published';

  // Group entries by day
  const entriesByDay: { [day: number]: TimetableEntry[] } = {};
  entries.forEach(entry => {
    if (!entriesByDay[entry.day_of_week]) {
      entriesByDay[entry.day_of_week] = [];
    }
    entriesByDay[entry.day_of_week].push(entry);
  });

  // Get all unique periods
  const allPeriods = Array.from(new Set(entries.map(e => e.period_no))).sort((a, b) => a - b);

  return (
    <Layout schoolName={'SMS'} principalName={"User"} onLogout={logout}>
      <div style={{ padding: '32px' }}>
        <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
          <div style={{ display: 'flex', alignItems: 'start', gap: '12px' }}>
            <Button variant="secondary" onClick={() => navigate('/timetable')}>
              <ArrowLeft size={16} />
            </Button>
            <div>
              <h1 style={{ fontSize: '28px', fontWeight: 600, color: '#0f172a', marginBottom: '4px' }}>
                {timetable.name}
              </h1>
              <p style={{ fontSize: '14px', color: '#64748b' }}>
                {timetable.classroom_name} • {timetable.academic_year_name}
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <span style={{
              padding: '6px 12px',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: 500,
              background: isPublished ? '#dcfce7' : '#f1f5f9',
              color: isPublished ? '#166534' : '#64748b',
            }}>
              {status}
            </span>
            {isDraft && (
              <Button onClick={handlePublish} disabled={isActionLoading}>
                <CheckCircle size={16} style={{ marginRight: '8px' }} />
                Publish
              </Button>
            )}
            {isPublished && (
              <Button variant="secondary" onClick={handleArchive} disabled={isActionLoading}>
                <Archive size={16} style={{ marginRight: '8px' }} />
                Archive
              </Button>
            )}
          </div>
        </div>

        {/* Timetable Grid */}
        {entries.length === 0 ? (
          <Card>
            <div style={{ 
              padding: '48px', 
              textAlign: 'center',
              color: '#64748b'
            }}>
              <Calendar size={64} style={{ color: '#cbd5e1', margin: '0 auto 16px' }} />
              <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#0f172a', marginBottom: '8px' }}>
                No Timetable Entries
              </h3>
              <p style={{ fontSize: '14px' }}>
                This timetable has no entries yet
              </p>
            </div>
          </Card>
        ) : (
          <Card>
            <div style={{ padding: '24px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#0f172a', marginBottom: '16px' }}>
                Weekly Schedule
              </h2>
              
              <div style={{ overflowX: 'auto' }}>
                <table style={{ 
                  width: '100%', 
                  borderCollapse: 'collapse',
                  minWidth: '800px'
                }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #e2e8f0', background: '#f8fafc' }}>
                      <th style={{ 
                        padding: '12px', 
                        textAlign: 'left', 
                        fontSize: '14px', 
                        fontWeight: 600, 
                        color: '#64748b',
                        position: 'sticky',
                        left: 0,
                        background: '#f8fafc',
                        zIndex: 1
                      }}>
                        Day / Period
                      </th>
                      {allPeriods.map(periodNo => {
                        // Find an entry for this period to get timing
                        const sampleEntry = entries.find(e => e.period_no === periodNo);
                        return (
                          <th key={periodNo} style={{ 
                            padding: '12px', 
                            textAlign: 'center', 
                            fontSize: '14px', 
                            fontWeight: 600, 
                            color: '#64748b',
                            minWidth: '140px'
                          }}>
                            <div>Period {periodNo}</div>
                            {sampleEntry && (
                              <div style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 400 }}>
                                {sampleEntry.start_time} - {sampleEntry.end_time}
                              </div>
                            )}
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {[1, 2, 3, 4, 5, 6].map(dayOfWeek => {
                      const dayEntries = entriesByDay[dayOfWeek] || [];
                      const dayName = DAY_NAMES[dayOfWeek - 1];
                      
                      return (
                        <tr key={dayOfWeek} style={{ borderBottom: '1px solid #e2e8f0' }}>
                          <td style={{ 
                            padding: '12px', 
                            fontSize: '14px', 
                            fontWeight: 600, 
                            color: '#0f172a',
                            position: 'sticky',
                            left: 0,
                            background: 'white',
                            zIndex: 1
                          }}>
                            {dayName}
                          </td>
                          {allPeriods.map(periodNo => {
                            const entry = dayEntries.find(e => e.period_no === periodNo);
                            
                            if (!entry) {
                              return (
                                <td key={periodNo} style={{ 
                                  padding: '12px', 
                                  textAlign: 'center',
                                  color: '#cbd5e1',
                                  fontSize: '13px'
                                }}>
                                  Free
                                </td>
                              );
                            }
                            
                            return (
                              <td key={periodNo} style={{ 
                                padding: '12px',
                                background: '#eff6ff',
                                border: '1px solid #dbeafe'
                              }}>
                                <div style={{ 
                                  fontSize: '14px', 
                                  fontWeight: 600, 
                                  color: '#1e40af',
                                  marginBottom: '4px'
                                }}>
                                  {entry.subject_name}
                                </div>
                                <div style={{ 
                                  fontSize: '12px', 
                                  color: '#64748b',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '4px'
                                }}>
                                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                                    <circle cx="12" cy="7" r="4"></circle>
                                  </svg>
                                  {entry.teacher_name}
                                </div>
                                <div style={{ 
                                  fontSize: '11px', 
                                  color: '#94a3b8',
                                  marginTop: '4px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '4px'
                                }}>
                                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <circle cx="12" cy="12" r="10"></circle>
                                    <polyline points="12 6 12 12 16 14"></polyline>
                                  </svg>
                                  {entry.start_time} - {entry.end_time}
                                </div>
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </Card>
        )}
      </div>
    </Layout>
  );
}
