-- Migration: Add FCM Token Support
-- Description: Store FCM device tokens for push notifications (web + mobile)
-- Author: System
-- Date: 2026-09-19

-- ============================================================================
-- ADD FCM TOKEN COLUMN TO PUSH_SUBSCRIPTIONS
-- ============================================================================
-- Store FCM token for both web and mobile push notifications
-- Replaces the Web Push endpoint/keys approach with unified FCM

ALTER TABLE push_subscriptions ADD COLUMN fcm_token TEXT;
ALTER TABLE push_subscriptions ADD COLUMN device_type TEXT CHECK (device_type IN ('web', 'android', 'ios'));

-- Create index for fast FCM token lookups
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_fcm_token ON push_subscriptions(fcm_token);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_device_type ON push_subscriptions(device_type);

-- ============================================================================
-- NOTES
-- ============================================================================
-- 1. FCM token is used for both web and mobile devices
-- 2. device_type helps differentiate web from mobile for analytics
-- 3. endpoint and keys_json columns remain for backward compatibility
-- 4. A single user can have multiple tokens (multiple devices)
-- 5. Tokens should be refreshed when FCM indicates they're invalid

