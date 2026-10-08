/**
 * Notification Repository
 * 
 * Database operations for notifications
 */

import type { D1Database } from '@cloudflare/workers-types';
import type {
  Notification,
  NotificationRecipient,
  UserNotification,
  PushSubscription,
  NotificationFilters,
  UserNotificationFilters,
} from './notifications.types';

/**
 * Create a notification
 */
export async function create(
  db: D1Database,
  notification: Omit<Notification, 'created_at' | 'updated_at'>
): Promise<Notification> {
  const result = await db
    .prepare(`
      INSERT INTO notifications (
        id, school_id, sender_id, title, message, target_audience,
        priority, status, scheduled_at, sent_at,
        push_notification_enabled, push_notification_sent
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      RETURNING *
    `)
    .bind(
      notification.id,
      notification.school_id,
      notification.sender_id,
      notification.title,
      notification.message,
      notification.target_audience,
      notification.priority,
      notification.status,
      notification.scheduled_at,
      notification.sent_at,
      notification.push_notification_enabled ? 1 : 0,
      notification.push_notification_sent ? 1 : 0
    )
    .first<Notification>();

  if (!result) {
    throw new Error('Failed to create notification');
  }

  return result;
}

/**
 * Find notification by ID
 */
export async function findById(
  db: D1Database,
  id: string,
  schoolId: string
): Promise<Notification | null> {
  return db
    .prepare(`
      SELECT * FROM notifications
      WHERE id = ? AND school_id = ?
    `)
    .bind(id, schoolId)
    .first<Notification>();
}

/**
 * List notifications sent by principal (with pagination)
 */
