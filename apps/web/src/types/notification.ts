/**
 * Notification Types for Frontend
 */

export type TargetAudience = 'all' | 'teachers' | 'students';
export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent';
export type NotificationStatus = 'draft' | 'scheduled' | 'sent' | 'failed';

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
  
  // Enriched fields
  sender_name?: string;
  recipient_count?: number;
  read_count?: number;
  unread_count?: number;
}

export interface UserNotification extends Notification {
  is_read: boolean;
  read_at: string | null;
  delivered_at: string | null;
}

export interface CreateNotificationRequest {
  title: string;
  message: string;
  target_audience: TargetAudience;
  priority?: NotificationPriority;
  scheduled_at?: string;
  push_notification_enabled?: boolean;
}
