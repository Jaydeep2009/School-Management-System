/**
 * Session Cleanup Service
 * 
 * Removes expired sessions from the database to prevent table bloat
 * Should be run periodically via Cloudflare Cron Trigger
 */

import { logger } from '../lib/logging/logger';

/**
 * Clean up expired sessions from the database
 * 
 * @param db - D1 Database instance
 * @returns Number of sessions deleted
 */
export async function cleanupExpiredSessions(db: D1Database): Promise<number> {
  const startTime = Date.now();
  const now = Date.now();

  try {
    logger.info('SESSION_CLEANUP_START', {
      timestamp: now,
    });

    // Delete sessions that have expired
    const result = await db
      .prepare(`DELETE FROM sessions WHERE expires_at < ?`)
      .bind(now)
      .run();

    const deletedCount = result.meta?.changes || 0;

    logger.info('SESSION_CLEANUP_COMPLETE', {
      deletedCount,
      durationMs: Date.now() - startTime,
    });

    return deletedCount;
  } catch (error) {
    logger.error('SESSION_CLEANUP_ERROR', {
      durationMs: Date.now() - startTime,
    }, 'Failed to clean up expired sessions', error);
    
    throw error;
  }
}

/**
 * Clean up old revoked sessions (older than 90 days)
 * Keeps revoked sessions for audit purposes for 90 days, then removes them
 * 
 * @param db - D1 Database instance
 * @param retentionDays - Number of days to keep revoked sessions (default: 90)
 * @returns Number of sessions deleted
 */
export async function cleanupOldRevokedSessions(
  db: D1Database,
  retentionDays: number = 90
): Promise<number> {
  const startTime = Date.now();
  const cutoffTime = Date.now() - (retentionDays * 24 * 60 * 60 * 1000);

  try {
    logger.info('REVOKED_SESSION_CLEANUP_START', {
      retentionDays,
      cutoffTime,
    });

    // Delete revoked sessions older than retention period
    const result = await db
      .prepare(`DELETE FROM sessions WHERE revoked_at IS NOT NULL AND revoked_at < ?`)
      .bind(cutoffTime)
      .run();

    const deletedCount = result.meta?.changes || 0;

    logger.info('REVOKED_SESSION_CLEANUP_COMPLETE', {
      deletedCount,
      durationMs: Date.now() - startTime,
    });

    return deletedCount;
  } catch (error) {
    logger.error('REVOKED_SESSION_CLEANUP_ERROR', {
      durationMs: Date.now() - startTime,
    }, 'Failed to clean up old revoked sessions', error);
    
    throw error;
  }
}

/**
 * Get statistics about sessions in the database
 * Useful for monitoring and capacity planning
 * 
 * @param db - D1 Database instance
 * @returns Session statistics
 */
export async function getSessionStatistics(db: D1Database): Promise<{
  total: number;
  active: number;
  expired: number;
  revoked: number;
}> {
  const now = Date.now();

  const [total, active, expired, revoked] = await Promise.all([
    db.prepare(`SELECT COUNT(*) as count FROM sessions`).first<{ count: number }>(),
    db.prepare(`SELECT COUNT(*) as count FROM sessions WHERE expires_at > ? AND revoked_at IS NULL`)
      .bind(now)
      .first<{ count: number }>(),
    db.prepare(`SELECT COUNT(*) as count FROM sessions WHERE expires_at <= ? AND revoked_at IS NULL`)
      .bind(now)
      .first<{ count: number }>(),
    db.prepare(`SELECT COUNT(*) as count FROM sessions WHERE revoked_at IS NOT NULL`)
      .first<{ count: number }>(),
  ]);

  return {
    total: total?.count || 0,
    active: active?.count || 0,
    expired: expired?.count || 0,
    revoked: revoked?.count || 0,
  };
}
