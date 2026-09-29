/**
 * Marks & Assessments Validation
 * 
 * Request validation schemas using Zod
 */

import { z } from 'zod';

/**
 * Mark status enum
 */
export const markStatusSchema = z.enum(['graded', 'absent', 'exempt']);

/**
 * Create assessment request schema
 */
export const createAssessmentSchema = z.object({
  classroom_id: z.string().min(1, 'Classroom ID is required'),
  subject_id: z.string().min(1, 'Subject ID is required'),
  name: z.string().min(1, 'Assessment name is required').max(200, 'Assessment name is too long'),
  max_marks: z.number().positive('Max marks must be positive'),
  weightage: z.number().nonnegative('Weightage cannot be negative').optional(),
  held_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)').optional(),
});

/**
 * Update assessment request schema
 */
export const updateAssessmentSchema = z.object({
  name: z.string().min(1, 'Assessment name is required').max(200, 'Assessment name is too long').optional(),
  max_marks: z.number().positive('Max marks must be positive').optional(),
  weightage: z.number().nonnegative('Weightage cannot be negative').optional(),
  held_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)').optional(),
}).refine(
  data => Object.keys(data).length > 0,
  'At least one field must be provided for update'
);

/**
 * Mark entry schema
 */
export const markEntrySchema = z.object({
  student_id: z.string().min(1, 'Student ID is required'),
  status: markStatusSchema,
  marks_obtained: z.number().nullable(),
}).refine(
  data => {
    // Graded status requires marks
    if (data.status === 'graded') {
      if (data.marks_obtained === null || data.marks_obtained === undefined) {
        return false;
      }
      if (data.marks_obtained < 0) {
        return false;
      }
    }
    // Absent and exempt must have null marks
    if (data.status === 'absent' || data.status === 'exempt') {
      if (data.marks_obtained !== null) {
        return false;
      }
    }
    return true;
  },
  {
    message: 'Invalid marks for status: graded requires non-negative marks, absent/exempt require null',
  }
);

/**
 * Bulk marks request schema
 * Limited to 500 entries per request
 */
export const bulkMarksSchema = z.object({
  entries: z.array(markEntrySchema)
    .min(1, 'At least one entry is required')
    .max(500, 'Maximum 500 entries allowed per request'),
});

/**
 * List assessments query schema
 */
export const listAssessmentsQuerySchema = z.object({
  academic_year_id: z.string().optional(),
  classroom_id: z.string().optional(),
  subject_id: z.string().optional(),
  is_published: z.enum(['true', 'false']).optional().transform(val => val === undefined ? undefined : val === 'true'),
});

/**
 * Student marks query schema
 */
export const studentMarksQuerySchema = z.object({
  academic_year_id: z.string().optional(),
  classroom_id: z.string().optional(),
  subject_id: z.string().optional(),
});

/**
 * Classroom report query schema
 */
export const classroomReportQuerySchema = z.object({
  subject_id: z.string().optional(),
  assessment_id: z.string().optional(),
});
