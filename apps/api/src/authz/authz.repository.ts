/**
 * Authorization repository
 * 
 * Database queries for authorization decisions
 * SECURITY: All queries are school-scoped
 */

import type {
  TeachingAssignment,
  Classroom,
  Enrollment,
  StudentProfile,
  TeacherProfile,
} from './authz.types';

/**
 * Find teaching assignment by teacher, classroom, and subject
 * SECURITY: school_id filter prevents cross-tenant access
 */
export async function findTeachingAssignment(
  db: D1Database,
  teacherId: string,
  classroomId: string,
  subjectId: string,
  schoolId: string
): Promise<TeachingAssignment | null> {
  const result = await db
    .prepare(
      `SELECT id, teacher_id, classroom_id, subject_id, school_id
       FROM teaching_assignments
       WHERE teacher_id = ?
         AND classroom_id = ?
         AND subject_id = ?
         AND school_id = ?
       LIMIT 1`
    )
    .bind(teacherId, classroomId, subjectId, schoolId)
    .first<TeachingAssignment>();

  return result || null;
}

/**
 * Find any teaching assignment for teacher in a classroom
 * Used to check if teacher has ANY relationship with the classroom
 * SECURITY: school_id filter prevents cross-tenant access
 */
export async function findAnyTeachingAssignment(
  db: D1Database,
  teacherId: string,
  classroomId: string,
  schoolId: string
): Promise<TeachingAssignment | null> {
  const result = await db
    .prepare(
      `SELECT id, teacher_id, classroom_id, subject_id, school_id
       FROM teaching_assignments
       WHERE teacher_id = ?
         AND classroom_id = ?
         AND school_id = ?
       LIMIT 1`
    )
    .bind(teacherId, classroomId, schoolId)
    .first<TeachingAssignment>();

  return result || null;
}

/**
 * Find classroom by ID
 * SECURITY: school_id filter prevents cross-tenant access
 */
export async function findClassroom(
  db: D1Database,
  classroomId: string,
  schoolId: string
): Promise<Classroom | null> {
  const result = await db
    .prepare(
      `SELECT id, school_id, class_teacher_id, grade_name, division_name, academic_year_id
       FROM classrooms
       WHERE id = ?
         AND school_id = ?
       LIMIT 1`
    )
    .bind(classroomId, schoolId)
    .first<Classroom>();

  return result || null;
}

/**
 * Check if teacher is the class teacher for a classroom
 * SECURITY: school_id filter prevents cross-tenant access
 */
export async function isClassTeacher(
  db: D1Database,
  teacherId: string,
  classroomId: string,
  schoolId: string
): Promise<boolean> {
  const classroom = await db
    .prepare(
      `SELECT id
       FROM classrooms
       WHERE id = ?
         AND school_id = ?
         AND class_teacher_id = ?
       LIMIT 1`
    )
    .bind(classroomId, schoolId, teacherId)
    .first();

  return classroom !== null;
}

/**
 * Find active enrollment for student in classroom
 * SECURITY: school_id filter prevents cross-tenant access
 */
export async function findActiveEnrollment(
  db: D1Database,
  studentId: string,
  classroomId: string,
  schoolId: string
): Promise<Enrollment | null> {
  const result = await db
    .prepare(
      `SELECT id, student_id, classroom_id, school_id, academic_year_id, roll_number, joined_on, left_on, status, outcome, from_enrollment_id, created_at, updated_at
       FROM enrollments
       WHERE student_id = ?
         AND classroom_id = ?
         AND school_id = ?
         AND status IN ('active', 'planned')
       LIMIT 1`
    )
    .bind(studentId, classroomId, schoolId)
    .first<Enrollment>();

  return result || null;
}

/**
 * Find any active enrollment for student (current classroom)
 * SECURITY: school_id filter prevents cross-tenant access
 */
export async function findStudentActiveEnrollment(
  db: D1Database,
  studentId: string,
  schoolId: string
): Promise<Enrollment | null> {
  const result = await db
    .prepare(
      `SELECT id, student_id, classroom_id, school_id, academic_year_id, roll_number, joined_on, left_on, status, outcome, from_enrollment_id, created_at, updated_at
       FROM enrollments
       WHERE student_id = ?
         AND school_id = ?
         AND status IN ('active', 'planned')
       ORDER BY joined_on DESC
       LIMIT 1`
    )
    .bind(studentId, schoolId)
    .first<Enrollment>();

  return result || null;
}

/**
 * Find student profile by ID
 * SECURITY: school_id filter prevents cross-tenant access
 */
export async function findStudentProfile(
  db: D1Database,
  studentId: string,
  schoolId: string
): Promise<StudentProfile | null> {
  const result = await db
    .prepare(
      `SELECT id, user_id, school_id, admission_number, first_name, last_name
       FROM student_profiles
       WHERE id = ?
         AND school_id = ?
       LIMIT 1`
    )
    .bind(studentId, schoolId)
    .first<StudentProfile>();

  return result || null;
}

/**
 * Find student profile by user_id
 * SECURITY: school_id filter prevents cross-tenant access
 */
export async function findStudentProfileByUserId(
  db: D1Database,
  userId: string,
  schoolId: string
): Promise<StudentProfile | null> {
  const result = await db
    .prepare(
      `SELECT id, user_id, school_id, admission_number, first_name, last_name
       FROM student_profiles
       WHERE user_id = ?
         AND school_id = ?
       LIMIT 1`
    )
    .bind(userId, schoolId)
    .first<StudentProfile>();

  return result || null;
}

/**
 * Find teacher profile by ID
 * SECURITY: school_id filter prevents cross-tenant access
 */
export async function findTeacherProfile(
  db: D1Database,
  teacherId: string,
  schoolId: string
): Promise<TeacherProfile | null> {
  const result = await db
    .prepare(
      `SELECT id, user_id, school_id, employee_id, first_name, last_name
       FROM teacher_profiles
       WHERE id = ?
         AND school_id = ?
       LIMIT 1`
    )
    .bind(teacherId, schoolId)
    .first<TeacherProfile>();

  return result || null;
}

/**
 * Find teacher profile by user_id
 * SECURITY: school_id filter prevents cross-tenant access
 */
export async function findTeacherProfileByUserId(
  db: D1Database,
  userId: string,
  schoolId: string
): Promise<TeacherProfile | null> {
  const result = await db
    .prepare(
      `SELECT id, user_id, school_id, employee_id, first_name, last_name
       FROM teacher_profiles
       WHERE user_id = ?
         AND school_id = ?
       LIMIT 1`
    )
    .bind(userId, schoolId)
    .first<TeacherProfile>();

  return result || null;
}

/**
 * Check if student belongs to a classroom that teacher has access to
 * Used for teacher viewing student profiles
 * SECURITY: all queries school-scoped
 */
export async function canTeacherAccessStudent(
  db: D1Database,
  teacherId: string,
  studentId: string,
  schoolId: string
): Promise<boolean> {
  // Find student's active enrollment
  const enrollment = await findStudentActiveEnrollment(db, studentId, schoolId);
  
  if (!enrollment) {
    return false;
  }

  // Check if teacher has any teaching assignment in that classroom
  const assignment = await findAnyTeachingAssignment(
    db,
    teacherId,
    enrollment.classroom_id,
    schoolId
  );

  return assignment !== null;
}
