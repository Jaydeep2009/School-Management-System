/**
 * Attendance Import Types
 */

/**
 * Attendance import row structure (from Excel)
 * Each row represents one student's attendance for a session
 */
export interface AttendanceImportRow {
  academic_year: string;          // e.g., "2024-2025"
  classroom_code: string;          // e.g., "1A"
  subject_code: string;            // e.g., "MATH"
  session_date: string;            // YYYY-MM-DD format
  period_no: number;               // 1, 2, 3, etc.
  student_admission_number: string; // e.g., "S001"
  status: string;                  // "present" or "absent"
}

/**
 * Options for attendance import
 */
export interface AttendanceImportOptions {
  // Currently no additional options needed
  // Sessions and entries will be created based on row data
}
