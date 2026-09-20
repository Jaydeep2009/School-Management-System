/**
 * Database Integrity Checks
 * 
 * These checks detect violations of business rules that cannot be safely
 * expressed as simple row constraints in SQLite.
 * 
 * Each check returns rows that violate the rule.
 * An empty result means the database is healthy for that rule.
 * 
 * DO NOT implement these as SQLite triggers - they require cross-row or
 * cross-table lookups that would be unsafe or inefficient as triggers.
 */

import type { D1Database } from '@cloudflare/workers-types';

export interface IntegrityViolation {
  checkName: string;
  violationCount: number;
  sampleRows: unknown[];
}

/**
 * Check if any marks exceed the assessment's max_marks
 */
export async function checkMarksOverMax(db: D1Database): Promise<IntegrityViolation> {
  const result = await db
    .prepare(
      `SELECT 
        m.assessment_id,
        m.student_id,
        m.marks_obtained,
        a.max_marks,
        a.name as assessment_name
      FROM marks m
      JOIN assessments a ON a.id = m.assessment_id
      WHERE m.status = 'graded' 
        AND m.marks_obtained > a.max_marks
      LIMIT 10`
    )
    .all();

  return {
    checkName: 'marks_over_max',
    violationCount: result.results?.length || 0,
    sampleRows: result.results || [],
  };
}

/**
 * Check if any attendance entry belongs to wrong classroom
 * (student's enrollment classroom must match the session's classroom)
 */
export async function checkAttendanceWrongClassroom(db: D1Database): Promise<IntegrityViolation> {
  const result = await db
    .prepare(
      `SELECT 
        ae.session_id,
        ae.student_id,
        ae.enrollment_id,
        e.classroom_id as enrollment_classroom,
        ats.classroom_id as session_classroom
      FROM attendance_entries ae
      JOIN enrollments e ON e.id = ae.enrollment_id
      JOIN attendance_sessions ats ON ats.id = ae.session_id
      WHERE e.classroom_id <> ats.classroom_id
      LIMIT 10`
    )
    .all();

  return {
    checkName: 'attendance_entry_wrong_classroom',
    violationCount: result.results?.length || 0,
    sampleRows: result.results || [],
  };
}

/**
 * Check if any attendance entry is outside the enrollment period
 */
export async function checkAttendanceOutsideEnrollment(db: D1Database): Promise<IntegrityViolation> {
  const result = await db
    .prepare(
      `SELECT 
        ae.session_id,
        ae.student_id,
        ae.enrollment_id,
        ats.session_date,
        e.joined_on,
        e.left_on,
        e.status as enrollment_status
      FROM attendance_entries ae
      JOIN enrollments e ON e.id = ae.enrollment_id
      JOIN attendance_sessions ats ON ats.id = ae.session_id
      WHERE ats.session_date < e.joined_on
         OR (e.left_on IS NOT NULL AND ats.session_date > e.left_on)
      LIMIT 10`
    )
    .all();

  return {
    checkName: 'attendance_entry_outside_enrollment',
    violationCount: result.results?.length || 0,
    sampleRows: result.results || [],
  };
}

/**
 * Check if any marks belong to wrong classroom
 */
export async function checkMarksWrongClassroom(db: D1Database): Promise<IntegrityViolation> {
  const result = await db
    .prepare(
      `SELECT 
        m.assessment_id,
        m.student_id,
        m.enrollment_id,
        e.classroom_id as enrollment_classroom,
        a.classroom_id as assessment_classroom
      FROM marks m
      JOIN enrollments e ON e.id = m.enrollment_id
      JOIN assessments a ON a.id = m.assessment_id
      WHERE e.classroom_id <> a.classroom_id
      LIMIT 10`
    )
    .all();

  return {
    checkName: 'marks_wrong_classroom',
    violationCount: result.results?.length || 0,
    sampleRows: result.results || [],
  };
}

/**
 * Check if promotion target classroom belongs to wrong year
 */
