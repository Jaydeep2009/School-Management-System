/**
 * Header Component
 */

import { Menu, Search, Calendar, RefreshCw } from 'lucide-react';
import { Badge } from '../ui/Badge';
import { useAcademicYear } from '../../contexts/AcademicYearContext';
import { NotificationBell } from '../notifications/NotificationBell';
import './Header.css';

interface HeaderProps {
  schoolName: string;
  currentAcademicYear?: string;
  academicYearStatus?: 'upcoming' | 'current' | 'closed';
  onToggleSidebar?: () => void;
}

export function Header({ 
  schoolName, 
  onToggleSidebar 
}: HeaderProps) {
  const { selectedYear, currentYear, allYears, setSelectedYear, resetToCurrentYear, isLoading } = useAcademicYear();

  const isViewingHistorical = selectedYear?.id !== currentYear?.id;

  return (
    <header className="header">
      <div className="header-left">
        {onToggleSidebar && (
          <button 
            className="header-menu-button" 
            onClick={onToggleSidebar}
            aria-label="Toggle sidebar"
          >
            <Menu size={24} />
          </button>
        )}
        <div className="header-search">
          <Search size={18} className="header-search-icon" />
          <input
            type="text"
            placeholder="Search students, teachers, classes..."
            className="header-search-input"
            disabled
            title="Global search will be available soon"
          />
        </div>
      </div>

      <div className="header-right">
        {/* Notification Bell */}
        <NotificationBell />

        {/* Academic Year Selector - Always visible */}
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '8px',
          marginRight: '16px',
          padding: '6px 12px',
          background: isViewingHistorical ? '#fef3c7' : '#f8fafc',
          borderRadius: '8px',
          border: `1px solid ${isViewingHistorical ? '#fbbf24' : '#e2e8f0'}`
        }}>
          <Calendar size={16} style={{ color: isViewingHistorical ? '#92400e' : '#64748b' }} />
          
          {isLoading ? (
            <div style={{ 
              fontSize: '14px', 
              color: '#64748b',
              fontWeight: 500 
            }}>
              Loading...
            </div>
          ) : allYears.length === 0 ? (
            <div style={{ 
              fontSize: '14px', 
              color: '#dc2626',
              fontWeight: 500 
            }}>
              No academic years
            </div>
          ) : (
            <>
              <select
                value={selectedYear?.id || ''}
                onChange={(e) => {
                  const year = allYears.find(y => y.id === e.target.value);
                  if (year) setSelectedYear(year);
                }}
                style={{
                  border: 'none',
                  background: 'transparent',
                  fontSize: '14px',
                  fontWeight: 500,
                  color: '#0f172a',
                  cursor: 'pointer',
                  outline: 'none',
                  minWidth: '120px',
                }}
              >
                {allYears.map(year => (
                  <option key={year.id} value={year.id}>
                    {year.label}
                  </option>
                ))}
              </select>
              
              {selectedYear && (
                <Badge 
                  variant={
                    (selectedYear.status === 'active' || selectedYear.status === 'current') ? 'success' : 
                    (selectedYear.status === 'draft' || selectedYear.status === 'upcoming') ? 'warning' : 'default'
                  }
                >
                  {selectedYear.status === 'active' || selectedYear.status === 'current' ? 'Current' : 
                   selectedYear.status === 'draft' || selectedYear.status === 'upcoming' ? 'Upcoming' : 'Closed'}
                </Badge>
              )}

              {/* Show reset button if viewing historical year */}
              {isViewingHistorical && currentYear && (
                <button
                  onClick={resetToCurrentYear}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    color: '#92400e',
                  }}
                  title="Return to current year"
                >
                  <RefreshCw size={14} />
                </button>
              )}
            </>
          )}
        </div>

        <div className="header-school-info">
          <div className="header-school-name">{schoolName}</div>
        </div>
      </div>
    </header>
  );
}
