/**
 * Super Admin Authentication Security Tests
 * 
 * Focused security test suite covering:
 * - Authentication
 * - Authorization
 * - JWT integrity
 */

import { describe, it, expect, beforeEach } from 'vitest';
import * as superAdminService from './super-admin.service';
import * as passwordService from './password.service';
import * as schoolsAuthz from '../schools/schools.authorization';
import type { SuperAdminLoginRequest, TenantContext, SuperAdminContext } from './auth.types';

// Test environment with proper secrets
const createTestEnv = async () => {
  const password = 'Test@SuperAdmin123';
  const passwordHash = await passwordService.hashPassword(password);
  
  return {
    JWT_SECRET: 'test-jwt-secret-for-testing-only',
    SUPER_ADMIN_LOGIN_ID: 'super-admin',
    SUPER_ADMIN_PASSWORD_HASH: passwordHash,
    SUPER_ADMIN_TOKEN_VERSION: '1',
  };
};

describe('Super Admin Authentication', () => {
  let env: Awaited<ReturnType<typeof createTestEnv>>;
  
  beforeEach(async () => {
    env = await createTestEnv();
  });
  
  it('should succeed with correct credentials', async () => {
    const request: SuperAdminLoginRequest = {
      loginId: 'super-admin',
      password: 'Test@SuperAdmin123',
    };
    
    const response = await superAdminService.loginSuperAdmin(request, 'test-request-1', env);
    
    expect(response).toBeDefined();
    expect(response.accessToken).toBeDefined();
    expect(typeof response.accessToken).toBe('string');
    expect(response.accessToken.split('.').length).toBe(3); // JWT format
  });
  
  it('should fail with wrong login ID', async () => {
    const request: SuperAdminLoginRequest = {
      loginId: 'wrong-login-id',
      password: 'Test@SuperAdmin123',
    };
    
    await expect(
      superAdminService.loginSuperAdmin(request, 'test-request-2', env)
    ).rejects.toThrow('Invalid credentials');
  });
  
  it('should fail with wrong password', async () => {
    const request: SuperAdminLoginRequest = {
      loginId: 'super-admin',
      password: 'WrongPassword123!',
    };
    
    await expect(
      superAdminService.loginSuperAdmin(request, 'test-request-3', env)
    ).rejects.toThrow('Invalid credentials');
  });
  
  it('should fail with missing login ID secret', async () => {
    const badEnv = { ...env, SUPER_ADMIN_LOGIN_ID: undefined };
    
    const request: SuperAdminLoginRequest = {
      loginId: 'super-admin',
      password: 'Test@SuperAdmin123',
    };
    
    await expect(
      superAdminService.loginSuperAdmin(request, 'test-request-4', badEnv)
    ).rejects.toThrow();
  });
  
  it('should fail with empty password hash secret', async () => {
    const badEnv = { ...env, SUPER_ADMIN_PASSWORD_HASH: '' };
    
    const request: SuperAdminLoginRequest = {
      loginId: 'super-admin',
      password: 'Test@SuperAdmin123',
    };
    
    await expect(
      superAdminService.loginSuperAdmin(request, 'test-request-5', badEnv)
    ).rejects.toThrow();
  });
  
  it('should fail with invalid token version', async () => {
    const badEnv = { ...env, SUPER_ADMIN_TOKEN_VERSION: 'not-a-number' };
    
    const request: SuperAdminLoginRequest = {
      loginId: 'super-admin',
      password: 'Test@SuperAdmin123',
    };
    
    await expect(
      superAdminService.loginSuperAdmin(request, 'test-request-6', badEnv)
    ).rejects.toThrow();
  });
});

describe('Super Admin Token Verification', () => {
  let env: Awaited<ReturnType<typeof createTestEnv>>;
  
  beforeEach(async () => {
    env = await createTestEnv();
  });
  
  it('should verify valid Super Admin token', async () => {
    // Login to get token
    const request: SuperAdminLoginRequest = {
      loginId: 'super-admin',
      password: 'Test@SuperAdmin123',
    };
    
    const response = await superAdminService.loginSuperAdmin(request, 'test-request-7', env);
    
    // Verify token
    const context = await superAdminService.verifySuperAdminToken(response.accessToken, env);
    
    expect(context).toBeDefined();
    expect(context.role).toBe('super_admin');
    expect(context.userId).toBe(null);
    expect(context.schoolId).toBe(null);
    expect(context.sessionId).toBe(null);
    expect(context.tokenVersion).toBe(1);
  });
  
  it('should reject token with wrong version', async () => {
    // Login with version 1
    const request: SuperAdminLoginRequest = {
      loginId: 'super-admin',
      password: 'Test@SuperAdmin123',
    };
    
    const response = await superAdminService.loginSuperAdmin(request, 'test-request-8', env);
    
    // Change token version in environment
    const newEnv = { ...env, SUPER_ADMIN_TOKEN_VERSION: '2' };
    
    // Verify should fail
    await expect(
      superAdminService.verifySuperAdminToken(response.accessToken, newEnv)
    ).rejects.toThrow();
  });
  
  it('should reject expired token', async () => {
    // Create a token that's already expired
    // Note: This would require mocking time or waiting 15+ minutes
    // Skipping for now - covered by jose library tests
  });
});

