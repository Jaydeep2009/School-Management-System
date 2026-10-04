/**
 * Cron Job Handlers
 * 
 * Scheduled tasks for the SMS application
 * Configured via wrangler.toml triggers.crons
 */

import { cleanupExpiredSessions, cleanupOldRevokedSessions, getSessionStatistics } from './auth/session-cleanup';
import { logger } from './lib/logging/logger';

interface Env {
  DB: D1Database;
}

/**
 * Handle scheduled cron triggers
 * 
 * Cron expressions in wrangler.toml:
 * - 0 2 * * * (Daily at 2 AM)
 * - 0 star-slash-6 * * * (Every 6 hours)
 * - star-slash-30 * * * * (Every 30 minutes)
 */
export async function handleCron(
  event: ScheduledEvent,
  env: Env,
  ctx: ExecutionContext
): Promise<void> {
  const cron = event.cron;
  
  logger.info('CRON_TRIGGER', {
    cron,
    scheduledTime: event.scheduledTime,
  });

  try {
    // Run different tasks based on cron schedule
    switch (cron) {
      case '0 2 * * *': // Daily at 2 AM
        await dailyMaintenance(env);
        break;
      
      case '0 */6 * * *': // Every 6 hours
        await sessionCleanup(env);
        break;
      
      case '*/30 * * * *': // Every 30 minutes
        await quickCleanup(env);
        break;
      
      default:
        logger.warn('CRON_UNKNOWN_SCHEDULE', { cron });
    }
  } catch (error) {
    logger.error('CRON_ERROR', { cron }, 'Cron job failed', error);
  }
}

/**
 * Daily maintenance tasks
 * Runs at 2 AM every day
 */
async function dailyMaintenance(env: Env): Promise<void> {
  logger.info('DAILY_MAINTENANCE_START');

  try {
    // Clean up expired sessions
    const expiredCount = await cleanupExpiredSessions(env.DB);
    
    // Clean up old revoked sessions (older than 90 days)
    const revokedCount = await cleanupOldRevokedSessions(env.DB, 90);
    
    // Get statistics
    const stats = await getSessionStatistics(env.DB);
    
    logger.info('DAILY_MAINTENANCE_COMPLETE', {
      expiredSessionsDeleted: expiredCount,
      oldRevokedSessionsDeleted: revokedCount,
      sessionStats: stats,
    });
  } catch (error) {
    logger.error('DAILY_MAINTENANCE_ERROR', {}, 'Daily maintenance failed', error);
    throw error;
  }
}

/**
 * Session cleanup
 * Runs every 6 hours
 */
async function sessionCleanup(env: Env): Promise<void> {
  logger.info('SESSION_CLEANUP_START');

  try {
    const expiredCount = await cleanupExpiredSessions(env.DB);
    
    logger.info('SESSION_CLEANUP_COMPLETE', {
      expiredSessionsDeleted: expiredCount,
    });
  } catch (error) {
    logger.error('SESSION_CLEANUP_ERROR', {}, 'Session cleanup failed', error);
    throw error;
  }
}

/**
 * Quick cleanup tasks
 * Runs every 30 minutes
 */
async function quickCleanup(env: Env): Promise<void> {
  logger.info('QUICK_CLEANUP_START');

  try {
    // Just clean expired sessions
    const expiredCount = await cleanupExpiredSessions(env.DB);
    
    logger.info('QUICK_CLEANUP_COMPLETE', {
      expiredSessionsDeleted: expiredCount,
    });
  } catch (error) {
    logger.error('QUICK_CLEANUP_ERROR', {}, 'Quick cleanup failed', error);
    throw error;
  }
}
