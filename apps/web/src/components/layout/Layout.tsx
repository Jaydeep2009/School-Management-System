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
  currentAcademicYear?: string;
  academicYearStatus?: 'upcoming' | 'current' | 'closed';
  onLogout: () => void;
}

export function Layout({
  children,
  schoolName,
  principalName,
  currentAcademicYear,
  academicYearStatus,
  onLogout,
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
      />
      <div className={`layout-main ${isSidebarCollapsed ? 'layout-main-expanded' : ''}`}>
        <Header
          schoolName={schoolName}
          currentAcademicYear={currentAcademicYear}
          academicYearStatus={academicYearStatus}
          onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        />
        <main className="layout-content">
          {children}
        </main>
      </div>
    </div>
  );
}
