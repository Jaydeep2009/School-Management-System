/**
 * Marks Import Validation Schemas
 */

import { z } from 'zod';

/**
 * Schema for validating marks import rows from Excel
 */
export const marksImportRowSchema = z.object({
  academic_year: z.string().min(1, 'Academic year is required'),
  classroom_code: z.string().min(1, 'Classroom code is required'),
  subject_code: z.string().min(1, 'Subject code is required'),
  assessment_name: z.string().min(1, 'Assessment name is required'),
  student_admission_number: z.string().min(1, 'Student admission number is required'),
  marks_obtained: z.union([z.number(), z.string(), z.null(), z.undefined()]).transform(val => {
    if (val === null || val === undefined || val === '') return null;
    return typeof val === 'string' ? parseFloat(val) : val;
  }).optional(),
  status: z.string().min(1, 'Status is required'),
});
