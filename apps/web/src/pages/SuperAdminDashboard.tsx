/**
 * Super Admin Dashboard Page
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SuperAdminLayout } from '../components/layout/SuperAdminLayout';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Skeleton } from '../components/ui/Skeleton';
import { ErrorState } from '../components/ui/ErrorState';
import { apiService } from '../services/api';
import type { School } from '../types/super-admin';

export function SuperAdminDashboard() {
  const navigate = useNavigate();
  const [schools, setSchools] = useState<School[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadSchools();
  }, []);

  const loadSchools = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await apiService.getSchools();
      setSchools(response.data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load schools';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  // Calculate statistics from actual school data
  const stats = {
    total: schools.length,
    active: schools.filter((s) => s.status === 'active').length,
    suspended: schools.filter((s) => s.status === 'suspended').length,
    archived: schools.filter((s) => s.status === 'archived').length,
  };

  // Get recent schools (last 5)
  const recentSchools = [...schools]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5);

  return (
    <SuperAdminLayout>
      <div style={{ padding: '32px' }}>
        {/* Header */}
        <div style={{ marginBottom: '32px' }}>
          <h1 style={{ fontSize: '28px', fontWeight: 600, color: '#0f172a', marginBottom: '8px' }}>
            Dashboard
          </h1>
          <p style={{ fontSize: '14px', color: '#64748b' }}>
            Platform administration and school management
          </p>
        </div>

        {/* Statistics Cards */}
        {isLoading ? (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: '24px',
              marginBottom: '32px',
            }}
          >
            {[1, 2, 3, 4].map((i) => (
              <Card key={i}>
                <Skeleton height="80px" />
              </Card>
            ))}
          </div>
        ) : error ? (
          <div style={{ marginBottom: '32px' }}>
            <ErrorState
              message={error}
              onRetry={loadSchools}
            />
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: '24px',
              marginBottom: '32px',
            }}
          >
            <Card>
              <div style={{ padding: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                  <div
                    style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '8px',
                      background: '#eff6ff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 20 20"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M3 9L10 3L17 9V17H13V13H7V17H3V9Z"
                        stroke="#2563eb"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                  <div>
                    <p style={{ fontSize: '14px', color: '#64748b' }}>Total Schools</p>
                    <p style={{ fontSize: '24px', fontWeight: 600, color: '#0f172a' }}>
                      {stats.total}
                    </p>
                  </div>
                </div>
              </div>
            </Card>

            <Card>
              <div style={{ padding: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                  <div
                    style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '8px',
                      background: '#f0fdf4',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 20 20"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <circle cx="10" cy="10" r="7" stroke="#16a34a" strokeWidth="1.5" />
                      <path
                        d="M7 10L9 12L13 8"
                        stroke="#16a34a"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                  <div>
                    <p style={{ fontSize: '14px', color: '#64748b' }}>Active</p>
                    <p style={{ fontSize: '24px', fontWeight: 600, color: '#0f172a' }}>
                      {stats.active}
                    </p>
                  </div>
                </div>
              </div>
            </Card>

            <Card>
              <div style={{ padding: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                  <div
                    style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '8px',
                      background: '#fef3c7',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 20 20"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <circle cx="10" cy="10" r="7" stroke="#d97706" strokeWidth="1.5" />
                      <path
                        d="M10 6V10"
                        stroke="#d97706"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                      />
                      <circle cx="10" cy="13" r="0.5" fill="#d97706" />
                    </svg>
                  </div>
                  <div>
                    <p style={{ fontSize: '14px', color: '#64748b' }}>Suspended</p>
                    <p style={{ fontSize: '24px', fontWeight: 600, color: '#0f172a' }}>
                      {stats.suspended}
                    </p>
                  </div>
                </div>
              </div>
            </Card>

            <Card>
              <div style={{ padding: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                  <div
                    style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '8px',
                      background: '#f1f5f9',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 20 20"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M3 6H17M8 6V4C8 3.44772 8.44772 3 9 3H11C11.5523 3 12 3.44772 12 4V6M5 6H15L14 16C14 16.5523 13.5523 17 13 17H7C6.44772 17 6 16.5523 6 16L5 6Z"
                        stroke="#64748b"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                  <div>
                    <p style={{ fontSize: '14px', color: '#64748b' }}>Archived</p>
                    <p style={{ fontSize: '24px', fontWeight: 600, color: '#0f172a' }}>
                      {stats.archived}
                    </p>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* Recent Schools */}
        <Card>
          <div style={{ padding: '24px' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '20px',
              }}
            >
              <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#0f172a' }}>
                Recent Schools
              </h2>
              <Button variant="secondary" size="small" onClick={() => navigate('/super-admin/schools')}>
                View All Schools
              </Button>
            </div>

            {isLoading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} height="60px" />
                ))}
              </div>
            ) : error ? (
              <ErrorState message={error} onRetry={loadSchools} />
            ) : recentSchools.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0' }}>
                <p style={{ color: '#64748b', marginBottom: '16px' }}>No schools found</p>
                <Button onClick={() => navigate('/super-admin/schools/new')}>Create School</Button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {recentSchools.map((school) => (
                  <div
                    key={school.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '16px',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                    onClick={() => navigate(`/super-admin/schools/${school.id}`)}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = '#cbd5e1';
                      e.currentTarget.style.background = '#f8fafc';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = '#e2e8f0';
                      e.currentTarget.style.background = 'transparent';
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '4px' }}>
                        <h3 style={{ fontSize: '16px', fontWeight: 500, color: '#0f172a' }}>
                          {school.name}
                        </h3>
                        <Badge
                          variant={
                            school.status === 'active'
                              ? 'success'
                              : school.status === 'suspended'
                              ? 'warning'
                              : 'default'
                          }
                        >
                          {school.status}
                        </Badge>
                      </div>
                      <p style={{ fontSize: '14px', color: '#64748b' }}>Code: {school.code}</p>
                    </div>
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 20 20"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M7 4L13 10L7 16"
                        stroke="#94a3b8"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>

        {/* Quick Actions */}
        <div style={{ marginTop: '32px' }}>
          <Card>
            <div style={{ padding: '24px' }}>
              <h2
                style={{ fontSize: '18px', fontWeight: 600, color: '#0f172a', marginBottom: '16px' }}
              >
                Quick Actions
              </h2>
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                <Button onClick={() => navigate('/super-admin/schools/new')}>
                  Create New School
                </Button>
                <Button variant="secondary" onClick={() => navigate('/super-admin/schools')}>
                  Manage Schools
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </SuperAdminLayout>
  );
}





