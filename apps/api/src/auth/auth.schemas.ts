/**
 * Authentication Zod schemas for request validation
 */

import { z } from 'zod';

/**
 * Password validation rules
 */
const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password must not exceed 128 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character');

/**
 * Login request schema
 */
export const loginRequestSchema = z.object({
  loginId: z
    .string()
    .trim()
    .min(1, 'Login ID is required')
    .max(50, 'Login ID must not exceed 50 characters'),
  password: z
    .string()
    .min(1, 'Password is required')
    .max(128, 'Password must not exceed 128 characters'),
});

/**
 * Activation request schema
 */
export const activationRequestSchema = z.object({
  loginId: z
    .string()
    .trim()
    .min(1, 'Login ID is required')
    .max(50, 'Login ID must not exceed 50 characters'),
  activationCode: z
    .string()
    .min(1, 'Activation code is required')
    .max(128, 'Activation code must not exceed 128 characters'),
  newPassword: passwordSchema,
});

/**
 * Password change request schema
 */
export const passwordChangeRequestSchema = z.object({
  currentPassword: z
    .string()
    .min(1, 'Current password is required')
    .max(128, 'Current password must not exceed 128 characters'),
  newPassword: passwordSchema,
});

/**
 * Refresh request schema
 */
export const refreshRequestSchema = z.object({
  refreshToken: z
    .string()
    .min(1, 'Refresh token is required')
    .regex(/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/, 'Invalid refresh token format'),
});

/**
 * Export password schema for testing
 */
export { passwordSchema };
