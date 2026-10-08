/**
 * Notification Routes
 * 
 * API endpoints for notification management
 */

import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import * as notificationService from './notifications.service';
import * as pushService from './push-notifications.service';
import * as notificationSchemas from './notifications.schemas';
import { requireAuth, requireSchoolTenant, type AuthContext } from '../auth/auth.middleware';
import { requirePrincipal } from '../auth/role.middleware';
import type {
  CreateNotificationRequest,
  UpdateNotificationRequest,
  CreatePushSubscriptionRequest,
} from './notifications.types';

const notifications = new Hono<AuthContext>();

// ============================================================================
// PRINCIPAL ROUTES - Manage notifications
// ============================================================================

/**
 * POST /notifications
 * Create and send a notification
 * Authorization: Principal only
 */
notifications.post(
  '/',
  requireAuth,
  requirePrincipal(),
  zValidator('json', notificationSchemas.createNotificationSchema),
  async (c) => {
    try {
      const tenant = requireSchoolTenant(c);
      const body = c.req.valid('json') as CreateNotificationRequest;

      const notification = await notificationService.createNotification(
        c.env.DB,
        tenant.schoolId,
        tenant.userId,
        body
      );

      return c.json({ data: notification }, 201);
    } catch (error) {
      if (error instanceof notificationService.NotificationError) {
        return c.json({ error: error.message }, error.statusCode as 400 | 404 | 500);
      }
      const message = error instanceof Error ? error.message : 'Failed to create notification';
      console.error('Create notification error:', error);
      return c.json({ error: message }, 500);
    }
  }
);

/**
 * GET /notifications
 * List all notifications sent by principal
 * Authorization: Principal only
 */
notifications.get(
  '/',
  requireAuth,
  requirePrincipal(),
  async (c) => {
    try {
      const tenant = requireSchoolTenant(c);

      const page = parseInt(c.req.query('page') || '1');
      const pageSize = parseInt(c.req.query('page_size') || '50');
      const status = c.req.query('status') as any;
      const targetAudience = c.req.query('target_audience') as any;
      const priority = c.req.query('priority') as any;
      const fromDate = c.req.query('from_date');
      const toDate = c.req.query('to_date');

      const filters = {
        status,
        target_audience: targetAudience,
        priority,
        from_date: fromDate,
        to_date: toDate,
      };

      const result = await notificationService.listNotifications(
        c.env.DB,
        tenant.schoolId,
        filters,
        page,
        pageSize
      );

      return c.json(result, 200);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to list notifications';
      console.error('List notifications error:', error);
      return c.json({ error: message }, 500);
    }
  }
);

/**
 * GET /notifications/:id
 * Get notification by ID with details
 * Authorization: Principal only
 */
notifications.get(
  '/:id',
  requireAuth,
  requirePrincipal(),
  async (c) => {
    try {
      const tenant = requireSchoolTenant(c);
      const id = c.req.param('id')!;

      const notification = await notificationService.getNotificationById(
        c.env.DB,
        id,
        tenant.schoolId
      );

      return c.json({ data: notification }, 200);
    } catch (error) {
      if (error instanceof notificationService.NotificationError) {
        return c.json({ error: error.message }, error.statusCode as 400 | 404 | 500);
      }
      const message = error instanceof Error ? error.message : 'Failed to get notification';
      console.error('Get notification error:', error);
      return c.json({ error: message }, 500);
    }
  }
);

/**
 * PATCH /notifications/:id
 * Update notification (only draft/scheduled)
 * Authorization: Principal only
 */
notifications.patch(
  '/:id',
  requireAuth,
  requirePrincipal(),
  zValidator('json', notificationSchemas.updateNotificationSchema),
  async (c) => {
    try {
      const tenant = requireSchoolTenant(c);
      const id = c.req.param('id')!;
      const body = c.req.valid('json') as UpdateNotificationRequest;

      const notification = await notificationService.updateNotification(
        c.env.DB,
        id,
        tenant.schoolId,
        body
      );

      return c.json({ data: notification }, 200);
    } catch (error) {
      if (error instanceof notificationService.NotificationError) {
        return c.json({ error: error.message }, error.statusCode as 400 | 404 | 500);
      }
      const message = error instanceof Error ? error.message : 'Failed to update notification';
      console.error('Update notification error:', error);
      return c.json({ error: message }, 500);
    }
  }
);

/**
 * DELETE /notifications/:id
 * Delete notification (only draft/scheduled)
 * Authorization: Principal only
 */
