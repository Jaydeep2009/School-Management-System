/**
 * Role-Based Dashboard Router
 * Routes users to appropriate dashboard based on their role
 */

import { useAuth } from '../hooks/useAuth';
import { PrincipalDashboard } from '../pages/PrincipalDashboard';
import { TeacherDashboard } from '../pages/TeacherDashboard';
import { StudentDashboard } from '../pages/StudentDashboard';
import { Skeleton } from './ui/Skeleton';

export function RoleBasedDashboard() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div style={{ padding: '32px' }}>
        <Skeleton height="200px" />
      </div>
    );
  }

  if (!user) return null;

  // Route based on role
  switch (user.role) {
    case 'principal':
      return <PrincipalDashboard />;
    case 'teacher':
      return <TeacherDashboard />;
    case 'student':
      return <StudentDashboard />;
    default:
      return (
        <div style={{ padding: '32px', textAlign: 'center' }}>
          <p>Unknown role: {user.role}</p>
        </div>
      );
  }
}
