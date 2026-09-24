/**
 * Super Admin Authentication Service
 * 
 * Platform-level authentication for Super Admin
 * SECURITY: Never log passwords, tokens, or credentials
 */

import type {
  SuperAdminLoginRequest,
  SuperAdminLoginResponse,
  SuperAdminContext,
} from './auth.types';
import * as passwordService from './password.service';
import { logger, AuthEvents, AuthFailureReasons } from '../lib/logging/logger';
import { SignJWT } from 'jose';

/**
 * Environment with Super Admin secrets
 */
interface SuperAdminEnv {
  JWT_SECRET: string;
  SUPER_ADMIN_LOGIN_ID?: string;
  SUPER_ADMIN_PASSWORD_HASH?: string;
  SUPER_ADMIN_TOKEN_VERSION?: string;
}

/**
 * Fixed Super Admin subject identifier
 * Cannot collide with real user IDs
 */
const SUPER_ADMIN_SUBJECT = 'super-admin';

/**
 * Access token expiry for Super Admin (15 minutes)
 */
const SUPER_ADMIN_TOKEN_EXPIRY = '15m';

/**
 * Dummy hash for constant-time comparison when login ID doesn't match
 * This prevents timing attacks that could reveal whether the login ID exists
 */
const DUMMY_HASH = 'scrypt$16384:8:1$dHVtbXktc2FsdC1mb3ItdGltaW5n$ZHVtbXktaGFzaC1mb3ItdGltaW5nLXNhZmV0eQ';

/**
 * Super Admin login
 * 
 * SECURITY:
 * - Constant-time credential verification
 * - Generic error messages (never reveal which credential failed)
 * - Fails closed if secrets are missing/malformed
 * - No session/refresh token (access token only)
 */
export async function loginSuperAdmin(
  request: SuperAdminLoginRequest,
  requestId: string,
  env: SuperAdminEnv
): Promise<SuperAdminLoginResponse> {
  const startTime = Date.now();
  
  logger.info(AuthEvents.LOGIN_ATTEMPT, {
    requestId,
    loginId: request.loginId,
    role: 'super_admin',
  });
  
  try {
    // Validate environment configuration
    const configuredLoginId = env.SUPER_ADMIN_LOGIN_ID?.trim();
    const configuredPasswordHash = env.SUPER_ADMIN_PASSWORD_HASH?.trim();
    const configuredTokenVersion = env.SUPER_ADMIN_TOKEN_VERSION?.trim();
    
    // Fail closed if configuration is missing or empty
    if (!configuredLoginId || !configuredPasswordHash || !configuredTokenVersion) {
      logger.error('SUPER_ADMIN_AUTH_MISCONFIGURED', {
        requestId,
        hasLoginId: !!configuredLoginId,
        hasPasswordHash: !!configuredPasswordHash,
        hasTokenVersion: !!configuredTokenVersion,
      }, 'Super Admin authentication misconfigured');
      
      // Generic failure - don't reveal configuration issue
      throw new Error('Authentication failed');
    }
    
    // Parse token version
    const tokenVersion = parseInt(configuredTokenVersion, 10);
    if (isNaN(tokenVersion) || tokenVersion < 0) {
      logger.error('SUPER_ADMIN_TOKEN_VERSION_INVALID', {
        requestId,
      }, 'Super Admin token version invalid');
      
      throw new Error('Authentication failed');
    }
    
    // Normalize login ID
    const loginId = request.loginId.trim();
    
    // Check if login ID matches (constant-time string comparison)
    const loginIdMatches = timingSafeStringEqual(loginId, configuredLoginId);
    
    // Always perform password verification for timing-safety
    // If login ID doesn't match, verify against dummy hash
    const hashToVerify = loginIdMatches ? configuredPasswordHash : DUMMY_HASH;
    const passwordValid = await passwordService.verifyPassword(
      request.password,
      hashToVerify
    );
    
    // Only succeed if both login ID and password are correct
    const authSuccess = loginIdMatches && passwordValid;
    
    if (!authSuccess) {
      logger.warn(AuthEvents.LOGIN_FAILURE, {
        requestId,
        role: 'super_admin',
        reasonCode: AuthFailureReasons.INVALID_CREDENTIALS,
        durationMs: Date.now() - startTime,
      });
      
      // Generic error - don't reveal which credential was wrong
      throw new Error('Invalid credentials');
    }
    
    // Generate Super Admin access token
    const accessToken = await generateSuperAdminToken(tokenVersion, env);
    
    // Create audit log for successful Super Admin login
    // Note: This happens in-memory only (no DB write for Super Admin)
    logger.info(AuthEvents.LOGIN_SUCCESS, {
      requestId,
      userId: SUPER_ADMIN_SUBJECT,
      role: 'super_admin',
      durationMs: Date.now() - startTime,
    });
    
    return {
      accessToken,
    };
  } catch (error) {
    // Error already logged in specific failure cases
    // Re-throw with generic message
    if (error instanceof Error && error.message === 'Invalid credentials') {
      throw error;
    }
    throw new Error('Authentication failed');
  }
}

