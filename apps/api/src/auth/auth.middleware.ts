/**
 * Authentication middleware
 * 
 * Extracts and validates JWT access tokens, creates TenantContext or SuperAdminContext
 * SECURITY: Never trust client-provided schoolId, role, or userId
 */

import { Context, Next } from 'hono';
import type { TenantContext, SuperAdminContext, AuthenticatedContext } from './auth.types';
import * as tokenService from './token.service';
import * as superAdminService from './super-admin.service';
import * as authRepo from './auth.repository';
import { logger, AuthEvents, AuthFailureReasons } from '../lib/logging/logger';
import { getRequestId } from '../lib/logging/request-id';

/**
 * Environment with JWT secret and Super Admin secrets
 */
interface AuthEnv {
  DB: D1Database;
  JWT_SECRET: string;
  BUCKET: R2Bucket;
  SUPER_ADMIN_LOGIN_ID?: string;
  SUPER_ADMIN_PASSWORD_HASH?: string;
  SUPER_ADMIN_TOKEN_VERSION?: string;
}

/**
 * Hono context with authenticated user or Super Admin
 */
export interface AuthContext {
  Bindings: AuthEnv;
  Variables: {
    tenant: AuthenticatedContext;
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
 * Supports both school users and Super Admin
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
    
    // Try to verify as Super Admin token first
    try {
      const superAdminContext = await superAdminService.verifySuperAdminToken(token, c.env);
      
      // Valid Super Admin token
      logger.info('SUPER_ADMIN_TOKEN_VERIFIED', {
        requestId,
        role: 'super_admin',
      });
      
      c.set('tenant', superAdminContext);
      await next();
      return;
    } catch (superAdminError) {
      // Not a Super Admin token or invalid - try school user token
    }
    
    // Verify as school user token
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

    // Verify school is active
    const school = await c.env.DB
      .prepare('SELECT status FROM schools WHERE id = ? LIMIT 1')
      .bind(user.school_id)
      .first<{ status: string }>();

    if (!school || school.status !== 'active') {
      logger.warn(AuthEvents.ACCESS_DENIED, {
        requestId,
        userId: user.id,
        schoolId: user.school_id,
        reasonCode: 'SCHOOL_NOT_ACTIVE',
      });
      return c.json({ error: 'School access suspended' }, 403);
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
      kind: 'school',
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
              kind: 'school',
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
 * Get authenticated context from request
 * Returns discriminated union (school tenant OR Super Admin)
 * Routes must narrow to specific type using requireSchoolTenant or requireSuperAdmin
 */
export function getTenant(c: Context<AuthContext>): AuthenticatedContext {
  const tenant = c.get('tenant');
  if (!tenant) {
    throw new Error('Not authenticated');
  }
  return tenant;
}

/**
 * Check if the tenant is Super Admin
 */
export function isSuperAdmin(tenant: TenantContext | SuperAdminContext): tenant is SuperAdminContext {
  return tenant.role === 'super_admin' && tenant.userId === null && tenant.schoolId === null;
}

/**
 * Get request ID from context
 */
export function getRequestIdFromContext(c: Context<AuthContext>): string {
  return c.get('requestId') || getRequestId(c.req.raw);
}

/**
 * Require school-scoped tenant (principal/teacher/student)
 * Throws 403 if authenticated as Super Admin
 * 
 * Use this at the boundary of school-scoped routes to narrow
 * AuthenticatedContext to TenantContext
 */
export function requireSchoolTenant(c: Context<AuthContext>): TenantContext {
  const tenant = getTenant(c);
  
  if (tenant.kind === 'platform') {
    throw new Error('Forbidden: School tenant required');
  }
  
  return tenant;
}

/**
 * Require Super Admin context
 * Throws 403 if not Super Admin
 * 
 * Use this at the boundary of platform-level routes
 */
export function requireSuperAdmin(c: Context<AuthContext>): SuperAdminContext {
  const tenant = getTenant(c);
  
  if (tenant.kind !== 'platform') {
    throw new Error('Forbidden: Super Admin access required');
  }
  
  // Additional validation for defense-in-depth
  if (tenant.role !== 'super_admin' || tenant.userId !== null || tenant.schoolId !== null) {
    throw new Error('Forbidden: Invalid Super Admin context');
  }
  
  return tenant;
}
