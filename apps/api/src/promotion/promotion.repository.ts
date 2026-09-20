/**
 * Promotion Repository
 * 
 * Database access layer for promotion batches, items, and year activation
 */

import type {
  PromotionBatch,
  PromotionItem,
  PromotionBatchWithDetails,
  PromotionCandidate,
  PromotionItemWithDetails,
  CreatePromotionBatchRequest,
  UpsertPromotionItemRequest,
  PromotionBatchStatus,
  EnrollmentStatus,
} from './promotion.types';

/**
 * =====================================================================
 * PROMOTION BATCHES
 * =====================================================================
 */

export async function createPromotionBatch(
  db: D1Database,
  schoolId: string,
  data: CreatePromotionBatchRequest,
  userId: string
): Promise<PromotionBatch> {
  const id = crypto.randomUUID();
  const now = Date.now();

  await db
    .prepare(
      `INSERT INTO promotion_batches (
         id, school_id, from_academic_year_id, to_academic_year_id,
         from_classroom_id, created_by, status, created_at
       )
       VALUES (?, ?, ?, ?, ?, ?, 'draft', ?)`
    )
    .bind(
      id,
      schoolId,
      data.from_academic_year_id,
      data.to_academic_year_id,
      data.from_classroom_id,
      userId,
      now
    )
    .run();

  return {
    id,
    school_id: schoolId,
    from_academic_year_id: data.from_academic_year_id,
    to_academic_year_id: data.to_academic_year_id,
    from_classroom_id: data.from_classroom_id,
    created_by: userId,
    status: 'draft',
    created_at: now,
    planned_at: null,
    applied_at: null,
  };
}

export async function findPromotionBatchById(
  db: D1Database,
  id: string,
  schoolId: string
): Promise<PromotionBatch | null> {
  const result = await db
    .prepare(
      `SELECT id, school_id, from_academic_year_id, to_academic_year_id,
              from_classroom_id, created_by, status, created_at, planned_at, applied_at
       FROM promotion_batches
       WHERE id = ? AND school_id = ?`
    )
    .bind(id, schoolId)
    .first<PromotionBatch>();

  return result || null;
}

export async function listPromotionBatches(
  db: D1Database,
  schoolId: string,
  status?: PromotionBatchStatus
): Promise<PromotionBatchWithDetails[]> {
  let query = `
    SELECT 
      pb.id, pb.school_id, pb.from_academic_year_id, pb.to_academic_year_id,
      pb.from_classroom_id, pb.created_by, pb.status, pb.created_at, pb.planned_at, pb.applied_at,
      fy.label as from_year_label,
      ty.label as to_year_label,
      CAST(fc.grade_name || '-' || fc.division_name AS TEXT) as from_classroom_name,
      COUNT(DISTINCT pi.id) as item_count
    FROM promotion_batches pb
    JOIN academic_years fy ON pb.from_academic_year_id = fy.id
    JOIN academic_years ty ON pb.to_academic_year_id = ty.id
    JOIN classrooms fc ON pb.from_classroom_id = fc.id
    LEFT JOIN promotion_items pi ON pb.id = pi.promotion_batch_id
    WHERE pb.school_id = ?`;

  const params: any[] = [schoolId];

  if (status) {
    query += ` AND pb.status = ?`;
    params.push(status);
  }

  query += ` GROUP BY pb.id ORDER BY pb.created_at DESC`;

  const results = await db.prepare(query).bind(...params).all<PromotionBatchWithDetails>();
  return results.results || [];
}

export async function updateBatchStatus(
  db: D1Database,
  id: string,
  schoolId: string,
  status: PromotionBatchStatus,
  timestamp: number
): Promise<void> {
  const timestampField = status === 'planned' ? 'planned_at' : status === 'applied' ? 'applied_at' : null;

  if (timestampField) {
    await db
      .prepare(
        `UPDATE promotion_batches
         SET status = ?, ${timestampField} = ?
         WHERE id = ? AND school_id = ?`
      )
      .bind(status, timestamp, id, schoolId)
      .run();
  } else {
    await db
      .prepare(
        `UPDATE promotion_batches
         SET status = ?
         WHERE id = ? AND school_id = ?`
      )
      .bind(status, id, schoolId)
      .run();
  }
}

/**
 * =====================================================================
 * PROMOTION ITEMS
 * =====================================================================
 */

