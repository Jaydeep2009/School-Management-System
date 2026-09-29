/**
 * Fees Management Validation Schemas
 * 
 * Zod validation schemas for fee management requests
 */

import { z } from 'zod';

/**
 * Fee category code pattern: alphanumeric, underscore, hyphen
 */
const feeCategoryCodePattern = /^[a-zA-Z0-9_-]+$/;

/**
 * Date pattern: YYYY-MM-DD
 */
const datePattern = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Create fee category schema
 */
export const createFeeCategorySchema = z.object({
  code: z.string()
    .min(1, 'Category code is required')
    .max(50, 'Category code is too long')
    .regex(feeCategoryCodePattern, 'Category code must be alphanumeric with - or _'),
  name: z.string()
    .min(1, 'Category name is required')
    .max(200, 'Category name is too long'),
});

/**
 * Update fee category schema
 */
export const updateFeeCategorySchema = z.object({
  name: z.string()
    .min(1, 'Category name is required')
    .max(200, 'Category name is too long')
    .optional(),
  status: z.enum(['active', 'inactive']).optional(),
}).refine(
  data => Object.keys(data).length > 0,
  'At least one field must be provided for update'
);

/**
 * Create fee charge schema
 */
export const createFeeChargeSchema = z.object({
  student_id: z.string().min(1, 'Student ID is required'),
  academic_year_id: z.string().uuid('Invalid academic year ID'),
  enrollment_id: z.string().uuid('Invalid enrollment ID').optional(),
  fee_category_id: z.string().uuid('Invalid fee category ID').optional(),
  kind: z.enum(['fee', 'concession', 'carry_forward']),
  title: z.string()
    .min(1, 'Title is required')
    .max(500, 'Title is too long'),
  amount_paise: z.number()
    .int('Amount must be an integer')
    .refine(val => {
      // For concessions, amount should be negative
      // For fee and carry_forward, amount should be positive
      return val !== 0;
    }, 'Amount cannot be zero'),
  due_on: z.string()
    .regex(datePattern, 'Due date must be in YYYY-MM-DD format')
    .optional(),
}).refine(data => {
  // Fee and carry_forward must have positive amounts
  if ((data.kind === 'fee' || data.kind === 'carry_forward') && data.amount_paise <= 0) {
    return false;
  }
  // Concession must have negative amount
  if (data.kind === 'concession' && data.amount_paise >= 0) {
    return false;
  }
  return true;
}, {
  message: 'Amount must be positive for fees/carry-forward and negative for concessions',
  path: ['amount_paise'],
});

/**
 * Void charge schema
 */
export const voidChargeSchema = z.object({
  reason: z.string()
    .min(1, 'Void reason is required')
    .max(500, 'Void reason is too long'),
});

/**
 * Create fee payment schema
 */
export const createFeePaymentSchema = z.object({
  student_id: z.string().min(1, 'Student ID is required'),
  academic_year_id: z.string().uuid('Invalid academic year ID'),
  amount_paise: z.number()
    .int('Amount must be an integer')
    .positive('Amount must be positive'),
  paid_on: z.string()
    .regex(datePattern, 'Payment date must be in YYYY-MM-DD format'),
  method: z.enum(['cash', 'upi', 'bank_transfer', 'other']),
  reference: z.string()
    .max(200, 'Reference is too long')
    .optional(),
});

/**
 * Void payment schema
 */
export const voidPaymentSchema = z.object({
  reason: z.string()
    .min(1, 'Void reason is required')
    .max(500, 'Void reason is too long'),
});
