/**
 * Imports Validation Schemas
 */

import { z } from 'zod';

/**
 * Preview import request schema
 */
export const previewImportSchema = z.object({
  rows: z.array(z.unknown()).min(1, 'At least one row is required').max(1000, 'Maximum 1000 rows per import'),
  options: z.record(z.unknown()).optional(),
});

/**
 * Commit import request schema
 */
export const commitImportSchema = z.object({
  confirmed: z.boolean().refine(val => val === true, 'Must confirm import'),
});

/**
 * Cancel import request schema
 */
export const cancelImportSchema = z.object({
  reason: z.string().optional(),
});
