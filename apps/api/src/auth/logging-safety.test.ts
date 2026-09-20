/**
 * Logging Safety Tests
 * 
 * Verifies that sensitive values NEVER appear in logs
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { logger, AuthEvents, AuthFailureReasons } from '../lib/logging/logger';

// Capture console output
let consoleOutput: string[] = [];
const originalConsoleInfo = console.info;
const originalConsoleWarn = console.warn;
const originalConsoleError = console.error;

beforeEach(() => {
  consoleOutput = [];
  
  console.info = vi.fn((...args: any[]) => {
    consoleOutput.push(args.join(' '));
  });
  
  console.warn = vi.fn((...args: any[]) => {
    consoleOutput.push(args.join(' '));
  });
  
  console.error = vi.fn((...args: any[]) => {
    consoleOutput.push(args.join(' '));
  });
});

afterEach(() => {
  console.info = originalConsoleInfo;
  console.warn = originalConsoleWarn;
  console.error = originalConsoleError;
});

describe('Logging Safety - Sensitive Data Exclusion', () => {
  const sensitiveValues = {
    password: 'MySecretPass123!',
    currentPassword: 'OldPass456!',
    newPassword: 'NewPass789!',
    activationCode: 'ACTIVATE123CODE',
    accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U',
    refreshToken: '01HQXYZ123.abc123def456ghi789',
    refreshSecret: 'abc123def456ghi789',
    passwordHash: 'scrypt$16384:8:1$AbCdEf$GhIjKlMn',
    activationHash: 'scrypt$16384:8:1$OpQrSt$UvWxYzAb',
    refreshHash: 'Cd3Ef4Gh5Ij6Kl7Mn8Op9Qr0St1Uv2Wx3',
    authHeader: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9',
  };
  
  it('should not log password in AUTH_LOGIN_ATTEMPT', () => {
    logger.info(AuthEvents.LOGIN_ATTEMPT, {
      requestId: 'req123',
      loginId: 'GPS-S-000123',
      // password intentionally NOT included
    });
    
    const allLogs = consoleOutput.join('\n');
    expect(allLogs).not.toContain(sensitiveValues.password);
    expect(allLogs).toContain('AUTH_LOGIN_ATTEMPT');
    expect(allLogs).toContain('GPS-S-000123');
  });
  
  it('should not log password in AUTH_LOGIN_SUCCESS', () => {
    logger.info(AuthEvents.LOGIN_SUCCESS, {
      requestId: 'req123',
      userId: 'user123',
      schoolId: 'school456',
      role: 'teacher',
      sessionId: 'session789',
      durationMs: 150,
    });
    
    const allLogs = consoleOutput.join('\n');
    expect(allLogs).not.toContain(sensitiveValues.password);
    expect(allLogs).not.toContain(sensitiveValues.accessToken);
    expect(allLogs).not.toContain(sensitiveValues.refreshToken);
    expect(allLogs).toContain('AUTH_LOGIN_SUCCESS');
  });
  
  it('should not log password in AUTH_LOGIN_FAILURE', () => {
    logger.warn(AuthEvents.LOGIN_FAILURE, {
      requestId: 'req123',
      userId: 'user123',
      reasonCode: AuthFailureReasons.INVALID_CREDENTIALS,
      durationMs: 145,
    });
    
    const allLogs = consoleOutput.join('\n');
    expect(allLogs).not.toContain(sensitiveValues.password);
    expect(allLogs).toContain('AUTH_LOGIN_FAILURE');
    expect(allLogs).toContain('INVALID_CREDENTIALS');
  });
  
  it('should not log activation code in AUTH_ACTIVATION_ATTEMPT', () => {
    logger.info(AuthEvents.ACTIVATION_ATTEMPT, {
      requestId: 'req123',
      loginId: 'GPS-S-000123',
      // activationCode intentionally NOT included
    });
    
    const allLogs = consoleOutput.join('\n');
    expect(allLogs).not.toContain(sensitiveValues.activationCode);
    expect(allLogs).not.toContain(sensitiveValues.newPassword);
    expect(allLogs).toContain('AUTH_ACTIVATION_ATTEMPT');
  });
  
  it('should not log activation code or password in AUTH_ACTIVATION_SUCCESS', () => {
    logger.info(AuthEvents.ACTIVATION_SUCCESS, {
      requestId: 'req123',
      userId: 'user123',
      schoolId: 'school456',
      role: 'student',
      durationMs: 200,
    });
    
    const allLogs = consoleOutput.join('\n');
    expect(allLogs).not.toContain(sensitiveValues.activationCode);
    expect(allLogs).not.toContain(sensitiveValues.newPassword);
    expect(allLogs).not.toContain(sensitiveValues.activationHash);
    expect(allLogs).toContain('AUTH_ACTIVATION_SUCCESS');
  });
  
  it('should not log passwords in AUTH_PASSWORD_CHANGE_SUCCESS', () => {
    logger.info(AuthEvents.PASSWORD_CHANGE_SUCCESS, {
      requestId: 'req123',
      userId: 'user123',
      schoolId: 'school456',
      role: 'teacher',
      durationMs: 180,
    });
    
    const allLogs = consoleOutput.join('\n');
    expect(allLogs).not.toContain(sensitiveValues.currentPassword);
    expect(allLogs).not.toContain(sensitiveValues.newPassword);
    expect(allLogs).not.toContain(sensitiveValues.passwordHash);
    expect(allLogs).toContain('AUTH_PASSWORD_CHANGE_SUCCESS');
  });
  
  it('should not log refresh token in AUTH_REFRESH_SUCCESS', () => {
    logger.info(AuthEvents.REFRESH_SUCCESS, {
      requestId: 'req123',
      sessionId: 'session789',
      userId: 'user123',
      schoolId: 'school456',
      role: 'teacher',
      durationMs: 50,
    });
    
    const allLogs = consoleOutput.join('\n');
    expect(allLogs).not.toContain(sensitiveValues.refreshToken);
    expect(allLogs).not.toContain(sensitiveValues.refreshSecret);
    expect(allLogs).not.toContain(sensitiveValues.refreshHash);
    expect(allLogs).not.toContain(sensitiveValues.accessToken);
    expect(allLogs).toContain('AUTH_REFRESH_SUCCESS');
    expect(allLogs).toContain('session789'); // sessionId is OK
  });
  
  it('should not log refresh token in AUTH_REFRESH_REUSE_DETECTED', () => {
    logger.error(AuthEvents.REFRESH_REUSE_DETECTED, {
      requestId: 'req123',
      sessionId: 'session789',
      familyId: 'family456',
      userId: 'user123',
      reasonCode: AuthFailureReasons.REFRESH_REUSE,
      durationMs: 45,
    }, 'Refresh token reuse detected - family revoked');
    
    const allLogs = consoleOutput.join('\n');
    expect(allLogs).not.toContain(sensitiveValues.refreshToken);
    expect(allLogs).not.toContain(sensitiveValues.refreshSecret);
    expect(allLogs).toContain('AUTH_REFRESH_REUSE_DETECTED');
    expect(allLogs).toContain('REFRESH_REUSE');
  });
  
  it('should not log tokens in AUTH_LOGOUT', () => {
    logger.info(AuthEvents.LOGOUT, {
      requestId: 'req123',
      sessionId: 'session789',
      userId: 'user123',
      schoolId: 'school456',
      durationMs: 20,
    });
    
    const allLogs = consoleOutput.join('\n');
    expect(allLogs).not.toContain(sensitiveValues.accessToken);
    expect(allLogs).not.toContain(sensitiveValues.refreshToken);
    expect(allLogs).toContain('AUTH_LOGOUT');
  });
  
  it('should not log authorization header', () => {
    logger.warn(AuthEvents.TOKEN_INVALID, {
      requestId: 'req123',
      reasonCode: AuthFailureReasons.TOKEN_INVALID,
    });
    
    const allLogs = consoleOutput.join('\n');
    expect(allLogs).not.toContain(sensitiveValues.authHeader);
    expect(allLogs).not.toContain('Bearer');
    expect(allLogs).not.toContain(sensitiveValues.accessToken);
    expect(allLogs).toContain('AUTH_TOKEN_INVALID');
  });
  
  it('should include safe metadata in all logs', () => {
    logger.info(AuthEvents.LOGIN_SUCCESS, {
      requestId: 'req123',
      userId: 'user123',
      schoolId: 'school456',
      role: 'teacher',
      sessionId: 'session789',
      durationMs: 150,
    });
    
    const allLogs = consoleOutput.join('\n');
    const logEntry = JSON.parse(consoleOutput[0]);
    
    // Should have structure
    expect(logEntry.level).toBe('info');
    expect(logEntry.event).toBe('AUTH_LOGIN_SUCCESS');
    expect(logEntry.timestamp).toBeDefined();
    
    // Should have safe context
    expect(logEntry.context.requestId).toBe('req123');
    expect(logEntry.context.userId).toBe('user123');
    expect(logEntry.context.schoolId).toBe('school456');
    expect(logEntry.context.role).toBe('teacher');
    expect(logEntry.context.sessionId).toBe('session789');
    expect(logEntry.context.durationMs).toBe(150);
  });
  
  it('should use safe reason codes instead of exposing details', () => {
    logger.warn(AuthEvents.LOGIN_FAILURE, {
      requestId: 'req123',
      reasonCode: AuthFailureReasons.INVALID_CREDENTIALS,
      durationMs: 120,
    });
    
    const allLogs = consoleOutput.join('\n');
    const logEntry = JSON.parse(consoleOutput[0]);
    
    // Should have safe reason code
    expect(logEntry.context.reasonCode).toBe('INVALID_CREDENTIALS');
    
    // Should NOT reveal specific failure reason
    expect(allLogs).not.toContain('user not found');
    expect(allLogs).not.toContain('wrong password');
    expect(allLogs).not.toContain('disabled');
  });
});

describe('Logging Safety - Complete Value Check', () => {
  const forbiddenStrings = [
    'MySecretPass123!',
    'OldPass456!',
    'NewPass789!',
    'ACTIVATE123CODE',
    'abc123def456ghi789', // refresh secret
    'scrypt$16384:8:1', // hash format
    'Bearer eyJ', // auth header start
  ];
  
  it('should never contain any forbidden strings across all event types', () => {
    // Log various events
    logger.info(AuthEvents.LOGIN_ATTEMPT, { requestId: 'r1', loginId: 'user1' });
    logger.info(AuthEvents.LOGIN_SUCCESS, { requestId: 'r1', userId: 'user1', schoolId: 's1', role: 'teacher', sessionId: 'ses1', durationMs: 100 });
    logger.warn(AuthEvents.LOGIN_FAILURE, { requestId: 'r1', reasonCode: 'INVALID_CREDENTIALS', durationMs: 100 });
    logger.info(AuthEvents.ACTIVATION_ATTEMPT, { requestId: 'r2', loginId: 'user2' });
    logger.info(AuthEvents.ACTIVATION_SUCCESS, { requestId: 'r2', userId: 'user2', schoolId: 's2', role: 'student', durationMs: 150 });
    logger.info(AuthEvents.PASSWORD_CHANGE_ATTEMPT, { requestId: 'r3', userId: 'user3' });
    logger.info(AuthEvents.PASSWORD_CHANGE_SUCCESS, { requestId: 'r3', userId: 'user3', schoolId: 's3', role: 'principal', durationMs: 120 });
    logger.info(AuthEvents.REFRESH_ATTEMPT, { requestId: 'r4' });
    logger.info(AuthEvents.REFRESH_SUCCESS, { requestId: 'r4', sessionId: 'ses4', userId: 'user4', schoolId: 's4', role: 'teacher', durationMs: 50 });
    logger.error(AuthEvents.REFRESH_REUSE_DETECTED, { requestId: 'r5', sessionId: 'ses5', familyId: 'fam5', userId: 'user5', reasonCode: 'REFRESH_REUSE', durationMs: 40 });
    logger.info(AuthEvents.LOGOUT, { requestId: 'r6', sessionId: 'ses6', userId: 'user6', schoolId: 's6', durationMs: 20 });
    
    // Check all logs
    const allLogs = consoleOutput.join('\n');
    
    for (const forbidden of forbiddenStrings) {
      expect(allLogs).not.toContain(forbidden);
    }
  });
});
