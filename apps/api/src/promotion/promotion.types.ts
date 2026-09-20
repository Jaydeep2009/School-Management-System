/**
 * Promotion & Academic-Year Lifecycle Types
 * 
 * Types for promotion batches, decisions, year activation, and enrollment lifecycle
 */

import type { TenantContext } from '../auth/auth.types';

/**
 * Promotion batch status
 */
export type PromotionBatchStatus = 'draft' | 'planned' | 'applied' | 'cancelled';

/**
 * Promotion decision for a student
 */
export type PromotionDecision = 'promote' | 'retain' | 'graduate' | 'leave';

/**
 * Enrollment status
 */
export type EnrollmentStatus = 'planned' | 'active' | 'completed' | 'left' | 'transferred';

/**
 * Enrollment outcome
 */
export type EnrollmentOutcome = 'promoted' | 'retained' | 'graduated' | 'left' | null;

/**
 * Promotion batch model
 */
export interface PromotionBatch {
  id: string;
  school_id: string;
  from_academic_year_id: string;
  to_academic_year_id: string;
  from_classroom_id: string;
  created_by: string;
  status: PromotionBatchStatus;
  created_at: number;
  planned_at: number | null;
  applied_at: number | null;
}

/**
 * Promotion item model
 */
export interface PromotionItem {
  id: string;
  promotion_batch_id: string;
  student_id: string;
  source_enrollment_id: string;
  target_classroom_id: string | null;
  target_roll_number: number | null;
  decision: PromotionDecision;
  reason: string | null;
  target_enrollment_id: string | null;
  created_at: number;
}

/**
 * Promotion batch with details (for listing)
 */
export interface PromotionBatchWithDetails extends PromotionBatch {
  from_year_label: string;
  to_year_label: string;
  from_classroom_name: string;
  item_count: number;
}

/**
 * Promotion candidate (student eligible for promotion)
 */
export interface PromotionCandidate {
  student_id: string;
  student_code: string;
  student_name: string;
  enrollment_id: string;
  classroom_id: string;
  classroom_name: string;
  roll_number: number | null;
  enrollment_status: EnrollmentStatus;
  suggested_target_classroom_id: string | null;
  suggested_target_classroom_name: string | null;
}

/**
 * Promotion item with student details
 */
export interface PromotionItemWithDetails extends PromotionItem {
  student_code: string;
  student_name: string;
  source_classroom_name: string;
  target_classroom_name: string | null;
}

/**
 * Create promotion batch request
 */
export interface CreatePromotionBatchRequest {
  from_academic_year_id: string;
  to_academic_year_id: string;
  from_classroom_id: string;
}

/**
 * Update promotion batch request
 */
export interface UpdatePromotionBatchRequest {
  // Add metadata if needed in future
  // Currently batches are updated through items and status transitions
}

/**
 * Create/update promotion item request
 */
export interface UpsertPromotionItemRequest {
  student_id: string;
  decision: PromotionDecision;
  target_classroom_id?: string; // Required for promote/retain
  target_roll_number?: number;
  reason?: string;
}

/**
 * Bulk upsert promotion items request
 */
export interface BulkUpsertPromotionItemsRequest {
  items: UpsertPromotionItemRequest[];
}

/**
 * Plan batch request
 */
export interface PlanBatchRequest {
  // Trigger planning validation
}

/**
 * Apply batch request
 */
export interface ApplyBatchRequest {
  // Trigger batch application
}

/**
 * Cancel batch request
 */
export interface CancelBatchRequest {
  reason: string;
}

/**
 * Activation precheck result
 */
export interface ActivationPrecheckResult {
  can_activate: boolean;
  issues: ActivationIssue[];
  unresolved_students: UnresolvedStudent[];
}

/**
 * Activation issue
 */
export interface ActivationIssue {
  type: string;
  message: string;
  student_id?: string;
  enrollment_id?: string;
  batch_id?: string;
}

/**
 * Unresolved student (no promotion decision)
 */
export interface UnresolvedStudent {
  student_id: string;
  student_code: string;
  student_name: string;
  enrollment_id: string;
  classroom_name: string;
}

/**
 * Activate year request
 */
export interface ActivateYearRequest {
  // Trigger year activation
}

/**
 * Activation result
 */
export interface ActivationResult {
  success: boolean;
  previous_year_id: string;
  new_year_id: string;
  students_promoted: number;
  students_retained: number;
  students_graduated: number;
  students_left: number;
  enrollments_activated: number;
  sessions_revoked: number;
}
