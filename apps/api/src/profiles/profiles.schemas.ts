/**
 * Profiles Validation Schemas
 * 
 * Zod validation for profile update requests and birthday queries
 */

import { z } from 'zod';

/**
 * Date validation helper
 * Ensures date is in YYYY-MM-DD format and valid
 */
const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format');

/**
 * Update Teacher Profile Schema
 */
export const updateTeacherProfileSchema = z.object({
  first_name: z.string().min(1, 'First name is required').max(100, 'First name too long').optional(),
  middle_name: z.string().max(100, 'Middle name too long').nullable().optional(),
  last_name: z.string().min(1, 'Last name is required').max(100, 'Last name too long').optional(),
  phone: z.string().max(20, 'Phone number too long').nullable().optional(),
  date_of_birth: dateSchema.nullable().optional(),
  joining_date: dateSchema.nullable().optional(),
}).refine(
  (data) => {
    // If date_of_birth is provided, validate it's a reasonable date
    if (data.date_of_birth) {
      const dob = new Date(data.date_of_birth);
      const now = new Date();
      const minAge = new Date(now.getFullYear() - 80, now.getMonth(), now.getDate());
      const maxAge = new Date(now.getFullYear() - 18, now.getMonth(), now.getDate());
      
      if (dob < minAge || dob > maxAge) {
        return false;
      }
    }
    return true;
  },
  {
    message: 'Date of birth must be reasonable for a teacher (18-80 years old)',
    path: ['date_of_birth'],
  }
);

/**
 * Update Student Profile Schema
 */
export const updateStudentProfileSchema = z.object({
  first_name: z.string().min(1, 'First name is required').max(100, 'First name too long').optional(),
  middle_name: z.string().max(100, 'Middle name too long').nullable().optional(),
  last_name: z.string().min(1, 'Last name is required').max(100, 'Last name too long').optional(),
  gender: z.string().max(20, 'Gender value too long').nullable().optional(),
  date_of_birth: dateSchema.nullable().optional(),
  phone: z.string().max(20, 'Phone number too long').nullable().optional(),
  email: z.string().email('Invalid email address').max(255, 'Email too long').nullable().optional(),
  address: z.string().max(500, 'Address too long').nullable().optional(),
  parent_name: z.string().max(200, 'Parent name too long').nullable().optional(),
  parent_phone: z.string().max(20, 'Parent phone too long').nullable().optional(),
  parent_email: z.string().email('Invalid parent email').max(255, 'Parent email too long').nullable().optional(),
}).refine(
  (data) => {
    // If date_of_birth is provided, validate it's reasonable for a student
    if (data.date_of_birth) {
      const dob = new Date(data.date_of_birth);
      const now = new Date();
      const minAge = new Date(now.getFullYear() - 25, now.getMonth(), now.getDate());
      const maxAge = new Date(now.getFullYear() - 3, now.getMonth(), now.getDate());
      
      if (dob < minAge || dob > maxAge) {
        return false;
      }
    }
    return true;
  },
  {
    message: 'Date of birth must be reasonable for a student (3-25 years old)',
    path: ['date_of_birth'],
  }
);

/**
 * Birthday Query Schema
 */
export const birthdayQuerySchema = z.object({
  month: z.coerce.number().int().min(1).max(12).optional(),
  today: z.enum(['true', 'false']).optional(),
  thisWeek: z.enum(['true', 'false']).optional(),
  classroomId: z.string().uuid().optional(),
}).refine(
  (data) => {
    // Can't specify both month and today/thisWeek
    const hasMonth = data.month !== undefined;
    const hasToday = data.today === 'true';
    const hasThisWeek = data.thisWeek === 'true';
    
    if (hasMonth && (hasToday || hasThisWeek)) {
      return false;
    }
    
    if (hasToday && hasThisWeek) {
      return false;
    }
    
    return true;
  },
  {
    message: 'Can only specify one of: month, today, or thisWeek',
  }
);
