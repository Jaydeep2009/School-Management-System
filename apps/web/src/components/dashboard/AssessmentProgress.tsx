/**
 * Assessment Progress Component
 */

import { Card } from '../ui/Card';
import { Skeleton } from '../ui/Skeleton';
import { EmptyState } from '../ui/EmptyState';
import { ErrorState } from '../ui/ErrorState';
import { BarChart3 } from 'lucide-react';
import './AssessmentProgress.css';

interface AssessmentItem {
  id: string;
  name: string;
  completed: number;
  total: number;
}

interface AssessmentProgressProps {
  assessments?: AssessmentItem[];
  loading?: boolean;
  error?: string;
  onRetry?: () => void;
}

export function AssessmentProgress({ 
  assessments, 
  loading, 
  error, 
  onRetry 
}: AssessmentProgressProps) {
  if (loading) {
    return (
      <Card title="Assessment Progress">
        <div style={{ padding: '24px' }}>
          <Skeleton height={24} style={{ marginBottom: '12px' }} />
          <Skeleton height={24} style={{ marginBottom: '12px' }} />
          <Skeleton height={24} />
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card title="Assessment Progress">
        <ErrorState message={error} onRetry={onRetry} />
      </Card>
    );
  }

  if (!assessments || assessments.length === 0) {
    return (
      <Card title="Assessment Progress">
        <EmptyState
          icon={<BarChart3 size={32} />}
          title="No assessments"
          description="No published assessments available"
        />
      </Card>
    );
  }

  return (
    <Card title="Assessment Progress">
      <div className="assessment-progress">
        {assessments.map((assessment) => {
          const percentage = assessment.total > 0 
            ? (assessment.completed / assessment.total) * 100 
            : 0;

          return (
            <div key={assessment.id} className="assessment-progress-item">
              <div className="assessment-progress-header">
                <span className="assessment-progress-name">{assessment.name}</span>
                <span className="assessment-progress-stats">
                  {assessment.completed}/{assessment.total}
                </span>
              </div>
              <div className="assessment-progress-bar">
                <div 
                  className="assessment-progress-fill"
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
