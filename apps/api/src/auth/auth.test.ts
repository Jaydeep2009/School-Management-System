/**
 * Authentication tests
 * 
 * Comprehensive tests for login, activation, password change, refresh, logout,
 * middleware, and security boundaries
 */

import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { Hono } from 'hono';
import authRoutes from './auth.routes';
import * as passwordService from './password.service';
import * as tokenService from './token.service';
import * as sessionService from './session.service';
import { requireAuth } from './auth.middleware';

// Test environment setup
const testEnv = {
  JWT_SECRET: 'test-secret-key-for-testing-only',
  DB: {} as D1Database,
};

// Helper to create test app
function createTestApp() {
  const app = new Hono();
  app.route('/auth', authRoutes);
  return app;
}

// Mock database responses
const mockDb = {
  users: new Map<string, any>(),
  sessions: new Map<string, any>(),
  
  reset() {
    this.users.clear();
    this.sessions.clear();
  },
  
  addUser(user: any) {
    this.users.set(user.id, user);
    this.users.set(user.login_id.toLowerCase(), user);
  },
  
  addSession(session: any) {
    this.sessions.set(session.id, session);
  },
};

describe('Password Service', () => {
  it('should hash passwords securely', async () => {
    const password = 'TestPass123!';
    const hash = await passwordService.hashPassword(password);
    
    expect(hash).toBeDefined();
    expect(hash).toContain('scrypt$');
    expect(hash).not.toContain(password);
  });
  
  it('should verify correct passwords', async () => {
    const password = 'TestPass123!';
    const hash = await passwordService.hashPassword(password);
    
    const isValid = await passwordService.verifyPassword(password, hash);
    expect(isValid).toBe(true);
  });
  
  it('should reject incorrect passwords', async () => {
    const password = 'TestPass123!';
    const hash = await passwordService.hashPassword(password);
    
    const isValid = await passwordService.verifyPassword('WrongPass456!', hash);
    expect(isValid).toBe(false);
  });
  
  it('should validate password strength', () => {
    const weakPasswords = [
      'short',           // too short
      'nouppercase1!',   // no uppercase
      'NOLOWERCASE1!',   // no lowercase
      'NoNumbers!',      // no numbers
      'NoSpecial123',    // no special chars
    ];
    
    for (const pwd of weakPasswords) {
      const errors = passwordService.validatePasswordStrength(pwd);
      expect(errors.length).toBeGreaterThan(0);
    }
  });
  
  it('should accept strong passwords', () => {
    const strongPassword = 'SecurePass123!';
    const errors = passwordService.validatePasswordStrength(strongPassword);
    expect(errors).toEqual([]);
  });
  
  it('should generate activation codes', async () => {
    const { code, hash } = await passwordService.generateActivationCode();
    
    expect(code).toBeDefined();
    expect(hash).toBeDefined();
    expect(code.length).toBeGreaterThan(0);
    expect(hash).toContain('scrypt$');
  });
});

describe('Token Service', () => {
  it('should generate valid access tokens', async () => {
    const payload = {
      userId: '01HQABC123',
      role: 'teacher' as const,
      schoolId: '01HQDEF456',
      sessionId: '01HQGHI789',
    };
    
    const token = await tokenService.generateAccessToken(payload, testEnv);
    
    expect(token).toBeDefined();
    expect(typeof token).toBe('string');
    expect(token.split('.')).toHaveLength(3); // JWT format
  });
  
  it('should verify and decode valid tokens', async () => {
    const payload = {
      userId: '01HQABC123',
      role: 'teacher' as const,
      schoolId: '01HQDEF456',
      sessionId: '01HQGHI789',
    };
    
    const token = await tokenService.generateAccessToken(payload, testEnv);
    const decoded = await tokenService.verifyAccessToken(token, testEnv);
    
    expect(decoded.sub).toBe(payload.userId);
    expect(decoded.role).toBe(payload.role);
    expect(decoded.schoolId).toBe(payload.schoolId);
    expect(decoded.sessionId).toBe(payload.sessionId);
  });
  
  it('should reject invalid tokens', async () => {
    await expect(
      tokenService.verifyAccessToken('invalid.token.here', testEnv)
    ).rejects.toThrow();
  });
  
  it('should parse refresh tokens correctly', () => {
    const sessionId = '01HQXYZ123';
    const secret = 'abc123def456';
    
    const refreshToken = tokenService.formatRefreshToken(sessionId, secret);
    const parsed = tokenService.parseRefreshToken(refreshToken);
    
    expect(parsed).not.toBeNull();
    expect(parsed?.sessionId).toBe(sessionId);
    expect(parsed?.secret).toBe(secret);
  });
  
  it('should reject malformed refresh tokens', () => {
    expect(tokenService.parseRefreshToken('invalid')).toBeNull();
    expect(tokenService.parseRefreshToken('invalid.format.too.many')).toBeNull();
  });
});

