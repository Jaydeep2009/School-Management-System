/**
 * Promotion Service
 * 
 * Business logic for promotion batches, decisions, planning, application, and year activation
 */

import { randomUUID } from 'node:crypto';
import type { TenantContext } from '../auth/auth.types';
import type {
  PromotionBatch,
  PromotionItem,
  PromotionBatchWithDetails,
  PromotionCandidate,
  PromotionItemWithDetails,
  CreatePromotionBatchRequest,
  UpsertPromotionItemRequest,
  ActivationPrecheckResult,
  ActivationResult,
  ActivationIssue,
  UnresolvedStudent,
} from './promotion.types';
import * as promotionRepo from './promotion.repository';
import * as promotionAuthz from './promotion.authorization';
import { PromotionError } from './promotion.errors';
import { logAudit } from '../lib/audit/audit.service';

/**
 * =====================================================================
 * PROMOTION BATCHES
 * =====================================================================
 */

export async function createPromotionBatch(
  db: D1Database,
  tenant: TenantContext,
  data: CreatePromotionBatchRequest
): Promise<PromotionBatch> {
  promotionAuthz.ensureCanManagePromotions(tenant);

  // Validate source and target years
  const fromYear = await promotionRepo.findAcademicYear(db, data.from_academic_year_id, tenant.schoolId);
  if (!fromYear) {
    throw PromotionError.yearNotFound(data.from_academic_year_id);
  }

  const toYear = await promotionRepo.findAcademicYear(db, data.to_academic_year_id, tenant.schoolId);
  if (!toYear) {
    throw PromotionError.yearNotFound(data.to_academic_year_id);
  }

  // Validate chronological order
  if (fromYear.starts_on >= toYear.starts_on) {
    throw PromotionError.invalidYearOrder();
  }

  // Validate source classroom
  const fromClassroom = await promotionRepo.findClassroom(db, data.from_classroom_id, tenant.schoolId);
  if (!fromClassroom) {
    throw PromotionError.classroomNotFound(data.from_classroom_id);
  }

  if (fromClassroom.academic_year_id !== data.from_academic_year_id) {
    throw PromotionError.sourceClassroomInvalid(data.from_classroom_id, data.from_academic_year_id);
  }

  const batch = await promotionRepo.createPromotionBatch(db, tenant.schoolId, data, tenant.userId);

  // Audit log
  await logAudit(db, tenant, 'promotion_batch_created', 'promotion_batch', batch.id, null, batch);

  return batch;
}

export async function listPromotionBatches(
  db: D1Database,
  tenant: TenantContext,
  status?: 'draft' | 'planned' | 'applied' | 'cancelled'
): Promise<PromotionBatchWithDetails[]> {
  promotionAuthz.ensureCanViewPromotions(tenant);

  return await promotionRepo.listPromotionBatches(db, tenant.schoolId, status);
}

export async function getPromotionBatch(
  db: D1Database,
  batchId: string,
  tenant: TenantContext
): Promise<PromotionBatch> {
  promotionAuthz.ensureCanViewPromotions(tenant);

  const batch = await promotionRepo.findPromotionBatchById(db, batchId, tenant.schoolId);
  if (!batch) {
    throw PromotionError.batchNotFound(batchId);
  }

  return batch;
}

/**
 * =====================================================================
 * PROMOTION CANDIDATES
 * =====================================================================
 */

export async function getPromotionCandidates(
  db: D1Database,
  academicYearId: string,
  classroomId: string,
  tenant: TenantContext
): Promise<PromotionCandidate[]> {
  promotionAuthz.ensureCanViewPromotions(tenant);

  // Validate year and classroom
  const year = await promotionRepo.findAcademicYear(db, academicYearId, tenant.schoolId);
  if (!year) {
    throw PromotionError.yearNotFound(academicYearId);
  }

  const classroom = await promotionRepo.findClassroom(db, classroomId, tenant.schoolId);
  if (!classroom) {
    throw PromotionError.classroomNotFound(classroomId);
  }

  if (classroom.academic_year_id !== academicYearId) {
    throw PromotionError.sourceClassroomInvalid(classroomId, academicYearId);
  }

  return await promotionRepo.findPromotionCandidates(db, tenant.schoolId, academicYearId, classroomId);
}

/**
 * =====================================================================
 * PROMOTION ITEMS
 * =====================================================================
 */

