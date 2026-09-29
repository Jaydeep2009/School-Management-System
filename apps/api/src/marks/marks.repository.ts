/**
 * Marks & Assessments Repository
 * Database access layer for assessments and marks
 */

import type { D1Database } from '@cloudflare/workers-types';
import type { 
  Assessment, 
  AssessmentWithDetails, 
  Mark, 
  MarkWithStudent,
  StudentAssessmentSummary 
} from './marks.types';

/**
 * Find assessment by ID
 */
export async function findAssessmentById(
  db: D1Database,
  id: string,
  schoolId: string
): Promise<Assessment | null> {
  const result = await db
    .prepare(
      `SELECT id, school_id, academic_year_id, classroom_id, subject_id, name,
              max_marks, weightage, held_on,
              is_published, is_locked,
              created_by, created_at, updated_at
       FROM assessments
       WHERE id = ?
         AND school_id = ?
       LIMIT 1`
    )
    .bind(id, schoolId)
    .first<any>();

  if (!result) {
    return null;
  }

  return {
    ...result,
    is_published: result.is_published === 1,
    is_locked: result.is_locked === 1,
  };
}

/**
 * Find assessment with details
 */
export async function findAssessmentWithDetails(
  db: D1Database,
  id: string,
  schoolId: string
): Promise<AssessmentWithDetails | null> {
  const result = await db
    .prepare(
      `SELECT 
        a.id, a.school_id, a.academic_year_id, a.classroom_id, a.subject_id, a.name,
        a.max_marks, a.weightage, a.held_on,
        a.is_published, a.is_locked,
        a.created_by, a.created_at, a.updated_at,
        s.name as subject_name,
        (c.grade_name || '-' || c.division_name) as classroom_name
       FROM assessments a
       INNER JOIN subjects s ON a.subject_id = s.id
       INNER JOIN classrooms c ON a.classroom_id = c.id
       WHERE a.id = ?
         AND a.school_id = ?
       LIMIT 1`
    )
    .bind(id, schoolId)
    .first<any>();

  if (!result) {
    return null;
  }

  return {
    ...result,
    is_published: result.is_published === 1,
    is_locked: result.is_locked === 1,
  };
}

/**
 * List assessments with filters
 */
