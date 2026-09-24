/**
 * Promotion Import Validation Schemas
 */

import { z } from 'zod';

export const promotionImportRowSchema = z.object({
  student_admission_number: z.string().min(1, 'Student admission number is required'),
  from_classroom_code: z.string().min(1, 'From classroom code is required'),
  to_classroom_code: z.string().min(1, 'To classroom code is required'),
  outcome: z.string().min(1, 'Outcome is required'),
  remarks: z.string().optional(),
});
