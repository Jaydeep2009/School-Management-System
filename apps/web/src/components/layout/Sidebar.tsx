/**
 * Sidebar Component
 */

import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  BookOpen,
  ClipboardCheck,
  BarChart3,
  FileText,
  DollarSign,
  Calendar,
  TrendingUp,
  CalendarDays,
  Cake,
  Upload,
  FileSpreadsheet,
  LogOut,
} from 'lucide-react';
import { Avatar } from '../ui/Avatar';
import './Sidebar.css';

interface SidebarProps {
  schoolName: string;
  principalName: string;
  onLogout: () => void;
  isCollapsed?: boolean;
}

export function Sidebar({ schoolName, principalName, onLogout, isCollapsed }: SidebarProps) {
  const navigationItems = [
    { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/students', icon: Users, label: 'Students' },
    { path: '/teachers', icon: GraduationCap, label: 'Teachers' },
    { path: '/academic-structure', icon: BookOpen, label: 'Academic Structure' },
    { path: '/attendance', icon: ClipboardCheck, label: 'Attendance' },
    { path: '/marks', icon: BarChart3, label: 'Marks & Assessments' },
    { path: '/assignments', icon: FileText, label: 'Assignments' },
    { path: '/fees', icon: DollarSign, label: 'Fees' },
    { path: '/timetable', icon: Calendar, label: 'Timetable' },
    { path: '/promotions', icon: TrendingUp, label: 'Promotions' },
    { path: '/academic-years', icon: CalendarDays, label: 'Academic Years' },
    { path: '/birthdays', icon: Cake, label: 'Birthdays' },
    { path: '/imports', icon: Upload, label: 'Imports' },
    { path: '/audit-logs', icon: FileSpreadsheet, label: 'Audit Logs' },
  ];

  return (
    <aside className={`sidebar ${isCollapsed ? 'sidebar-collapsed' : ''}`}>
      <div className="sidebar-header">
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">SMS</div>
          {!isCollapsed && <span className="sidebar-logo-text">SMS</span>}
        </div>
        {!isCollapsed && schoolName && (
          <div className="sidebar-school-name">{schoolName}</div>
        )}
      </div>

      <nav className="sidebar-nav">
        {navigationItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `sidebar-nav-item ${isActive ? 'sidebar-nav-item-active' : ''}`
              }
              title={isCollapsed ? item.label : undefined}
            >
              <Icon size={20} />
              {!isCollapsed && <span>{item.label}</span>}
            </NavLink>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-user">
          <Avatar name={principalName} size="medium" />
          {!isCollapsed && (
            <div className="sidebar-user-info">
              <div className="sidebar-user-name">{principalName}</div>
              <div className="sidebar-user-role">Principal</div>
            </div>
          )}
        </div>
        <button
          className="sidebar-logout"
          onClick={onLogout}
          title={isCollapsed ? 'Logout' : undefined}
        >
          <LogOut size={20} />
          {!isCollapsed && <span>Logout</span>}
        </button>
      </div>
    </aside>
  );
}
