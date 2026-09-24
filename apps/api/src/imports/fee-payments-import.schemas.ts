/**
 * Fee Payments Import Validation Schemas
 */

import { z } from 'zod';

export const feePaymentsImportRowSchema = z.object({
  academic_year: z.string().min(1, 'Academic year is required'),
  student_admission_number: z.string().min(1, 'Student admission number is required'),
  amount: z.union([z.number(), z.string()]).transform(val => typeof val === 'string' ? parseFloat(val) : val),
  paid_on: z.string().min(1, 'Paid on date is required'),
  method: z.string().min(1, 'Payment method is required'),
  reference: z.string().optional(),
});
