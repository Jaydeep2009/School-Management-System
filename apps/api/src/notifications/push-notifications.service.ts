/**
 * Push Notification Service
 * 
 * Service for managing web push notifications (for future webapp)
 */

import type { D1Database } from '@cloudflare/workers-types';
import { randomUUID } from 'node:crypto';
import * as notificationRepo from './notifications.repository';
import type {
  PushSubscription,
  CreatePushSubscriptionRequest,
} from './notifications.types';

/**
 * Create a push notification subscription
 */
export async function createSubscription(
  db: D1Database,
  userId: string,
  data: CreatePushSubscriptionRequest,
  userAgent: string | null,
  ipAddress: string | null
): Promise<PushSubscription> {
  // Check if subscription already exists
  const existing = await db
    .prepare('SELECT * FROM push_subscriptions WHERE user_id = ? AND endpoint = ?')
    .bind(userId, data.endpoint)
    .first<PushSubscription>();

  if (existing) {
    // Update existing subscription
    const updated = await db
      .prepare(`
        UPDATE push_subscriptions
        SET keys_json = ?, user_agent = ?, status = 'active', updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
        WHERE id = ?
        RETURNING *
      `)
      .bind(JSON.stringify(data.keys), userAgent, existing.id)
      .first<PushSubscription>();

    if (!updated) {
      throw new Error('Failed to update push subscription');
    }

    return updated;
  }

  // Create new subscription
  const subscription = await notificationRepo.createPushSubscription(db, {
    id: randomUUID(),
    user_id: userId,
    endpoint: data.endpoint,
    keys_json: JSON.stringify(data.keys),
    user_agent: userAgent,
    ip_address: ipAddress,
    status: 'active',
    expires_at: null, // Can be set based on browser's subscription expiry
  });

  return subscription;
}

/**
 * Delete a push subscription
 */
export async function deleteSubscription(
  db: D1Database,
  endpoint: string,
  userId: string
): Promise<void> {
  const success = await notificationRepo.deletePushSubscription(db, endpoint, userId);

  if (!success) {
    throw new Error('Failed to delete push subscription');
  }
}

/**
 * Get user's push subscriptions
 */
export async function getUserSubscriptions(
  db: D1Database,
  userId: string
): Promise<PushSubscription[]> {
  return notificationRepo.findPushSubscriptionsByUser(db, userId);
}

/**
 * Send push notification to user
 * 
 * TODO: Implement actual push notification sending when webapp is ready
 * This will use the Web Push API with VAPID keys
 */
export async function sendPushNotification(
  db: D1Database,
  userId: string,
  title: string,
  body: string,
  data?: any
): Promise<void> {
  const subscriptions = await getUserSubscriptions(db, userId);

  if (subscriptions.length === 0) {
    console.log(`No push subscriptions found for user ${userId}`);
    return;
  }

  // TODO: Implement actual push sending
  // This will require:
  // 1. VAPID keys configuration
  // 2. web-push library or native Fetch API calls
  // 3. Error handling for expired/invalid subscriptions

  console.log(`[PUSH] Would send to ${subscriptions.length} subscription(s) for user ${userId}`);
  console.log(`[PUSH] Title: ${title}`);
  console.log(`[PUSH] Body: ${body}`);

  // Placeholder for future implementation:
  /*
  const webpush = require('web-push');
  
  webpush.setVapidDetails(
    'mailto:admin@yourschool.com',
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );

  for (const subscription of subscriptions) {
    try {
      const pushSubscription = {
        endpoint: subscription.endpoint,
        keys: JSON.parse(subscription.keys_json),
      };

      await webpush.sendNotification(
        pushSubscription,
        JSON.stringify({
          title,
          body,
          data,
          icon: '/icon.png',
          badge: '/badge.png',
        })
      );

      // Update last_used_at
      await db
        .prepare('UPDATE push_subscriptions SET last_used_at = ? WHERE id = ?')
        .bind(new Date().toISOString(), subscription.id)
        .run();
    } catch (error) {
      console.error(`Failed to send push to subscription ${subscription.id}:`, error);
      
      // If subscription is invalid, mark as expired
      if (error.statusCode === 410 || error.statusCode === 404) {
        await db
          .prepare('UPDATE push_subscriptions SET status = ? WHERE id = ?')
          .bind('expired', subscription.id)
          .run();
      }
    }
  }
  */
}
