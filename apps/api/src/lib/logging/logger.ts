/**
 * Structured logging utilities
 * 
 * SECURITY: Never log passwords, tokens, or other sensitive credentials
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogContext {
  requestId?: string;
  userId?: string;
  schoolId?: string;
  role?: string;
  sessionId?: string;
  durationMs?: number;
  reasonCode?: string;
  [key: string]: unknown;
}

export interface LogEntry {
  level: LogLevel;
  event: string;
  timestamp: string;
  context?: LogContext;
  message?: string;
  error?: unknown;
}

/**
 * Authentication event types
 */
export const AuthEvents = {
  // Login events
  LOGIN_ATTEMPT: 'AUTH_LOGIN_ATTEMPT',
  LOGIN_SUCCESS: 'AUTH_LOGIN_SUCCESS',
  LOGIN_FAILURE: 'AUTH_LOGIN_FAILURE',

  // Activation events
  ACTIVATION_ATTEMPT: 'AUTH_ACTIVATION_ATTEMPT',
  ACTIVATION_SUCCESS: 'AUTH_ACTIVATION_SUCCESS',
  ACTIVATION_FAILURE: 'AUTH_ACTIVATION_FAILURE',

  // Password change events
  PASSWORD_CHANGE_ATTEMPT: 'AUTH_PASSWORD_CHANGE_ATTEMPT',
  PASSWORD_CHANGE_SUCCESS: 'AUTH_PASSWORD_CHANGE_SUCCESS',
  PASSWORD_CHANGE_FAILURE: 'AUTH_PASSWORD_CHANGE_FAILURE',

  // Refresh events
  REFRESH_ATTEMPT: 'AUTH_REFRESH_ATTEMPT',
  REFRESH_SUCCESS: 'AUTH_REFRESH_SUCCESS',
  REFRESH_FAILURE: 'AUTH_REFRESH_FAILURE',
  REFRESH_REUSE_DETECTED: 'AUTH_REFRESH_REUSE_DETECTED',

  // Logout events
  LOGOUT: 'AUTH_LOGOUT',
  SESSION_REVOKED: 'AUTH_SESSION_REVOKED',
  ALL_SESSIONS_REVOKED: 'AUTH_ALL_SESSIONS_REVOKED',

  // Token validation events
  TOKEN_INVALID: 'AUTH_TOKEN_INVALID',
  TOKEN_EXPIRED: 'AUTH_TOKEN_EXPIRED',
  ACCOUNT_DISABLED: 'AUTH_ACCOUNT_DISABLED',
  ACCESS_DENIED: 'AUTH_ACCESS_DENIED',
} as const;

/**
 * Reason codes for authentication failures
 */
export const AuthFailureReasons = {
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  ACCOUNT_DISABLED: 'ACCOUNT_DISABLED',
  ACTIVATION_EXPIRED: 'ACTIVATION_EXPIRED',
  ACTIVATION_INVALID: 'ACTIVATION_INVALID',
  SESSION_EXPIRED: 'SESSION_EXPIRED',
  SESSION_REVOKED: 'SESSION_REVOKED',
  TOKEN_INVALID: 'TOKEN_INVALID',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  TOKEN_VERSION_MISMATCH: 'TOKEN_VERSION_MISMATCH',
  REFRESH_REUSE: 'REFRESH_REUSE',
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  WEAK_PASSWORD: 'WEAK_PASSWORD',
  PASSWORD_MISMATCH: 'PASSWORD_MISMATCH',
} as const;

/**
 * Structured logger
 */
export class Logger {
  private log(level: LogLevel, event: string, context?: LogContext, message?: string, error?: unknown): void {
    const entry: LogEntry = {
      level,
      event,
      timestamp: new Date().toISOString(),
      context,
      message,
      error: error instanceof Error ? { message: error.message, stack: error.stack } : error,
    };

    // Use appropriate console method
    const output = JSON.stringify(entry);
    switch (level) {
      case 'debug':
        console.debug(output);
        break;
      case 'info':
        console.info(output);
        break;
      case 'warn':
        console.warn(output);
        break;
      case 'error':
        console.error(output);
        break;
    }
  }

  debug(event: string, context?: LogContext, message?: string): void {
    this.log('debug', event, context, message);
  }

  info(event: string, context?: LogContext, message?: string): void {
    this.log('info', event, context, message);
  }

  warn(event: string, context?: LogContext, message?: string): void {
    this.log('warn', event, context, message);
  }

  error(event: string, context?: LogContext, message?: string, error?: unknown): void {
    this.log('error', event, context, message, error);
  }
}

/**
 * Global logger instance
 */
export const logger = new Logger();