export async function list(
  db: D1Database,
  schoolId: string,
  filters: NotificationFilters = {},
  limit: number = 50,
  offset: number = 0
): Promise<Notification[]> {
  let query = `
    SELECT * FROM notifications
    WHERE school_id = ?
  `;
  const params: any[] = [schoolId];

  if (filters.status) {
    query += ` AND status = ?`;
    params.push(filters.status);
  }

  if (filters.target_audience) {
    query += ` AND target_audience = ?`;
    params.push(filters.target_audience);
  }

  if (filters.priority) {
    query += ` AND priority = ?`;
    params.push(filters.priority);
  }

  if (filters.from_date) {
    query += ` AND created_at >= ?`;
    params.push(filters.from_date);
  }

  if (filters.to_date) {
    query += ` AND created_at <= ?`;
    params.push(filters.to_date);
  }

  query += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`;
  params.push(limit, offset);

  const result = await db.prepare(query).bind(...params).all<Notification>();
  return result.results || [];
}

/**
 * Count notifications for pagination
 */
export async function count(
  db: D1Database,
  schoolId: string,
  filters: NotificationFilters = {}
): Promise<number> {
  let query = `
    SELECT COUNT(*) as count FROM notifications
    WHERE school_id = ?
  `;
  const params: any[] = [schoolId];

  if (filters.status) {
    query += ` AND status = ?`;
    params.push(filters.status);
  }

  if (filters.target_audience) {
    query += ` AND target_audience = ?`;
    params.push(filters.target_audience);
  }

  if (filters.priority) {
    query += ` AND priority = ?`;
    params.push(filters.priority);
  }

  if (filters.from_date) {
    query += ` AND created_at >= ?`;
    params.push(filters.from_date);
  }

  if (filters.to_date) {
    query += ` AND created_at <= ?`;
    params.push(filters.to_date);
  }

  const result = await db.prepare(query).bind(...params).first<{ count: number }>();
  return result?.count || 0;
}

/**
 * Update notification
 */
export async function update(
  db: D1Database,
  id: string,
  schoolId: string,
  updates: Partial<Notification>
): Promise<Notification | null> {
  const fields: string[] = [];
  const params: any[] = [];

  if (updates.title !== undefined) {
    fields.push('title = ?');
    params.push(updates.title);
  }

  if (updates.message !== undefined) {
    fields.push('message = ?');
    params.push(updates.message);
  }

  if (updates.target_audience !== undefined) {
    fields.push('target_audience = ?');
    params.push(updates.target_audience);
  }

  if (updates.priority !== undefined) {
    fields.push('priority = ?');
    params.push(updates.priority);
  }

  if (updates.status !== undefined) {
    fields.push('status = ?');
    params.push(updates.status);
  }

  if (updates.scheduled_at !== undefined) {
    fields.push('scheduled_at = ?');
    params.push(updates.scheduled_at);
  }

  if (updates.sent_at !== undefined) {
    fields.push('sent_at = ?');
    params.push(updates.sent_at);
  }

  if (updates.push_notification_sent !== undefined) {
    fields.push('push_notification_sent = ?');
    params.push(updates.push_notification_sent ? 1 : 0);
  }

  if (fields.length === 0) {
    return findById(db, id, schoolId);
  }

  params.push(id, schoolId);

  const result = await db
    .prepare(`
      UPDATE notifications
      SET ${fields.join(', ')}
      WHERE id = ? AND school_id = ?
      RETURNING *
    `)
    .bind(...params)
    .first<Notification>();

  return result;
}

/**
 * Delete notification
 */
export async function deleteNotification(
  db: D1Database,
  id: string,
  schoolId: string
): Promise<boolean> {
  const result = await db
    .prepare('DELETE FROM notifications WHERE id = ? AND school_id = ?')
    .bind(id, schoolId)
    .run();

  return result.success;
}

// ============================================================================
// NOTIFICATION RECIPIENTS
// ============================================================================

/**
 * Create notification recipient
 */
export async function createRecipient(
  db: D1Database,
  recipient: Omit<NotificationRecipient, 'created_at' | 'updated_at'>
): Promise<NotificationRecipient> {
  const result = await db
    .prepare(`
      INSERT INTO notification_recipients (
        id, notification_id, user_id, role, delivered_at, read_at
      )
      VALUES (?, ?, ?, ?, ?, ?)
      RETURNING *
    `)
    .bind(
      recipient.id,
      recipient.notification_id,
      recipient.user_id,
      recipient.role,
      recipient.delivered_at,
      recipient.read_at
    )
    .first<NotificationRecipient>();

  if (!result) {
    throw new Error('Failed to create notification recipient');
  }

  return result;
}

/**
 * Batch create recipients for a notification
 */
export async function createRecipientsInBatch(
  db: D1Database,
  recipients: Omit<NotificationRecipient, 'created_at' | 'updated_at'>[]
): Promise<void> {
  if (recipients.length === 0) return;

  // SQLite has a limit on the number of parameters, so batch in chunks of 100
  const batchSize = 100;
  for (let i = 0; i < recipients.length; i += batchSize) {
    const batch = recipients.slice(i, i + batchSize);
    
    const placeholders = batch.map(() => '(?, ?, ?, ?, ?, ?)').join(', ');
    const params = batch.flatMap(r => [
      r.id,
      r.notification_id,
      r.user_id,
      r.role,
      r.delivered_at,
      r.read_at,
    ]);

    await db
      .prepare(`
        INSERT INTO notification_recipients (
          id, notification_id, user_id, role, delivered_at, read_at
        )
        VALUES ${placeholders}
      `)
      .bind(...params)
      .run();
  }
}

/**
 * Get user's notifications
 */
export async function findUserNotifications(
  db: D1Database,
  userId: string,
  schoolId: string,
  filters: UserNotificationFilters = {},
  limit: number = 50,
  offset: number = 0
): Promise<UserNotification[]> {
  let query = `
    SELECT 
      n.*,
      nr.read_at,
      nr.delivered_at,
      CASE WHEN nr.read_at IS NULL THEN 0 ELSE 1 END as is_read,
      u.full_name as sender_name
    FROM notifications n
    INNER JOIN notification_recipients nr ON n.id = nr.notification_id
    LEFT JOIN users u ON n.sender_id = u.id
    WHERE nr.user_id = ? AND n.school_id = ?
  `;
  const params: any[] = [userId, schoolId];

  if (filters.unread_only) {
    query += ` AND nr.read_at IS NULL`;
  }

  if (filters.priority) {
    query += ` AND n.priority = ?`;
    params.push(filters.priority);
  }

  if (filters.from_date) {
    query += ` AND n.created_at >= ?`;
    params.push(filters.from_date);
  }

  if (filters.to_date) {
    query += ` AND n.created_at <= ?`;
    params.push(filters.to_date);
  }

  query += ` ORDER BY n.created_at DESC LIMIT ? OFFSET ?`;
  params.push(limit, offset);

  const result = await db.prepare(query).bind(...params).all<UserNotification>();
  return result.results || [];
}

/**
 * Count user's unread notifications
 */
export async function countUnreadForUser(
  db: D1Database,
  userId: string,
  schoolId: string
): Promise<number> {
  const result = await db
    .prepare(`
      SELECT COUNT(*) as count
      FROM notification_recipients nr
      INNER JOIN notifications n ON nr.notification_id = n.id
      WHERE nr.user_id = ? AND n.school_id = ? AND nr.read_at IS NULL
    `)
    .bind(userId, schoolId)
    .first<{ count: number }>();

  return result?.count || 0;
}

/**
 * Mark notification as read for a user
 */
export async function markAsRead(
  db: D1Database,
  notificationId: string,
  userId: string
): Promise<boolean> {
  const result = await db
    .prepare(`
      UPDATE notification_recipients
      SET read_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
      WHERE notification_id = ? AND user_id = ? AND read_at IS NULL
    `)
    .bind(notificationId, userId)
    .run();

  return result.success;
}

/**
 * Mark multiple notifications as read for a user
 */
export async function markMultipleAsRead(
  db: D1Database,
  notificationIds: string[],
  userId: string
): Promise<boolean> {
  if (notificationIds.length === 0) return true;

  const placeholders = notificationIds.map(() => '?').join(', ');
  const result = await db
    .prepare(`
      UPDATE notification_recipients
      SET read_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
      WHERE notification_id IN (${placeholders}) AND user_id = ? AND read_at IS NULL
    `)
    .bind(...notificationIds, userId)
    .run();

  return result.success;
}

/**
 * Mark all notifications as read for a user
 */
export async function markAllAsRead(
  db: D1Database,
  userId: string,
  schoolId: string
): Promise<boolean> {
  const result = await db
    .prepare(`
      UPDATE notification_recipients
      SET read_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
      WHERE user_id = ? 
        AND read_at IS NULL
        AND notification_id IN (
          SELECT id FROM notifications WHERE school_id = ?
        )
    `)
    .bind(userId, schoolId)
    .run();

  return result.success;
}

// ============================================================================
// PUSH SUBSCRIPTIONS
// ============================================================================

/**
 * Create push subscription
 */
export async function createPushSubscription(
  db: D1Database,
  subscription: Omit<PushSubscription, 'created_at' | 'updated_at' | 'last_used_at'>
): Promise<PushSubscription> {
  const result = await db
    .prepare(`
      INSERT INTO push_subscriptions (
        id, user_id, endpoint, keys_json, user_agent, ip_address, status, expires_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      RETURNING *
    `)
    .bind(
      subscription.id,
      subscription.user_id,
      subscription.endpoint,
      subscription.keys_json,
      subscription.user_agent,
      subscription.ip_address,
      subscription.status,
      subscription.expires_at
    )
    .first<PushSubscription>();

  if (!result) {
    throw new Error('Failed to create push subscription');
  }

  return result;
}

/**
 * Find push subscriptions for a user
 */
export async function findPushSubscriptionsByUser(
  db: D1Database,
  userId: string
): Promise<PushSubscription[]> {
  const result = await db
    .prepare(`
      SELECT * FROM push_subscriptions
      WHERE user_id = ? AND status = 'active'
    `)
    .bind(userId)
    .all<PushSubscription>();

  return result.results || [];
}

/**
 * Delete push subscription
 */
export async function deletePushSubscription(
  db: D1Database,
  endpoint: string,
  userId: string
): Promise<boolean> {
  const result = await db
    .prepare('DELETE FROM push_subscriptions WHERE endpoint = ? AND user_id = ?')
    .bind(endpoint, userId)
    .run();

  return result.success;
}