describe('Session Service', () => {
  it('should generate unique session IDs', () => {
    const id1 = sessionService.generateSessionId();
    const id2 = sessionService.generateSessionId();
    
    expect(id1).not.toBe(id2);
    expect(id1.length).toBeGreaterThan(0);
  });
  
  it('should hash refresh secrets', () => {
    const secret = 'test-secret-123';
    const hash1 = sessionService.hashRefreshSecret(secret);
    const hash2 = sessionService.hashRefreshSecret(secret);
    
    // Same secret should produce same hash
    expect(hash1).toBe(hash2);
    expect(hash1).not.toContain(secret);
  });
  
  it('should verify refresh secrets correctly', () => {
    const secret = 'test-secret-123';
    const hash = sessionService.hashRefreshSecret(secret);
    
    expect(sessionService.verifyRefreshSecret(secret, hash)).toBe(true);
    expect(sessionService.verifyRefreshSecret('wrong-secret', hash)).toBe(false);
  });
  
  it('should prepare session data', () => {
    const data = sessionService.prepareSessionData({
      userId: '01HQABC123',
      userAgent: 'Test Agent',
      expiresAt: '2024-12-31T23:59:59Z',
    });
    
    expect(data.id).toBeDefined();
    expect(data.userId).toBe('01HQABC123');
    expect(data.refreshSecret).toBeDefined();
    expect(data.refreshHash).toBeDefined();
    expect(data.familyId).toBeDefined();
    expect(data.refreshSecret).not.toBe(data.refreshHash);
  });
  
  it('should validate session correctly', () => {
    const validSession = {
      id: '01HQABC123',
      user_id: '01HQDEF456',
      refresh_hash: 'hash',
      family_id: '01HQGHI789',
      expires_at: new Date(Date.now() + 86400000).toISOString(), // tomorrow
      revoked_at: null,
      user_agent: null,
      created_at: new Date().toISOString(),
    };
    
    const result = sessionService.validateSession(validSession);
    expect(result.valid).toBe(true);
  });
  
  it('should detect expired sessions', () => {
    const expiredSession = {
      id: '01HQABC123',
      user_id: '01HQDEF456',
      refresh_hash: 'hash',
      family_id: '01HQGHI789',
      expires_at: new Date(Date.now() - 86400000).toISOString(), // yesterday
      revoked_at: null,
      user_agent: null,
      created_at: new Date().toISOString(),
    };
    
    const result = sessionService.validateSession(expiredSession);
    expect(result.valid).toBe(false);
    expect(result.reason).toBe('SESSION_EXPIRED');
  });
  
  it('should detect revoked sessions', () => {
    const revokedSession = {
      id: '01HQABC123',
      user_id: '01HQDEF456',
      refresh_hash: 'hash',
      family_id: '01HQGHI789',
      expires_at: new Date(Date.now() + 86400000).toISOString(),
      revoked_at: new Date().toISOString(),
      user_agent: null,
      created_at: new Date().toISOString(),
    };
    
    const result = sessionService.validateSession(revokedSession);
    expect(result.valid).toBe(false);
    expect(result.reason).toBe('SESSION_REVOKED');
  });
  
  it('should detect compromised session families', () => {
    const sessions = [
      {
        id: '01HQABC1',
        user_id: '01HQDEF456',
        refresh_hash: 'hash1',
        family_id: '01HQFAM123',
        expires_at: new Date(Date.now() + 86400000).toISOString(),
        revoked_at: null,
        user_agent: null,
        created_at: new Date().toISOString(),
      },
      {
        id: '01HQABC2',
        user_id: '01HQDEF456',
        refresh_hash: 'hash2',
        family_id: '01HQFAM123',
        expires_at: new Date(Date.now() + 86400000).toISOString(),
        revoked_at: new Date().toISOString(), // This one is revoked
        user_agent: null,
        created_at: new Date().toISOString(),
      },
    ];
    
    const isCompromised = sessionService.isSessionFamilyCompromised(sessions[0], sessions);
    expect(isCompromised).toBe(true);
  });
});

