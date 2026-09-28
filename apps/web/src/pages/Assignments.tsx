/**
 * Assignments Page
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
import type { Assignment } from '../types/entities';
import { FileText, Plus } from 'lucide-react';
import { useAcademicYear } from '../contexts/AcademicYearContext';

export function Assignments() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { selectedYear } = useAcademicYear();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadAssignments();
  }, [selectedYear?.id]);

  const loadAssignments = async () => {
    if (!selectedYear) {
      setAssignments([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const params = { academic_year_id: selectedYear.id };
      const response = await apiService.getAssignments(params);
      setAssignments(response.data || response);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load assignments');
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) return null;

  if (!selectedYear) {
    return (
      <Layout schoolName={'SMS'} principalName={"User"} onLogout={logout}>
        <div style={{ padding: '32px', textAlign: 'center', color: '#64748b' }}>
          <p style={{ fontSize: '16px', marginBottom: '8px' }}>Please select an academic year to view assignments</p>
          <p style={{ fontSize: '14px' }}>Use the dropdown in the header to select a year</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout schoolName={'SMS'} principalName={"User"} onLogout={logout}>
      <div style={{ padding: '32px' }}>
        <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ fontSize: '28px', fontWeight: 600, color: '#0f172a', marginBottom: '8px' }}>Assignments</h1>
            <p style={{ fontSize: '14px', color: '#64748b' }}>View and manage assignments</p>
          </div>
          <Button onClick={() => navigate('/assignments/new')}>
            <Plus size={16} style={{ marginRight: '8px' }} />
            New Assignment
          </Button>
        </div>

        <Card>
          <div style={{ padding: '24px' }}>
            {isLoading && <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>{[1, 2, 3].map((i) => <Skeleton key={i} height="80px" />)}</div>}
            {error && !isLoading && <ErrorState message={error} onRetry={loadAssignments} />}
            {!isLoading && !error && assignments.length === 0 && (
              <div style={{ textAlign: 'center', padding: '48px 24px' }}>
                <FileText size={48} style={{ color: '#cbd5e1', marginBottom: '16px' }} />
                <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#0f172a', marginBottom: '8px' }}>No assignments</h3>
                <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '24px' }}>Start by creating your first assignment</p>
                <Button onClick={() => navigate('/assignments/new')}>Create Assignment</Button>
              </div>
            )}
            {!isLoading && !error && assignments.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {assignments.map((assignment) => (
                  <div
                    key={assignment.id}
                    style={{ padding: '16px', border: '1px solid #e2e8f0', borderRadius: '8px', cursor: 'pointer' }}
                    onClick={() => navigate(`/assignments/${assignment.id}`)}
                  >
                    <div style={{ fontWeight: 600, color: '#0f172a', marginBottom: '4px' }}>{assignment.title}</div>
                    <div style={{ fontSize: '14px', color: '#64748b', marginBottom: '4px' }}>
                      {assignment.classroom_name} - {assignment.subject_name}
                    </div>
                    {assignment.due_date && (
                      <div style={{ fontSize: '14px', color: '#64748b' }}>
                        Due: {new Date(assignment.due_date).toLocaleDateString()}
                      </div>
                    )}
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






