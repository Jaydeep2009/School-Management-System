/**
 * Authorization types
 * 
 * Defines resource types, actions, and policy results for authorization decisions
 */

import type { TenantContext as AuthTenantContext } from '../auth/auth.types';

/**
 * User roles (locked architecture)
 */
export type UserRole = 'super_admin' | 'principal' | 'teacher' | 'student';

/**
 * Extended TenantContext for authorization
 * Supports super_admin role (not in authentication module)
 */
export interface TenantContext extends Omit<AuthTenantContext, 'role'> {
  role: UserRole;
}

/**
 * Resource types in the system
 */
export type ResourceType =
  | 'school'
  | 'classroom'
  | 'student'
  | 'teacher'
  | 'subject'
  | 'attendance'
  | 'marks'
  | 'fees'
  | 'enrollment'
  | 'teaching_assignment';

/**
 * Action types
 */
export type Action = 'view' | 'modify' | 'create' | 'delete';

/**
 * Authorization context
 */
export interface AuthzContext {
  tenant: TenantContext;
  resource?: {
    type: ResourceType;
    id: string;
    schoolId?: string;
    [key: string]: unknown;
  };
  action: Action;
}

/**
 * Authorization result
 */
export interface AuthzResult {
  allowed: boolean;
  reason?: string;
}

/**
 * Classroom access context
 */
export interface ClassroomAccessContext {
  classroomId: string;
  schoolId: string;
}

/**
 * Student access context
 */
export interface StudentAccessContext {
  studentId: string;
  schoolId: string;
}

/**
 * Teaching assignment context
 */
export interface TeachingAssignmentContext {
  teacherId: string;
  classroomId: string;
  subjectId?: string;
  schoolId: string;
}

/**
 * Attendance authorization context
 */
export interface AttendanceAuthzContext {
  classroomId: string;
  subjectId: string;
  schoolId: string;
}

/**
 * Marks authorization context
 */
export interface MarksAuthzContext {
  classroomId: string;
  subjectId: string;
  schoolId: string;
}

/**
 * Teaching assignment record (from database)
 */
export interface TeachingAssignment {
  id: string;
  teacher_id: string;
  classroom_id: string;
  subject_id: string;
  school_id: string;
  academic_year: string;
  status: 'active' | 'completed';
}

/**
 * Classroom record (for class teacher checks)
 */
export interface Classroom {
  id: string;
  school_id: string;
  class_teacher_id: string | null;
  name: string;
  section: string;
  academic_year: string;
}

/**
 * Enrollment record (for student classroom access)
 */
export interface Enrollment {
  id: string;
  student_id: string;
  classroom_id: string;
  school_id: string;
  academic_year: string;
  enrollment_date: string;
  status: 'active' | 'completed' | 'transferred';
}

/**
 * Student profile record
 */
export interface StudentProfile {
  id: string;
  user_id: string;
  school_id: string;
  admission_number: string;
  first_name: string;
  last_name: string;
}

/**
 * Teacher profile record
 */
export interface TeacherProfile {
  id: string;
  user_id: string;
  school_id: string;
  employee_id: string;
  first_name: string;
  last_name: string;
}