export async function checkPromotionTargetWrongYear(db: D1Database): Promise<IntegrityViolation> {
  const result = await db
    .prepare(
      `SELECT 
        pi.id as promotion_item_id,
        pi.student_id,
        pb.to_academic_year_id as batch_target_year,
        c.academic_year_id as target_classroom_year
      FROM promotion_items pi
      JOIN promotion_batches pb ON pb.id = pi.promotion_batch_id
      LEFT JOIN classrooms c ON c.id = pi.target_classroom_id
      WHERE pi.target_classroom_id IS NOT NULL
        AND c.academic_year_id <> pb.to_academic_year_id
      LIMIT 10`
    )
    .all();

  return {
    checkName: 'promotion_target_wrong_year',
    violationCount: result.results?.length || 0,
    sampleRows: result.results || [],
  };
}

/**
 * Check if promotion source enrollment belongs to wrong class
 */
export async function checkPromotionSourceWrongClass(db: D1Database): Promise<IntegrityViolation> {
  const result = await db
    .prepare(
      `SELECT 
        pi.id as promotion_item_id,
        pi.student_id,
        pb.from_classroom_id as batch_classroom,
        e.classroom_id as source_enrollment_classroom
      FROM promotion_items pi
      JOIN promotion_batches pb ON pb.id = pi.promotion_batch_id
      JOIN enrollments e ON e.id = pi.source_enrollment_id
      WHERE e.classroom_id <> pb.from_classroom_id
      LIMIT 10`
    )
    .all();

  return {
    checkName: 'promotion_source_wrong_class',
    violationCount: result.results?.length || 0,
    sampleRows: result.results || [],
  };
}

/**
 * Check if any active enrollment exists in non-current year
 */
export async function checkActiveEnrollmentInNonCurrentYear(db: D1Database): Promise<IntegrityViolation> {
  const result = await db
    .prepare(
      `SELECT 
        e.id as enrollment_id,
        e.student_id,
        e.academic_year_id,
        ay.status as year_status,
        e.status as enrollment_status
      FROM enrollments e
      JOIN academic_years ay ON ay.id = e.academic_year_id
      WHERE e.status = 'active'
        AND ay.status <> 'current'
      LIMIT 10`
    )
    .all();

  return {
    checkName: 'active_enrollment_in_non_current_year',
    violationCount: result.results?.length || 0,
    sampleRows: result.results || [],
  };
}

/**
 * Check if any planned enrollment exists in already-started year
 */
export async function checkPlannedEnrollmentInStartedYear(db: D1Database): Promise<IntegrityViolation> {
  const result = await db
    .prepare(
      `SELECT 
        e.id as enrollment_id,
        e.student_id,
        e.academic_year_id,
        ay.status as year_status,
        e.status as enrollment_status
      FROM enrollments e
      JOIN academic_years ay ON ay.id = e.academic_year_id
      WHERE e.status = 'planned'
        AND ay.status IN ('current', 'closed')
      LIMIT 10`
    )
    .all();

  return {
    checkName: 'planned_enrollment_in_started_year',
    violationCount: result.results?.length || 0,
    sampleRows: result.results || [],
  };
}

/**
 * Check if any withdrawn student still has live enrollments
 */
export async function checkWithdrawnStudentStillLive(db: D1Database): Promise<IntegrityViolation> {
  const result = await db
    .prepare(
      `SELECT 
        sp.user_id as student_id,
        sp.status as student_status,
        e.id as enrollment_id,
        e.status as enrollment_status
      FROM student_profiles sp
      JOIN enrollments e ON e.student_id = sp.user_id
      WHERE sp.status = 'withdrawn'
        AND e.status IN ('active', 'planned')
      LIMIT 10`
    )
    .all();

  return {
    checkName: 'withdrawn_student_still_live',
    violationCount: result.results?.length || 0,
    sampleRows: result.results || [],
  };
}

/**
 * Run all integrity checks and return results
 */
export async function runAllIntegrityChecks(db: D1Database): Promise<IntegrityViolation[]> {
  const checks = [
    checkMarksOverMax,
    checkAttendanceWrongClassroom,
    checkAttendanceOutsideEnrollment,
    checkMarksWrongClassroom,
    checkPromotionTargetWrongYear,
    checkPromotionSourceWrongClass,
    checkActiveEnrollmentInNonCurrentYear,
    checkPlannedEnrollmentInStartedYear,
    checkWithdrawnStudentStillLive,
  ];

  const results = await Promise.all(checks.map((check) => check(db)));
  return results.filter((result) => result.violationCount > 0);
}
