/**
 * Super Admin Protected Route Component
 * Redirects to Super Admin login if not authenticated as Super Admin
 * Redirects school users to their appropriate dashboard
 */

import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useSuperAdminAuth } from '../hooks/useSuperAdminAuth';

interface SuperAdminRouteProps {
  children: ReactNode;
}

export function SuperAdminRoute({ children }: SuperAdminRouteProps) {
  const { superAdmin, isLoading } = useSuperAdminAuth();

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          background: '#f8fafc',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '16px',
          }}
        >
          <div
            style={{
              width: '40px',
              height: '40px',
              border: '3px solid #f1f5f9',
              borderTopColor: '#2563eb',
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite',
            }}
          />
          <p style={{ color: '#64748b' }}>Loading...</p>
        </div>
      </div>
    );
  }

  // Check if user is a school user (has normal accessToken but not superAdmin)
  const hasSchoolToken = localStorage.getItem('accessToken');
  const isSuperAdmin = localStorage.getItem('isSuperAdmin') === 'true';

  if (hasSchoolToken && !isSuperAdmin) {
    // School user trying to access Super Admin route
    return <Navigate to="/dashboard" replace />;
  }

  // Redirect to Super Admin login if not authenticated
  if (!superAdmin) {
    return <Navigate to="/super-admin/login" replace />;
  }

  // Render protected content
  return <>{children}</>;
}
