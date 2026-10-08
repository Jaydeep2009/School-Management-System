/**
 * Notification Types
 * 
 * Type definitions for the notification system
 */

export type TargetAudience = 'all' | 'teachers' | 'students';
export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent';
export type NotificationStatus = 'draft' | 'scheduled' | 'sent' | 'failed';
export type UserRole = 'principal' | 'teacher' | 'student';

/**
 * Notification entity from database
 */
export interface Notification {
  id: string;
  school_id: string;
  sender_id: string;
  
  // Content
  title: string;
  message: string;
  
  // Targeting
  target_audience: TargetAudience;
  
  // Metadata
  priority: NotificationPriority;
  status: NotificationStatus;
  
  // Scheduling
  scheduled_at: string | null;
  sent_at: string | null;
  
  // Push notification tracking
  push_notification_enabled: number;
  push_notification_sent: number;
  
  // Audit
  created_at: string;
  updated_at: string;
}

/**
 * Notification with additional computed fields for API responses
 */
export interface NotificationWithDetails extends Notification {
  sender_name?: string;
  recipient_count?: number;
  read_count?: number;
  unread_count?: number;
}

/**
 * Notification recipient entity
 */
export interface NotificationRecipient {
  id: string;
  notification_id: string;
  user_id: string;
  role: UserRole;
  
  // Delivery tracking
  delivered_at: string | null;
  read_at: string | null;
  
  // Audit
  created_at: string;
  updated_at: string;
}

/**
 * Notification for a specific user with read status
 */
export interface UserNotification extends Notification {
  sender_name?: string;
  is_read: boolean;
  read_at: string | null;
  delivered_at: string | null;
}

/**
 * Push subscription entity
 */
export interface PushSubscription {
  id: string;
  user_id: string;
  
  // FCM token (unified for web + mobile)
  fcm_token: string | null;
  device_type: 'web' | 'android' | 'ios' | null;
  
  // Web Push API data (legacy/fallback)
  endpoint: string;
  keys_json: string;
  
  // Metadata
  user_agent: string | null;
  ip_address: string | null;
  
  // Status
  status: 'active' | 'expired' | 'revoked';
  expires_at: string | null;
  
  // Audit
  created_at: string;
  updated_at: string;
  last_used_at: string | null;
}

/**
 * Push subscription keys
 */
export interface PushSubscriptionKeys {
  p256dh: string;
  auth: string;
}

/**
 * Request to create a notification
 */
export interface CreateNotificationRequest {
  title: string;
  message: string;
  target_audience: TargetAudience;
  priority?: NotificationPriority;
  scheduled_at?: string; // ISO 8601 timestamp
  push_notification_enabled?: boolean;
}

/**
 * Request to update a notification
 */
export interface UpdateNotificationRequest {
  title?: string;
  message?: string;
  target_audience?: TargetAudience;
  priority?: NotificationPriority;
  scheduled_at?: string;
  status?: NotificationStatus;
}

/**
 * Request to subscribe to push notifications
 */
export interface CreatePushSubscriptionRequest {
  fcm_token: string;
  device_type: 'web' | 'android' | 'ios';
  user_agent?: string;
  // Legacy Web Push support (optional)
  endpoint?: string;
  keys?: PushSubscriptionKeys;
}

/**
 * Notification filters for listing
 */
export interface NotificationFilters {
  status?: NotificationStatus;
  target_audience?: TargetAudience;
  priority?: NotificationPriority;
  from_date?: string;
  to_date?: string;
}

/**
 * User notification filters
 */
export interface UserNotificationFilters {
  unread_only?: boolean;
  priority?: NotificationPriority;
  from_date?: string;
  to_date?: string;
}
