/**
 * Dashboard types
 */

export interface DashboardStats {
  totalStudents: number;
  totalTeachers: number;
  totalClasses: number;
  totalSubjects: number;
}

export interface AttendanceData {
  present: number;
  absent: number;
  notMarked: number;
  averageAttendance?: number;
}

export interface AssessmentItem {
  id: string;
  name: string;
  completed: number;
  total: number;
}

export interface ActivityItem {
  id: string;
  action: string;
  actor: string;
  timestamp: Date;
  category: string;
}

export interface BirthdayPerson {
  id: string;
  name: string;
  type: 'student' | 'teacher';
  classroom?: string;
  day: number;
  month: number;
}

export interface AcademicYear {
  id: string;
  label: string;
  status: 'upcoming' | 'current' | 'closed';
  startDate: Date;
  endDate: Date;
  totalClasses?: number;
  totalStudents?: number;
}

export interface FeesData {
  totalCollected: number;
  totalPending: number;
  totalCharges: number;
  chargeCount: number;
  paymentCount: number;
}

export interface DashboardData {
  stats: DashboardStats;
  attendance: AttendanceData;
  assessments: AssessmentItem[];
  birthdays: BirthdayPerson[];
  currentAcademicYear?: AcademicYear;
  recentActivity: ActivityItem[];
  fees?: FeesData;
}