export async function upsertPromotionItem(
  db: D1Database,
  batchId: string,
  tenant: TenantContext,
  data: UpsertPromotionItemRequest
): Promise<PromotionItem> {
  promotionAuthz.ensureCanManagePromotions(tenant);

  const batch = await promotionRepo.findPromotionBatchById(db, batchId, tenant.schoolId);
  if (!batch) {
    throw PromotionError.batchNotFound(batchId);
  }

  // Can only modify draft batches
  if (batch.status !== 'draft') {
    throw PromotionError.batchInvalidStatus(batchId, batch.status, 'draft');
  }

  // Validate student
  const student = await promotionRepo.findStudentProfile(db, data.student_id, tenant.schoolId);
  if (!student) {
    throw PromotionError.studentNotFound(data.student_id);
  }

  // Find student's active enrollment in source year
  const candidates = await promotionRepo.findPromotionCandidates(
    db,
    tenant.schoolId,
    batch.from_academic_year_id,
    batch.from_classroom_id
  );

  const candidate = candidates.find(c => c.student_id === data.student_id);
  if (!candidate) {
    throw PromotionError.noActiveEnrollment(data.student_id);
  }

  // Validate target classroom for promote/retain
  if (data.decision === 'promote' || data.decision === 'retain') {
    if (!data.target_classroom_id) {
      throw PromotionError.targetRequired(data.decision);
    }

    const targetClassroom = await promotionRepo.findClassroom(db, data.target_classroom_id, tenant.schoolId);
    if (!targetClassroom) {
      throw PromotionError.classroomNotFound(data.target_classroom_id);
    }

    if (targetClassroom.academic_year_id !== batch.to_academic_year_id) {
      throw PromotionError.targetClassroomInvalid(data.target_classroom_id, batch.to_academic_year_id);
    }
  }

  // Validate no target for graduate/leave
  if (data.decision === 'graduate' || data.decision === 'leave') {
    if (data.target_classroom_id) {
      throw PromotionError.targetForbidden(data.decision);
    }
  }

  const item = await promotionRepo.upsertPromotionItem(db, batchId, candidate.enrollment_id, data);

  // Audit log
  await logAudit(db, tenant, 'promotion_item_updated', 'promotion_item', item.id, null, item);

  return item;
}

export async function listPromotionItems(
  db: D1Database,
  batchId: string,
  tenant: TenantContext
): Promise<PromotionItemWithDetails[]> {
  promotionAuthz.ensureCanViewPromotions(tenant);

  const batch = await promotionRepo.findPromotionBatchById(db, batchId, tenant.schoolId);
  if (!batch) {
    throw PromotionError.batchNotFound(batchId);
  }

  return await promotionRepo.findPromotionItemsByBatch(db, batchId);
}

/**
 * =====================================================================
 * PLAN BATCH
 * =====================================================================
 */

export async function planBatch(
  db: D1Database,
  batchId: string,
  tenant: TenantContext
): Promise<void> {
  promotionAuthz.ensureCanManagePromotions(tenant);

  const batch = await promotionRepo.findPromotionBatchById(db, batchId, tenant.schoolId);
  if (!batch) {
    throw PromotionError.batchNotFound(batchId);
  }

  // Must be draft
  if (batch.status !== 'draft') {
    throw PromotionError.batchInvalidStatus(batchId, batch.status, 'draft');
  }

  // Get all items
  const items = await promotionRepo.findPromotionItemsByBatch(db, batchId);
  if (items.length === 0) {
    throw PromotionError.batchHasNoItems(batchId);
  }

  // Validate all items
  const issues: ActivationIssue[] = [];

  for (const item of items) {
    // Check target classroom for promote/retain
    if ((item.decision === 'promote' || item.decision === 'retain') && !item.target_classroom_id) {
      issues.push({
        type: 'MISSING_TARGET',
        message: `Student ${item.student_code} (${item.student_name}) requires target classroom`,
        student_id: item.student_id,
      });
    }

    // Check no conflicting enrollment in target year
    if (item.decision === 'promote' || item.decision === 'retain') {
      const hasConflict = await promotionRepo.checkConflictingEnrollment(
        db,
        item.student_id,
        batch.to_academic_year_id,
        tenant.schoolId
      );

      if (hasConflict) {
        issues.push({
          type: 'CONFLICTING_ENROLLMENT',
          message: `Student ${item.student_code} already has enrollment in target year`,
          student_id: item.student_id,
        });
      }
    }
  }

  if (issues.length > 0) {
    throw PromotionError.planningValidationFailed(issues);
  }

  // Update status to planned
  const now = Date.now();
  const before = batch;
  await promotionRepo.updateBatchStatus(db, batchId, tenant.schoolId, 'planned', now);
  const after = await promotionRepo.findPromotionBatchById(db, batchId, tenant.schoolId);

  // Audit log
  await logAudit(db, tenant, 'promotion_batch_planned', 'promotion_batch', batchId, before, after);
}

