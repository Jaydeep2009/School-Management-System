/**
 * Assignments Repository
 * Database access layer for assignments and attachments
 */

import type { D1Database } from '@cloudflare/workers-types';
import type {
  Assignment,
  AssignmentWithDetails,
  AssignmentAttachment,
  AssignmentListFilters,
  AssignmentStatus,
} from './assignments.types';

/**
 * Find assignment by ID
 */
export async function findAssignmentById(
  db: D1Database,
  id: string,
  schoolId: string
): Promise<Assignment | null> {
  const result = await db
    .prepare(
      `SELECT id, school_id, academic_year_id, classroom_id, subject_id,
              created_by, title, description, due_at, status,
              created_at, updated_at
       FROM assignments
       WHERE id = ?
         AND school_id = ?
       LIMIT 1`
    )
    .bind(id, schoolId)
    .first<Assignment>();

  return result || null;
}

/**
 * Find assignment with details
 */
export async function findAssignmentWithDetails(
  db: D1Database,
  id: string,
  schoolId: string
): Promise<AssignmentWithDetails | null> {
  const result = await db
    .prepare(
      `SELECT 
        a.id, a.school_id, a.academic_year_id, a.classroom_id, a.subject_id,
        a.created_by, a.title, a.description, a.due_at, a.status,
        a.created_at, a.updated_at,
        s.name as subject_name,
        c.grade_name || ' ' || c.division_name as classroom_name,
        c.division_name as classroom_section,
        COUNT(aa.id) as attachment_count
       FROM assignments a
       INNER JOIN subjects s ON a.subject_id = s.id
       INNER JOIN classrooms c ON a.classroom_id = c.id
       LEFT JOIN assignment_attachments aa ON a.id = aa.assignment_id
       WHERE a.id = ?
         AND a.school_id = ?
       GROUP BY a.id
       LIMIT 1`
    )
    .bind(id, schoolId)
    .first<any>();

  if (!result) {
    return null;
  }

  return {
    ...result,
    attachment_count: Number(result.attachment_count || 0),
  };
}

/**
 * List assignments with filters
 */
export async function findAssignments(
  db: D1Database,
  schoolId: string,
  filters: AssignmentListFilters = {}
): Promise<AssignmentWithDetails[]> {
  let query = `
    SELECT 
      a.id, a.school_id, a.academic_year_id, a.classroom_id, a.subject_id,
      a.created_by, a.title, a.description, a.due_at, a.status,
      a.created_at, a.updated_at,
      s.name as subject_name,
      c.grade_name || ' ' || c.division_name as classroom_name,
      c.division_name as classroom_section,
      COUNT(aa.id) as attachment_count
    FROM assignments a
    INNER JOIN subjects s ON a.subject_id = s.id
    INNER JOIN classrooms c ON a.classroom_id = c.id
    LEFT JOIN assignment_attachments aa ON a.id = aa.assignment_id
    WHERE a.school_id = ?
  `;

  const bindings: any[] = [schoolId];

  if (filters.academic_year_id) {
    query += ' AND a.academic_year_id = ?';
    bindings.push(filters.academic_year_id);
  }

  if (filters.classroom_id) {
    query += ' AND a.classroom_id = ?';
    bindings.push(filters.classroom_id);
  }

  if (filters.subject_id) {
    query += ' AND a.subject_id = ?';
    bindings.push(filters.subject_id);
  }

  if (filters.status) {
    query += ' AND a.status = ?';
    bindings.push(filters.status);
  }

  query += ' GROUP BY a.id ORDER BY a.due_at ASC NULLS LAST, a.created_at DESC';

  const results = await db.prepare(query).bind(...bindings).all<any>();

  return (results.results || []).map(r => ({
    ...r,
    attachment_count: Number(r.attachment_count || 0),
  }));
}

/**
 * Create assignment
 */
