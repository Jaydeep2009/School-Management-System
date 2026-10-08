/**
 * Notification Service
 * 
 * Business logic for notifications
 */

import type { D1Database } from '@cloudflare/workers-types';
import { randomUUID } from 'node:crypto';
import * as notificationRepo from './notifications.repository';
import * as accountRepo from '../accounts/account.repository';
import type {
  Notification,
  NotificationWithDetails,
  UserNotification,
  CreateNotificationRequest,
  UpdateNotificationRequest,
  NotificationFilters,
  UserNotificationFilters,
  TargetAudience,
} from './notifications.types';

/**
 * Custom error for notification operations
 */
export class NotificationError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500
  ) {
    super(message);
    this.name = 'NotificationError';
  }
}

/**
 * Create and send a notification
 */
export async function createNotification(
  db: D1Database,
  schoolId: string,
  senderId: string,
  data: CreateNotificationRequest
): Promise<Notification> {
  // Validate scheduled date if provided
  if (data.scheduled_at) {
    const scheduledDate = new Date(data.scheduled_at);
    if (scheduledDate < new Date()) {
      throw new NotificationError('Scheduled date must be in the future', 400);
    }
  }

  // Determine status
  const status = data.scheduled_at ? 'scheduled' : 'sent';
  const sentAt = data.scheduled_at ? null : new Date().toISOString();

  // Create notification
  const notification = await notificationRepo.create(db, {
    id: randomUUID(),
    school_id: schoolId,
    sender_id: senderId,
    title: data.title,
    message: data.message,
    target_audience: data.target_audience,
    priority: data.priority || 'normal',
    status,
    scheduled_at: data.scheduled_at || null,
    sent_at: sentAt,
    push_notification_enabled: data.push_notification_enabled ? 1 : 0,
    push_notification_sent: 0,
  });

  // If not scheduled, send immediately (create recipients)
  if (!data.scheduled_at) {
    await sendNotificationToRecipients(db, notification);
  }

  return notification;
}

/**
 * Send notification to appropriate recipients based on target audience
 */
async function sendNotificationToRecipients(
  db: D1Database,
  notification: Notification
): Promise<void> {
  const deliveredAt = new Date().toISOString();

  // Get recipients based on target audience
  let recipients: Array<{ user_id: string; role: string }> = [];

  try {
    if (notification.target_audience === 'all') {
      // Get all users in the school (principals, teachers, students)
      const [principals, teachers, students] = await Promise.all([
        accountRepo.findPrincipalsBySchool(db, notification.school_id),
        accountRepo.findTeachersBySchool(db, notification.school_id, {}),
        accountRepo.findStudentsBySchool(db, notification.school_id, {}),
      ]);

      recipients = [
        ...principals.map(p => ({ user_id: p.user_id, role: 'principal' })),
        ...teachers.map(t => ({ user_id: t.user_id, role: 'teacher' })),
        ...students.map(s => ({ user_id: s.user_id, role: 'student' })),
      ];
    } else if (notification.target_audience === 'teachers') {
      // Get only teachers
      const teachers = await accountRepo.findTeachersBySchool(db, notification.school_id, {});
      recipients = teachers.map(t => ({ user_id: t.user_id, role: 'teacher' }));
    } else if (notification.target_audience === 'students') {
      // Get only students
      const students = await accountRepo.findStudentsBySchool(db, notification.school_id, {});
      recipients = students.map(s => ({ user_id: s.user_id, role: 'student' }));
    }
  } catch (error) {
    console.error('Error fetching recipients:', error);
    throw new NotificationError('Failed to fetch recipients', 500);
  }

  // Filter out the sender (don't send notification to self)
  recipients = recipients.filter(r => r.user_id !== notification.sender_id);

  if (recipients.length === 0) {
    console.log(`No recipients found for notification ${notification.id}`);
    return;
  }

  // Create recipient records
  const recipientRecords = recipients.map(r => ({
    id: randomUUID(),
    notification_id: notification.id,
    user_id: r.user_id,
    role: r.role as 'principal' | 'teacher' | 'student',
    delivered_at: deliveredAt,
    read_at: null,
  }));

  await notificationRepo.createRecipientsInBatch(db, recipientRecords);

  console.log(`Notification ${notification.id} sent to ${recipients.length} recipients`);

  // TODO: When webapp is ready, trigger push notifications here
  // if (notification.push_notification_enabled) {
  //   await sendPushNotifications(db, notification.id, recipients);
  // }
}

