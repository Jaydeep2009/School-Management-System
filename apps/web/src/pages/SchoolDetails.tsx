/**
 * School Details Page
 */

import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { SuperAdminLayout } from '../components/layout/SuperAdminLayout';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Skeleton } from '../components/ui/Skeleton';
import { ErrorState } from '../components/ui/ErrorState';
import { SchoolStatusBadge } from '../components/school/SchoolStatusBadge';
import { ProvisionPrincipalDialog } from '../components/school/ProvisionPrincipalDialog';
import { ChangePrincipalDialog } from '../components/school/ChangePrincipalDialog';
import { PrincipalCredentialsDialog } from '../components/school/PrincipalCredentialsDialog';
import { DeleteSchoolDialog } from '../components/school/DeleteSchoolDialog';
import { apiService } from '../services/api';
import type { School, PrincipalCredentials } from '../types/super-admin';

export function SchoolDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [school, setSchool] = useState<School | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showProvisionDialog, setShowProvisionDialog] = useState(false);
  const [showChangeDialog, setShowChangeDialog] = useState(false);
  const [principalCredentials, setPrincipalCredentials] = useState<PrincipalCredentials | null>(
    null
  );
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

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

  const handleSuspend = async () => {
    if (!id || !school) return;

    if (
      !window.confirm(
        `Suspend ${school.name}?\n\nThis will prevent all users from this school from logging in.`
      )
    ) {
      return;
    }

    try {
      setActionLoading('suspend');
      await apiService.suspendSchool(id);
      await loadSchool();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to suspend school';
      alert(`Error: ${message}`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleActivate = async () => {
    if (!id || !school) return;

    if (!window.confirm(`Activate ${school.name}?\n\nThis will restore access for school users.`)) {
      return;
    }

    try {
      setActionLoading('activate');
      await apiService.activateSchool(id);
      await loadSchool();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to activate school';
      alert(`Error: ${message}`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleArchive = async () => {
    if (!id || !school) return;

    if (
      !window.confirm(
        `Archive ${school.name}?\n\nThis is a terminal state. The school will be permanently archived and cannot be restored. Historical data will be preserved.`
      )
    ) {
      return;
    }

    try {
      setActionLoading('archive');
      await apiService.archiveSchool(id);
      await loadSchool();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to archive school';
      alert(`Error: ${message}`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleProvisionSuccess = (credentials: PrincipalCredentials) => {
    setShowProvisionDialog(false);
    setPrincipalCredentials(credentials);
    loadSchool();
  };

  const handleDeleteConfirm = async (confirmSchoolName: string, confirmationCode: string) => {
    if (!id) return;

    await apiService.deleteSchool(id, confirmSchoolName, confirmationCode);
    alert(`School "${school?.name}" and all associated data has been permanently deleted.`);
    navigate('/super-admin/schools');
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (isLoading) {
    return (
      <SuperAdminLayout>
        <div style={{ padding: '32px' }}>
          <Skeleton height="40px" style={{ marginBottom: '24px', maxWidth: '400px' }} />
          <Card>
            <div style={{ padding: '24px' }}>
              <Skeleton height="200px" />
            </div>
          </Card>
        </div>
      </SuperAdminLayout>
    );
  }

  if (error || !school) {
    return (
      <SuperAdminLayout>
        <div style={{ padding: '32px' }}>
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
      <div style={{ padding: '32px' }}>
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
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                <h1 style={{ fontSize: '28px', fontWeight: 600, color: '#0f172a' }}>
                  {school.name}
                </h1>
                <SchoolStatusBadge status={school.status} />
              </div>
              <p style={{ fontSize: '14px', color: '#64748b' }}>School Code: {school.code}</p>
            </div>
            <Button onClick={() => navigate(`/super-admin/schools/${id}/edit`)}>Edit School</Button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
          {/* School Information */}
          <div>
            <Card>
              <div style={{ padding: '24px' }}>
                <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#0f172a', marginBottom: '20px' }}>
                  School Information
                </h2>
                <div style={{ display: 'grid', gap: '16px' }}>
                  <div>
                    <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '4px' }}>
                      School Name
                    </p>
                    <p style={{ fontSize: '16px', color: '#0f172a' }}>{school.name}</p>
                  </div>
                  <div>
                    <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '4px' }}>
                      School Code
                    </p>
                    <p style={{ fontSize: '16px', color: '#0f172a', fontFamily: 'monospace' }}>
                      {school.code}
                    </p>
                  </div>
                  <div>
                    <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '4px' }}>
                      Timezone
                    </p>
                    <p style={{ fontSize: '16px', color: '#0f172a' }}>{school.timezone}</p>
                  </div>
                  {school.email && (
                    <div>
                      <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '4px' }}>
                        Email
                      </p>
                      <p style={{ fontSize: '16px', color: '#0f172a' }}>{school.email}</p>
                    </div>
                  )}
                  {school.phone && (
                    <div>
                      <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '4px' }}>
                        Phone
                      </p>
                      <p style={{ fontSize: '16px', color: '#0f172a' }}>{school.phone}</p>
                    </div>
                  )}
                  {school.address && (
                    <div>
                      <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '4px' }}>
                        Address
                      </p>
                      <p style={{ fontSize: '16px', color: '#0f172a' }}>{school.address}</p>
                    </div>
                  )}
                  <div>
                    <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '4px' }}>
                      Created
                    </p>
                    <p style={{ fontSize: '16px', color: '#0f172a' }}>
                      {formatDate(school.created_at)}
                    </p>
                  </div>
                  <div>
                    <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '4px' }}>
                      Last Updated
                    </p>
                    <p style={{ fontSize: '16px', color: '#0f172a' }}>
                      {formatDate(school.updated_at)}
                    </p>
                  </div>
                  {school.suspended_at && (
                    <div>
                      <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '4px' }}>
                        Suspended At
                      </p>
                      <p style={{ fontSize: '16px', color: '#0f172a' }}>
                        {formatDate(school.suspended_at)}
                      </p>
                    </div>
                  )}
                  {school.archived_at && (
                    <div>
                      <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '4px' }}>
                        Archived At
                      </p>
                      <p style={{ fontSize: '16px', color: '#0f172a' }}>
                        {formatDate(school.archived_at)}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          </div>

          {/* Actions Sidebar */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Principal Information */}
            <Card>
              <div style={{ padding: '20px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#0f172a', marginBottom: '12px' }}>
                  Principal
                </h3>
                {school.principal ? (
                  <>
                    <div style={{ display: 'grid', gap: '12px', marginBottom: '16px' }}>
                      <div>
                        <p style={{ fontSize: '12px', color: '#64748b', marginBottom: '2px' }}>
                          Login ID
                        </p>
                        <p style={{ fontSize: '14px', color: '#0f172a', fontFamily: 'monospace' }}>
                          {school.principal.login_id}
                        </p>
                      </div>
                      <div>
                        <p style={{ fontSize: '12px', color: '#64748b', marginBottom: '2px' }}>
                          Status
                        </p>
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '2px 8px',
                            fontSize: '12px',
                            borderRadius: '4px',
                            backgroundColor:
                              school.principal.status === 'active' ? '#dcfce7' : '#fee2e2',
                            color: school.principal.status === 'active' ? '#166534' : '#991b1b',
                          }}
                        >
                          {school.principal.status}
                        </span>
                      </div>
                      <div>
                        <p style={{ fontSize: '12px', color: '#64748b', marginBottom: '2px' }}>
                          Created
                        </p>
                        <p style={{ fontSize: '14px', color: '#0f172a' }}>
                          {formatDate(String(school.principal.created_at))}
                        </p>
                      </div>
                      {school.principal.last_login_at && (
                        <div>
                          <p style={{ fontSize: '12px', color: '#64748b', marginBottom: '2px' }}>
                            Last Login
                          </p>
                          <p style={{ fontSize: '14px', color: '#0f172a' }}>
                            {formatDate(String(school.principal.last_login_at))}
                          </p>
                        </div>
                      )}
                    </div>
                    <Button
                      variant="secondary"
                      fullWidth
                      onClick={() => setShowChangeDialog(true)}
                      disabled={school.status === 'archived'}
                    >
                      Change Principal
                    </Button>
                  </>
                ) : (
                  <>
                    <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '16px' }}>
                      No principal account found. Create one to enable school management.
                    </p>
                    <Button
                      fullWidth
                      onClick={() => setShowProvisionDialog(true)}
                      disabled={school.status === 'archived'}
                    >
                      Provision Principal
                    </Button>
                  </>
                )}
              </div>
            </Card>

            {/* user Provisioning */}
            <Card>
              <div style={{ padding: '20px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#0f172a', marginBottom: '12px' }}>
                  user
                </h3>
                <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '16px' }}>
                  Create a user account for this school
                </p>
                <Button
                  fullWidth
                  onClick={() => setShowProvisionDialog(true)}
                  disabled={school.status === 'archived'}
                >
                  Provision user
                </Button>
              </div>
            </Card>

            {/* Lifecycle Actions */}
            <Card>
              <div style={{ padding: '20px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#0f172a', marginBottom: '12px' }}>
                  School Status
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {school.status === 'active' && (
                    <>
                      <Button
                        variant="secondary"
                        fullWidth
                        onClick={handleSuspend}
                        disabled={!!actionLoading}
                      >
                        {actionLoading === 'suspend' ? 'Suspending...' : 'Suspend School'}
                      </Button>
                      <Button
                        variant="secondary"
                        fullWidth
                        onClick={handleArchive}
                        disabled={!!actionLoading}
                      >
                        {actionLoading === 'archive' ? 'Archiving...' : 'Archive School'}
                      </Button>
                    </>
                  )}
                  {school.status === 'suspended' && (
                    <>
                      <Button
                        variant="secondary"
                        fullWidth
                        onClick={handleActivate}
                        disabled={!!actionLoading}
                      >
                        {actionLoading === 'activate' ? 'Activating...' : 'Activate School'}
                      </Button>
                      <Button
                        variant="secondary"
                        fullWidth
                        onClick={handleArchive}
                        disabled={!!actionLoading}
                      >
                        {actionLoading === 'archive' ? 'Archiving...' : 'Archive School'}
                      </Button>
                    </>
                  )}
                  {school.status === 'archived' && (
                    <p style={{ fontSize: '14px', color: '#64748b', textAlign: 'center' }}>
                      School is archived. No further actions available.
                    </p>
                  )}
                </div>
              </div>
            </Card>

            {/* Danger Zone */}
            {school.status !== 'active' && (
              <Card>
                <div style={{ padding: '20px' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#dc2626', marginBottom: '12px' }}>
                    Danger Zone
                  </h3>
                  <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '16px' }}>
                    Permanently delete this school and all associated data. This action cannot be undone.
                  </p>
                  <Button
                    fullWidth
                    onClick={() => setShowDeleteDialog(true)}
                    style={{
                      background: '#dc2626',
                      color: '#ffffff',
                    }}
                  >
                    Delete School
                  </Button>
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Provision Principal Dialog */}
      {showProvisionDialog && (
        <ProvisionPrincipalDialog
          schoolId={id!}
          schoolName={school.name}
          onSuccess={handleProvisionSuccess}
          onCancel={() => setShowProvisionDialog(false)}
        />
      )}

      {/* Change Principal Dialog */}
      {showChangeDialog && school?.principal && (
        <ChangePrincipalDialog
          schoolId={id!}
          schoolName={school.name}
          currentPrincipalLogin={school.principal.login_id}
          open={showChangeDialog}
          onClose={() => setShowChangeDialog(false)}
          onSuccess={(credentials) => {
            setPrincipalCredentials(credentials);
            loadSchool(); // Reload school to show new principal
          }}
        />
      )}

      {/* Principal Credentials Dialog */}
      {principalCredentials && (
        <PrincipalCredentialsDialog
          credentials={principalCredentials}
          onClose={() => setPrincipalCredentials(null)}
        />
      )}

      {/* Delete School Dialog */}
      {showDeleteDialog && school && (
        <DeleteSchoolDialog
          schoolId={id!}
          schoolName={school.name}
          schoolCode={school.code}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setShowDeleteDialog(false)}
        />
      )}
    </SuperAdminLayout>
  );
}





