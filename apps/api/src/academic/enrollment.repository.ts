/**
 * Enrollment Repository
 * 
 * Database operations for enrollments
 * SECURITY: All queries are school-scoped
 */

import type { Enrollment, EnrollmentStatus, EnrollmentOutcome } from './academic.types';

/**
 * Find enrollment by ID
 * SECURITY: Filters by school_id
 */
export async function findById(
  db: D1Database,
  id: string,
  schoolId: string
): Promise<Enrollment | null> {
  const result = await db
    .prepare(
      `SELECT id, school_id, academic_year_id, classroom_id, student_id, roll_number,
              joined_on, left_on, status, outcome, from_enrollment_id, created_at, updated_at
       FROM enrollments
       WHERE id = ?
         AND school_id = ?
       LIMIT 1`
    )
    .bind(id, schoolId)
    .first<Enrollment>();

  return result || null;
}

/**
 * Find all enrollments for a school
 * SECURITY: Filters by school_id
 */
export async function findAll(
  db: D1Database,
  schoolId: string,
  filters?: {
    academic_year_id?: string;
    classroom_id?: string;
    student_id?: string;
    status?: EnrollmentStatus;
  }
): Promise<Enrollment[]> {
  let query = `SELECT 
                 e.id, e.school_id, e.academic_year_id, e.classroom_id, e.student_id, e.roll_number,
                 e.joined_on, e.left_on, e.status, e.outcome, e.from_enrollment_id, e.created_at, e.updated_at,
                 sp.student_code,
                 sp.admission_number,
                 (sp.first_name || ' ' || COALESCE(sp.middle_name || ' ', '') || sp.last_name) as student_name,
                 sp.first_name,
                 sp.middle_name,
                 sp.last_name,
                 sp.gender,
                 sp.date_of_birth,
                 sp.phone,
                 sp.email,
                 sp.address,
                 sp.parent_name,
                 sp.parent_phone,
                 sp.parent_email,
                 sp.status as student_status
               FROM enrollments e
               LEFT JOIN student_profiles sp ON e.student_id = sp.user_id
               WHERE e.school_id = ?`;
  
  const bindings: unknown[] = [schoolId];

  if (filters?.academic_year_id) {
    query += ' AND e.academic_year_id = ?';
    bindings.push(filters.academic_year_id);
  }

  if (filters?.classroom_id) {
    query += ' AND e.classroom_id = ?';
    bindings.push(filters.classroom_id);
  }

  if (filters?.student_id) {
    query += ' AND e.student_id = ?';
    bindings.push(filters.student_id);
  }

  if (filters?.status) {
    query += ' AND e.status = ?';
    bindings.push(filters.status);
  }

  query += ' ORDER BY e.joined_on DESC';

  const result = await db
    .prepare(query)
    .bind(...bindings)
    .all<Enrollment>();

  return result.results || [];
}

/**
 * Find active enrollments by student
 * SECURITY: Filters by school_id
 */
export async function findActiveByStudent(
  db: D1Database,
  studentId: string,
  schoolId: string
): Promise<Enrollment[]> {
  const result = await db
    .prepare(
      `SELECT id, school_id, academic_year_id, classroom_id, student_id, roll_number,
              joined_on, left_on, status, outcome, from_enrollment_id, created_at, updated_at
       FROM enrollments
       WHERE student_id = ?
         AND school_id = ?
         AND status IN ('active', 'planned')
       ORDER BY joined_on DESC`
    )
    .bind(studentId, schoolId)
    .all<Enrollment>();

  return result.results || [];
}

/**
 * Count active enrollments for a student in a specific academic year
 * SECURITY: Filters by school_id
 */
export async function countActiveForYearAndStudent(
  db: D1Database,
  studentId: string,
  academicYearId: string,
  schoolId: string
): Promise<number> {
  const result = await db
    .prepare(
      `SELECT COUNT(*) as count
       FROM enrollments
       WHERE student_id = ?
         AND academic_year_id = ?
         AND school_id = ?
         AND status = 'active'`
    )
    .bind(studentId, academicYearId, schoolId)
    .first<{ count: number }>();

  return result?.count || 0;
}

/**
 * Find enrollment by student, classroom, and academic year
 * SECURITY: Filters by school_id
 */
export async function findByStudentAndClassroom(
  db: D1Database,
  studentId: string,
  classroomId: string,
  academicYearId: string,
  schoolId: string
): Promise<Enrollment | null> {
  const result = await db
    .prepare(
      `SELECT id, school_id, academic_year_id, classroom_id, student_id, roll_number,
              joined_on, left_on, status, outcome, from_enrollment_id, created_at, updated_at
       FROM enrollments
       WHERE student_id = ?
         AND classroom_id = ?
         AND academic_year_id = ?
         AND school_id = ?
       LIMIT 1`
    )
    .bind(studentId, classroomId, academicYearId, schoolId)
    .first<Enrollment>();

  return result || null;
}

/**
 * Create enrollment
 * SECURITY: Sets school_id from authenticated context
 */
export async function create(
  db: D1Database,
  data: {
    id: string;
    school_id: string;
    academic_year_id: string;
    classroom_id: string;
    student_id: string;
    roll_number: string | null;
    joined_on: string;
    status: EnrollmentStatus;
    from_enrollment_id: string | null;
  }
): Promise<Enrollment> {
  const now = new Date().toISOString();

  await db
    .prepare(
      `INSERT INTO enrollments (id, school_id, academic_year_id, classroom_id, student_id,
                                roll_number, joined_on, left_on, status, outcome, from_enrollment_id,
                                created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, NULL, ?, NULL, ?, ?, ?)`
    )
    .bind(
      data.id,
      data.school_id,
      data.academic_year_id,
      data.classroom_id,
      data.student_id,
      data.roll_number,
      data.joined_on,
      data.status,
      data.from_enrollment_id,
      now,
      now
    )
    .run();

  return {
    id: data.id,
    school_id: data.school_id,
    academic_year_id: data.academic_year_id,
    classroom_id: data.classroom_id,
    student_id: data.student_id,
    roll_number: data.roll_number,
    joined_on: data.joined_on,
    left_on: null,
    status: data.status,
    outcome: null,
    from_enrollment_id: data.from_enrollment_id,
    created_at: now,
    updated_at: now,
  };
}

/**
 * Update enrollment
 * SECURITY: Filters by school_id
 */
export async function update(
  db: D1Database,
  id: string,
  schoolId: string,
  data: {
    roll_number?: string | null;
    left_on?: string | null;
    status?: EnrollmentStatus;
    outcome?: EnrollmentOutcome;
  }
): Promise<boolean> {
  const updates: string[] = [];
  const bindings: unknown[] = [];

  if (data.roll_number !== undefined) {
    updates.push('roll_number = ?');
    bindings.push(data.roll_number);
  }

  if (data.left_on !== undefined) {
    updates.push('left_on = ?');
    bindings.push(data.left_on);
  }

  if (data.status !== undefined) {
    updates.push('status = ?');
    bindings.push(data.status);
  }

  if (data.outcome !== undefined) {
    updates.push('outcome = ?');
    bindings.push(data.outcome);
  }

  if (updates.length === 0) {
    return false;
  }

  updates.push('updated_at = ?');
  bindings.push(new Date().toISOString());

  bindings.push(id, schoolId);

  const result = await db
    .prepare(
      `UPDATE enrollments
       SET ${updates.join(', ')}
       WHERE id = ?
         AND school_id = ?`
    )
    .bind(...bindings)
    .run();

  return result.meta.changes > 0;
}