/**
 * Get notification by ID with details
 */
export async function getNotificationById(
  db: D1Database,
  id: string,
  schoolId: string
): Promise<NotificationWithDetails> {
  const notification = await notificationRepo.findById(db, id, schoolId);

  if (!notification) {
    throw new NotificationError('Notification not found', 404);
  }

  // Get sender name and recipient stats
  const [sender, recipientStats] = await Promise.all([
    db
      .prepare('SELECT full_name FROM users WHERE id = ?')
      .bind(notification.sender_id)
      .first<{ full_name: string }>(),
    db
      .prepare(`
        SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN read_at IS NOT NULL THEN 1 ELSE 0 END) as read_count
        FROM notification_recipients
        WHERE notification_id = ?
      `)
      .bind(id)
      .first<{ total: number; read_count: number }>(),
  ]);

  return {
    ...notification,
    sender_name: sender?.full_name,
    recipient_count: recipientStats?.total || 0,
    read_count: recipientStats?.read_count || 0,
    unread_count: (recipientStats?.total || 0) - (recipientStats?.read_count || 0),
  };
}

/**
 * List notifications (for principal view)
 */
export async function listNotifications(
  db: D1Database,
  schoolId: string,
  filters: NotificationFilters = {},
  page: number = 1,
  pageSize: number = 50
): Promise<{ data: NotificationWithDetails[]; pagination: any }> {
  const offset = (page - 1) * pageSize;

  const [notifications, total] = await Promise.all([
    notificationRepo.list(db, schoolId, filters, pageSize, offset),
    notificationRepo.count(db, schoolId, filters),
  ]);

  // Enrich with sender names and stats
  const enriched = await Promise.all(
    notifications.map(async (n) => {
      const [sender, recipientStats] = await Promise.all([
        db
          .prepare('SELECT full_name FROM users WHERE id = ?')
          .bind(n.sender_id)
          .first<{ full_name: string }>(),
        db
          .prepare(`
            SELECT 
              COUNT(*) as total,
              SUM(CASE WHEN read_at IS NOT NULL THEN 1 ELSE 0 END) as read_count
            FROM notification_recipients
            WHERE notification_id = ?
          `)
          .bind(n.id)
          .first<{ total: number; read_count: number }>(),
      ]);

      return {
        ...n,
        sender_name: sender?.full_name,
        recipient_count: recipientStats?.total || 0,
        read_count: recipientStats?.read_count || 0,
        unread_count: (recipientStats?.total || 0) - (recipientStats?.read_count || 0),
      };
    })
  );

  return {
    data: enriched,
    pagination: {
      page,
      page_size: pageSize,
      total,
      total_pages: Math.ceil(total / pageSize),
    },
  };
}

/**
 * Update notification
 */
export async function updateNotification(
  db: D1Database,
  id: string,
  schoolId: string,
  data: UpdateNotificationRequest
): Promise<Notification> {
  const existing = await notificationRepo.findById(db, id, schoolId);

  if (!existing) {
    throw new NotificationError('Notification not found', 404);
  }

  // Cannot update sent notifications
  if (existing.status === 'sent') {
    throw new NotificationError('Cannot update a sent notification', 400);
  }

  // Validate scheduled date if provided
  if (data.scheduled_at) {
    const scheduledDate = new Date(data.scheduled_at);
    if (scheduledDate < new Date()) {
      throw new NotificationError('Scheduled date must be in the future', 400);
    }
  }

  const updated = await notificationRepo.update(db, id, schoolId, data);

  if (!updated) {
    throw new NotificationError('Failed to update notification', 500);
  }

  return updated;
}

/**
 * Delete notification
 */
