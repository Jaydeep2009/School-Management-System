/**
 * Main Layout Component
 */

import { ReactNode, useState } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
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
  isClassTeacher = false,
}: LayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const isSidebarCollapsed = false;

  return (
    <div className="layout">
      <Sidebar
        schoolName={schoolName}
        principalName={principalName}
        onLogout={onLogout}
        isCollapsed={isSidebarCollapsed}
        role={role}
        isClassTeacher={isClassTeacher}
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
