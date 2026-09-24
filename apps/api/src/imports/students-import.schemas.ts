/**
 * Students Import Validation Schemas
 */

import { z } from 'zod';

/**
 * Schema for validating student import rows from Excel
 */
export const studentImportRowSchema = z.object({
  admission_number: z.string().min(1, 'Admission number is required'),
  first_name: z.string().min(1, 'First name is required'),
  middle_name: z.string().optional(),
  last_name: z.string().min(1, 'Last name is required'),
  gender: z.string().optional(),
  date_of_birth: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().optional(),
  address: z.string().optional(),
  parent_name: z.string().optional(),
  parent_phone: z.string().optional(),
  parent_email: z.string().optional(),
});
