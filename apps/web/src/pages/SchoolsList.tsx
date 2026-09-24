/**
 * Schools List Page
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SuperAdminLayout } from '../components/layout/SuperAdminLayout';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Skeleton } from '../components/ui/Skeleton';
import { ErrorState } from '../components/ui/ErrorState';
import { EmptyState } from '../components/ui/EmptyState';
import { SchoolStatusBadge } from '../components/school/SchoolStatusBadge';
import { apiService } from '../services/api';
import type { School, SchoolStatus } from '../types/super-admin';

export function SchoolsList() {
  const navigate = useNavigate();
  const [schools, setSchools] = useState<School[]>([]);
  const [filteredSchools, setFilteredSchools] = useState<School[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<SchoolStatus | 'all'>('all');

  useEffect(() => {
    loadSchools();
  }, []);

  useEffect(() => {
    // Apply filters
    let filtered = schools;

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter((school) => school.status === statusFilter);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (school) =>
          school.name.toLowerCase().includes(query) ||
          school.code.toLowerCase().includes(query) ||
          school.email?.toLowerCase().includes(query)
      );
    }

    setFilteredSchools(filtered);
  }, [schools, searchQuery, statusFilter]);

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

  const handleSchoolClick = (schoolId: string) => {
    navigate(`/super-admin/schools/${schoolId}`);
  };

  return (
    <SuperAdminLayout>
      <div style={{ padding: '32px' }}>
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '24px',
          }}
        >
          <div>
            <h1 style={{ fontSize: '28px', fontWeight: 600, color: '#0f172a', marginBottom: '8px' }}>
              Schools
            </h1>
            <p style={{ fontSize: '14px', color: '#64748b' }}>
              Manage all schools on the platform
            </p>
          </div>
          <Button onClick={() => navigate('/super-admin/schools/new')}>Create School</Button>
        </div>

        {/* Filters */}
        <Card>
          <div style={{ padding: '20px' }}>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                gap: '16px',
              }}
            >
              {/* Search */}
              <div>
                <label
                  htmlFor="search"
                  style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: 500,
                    color: '#0f172a',
                    marginBottom: '8px',
                  }}
                >
                  Search
                </label>
                <input
                  id="search"
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by name, code, or email..."
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    fontSize: '14px',
                    border: '1px solid #e2e8f0',
                    borderRadius: '6px',
                    outline: 'none',
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = '#2563eb';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = '#e2e8f0';
                  }}
                />
              </div>

              {/* Status Filter */}
              <div>
                <label
                  htmlFor="status"
                  style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: 500,
                    color: '#0f172a',
                    marginBottom: '8px',
                  }}
                >
                  Status
                </label>
                <select
                  id="status"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as SchoolStatus | 'all')}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    fontSize: '14px',
                    border: '1px solid #e2e8f0',
                    borderRadius: '6px',
                    outline: 'none',
                    background: 'white',
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = '#2563eb';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = '#e2e8f0';
                  }}
                >
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="suspended">Suspended</option>
                  <option value="archived">Archived</option>
                </select>
              </div>
            </div>

            {/* Results Count */}
            <div style={{ marginTop: '16px', fontSize: '14px', color: '#64748b' }}>
              {filteredSchools.length} {filteredSchools.length === 1 ? 'school' : 'schools'}{' '}
              {(searchQuery || statusFilter !== 'all') && `(filtered from ${schools.length} total)`}
            </div>
          </div>
        </Card>

        {/* Schools List */}
        <div style={{ marginTop: '24px' }}>
          {isLoading ? (
            <Card>
              <div style={{ padding: '20px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Skeleton key={i} height="80px" />
                  ))}
                </div>
              </div>
            </Card>
          ) : error ? (
            <Card>
              <div style={{ padding: '20px' }}>
                <ErrorState message={error} onRetry={loadSchools} />
              </div>
            </Card>
          ) : filteredSchools.length === 0 ? (
            <Card>
              <div style={{ padding: '40px 20px' }}>
                <EmptyState
                  title={
                    searchQuery || statusFilter !== 'all'
                      ? 'No schools found'
                      : 'No schools yet'
                  }
                  description={
                    searchQuery || statusFilter !== 'all'
                      ? 'Try adjusting your filters'
                      : 'Create your first school to get started'
                  }
                  action={
                    searchQuery || statusFilter !== 'all' ? (
                      <Button
                        variant="secondary"
                        onClick={() => {
                          setSearchQuery('');
                          setStatusFilter('all');
                        }}
                      >
                        Clear Filters
                      </Button>
                    ) : (
                      <Button onClick={() => navigate('/super-admin/schools/new')}>
                        Create School
                      </Button>
                    )
                  }
                />
              </div>
            </Card>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {filteredSchools.map((school) => (
                <Card key={school.id}>
                  <div
                    style={{
                      padding: '20px',
                      cursor: 'pointer',
                      transition: 'background 0.2s',
                    }}
                    onClick={() => handleSchoolClick(school.id)}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#f8fafc';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'transparent';
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <div style={{ flex: 1 }}>
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            marginBottom: '8px',
                          }}
                        >
                          <h3 style={{ fontSize: '18px', fontWeight: 500, color: '#0f172a' }}>
                            {school.name}
                          </h3>
                          <SchoolStatusBadge status={school.status} />
                        </div>
                        <div
                          style={{
                            display: 'flex',
                            flexWrap: 'wrap',
                            gap: '16px',
                            fontSize: '14px',
                            color: '#64748b',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <svg
                              width="16"
                              height="16"
                              viewBox="0 0 16 16"
                              fill="none"
                              xmlns="http://www.w3.org/2000/svg"
                            >
                              <path
                                d="M8 8C9.65685 8 11 6.65685 11 5C11 3.34315 9.65685 2 8 2C6.34315 2 5 3.34315 5 5C5 6.65685 6.34315 8 8 8Z"
                                stroke="currentColor"
                                strokeWidth="1.5"
                              />
                              <path
                                d="M3 14C3 11.7909 5.23858 10 8 10C10.7614 10 13 11.7909 13 14"
                                stroke="currentColor"
                                strokeWidth="1.5"
                                strokeLinecap="round"
                              />
                            </svg>
                            <span>Code: {school.code}</span>
                          </div>
                          {school.email && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <svg
                                width="16"
                                height="16"
                                viewBox="0 0 16 16"
                                fill="none"
                                xmlns="http://www.w3.org/2000/svg"
                              >
                                <path
                                  d="M2 4L8 8L14 4"
                                  stroke="currentColor"
                                  strokeWidth="1.5"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                                <rect
                                  x="2"
                                  y="4"
                                  width="12"
                                  height="9"
                                  rx="2"
                                  stroke="currentColor"
                                  strokeWidth="1.5"
                                />
                              </svg>
                              <span>{school.email}</span>
                            </div>
                          )}
                          {school.phone && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <svg
                                width="16"
                                height="16"
                                viewBox="0 0 16 16"
                                fill="none"
                                xmlns="http://www.w3.org/2000/svg"
                              >
                                <path
                                  d="M4 3L6 1L7 4L5.5 5.5C6.5 7.5 8.5 9.5 10.5 10.5L12 9L15 10L13 12C11 14 6 11 3 8C0 5 -3 1 3 1"
                                  stroke="currentColor"
                                  strokeWidth="1.5"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                              </svg>
                              <span>{school.phone}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                        }}
                      >
                        <Button
                          variant="secondary"
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/super-admin/schools/${school.id}/edit`);
                          }}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="secondary"
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/super-admin/schools/${school.id}`);
                          }}
                        >
                          View
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </SuperAdminLayout>
  );
}