/**
 * =====================================================================
 * APPLY BATCH
 * =====================================================================
 */

export async function applyBatch(
  db: D1Database,
  batchId: string,
  tenant: TenantContext
): Promise<void> {
  promotionAuthz.ensureCanManagePromotions(tenant);

  const batch = await promotionRepo.findPromotionBatchById(db, batchId, tenant.schoolId);
  if (!batch) {
    throw PromotionError.batchNotFound(batchId);
  }

  // Must be planned
  if (batch.status !== 'planned') {
    throw PromotionError.batchInvalidStatus(batchId, batch.status, 'planned');
  }

  const items = await promotionRepo.findPromotionItemsByBatch(db, batchId);

  // Apply each item
  for (const item of items) {
    await applyPromotionItem(db, batch, item, tenant);
  }

  // Update batch status to applied
  const now = Date.now();
  const before = batch;
  await promotionRepo.updateBatchStatus(db, batchId, tenant.schoolId, 'applied', now);
  const after = await promotionRepo.findPromotionBatchById(db, batchId, tenant.schoolId);

  // Audit log
  await logAudit(db, tenant, 'promotion_batch_applied', 'promotion_batch', batchId, before, after);
}

async function applyPromotionItem(
  db: D1Database,
  batch: PromotionBatch,
  item: PromotionItemWithDetails,
  tenant: TenantContext
): Promise<void> {
  const today = new Date().toISOString().split('T')[0];

  if (item.decision === 'promote') {
    // Complete source enrollment
    await promotionRepo.completeEnrollment(db, item.source_enrollment_id, 'promoted', today);

    // Create target enrollment
    const targetEnrollmentId = await promotionRepo.createEnrollment(
      db,
      tenant.schoolId,
      batch.to_academic_year_id,
      item.target_classroom_id!,
      item.student_id,
      item.target_roll_number,
      'planned', // Will become active when year activates
      today,
      item.source_enrollment_id
    );

    // Update item with target enrollment
    await promotionRepo.updatePromotionItemTargetEnrollment(db, item.id, targetEnrollmentId);

    // Audit log
    await logAudit(db, tenant, 'student_promoted', 'enrollment', targetEnrollmentId, null, {
      student_id: item.student_id,
      from_enrollment: item.source_enrollment_id,
      to_enrollment: targetEnrollmentId,
    });
  } else if (item.decision === 'retain') {
    // Complete source enrollment
    await promotionRepo.completeEnrollment(db, item.source_enrollment_id, 'retained', today);

    // Create target enrollment (in target year)
    const targetEnrollmentId = await promotionRepo.createEnrollment(
      db,
      tenant.schoolId,
      batch.to_academic_year_id,
      item.target_classroom_id!,
      item.student_id,
      item.target_roll_number,
      'planned',
      today,
      item.source_enrollment_id
    );

    // Update item with target enrollment
    await promotionRepo.updatePromotionItemTargetEnrollment(db, item.id, targetEnrollmentId);

    // Audit log
    await logAudit(db, tenant, 'student_retained', 'enrollment', targetEnrollmentId, null, {
      student_id: item.student_id,
      from_enrollment: item.source_enrollment_id,
      to_enrollment: targetEnrollmentId,
    });
  } else if (item.decision === 'graduate') {
    // Complete source enrollment
    await promotionRepo.completeEnrollment(db, item.source_enrollment_id, 'graduated', today);

    // Disable student account
    await promotionRepo.disableStudent(db, item.student_id);

    // Revoke sessions
    await promotionRepo.revokeStudentSessions(db, item.student_id);

    // Audit log
    await logAudit(db, tenant, 'student_graduated', 'student', item.student_id, null, {
      student_id: item.student_id,
      enrollment: item.source_enrollment_id,
    });
  } else if (item.decision === 'leave') {
    // Complete source enrollment
    await promotionRepo.completeEnrollment(db, item.source_enrollment_id, 'left', today);

    // Disable student account
    await promotionRepo.disableStudent(db, item.student_id);

    // Revoke sessions
    await promotionRepo.revokeStudentSessions(db, item.student_id);

    // Audit log
    await logAudit(db, tenant, 'student_left', 'student', item.student_id, null, {
      student_id: item.student_id,
      enrollment: item.source_enrollment_id,
      reason: item.reason,
    });
  }
}

