/**
 * Timetable Builder Page
 * Visual grid interface for creating timetables: Days × Periods
 * Principal assigns: Classroom + Subject + Teacher for each slot
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Layout } from '../components/layout/Layout';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Skeleton } from '../components/ui/Skeleton';
import { ErrorState } from '../components/ui/ErrorState';
import { useAuth } from '../hooks/useAuth';
import { useAcademicYear } from '../contexts/AcademicYearContext';
import { apiService } from '../services/api';
import { ArrowLeft, Save, CheckCircle, AlertCircle } from 'lucide-react';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export function TimetableBuilder() {
  const { id } = useParams<{ id: string }>();
  const { user, logout } = useAuth();
  const { selectedYear } = useAcademicYear();
  const navigate = useNavigate();
  const isEditMode = id && id !== 'new';

  const [timetable, setTimetable] = useState<any>(null);
  const [periods, setPeriods] = useState<any[]>([]);
  const [entries, setEntries] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [teachingAssignments, setTeachingAssignments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clashWarnings, setClashWarnings] = useState<Map<string, string>>(new Map());
  const [useStrictMode, setUseStrictMode] = useState(false);

  useEffect(() => {
    loadData();
  }, [id, selectedYear]);

  const loadData = async () => {
    if (!selectedYear) return;

    try {
      setIsLoading(true);
      setError(null);

      const [periodsRes, teachersRes, subjectsRes, assignmentsRes] = await Promise.all([
        apiService.getPeriodTimings(selectedYear.id),
        apiService.getTeachers(),
        apiService.getSubjects(),
        apiService.getTeachingAssignments(),
      ]);

      setPeriods(periodsRes.data.filter((p: any) => !p.is_break));
      setTeachers(teachersRes.data);
      setSubjects(subjectsRes.data);
      setTeachingAssignments(assignmentsRes.data);

      if (isEditMode && id) {
        const [ttRes, entriesRes] = await Promise.all([
          apiService.getTimetable(id),
          apiService.getTimetableEntries(id),
        ]);
        setTimetable(ttRes.data);
        setEntries(entriesRes.data || []);
      }
    } catch (err) {
      console.error('[TimetableBuilder] Error loading data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setIsLoading(false);
    }
  };

  const getEntry = (dayIndex: number, periodNo: number) => {
    return entries.find(e => e.day_of_week === dayIndex + 1 && e.period_no === periodNo);
  };

  const getValidTeachers = (subjectId: string) => {
    if (!timetable || !subjectId) return [];
    
    // Check if teaching assignments exist for this classroom + subject
    const validAssignments = teachingAssignments.filter(
      (ta: any) => ta.classroom_id === timetable.classroom_id && ta.subject_id === subjectId
    );
    
    // STRICT MODE: Only show teachers with teaching assignments
    if (useStrictMode && validAssignments.length > 0) {
      console.log('[TimetableBuilder] Strict mode: Using teaching assignments');
      return teachers.filter(t => 
        validAssignments.some((ta: any) => ta.teacher_id === t.id)
      );
    }
    
    // QUICK MODE: Show all teachers (default)
    console.log('[TimetableBuilder] Quick mode: Showing all teachers');
    return teachers;
  };

  const updateEntry = (dayIndex: number, periodNo: number, field: 'subject_id' | 'teacher_id', value: string) => {
    const dayOfWeek = dayIndex + 1;
    const existing = entries.find(e => e.day_of_week === dayOfWeek && e.period_no === periodNo);

    if (existing) {
      setEntries(prev => prev.map(e =>
        e.day_of_week === dayOfWeek && e.period_no === periodNo
          ? { ...e, [field]: value }
          : e
      ));
    } else {
      const newEntry = {
        day_of_week: dayOfWeek,
        period_no: periodNo,
        subject_id: field === 'subject_id' ? value : '',
        teacher_id: field === 'teacher_id' ? value : '',
      };
      setEntries(prev => [...prev, newEntry]);
    }

    // Check for clashes
    checkClashes(dayOfWeek, periodNo, value, field);
  };

  const checkClashes = (dayOfWeek: number, periodNo: number, value: string, field: 'subject_id' | 'teacher_id') => {
    if (field !== 'teacher_id' || !value) return;

    // Check if teacher is already assigned at this day/period
    const teacherClash = entries.some(e =>
      e.day_of_week === dayOfWeek &&
      e.period_no === periodNo &&
      e.teacher_id === value &&
      e.teacher_id !== ''
    );

    const key = `${dayOfWeek}-${periodNo}`;
    if (teacherClash) {
      setClashWarnings(prev => new Map(prev).set(key, 'Teacher already assigned at this time'));
    } else {
      setClashWarnings(prev => {
        const newMap = new Map(prev);
        newMap.delete(key);
        return newMap;
      });
    }
  };

  const handleSave = async () => {
    if (!timetable) return;

    try {
      setIsSaving(true);

      // Save each entry
      for (const entry of entries) {
        if (!entry.subject_id || !entry.teacher_id) continue;

        if (entry.id) {
          await apiService.updateTimetableEntry(timetable.id, entry.id, entry);
        } else {
          await apiService.createTimetableEntry(timetable.id, entry);
        }
      }

      alert('Timetable saved successfully');
      navigate(`/timetable/${timetable.id}`);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to save timetable');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePublish = async () => {
    if (!timetable || !confirm('Publish this timetable? It will become active for teachers and students.')) return;

    try {
      await apiService.publishTimetable(timetable.id);
      alert('Timetable published successfully');
      navigate('/timetable');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to publish timetable');
    }
  };

  if (!user) return null;

  if (!selectedYear) {
    return (
      <Layout schoolName={'SMS'} principalName={"User"} onLogout={logout}>
        <div style={{ padding: '32px', textAlign: 'center', color: '#64748b' }}>
          <p>Please select an academic year</p>
        </div>
      </Layout>
    );
  }

  if (isLoading) {
    return (
      <Layout schoolName={'SMS'} principalName={"User"} onLogout={logout}>
        <div style={{ padding: '32px' }}>
          <Skeleton height="600px" />
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout schoolName={'SMS'} principalName={"User"} onLogout={logout}>
        <div style={{ padding: '32px' }}>
          <ErrorState message={error} onRetry={loadData} />
        </div>
      </Layout>
    );
  }

  if (periods.length === 0) {
    return (
      <Layout schoolName={'SMS'} principalName={"User"} onLogout={logout}>
        <div style={{ padding: '32px' }}>
          <Card>
            <div style={{ padding: '48px', textAlign: 'center' }}>
              <AlertCircle size={64} style={{ color: '#f59e0b', margin: '0 auto 16px' }} />
              <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#0f172a', marginBottom: '8px' }}>
                No Period Timings Defined
              </h3>
              <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '24px' }}>
                You need to set up period timings before creating a timetable
              </p>
              <Button onClick={() => navigate('/period-setup')}>
                Go to Period Setup
              </Button>
            </div>
          </Card>
        </div>
      </Layout>
    );
  }

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
                {timetable?.name || 'New Timetable'}
              </h1>
              <p style={{ fontSize: '14px', color: '#64748b' }}>
                {timetable?.classroom_name || 'Building timetable...'}
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            {/* Teacher Filter Toggle */}
            <label style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px', 
              fontSize: '14px',
              color: '#64748b',
              cursor: 'pointer',
              userSelect: 'none'
            }}>
              <input
                type="checkbox"
                checked={useStrictMode}
                onChange={(e) => setUseStrictMode(e.target.checked)}
                style={{ 
                  width: '16px', 
                  height: '16px', 
                  cursor: 'pointer',
                  accentColor: '#3b82f6'
                }}
              />
              <span style={{ fontWeight: 500, color: '#0f172a' }}>
                Only show qualified teachers
              </span>
              <span style={{ 
                fontSize: '12px', 
                color: '#94a3b8',
                fontStyle: 'italic'
              }}>
                (requires teaching assignments)
              </span>
            </label>
            
            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '8px' }}>
              <Button variant="secondary" onClick={handleSave} disabled={isSaving || !timetable}>
                <Save size={16} style={{ marginRight: '8px' }} />
                {isSaving ? 'Saving...' : 'Save'}
              </Button>
              {timetable?.status === 'draft' && (
                <Button onClick={handlePublish}>
                  <CheckCircle size={16} style={{ marginRight: '8px' }} />
                  Publish
                </Button>
              )}
            </div>
          </div>
        </div>

        <Card>
          <div style={{ padding: '24px', overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '800px' }}>
              <thead>
                <tr>
                  <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #e2e8f0', fontSize: '14px', fontWeight: 600, color: '#64748b' }}>
                    Day / Period
                  </th>
                  {periods.map(period => (
                    <th key={period.id} style={{ padding: '12px', textAlign: 'center', borderBottom: '2px solid #e2e8f0', fontSize: '14px', fontWeight: 600, color: '#64748b' }}>
                      <div>{period.label}</div>
                      <div style={{ fontSize: '12px', fontWeight: 'normal', color: '#94a3b8' }}>
                        {period.start_time}-{period.end_time}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {DAYS.map((day, dayIndex) => (
                  <tr key={day}>
                    <td style={{ padding: '12px', fontWeight: 600, color: '#0f172a', borderBottom: '1px solid #e2e8f0' }}>
                      {day}
                    </td>
                    {periods.map(period => {
                      const entry = getEntry(dayIndex, period.period_no);
                      const clashKey = `${dayIndex + 1}-${period.period_no}`;
                      const hasClash = clashWarnings.has(clashKey);
                      const validTeachers = entry?.subject_id ? getValidTeachers(entry.subject_id) : [];

                      return (
                        <td key={`${day}-${period.id}`} style={{ padding: '8px', borderBottom: '1px solid #e2e8f0', background: hasClash ? '#fee2e2' : 'white' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <select
                              value={entry?.subject_id || ''}
                              onChange={(e) => updateEntry(dayIndex, period.period_no, 'subject_id', e.target.value)}
                              style={{
                                width: '100%',
                                padding: '6px',
                                border: '1px solid #e2e8f0',
                                borderRadius: '4px',
                                fontSize: '12px',
                              }}
                            >
                              <option value="">Select Subject</option>
                              {subjects.map(subject => (
                                <option key={subject.id} value={subject.id}>
                                  {subject.name}
                                </option>
                              ))}
                            </select>
                            <select
                              value={entry?.teacher_id || ''}
                              onChange={(e) => updateEntry(dayIndex, period.period_no, 'teacher_id', e.target.value)}
                              disabled={!entry?.subject_id}
                              style={{
                                width: '100%',
                                padding: '6px',
                                border: '1px solid #e2e8f0',
                                borderRadius: '4px',
                                fontSize: '12px',
                              }}
                            >
                              <option value="">Select Teacher</option>
                              {validTeachers.map((teacher: any) => (
                                <option key={teacher.id} value={teacher.id}>
                                  {teacher.full_name}
                                </option>
                              ))}
                            </select>
                            {hasClash && (
                              <div style={{ fontSize: '10px', color: '#ef4444' }}>
                                {clashWarnings.get(clashKey)}
                              </div>
                            )}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </Layout>
  );
}
