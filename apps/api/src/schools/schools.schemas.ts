/**
 * School Validation Schemas
 */

import { z } from 'zod';

/**
 * School code validation
 * - 2-8 characters
 * - Uppercase alphanumeric only
 * - Will be normalized to uppercase
 */
const schoolCodeSchema = z.string()
  .min(2, 'School code must be at least 2 characters')
  .max(8, 'School code must be at most 8 characters')
  .regex(/^[A-Z0-9]+$/, 'School code must contain only uppercase letters and numbers')
  .transform(val => val.toUpperCase());

/**
 * Timezone validation
 */
const timezoneSchema = z.string()
  .min(1, 'Timezone is required')
  .default('Asia/Kolkata');

/**
 * Create school schema
 */
export const createSchoolSchema = z.object({
  code: schoolCodeSchema,
  name: z.string().min(1, 'School name is required').max(200, 'School name too long'),
  timezone: timezoneSchema.optional(),
  phone: z.string().max(20, 'Phone number too long').optional(),
  email: z.string().email('Invalid email address').optional(),
  address: z.string().max(500, 'Address too long').optional(),
  settings: z.record(z.unknown()).optional(),
});

/**
 * Update school schema
 */
export const updateSchoolSchema = z.object({
  name: z.string().min(1, 'School name is required').max(200, 'School name too long').optional(),
  timezone: timezoneSchema.optional(),
  phone: z.string().max(20, 'Phone number too long').optional(),
  email: z.string().email('Invalid email address').optional(),
  address: z.string().max(500, 'Address too long').optional(),
  settings: z.record(z.unknown()).optional(),
});

/**
 * Create Principal schema
 * 
 * Principal accounts are user-only records (no profile table).
 * They need minimal information for account creation.
 */
export const createPrincipalSchema = z.object({
  full_name: z.string().min(2, 'Full name must be at least 2 characters').max(100, 'Full name too long'),
  date_of_birth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  gender: z.enum(['male', 'female', 'other'], { errorMap: () => ({ message: 'Gender must be male, female, or other' }) }),
});

/**
 * School filters schema
 */
export const schoolFiltersSchema = z.object({
  status: z.enum(['active', 'suspended', 'archived']).optional(),
  search: z.string().optional(),
});
