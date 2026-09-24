/**
 * Fee Charges Import Validation Schemas
 */

import { z } from 'zod';

export const feeChargesImportRowSchema = z.object({
  academic_year: z.string().min(1, 'Academic year is required'),
  student_admission_number: z.string().min(1, 'Student admission number is required'),
  fee_category_code: z.string().optional(),
  kind: z.string().min(1, 'Kind is required'),
  title: z.string().min(1, 'Title is required'),
  amount: z.union([z.number(), z.string()]).transform(val => typeof val === 'string' ? parseFloat(val) : val),
  due_on: z.string().optional(),
});