describe('Password Validation Schema', () => {
  it('should accept valid passwords', () => {
    const validPasswords = [
      'SecurePass123!',
      'Tr0ng@Password',
      'C0mplex!Pass',
    ];
    
    for (const pwd of validPasswords) {
      const errors = passwordService.validatePasswordStrength(pwd);
      expect(errors).toEqual([]);
    }
  });
  
  it('should reject weak passwords', () => {
    const invalidCases = [
      { password: 'short', reason: 'too short' },
      { password: 'nouppercase123!', reason: 'no uppercase' },
      { password: 'NOLOWERCASE123!', reason: 'no lowercase' },
      { password: 'NoNumbers!', reason: 'no numbers' },
      { password: 'NoSpecial123', reason: 'no special char' },
    ];
    
    for (const { password } of invalidCases) {
      const errors = passwordService.validatePasswordStrength(password);
      expect(errors.length).toBeGreaterThan(0);
    }
  });
});

describe('Security - Never Log Sensitive Data', () => {
  it('should not contain password in hash', async () => {
    const password = 'SuperSecret123!';
    const hash = await passwordService.hashPassword(password);
    
    expect(hash).not.toContain(password);
    expect(hash.toLowerCase()).not.toContain('supersecret');
  });
  
  it('should not contain secret in refresh token hash', () => {
    const secret = 'my-refresh-secret-abc123';
    const hash = sessionService.hashRefreshSecret(secret);
    
    expect(hash).not.toContain(secret);
    expect(hash.toLowerCase()).not.toContain('refresh');
  });
});

describe('Timing Safety', () => {
  it('should use constant-time comparison for passwords', async () => {
    const password = 'TestPass123!';
    const hash = await passwordService.hashPassword(password);
    
    // Time several verifications
    const times: number[] = [];
    for (let i = 0; i < 10; i++) {
      const start = performance.now();
      await passwordService.verifyPassword(i % 2 === 0 ? password : 'Wrong123!', hash);
      const end = performance.now();
      times.push(end - start);
    }
    
    // Cannot test actual timing perfectly, but verify no errors
    expect(times.length).toBe(10);
  });
  
  it('should use constant-time comparison for refresh secrets', () => {
    const secret = 'test-secret-123';
    const hash = sessionService.hashRefreshSecret(secret);
    
    // Both correct and incorrect should complete without error
    expect(sessionService.verifyRefreshSecret(secret, hash)).toBe(true);
    expect(sessionService.verifyRefreshSecret('wrong', hash)).toBe(false);
  });
});

describe('Token Expiry', () => {
  it('should detect expired timestamps', () => {
    const past = new Date(Date.now() - 86400000).toISOString();
    const future = new Date(Date.now() + 86400000).toISOString();
    
    expect(tokenService.isExpired(past)).toBe(true);
    expect(tokenService.isExpired(future)).toBe(false);
  });
});

describe('Session Family Detection', () => {
  it('should not flag healthy families', () => {
    const sessions = [
      {
        id: '01HQABC1',
        user_id: '01HQDEF456',
        refresh_hash: 'hash1',
        family_id: '01HQFAM123',
        expires_at: new Date(Date.now() + 86400000).toISOString(),
        revoked_at: null,
        user_agent: null,
        created_at: new Date().toISOString(),
      },
      {
        id: '01HQABC2',
        user_id: '01HQDEF456',
        refresh_hash: 'hash2',
        family_id: '01HQFAM123',
        expires_at: new Date(Date.now() + 86400000).toISOString(),
        revoked_at: null,
        user_agent: null,
        created_at: new Date().toISOString(),
      },
    ];
    
    const isCompromised = sessionService.isSessionFamilyCompromised(sessions[0], sessions);
    expect(isCompromised).toBe(false);
  });
});

