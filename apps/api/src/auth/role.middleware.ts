/**
 * Role-based authorization middleware
 * 
 * Ensures the authenticated user has the required role(s) to access a route
 */

import { Context, Next } from 'hono';
import type { AuthContext } from './auth.middleware';
import { requireSchoolTenant } from './auth.middleware';
import type { UserRole } from './auth.types';
import { logger } from '../lib/logging/logger';

/**
 * Require specific role(s) for route access
 * Must be used after requireAuth middleware
 * 
 * @param allowedRoles - Single role or array of roles that can access this route
 * 
 * @example
 * // Principal only
 * app.get('/teachers', requireAuth, requireRole('principal'), handler)
 * 
 * // Principal or Teacher
 * app.get('/attendance', requireAuth, requireRole(['principal', 'teacher']), handler)
 */
export function requireRole(allowedRoles: UserRole | UserRole[]) {
  const rolesArray = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
  
  return async (c: Context<AuthContext>, next: Next): Promise<Response | void> => {
    const requestId = c.get('requestId');
    
    try {
      // Get school tenant context (throws if Super Admin)
      const tenant = requireSchoolTenant(c);
      
      // Check if user's role is in allowed roles
      if (!rolesArray.includes(tenant.role)) {
        logger.warn('AUTHORIZATION_FAILED', {
          requestId,
          userId: tenant.userId,
          userRole: tenant.role,
          allowedRoles: rolesArray,
          path: c.req.path,
          method: c.req.method,
        });
        
        return c.json({ 
          error: 'Forbidden',
          message: `Access denied. Required role: ${rolesArray.join(' or ')}`
        }, 403);
      }
      
      // Role authorized, proceed
      logger.debug('AUTHORIZATION_SUCCESS', {
        requestId,
        userId: tenant.userId,
        userRole: tenant.role,
        path: c.req.path,
      });
      
      await next();
    } catch (error) {
      logger.error('AUTHORIZATION_ERROR', {
        requestId,
        error: error instanceof Error ? error.message : 'Unknown error',
        path: c.req.path,
      });
      
      return c.json({ error: 'Forbidden' }, 403);
    }
  };
}

/**
 * Shorthand: Require principal role
 */
export function requirePrincipal() {
  return requireRole('principal');
}

/**
 * Shorthand: Require teacher role (does not include principal)
 */
export function requireTeacher() {
  return requireRole('teacher');
}

/**
 * Shorthand: Require student role
 */
export function requireStudent() {
  return requireRole('student');
}

/**
 * Shorthand: Require principal or teacher role
 */
export function requirePrincipalOrTeacher() {
  return requireRole(['principal', 'teacher']);
}
