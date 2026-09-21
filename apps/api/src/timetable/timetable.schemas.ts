/**
 * Timetable Validation Schemas
 */

import { z } from 'zod';

/**
 * Time format validation (HH:MM)
 */
const timeSchema = z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Time must be in HH:MM format');

/**
 * Day of week validation
 */
const dayOfWeekSchema = z.union([
  z.literal(1),
  z.literal(2),
  z.literal(3),
  z.literal(4),
  z.literal(5),
  z.literal(6),
  z.literal(7),
]);

/**
 * Create timetable schema
 */
export const createTimetableSchema = z.object({
  academic_year_id: z.string().uuid('Invalid academic year ID'),
  classroom_id: z.string().uuid('Invalid classroom ID'),
  name: z.string().min(1, 'Name is required').max(200, 'Name too long'),
});

/**
 * Update timetable schema
 */
export const updateTimetableSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200, 'Name too long').optional(),
  status: z.enum(['draft', 'published', 'archived']).optional(),
});

/**
 * Upsert timetable entry schema
 */
export const upsertTimetableEntrySchema = z.object({
  day_of_week: dayOfWeekSchema,
  period_no: z.number().int().positive('Period number must be positive'),
  subject_id: z.string().uuid('Invalid subject ID'),
  teacher_id: z.string().uuid('Invalid teacher ID'),
  start_time: timeSchema.nullable().optional(),
  end_time: timeSchema.nullable().optional(),
  room: z.string().max(100, 'Room name too long').nullable().optional(),
}).refine(
  (data) => {
    if (data.start_time && data.end_time) {
      return data.start_time < data.end_time;
    }
    return true;
  },
  {
    message: 'Start time must be before end time',
    path: ['start_time'],
  }
);

/**
 * Timetable Excel import row schema
 */
export const timetableImportRowSchema = z.object({
  academic_year: z.string().min(1, 'Academic year is required'),
  classroom_code: z.string().min(1, 'Classroom code is required'),
  day: z.string().min(1, 'Day is required'),
  period_no: z.number().int().positive('Period number must be positive'),
  start_time: timeSchema.optional(),
  end_time: timeSchema.optional(),
  subject_code: z.string().min(1, 'Subject code is required'),
  teacher_code: z.string().min(1, 'Teacher code is required'),
  room: z.string().max(100, 'Room name too long').optional(),
}).refine(
  (data) => {
    if (data.start_time && data.end_time) {
      return data.start_time < data.end_time;
    }
    return true;
  },
  {
    message: 'Start time must be before end time',
    path: ['start_time'],
  }
);