/**
 * Generate Super Admin JWT access token
 */
async function generateSuperAdminToken(
  tokenVersion: number,
  env: { JWT_SECRET: string }
): Promise<string> {
  const secret = new TextEncoder().encode(env.JWT_SECRET);
  
  const jwt = await new SignJWT({
    sub: SUPER_ADMIN_SUBJECT,
    role: 'super_admin',
    tokenVersion,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(SUPER_ADMIN_TOKEN_EXPIRY)
    .sign(secret);
  
  return jwt;
}

/**
 * Verify Super Admin JWT token
 * Returns SuperAdminContext if valid, throws if invalid
 */
export async function verifySuperAdminToken(
  token: string,
  env: SuperAdminEnv
): Promise<SuperAdminContext> {
  const { jwtVerify } = await import('jose');
  const secret = new TextEncoder().encode(env.JWT_SECRET);
  
  try {
    const { payload } = await jwtVerify(token, secret, {
      algorithms: ['HS256'],
    });
    
    // Validate Super Admin token structure
    if (payload.sub !== SUPER_ADMIN_SUBJECT) {
      throw new Error('Invalid Super Admin token: wrong subject');
    }
    
    if (payload.role !== 'super_admin') {
      throw new Error('Invalid Super Admin token: wrong role');
    }
    
    if (typeof payload.tokenVersion !== 'number') {
      throw new Error('Invalid Super Admin token: missing tokenVersion');
    }
    
    // Validate token version against current configuration
    // For simple password auth (when SUPER_ADMIN_PASSWORD is set),
    // token version check is optional
    const configuredVersion = env.SUPER_ADMIN_TOKEN_VERSION?.trim();
    if (configuredVersion) {
      // Token version check enabled
      const currentVersion = parseInt(configuredVersion, 10);
      if (isNaN(currentVersion)) {
        throw new Error('Super Admin token version invalid');
      }
      
      if (payload.tokenVersion !== currentVersion) {
        throw new Error('Super Admin token version mismatch');
      }
    }
    // If no version configured, skip version check (simple auth mode)
    
    // Return Super Admin context
    return {
      kind: 'platform',
      userId: null,
      role: 'super_admin',
      schoolId: null,
      sessionId: null,
      tokenVersion: payload.tokenVersion,
    };
  } catch (error) {
    // Don't expose internal error details
    if (error instanceof Error && error.message.includes('expired')) {
      throw new Error('Token expired');
    }
    throw new Error('Invalid token');
  }
}

/**
 * Timing-safe string comparison
 * Prevents timing attacks to discover valid login IDs
 */
function timingSafeStringEqual(a: string, b: string): boolean {
  // Convert strings to buffers
  const bufA = new TextEncoder().encode(a);
  const bufB = new TextEncoder().encode(b);
  
  // If lengths differ, still compare to prevent timing leak
  // Compare up to the longer length
  const maxLen = Math.max(bufA.length, bufB.length);
  let result = bufA.length === bufB.length ? 0 : 1;
  
  for (let i = 0; i < maxLen; i++) {
    const byteA = i < bufA.length ? bufA[i] : 0;
    const byteB = i < bufB.length ? bufB[i] : 0;
    result |= byteA ^ byteB;
  }
  
  return result === 0;
}
