/**
 * Promotion Service
 * Handles student promotion logic
 */

import type { D1Database } from '@cloudflare/workers-types';
import type { TenantContext } from '../auth/tenant.context';
import { PromotionError } from './promotion.errors';
import type {
  PromoteStudentRequest,
  BulkPromotionRequest,
  PromotionPreview,
  PromotionPreviewStudent,
  PromotionResult,
  PromotionAction
} from './promotion.types';

/**
 * Get promotion preview for a classroom
 */
export async function getPromotionPreview(
  db: D1Database,
  classroomId: string,
  academicYearId: string,
  tenant: TenantContext
): Promise<PromotionPreview> {
  // Get classroom details
  const classroom = await db
    .prepare(
      `SELECT id, grade_level, grade_name, division_name 
       FROM classrooms 
       WHERE id = ? AND school_id = ?`
    )
    .bind(classroomId, tenant.schoolId)
    .first<{ id: string; grade_level: number; grade_name: string; division_name: string }>();

  if (!classroom) {
    throw PromotionError.classroomNotFound(classroomId);
  }

  // Get all active enrollments in this classroom for the academic year
  const enrollments = await db
    .prepare(
      `SELECT 
         e.id as enrollment_id,
         e.student_id,
         e.roll_number,
         sp.first_name || ' ' || sp.last_name as student_name,
         c.grade_level as current_grade
       FROM enrollments e
       JOIN student_profiles sp ON e.student_id = sp.user_id
       JOIN classrooms c ON e.classroom_id = c.id
       WHERE e.classroom_id = ? 
         AND e.academic_year_id = ? 
         AND e.school_id = ?
         AND e.status = 'active'
       ORDER BY e.roll_number`
    )
    .bind(classroomId, academicYearId, tenant.schoolId)
    .all<{
      enrollment_id: string;
      student_id: string;
      student_name: string;
      roll_number: string;
      current_grade: number;
    }>();

  const students: PromotionPreviewStudent[] = (enrollments.results || []).map(e => {
    // Suggest action based on grade
    let suggestedAction: PromotionAction = 'promote';
    let suggestedNewGrade: number | undefined = e.current_grade + 1;

    if (e.current_grade >= 12) {
      suggestedAction = 'graduate';
      suggestedNewGrade = undefined;
    }

    return {
      enrollment_id: e.enrollment_id,
      student_id: e.student_id,
      student_name: e.student_name,
      roll_number: e.roll_number,
      current_grade: e.current_grade,
      suggested_action: suggestedAction,
      suggested_new_grade: suggestedNewGrade
    };
  });

  return {
    classroom_id: classroomId,
    classroom_name: `${classroom.grade_name}-${classroom.division_name}`,
    current_grade: classroom.grade_level,
    total_students: students.length,
    students
  };
}

/**
 * Promote a single student
 */
export async function promoteStudent(
  db: D1Database,
  request: PromoteStudentRequest,
  tenant: TenantContext
): Promise<void> {
  // Get current enrollment
  const enrollment = await db
    .prepare(
      `SELECT e.*, c.grade_level as current_grade
       FROM enrollments e
       JOIN classrooms c ON e.classroom_id = c.id
       WHERE e.id = ? AND e.school_id = ?`
    )
    .bind(request.enrollment_id, tenant.schoolId)
    .first<{
      id: string;
      student_id: string;
      classroom_id: string;
      academic_year_id: string;
      status: string;
      current_grade: number;
    }>();

  if (!enrollment) {
    throw PromotionError.enrollmentNotFound(request.enrollment_id);
  }

  if (enrollment.status === 'graduated') {
    throw PromotionError.cannotPromoteGraduated();
  }

  // Check if student already has enrollment in new academic year
  const existingEnrollment = await db
    .prepare(
      `SELECT id FROM enrollments 
       WHERE student_id = ? 
         AND academic_year_id = ? 
         AND school_id = ?`
    )
    .bind(enrollment.student_id, request.new_academic_year_id, tenant.schoolId)
    .first();

  if (existingEnrollment) {
    throw PromotionError.alreadyPromoted(request.enrollment_id);
  }

  const now = Date.now();

  // Handle different promotion actions
  switch (request.action) {
    case 'promote':
    case 'retain':
      if (!request.new_classroom_id) {
        throw new PromotionError('new_classroom_id is required for promote/retain actions', 'MISSING_CLASSROOM', 400);
      }

      // Create new enrollment in new academic year
      const newEnrollmentId = crypto.randomUUID();
      await db
        .prepare(
          `INSERT INTO enrollments (
             id, student_id, classroom_id, academic_year_id, school_id,
             status, joined_on, created_at, updated_at
           ) VALUES (?, ?, ?, ?, ?, 'active', ?, ?, ?)`
        )
        .bind(
          newEnrollmentId,
          enrollment.student_id,
          request.new_classroom_id,
          request.new_academic_year_id,
          tenant.schoolId,
          now,
          now,
          now
        )
        .run();

      // Update old enrollment to completed
      await db
        .prepare(
          `UPDATE enrollments 
           SET status = 'completed', updated_at = ? 
           WHERE id = ?`
        )
        .bind(now, request.enrollment_id)
        .run();
      break;

    case 'graduate':
      // Update enrollment status to graduated
      await db
        .prepare(
          `UPDATE enrollments 
           SET status = 'graduated', updated_at = ? 
           WHERE id = ?`
        )
        .bind(now, request.enrollment_id)
        .run();
      break;

    case 'dropout':
      // Update enrollment status to inactive
      await db
        .prepare(
          `UPDATE enrollments 
           SET status = 'inactive', updated_at = ? 
           WHERE id = ?`
        )
        .bind(now, request.enrollment_id)
        .run();
      break;

    default:
      throw PromotionError.invalidAction(request.action);
  }
}

