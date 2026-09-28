/**
 * Teachers Management Page
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../components/layout/Layout';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Skeleton } from '../components/ui/Skeleton';
import { ErrorState } from '../components/ui/ErrorState';
import { useAuth } from '../hooks/useAuth';
import { useAcademicYear } from '../contexts/AcademicYearContext';
import { apiService } from '../services/api';
import type { Teacher } from '../types/entities';
import { GraduationCap, Search, Plus } from 'lucide-react';

export function Teachers() {
  const { user, logout } = useAuth();
  const { selectedYear } = useAcademicYear();
  const navigate = useNavigate();
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  useEffect(() => {
    loadTeachers();
  }, [statusFilter, selectedYear?.id]);

  const loadTeachers = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const filters: Record<string, string> = {};
      if (statusFilter !== 'all') {
        filters.status = statusFilter;
      }
      const response = await apiService.getTeachers(filters);
      setTeachers(response.data || response);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load teachers');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredTeachers = teachers.filter((teacher) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      teacher.full_name?.toLowerCase().includes(query) ||
      teacher.login_id?.toLowerCase().includes(query) ||
      teacher.employee_code?.toLowerCase().includes(query) ||
      teacher.phone?.toLowerCase().includes(query)
    );
  });

  if (!user) return null;

  return (
    <Layout
      schoolName={'SMS'}
      principalName={"User"}
      onLogout={logout}
    >
      <div style={{ padding: '32px' }}>
        <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ fontSize: '28px', fontWeight: 600, color: '#0f172a', marginBottom: '8px' }}>
              Teachers
            </h1>
            <p style={{ fontSize: '14px', color: '#64748b' }}>
              Manage teacher accounts and profiles
            </p>
          </div>
          <Button onClick={() => navigate('/teachers/new')}>
            <Plus size={16} style={{ marginRight: '8px' }} />
            Add Teacher
          </Button>
        </div>

        <Card>
          <div style={{ padding: '24px' }}>
            {/* Filters */}
            <div style={{ marginBottom: '24px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: '300px', position: 'relative' }}>
                <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
                <input
                  type="text"
                  placeholder="Search by name, login ID, employee code, or phone..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px 8px 40px',
                    fontSize: '14px',
                    border: '1px solid #e2e8f0',
                    borderRadius: '6px',
                    outline: 'none',
                  }}
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'inactive')}
                style={{
                  padding: '8px 12px',
                  fontSize: '14px',
                  border: '1px solid #e2e8f0',
                  borderRadius: '6px',
                  outline: 'none',
                  background: 'white',
                }}
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>

            {isLoading && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} height="80px" />
                ))}
              </div>
            )}

            {error && !isLoading && (
              <ErrorState message={error} onRetry={loadTeachers} />
            )}

            {!isLoading && !error && filteredTeachers.length === 0 && (
              <div style={{ textAlign: 'center', padding: '48px 24px' }}>
                <GraduationCap size={48} style={{ color: '#cbd5e1', marginBottom: '16px' }} />
                <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#0f172a', marginBottom: '8px' }}>
                  No teachers found
                </h3>
                <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '24px' }}>
                  {searchQuery ? 'Try adjusting your search criteria' : 'Get started by adding your first teacher'}
                </p>
                {!searchQuery && (
                  <Button onClick={() => navigate('/teachers/new')}>
                    Add Teacher
                  </Button>
                )}
              </div>
            )}

            {!isLoading && !error && filteredTeachers.length > 0 && (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>
                        Name
                      </th>
                      <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>
                        Employee Code
                      </th>
                      <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>
                        Login ID
                      </th>
                      <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>
                        Phone
                      </th>
                      <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>
                        Status
                      </th>
                      <th style={{ padding: '12px', textAlign: 'right', fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTeachers.map((teacher) => (
                      <tr
                        key={teacher.id}
                        style={{ borderBottom: '1px solid #f1f5f9', cursor: 'pointer' }}
                        onClick={() => navigate(`/teachers/${teacher.id}`)}
                      >
                        <td style={{ padding: '16px' }}>
                          <div style={{ fontWeight: 500, color: '#0f172a' }}>{teacher.full_name || 'â€”'}</div>
                        </td>
                        <td style={{ padding: '16px', fontFamily: 'monospace', fontSize: '13px', color: '#64748b' }}>
                          {teacher.employee_code || 'â€”'}
                        </td>
                        <td style={{ padding: '16px', fontFamily: 'monospace', fontSize: '13px', color: '#64748b' }}>
                          {teacher.login_id || 'â€”'}
                        </td>
                        <td style={{ padding: '16px', color: '#64748b' }}>
                          {teacher.phone || 'â€”'}
                        </td>
                        <td style={{ padding: '16px' }}>
                          <span style={{
                            padding: '4px 8px',
                            borderRadius: '4px',
                            fontSize: '12px',
                            fontWeight: 500,
                            background: teacher.status === 'active' ? '#dcfce7' : '#f1f5f9',
                            color: teacher.status === 'active' ? '#166534' : '#64748b',
                          }}>
                            {teacher.status}
                          </span>
                        </td>
                        <td style={{ padding: '16px', textAlign: 'right' }}>
                          <Button
                            variant="secondary"
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/teachers/${teacher.id}`);
                            }}
                          >
                            View
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {!isLoading && !error && filteredTeachers.length > 0 && (
              <div style={{ marginTop: '16px', padding: '12px 0', borderTop: '1px solid #f1f5f9', fontSize: '14px', color: '#64748b' }}>
                Showing {filteredTeachers.length} of {teachers.length} teachers
              </div>
            )}
          </div>
        </Card>
      </div>
    </Layout>
  );
}