export async function upsertPromotionItem(
  db: D1Database,
  batchId: string,
  sourceEnrollmentId: string,
  data: UpsertPromotionItemRequest
): Promise<PromotionItem> {
  const now = Date.now();

  // Check if item exists
  const existing = await db
    .prepare(
      `SELECT id FROM promotion_items
       WHERE promotion_batch_id = ? AND student_id = ?`
    )
    .bind(batchId, data.student_id)
    .first<{ id: string }>();

  if (existing) {
    // Update existing
    await db
      .prepare(
        `UPDATE promotion_items
         SET decision = ?, target_classroom_id = ?, target_roll_number = ?, reason = ?
         WHERE id = ?`
      )
      .bind(
        data.decision,
        data.target_classroom_id || null,
        data.target_roll_number || null,
        data.reason || null,
        existing.id
      )
      .run();

    const updated = await db
      .prepare(
        `SELECT id, promotion_batch_id, student_id, source_enrollment_id,
                target_classroom_id, target_roll_number, decision, reason,
                target_enrollment_id, created_at
         FROM promotion_items
         WHERE id = ?`
      )
      .bind(existing.id)
      .first<PromotionItem>();

    return updated!;
  } else {
    // Insert new
    const id = crypto.randomUUID();

    await db
      .prepare(
        `INSERT INTO promotion_items (
           id, promotion_batch_id, student_id, source_enrollment_id,
           target_classroom_id, target_roll_number, decision, reason, created_at
         )
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        id,
        batchId,
        data.student_id,
        sourceEnrollmentId,
        data.target_classroom_id || null,
        data.target_roll_number || null,
        data.decision,
        data.reason || null,
        now
      )
      .run();

    return {
      id,
      promotion_batch_id: batchId,
      student_id: data.student_id,
      source_enrollment_id: sourceEnrollmentId,
      target_classroom_id: data.target_classroom_id || null,
      target_roll_number: data.target_roll_number || null,
      decision: data.decision,
      reason: data.reason || null,
      target_enrollment_id: null,
      created_at: now,
    };
  }
}

export async function findPromotionItemsByBatch(
  db: D1Database,
  batchId: string
): Promise<PromotionItemWithDetails[]> {
  const query = `
    SELECT 
      pi.id, pi.promotion_batch_id, pi.student_id, pi.source_enrollment_id,
      pi.target_classroom_id, pi.target_roll_number, pi.decision, pi.reason,
      pi.target_enrollment_id, pi.created_at,
      sp.student_code,
      CAST(sp.first_name || ' ' || sp.last_name AS TEXT) as student_name,
      CAST(sc.grade_name || '-' || sc.division_name AS TEXT) as source_classroom_name,
      CASE 
        WHEN pi.target_classroom_id IS NOT NULL 
        THEN CAST(tc.grade_name || '-' || tc.division_name AS TEXT)
        ELSE NULL
      END as target_classroom_name
    FROM promotion_items pi
    JOIN student_profiles sp ON pi.student_id = sp.user_id
    JOIN enrollments e ON pi.source_enrollment_id = e.id
    JOIN classrooms sc ON e.classroom_id = sc.id
    LEFT JOIN classrooms tc ON pi.target_classroom_id = tc.id
    WHERE pi.promotion_batch_id = ?
    ORDER BY sp.student_code ASC`;

  const results = await db.prepare(query).bind(batchId).all<PromotionItemWithDetails>();
  return results.results || [];
}

export async function findPromotionItemById(
  db: D1Database,
  id: string
): Promise<PromotionItem | null> {
  const result = await db
    .prepare(
      `SELECT id, promotion_batch_id, student_id, source_enrollment_id,
              target_classroom_id, target_roll_number, decision, reason,
              target_enrollment_id, created_at
       FROM promotion_items
       WHERE id = ?`
    )
    .bind(id)
    .first<PromotionItem>();

  return result || null;
}

export async function updatePromotionItemTargetEnrollment(
  db: D1Database,
  itemId: string,
  targetEnrollmentId: string
): Promise<void> {
  await db
    .prepare(
      `UPDATE promotion_items
       SET target_enrollment_id = ?
       WHERE id = ?`
    )
    .bind(targetEnrollmentId, itemId)
    .run();
}

/**
 * =====================================================================
 * PROMOTION CANDIDATES
 * =====================================================================
 */

export async function findPromotionCandidates(
  db: D1Database,
  schoolId: string,
  academicYearId: string,
  classroomId: string
): Promise<PromotionCandidate[]> {
  const query = `
    SELECT 
      sp.user_id as student_id,
      sp.student_code,
      CAST(sp.first_name || ' ' || sp.last_name AS TEXT) as student_name,
      e.id as enrollment_id,
      e.classroom_id,
      CAST(c.grade_name || '-' || c.division_name AS TEXT) as classroom_name,
      e.roll_number,
      e.status as enrollment_status,
      tc.id as suggested_target_classroom_id,
      CASE 
        WHEN tc.id IS NOT NULL 
        THEN CAST(tc.grade_name || '-' || tc.division_name AS TEXT)
        ELSE NULL
      END as suggested_target_classroom_name
    FROM enrollments e
    JOIN student_profiles sp ON e.student_id = sp.user_id
    JOIN classrooms c ON e.classroom_id = c.id
    LEFT JOIN classrooms tc ON tc.school_id = c.school_id 
      AND tc.grade_level = c.grade_level + 1
      AND tc.academic_year_id != c.academic_year_id
    WHERE e.school_id = ?
      AND e.academic_year_id = ?
      AND e.classroom_id = ?
      AND e.status IN ('active', 'planned')
      AND sp.status = 'active'
    ORDER BY e.roll_number ASC, sp.student_code ASC`;

  const results = await db
    .prepare(query)
    .bind(schoolId, academicYearId, classroomId)
    .all<PromotionCandidate>();

  return results.results || [];
}

/**
 * =====================================================================
 * ACADEMIC YEAR HELPERS
 * =====================================================================
 */

export async function findAcademicYear(
  db: D1Database,
  yearId: string,
  schoolId: string
): Promise<{ id: string; label: string; status: string; starts_on: string; ends_on: string } | null> {
  const result = await db
    .prepare(
      `SELECT id, label, status, starts_on, ends_on
       FROM academic_years
       WHERE id = ? AND school_id = ?`
    )
    .bind(yearId, schoolId)
    .first<{ id: string; label: string; status: string; starts_on: string; ends_on: string }>();

  return result || null;
}

export async function findClassroom(
  db: D1Database,
  classroomId: string,
  schoolId: string
): Promise<{ id: string; academic_year_id: string; grade_name: string; division_name: string } | null> {
  const result = await db
    .prepare(
      `SELECT id, academic_year_id, grade_name, division_name
       FROM classrooms
       WHERE id = ? AND school_id = ?`
    )
    .bind(classroomId, schoolId)
    .first<{ id: string; academic_year_id: string; grade_name: string; division_name: string }>();

  return result || null;
}

export async function findEnrollment(
  db: D1Database,
  enrollmentId: string,
  schoolId: string
): Promise<{ id: string; student_id: string; classroom_id: string; academic_year_id: string; status: EnrollmentStatus } | null> {
  const result = await db
    .prepare(
      `SELECT id, student_id, classroom_id, academic_year_id, status
       FROM enrollments
       WHERE id = ? AND school_id = ?`
    )
    .bind(enrollmentId, schoolId)
    .first<{ id: string; student_id: string; classroom_id: string; academic_year_id: string; status: EnrollmentStatus }>();

  return result || null;
}

export async function findStudentProfile(
  db: D1Database,
  studentId: string,
  schoolId: string
): Promise<{ user_id: string; student_code: string; first_name: string; last_name: string; status: string } | null> {
  const result = await db
    .prepare(
      `SELECT user_id, student_code, first_name, last_name, status
       FROM student_profiles
       WHERE user_id = ? AND school_id = ?`
    )
    .bind(studentId, schoolId)
    .first<{ user_id: string; student_code: string; first_name: string; last_name: string; status: string }>();

  return result || null;
}

export async function checkConflictingEnrollment(
  db: D1Database,
  studentId: string,
  academicYearId: string,
  schoolId: string
): Promise<boolean> {
  const result = await db
    .prepare(
      `SELECT COUNT(*) as count
       FROM enrollments
       WHERE student_id = ? AND academic_year_id = ? AND school_id = ?
         AND status IN ('active', 'planned')`
    )
    .bind(studentId, academicYearId, schoolId)
    .first<{ count: number }>();

  return (result?.count || 0) > 0;
}

/**
 * =====================================================================
 * ENROLLMENT LIFECYCLE
 * =====================================================================
 */

export async function createEnrollment(
  db: D1Database,
  schoolId: string,
  academicYearId: string,
  classroomId: string,
  studentId: string,
  rollNumber: number | null,
  status: EnrollmentStatus,
  joinedOn: string,
  fromEnrollmentId: string | null
): Promise<string> {
  const id = crypto.randomUUID();
  const now = Date.now();

  await db
    .prepare(
      `INSERT INTO enrollments (
         id, school_id, academic_year_id, classroom_id, student_id,
         roll_number, joined_on, status, from_enrollment_id, created_at, updated_at
       )
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      id,
      schoolId,
      academicYearId,
      classroomId,
      studentId,
      rollNumber,
      joinedOn,
      status,
      fromEnrollmentId,
      now,
      now
    )
    .run();

  return id;
}

export async function completeEnrollment(
  db: D1Database,
  enrollmentId: string,
  outcome: string,
  leftOn: string
): Promise<void> {
  const now = Date.now();

  await db
    .prepare(
      `UPDATE enrollments
       SET status = 'completed', outcome = ?, left_on = ?, updated_at = ?
       WHERE id = ?`
    )
    .bind(outcome, leftOn, now, enrollmentId)
    .run();
}

export async function disableStudent(
  db: D1Database,
  studentId: string
): Promise<void> {
  const now = Date.now();

  await db
    .prepare(
      `UPDATE users
       SET status = 'disabled', token_version = token_version + 1, updated_at = ?
       WHERE id = ?`
    )
    .bind(now, studentId)
    .run();
}

export async function revokeStudentSessions(
  db: D1Database,
  studentId: string
): Promise<number> {
  const now = Date.now();

  const result = await db
    .prepare(
      `UPDATE sessions
       SET revoked_at = ?
       WHERE user_id = ? AND revoked_at IS NULL`
    )
    .bind(now, studentId)
    .run();

  return result.meta?.changes || 0;
}