/**
 * Bulk promote students from a classroom
 */
export async function bulkPromoteStudents(
  db: D1Database,
  request: BulkPromotionRequest,
  tenant: TenantContext
): Promise<PromotionResult> {
  const errors: string[] = [];
  const promotedEnrollments: string[] = [];
  let successCount = 0;
  let failedCount = 0;

  // Get current classroom details to determine target classroom
  const currentClassroom = await db
    .prepare(
      `SELECT grade_level, grade_name, division_name 
       FROM classrooms 
       WHERE id = ? AND school_id = ?`
    )
    .bind(request.classroom_id, tenant.schoolId)
    .first<{ grade_level: number; grade_name: string; division_name: string }>();

  if (!currentClassroom) {
    throw new PromotionError('Current classroom not found', 'CLASSROOM_NOT_FOUND', 404);
  }

  // Get or create target classroom
  let targetClassroomId: string | null = null;
  
  if (request.action === 'promote') {
    const newGradeLevel = currentClassroom.grade_level + 1;
    const newGradeName = `Grade ${newGradeLevel}`;
    const divisionName = currentClassroom.division_name;
    const classroomCode = `${newGradeName}-${divisionName}`;

    // Try to find existing classroom
    let targetClassroom = await db
      .prepare(
        `SELECT id FROM classrooms 
         WHERE school_id = ? 
           AND academic_year_id = ?
           AND grade_level = ? 
           AND division_name = ?
         LIMIT 1`
      )
      .bind(tenant.schoolId, request.new_academic_year_id, newGradeLevel, divisionName)
      .first<{ id: string }>();

    // If doesn't exist, create it
    if (!targetClassroom) {
      const newClassroomId = crypto.randomUUID();
      const now = Date.now();
      
      await db
        .prepare(
          `INSERT INTO classrooms (
             id, school_id, academic_year_id, classroom_code, 
             grade_name, division_name, grade_level, status, 
             created_at, updated_at
           ) VALUES (?, ?, ?, ?, ?, ?, ?, 'active', ?, ?)`
        )
        .bind(
          newClassroomId,
          tenant.schoolId,
          request.new_academic_year_id,
          classroomCode,
          newGradeName,
          divisionName,
          newGradeLevel,
          now,
          now
        )
        .run();
      
      targetClassroomId = newClassroomId;
      console.log(`[Promotion] Auto-created classroom ${classroomCode} for academic year`);
    } else {
      targetClassroomId = targetClassroom.id;
    }
  }

  // If retaining, need to find/create same grade classroom in new year
  if (request.action === 'retain') {
    const classroomCode = `${currentClassroom.grade_name}-${currentClassroom.division_name}`;
    
    // Try to find existing classroom
    let targetClassroom = await db
      .prepare(
        `SELECT id FROM classrooms 
         WHERE school_id = ? 
           AND academic_year_id = ?
           AND grade_level = ? 
           AND division_name = ?
         LIMIT 1`
      )
      .bind(tenant.schoolId, request.new_academic_year_id, currentClassroom.grade_level, currentClassroom.division_name)
      .first<{ id: string }>();

    // If doesn't exist, create it
    if (!targetClassroom) {
      const newClassroomId = crypto.randomUUID();
      const now = Date.now();
      
      await db
        .prepare(
          `INSERT INTO classrooms (
             id, school_id, academic_year_id, classroom_code, 
             grade_name, division_name, grade_level, status, 
             created_at, updated_at
           ) VALUES (?, ?, ?, ?, ?, ?, ?, 'active', ?, ?)`
        )
        .bind(
          newClassroomId,
          tenant.schoolId,
          request.new_academic_year_id,
          classroomCode,
          currentClassroom.grade_name,
          currentClassroom.division_name,
          currentClassroom.grade_level,
          now,
          now
        )
        .run();
      
      targetClassroomId = newClassroomId;
      console.log(`[Promotion] Auto-created classroom ${classroomCode} for retention`);
    } else {
      targetClassroomId = targetClassroom.id;
    }
  }

  // Get students to promote
  let query = `
    SELECT e.id as enrollment_id, e.student_id, sp.first_name || ' ' || sp.last_name as student_name
    FROM enrollments e
    JOIN student_profiles sp ON e.student_id = sp.user_id
    WHERE e.classroom_id = ? 
      AND e.academic_year_id = ? 
      AND e.school_id = ?
      AND e.status = 'active'
  `;

  const bindings: unknown[] = [request.classroom_id, request.current_academic_year_id, tenant.schoolId];

  // Filter by specific students if provided
  if (request.student_ids && request.student_ids.length > 0) {
    query += ` AND e.student_id IN (${request.student_ids.map(() => '?').join(',')})`;
    bindings.push(...request.student_ids);
  }

  const enrollments = await db
    .prepare(query)
    .bind(...bindings)
    .all<{ enrollment_id: string; student_id: string; student_name: string }>();

  // Process each student
  for (const enrollment of enrollments.results || []) {
    try {
      await promoteStudent(
        db,
        {
          enrollment_id: enrollment.enrollment_id,
          action: request.action,
          new_classroom_id: targetClassroomId || undefined,
          new_academic_year_id: request.new_academic_year_id,
          remarks: request.remarks
        },
        tenant
      );
      successCount++;
      promotedEnrollments.push(enrollment.enrollment_id);
    } catch (error) {
      failedCount++;
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      errors.push(`${enrollment.student_name}: ${errorMsg}`);
      console.error(`Failed to promote ${enrollment.student_name}:`, error);
    }
  }

  return {
    success_count: successCount,
    failed_count: failedCount,
    errors,
    promoted_enrollments: promotedEnrollments
  };
}
