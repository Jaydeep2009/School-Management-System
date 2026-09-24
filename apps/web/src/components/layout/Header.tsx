/**
 * Header Component
 */

import { Menu, Search } from 'lucide-react';
import { Badge } from '../ui/Badge';
import './Header.css';

interface HeaderProps {
  schoolName: string;
  currentAcademicYear?: string;
  academicYearStatus?: 'upcoming' | 'current' | 'closed';
  onToggleSidebar?: () => void;
}

export function Header({ 
  schoolName, 
  currentAcademicYear, 
  academicYearStatus,
  onToggleSidebar 
}: HeaderProps) {
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
        <div className="header-school-info">
          <div className="header-school-name">{schoolName}</div>
          {currentAcademicYear && (
            <div className="header-academic-year">
              <span>{currentAcademicYear}</span>
              {academicYearStatus && (
                <Badge 
                  variant={academicYearStatus === 'current' ? 'success' : 'default'}
                >
                  {academicYearStatus === 'current' ? 'Active' : 
                   academicYearStatus === 'upcoming' ? 'Upcoming' : 'Closed'}
                </Badge>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
