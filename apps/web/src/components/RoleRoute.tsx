/**
 * RoleRoute Component
 * 
 * Protects routes based on user role
 * Redirects unauthorized users to their appropriate dashboard
 */

import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Skeleton } from './ui/Skeleton';

type UserRole = 'principal' | 'teacher' | 'student';

interface RoleRouteProps {
  children: React.ReactNode;
  allowedRoles: UserRole | UserRole[];
}

/**
 * RoleRoute - Protects routes based on user role
 * 
 * @param children - The component to render if authorized
 * @param allowedRoles - Single role or array of roles that can access this route
 * 
 * @example
 * // Principal only
 * <RoleRoute allowedRoles="principal">
 *   <Teachers />
 * </RoleRoute>
 * 
 * // Principal or Teacher
 * <RoleRoute allowedRoles={['principal', 'teacher']}>
 *   <Attendance />
 * </RoleRoute>
 */
export function RoleRoute({ children, allowedRoles }: RoleRouteProps) {
  const { user, isLoading } = useAuth();

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div style={{ padding: '32px' }}>
        <Skeleton height="200px" />
      </div>
    );
  }

  // Not authenticated - redirect to login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Check if user's role is in allowed roles
  const rolesArray = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
  const isAuthorized = rolesArray.includes(user.role as UserRole);

  // Not authorized - redirect to user's appropriate dashboard
  if (!isAuthorized) {
    // Redirect to role-specific dashboard
    switch (user.role) {
      case 'principal':
        return <Navigate to="/dashboard" replace />;
      case 'teacher':
        return <Navigate to="/teacher/dashboard" replace />;
      case 'student':
        return <Navigate to="/student/dashboard" replace />;
      default:
        return <Navigate to="/login" replace />;
    }
  }

  // Authorized - render the protected component
  return <>{children}</>;
}
