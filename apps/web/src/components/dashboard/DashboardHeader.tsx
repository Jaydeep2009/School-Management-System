/**
 * Dashboard Header Component
 */

import { formatDate } from '../../lib/utils';
import './DashboardHeader.css';

interface DashboardHeaderProps {
  principalName: string;
  currentDate?: Date;
  currentAcademicYear?: string;
}

export function DashboardHeader({ 
  principalName, 
  currentDate = new Date(),
  currentAcademicYear 
}: DashboardHeaderProps) {
  const greeting = () => {
    const hour = currentDate.getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  return (
    <div className="dashboard-header">
      <div className="dashboard-header-greeting">
        <h1 className="dashboard-header-title">
          {greeting()}, {principalName}
        </h1>
        <p className="dashboard-header-subtitle">
          {formatDate(currentDate)}
          {currentAcademicYear && ` • Academic Year: ${currentAcademicYear}`}
        </p>
      </div>
    </div>
  );
}
