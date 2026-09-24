/**
 * Marks Import Types
 */

/**
 * Marks import row structure (from Excel)
 */
export interface MarksImportRow {
  academic_year: string;          // e.g., "2024-2025"
  classroom_code: string;          // e.g., "1A"
  subject_code: string;            // e.g., "MATH"
  assessment_name: string;         // e.g., "Midterm Exam"
  student_admission_number: string; // e.g., "S001"
  marks_obtained?: number;         // e.g., 85 (optional if absent/exempt)
  status: string;                  // "graded", "absent", or "exempt"
}