export async function deleteNotification(
  db: D1Database,
  id: string,
  schoolId: string
): Promise<void> {
  const notification = await notificationRepo.findById(db, id, schoolId);

  if (!notification) {
    throw new NotificationError('Notification not found', 404);
  }

  // Can only delete draft or scheduled notifications
  if (notification.status === 'sent') {
    throw new NotificationError('Cannot delete a sent notification', 400);
  }

  const success = await notificationRepo.deleteNotification(db, id, schoolId);

  if (!success) {
    throw new NotificationError('Failed to delete notification', 500);
  }
}

/**
 * Get user's notifications
 */
export async function getUserNotifications(
  db: D1Database,
  userId: string,
  schoolId: string,
  filters: UserNotificationFilters = {},
  page: number = 1,
  pageSize: number = 50
): Promise<{ data: UserNotification[]; pagination: any; unread_count: number }> {
  const offset = (page - 1) * pageSize;

  const [notifications, unreadCount] = await Promise.all([
    notificationRepo.findUserNotifications(db, userId, schoolId, filters, pageSize, offset),
    notificationRepo.countUnreadForUser(db, userId, schoolId),
  ]);

  // Count total for pagination
  const countFilters = { ...filters };
  delete countFilters.unread_only; // Remove for total count
  
  let totalQuery = `
    SELECT COUNT(*) as count
    FROM notifications n
    INNER JOIN notification_recipients nr ON n.id = nr.notification_id
    WHERE nr.user_id = ? AND n.school_id = ?
  `;
  const params: any[] = [userId, schoolId];

  if (filters.priority) {
    totalQuery += ` AND n.priority = ?`;
    params.push(filters.priority);
  }

  if (filters.from_date) {
    totalQuery += ` AND n.created_at >= ?`;
    params.push(filters.from_date);
  }

  if (filters.to_date) {
    totalQuery += ` AND n.created_at <= ?`;
    params.push(filters.to_date);
  }

  const totalResult = await db.prepare(totalQuery).bind(...params).first<{ count: number }>();
  const total = totalResult?.count || 0;

  return {
    data: notifications,
    pagination: {
      page,
      page_size: pageSize,
      total,
      total_pages: Math.ceil(total / pageSize),
    },
    unread_count: unreadCount,
  };
}

/**
 * Mark notification(s) as read
 */
export async function markNotificationsAsRead(
  db: D1Database,
  userId: string,
  schoolId: string,
  notificationIds?: string[],
  markAll: boolean = false
): Promise<void> {
  if (markAll) {
    await notificationRepo.markAllAsRead(db, userId, schoolId);
  } else if (notificationIds && notificationIds.length > 0) {
    await notificationRepo.markMultipleAsRead(db, notificationIds, userId);
  } else {
    throw new NotificationError('Either notification_ids or mark_all must be provided', 400);
  }
}

/**
 * Get unread count for a user
 */
export async function getUnreadCount(
  db: D1Database,
  userId: string,
  schoolId: string
): Promise<number> {
  return notificationRepo.countUnreadForUser(db, userId, schoolId);
}

/**
 * Send scheduled notifications (called by cron job or queue)
 */
export async function sendScheduledNotifications(db: D1Database): Promise<void> {
  // Get notifications that are scheduled and should be sent now
  const now = new Date().toISOString();
  
  const scheduledNotifications = await db
    .prepare(`
      SELECT * FROM notifications
      WHERE status = 'scheduled'
        AND scheduled_at IS NOT NULL
        AND scheduled_at <= ?
    `)
    .bind(now)
    .all<Notification>();

  if (!scheduledNotifications.results || scheduledNotifications.results.length === 0) {
    return;
  }

  console.log(`Sending ${scheduledNotifications.results.length} scheduled notifications`);

  for (const notification of scheduledNotifications.results) {
    try {
      // Send to recipients
      await sendNotificationToRecipients(db, notification);

      // Update status
      await notificationRepo.update(db, notification.id, notification.school_id, {
        status: 'sent',
        sent_at: new Date().toISOString(),
      });

      console.log(`Sent scheduled notification ${notification.id}`);
    } catch (error) {
      console.error(`Failed to send scheduled notification ${notification.id}:`, error);
      
      // Mark as failed
      await notificationRepo.update(db, notification.id, notification.school_id, {
        status: 'failed',
      });
    }
  }
}
