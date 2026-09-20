/**
 * Authentication middleware
 * 
 * Extracts and validates JWT access tokens, creates TenantContext
 * SECURITY: Never trust client-provided schoolId, role, or userId
 */

import { Context, Next } from 'hono';
import type { TenantContext } from './auth.types';
import * as tokenService from './token.service';
import * as authRepo from './auth.repository';
import { logger, AuthEvents, AuthFailureReasons } from '../lib/logging/logger';
import { getRequestId } from '../lib/logging/request-id';

/**
 * Environment with JWT secret
 */
interface AuthEnv {
  DB: D1Database;
  JWT_SECRET: string;
  BUCKET: R2Bucket;
}

/**
 * Hono context with authenticated user
 */
export interface AuthContext {
  Bindings: AuthEnv;
  Variables: {
    tenant: TenantContext;
    requestId: string;
  };
}

/**
 * Extract Bearer token from Authorization header
 */
function extractBearerToken(authHeader: string | undefined): string | null {
  if (!authHeader) {
    return null;
  }
  
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return null;
  }
  
  return parts[1];
}

/**
 * Authentication middleware
 * Requires valid JWT access token in Authorization header
 */
export async function requireAuth(
  c: Context<AuthContext>,
  next: Next
): Promise<Response | void> {
  const requestId = getRequestId(c.req.raw);
  c.set('requestId', requestId);
  
  try {
    // Extract token
    const authHeader = c.req.header('Authorization');
    const token = extractBearerToken(authHeader);
    
    if (!token) {
      logger.warn(AuthEvents.TOKEN_INVALID, {
        requestId,
        reasonCode: AuthFailureReasons.TOKEN_INVALID,
      });
      return c.json({ error: 'Unauthorized' }, 401);
    }
    
    // Verify token
    let payload;
    try {
      payload = await tokenService.verifyAccessToken(token, c.env);
    } catch (error) {
      const isExpired = error instanceof Error && error.message.includes('expired');
      
      logger.warn(isExpired ? AuthEvents.TOKEN_EXPIRED : AuthEvents.TOKEN_INVALID, {
        requestId,
        reasonCode: isExpired ? AuthFailureReasons.TOKEN_EXPIRED : AuthFailureReasons.TOKEN_INVALID,
      });
      
      return c.json(
        { error: isExpired ? 'Token expired' : 'Unauthorized' },
        401
      );
    }
    
    // Verify user still exists and is active
    const user = await authRepo.findUserById(c.env.DB, payload.sub);
    
    if (!user || user.status !== 'active') {
      logger.warn(AuthEvents.ACCOUNT_DISABLED, {
        requestId,
        userId: payload.sub,
        reasonCode: AuthFailureReasons.ACCOUNT_DISABLED,
      });
      return c.json({ error: 'Unauthorized' }, 401);
    }
    
    // Verify session still valid
    const session = await authRepo.findSessionById(c.env.DB, payload.sessionId);
    
    if (!session || session.revoked_at !== null) {
      logger.warn(AuthEvents.ACCESS_DENIED, {
        requestId,
        userId: user.id,
        sessionId: payload.sessionId,
        reasonCode: AuthFailureReasons.SESSION_REVOKED,
      });
      return c.json({ error: 'Session revoked' }, 401);
    }
    
    // Check session expiry
    if (tokenService.isExpired(session.expires_at)) {
      logger.warn(AuthEvents.ACCESS_DENIED, {
        requestId,
        userId: user.id,
        sessionId: payload.sessionId,
        reasonCode: AuthFailureReasons.SESSION_EXPIRED,
      });
      return c.json({ error: 'Session expired' }, 401);
    }
    
    // Create TenantContext from server-derived data
    // NEVER trust these values from the client
    const tenant: TenantContext = {
      userId: user.id,
      role: user.role,
      schoolId: user.school_id,
      sessionId: payload.sessionId,
    };
    
    c.set('tenant', tenant);
    
    await next();
  } catch (error) {
    logger.error(AuthEvents.ACCESS_DENIED, {
      requestId,
      reasonCode: 'INTERNAL_ERROR',
    }, 'Authentication middleware error', error);
    
    return c.json({ error: 'Internal server error' }, 500);
  }
}

/**
 * Optional authentication middleware
 * Attaches tenant context if token is present and valid, but doesn't require it
 */
export async function optionalAuth(
  c: Context<AuthContext>,
  next: Next
): Promise<void> {
  const requestId = getRequestId(c.req.raw);
  c.set('requestId', requestId);
  
  try {
    const authHeader = c.req.header('Authorization');
    const token = extractBearerToken(authHeader);
    
    if (token) {
      try {
        const payload = await tokenService.verifyAccessToken(token, c.env);
        const user = await authRepo.findUserById(c.env.DB, payload.sub);
        
        if (user && user.status === 'active') {
          const session = await authRepo.findSessionById(c.env.DB, payload.sessionId);
          
          if (session && session.revoked_at === null && !tokenService.isExpired(session.expires_at)) {
            const tenant: TenantContext = {
              userId: user.id,
              role: user.role,
              schoolId: user.school_id,
              sessionId: payload.sessionId,
            };
            
            c.set('tenant', tenant);
          }
        }
      } catch {
        // Silently ignore invalid tokens for optional auth
      }
    }
    
    await next();
  } catch (error) {
    // Continue without authentication on error
    await next();
  }
}

/**
 * Get tenant context from request
 * Throws if not authenticated
 */
export function getTenant(c: Context<AuthContext>): TenantContext {
  const tenant = c.get('tenant');
  if (!tenant) {
    throw new Error('Not authenticated');
  }
  return tenant;
}

/**
 * Get request ID from context
 */
export function getRequestIdFromContext(c: Context<AuthContext>): string {
  return c.get('requestId') || getRequestId(c.req.raw);
}
