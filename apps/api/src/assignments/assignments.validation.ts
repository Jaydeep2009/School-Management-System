/**
 * Assignments Validation
 * 
 * Request validation schemas using Zod
 */

import { z } from 'zod';

/**
 * Assignment status enum
 */
export const assignmentStatusSchema = z.enum(['draft', 'published', 'closed']);

/**
 * Create assignment request schema
 */
export const createAssignmentSchema = z.object({
  classroom_id: z.string().min(1, 'Classroom ID is required'),
  subject_id: z.string().min(1, 'Subject ID is required'),
  title: z.string().min(1, 'Title is required').max(500, 'Title is too long'),
  description: z.string().max(10000, 'Description is too long').optional(),
  due_at: z.number().int().positive('Due date must be a positive timestamp').optional(),
});

/**
 * Update assignment request schema
 */
export const updateAssignmentSchema = z.object({
  title: z.string().min(1, 'Title is required').max(500, 'Title is too long').optional(),
  description: z.string().max(10000, 'Description is too long').nullable().optional(),
  due_at: z.number().int().positive('Due date must be a positive timestamp').nullable().optional(),
}).refine(
  data => Object.keys(data).length > 0,
  'At least one field must be provided for update'
);

/**
 * List assignments query schema
 */
export const listAssignmentsQuerySchema = z.object({
  academic_year_id: z.string().optional(),
  classroom_id: z.string().optional(),
  subject_id: z.string().optional(),
  status: assignmentStatusSchema.optional(),
});

/**
 * Allowed content types for attachments
 */
export const ALLOWED_ATTACHMENT_TYPES = [
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/webp',
  'application/msword', // .doc
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
  'application/vnd.ms-excel', // .xls
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
  'application/vnd.ms-powerpoint', // .ppt
  'application/vnd.openxmlformats-officedocument.presentationml.presentation', // .pptx
  'text/plain',
] as const;

/**
 * Maximum attachment size: 50MB
 */
export const MAX_ATTACHMENT_SIZE_BYTES = 50 * 1024 * 1024;

/**
 * Validate content type
 */
export function isAllowedContentType(contentType: string): boolean {
  return ALLOWED_ATTACHMENT_TYPES.includes(contentType as any);
}

/**
 * Sanitize filename
 * Remove path traversal attempts and control characters
 */
export function sanitizeFilename(filename: string): string {
  // Remove path traversal attempts
  let safe = filename.replace(/\.\./g, '');
  safe = safe.replace(/[/\\]/g, '');
  
  // Remove control characters
  safe = safe.replace(/[\x00-\x1F\x7F]/g, '');
  
  // Trim and limit length
  safe = safe.trim();
  if (safe.length > 255) {
    const ext = safe.substring(safe.lastIndexOf('.'));
    const name = safe.substring(0, 255 - ext.length);
    safe = name + ext;
  }
  
  // Fallback if empty
  if (!safe) {
    safe = 'attachment';
  }
  
  return safe;
}
