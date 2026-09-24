/**
 * Create School Page
 */

import { useNavigate } from 'react-router-dom';
import { SuperAdminLayout } from '../components/layout/SuperAdminLayout';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { SchoolForm } from '../components/school/SchoolForm';
import { apiService } from '../services/api';

export function CreateSchool() {
  const navigate = useNavigate();

  const handleSubmit = async (data: any) => {
    const response = await apiService.createSchool(data);
    // Navigate to the newly created school details page
    navigate(`/super-admin/schools/${response.data.id}`);
  };

  const handleCancel = () => {
    navigate('/super-admin/schools');
  };

  return (
    <SuperAdminLayout>
      <div style={{ padding: '32px', maxWidth: '800px' }}>
        {/* Header */}
        <div style={{ marginBottom: '24px' }}>
          <Button
            variant="secondary"
            size="small"
            onClick={() => navigate('/super-admin/schools')}
            style={{ marginBottom: '16px' }}
          >
            ← Back to Schools
          </Button>
          <h1 style={{ fontSize: '28px', fontWeight: 600, color: '#0f172a', marginBottom: '8px' }}>
            Create School
          </h1>
          <p style={{ fontSize: '14px', color: '#64748b' }}>
            Add a new school to the platform
          </p>
        </div>

        {/* Form Card */}
        <Card>
          <div style={{ padding: '24px' }}>
            <SchoolForm onSubmit={handleSubmit} onCancel={handleCancel} />
          </div>
        </Card>
      </div>
    </SuperAdminLayout>
  );
}





