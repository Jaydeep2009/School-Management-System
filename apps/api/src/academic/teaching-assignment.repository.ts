/**
 * Teaching Assignment Repository
 * 
 * Database operations for teaching assignments
 * SECURITY: All queries are school-scoped
 */

import type { TeachingAssignment } from './academic.types';

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
      `SELECT id, school_id, teacher_id, classroom_id, subject_id, created_at, updated_at
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
    teacher_id?: string;
    classroom_id?: string;
    subject_id?: string;
  }
): Promise<TeachingAssignment[]> {
  let query = `SELECT id, school_id, teacher_id, classroom_id, subject_id, created_at, updated_at
               FROM teaching_assignments
               WHERE school_id = ?`;
  
  const bindings: unknown[] = [schoolId];

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
  schoolId: string
): Promise<TeachingAssignment | null> {
  const result = await db
    .prepare(
      `SELECT id, school_id, teacher_id, classroom_id, subject_id, created_at, updated_at
       FROM teaching_assignments
       WHERE classroom_id = ?
         AND subject_id = ?
         AND school_id = ?
       LIMIT 1`
    )
    .bind(classroomId, subjectId, schoolId)
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
    teacher_id: string;
    classroom_id: string;
    subject_id: string;
  }
): Promise<TeachingAssignment> {
  const now = Date.now();

  await db
    .prepare(
      `INSERT INTO teaching_assignments (id, school_id, teacher_id, classroom_id, subject_id, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      data.id,
      data.school_id,
      data.teacher_id,
      data.classroom_id,
      data.subject_id,
      now,
      now
    )
    .run();

  return {
    id: data.id,
    school_id: data.school_id,
    teacher_id: data.teacher_id,
    classroom_id: data.classroom_id,
    subject_id: data.subject_id,
    created_at: now.toString(),
    updated_at: now.toString(),
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
    teacher_id?: string | null;
  }
): Promise<boolean> {
  const updates: string[] = [];
  const bindings: unknown[] = [];

  if (data.teacher_id !== undefined) {
    updates.push('teacher_id = ?');
    bindings.push(data.teacher_id);
  }

  if (updates.length === 0) {
    return false;
  }

  updates.push('updated_at = ?');
  bindings.push(Date.now());

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

  return (result.meta?.changes ?? 0) > 0;
}
