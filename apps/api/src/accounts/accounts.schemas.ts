/**
 * Account management validation schemas
 * 
 * Zod schemas for request validation
 */

import { z } from 'zod';

/**
 * Common validations
 */
const nameSchema = z.string().min(1).max(100);
const phoneSchema = z.string().regex(/^[0-9+\-\s()]{7,20}$/).optional();
const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional();
const emailSchema = z.string().email().max(255).optional();

/**
 * Teacher schemas
 */
export const teacherStatusSchema = z.enum(['active', 'inactive', 'suspended']);

export const createTeacherSchema = z.object({
  first_name: nameSchema,
  middle_name: nameSchema.optional(),
  last_name: nameSchema,
  phone: phoneSchema,
  date_of_birth: dateSchema,
  joining_date: dateSchema,
});

export const updateTeacherSchema = z.object({
  first_name: nameSchema.optional(),
  middle_name: nameSchema.nullable().optional(),
  last_name: nameSchema.optional(),
  phone: phoneSchema.nullable(),
  date_of_birth: dateSchema.nullable(),
  joining_date: dateSchema.nullable(),
  status: teacherStatusSchema.optional(),
});

/**
 * Student schemas
 */
export const studentStatusSchema = z.enum(['active', 'inactive', 'suspended', 'graduated', 'transferred']);

export const genderSchema = z.enum(['male', 'female', 'other']).optional();

export const createStudentSchema = z.object({
  admission_number: z.string().min(1).max(50),
  first_name: nameSchema,
  middle_name: nameSchema.optional(),
  last_name: nameSchema,
  gender: genderSchema,
  date_of_birth: dateSchema,
  phone: phoneSchema,
  email: emailSchema,
  address: z.string().max(500).optional(),
  parent_name: nameSchema.optional(),
  parent_phone: phoneSchema,
});

export const updateStudentSchema = z.object({
  admission_number: z.string().min(1).max(50).optional(),
  first_name: nameSchema.optional(),
  middle_name: nameSchema.nullable().optional(),
  last_name: nameSchema.optional(),
  gender: genderSchema.nullable(),
  date_of_birth: dateSchema.nullable(),
  phone: phoneSchema.nullable(),
  email: emailSchema.nullable(),
  address: z.string().max(500).nullable().optional(),
  parent_name: nameSchema.nullable().optional(),
  parent_phone: phoneSchema.nullable(),
  status: studentStatusSchema.optional(),
});

/**
 * Bulk provisioning schema
 */
export const bulkStudentInputSchema = z.object({
  admission_number: z.string().min(1).max(50),
  first_name: nameSchema,
  middle_name: nameSchema.optional(),
  last_name: nameSchema,
  gender: genderSchema,
  date_of_birth: dateSchema,
  phone: phoneSchema,
  email: emailSchema,
  address: z.string().max(500).optional(),
  parent_name: nameSchema.optional(),
  parent_phone: phoneSchema,
});

export const bulkProvisionStudentsSchema = z.object({
  students: z.array(bulkStudentInputSchema).min(1).max(100), // Max 100 per batch
});