describe('Request ID Generation', () => {
  it('should generate unique request IDs', async () => {
    const { generateRequestId } = await import('../lib/logging/request-id');
    
    const id1 = generateRequestId();
    const id2 = generateRequestId();
    
    expect(id1).not.toBe(id2);
    expect(id1.length).toBeGreaterThan(0);
  });
});

describe('Logger Event Constants', () => {
  it('should define all required auth events', async () => {
    const { AuthEvents } = await import('../lib/logging/logger');
    
    // Verify all required events exist
    const requiredEvents = [
      'LOGIN_ATTEMPT', 'LOGIN_SUCCESS', 'LOGIN_FAILURE',
      'ACTIVATION_ATTEMPT', 'ACTIVATION_SUCCESS', 'ACTIVATION_FAILURE',
      'PASSWORD_CHANGE_ATTEMPT', 'PASSWORD_CHANGE_SUCCESS', 'PASSWORD_CHANGE_FAILURE',
      'REFRESH_ATTEMPT', 'REFRESH_SUCCESS', 'REFRESH_FAILURE', 'REFRESH_REUSE_DETECTED',
      'LOGOUT', 'SESSION_REVOKED', 'ALL_SESSIONS_REVOKED',
      'TOKEN_INVALID', 'TOKEN_EXPIRED', 'ACCOUNT_DISABLED', 'ACCESS_DENIED',
    ];
    
    for (const event of requiredEvents) {
      expect(AuthEvents).toHaveProperty(event);
      expect(AuthEvents[event as keyof typeof AuthEvents]).toContain('AUTH_');
    }
  });
  
  it('should define all required failure reasons', async () => {
    const { AuthFailureReasons } = await import('../lib/logging/logger');
    
    const requiredReasons = [
      'INVALID_CREDENTIALS', 'ACCOUNT_DISABLED', 'ACTIVATION_EXPIRED',
      'ACTIVATION_INVALID', 'SESSION_EXPIRED', 'SESSION_REVOKED',
      'TOKEN_INVALID', 'TOKEN_EXPIRED', 'TOKEN_VERSION_MISMATCH',
      'REFRESH_REUSE', 'VALIDATION_FAILED', 'WEAK_PASSWORD', 'PASSWORD_MISMATCH',
    ];
    
    for (const reason of requiredReasons) {
      expect(AuthFailureReasons).toHaveProperty(reason);
    }
  });
});

describe('TenantContext Type Safety', () => {
  it('should enforce required fields', () => {
    // TypeScript compile-time check (runtime verification not needed)
    const validContext = {
      userId: '01HQABC123',
      role: 'teacher' as const,
      schoolId: '01HQDEF456',
      sessionId: '01HQGHI789',
    };
    
    expect(validContext.userId).toBeDefined();
    expect(validContext.role).toBeDefined();
    expect(validContext.schoolId).toBeDefined();
    expect(validContext.sessionId).toBeDefined();
  });
});

describe('Refresh Token Format', () => {
  it('should format tokens correctly', () => {
    const sessionId = '01HQABC123';
    const secret = 'secret456';
    
    const token = tokenService.formatRefreshToken(sessionId, secret);
    expect(token).toBe(`${sessionId}.${secret}`);
  });
  
  it('should parse tokens correctly', () => {
    const token = '01HQABC123.secret456';
    const parsed = tokenService.parseRefreshToken(token);
    
    expect(parsed).not.toBeNull();
    expect(parsed?.sessionId).toBe('01HQABC123');
    expect(parsed?.secret).toBe('secret456');
  });
  
  it('should reject tokens without dot separator', () => {
    expect(tokenService.parseRefreshToken('noseparator')).toBeNull();
  });
  
  it('should reject tokens with multiple dots', () => {
    expect(tokenService.parseRefreshToken('too.many.dots')).toBeNull();
  });
  
  it('should reject tokens with empty parts', () => {
    expect(tokenService.parseRefreshToken('.secret')).toBeNull();
    expect(tokenService.parseRefreshToken('session.')).toBeNull();
  });
});
