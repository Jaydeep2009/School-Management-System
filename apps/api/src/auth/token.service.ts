/**
 * JWT token service
 * 
 * Uses jose library for Worker-compatible JWT operations
 * SECURITY: Never log raw tokens
 */

import { SignJWT, jwtVerify } from 'jose';
import type { AccessTokenPayload, UserRole } from './auth.types';

/**
 * Token configuration
 */
const ACCESS_TOKEN_EXPIRY = '15m'; // 15 minutes
const REFRESH_TOKEN_EXPIRY_DAYS = 30; // 30 days

/**
 * JWT signing algorithm
 */
const ALGORITHM = 'HS256';

/**
 * Get JWT secret from environment
 */
function getJwtSecret(env: { JWT_SECRET?: string }): Uint8Array {
  const secret = env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET not configured');
  }
  
  // Convert secret to Uint8Array
  return new TextEncoder().encode(secret);
}

/**
 * Generate access token
 */
export async function generateAccessToken(
  payload: {
    userId: string;
    role: UserRole;
    schoolId: string;
    sessionId: string;
  },
  env: { JWT_SECRET?: string }
): Promise<string> {
  const secret = getJwtSecret(env);
  
  const jwt = await new SignJWT({
    sub: payload.userId,
    role: payload.role,
    schoolId: payload.schoolId,
    sessionId: payload.sessionId,
  })
    .setProtectedHeader({ alg: ALGORITHM })
    .setIssuedAt()
    .setExpirationTime(ACCESS_TOKEN_EXPIRY)
    .sign(secret);
  
  return jwt;
}

/**
 * Verify and decode access token
 */
export async function verifyAccessToken(
  token: string,
  env: { JWT_SECRET?: string }
): Promise<AccessTokenPayload> {
  const secret = getJwtSecret(env);
  
  try {
    const { payload } = await jwtVerify(token, secret, {
      algorithms: [ALGORITHM],
    });
    
    // Validate required claims
    if (!payload.sub || typeof payload.sub !== 'string') {
      throw new Error('Invalid token: missing sub');
    }
    
    if (!payload.role || typeof payload.role !== 'string') {
      throw new Error('Invalid token: missing role');
    }
    
    if (!payload.schoolId || typeof payload.schoolId !== 'string') {
      throw new Error('Invalid token: missing schoolId');
    }
    
    if (!payload.sessionId || typeof payload.sessionId !== 'string') {
      throw new Error('Invalid token: missing sessionId');
    }
    
    if (!payload.iat || typeof payload.iat !== 'number') {
      throw new Error('Invalid token: missing iat');
    }
    
    if (!payload.exp || typeof payload.exp !== 'number') {
      throw new Error('Invalid token: missing exp');
    }
    
    // Validate role
    const validRoles: UserRole[] = ['principal', 'teacher', 'student'];
    if (!validRoles.includes(payload.role as UserRole)) {
      throw new Error('Invalid token: invalid role');
    }
    
    return {
      sub: payload.sub,
      role: payload.role as UserRole,
      schoolId: payload.schoolId,
      sessionId: payload.sessionId,
      iat: payload.iat,
      exp: payload.exp,
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
 * Calculate refresh token expiry timestamp
 */
export function getRefreshTokenExpiry(): string {
  const now = new Date();
  now.setDate(now.getDate() + REFRESH_TOKEN_EXPIRY_DAYS);
  return now.toISOString();
}

/**
 * Check if a timestamp is expired
 */
export function isExpired(expiresAt: string): boolean {
  return new Date(expiresAt) <= new Date();
}

/**
 * Format refresh token: <sessionId>.<secret>
 */
export function formatRefreshToken(sessionId: string, secret: string): string {
  return `${sessionId}.${secret}`;
}

/**
 * Parse refresh token: <sessionId>.<secret>
 */
export function parseRefreshToken(refreshToken: string): { sessionId: string; secret: string } | null {
  const parts = refreshToken.split('.');
  if (parts.length !== 2) {
    return null;
  }
  
  const [sessionId, secret] = parts;
  
  if (!sessionId || !secret) {
    return null;
  }
  
  return { sessionId, secret };
}
