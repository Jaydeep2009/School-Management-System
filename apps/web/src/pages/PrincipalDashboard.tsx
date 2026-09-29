/**
 * user Dashboard Page
 */

import { Users, GraduationCap, BookOpen, FileText } from 'lucide-react';
import { Layout } from '../components/layout/Layout';
import { DashboardHeader } from '../components/dashboard/DashboardHeader';
import { StatCard } from '../components/dashboard/StatCard';
import { AttendanceOverview } from '../components/dashboard/AttendanceOverview';
import { AssessmentProgress } from '../components/dashboard/AssessmentProgress';
import { FeesOverview } from '../components/dashboard/FeesOverview';
import { QuickActions } from '../components/dashboard/QuickActions';
import { RecentActivity } from '../components/dashboard/RecentActivity';
import { BirthdayList } from '../components/dashboard/BirthdayList';
import { AcademicYearCard } from '../components/dashboard/AcademicYearCard';
import { useAuth } from '../hooks/useAuth';
import { useDashboard } from '../hooks/useDashboard';
import { useAcademicYear } from '../contexts/AcademicYearContext';
import './PrincipalDashboard.css';

export function PrincipalDashboard() {
  const { user, logout } = useAuth();
  const { selectedYear } = useAcademicYear();
  const { data, isLoading, error, retry } = useDashboard(
    user?.schoolId || '',
    selectedYear?.id || ''
  );

  if (!user) {
    return null;
  }

  return (
    <Layout
      schoolName={'SMS'}
      principalName={"User"}
      onLogout={logout}
    >
      <DashboardHeader
        principalName={"User"}
        currentAcademicYear={data?.currentAcademicYear?.label}
      />

      <div className="dashboard-grid">
        {/* KPI Cards */}
        <div className="dashboard-stats">
          <StatCard
            title="Total Students"
            value={data?.stats.totalStudents || 0}
            icon={Users}
            color="#2563eb"
            loading={isLoading}
            error={error || undefined}
            onRetry={retry}
          />
          <StatCard
            title="Total Teachers"
            value={data?.stats.totalTeachers || 0}
            icon={GraduationCap}
            color="#7c3aed"
            loading={isLoading}
            error={error || undefined}
            onRetry={retry}
          />
          <StatCard
            title="Total Classes"
            value={data?.stats.totalClasses || 0}
            icon={BookOpen}
            color="#059669"
            loading={isLoading}
            error={error || undefined}
            onRetry={retry}
          />
          <StatCard
            title="Total Subjects"
            value={data?.stats.totalSubjects || 0}
            icon={FileText}
            color="#dc2626"
            loading={isLoading}
            error={error || undefined}
            onRetry={retry}
          />
        </div>

        {/* Main Content */}
        <div className="dashboard-main">
          <AttendanceOverview
            data={data?.attendance}
            loading={isLoading}
            error={error || undefined}
            onRetry={retry}
          />

          <FeesOverview
            data={data?.fees}
            loading={isLoading}
            error={error || undefined}
            onRetry={retry}
          />

          <AssessmentProgress
            assessments={data?.assessments}
            loading={isLoading}
            error={error || undefined}
            onRetry={retry}
          />

          <QuickActions />
        </div>

        {/* Sidebar */}
        <div className="dashboard-sidebar">
          <AcademicYearCard
            academicYear={data?.currentAcademicYear}
            loading={isLoading}
            error={error || undefined}
            onRetry={retry}
          />

          <BirthdayList
            birthdays={data?.birthdays}
            loading={isLoading}
            error={error || undefined}
            onRetry={retry}
          />

          <RecentActivity
            activities={data?.recentActivity}
            loading={isLoading}
            error={error || undefined}
            onRetry={retry}
          />
        </div>
      </div>
    </Layout>
  );
}