/**
 * =====================================================================
 * CANCEL BATCH
 * =====================================================================
 */

export async function cancelBatch(
  db: D1Database,
  batchId: string,
  reason: string,
  tenant: TenantContext
): Promise<void> {
  promotionAuthz.ensureCanManagePromotions(tenant);

  const batch = await promotionRepo.findPromotionBatchById(db, batchId, tenant.schoolId);
  if (!batch) {
    throw PromotionError.batchNotFound(batchId);
  }

  // Can only cancel draft or planned
  if (batch.status === 'applied') {
    throw PromotionError.batchAlreadyApplied(batchId);
  }

  if (batch.status === 'cancelled') {
    throw PromotionError.batchAlreadyCancelled(batchId);
  }

  const before = batch;
  await promotionRepo.updateBatchStatus(db, batchId, tenant.schoolId, 'cancelled', Date.now());
  const after = await promotionRepo.findPromotionBatchById(db, batchId, tenant.schoolId);

  // Audit log
  await logAudit(db, tenant, 'promotion_batch_cancelled', 'promotion_batch', batchId, before, {
    ...after,
    cancel_reason: reason,
  });
}

/**
 * =====================================================================
 * YEAR ACTIVATION
 * =====================================================================
 */

export async function checkYearActivation(
  db: D1Database,
  yearId: string,
  tenant: TenantContext
): Promise<ActivationPrecheckResult> {
  promotionAuthz.ensureCanActivateYear(tenant);

  const year = await promotionRepo.findAcademicYear(db, yearId, tenant.schoolId);
  if (!year) {
    throw PromotionError.yearNotFound(yearId);
  }

  // Cannot activate already current or closed year
  if (year.status === 'current') {
    throw PromotionError.yearAlreadyCurrent(yearId);
  }

  if (year.status === 'closed') {
    throw PromotionError.yearAlreadyClosed(yearId);
  }

  const issues: ActivationIssue[] = [];
  const unresolved: UnresolvedStudent[] = [];

  // TODO: Implement comprehensive activation checks
  // For now, basic check passes

  return {
    can_activate: issues.length === 0,
    issues,
    unresolved_students: unresolved,
  };
}

