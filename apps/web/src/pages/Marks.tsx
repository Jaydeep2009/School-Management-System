/**
 * Marks & Assessments Page
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
import type { Assessment } from '../types/entities';
import { BarChart3, Plus } from 'lucide-react';
import { useAcademicYear } from '../contexts/AcademicYearContext';

export function Marks() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { selectedYear } = useAcademicYear();
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadAssessments();
  }, [selectedYear?.id]);

  // Also reload when component mounts or window regains focus
  useEffect(() => {
    const handleFocus = () => {
      console.log('[Marks] Window focused, reloading assessments');
      loadAssessments();
    };
    
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [selectedYear?.id]);

  const loadAssessments = async () => {
    try {
      setIsLoading(true);
      setError(null);
      if (selectedYear?.id) {
        const response = await apiService.getAssessments({ academic_year_id: selectedYear.id });
        const data = response.data || response;
        setAssessments(data);
        
        // Debug: log if no assessments found
        if (!data || data.length === 0) {
          console.log('[Marks] No assessments found for year:', selectedYear.id);
          console.log('[Marks] Trying without filter...');
          // Try without filter to see if assessments exist
          const allResponse = await apiService.getAssessments({});
          console.log('[Marks] All assessments:', allResponse.data || allResponse);
        }
      } else {
        setAssessments([]);
      }
    } catch (err) {
      console.error('[Marks] Error loading assessments:', err);
      setError(err instanceof Error ? err.message : 'Failed to load assessments');
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) return null;

  const getNewAssessmentPath = () => {
    return user.role === 'teacher' ? '/teacher/marks/new' : '/marks/new';
  };

  const getAssessmentPath = (id: string) => {
    return user.role === 'teacher' ? `/teacher/marks/${id}` : `/marks/${id}`;
  };

  return (
    <Layout schoolName={'SMS'} principalName={"User"} onLogout={logout} role={user.role}>
      <div style={{ padding: '32px' }}>
        <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ fontSize: '28px', fontWeight: 600, color: '#0f172a', marginBottom: '8px' }}>
              Marks & Assessments
            </h1>
            <p style={{ fontSize: '14px', color: '#64748b' }}>
              {user.role === 'principal' 
                ? 'View assessments and marks (Read-only)' 
                : 'Manage assessments and student marks'}
            </p>
          </div>
          {/* Only teachers can create assessments */}
          {user.role === 'teacher' && (
            <Button onClick={() => navigate(getNewAssessmentPath())}>
              <Plus size={16} style={{ marginRight: '8px' }} />
              New Assessment
            </Button>
          )}
        </div>

        <Card>
          <div style={{ padding: '24px' }}>
            {isLoading && <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>{[1, 2, 3].map((i) => <Skeleton key={i} height="80px" />)}</div>}
            {error && !isLoading && <ErrorState message={error} onRetry={loadAssessments} />}
            {!isLoading && !error && assessments.length === 0 && (
              <div style={{ textAlign: 'center', padding: '48px 24px' }}>
                <BarChart3 size={48} style={{ color: '#cbd5e1', marginBottom: '16px' }} />
                <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#0f172a', marginBottom: '8px' }}>No assessments</h3>
                <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '24px' }}>
                  {user.role === 'principal' 
                    ? 'No assessments have been created yet' 
                    : 'Start by creating your first assessment'}
                </p>
                {user.role === 'teacher' && (
                  <Button onClick={() => navigate(getNewAssessmentPath())}>Create Assessment</Button>
                )}
              </div>
            )}
            {!isLoading && !error && assessments.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {assessments.map((assessment) => (
                  <div
                    key={assessment.id}
                    style={{ padding: '16px', border: '1px solid #e2e8f0', borderRadius: '8px', cursor: 'pointer' }}
                    onClick={() => navigate(getAssessmentPath(assessment.id))}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                      <div>
                        <div style={{ fontWeight: 600, color: '#0f172a', marginBottom: '4px' }}>{assessment.name}</div>
                        <div style={{ fontSize: '14px', color: '#64748b' }}>
                          {assessment.classroom_name} - {assessment.subject_name}
                        </div>
                        <div style={{ fontSize: '14px', color: '#64748b' }}>
                          Max Marks: {assessment.max_marks}
                        </div>
                      </div>
                      <span style={{
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '12px',
                        fontWeight: 500,
                        background: assessment.status === 'published' ? '#dcfce7' : assessment.status === 'locked' ? '#f1f5f9' : '#fef3c7',
                        color: assessment.status === 'published' ? '#166534' : assessment.status === 'locked' ? '#64748b' : '#92400e',
                      }}>
                        {assessment.status}
                      </span>
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