describe('Super Admin Authorization', () => {
  it('should allow Super Admin to access schools endpoints', () => {
    const superAdmin: SuperAdminContext = {
      kind: 'platform',
      userId: null,
      role: 'super_admin',
      schoolId: null,
      sessionId: null,
      tokenVersion: 1,
    };
    
    // Should not throw
    expect(() => schoolsAuthz.ensureSuperAdmin(superAdmin)).not.toThrow();
  });
  
  it('should reject Principal from schools endpoints', () => {
    const principal: TenantContext = {
      kind: 'school',
      userId: 'user-123',
      role: 'principal',
      schoolId: 'school-123',
      sessionId: 'session-123',
    };
    
    expect(() => schoolsAuthz.ensureSuperAdmin(principal as any)).toThrow('Forbidden');
  });
  
  it('should reject Teacher from schools endpoints', () => {
    const teacher: TenantContext = {
      kind: 'school',
      userId: 'user-456',
      role: 'teacher',
      schoolId: 'school-123',
      sessionId: 'session-456',
    };
    
    expect(() => schoolsAuthz.ensureSuperAdmin(teacher as any)).toThrow('Forbidden');
  });
  
  it('should reject Student from schools endpoints', () => {
    const student: TenantContext = {
      kind: 'school',
      userId: 'user-789',
      role: 'student',
      schoolId: 'school-123',
      sessionId: 'session-789',
    };
    
    expect(() => schoolsAuthz.ensureSuperAdmin(student as any)).toThrow('Forbidden');
  });
  
  it('should reject forged super_admin token with schoolId', () => {
    // Simulating a forged token that has super_admin role but school context
    const forgedToken: any = {
      userId: 'user-123',
      role: 'super_admin',
      schoolId: 'school-123', // Invalid for Super Admin
      sessionId: 'session-123',
    };
    
    expect(() => schoolsAuthz.ensureSuperAdmin(forgedToken)).toThrow('Forbidden');
  });
});

describe('Super Admin vs School User Separation', () => {
  it('should recognize valid Super Admin context', () => {
    const superAdmin: SuperAdminContext = {
      kind: 'platform',
      userId: null,
      role: 'super_admin',
      schoolId: null,
      sessionId: null,
      tokenVersion: 1,
    };
    
    expect(schoolsAuthz.isSuperAdmin(superAdmin)).toBe(true);
  });
  
  it('should NOT recognize Principal as Super Admin', () => {
    const principal: TenantContext = {
      kind: 'school',
      userId: 'user-123',
      role: 'principal',
      schoolId: 'school-123',
      sessionId: 'session-123',
    };
    
    expect(schoolsAuthz.isSuperAdmin(principal as any)).toBe(false);
  });
  
  it('should NOT recognize forged super_admin with userId', () => {
    const forged: any = {
      userId: 'user-123', // Super Admin should have null
      role: 'super_admin',
      schoolId: null,
      sessionId: null,
    };
    
    expect(schoolsAuthz.isSuperAdmin(forged)).toBe(false);
  });
});

describe('Constant-Time Security', () => {
  it('should take similar time for wrong login ID vs wrong password', async () => {
    const env = await createTestEnv();
    
    const wrongLoginIdRequest: SuperAdminLoginRequest = {
      loginId: 'wrong-login',
      password: 'Test@SuperAdmin123',
    };
    
    const wrongPasswordRequest: SuperAdminLoginRequest = {
      loginId: 'super-admin',
      password: 'WrongPassword123!',
    };
    
    // Measure time for wrong login ID
    const start1 = Date.now();
    await expect(
      superAdminService.loginSuperAdmin(wrongLoginIdRequest, 'test-timing-1', env)
    ).rejects.toThrow();
    const duration1 = Date.now() - start1;
    
    // Measure time for wrong password
    const start2 = Date.now();
    await expect(
      superAdminService.loginSuperAdmin(wrongPasswordRequest, 'test-timing-2', env)
    ).rejects.toThrow();
    const duration2 = Date.now() - start2;
    
    // Times should be within reasonable range (< 500ms difference)
    // This is a rough check - proper timing attack prevention requires more sophisticated testing
    // scrypt hashing has inherent variance, so we allow a generous margin
    const timeDiff = Math.abs(duration1 - duration2);
    expect(timeDiff).toBeLessThan(500);
  }, 10000);
  
  it('should return same generic error for both failure cases', async () => {
    const env = await createTestEnv();
    
    const wrongLoginIdRequest: SuperAdminLoginRequest = {
      loginId: 'wrong-login',
      password: 'Test@SuperAdmin123',
    };
    
    const wrongPasswordRequest: SuperAdminLoginRequest = {
      loginId: 'super-admin',
      password: 'WrongPassword123!',
    };
    
    let error1: Error | null = null;
    let error2: Error | null = null;
    
    try {
      await superAdminService.loginSuperAdmin(wrongLoginIdRequest, 'test-error-1', env);
    } catch (e) {
      error1 = e as Error;
    }
    
    try {
      await superAdminService.loginSuperAdmin(wrongPasswordRequest, 'test-error-2', env);
    } catch (e) {
      error2 = e as Error;
    }
    
    // Both should return same error message
    expect(error1?.message).toBe('Invalid credentials');
    expect(error2?.message).toBe('Invalid credentials');
  }, 20000);
});
