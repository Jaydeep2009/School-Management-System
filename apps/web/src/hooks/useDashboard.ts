/**
 * Dashboard Data Hook
 * Aggregates data from multiple backend endpoints
 */

import { useState, useEffect } from 'react';
import { apiService } from '../services/api';
import type { DashboardData } from '../types/dashboard';

interface DashboardState {
  data: DashboardData | null;
  isLoading: boolean;
  error: string | null;
}

export function useDashboard(schoolId: string, academicYearId: string) {
  const [state, setState] = useState<DashboardState>({
    data: null,
    isLoading: true,
    error: null,
  });

  useEffect(() => {
    loadDashboardData();
  }, [schoolId, academicYearId]);

  const loadDashboardData = async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      // Fetch all dashboard data in parallel
      const [
        studentsResponse,
        teachersResponse,
        classroomsResponse,
        subjectsResponse,
        academicYearsResponse,
        birthdaysResponse,
        attendanceSessionsResponse,
        assessmentsResponse,
      ] = await Promise.allSettled([
        apiService.getStudents(),
        apiService.getTeachers(),
        apiService.getClassrooms(),
        apiService.getSubjects(),
        apiService.getAcademicYears(),
        apiService.getUpcomingBirthdays(),
        apiService.getAttendanceSessions({ academic_year_id: academicYearId }),
        apiService.getAssessments({ academic_year_id: academicYearId }),
      ]);

      // Extract successful responses and unwrap data property
      const students = studentsResponse.status === 'fulfilled' ? (studentsResponse.value.data || studentsResponse.value) : [];
      const teachers = teachersResponse.status === 'fulfilled' ? (teachersResponse.value.data || teachersResponse.value) : [];
      const classrooms = classroomsResponse.status === 'fulfilled' ? (classroomsResponse.value.data || classroomsResponse.value) : [];
      const subjects = subjectsResponse.status === 'fulfilled' ? (subjectsResponse.value.data || subjectsResponse.value) : [];
      const academicYears = academicYearsResponse.status === 'fulfilled' ? (academicYearsResponse.value.data || academicYearsResponse.value) : [];
      const birthdays = birthdaysResponse.status === 'fulfilled' ? (birthdaysResponse.value.data || birthdaysResponse.value) : [];
      const attendanceSessions = attendanceSessionsResponse.status === 'fulfilled' ? (attendanceSessionsResponse.value.data || attendanceSessionsResponse.value) : [];
      const assessments = assessmentsResponse.status === 'fulfilled' ? (assessmentsResponse.value.data || assessmentsResponse.value) : [];

      // Find current academic year
      const currentAcademicYear = (academicYears as any[]).find((ay: any) => ay.status === 'current');

      // Calculate attendance stats for today
      const today = new Date().toISOString().split('T')[0];
      const todaySessions = (attendanceSessions as any[]).filter((session: any) => 
        session.date.startsWith(today)
      );

      // Calculate present/absent from today's sessions
      let presentCount = 0;
      let absentCount = 0;

      todaySessions.forEach((session: any) => {
        if (session.attendance_entries) {
          session.attendance_entries.forEach((entry: any) => {
            if (entry.status === 'present') presentCount++;
            if (entry.status === 'absent') absentCount++;
          });
        }
      });

      // Calculate "Not Marked" - total students minus marked attendance
      const totalStudents = (students as any[]).length;
      const markedCount = presentCount + absentCount;
      const notMarkedCount = Math.max(0, totalStudents - markedCount);

      // Process assessments for progress
      const assessmentProgress = (assessments as any[])
        .filter((a: any) => a.published)
        .slice(0, 5)
        .map((assessment: any) => {
          // Count how many students have marks entered
          const totalStudents = (students as any[]).length;
          const completedCount = assessment.marks?.length || 0;

          return {
            id: assessment.id,
            name: assessment.name,
            completed: completedCount,
            total: totalStudents,
          };
        });

      // Process birthdays
      const birthdayList = (birthdays as any[]).slice(0, 10).map((birthday: any) => ({
        id: birthday.id,
        name: birthday.name,
        type: birthday.type as 'student' | 'teacher',
        classroom: birthday.classroom,
        day: birthday.day,
        month: birthday.month,
      }));

      const dashboardData: DashboardData = {
        stats: {
          totalStudents: (students as any[]).length,
          totalTeachers: (teachers as any[]).length,
          totalClasses: (classrooms as any[]).length,
          totalSubjects: (subjects as any[]).length,
        },
        attendance: {
          present: presentCount,
          absent: absentCount,
          notMarked: notMarkedCount,
        },
        assessments: assessmentProgress,
        birthdays: birthdayList,
        currentAcademicYear: currentAcademicYear ? {
          id: currentAcademicYear.id,
          label: currentAcademicYear.label,
          status: currentAcademicYear.status as 'upcoming' | 'current' | 'closed',
          startDate: new Date(currentAcademicYear.start_date),
          endDate: new Date(currentAcademicYear.end_date),
          totalClasses: (classrooms as any[]).length,
          totalStudents: (students as any[]).length,
        } : undefined,
        recentActivity: [], // Will be populated when audit endpoint is available
      };

      setState({ data: dashboardData, isLoading: false, error: null });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load dashboard data';
      setState({ data: null, isLoading: false, error: message });
    }
  };

  const retry = () => {
    loadDashboardData();
  };

  return {
    data: state.data,
    isLoading: state.isLoading,
    error: state.error,
    retry,
  };
}
