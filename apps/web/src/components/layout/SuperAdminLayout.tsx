/**
 * Super Admin Layout Component
 * Layout wrapper for Super Admin pages with sidebar and header
 */

import { ReactNode } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useSuperAdminAuth } from '../../hooks/useSuperAdminAuth';
import './Layout.css';
import './Sidebar.css';

interface SuperAdminLayoutProps {
  children: ReactNode;
}

export function SuperAdminLayout({ children }: SuperAdminLayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout } = useSuperAdminAuth();

  const isActive = (path: string) => {
    if (path === '/super-admin' && location.pathname === '/super-admin') {
      return true;
    }
    if (path !== '/super-admin' && location.pathname.startsWith(path)) {
      return true;
    }
    return false;
  };

  const handleLogout = async () => {
    if (window.confirm('Are you sure you want to logout?')) {
      await logout();
    }
  };

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <svg
              width="32"
              height="32"
              viewBox="0 0 48 48"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <rect width="48" height="48" rx="8" fill="#2563eb" />
              <path
                d="M24 14L32 19V29L24 34L16 29V19L24 14Z"
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M24 24V34"
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M16 19L24 24L32 19"
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <div className="sidebar-title">
            <h2>SMS</h2>
            <span className="sidebar-subtitle">Super Admin</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          <button
            className={`sidebar-nav-item ${isActive('/super-admin') ? 'active' : ''}`}
            onClick={() => navigate('/super-admin')}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M3 10L10 3L17 10M5 8V17H8V13H12V17H15V8"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span>Dashboard</span>
          </button>

          <button
            className={`sidebar-nav-item ${isActive('/super-admin/schools') ? 'active' : ''}`}
            onClick={() => navigate('/super-admin/schools')}
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
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span>Schools</span>
          </button>
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-divider" />
          
          <button className="sidebar-nav-item" onClick={handleLogout}>
            <svg
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M13 3H16C16.5523 3 17 3.44772 17 4V16C17 16.5523 16.5523 17 16 17H13"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
              <path
                d="M7 13L3 10L7 7"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M3 10H13"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
            <span>Logout</span>
          </button>
        </div>
      </aside>

      <main className="layout-main">{children}</main>
    </div>
  );
}
