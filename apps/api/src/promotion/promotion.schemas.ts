/**
 * Promotion Validation Schemas
 * 
 * Zod validation for promotion requests
 */

import { z } from 'zod';

/**
 * Promotion decision enum
 */
export const promotionDecisionSchema = z.enum(['promote', 'retain', 'graduate', 'leave']);

/**
 * Create promotion batch schema
 */
export const createPromotionBatchSchema = z.object({
  from_academic_year_id: z.string().uuid('Invalid source academic year ID'),
  to_academic_year_id: z.string().uuid('Invalid target academic year ID'),
  from_classroom_id: z.string().uuid('Invalid source classroom ID'),
}).refine(
  data => data.from_academic_year_id !== data.to_academic_year_id,
  'Source and target academic years must be different'
);

/**
 * Upsert promotion item schema
 */
export const upsertPromotionItemSchema = z.object({
  student_id: z.string().uuid('Invalid student ID'),
  decision: promotionDecisionSchema,
  target_classroom_id: z.string().uuid('Invalid target classroom ID').optional(),
  target_roll_number: z.number().int().positive('Roll number must be positive').optional(),
  reason: z.string().max(500, 'Reason is too long').optional(),
}).refine(
  data => {
    // promote/retain require target_classroom_id
    if ((data.decision === 'promote' || data.decision === 'retain') && !data.target_classroom_id) {
      return false;
    }
    // graduate/leave must NOT have target_classroom_id
    if ((data.decision === 'graduate' || data.decision === 'leave') && data.target_classroom_id) {
      return false;
    }
    return true;
  },
  {
    message: 'Promote/retain require target classroom; graduate/leave must not have target classroom',
    path: ['target_classroom_id'],
  }
);

/**
 * Bulk upsert promotion items schema
 */
export const bulkUpsertPromotionItemsSchema = z.object({
  items: z.array(upsertPromotionItemSchema).min(1, 'At least one item is required'),
});

/**
 * Cancel batch schema
 */
export const cancelBatchSchema = z.object({
  reason: z.string().min(1, 'Cancel reason is required').max(500, 'Reason is too long'),
});

/**
 * Get candidates query schema
 */
export const getCandidatesQuerySchema = z.object({
  academic_year_id: z.string().uuid('Invalid academic year ID'),
  classroom_id: z.string().uuid('Invalid classroom ID'),
});
