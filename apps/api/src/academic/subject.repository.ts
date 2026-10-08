/**
 * Subject Repository
 * 
 * Database operations for subjects
 * SECURITY: All queries are school-scoped
 */

import type { Subject, SubjectStatus } from './academic.types';

/**
 * Find subject by ID
 * SECURITY: Filters by school_id
 */
export async function findById(
  db: D1Database,
  id: string,
  schoolId: string
): Promise<Subject | null> {
  const result = await db
    .prepare(
      `SELECT id, school_id, subject_code, name, description, status, created_at, updated_at
       FROM subjects
       WHERE id = ?
         AND school_id = ?
       LIMIT 1`
    )
    .bind(id, schoolId)
    .first<Subject>();

  return result || null;
}

/**
 * Find all subjects for a school
 * SECURITY: Filters by school_id
 */
export async function findAll(
  db: D1Database,
  schoolId: string,
  filters?: {
    status?: SubjectStatus;
  }
): Promise<Subject[]> {
  let query = `SELECT id, school_id, subject_code, name as subject_name, description, status, created_at, updated_at
               FROM subjects
               WHERE school_id = ?`;
  
  const bindings: unknown[] = [schoolId];

  if (filters?.status) {
    query += ' AND status = ?';
    bindings.push(filters.status);
  }

  query += ' ORDER BY name ASC';

  const result = await db
    .prepare(query)
    .bind(...bindings)
    .all<Subject>();

  return result.results || [];
}

/**
 * Find subject by code
 * SECURITY: Filters by school_id
 */
export async function findByCode(
  db: D1Database,
  subjectCode: string,
  schoolId: string
): Promise<Subject | null> {
  const result = await db
    .prepare(
      `SELECT id, school_id, subject_code, name, description, status, created_at, updated_at
       FROM subjects
       WHERE subject_code = ?
         AND school_id = ?
       LIMIT 1`
    )
    .bind(subjectCode, schoolId)
    .first<Subject>();

  return result || null;
}

/**
 * Create subject
 * SECURITY: Sets school_id from authenticated context
 */
export async function create(
  db: D1Database,
  data: {
    id: string;
    school_id: string;
    subject_code: string;
    name: string;
    description: string | null;
    status: SubjectStatus;
  }
): Promise<Subject> {
  const now = new Date().toISOString();

  await db
    .prepare(
      `INSERT INTO subjects (id, school_id, subject_code, name, description, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      data.id,
      data.school_id,
      data.subject_code,
      data.name,
      data.description,
      data.status,
      now,
      now
    )
    .run();

  return {
    id: data.id,
    school_id: data.school_id,
    subject_code: data.subject_code,
    name: data.name,
    description: data.description,
    status: data.status,
    created_at: now,
    updated_at: now,
  };
}

/**
 * Update subject
 * SECURITY: Filters by school_id
 */
export async function update(
  db: D1Database,
  id: string,
  schoolId: string,
  data: {
    subject_code?: string;
    name?: string;
    description?: string;
    status?: SubjectStatus;
  }
): Promise<boolean> {
  const updates: string[] = [];
  const bindings: unknown[] = [];

  if (data.subject_code !== undefined) {
    updates.push('subject_code = ?');
    bindings.push(data.subject_code);
  }

  if (data.name !== undefined) {
    updates.push('name = ?');
    bindings.push(data.name);
  }

  if (data.description !== undefined) {
    updates.push('description = ?');
    bindings.push(data.description);
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
      `UPDATE subjects
       SET ${updates.join(', ')}
       WHERE id = ?
         AND school_id = ?`
    )
    .bind(...bindings)
    .run();

  return result.meta.changes > 0;
}
