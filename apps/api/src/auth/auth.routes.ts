/**
 * Authentication routes
 * 
 * POST /auth/login - Login with credentials
 * POST /auth/activate - Activate account with activation code
 * POST /auth/change-password - Change password (authenticated)
 * POST /auth/refresh - Refresh access token
 * POST /auth/logout - Logout current session (authenticated)
 * GET /auth/me - Get current user info (authenticated, test endpoint)
 */

import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import * as authService from './auth.service';
import * as authSchemas from './auth.schemas';
import { requireAuth, getTenant, getRequestIdFromContext, type AuthContext } from './auth.middleware';
import type {
  LoginRequest,
  ActivationRequest,
  PasswordChangeRequest,
  RefreshRequest,
} from './auth.types';

const auth = new Hono<AuthContext>();

/**
 * POST /auth/login
 * Login with loginId and password
 */
auth.post(
  '/login',
  zValidator('json', authSchemas.loginRequestSchema),
  async (c) => {
    try {
      const requestId = getRequestIdFromContext(c);
      const body = c.req.valid('json') as LoginRequest;
      const userAgent = c.req.header('user-agent') || null;
      
      const response = await authService.login(body, userAgent, requestId, c.env);
      
      return c.json(response, 200);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Login failed';
      
      // Return generic error to avoid information disclosure
      if (message.includes('credentials') || message.includes('disabled') || message.includes('activated')) {
        return c.json({ error: 'Invalid credentials' }, 401);
      }
      
      return c.json({ error: 'Login failed' }, 500);
    }
  }
);

/**
 * POST /auth/activate
 * Activate account with activation code and set password
 */
auth.post(
  '/activate',
  zValidator('json', authSchemas.activationRequestSchema),
  async (c) => {
    try {
      const requestId = getRequestIdFromContext(c);
      const body = c.req.valid('json') as ActivationRequest;
      
      const response = await authService.activate(body, requestId, c.env);
      
      return c.json(response, 200);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Activation failed';
      
      // Return appropriate error messages
      if (message.includes('expired')) {
        return c.json({ error: 'Activation code expired' }, 400);
      }
      
      if (message.includes('password')) {
        return c.json({ error: message }, 400);
      }
      
      // Generic error for invalid credentials
      return c.json({ error: 'Invalid activation credentials' }, 401);
    }
  }
);

/**
 * POST /auth/change-password
 * Change password for authenticated user
 * Requires valid access token
 */
auth.post(
  '/change-password',
  requireAuth,
  zValidator('json', authSchemas.passwordChangeRequestSchema),
  async (c) => {
    try {
      const requestId = getRequestIdFromContext(c);
      const tenant = getTenant(c);
      const body = c.req.valid('json') as PasswordChangeRequest;
      
      const response = await authService.changePassword(
        body,
        tenant.userId,
        requestId,
        c.env
      );
      
      return c.json(response, 200);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Password change failed';
      
      // Return appropriate error messages
      if (message.includes('password')) {
        return c.json({ error: message }, 400);
      }
      
      if (message.includes('disabled')) {
        return c.json({ error: 'Account disabled' }, 403);
      }
      
      return c.json({ error: 'Password change failed' }, 500);
    }
  }
);

/**
 * POST /auth/refresh
 * Refresh access token using refresh token
 */
auth.post(
  '/refresh',
  zValidator('json', authSchemas.refreshRequestSchema),
  async (c) => {
    try {
      const requestId = getRequestIdFromContext(c);
      const body = c.req.valid('json') as RefreshRequest;
      
      const response = await authService.refresh(body, requestId, c.env);
      
      return c.json(response, 200);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Refresh failed';
      
      // Return generic error for all refresh failures
      return c.json({ error: 'Invalid refresh token' }, 401);
    }
  }
);

/**
 * POST /auth/logout
 * Logout current session
 * Requires valid access token
 */
auth.post('/logout', requireAuth, async (c) => {
  try {
    const requestId = getRequestIdFromContext(c);
    const tenant = getTenant(c);
    
    await authService.logout(tenant.sessionId, tenant.userId, requestId, c.env);
    
    return c.json({ success: true, message: 'Logged out successfully' }, 200);
  } catch (error) {
    return c.json({ error: 'Logout failed' }, 500);
  }
});

/**
 * GET /auth/me
 * Get current user information (test endpoint)
 * Requires valid access token
 */
auth.get('/me', requireAuth, async (c) => {
  try {
    const tenant = getTenant(c);
    
    return c.json({
      userId: tenant.userId,
      role: tenant.role,
      schoolId: tenant.schoolId,
      sessionId: tenant.sessionId,
    }, 200);
  } catch (error) {
    return c.json({ error: 'Failed to get user info' }, 500);
  }
});

export default auth;
