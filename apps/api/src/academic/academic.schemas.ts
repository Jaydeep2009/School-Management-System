/**
 * Academic structure validation schemas
 * 
 * Zod schemas for request validation
 */

import { z } from 'zod';

/**
 * Custom ID validator - accepts both UUID and MD5 hash formats
 * UUID: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
 * MD5: xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx (32 hex chars)
 */
const idSchema = z.string().refine(
  (val) => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const md5Regex = /^[0-9a-f]{32}$/i;
    return uuidRegex.test(val) || md5Regex.test(val);
  },
  { message: 'Invalid ID format (expected UUID or MD5 hash)' }
);

/**
 * Academic Year Schemas
 */
export const academicYearStatusSchema = z.enum(['upcoming', 'current', 'closed']);

export const createAcademicYearSchema = z.object({
  label: z.string().min(1).max(100),
  starts_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  ends_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  status: academicYearStatusSchema.optional(),
}).refine(
  (data) => new Date(data.starts_on) < new Date(data.ends_on),
  {
    message: 'starts_on must be before ends_on',
    path: ['starts_on'],
  }
);

export const updateAcademicYearSchema = z.object({
  label: z.string().min(1).max(100).optional(),
  starts_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  ends_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
}).refine(
  (data) => {
    if (data.starts_on && data.ends_on) {
      return new Date(data.starts_on) < new Date(data.ends_on);
    }
    return true;
  },
  {
    message: 'starts_on must be before ends_on',
    path: ['starts_on'],
  }
);

/**
 * Classroom Schemas
 */
export const classroomStatusSchema = z.enum(['active', 'inactive', 'archived']);

export const createClassroomSchema = z.object({
  academic_year_id: idSchema,
  classroom_code: z.string().min(1).max(50),
  grade_name: z.string().min(1).max(50),
  division_name: z.string().min(1).max(50),
  grade_level: z.number().int().min(1).max(20),
  class_teacher_id: idSchema.optional(),
});

export const updateClassroomSchema = z.object({
  classroom_code: z.string().min(1).max(50).optional(),
  grade_name: z.string().min(1).max(50).optional(),
  division_name: z.string().min(1).max(50).optional(),
  grade_level: z.number().int().min(1).max(20).optional(),
  class_teacher_id: idSchema.nullable().optional(),
  status: classroomStatusSchema.optional(),
});

/**
 * Subject Schemas
 */
export const subjectStatusSchema = z.enum(['active', 'inactive']);

export const createSubjectSchema = z.object({
  subject_code: z.string().min(1).max(50),
  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
});

export const updateSubjectSchema = z.object({
  subject_code: z.string().min(1).max(50).optional(),
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional(),
  status: subjectStatusSchema.optional(),
});

/**
 * Teaching Assignment Schemas
 */
export const createTeachingAssignmentSchema = z.object({
  teacher_id: idSchema,
  classroom_id: idSchema,
  subject_id: idSchema,
});

export const updateTeachingAssignmentSchema = z.object({
  teacher_id: idSchema.nullable().optional(),
});

/**
 * Enrollment Schemas
 */
export const enrollmentStatusSchema = z.enum(['planned', 'active', 'completed', 'left', 'transferred']);
export const enrollmentOutcomeSchema = z.enum(['promoted', 'repeated', 'dropped']).nullable();

export const createEnrollmentSchema = z.object({
  academic_year_id: idSchema,
  classroom_id: idSchema,
  student_id: idSchema,
  roll_number: z.string().max(50).optional(),
  joined_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  status: enrollmentStatusSchema.optional(),
});

export const updateEnrollmentSchema = z.object({
  roll_number: z.string().max(50).nullable().optional(),
  left_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  status: enrollmentStatusSchema.optional(),
  outcome: enrollmentOutcomeSchema.optional(),
});
