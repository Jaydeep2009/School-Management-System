/**
 * Edit School Page
 */

import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { SuperAdminLayout } from '../components/layout/SuperAdminLayout';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Skeleton } from '../components/ui/Skeleton';
import { ErrorState } from '../components/ui/ErrorState';
import { SchoolForm } from '../components/school/SchoolForm';
import { apiService } from '../services/api';
import type { School } from '../types/super-admin';

export function EditSchool() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [school, setSchool] = useState<School | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      loadSchool();
    }
  }, [id]);

  const loadSchool = async () => {
    if (!id) return;

    try {
      setIsLoading(true);
      setError(null);
      const response = await apiService.getSchool(id);
      setSchool(response.data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load school';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (data: any) => {
    if (!id) return;
    
    // Remove code field as it's immutable
    const { code, ...updateData } = data;
    
    await apiService.updateSchool(id, updateData);
    // Navigate to the school details page
    navigate(`/super-admin/schools/${id}`);
  };

  const handleCancel = () => {
    if (id) {
      navigate(`/super-admin/schools/${id}`);
    } else {
      navigate('/super-admin/schools');
    }
  };

  if (isLoading) {
    return (
      <SuperAdminLayout>
        <div style={{ padding: '32px', maxWidth: '800px' }}>
          <Skeleton height="40px" style={{ marginBottom: '24px', maxWidth: '300px' }} />
          <Card>
            <div style={{ padding: '24px' }}>
              <Skeleton height="400px" />
            </div>
          </Card>
        </div>
      </SuperAdminLayout>
    );
  }

  if (error || !school) {
    return (
      <SuperAdminLayout>
        <div style={{ padding: '32px', maxWidth: '800px' }}>
          <Card>
            <div style={{ padding: '24px' }}>
              <ErrorState
                message={error || 'School not found'}
                onRetry={loadSchool}
              />
            </div>
          </Card>
        </div>
      </SuperAdminLayout>
    );
  }

  return (
    <SuperAdminLayout>
      <div style={{ padding: '32px', maxWidth: '800px' }}>
        {/* Header */}
        <div style={{ marginBottom: '24px' }}>
          <Button
            variant="secondary"
            size="small"
            onClick={() => navigate(`/super-admin/schools/${id}`)}
            style={{ marginBottom: '16px' }}
          >
            ← Back to School Details
          </Button>
          <h1 style={{ fontSize: '28px', fontWeight: 600, color: '#0f172a', marginBottom: '8px' }}>
            Edit School
          </h1>
          <p style={{ fontSize: '14px', color: '#64748b' }}>
            Update school information for {school.name}
          </p>
        </div>

        {/* Info Notice */}
        <div
          style={{
            padding: '12px',
            background: '#eff6ff',
            border: '1px solid #bfdbfe',
            borderRadius: '6px',
            marginBottom: '24px',
          }}
        >
          <div style={{ display: 'flex', gap: '8px' }}>
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              style={{ flexShrink: 0, marginTop: '2px' }}
            >
              <circle cx="8" cy="8" r="7" stroke="#2563eb" strokeWidth="1.5" />
              <path d="M8 4V8" stroke="#2563eb" strokeWidth="1.5" strokeLinecap="round" />
              <circle cx="8" cy="11" r="0.75" fill="#2563eb" />
            </svg>
            <p style={{ fontSize: '14px', color: '#1e40af' }}>
              School code cannot be changed after creation as it is used in user login IDs.
            </p>
          </div>
        </div>

        {/* Form Card */}
        <Card>
          <div style={{ padding: '24px' }}>
            <SchoolForm
              school={school}
              onSubmit={handleSubmit}
              onCancel={handleCancel}
              isEdit={true}
            />
          </div>
        </Card>
      </div>
    </SuperAdminLayout>
  );
}