notifications.delete(
  '/:id',
  requireAuth,
  requirePrincipal(),
  async (c) => {
    try {
      const tenant = requireSchoolTenant(c);
      const id = c.req.param('id')!;

      await notificationService.deleteNotification(c.env.DB, id, tenant.schoolId);

      return c.json({ message: 'Notification deleted successfully' }, 200);
    } catch (error) {
      if (error instanceof notificationService.NotificationError) {
        return c.json({ error: error.message }, error.statusCode as 400 | 404 | 500);
      }
      const message = error instanceof Error ? error.message : 'Failed to delete notification';
      console.error('Delete notification error:', error);
      return c.json({ error: message }, 500);
    }
  }
);

// ============================================================================
// USER ROUTES - View and manage own notifications
// ============================================================================

/**
 * GET /notifications/me
 * Get current user's notifications
 * Authorization: Any authenticated user
 */
notifications.get(
  '/me/list',
  requireAuth,
  async (c) => {
    try {
      const tenant = requireSchoolTenant(c);

      const page = parseInt(c.req.query('page') || '1');
      const pageSize = parseInt(c.req.query('page_size') || '50');
      const unreadOnly = c.req.query('unread_only') === 'true';
      const priority = c.req.query('priority') as any;
      const fromDate = c.req.query('from_date');
      const toDate = c.req.query('to_date');

      const filters = {
        unread_only: unreadOnly,
        priority,
        from_date: fromDate,
        to_date: toDate,
      };

      const result = await notificationService.getUserNotifications(
        c.env.DB,
        tenant.userId,
        tenant.schoolId,
        filters,
        page,
        pageSize
      );

      return c.json(result, 200);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to get notifications';
      console.error('Get user notifications error:', error);
      return c.json({ error: message }, 500);
    }
  }
);

/**
 * GET /notifications/me/unread-count
 * Get unread notification count
 * Authorization: Any authenticated user
 */
notifications.get(
  '/me/unread-count',
  requireAuth,
  async (c) => {
    try {
      const tenant = requireSchoolTenant(c);

      const count = await notificationService.getUnreadCount(
        c.env.DB,
        tenant.userId,
        tenant.schoolId
      );

      return c.json({ count }, 200);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to get unread count';
      console.error('Get unread count error:', error);
      return c.json({ error: message }, 500);
    }
  }
);

/**
 * POST /notifications/me/mark-read
 * Mark notification(s) as read
 * Authorization: Any authenticated user
 */
notifications.post(
  '/me/mark-read',
  requireAuth,
  zValidator('json', notificationSchemas.markAsReadSchema),
  async (c) => {
    try {
      const tenant = requireSchoolTenant(c);
      const body = c.req.valid('json') as { notification_ids?: string[]; mark_all?: boolean };

      await notificationService.markNotificationsAsRead(
        c.env.DB,
        tenant.userId,
        tenant.schoolId,
        body.notification_ids,
        body.mark_all
      );

      return c.json({ message: 'Notifications marked as read' }, 200);
    } catch (error) {
      if (error instanceof notificationService.NotificationError) {
        return c.json({ error: error.message }, error.statusCode as 400 | 404 | 500);
      }
      const message = error instanceof Error ? error.message : 'Failed to mark as read';
      console.error('Mark as read error:', error);
      return c.json({ error: message }, 500);
    }
  }
);

// ============================================================================
// PUSH NOTIFICATION ROUTES - For future webapp
// ============================================================================

/**
 * POST /notifications/push/subscribe
 * Subscribe to push notifications
 * Authorization: Any authenticated user
 */
notifications.post(
  '/push/subscribe',
  requireAuth,
  zValidator('json', notificationSchemas.createPushSubscriptionSchema),
  async (c) => {
    try {
      const tenant = requireSchoolTenant(c);
      const body = c.req.valid('json') as CreatePushSubscriptionRequest;

      // Get client IP and user agent
      const userAgent = c.req.header('User-Agent') || null;
      const ipAddress = c.req.header('CF-Connecting-IP') || null;

      const subscription = await pushService.createSubscription(
        c.env.DB,
        tenant.userId,
        body,
        userAgent,
        ipAddress
      );

      return c.json({ data: subscription }, 201);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create subscription';
      console.error('Create push subscription error:', error);
      return c.json({ error: message }, 500);
    }
  }
);

/**
 * DELETE /notifications/push/unsubscribe
 * Unsubscribe from push notifications
 * Authorization: Any authenticated user
 */
notifications.delete(
  '/push/unsubscribe',
  requireAuth,
  async (c) => {
    try {
      const tenant = requireSchoolTenant(c);
      const endpoint = c.req.query('endpoint');

      if (!endpoint) {
        return c.json({ error: 'Endpoint is required' }, 400);
      }

      await pushService.deleteSubscription(c.env.DB, endpoint, tenant.userId);

      return c.json({ message: 'Unsubscribed successfully' }, 200);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to unsubscribe';
      console.error('Delete push subscription error:', error);
      return c.json({ error: message }, 500);
    }
  }
);

export default notifications;
