/**
 * Profiles Types
 * 
 * Types for student and teacher profile management and birthday queries
 */

/**
 * Teacher Profile (from database)
 */
export interface TeacherProfile {
  user_id: string;
  school_id: string;
  employee_code: string;
  first_name: string;
  middle_name: string | null;
  last_name: string;
  phone: string | null;
  date_of_birth: string | null;
  dob_md: string | null;
  joining_date: string | null;
  status: 'active' | 'inactive';
  created_at: number;
  updated_at: number;
}

/**
 * Student Profile (from database)
 */
export interface StudentProfile {
  user_id: string;
  school_id: string;
  student_code: string;
  admission_number: string;
  first_name: string;
  middle_name: string | null;
  last_name: string;
  gender: string | null;
  date_of_birth: string | null;
  dob_md: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  parent_name: string | null;
  parent_phone: string | null;
  parent_email: string | null;
  status: 'active' | 'inactive' | 'withdrawn';
  created_at: number;
  updated_at: number;
}

/**
 * Current Enrollment Information
 */
export interface CurrentEnrollment {
  enrollment_id: string;
  academic_year_id: string;
  academic_year_label: string;
  academic_year_status: string;
  classroom_id: string;
  classroom_code: string;
  grade_name: string;
  division_name: string;
  grade_level: number;
  roll_number: number | null;
  enrollment_status: string;
  joined_on: string | null;
  class_teacher_id: string | null;
  class_teacher_name: string | null;
}

/**
 * Historical Enrollment
 */
export interface HistoricalEnrollment {
  enrollment_id: string;
  academic_year_label: string;
  classroom_code: string;
  grade_name: string;
  division_name: string;
  roll_number: number | null;
  status: string;
  outcome: string | null;
  joined_on: string | null;
  left_on: string | null;
}

/**
 * Student Profile with Current Enrollment
 */
export interface StudentProfileWithEnrollment extends StudentProfile {
  current_enrollment: CurrentEnrollment | null;
}

/**
 * Update Teacher Profile Request
 */
export interface UpdateTeacherProfileRequest {
  first_name?: string;
  middle_name?: string | null;
  last_name?: string;
  phone?: string | null;
  date_of_birth?: string | null;
  joining_date?: string | null;
}

/**
 * Update Student Profile Request
 */
export interface UpdateStudentProfileRequest {
  first_name?: string;
  middle_name?: string | null;
  last_name?: string;
  gender?: string | null;
  date_of_birth?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  parent_name?: string | null;
  parent_phone?: string | null;
  parent_email?: string | null;
}

/**
 * Teacher Birthday Entry (minimal info for birthday lists)
 */
export interface TeacherBirthday {
  user_id: string;
  employee_code: string;
  first_name: string;
  middle_name: string | null;
  last_name: string;
  dob_md: string;
  full_dob?: string; // Only included for authorized users
}

/**
 * Student Birthday Entry (minimal info with privacy)
 */
export interface StudentBirthday {
  user_id: string;
  student_code: string;
  first_name: string;
  middle_name: string | null;
  last_name: string;
  classroom_code: string;
  grade_name: string;
  division_name: string;
  dob_md: string;
  full_dob?: string; // Only included for authorized users (e.g., Principal viewing full profile)
}

/**
 * Birthday Query Filters
 */
export interface BirthdayFilters {
  month?: number; // 1-12
  today?: boolean;
  thisWeek?: boolean;
  classroomId?: string; // Filter students by classroom
}
