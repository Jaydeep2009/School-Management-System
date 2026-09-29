/**
 * Header Component
 */

import { Menu, Search, Calendar } from 'lucide-react';
import { Badge } from '../ui/Badge';
import { useAcademicYear } from '../../contexts/AcademicYearContext';
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
  const { selectedYear, allYears, setSelectedYear, isLoading } = useAcademicYear();

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
        {/* Academic Year Selector */}
        {!isLoading && allYears.length > 0 && (
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '8px',
            marginRight: '16px',
            padding: '6px 12px',
            background: '#f8fafc',
            borderRadius: '8px',
            border: '1px solid #e2e8f0'
          }}>
            <Calendar size={16} style={{ color: '#64748b' }} />
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
                  (selectedYear.status === 'active' || selectedYear.status === 'current') ? 'success' : 'default'
                }
              >
                {selectedYear.status === 'active' || selectedYear.status === 'current' ? 'Active' : 
                 selectedYear.status === 'draft' || selectedYear.status === 'upcoming' ? 'Upcoming' : 'Closed'}
              </Badge>
            )}
          </div>
        )}

        <div className="header-school-info">
          <div className="header-school-name">{schoolName}</div>
        </div>
      </div>
    </header>
  );
}
