/**
 * Attendance Import Validation Schemas
 */

import { z } from 'zod';

/**
 * Schema for validating attendance import rows from Excel
 */
export const attendanceImportRowSchema = z.object({
  academic_year: z.string().min(1, 'Academic year is required'),
  classroom_code: z.string().min(1, 'Classroom code is required'),
  subject_code: z.string().min(1, 'Subject code is required'),
  session_date: z.string().min(1, 'Session date is required'),
  period_no: z.union([z.number(), z.string()]).transform(val => typeof val === 'string' ? parseInt(val, 10) : val),
  student_admission_number: z.string().min(1, 'Student admission number is required'),
  status: z.string().min(1, 'Status is required'),
});