export async function createAssignment(
  db: D1Database,
  data: {
    id: string;
    school_id: string;
    academic_year_id: string;
    classroom_id: string;
    subject_id: string;
    created_by: string;
    title: string;
    description: string | null;
    due_at: number | null;
  }
): Promise<Assignment> {
  const now = Date.now();

  await db
    .prepare(
      `INSERT INTO assignments (
        id, school_id, academic_year_id, classroom_id, subject_id,
        created_by, title, description, due_at, status,
        created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', ?, ?)`
    )
    .bind(
      data.id,
      data.school_id,
      data.academic_year_id,
      data.classroom_id,
      data.subject_id,
      data.created_by,
      data.title,
      data.description,
      data.due_at,
      now,
      now
    )
    .run();

  return {
    id: data.id,
    school_id: data.school_id,
    academic_year_id: data.academic_year_id,
    classroom_id: data.classroom_id,
    subject_id: data.subject_id,
    created_by: data.created_by,
    title: data.title,
    description: data.description,
    due_at: data.due_at,
    status: 'draft',
    created_at: now,
    updated_at: now,
  };
}

/**
 * Update assignment
 */
export async function updateAssignment(
  db: D1Database,
  id: string,
  schoolId: string,
  updates: {
    title?: string;
    description?: string | null;
    due_at?: number | null;
  }
): Promise<void> {
  const fields: string[] = [];
  const bindings: any[] = [];

  if (updates.title !== undefined) {
    fields.push('title = ?');
    bindings.push(updates.title);
  }

  if (updates.description !== undefined) {
    fields.push('description = ?');
    bindings.push(updates.description);
  }

  if (updates.due_at !== undefined) {
    fields.push('due_at = ?');
    bindings.push(updates.due_at);
  }

  if (fields.length === 0) {
    return;
  }

  fields.push('updated_at = ?');
  bindings.push(Date.now());

  bindings.push(id, schoolId);

  await db
    .prepare(
      `UPDATE assignments
       SET ${fields.join(', ')}
       WHERE id = ?
         AND school_id = ?`
    )
    .bind(...bindings)
    .run();
}

/**
 * Update assignment status
 */
export async function updateAssignmentStatus(
  db: D1Database,
  id: string,
  schoolId: string,
  status: AssignmentStatus
): Promise<void> {
  await db
    .prepare(
      `UPDATE assignments
       SET status = ?,
           updated_at = ?
       WHERE id = ?
         AND school_id = ?`
    )
    .bind(status, Date.now(), id, schoolId)
    .run();
}

/**
 * Find attachment by ID
 */
export async function findAttachmentById(
  db: D1Database,
  id: string,
  assignmentId: string
): Promise<AssignmentAttachment | null> {
  const result = await db
    .prepare(
      `SELECT id, assignment_id, file_name, r2_key, content_type,
              size_bytes, uploaded_by, created_at
       FROM assignment_attachments
       WHERE id = ?
         AND assignment_id = ?
       LIMIT 1`
    )
    .bind(id, assignmentId)
    .first<AssignmentAttachment>();

  return result || null;
}

/**
 * Find attachments for assignment
 */
export async function findAttachmentsByAssignment(
  db: D1Database,
  assignmentId: string
): Promise<AssignmentAttachment[]> {
  const results = await db
    .prepare(
      `SELECT id, assignment_id, file_name, r2_key, content_type,
              size_bytes, uploaded_by, created_at
       FROM assignment_attachments
       WHERE assignment_id = ?
       ORDER BY created_at ASC`
    )
    .bind(assignmentId)
    .all<AssignmentAttachment>();

  return results.results || [];
}

/**
 * Create attachment record
 */
export async function createAttachment(
  db: D1Database,
  data: {
    id: string;
    assignment_id: string;
    file_name: string;
    r2_key: string;
    content_type: string | null;
    size_bytes: number | null;
    uploaded_by: string;
  }
): Promise<AssignmentAttachment> {
  const now = Date.now();

  await db
    .prepare(
      `INSERT INTO assignment_attachments (
        id, assignment_id, file_name, r2_key, content_type,
        size_bytes, uploaded_by, created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      data.id,
      data.assignment_id,
      data.file_name,
      data.r2_key,
      data.content_type,
      data.size_bytes,
      data.uploaded_by,
      now
    )
    .run();

  return {
    ...data,
    created_at: now,
  };
}

/**
 * Delete attachment record
 */
export async function deleteAttachment(
  db: D1Database,
  id: string,
  assignmentId: string
): Promise<void> {
  await db
    .prepare(
      `DELETE FROM assignment_attachments
       WHERE id = ?
         AND assignment_id = ?`
    )
    .bind(id, assignmentId)
    .run();
}
