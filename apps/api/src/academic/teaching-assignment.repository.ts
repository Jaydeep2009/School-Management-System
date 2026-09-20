/**
 * Teaching Assignment Repository
 * 
 * Database operations for teaching assignments
 * SECURITY: All queries are school-scoped
 */

import type { TeachingAssignment, TeachingAssignmentStatus } from './academic.types';

/**
 * Find teaching assignment by ID
 * SECURITY: Filters by school_id
 */
export async function findById(
  db: D1Database,
  id: string,
  schoolId: string
): Promise<TeachingAssignment | null> {
  const result = await db
    .prepare(
      `SELECT id, school_id, academic_year_id, teacher_id, classroom_id, subject_id, status, created_at, updated_at
       FROM teaching_assignments
       WHERE id = ?
         AND school_id = ?
       LIMIT 1`
    )
    .bind(id, schoolId)
    .first<TeachingAssignment>();

  return result || null;
}

/**
 * Find all teaching assignments for a school
 * SECURITY: Filters by school_id
 */
export async function findAll(
  db: D1Database,
  schoolId: string,
  filters?: {
    academic_year_id?: string;
    teacher_id?: string;
    classroom_id?: string;
    subject_id?: string;
    status?: TeachingAssignmentStatus;
  }
): Promise<TeachingAssignment[]> {
  let query = `SELECT id, school_id, academic_year_id, teacher_id, classroom_id, subject_id, status, created_at, updated_at
               FROM teaching_assignments
               WHERE school_id = ?`;
  
  const bindings: unknown[] = [schoolId];

  if (filters?.academic_year_id) {
    query += ' AND academic_year_id = ?';
    bindings.push(filters.academic_year_id);
  }

  if (filters?.teacher_id) {
    query += ' AND teacher_id = ?';
    bindings.push(filters.teacher_id);
  }

  if (filters?.classroom_id) {
    query += ' AND classroom_id = ?';
    bindings.push(filters.classroom_id);
  }

  if (filters?.subject_id) {
    query += ' AND subject_id = ?';
    bindings.push(filters.subject_id);
  }

  if (filters?.status) {
    query += ' AND status = ?';
    bindings.push(filters.status);
  }

  query += ' ORDER BY created_at DESC';

  const result = await db
    .prepare(query)
    .bind(...bindings)
    .all<TeachingAssignment>();

  return result.results || [];
}

/**
 * Find teaching assignment by classroom and subject
 * SECURITY: Filters by school_id
 */
export async function findByClassroomAndSubject(
  db: D1Database,
  classroomId: string,
  subjectId: string,
  schoolId: string,
  status: TeachingAssignmentStatus = 'active'
): Promise<TeachingAssignment | null> {
  const result = await db
    .prepare(
      `SELECT id, school_id, academic_year_id, teacher_id, classroom_id, subject_id, status, created_at, updated_at
       FROM teaching_assignments
       WHERE classroom_id = ?
         AND subject_id = ?
         AND school_id = ?
         AND status = ?
       LIMIT 1`
    )
    .bind(classroomId, subjectId, schoolId, status)
    .first<TeachingAssignment>();

  return result || null;
}

/**
 * Create teaching assignment
 * SECURITY: Sets school_id from authenticated context
 */
export async function create(
  db: D1Database,
  data: {
    id: string;
    school_id: string;
    academic_year_id: string;
    teacher_id: string;
    classroom_id: string;
    subject_id: string;
    status: TeachingAssignmentStatus;
  }
): Promise<TeachingAssignment> {
  const now = new Date().toISOString();

  await db
    .prepare(
      `INSERT INTO teaching_assignments (id, school_id, academic_year_id, teacher_id, classroom_id, subject_id, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      data.id,
      data.school_id,
      data.academic_year_id,
      data.teacher_id,
      data.classroom_id,
      data.subject_id,
      data.status,
      now,
      now
    )
    .run();

  return {
    id: data.id,
    school_id: data.school_id,
    academic_year_id: data.academic_year_id,
    teacher_id: data.teacher_id,
    classroom_id: data.classroom_id,
    subject_id: data.subject_id,
    status: data.status,
    created_at: now,
    updated_at: now,
  };
}

/**
 * Update teaching assignment
 * SECURITY: Filters by school_id
 */
export async function update(
  db: D1Database,
  id: string,
  schoolId: string,
  data: {
    teacher_id?: string;
    status?: TeachingAssignmentStatus;
  }
): Promise<boolean> {
  const updates: string[] = [];
  const bindings: unknown[] = [];

  if (data.teacher_id !== undefined) {
    updates.push('teacher_id = ?');
    bindings.push(data.teacher_id);
  }

  if (data.status !== undefined) {
    updates.push('status = ?');
    bindings.push(data.status);
  }

  if (updates.length === 0) {
    return false;
  }

  updates.push('updated_at = ?');
  bindings.push(new Date().toISOString());

  bindings.push(id, schoolId);

  const result = await db
    .prepare(
      `UPDATE teaching_assignments
       SET ${updates.join(', ')}
       WHERE id = ?
         AND school_id = ?`
    )
    .bind(...bindings)
    .run();

  return result.meta.changes > 0;
}
