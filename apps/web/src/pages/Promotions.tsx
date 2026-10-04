/**
 * Student Promotions Page
 * Principal can promote students to next academic year
 */

import { useState, useEffect } from 'react';
import { Layout } from '../components/layout/Layout';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Skeleton } from '../components/ui/Skeleton';
import { ErrorState } from '../components/ui/ErrorState';
import { apiService } from '../services/api';
import { ArrowUp, Users, GraduationCap, RefreshCw, AlertTriangle } from 'lucide-react';

export function Promotions() {
  const [academicYears, setAcademicYears] = useState<any[]>([]);
  const [classrooms, setClassrooms] = useState<any[]>([]);
  const [selectedCurrentYear, setSelectedCurrentYear] = useState<string>('');
  const [selectedNewYear, setSelectedNewYear] = useState<string>('');
  const [selectedClassroom, setSelectedClassroom] = useState<string>('');
  const [preview, setPreview] = useState<any>(null);
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [bulkAction, setBulkAction] = useState<'promote' | 'retain' | 'graduate' | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (selectedCurrentYear && selectedClassroom) {
      loadPreview();
    }
  }, [selectedCurrentYear, selectedClassroom]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const [yearsRes, classroomsRes] = await Promise.all([
        apiService.getAcademicYears(),
        apiService.getClassrooms(),
      ]);

      setAcademicYears(yearsRes.data || []);
      setClassrooms(classroomsRes.data || []);

      // Auto-select current year
      const currentYear = yearsRes.data?.find((y: any) => y.status === 'current');
      if (currentYear) {
        setSelectedCurrentYear(currentYear.id);
      }
    } catch (err) {
      console.error('Failed to load data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setIsLoading(false);
    }
  };

  const loadPreview = async () => {
    if (!selectedCurrentYear || !selectedClassroom) return;

    try {
      setIsLoadingPreview(true);
      const res = await apiService.getPromotionPreview(selectedClassroom, selectedCurrentYear);
      setPreview(res.data);
      setSelectedStudents(new Set());
    } catch (err) {
      console.error('Failed to load preview:', err);
      alert(err instanceof Error ? err.message : 'Failed to load preview');
    } finally {
      setIsLoadingPreview(false);
    }
  };

  const toggleStudent = (enrollmentId: string) => {
    const newSelected = new Set(selectedStudents);
    if (newSelected.has(enrollmentId)) {
      newSelected.delete(enrollmentId);
    } else {
      newSelected.add(enrollmentId);
    }
    setSelectedStudents(newSelected);
  };

  const toggleAll = () => {
    if (selectedStudents.size === preview?.students?.length) {
      setSelectedStudents(new Set());
    } else {
      setSelectedStudents(new Set(preview?.students?.map((s: any) => s.enrollment_id) || []));
    }
  };

  const handleBulkAction = (action: 'promote' | 'retain' | 'graduate') => {
    if (!selectedNewYear && action !== 'graduate') {
      alert('Please select target academic year');
      return;
    }

    if (selectedStudents.size === 0) {
      alert('Please select at least one student');
      return;
    }

    setBulkAction(action);
    setShowConfirmDialog(true);
  };

  const confirmPromotion = async () => {
    if (!bulkAction || !selectedClassroom || !selectedCurrentYear) return;

    try {
      const studentIds = Array.from(selectedStudents).map(enrollmentId => {
        const student = preview?.students?.find((s: any) => s.enrollment_id === enrollmentId);
        return student?.student_id;
      }).filter(Boolean);

      let newGrade: number | undefined;
      if (bulkAction === 'promote') {
        newGrade = preview.current_grade + 1;
      } else if (bulkAction === 'retain') {
        newGrade = preview.current_grade;
      }

      const res = await apiService.bulkPromoteStudents({
        classroom_id: selectedClassroom,
        current_academic_year_id: selectedCurrentYear,
        new_academic_year_id: selectedNewYear || selectedCurrentYear,
        action: bulkAction,
        new_grade: newGrade,
        student_ids: studentIds,
      });

      alert(res.message || 'Students promoted successfully');
      setShowConfirmDialog(false);
      setBulkAction(null);
      loadPreview();
    } catch (err) {
      console.error('Promotion failed:', err);
      alert(err instanceof Error ? err.message : 'Failed to promote students');
    }
  };

  if (isLoading) {
    return (
      <Layout role="principal">
        <div style={{ padding: '24px' }}>
          <Skeleton count={5} />
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout role="principal">
        <div style={{ padding: '24px' }}>
          <ErrorState message={error} />
        </div>
      </Layout>
    );
  }

  const getActionLabel = (action: 'promote' | 'retain' | 'graduate') => {
    switch (action) {
      case 'promote':
        return `Promote to Grade ${(preview?.current_grade || 0) + 1}`;
      case 'retain':
        return 'Retain in Same Grade';
      case 'graduate':
        return 'Mark as Graduated';
    }
  };

  return (
    <Layout role="principal">
      <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
        <div style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <GraduationCap size={32} style={{ color: '#3b82f6' }} />
          <div>
            <h1 style={{ fontSize: '28px', fontWeight: 700, color: '#0f172a', margin: 0 }}>
              Student Promotions
            </h1>
            <p style={{ fontSize: '14px', color: '#64748b', margin: '4px 0 0 0' }}>
              Promote students to next academic year or update their status
            </p>
          </div>
        </div>

        {/* Selection Controls */}
        <Card>
          <div style={{ padding: '24px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '16px' }}>
              Select Academic Year & Classroom
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '8px' }}>
                  Current Academic Year
                </label>
                <select
                  value={selectedCurrentYear}
                  onChange={(e) => setSelectedCurrentYear(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #e2e8f0',
                    borderRadius: '6px',
                    fontSize: '14px',
                  }}
                >
                  <option value="">Select Year</option>
                  {academicYears.map((year) => (
                    <option key={year.id} value={year.id}>
                      {year.year_label} ({year.status})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '8px' }}>
                  Target Academic Year
                </label>
                <select
                  value={selectedNewYear}
                  onChange={(e) => setSelectedNewYear(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #e2e8f0',
                    borderRadius: '6px',
                    fontSize: '14px',
                  }}
                >
                  <option value="">Select Year</option>
                  {academicYears.map((year) => (
                    <option key={year.id} value={year.id}>
                      {year.year_label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '8px' }}>
                  Classroom
                </label>
                <select
                  value={selectedClassroom}
                  onChange={(e) => setSelectedClassroom(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #e2e8f0',
                    borderRadius: '6px',
                    fontSize: '14px',
                  }}
                  disabled={!selectedCurrentYear}
                >
                  <option value="">Select Classroom</option>
                  {classrooms.map((classroom) => (
                    <option key={classroom.id} value={classroom.id}>
                      Grade {classroom.grade}-{classroom.division}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </Card>

        {/* Preview */}
        {isLoadingPreview && (
          <Card style={{ marginTop: '24px' }}>
            <div style={{ padding: '48px', textAlign: 'center' }}>
              <RefreshCw className="animate-spin" size={48} style={{ color: '#cbd5e1', margin: '0 auto 16px' }} />
              <p style={{ fontSize: '14px', color: '#64748b' }}>Loading students...</p>
            </div>
          </Card>
        )}

        {preview && !isLoadingPreview && (
          <>
            {/* Summary */}
            <Card style={{ marginTop: '24px' }}>
              <div style={{ padding: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <div>
                    <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '4px' }}>
                      {preview.classroom_name}
                    </h2>
                    <p style={{ fontSize: '14px', color: '#64748b' }}>
                      {preview.total_students} students • {selectedStudents.size} selected
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <Button
                      onClick={() => handleBulkAction('promote')}
                      disabled={selectedStudents.size === 0}
                      style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                    >
                      <ArrowUp size={16} />
                      Promote Selected
                    </Button>
                    <Button
                      onClick={() => handleBulkAction('retain')}
                      disabled={selectedStudents.size === 0}
                      variant="outline"
                      style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                    >
                      <RefreshCw size={16} />
                      Retain Selected
                    </Button>
                    {preview.current_grade >= 12 && (
                      <Button
                        onClick={() => handleBulkAction('graduate')}
                        disabled={selectedStudents.size === 0}
                        variant="outline"
                        style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                      >
                        <GraduationCap size={16} />
                        Graduate Selected
                      </Button>
                    )}
                  </div>
                </div>

                {/* Student List */}
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                        <th style={{ padding: '12px', textAlign: 'left' }}>
                          <input
                            type="checkbox"
                            checked={selectedStudents.size === preview.students.length}
                            onChange={toggleAll}
                          />
                        </th>
                        <th style={{ padding: '12px', textAlign: 'left', fontSize: '14px', fontWeight: 600 }}>
                          Roll No.
                        </th>
                        <th style={{ padding: '12px', textAlign: 'left', fontSize: '14px', fontWeight: 600' }}>
                          Student Name
                        </th>
                        <th style={{ padding: '12px', textAlign: 'left', fontSize: '14px', fontWeight: 600' }}>
                          Current Grade
                        </th>
                        <th style={{ padding: '12px', textAlign: 'left', fontSize: '14px', fontWeight: 600' }}>
                          Suggested Action
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {preview.students.map((student: any) => (
                        <tr key={student.enrollment_id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                          <td style={{ padding: '12px' }}>
                            <input
                              type="checkbox"
                              checked={selectedStudents.has(student.enrollment_id)}
                              onChange={() => toggleStudent(student.enrollment_id)}
                            />
                          </td>
                          <td style={{ padding: '12px', fontSize: '14px' }}>{student.roll_number}</td>
                          <td style={{ padding: '12px', fontSize: '14px', fontWeight: 500 }}>
                            {student.student_name}
                          </td>
                          <td style={{ padding: '12px', fontSize: '14px' }}>Grade {student.current_grade}</td>
                          <td style={{ padding: '12px', fontSize: '14px' }}>
                            {student.suggested_action === 'promote' && (
                              <span style={{ color: '#22c55e' }}>
                                Promote to Grade {student.suggested_new_grade}
                              </span>
                            )}
                            {student.suggested_action === 'graduate' && (
                              <span style={{ color: '#3b82f6' }}>Graduate</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </Card>
          </>
        )}

        {/* Confirmation Dialog */}
        {showConfirmDialog && bulkAction && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0, 0, 0, 0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000,
            }}
            onClick={() => setShowConfirmDialog(false)}
          >
            <Card
              style={{ maxWidth: '500px', width: '90%' }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ padding: '24px' }}>
                <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
                  <AlertTriangle size={24} style={{ color: '#f59e0b' }} />
                  <h3 style={{ fontSize: '18px', fontWeight: 600, margin: 0 }}>
                    Confirm Promotion
                  </h3>
                </div>
                <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '24px' }}>
                  Are you sure you want to <strong>{getActionLabel(bulkAction)}</strong> for{' '}
                  <strong>{selectedStudents.size} student(s)</strong>?
                </p>
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                  <Button variant="outline" onClick={() => setShowConfirmDialog(false)}>
                    Cancel
                  </Button>
                  <Button onClick={confirmPromotion}>Confirm</Button>
                </div>
              </div>
            </Card>
          </div>
        )}
      </div>
    </Layout>
  );
}