export async function findAssessments(
  db: D1Database,
  schoolId: string,
  filters: {
    academic_year_id?: string;
    classroom_id?: string;
    subject_id?: string;
    is_published?: boolean;
  } = {}
): Promise<AssessmentWithDetails[]> {
  let query = `
    SELECT 
      a.id, a.school_id, a.academic_year_id, a.classroom_id, a.subject_id, a.name,
      a.max_marks, a.weightage, a.held_on,
      a.is_published, a.is_locked,
      a.created_by, a.created_at, a.updated_at,
      s.name as subject_name,
      (c.grade_name || '-' || c.division_name) as classroom_name
    FROM assessments a
    INNER JOIN subjects s ON a.subject_id = s.id
    INNER JOIN classrooms c ON a.classroom_id = c.id
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

  if (filters.is_published !== undefined) {
    query += ' AND a.is_published = ?';
    bindings.push(filters.is_published ? 1 : 0);
  }

  query += ' ORDER BY a.held_on DESC, a.created_at DESC';

  const results = await db.prepare(query).bind(...bindings).all<any>();

  return (results.results || []).map(r => ({
    ...r,
    is_published: r.is_published === 1,
    is_locked: r.is_locked === 1,
  }));
}

/**
 * Check if assessment exists
 */
export async function assessmentExists(
  db: D1Database,
  classroomId: string,
  subjectId: string,
  name: string,
  schoolId: string,
  excludeId?: string
): Promise<boolean> {
  let query = `
    SELECT 1
    FROM assessments
    WHERE classroom_id = ?
      AND subject_id = ?
      AND name = ?
      AND school_id = ?
  `;

  const bindings: any[] = [classroomId, subjectId, name, schoolId];

  if (excludeId) {
    query += ' AND id != ?';
    bindings.push(excludeId);
  }

  query += ' LIMIT 1';

  const result = await db.prepare(query).bind(...bindings).first();
  return result !== null;
}

/**
 * Create assessment
 */
export async function createAssessment(
  db: D1Database,
  data: {
    id: string;
    school_id: string;
    academic_year_id: string;
    classroom_id: string;
    subject_id: string;
    name: string;
    max_marks: number;
    weightage: number | null;
    held_on: string | null;
    created_by: string;
  }
): Promise<Assessment> {
  const now = Date.now();

  const result = await db
    .prepare(
      `INSERT INTO assessments (
        id, school_id, academic_year_id, classroom_id, subject_id, name,
        max_marks, weightage, held_on,
        is_published, is_locked,
        created_by, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, ?, ?, ?)`
    )
    .bind(
      data.id,
      data.school_id,
      data.academic_year_id,
      data.classroom_id,
      data.subject_id,
      data.name,
      data.max_marks,
      data.weightage,
      data.held_on,
      data.created_by,
      now,
      now
    )
    .run();

  // Check if insert was successful
  if (!result.success) {
    throw new Error(`Failed to create assessment: ${result.error || 'Unknown error'}`);
  }

  return {
    id: data.id,
    school_id: data.school_id,
    academic_year_id: data.academic_year_id,
    classroom_id: data.classroom_id,
    subject_id: data.subject_id,
    name: data.name,
    max_marks: data.max_marks,
    weightage: data.weightage,
    held_on: data.held_on,
    is_published: false,
    is_locked: false,
    created_by: data.created_by,
    created_at: now,
    updated_at: now,
  };
}

/**
 * Update assessment
 */
export async function updateAssessment(
  db: D1Database,
  id: string,
  schoolId: string,
  updates: {
    name?: string;
    max_marks?: number;
    weightage?: number;
    held_on?: string;
  }
): Promise<void> {
  const fields: string[] = [];
  const bindings: any[] = [];

  if (updates.name !== undefined) {
    fields.push('name = ?');
    bindings.push(updates.name);
  }

  if (updates.max_marks !== undefined) {
    fields.push('max_marks = ?');
    bindings.push(updates.max_marks);
  }

  if (updates.weightage !== undefined) {
    fields.push('weightage = ?');
    bindings.push(updates.weightage);
  }

  if (updates.held_on !== undefined) {
    fields.push('held_on = ?');
    bindings.push(updates.held_on);
  }

  if (fields.length === 0) {
    return;
  }

  fields.push('updated_at = ?');
  bindings.push(Date.now());

  bindings.push(id, schoolId);

  await db
    .prepare(
      `UPDATE assessments
       SET ${fields.join(', ')}
       WHERE id = ?
         AND school_id = ?`
    )
    .bind(...bindings)
    .run();
}

/**
 * Publish assessment
 */
export async function publishAssessment(
  db: D1Database,
  id: string,
  schoolId: string
): Promise<void> {
  await db
    .prepare(
      `UPDATE assessments
       SET is_published = 1,
           updated_at = ?
       WHERE id = ?
         AND school_id = ?`
    )
    .bind(Date.now(), id, schoolId)
    .run();
}

/**
 * Lock assessment
 */
export async function lockAssessment(
  db: D1Database,
  id: string,
  schoolId: string
): Promise<void> {
  await db
    .prepare(
      `UPDATE assessments
       SET is_locked = 1,
           updated_at = ?
       WHERE id = ?
         AND school_id = ?`
    )
    .bind(Date.now(), id, schoolId)
    .run();
}

/**
 * Unlock assessment
 */
export async function unlockAssessment(
  db: D1Database,
  id: string,
  schoolId: string
): Promise<void> {
  await db
    .prepare(
      `UPDATE assessments
       SET is_locked = 0,
           updated_at = ?
       WHERE id = ?
         AND school_id = ?`
    )
    .bind(Date.now(), id, schoolId)
    .run();
}

/**
 * Find marks for assessment
 */
export async function findMarksByAssessment(
  db: D1Database,
  assessmentId: string,
  schoolId: string
): Promise<MarkWithStudent[]> {
  const results = await db
    .prepare(
      `SELECT 
        a.id as assessment_id,
        e.student_id,
        e.id as enrollment_id,
        m.marks_obtained,
        COALESCE(m.status, 'graded') as status,
        m.updated_by,
        m.updated_at,
        sp.student_code,
        sp.first_name || ' ' || COALESCE(sp.middle_name || ' ', '') || sp.last_name as student_name,
        e.roll_number
       FROM assessments a
       INNER JOIN enrollments e ON e.classroom_id = a.classroom_id 
         AND e.academic_year_id = a.academic_year_id
         AND e.status IN ('active', 'planned')
       INNER JOIN student_profiles sp ON e.student_id = sp.user_id
       LEFT JOIN marks m ON m.assessment_id = a.id AND m.student_id = e.student_id
       WHERE a.id = ?
         AND a.school_id = ?
       ORDER BY e.roll_number, sp.student_code`
    )
    .bind(assessmentId, schoolId)
    .all<MarkWithStudent>();

  return results.results || [];
}

/**
 * Find student marks
 */
export async function findStudentMarks(
  db: D1Database,
  studentId: string,
  schoolId: string,
  filters: {
    academic_year_id?: string;
    classroom_id?: string;
    subject_id?: string;
    published_only?: boolean;
  } = {}
): Promise<StudentAssessmentSummary[]> {
  let query = `
    SELECT 
      a.id as assessment_id,
      a.name as assessment_name,
      a.subject_id,
      s.name as subject_name,
      a.max_marks,
      a.weightage,
      m.marks_obtained,
      m.status,
      a.held_on,
      a.is_published
    FROM marks m
    INNER JOIN assessments a ON m.assessment_id = a.id
    INNER JOIN subjects s ON a.subject_id = s.id
    WHERE m.student_id = ?
      AND a.school_id = ?
  `;

  const bindings: any[] = [studentId, schoolId];

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

  if (filters.published_only) {
    query += ' AND a.is_published = 1';
  }

  query += ' ORDER BY a.held_on DESC, a.created_at DESC';

  const results = await db.prepare(query).bind(...bindings).all<any>();

  return (results.results || []).map(r => ({
    ...r,
    is_published: r.is_published === 1,
  }));
}

/**
 * Get classroom marks report
 */
export async function getClassroomMarksReport(
  db: D1Database,
  classroomId: string,
  schoolId: string,
  filters: {
    subject_id?: string;
    assessment_id?: string;
  } = {}
): Promise<any[]> {
  let query = `
    SELECT 
      sp.user_id as student_id,
      sp.student_code,
      sp.first_name || ' ' || COALESCE(sp.middle_name || ' ', '') || sp.last_name as student_name,
      e.roll_number,
      a.id as assessment_id,
      a.name as assessment_name,
      a.max_marks,
      m.marks_obtained,
      m.status
    FROM enrollments e
    INNER JOIN student_profiles sp ON e.student_id = sp.user_id
    INNER JOIN assessments a ON e.classroom_id = a.classroom_id
    LEFT JOIN marks m ON a.id = m.assessment_id AND e.student_id = m.student_id
    WHERE e.classroom_id = ?
      AND e.school_id = ?
      AND e.status = 'active'
      AND a.school_id = ?
  `;

  const bindings: any[] = [classroomId, schoolId, schoolId];

  if (filters.subject_id) {
    query += ' AND a.subject_id = ?';
    bindings.push(filters.subject_id);
  }

  if (filters.assessment_id) {
    query += ' AND a.id = ?';
    bindings.push(filters.assessment_id);
  }

  query += ' ORDER BY e.roll_number, sp.student_code, a.held_on DESC';

  const results = await db.prepare(query).bind(...bindings).all<any>();

  return results.results || [];
}
