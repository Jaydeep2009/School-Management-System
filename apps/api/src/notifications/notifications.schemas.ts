/**
 * Notification Validation Schemas
 * 
 * Zod schemas for request validation
 */

import { z } from 'zod';

/**
 * Schema for creating a notification
 */
export const createNotificationSchema = z.object({
  title: z.string()
    .min(1, 'Title is required')
    .max(200, 'Title must be at most 200 characters'),
  
  message: z.string()
    .min(1, 'Message is required')
    .max(2000, 'Message must be at most 2000 characters'),
  
  target_audience: z.enum(['all', 'teachers', 'students'], {
    errorMap: () => ({ message: 'Target audience must be: all, teachers, or students' })
  }),
  
  priority: z.enum(['low', 'normal', 'high', 'urgent'])
    .default('normal')
    .optional(),
  
  scheduled_at: z.string()
    .datetime({ message: 'Scheduled date must be a valid ISO 8601 timestamp' })
    .optional(),
  
  push_notification_enabled: z.boolean()
    .default(false)
    .optional(),
});

/**
 * Schema for updating a notification
 */
export const updateNotificationSchema = z.object({
  title: z.string()
    .min(1, 'Title is required')
    .max(200, 'Title must be at most 200 characters')
    .optional(),
  
  message: z.string()
    .min(1, 'Message is required')
    .max(2000, 'Message must be at most 2000 characters')
    .optional(),
  
  target_audience: z.enum(['all', 'teachers', 'students'])
    .optional(),
  
  priority: z.enum(['low', 'normal', 'high', 'urgent'])
    .optional(),
  
  scheduled_at: z.string()
    .datetime({ message: 'Scheduled date must be a valid ISO 8601 timestamp' })
    .nullable()
    .optional(),
  
  status: z.enum(['draft', 'scheduled', 'sent', 'failed'])
    .optional(),
});

/**
 * Schema for creating a push subscription
 */
export const createPushSubscriptionSchema = z.object({
  endpoint: z.string()
    .url({ message: 'Endpoint must be a valid URL' }),
  
  keys: z.object({
    p256dh: z.string()
      .min(1, 'p256dh key is required'),
    auth: z.string()
      .min(1, 'auth key is required'),
  }),
  
  user_agent: z.string()
    .optional(),
});

/**
 * Schema for marking notification as read
 */
export const markAsReadSchema = z.object({
  notification_ids: z.array(z.string())
    .min(1, 'At least one notification ID is required')
    .optional(),
  
  mark_all: z.boolean()
    .optional(),
});
