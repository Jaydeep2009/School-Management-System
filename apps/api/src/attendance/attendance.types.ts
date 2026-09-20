/**
 * Attendance Module Type Definitions
 */

export type AttendanceStatus = 'present' | 'absent';
export type AttendanceSessionStatus = 'open' | 'locked';

/**
 * Attendance Session
 * Represents a teaching session for classroom + subject + date + period
 */
export interface AttendanceSession {
  id: string;
  school_id: string;
  academic_year_id: string;
  classroom_id: string;
  subject_id: string;
  session_date: string; // YYYY-MM-DD
  period_no: number;
  taken_by: string; // user_id of teacher who created
  status: AttendanceSessionStatus;
  created_at: number;
  updated_at: number;
}

/**
 * Attendance Entry
 * Individual student attendance record for a session
 */
export interface AttendanceEntry {
  session_id: string;
  student_id: string;
  enrollment_id: string;
  status: AttendanceStatus;
  updated_by: string; // user_id of who last updated
  updated_at: number;
}

/**
 * Create Attendance Session Request
 */
export interface CreateAttendanceSessionRequest {
  classroom_id: string;
  subject_id: string;
  session_date: string; // YYYY-MM-DD
  period_no: number;
}

/**
 * Mark Attendance Request
 * Bulk marking of attendance for multiple students
 */
export interface MarkAttendanceRequest {
  entries: {
    student_id: string;
    status: AttendanceStatus;
  }[];
}

/**
 * Attendance Summary for a Student
 */
export interface AttendanceSummary {
  total_sessions: number;
  present: number;
  absent: number;
  percentage: number;
}

/**
 * Subject-wise Attendance Summary
 */
export interface SubjectAttendanceSummary {
  subject_id: string;
  subject_name: string;
  total_sessions: number;
  present: number;
  absent: number;
  percentage: number;
}

/**
 * Student Attendance Row (for classroom reports)
 */
export interface StudentAttendanceRow {
  student_id: string;
  student_code: string;
  student_name: string;
  total_sessions: number;
  present: number;
  absent: number;
  percentage: number;
}

/**
 * Attendance Session with Details
 * Extended session info including classroom/subject names
 */
export interface AttendanceSessionWithDetails extends AttendanceSession {
  classroom_name?: string;
  subject_name?: string;
  taken_by_name?: string;
  entry_count?: number;
}

/**
 * Attendance Entry with Student Details
 */
export interface AttendanceEntryWithStudent extends AttendanceEntry {
  student_code: string;
  student_name: string;
}

/**
 * Lock/Unlock Request (empty body, action is in route)
 */
export interface LockAttendanceSessionRequest {
  // Empty - action determined by endpoint
}

/**
 * Attendance Filters for Reports
 */
export interface AttendanceReportFilters {
  academic_year_id?: string;
  classroom_id?: string;
  subject_id?: string;
  student_id?: string;
  from_date?: string;
  to_date?: string;
}
