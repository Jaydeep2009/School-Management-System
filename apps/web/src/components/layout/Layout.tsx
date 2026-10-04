/**
 * Main Layout Component
 */

import { ReactNode, useState } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { useIsClassTeacher } from '../../hooks/useIsClassTeacher';
import './Layout.css';

interface LayoutProps {
  children: ReactNode;
  schoolName: string;
  principalName: string;
  onLogout: () => void;
  role?: 'principal' | 'teacher' | 'student';
  isClassTeacher?: boolean;
}

export function Layout({
  children,
  schoolName,
  principalName,
  onLogout,
  role = 'principal',
  isClassTeacher: isClassTeacherProp = false,
}: LayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const isSidebarCollapsed = false;
  
  // Auto-detect class teacher status for teachers ONLY
  // Don't call hook for principals or students to avoid unnecessary API calls
  const hookResult = role === 'teacher' ? useIsClassTeacher() : { isClassTeacher: false, isLoading: false, error: null };
  const { isClassTeacher: isClassTeacherFromHook, isLoading, error } = hookResult;
  
  // Use prop if explicitly provided, otherwise use hook result (for teachers only)
  const isClassTeacher = role === 'teacher' && isClassTeacherFromHook ? true : isClassTeacherProp;

  return (
    <div className="layout">
      <Sidebar
        schoolName={schoolName}
        principalName={principalName}
        onLogout={onLogout}
        isCollapsed={isSidebarCollapsed}
        role={role}
        isClassTeacher={isClassTeacher}
        isLoadingClassTeacher={role === 'teacher' && isLoading}
        classTeacherError={role === 'teacher' ? error : null}
      />
      <div className={`layout-main ${isSidebarCollapsed ? 'layout-main-expanded' : ''}`}>
        <Header
          schoolName={schoolName}
          onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        />
        <main className="layout-content">
          {children}
        </main>
      </div>
    </div>
  );
}