export async function activateYear(
  db: D1Database,
  yearId: string,
  tenant: TenantContext
): Promise<ActivationResult> {
  promotionAuthz.ensureCanActivateYear(tenant);

  // Run prechecks
  const precheck = await checkYearActivation(db, yearId, tenant);
  if (!precheck.can_activate) {
    throw PromotionError.activationBlocked(precheck.issues);
  }

  const year = await promotionRepo.findAcademicYear(db, yearId, tenant.schoolId);
  if (!year) {
    throw PromotionError.yearNotFound(yearId);
  }

  // Find current year
  const currentYearResult = await db
    .prepare(`SELECT id FROM academic_years WHERE school_id = ? AND status = 'current'`)
    .bind(tenant.schoolId)
    .first<{ id: string }>();

  const previousYearId = currentYearResult?.id || null;

  if (!previousYearId) {
    throw PromotionError.activationBlocked([
      { check: 'previous_year', passed: false, message: 'No current academic year found to close' }
    ]);
  }

  const now = new Date().toISOString();
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  const auditId = randomUUID();

  // Audit start
  await logAudit(db, tenant, 'promotion_year_activation_started', 'academic_year', yearId, null, {
    previous_year_id: previousYearId,
    new_year_id: yearId,
  });

  // Atomic year activation using db.batch()
  // All statements execute in a single transaction - all or nothing
  const statements = [
    // 1. Leavers: end their enrollment as 'left'
    db.prepare(
      `UPDATE enrollments SET status = 'left', left_on = ?, updated_at = ?
       WHERE school_id = ? AND academic_year_id = ?
         AND status = 'active' AND outcome = 'left'`
    ).bind(today, now, tenant.schoolId, previousYearId),

    // 2. Everyone else in old year: completed, dated at year's end
    db.prepare(
      `UPDATE enrollments
       SET status = 'completed',
           left_on = (SELECT ends_on FROM academic_years WHERE id = ?),
           updated_at = ?
       WHERE school_id = ? AND academic_year_id = ? AND status = 'active'`
    ).bind(previousYearId, now, tenant.schoolId, previousYearId),

    // 3. Planned enrollments in new year go live
    db.prepare(
      `UPDATE enrollments SET status = 'active', updated_at = ?
       WHERE school_id = ? AND academic_year_id = ? AND status = 'planned'`
    ).bind(now, tenant.schoolId, yearId),

    // 4. Leavers: profile withdrawn
    db.prepare(
      `UPDATE student_profiles SET status = 'withdrawn', updated_at = ?
       WHERE school_id = ? AND user_id IN
         (SELECT student_id FROM enrollments
          WHERE school_id = ? AND academic_year_id = ? AND outcome = 'left')`
    ).bind(now, tenant.schoolId, tenant.schoolId, previousYearId),

    // 5. Leavers: login disabled, sessions revoked via token_version increment
    db.prepare(
      `UPDATE users SET status = 'disabled', token_version = token_version + 1, updated_at = ?
       WHERE school_id = ? AND id IN
         (SELECT student_id FROM enrollments
          WHERE school_id = ? AND academic_year_id = ? AND outcome = 'left')`
    ).bind(now, tenant.schoolId, tenant.schoolId, previousYearId),

    // 6. Leavers: explicitly revoke active sessions
    db.prepare(
      `UPDATE sessions SET revoked_at = ?
       WHERE revoked_at IS NULL AND user_id IN
         (SELECT student_id FROM enrollments
          WHERE school_id = ? AND academic_year_id = ? AND outcome = 'left')`
    ).bind(now, tenant.schoolId, previousYearId),

    // 7. Graduates: profile inactive
    db.prepare(
      `UPDATE student_profiles SET status = 'inactive', updated_at = ?
       WHERE school_id = ? AND user_id IN
         (SELECT student_id FROM enrollments
          WHERE school_id = ? AND academic_year_id = ? AND outcome = 'graduated')`
    ).bind(now, tenant.schoolId, tenant.schoolId, previousYearId),

    // 8. Close old year FIRST (only one 'current' allowed)
    db.prepare(
      `UPDATE academic_years SET status = 'closed', updated_at = ?
       WHERE id = ? AND school_id = ? AND status = 'current'`
    ).bind(now, previousYearId, tenant.schoolId),

    // 9. Activate new year
    db.prepare(
      `UPDATE academic_years SET status = 'current', updated_at = ?
       WHERE id = ? AND school_id = ? AND status = 'upcoming'`
    ).bind(now, yearId, tenant.schoolId),

    // 10. Promotion batches for new year are now applied
    db.prepare(
      `UPDATE promotion_batches SET status = 'applied', applied_at = ?
       WHERE school_id = ? AND to_academic_year_id = ? AND status = 'planned'`
    ).bind(now, tenant.schoolId, yearId),
  ];

  // Execute all statements atomically
  const results = await db.batch(statements);

  // Extract counts from results
  const leaversEnded = results[0]?.meta?.changes || 0;
  const enrollmentsCompleted = results[1]?.meta?.changes || 0;
  const enrollmentsActivated = results[2]?.meta?.changes || 0;
  const leaverProfilesWithdrawn = results[3]?.meta?.changes || 0;
  const leaverUsersDisabled = results[4]?.meta?.changes || 0;
  const sessionsRevoked = results[5]?.meta?.changes || 0;
  const graduatesInactive = results[6]?.meta?.changes || 0;
  const oldYearClosed = results[7]?.meta?.changes || 0;
  const newYearActivated = results[8]?.meta?.changes || 0;
  const batchesApplied = results[9]?.meta?.changes || 0;

  // Verify critical operations succeeded
  if (oldYearClosed !== 1) {
    throw PromotionError.activationFailed(
      `Failed to close previous year (expected 1, got ${oldYearClosed})`
    );
  }

  if (newYearActivated !== 1) {
    throw PromotionError.activationFailed(
      `Failed to activate new year (expected 1, got ${newYearActivated})`
    );
  }

  const result: ActivationResult = {
    success: true,
    previous_year_id: previousYearId,
    new_year_id: yearId,
    students_promoted: enrollmentsActivated - leaversEnded - graduatesInactive, // Active - left - graduated
    students_retained: 0, // TODO: Calculate retained students (promoted to same grade)
    students_graduated: graduatesInactive,
    students_left: leaversEnded,
    enrollments_activated: enrollmentsActivated,
    sessions_revoked: sessionsRevoked,
  };

  // Audit completion
  await logAudit(db, tenant, 'promotion_year_activation_completed', 'academic_year', yearId, null, result);

  return result;
}
