/**
 * Audit Log Service
 * 
 * Append-only audit logging for all mutations
 * SECURITY: Audit entries are immutable (enforced by DB triggers)
 */

import type { TenantContext } from '../../auth/auth.types';

/**
 * Generate a random UUID
 */
function generateUUID(): string {
  return crypto.randomUUID();
}

export type AuditAction =
  | 'created'
  | 'updated'
  | 'deleted'
  | 'activated'
  | 'closed'
  | 'disabled'
  | 'reactivated'
  | 'reset_password'
  | 'bulk_created'
  | 'status_changed'
  | 'class_teacher_assigned'
  | 'class_teacher_removed'
  | 'teacher_assigned'
  | 'teacher_changed'
  | 'enrollment_created'
  | 'enrollment_status_changed'
  | 'enrollment_completed'
  | 'marked_attendance'
  | 'locked'
  | 'unlocked'
  | 'published'
  | 'assessment_created'
  | 'assessment_updated'
  | 'assessment_updated_override'
  | 'assessment_published'
  | 'assessment_locked'
  | 'assessment_unlocked'
  | 'marks_entered'
  | 'marks_entered_override'
  | 'assignment_created'
  | 'assignment_updated'
  | 'assignment_published'
  | 'assignment_closed'
  | 'assignment_attachment_added'
  | 'assignment_attachment_deleted'
  | 'fee_category_created'
  | 'fee_category_updated'
  | 'fee_charge_created'
  | 'fee_charge_voided'
  | 'fee_payment_recorded'
  | 'fee_payment_voided'
  | 'promotion_batch_created'
  | 'promotion_batch_updated'
  | 'promotion_batch_planned'
  | 'promotion_batch_applied'
  | 'promotion_batch_cancelled'
  | 'promotion_item_updated'
  | 'student_promoted'
  | 'student_retained'
  | 'student_graduated'
  | 'student_left'
  | 'promotion_year_activation_started'
  | 'promotion_year_activation_completed'
  | 'teacher_profile_updated'
  | 'student_profile_updated'
  | 'timetable_created'
  | 'timetable_updated'
  | 'timetable_deleted'
  | 'timetable_version_created'
  | 'timetable_published'
  | 'timetable_archived'
  | 'timetable_entry_created'
  | 'timetable_entry_updated'
  | 'timetable_entry_deleted'
  | 'import_previewed'
  | 'import_committed'
  | 'import_cancelled'
  | 'school_created'
  | 'school_updated'
  | 'school_suspended'
  | 'school_activated'
  | 'school_archived'
  | 'principal_created';

export type AuditEntity =
  | 'academic_year'
  | 'classroom'
  | 'subject'
  | 'teaching_assignment'
  | 'enrollment'
  | 'teacher'
  | 'student'
  | 'attendance_session'
  | 'assessment'
  | 'marks'
  | 'assignment'
  | 'fee_category'
  | 'fee_charge'
  | 'fee_payment'
  | 'promotion_batch'
  | 'promotion_item'
  | 'timetable'
  | 'timetable_entry'
  | 'students'
  | 'attendance'
  | 'marks'
  | 'fee-payments'
  | 'fee-charges'
  | 'promotion'
  | 'timetable'
  | 'school'
  | 'user';

export interface AuditLogEntry {
  id: string;
  school_id: string | null;
  actor_id: string;
  actor_role: string;
  action: AuditAction;
  entity: AuditEntity;
  entity_id: string | null;
  before: string | null;
  after: string | null;
  at: number;
}

/**
 * Create audit log entry
 * 
 * @param db - Database instance
 * @param tenant - Tenant context (actor information)
 * @param action - Action performed
 * @param entity - Entity type
 * @param entityId - Entity ID (null for bulk operations)
 * @param before - State before change (for updates/deletes)
 * @param after - State after change (for creates/updates)
 */
export async function logAudit(
  db: D1Database,
  tenant: TenantContext,
  action: AuditAction,
  entity: AuditEntity,
  entityId: string | null,
  before?: unknown | null,
  after?: unknown | null
): Promise<void> {
  const id = generateUUID();
  const now = Date.now();

  try {
    await db
      .prepare(
        `INSERT INTO audit_log (id, school_id, actor_id, actor_role, action, entity, entity_id, before, after, at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        id,
        tenant.schoolId,
        tenant.userId,
        tenant.role,
        action,
        entity,
        entityId,
        before ? JSON.stringify(before) : null,
        after ? JSON.stringify(after) : null,
        now
      )
      .run();
  } catch (error) {
    // Log error but don't fail the operation
    console.error('Failed to write audit log:', error);
  }
}

/**
 * Query audit logs for an entity
 */
export async function getAuditLogs(
  db: D1Database,
  schoolId: string,
  filters: {
    entity?: AuditEntity;
    entity_id?: string;
    actor_id?: string;
    limit?: number;
  }
): Promise<AuditLogEntry[]> {
  let query = `SELECT id, school_id, actor_id, actor_role, action, entity, entity_id, before, after, at
               FROM audit_log
               WHERE school_id = ?`;
  
  const bindings: unknown[] = [schoolId];

  if (filters.entity) {
    query += ' AND entity = ?';
    bindings.push(filters.entity);
  }

  if (filters.entity_id) {
    query += ' AND entity_id = ?';
    bindings.push(filters.entity_id);
  }

  if (filters.actor_id) {
    query += ' AND actor_id = ?';
    bindings.push(filters.actor_id);
  }

  query += ' ORDER BY at DESC';

  if (filters.limit) {
    query += ' LIMIT ?';
    bindings.push(filters.limit);
  }

  const result = await db
    .prepare(query)
    .bind(...bindings)
    .all<AuditLogEntry>();

  return result.results || [];
}
