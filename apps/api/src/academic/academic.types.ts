/**
 * Academic structure types
 * 
 * Domain types for academic years, classrooms, subjects, teaching assignments, and enrollments
 */

/**
 * Academic Year
 */
export type AcademicYearStatus = 'upcoming' | 'current' | 'closed';

export interface AcademicYear {
  id: string;
  school_id: string;
  label: string;
  starts_on: string;
  ends_on: string;
  status: AcademicYearStatus;
  created_at: string;
  updated_at: string;
}

export interface CreateAcademicYearRequest {
  label: string;
  starts_on: string;
  ends_on: string;
  status?: AcademicYearStatus;
}

export interface UpdateAcademicYearRequest {
  label?: string;
  starts_on?: string;
  ends_on?: string;
}

/**
 * Classroom
 */
export type ClassroomStatus = 'active' | 'inactive' | 'archived';

export interface Classroom {
  id: string;
  school_id: string;
  academic_year_id: string;
  classroom_code: string;
  grade_name: string;
  division_name: string;
  grade_level: number;
  class_teacher_id: string | null;
  status: ClassroomStatus;
  created_at: string;
  updated_at: string;
}

export interface CreateClassroomRequest {
  academic_year_id: string;
  classroom_code: string;
  grade_name: string;
  division_name: string;
  grade_level: number;
  class_teacher_id?: string;
}

export interface UpdateClassroomRequest {
  classroom_code?: string;
  grade_name?: string;
  division_name?: string;
  grade_level?: number;
  class_teacher_id?: string | null;
  status?: ClassroomStatus;
}

/**
 * Subject
 */
export type SubjectStatus = 'active' | 'inactive';

export interface Subject {
  id: string;
  school_id: string;
  subject_code: string;
  name: string;
  description: string | null;
  status: SubjectStatus;
  created_at: string;
  updated_at: string;
}

export interface CreateSubjectRequest {
  subject_code: string;
  name: string;
  description?: string;
}

export interface UpdateSubjectRequest {
  subject_code?: string;
  name?: string;
  description?: string;
  status?: SubjectStatus;
}

/**
 * Teaching Assignment
 * Note: No status or academic_year_id per schema v1.1
 * A teaching assignment exists as long as it's in the table.
 * Academic year is derived from the classroom's academic_year_id.
 */
export interface TeachingAssignment {
  id: string;
  school_id: string;
  teacher_id: string | null;
  classroom_id: string;
  subject_id: string;
  created_at: string;
  updated_at: string;
}

export interface CreateTeachingAssignmentRequest {
  teacher_id: string;
  classroom_id: string;
  subject_id: string;
}

export interface UpdateTeachingAssignmentRequest {
  teacher_id?: string;
}

/**
 * Enrollment
 */
export type EnrollmentStatus = 'planned' | 'active' | 'completed' | 'left' | 'transferred';
export type EnrollmentOutcome = 'promoted' | 'repeated' | 'dropped' | null;

export interface Enrollment {
  id: string;
  school_id: string;
  academic_year_id: string;
  classroom_id: string;
  student_id: string;
  roll_number: string | null;
  joined_on: string;
  left_on: string | null;
  status: EnrollmentStatus;
  outcome: EnrollmentOutcome;
  from_enrollment_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateEnrollmentRequest {
  academic_year_id: string;
  classroom_id: string;
  student_id: string;
  roll_number?: string;
  joined_on: string;
  status?: EnrollmentStatus;
}

export interface UpdateEnrollmentRequest {
  roll_number?: string | null;
  left_on?: string | null;
  status?: EnrollmentStatus;
  outcome?: EnrollmentOutcome;
}

/**
 * Expanded views for API responses
 */
export interface ClassroomWithRelations extends Classroom {
  academic_year?: AcademicYear;
  class_teacher?: {
    id: string;
    first_name: string;
    last_name: string;
    employee_id: string;
  };
}

export interface TeachingAssignmentWithRelations extends TeachingAssignment {
  teacher?: {
    id: string;
    first_name: string;
    last_name: string;
    employee_id: string;
  };
  classroom?: Classroom;
  subject?: Subject;
  academic_year?: AcademicYear;
}

export interface EnrollmentWithRelations extends Enrollment {
  student?: {
    id: string;
    first_name: string;
    last_name: string;
    admission_number: string;
  };
  classroom?: Classroom;
  academic_year?: AcademicYear;
}
