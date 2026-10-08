-- Migration: Create Notifications System
-- Description: Comprehensive notification system with support for in-app and push notifications
-- Author: System
-- Date: 2026-09-19

-- ============================================================================
-- NOTIFICATIONS TABLE
-- ============================================================================
-- Stores notification messages sent by principals
CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  school_id TEXT NOT NULL,
  sender_id TEXT NOT NULL, -- Principal who sent the notification
  
  -- Content
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  
  -- Targeting
  target_audience TEXT NOT NULL CHECK (target_audience IN ('all', 'teachers', 'students')),
  
  -- Metadata
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'sent', 'failed')),
  
  -- Scheduling
  scheduled_at TEXT, -- ISO 8601 timestamp for scheduled notifications
  sent_at TEXT, -- ISO 8601 timestamp when actually sent
  
  -- Push notification tracking
  push_notification_enabled INTEGER DEFAULT 0, -- 1 if push notifications should be sent
  push_notification_sent INTEGER DEFAULT 0, -- 1 if push has been sent
  
  -- Audit
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  
  -- Foreign keys
  FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE,
  FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_notifications_school ON notifications(school_id);
CREATE INDEX IF NOT EXISTS idx_notifications_sender ON notifications(sender_id);
CREATE INDEX IF NOT EXISTS idx_notifications_target ON notifications(target_audience);
CREATE INDEX IF NOT EXISTS idx_notifications_status ON notifications(status);
CREATE INDEX IF NOT EXISTS idx_notifications_sent_at ON notifications(sent_at);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);

-- ============================================================================
-- NOTIFICATION RECIPIENTS TABLE
-- ============================================================================
-- Tracks delivery and read status for each user
CREATE TABLE IF NOT EXISTS notification_recipients (
  id TEXT PRIMARY KEY,
  notification_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('principal', 'teacher', 'student')),
  
  -- Delivery tracking
  delivered_at TEXT, -- When notification was delivered (created in DB)
  read_at TEXT, -- When user marked as read
  
  -- Audit
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  
  -- Foreign keys
  FOREIGN KEY (notification_id) REFERENCES notifications(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  
  -- Ensure one recipient record per notification per user
  UNIQUE(notification_id, user_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_notification_recipients_notification ON notification_recipients(notification_id);
CREATE INDEX IF NOT EXISTS idx_notification_recipients_user ON notification_recipients(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_recipients_read ON notification_recipients(read_at);
CREATE INDEX IF NOT EXISTS idx_notification_recipients_user_unread ON notification_recipients(user_id, read_at) WHERE read_at IS NULL;

-- ============================================================================
-- PUSH SUBSCRIPTIONS TABLE
-- ============================================================================
-- Stores push notification subscriptions for web app (future use)
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  
  -- Push API subscription data
  endpoint TEXT NOT NULL,
  keys_json TEXT NOT NULL, -- JSON containing p256dh and auth keys
  
  -- Metadata
  user_agent TEXT,
  ip_address TEXT,
  
  -- Status
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'expired', 'revoked')),
  expires_at TEXT,
  
  -- Audit
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  last_used_at TEXT,
  
  -- Foreign keys
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  
  -- Ensure unique endpoint per user
  UNIQUE(user_id, endpoint)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user ON push_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_status ON push_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_endpoint ON push_subscriptions(endpoint);

-- ============================================================================
-- TRIGGERS FOR UPDATED_AT
-- ============================================================================

-- Notifications updated_at trigger
CREATE TRIGGER IF NOT EXISTS notifications_updated_at
AFTER UPDATE ON notifications
FOR EACH ROW
BEGIN
  UPDATE notifications
  SET updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
  WHERE id = NEW.id;
END;

-- Notification recipients updated_at trigger
CREATE TRIGGER IF NOT EXISTS notification_recipients_updated_at
AFTER UPDATE ON notification_recipients
FOR EACH ROW
BEGIN
  UPDATE notification_recipients
  SET updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
  WHERE id = NEW.id;
END;

-- Push subscriptions updated_at trigger
CREATE TRIGGER IF NOT EXISTS push_subscriptions_updated_at
AFTER UPDATE ON push_subscriptions
FOR EACH ROW
BEGIN
  UPDATE push_subscriptions
  SET updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
  WHERE id = NEW.id;
END;
