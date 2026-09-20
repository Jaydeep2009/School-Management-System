/**
 * Attendance Module Zod Validation Schemas
 */

import { z } from 'zod';

/**
 * Attendance Status - only present/absent
 */
export const attendanceStatusSchema = z.enum(['present', 'absent']);

/**
 * Create Attendance Session Schema
 */
export const createAttendanceSessionSchema = z.object({
  classroom_id: z.string().min(1, 'Classroom ID is required'),
  subject_id: z.string().min(1, 'Subject ID is required'),
  session_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
  period_no: z.number().int().min(1, 'Period number must be >= 1').max(20, 'Period number too large'),
});

/**
 * Mark Attendance Schema
 * Validates bulk attendance marking request
 */
export const markAttendanceSchema = z.object({
  entries: z.array(
    z.object({
      student_id: z.string().min(1, 'Student ID is required'),
      status: attendanceStatusSchema,
    })
  ).min(1, 'At least one entry required'),
});

/**
 * Attendance Report Filters Schema
 */
export const attendanceReportFiltersSchema = z.object({
  academic_year_id: z.string().optional(),
  classroom_id: z.string().optional(),
  subject_id: z.string().optional(),
  student_id: z.string().optional(),
  from_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});
