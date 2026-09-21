/**
 * Account management types for teachers and students
 * 
 * Domain types for profile management and account lifecycle operations
 */

/**
 * Teacher Profile
 */
export type TeacherStatus = 'active' | 'inactive' | 'suspended';

export interface TeacherProfile {
  id: string;
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
  status: TeacherStatus;
  created_at: string;
  updated_at: string;
}

export interface CreateTeacherRequest {
  first_name: string;
  middle_name?: string;
  last_name: string;
  phone?: string;
  date_of_birth?: string;
  joining_date?: string;
}

export interface UpdateTeacherRequest {
  first_name?: string;
  middle_name?: string;
  last_name?: string;
  phone?: string;
  date_of_birth?: string;
  joining_date?: string;
  status?: TeacherStatus;
}

export interface TeacherWithUser extends TeacherProfile {
  user: {
    id: string;
    login_id: string;
    role: string;
    status: string;
    must_change_password: boolean;
  };
}

/**
 * Student Profile
 */
export type StudentStatus = 'active' | 'inactive' | 'suspended' | 'graduated' | 'transferred';

export interface StudentProfile {
  id: string;
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
  status: StudentStatus;
  created_at: string;
  updated_at: string;
}

export interface CreateStudentRequest {
  admission_number: string;
  first_name: string;
  middle_name?: string;
  last_name: string;
  gender?: string;
  date_of_birth?: string;
  phone?: string;
  email?: string;
  address?: string;
  parent_name?: string;
  parent_phone?: string;
  parent_email?: string;
}

export interface UpdateStudentRequest {
  admission_number?: string;
  first_name?: string;
  middle_name?: string;
  last_name?: string;
  gender?: string;
  date_of_birth?: string;
  phone?: string;
  email?: string;
  address?: string;
  parent_name?: string;
  parent_phone?: string;
  status?: StudentStatus;
}

export interface StudentWithUser extends StudentProfile {
  user: {
    id: string;
    login_id: string;
    role: string;
    status: string;
    must_change_password: boolean;
  };
}

/**
 * Bulk provisioning
 */
export interface BulkStudentProvisionRequest {
  admission_number: string;
  first_name: string;
  middle_name?: string;
  last_name: string;
  gender?: string;
  date_of_birth?: string;
  phone?: string;
  email?: string;
  address?: string;
  parent_name?: string;
  parent_phone?: string;
}

export interface BulkProvisionRowError {
  row: number;
  admission_number: string;
  errors: string[];
}

export interface BulkProvisionResponse {
  success: boolean;
  created_count: number;
  accounts: AccountCreationResponse[];
}

// Legacy type - kept for compatibility
export interface BulkStudentInput {
  admission_number: string;
  first_name: string;
  middle_name?: string;
  last_name: string;
  gender?: string;
  date_of_birth?: string;
  phone?: string;
  email?: string;
  address?: string;
  parent_name?: string;
  parent_phone?: string;
}

// Legacy type - kept for compatibility
export interface BulkProvisionResult {
  success: boolean;
  created_count: number;
  failed_count: number;
  errors: Array<{
    row: number;
    admission_number: string;
    error: string;
  }>;
  created_students: Array<{
    student_id: string;
    user_id: string;
    login_id: string;
    student_code: string;
    admission_number: string;
    name: string;
    temporary_password: string; // Only returned once, never persisted
  }>;
}

/**
 * Account creation response
 */
export interface AccountCreationResponse {
  profile_id: string;
  user_id: string;
  login_id: string;
  employee_code?: string;
  student_code?: string;
  temporary_password: string; // Only returned once during creation, never persisted
}

/**
 * Password reset response
 */
export interface PasswordResetResponse {
  user_id: string;
  login_id: string;
  temporary_password: string; // Only returned once, never persisted or logged
}

/**
 * User profile response for /me endpoint
 */
export interface UserProfileResponse {
  user: {
    id: string;
    login_id: string;
    role: string;
    status: string;
    school_id: string;
    must_change_password: boolean;
  };
  profile: TeacherProfile | StudentProfile;
}
