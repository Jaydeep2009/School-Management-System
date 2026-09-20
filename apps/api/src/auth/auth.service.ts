/**
 * Authentication service - Orchestrates auth flows with structured logging
 * 
 * SECURITY: Never log passwords, tokens, or other sensitive credentials
 */

import type {
  LoginRequest,
  LoginResponse,
  ActivationRequest,
  ActivationResponse,
  PasswordChangeRequest,
  PasswordChangeResponse,
  RefreshRequest,
  RefreshResponse,
  User,
} from './auth.types';
import * as authRepo from './auth.repository';
import * as passwordService from './password.service';
import * as tokenService from './token.service';
import * as sessionService from './session.service';
import { logger, AuthEvents, AuthFailureReasons } from '../lib/logging/logger';

/**
 * Environment with required secrets
 */
interface AuthEnv {
  DB: D1Database;
  JWT_SECRET: string;
}

/**
 * Login flow
 */
export async function login(
  request: LoginRequest,
  userAgent: string | null,
  requestId: string,
  env: AuthEnv
): Promise<LoginResponse> {
  const startTime = Date.now();
  
  logger.info(AuthEvents.LOGIN_ATTEMPT, {
    requestId,
    loginId: request.loginId,
  });
  
  try {
    // Normalize login ID
    const loginId = request.loginId.trim();
    
    // Find user
    const user = await authRepo.findUserByLoginId(env.DB, loginId);
    
    if (!user) {
      // Generic error - don't reveal if user exists
      logger.warn(AuthEvents.LOGIN_FAILURE, {
        requestId,
        loginId,
        reasonCode: AuthFailureReasons.INVALID_CREDENTIALS,
        durationMs: Date.now() - startTime,
      });
      throw new Error('Invalid credentials');
    }
    
    // Check account status
    if (user.status !== 'active') {
      logger.warn(AuthEvents.LOGIN_FAILURE, {
        requestId,
        userId: user.id,
        schoolId: user.school_id,
        role: user.role,
        reasonCode: AuthFailureReasons.ACCOUNT_DISABLED,
        durationMs: Date.now() - startTime,
      });
      throw new Error('Invalid credentials');
    }
    
    // Check if account needs activation
    if (!user.password_hash) {
      logger.warn(AuthEvents.LOGIN_FAILURE, {
        requestId,
        userId: user.id,
        schoolId: user.school_id,
        role: user.role,
        reasonCode: AuthFailureReasons.ACTIVATION_INVALID,
        durationMs: Date.now() - startTime,
      });
      throw new Error('Account not activated');
    }
    
    // Verify password
    const passwordValid = await passwordService.verifyPassword(
      request.password,
      user.password_hash
    );
    
    if (!passwordValid) {
      logger.warn(AuthEvents.LOGIN_FAILURE, {
        requestId,
        userId: user.id,
        schoolId: user.school_id,
        role: user.role,
        reasonCode: AuthFailureReasons.INVALID_CREDENTIALS,
        durationMs: Date.now() - startTime,
      });
      throw new Error('Invalid credentials');
    }
    
    // Create session
    const expiresAt = tokenService.getRefreshTokenExpiry();
    const sessionData = sessionService.prepareSessionData({
      userId: user.id,
      userAgent,
      expiresAt,
    });
    
    await authRepo.createSession(env.DB, {
      id: sessionData.id,
      userId: sessionData.userId,
      refreshHash: sessionData.refreshHash,
      familyId: sessionData.familyId,
      expiresAt: sessionData.expiresAt,
      userAgent: sessionData.userAgent,
    });
    
    // Generate tokens
    const accessToken = await tokenService.generateAccessToken(
      {
        userId: user.id,
        role: user.role,
        schoolId: user.school_id,
        sessionId: sessionData.id,
      },
      env
    );
    
    const refreshToken = tokenService.formatRefreshToken(
      sessionData.id,
      sessionData.refreshSecret
    );
    
    // Create audit log
    await authRepo.createAuditLog(env.DB, {
      userId: user.id,
      schoolId: user.school_id,
      entityType: 'session',
      entityId: sessionData.id,
      action: 'LOGIN',
      before: null,
      after: null,
    });
    
    logger.info(AuthEvents.LOGIN_SUCCESS, {
      requestId,
      userId: user.id,
      schoolId: user.school_id,
      role: user.role,
      sessionId: sessionData.id,
      durationMs: Date.now() - startTime,
    });
    
    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        loginId: user.login_id,
        role: user.role,
        schoolId: user.school_id,
        mustChangePassword: user.must_change_password === 1,
      },
    };
  } catch (error) {
    // Error already logged in specific failure cases
    throw error;
  }
}

/**
 * Activate account flow
 */
export async function activate(
  request: ActivationRequest,
  requestId: string,
  env: AuthEnv
): Promise<ActivationResponse> {
  const startTime = Date.now();
  
  logger.info(AuthEvents.ACTIVATION_ATTEMPT, {
    requestId,
    loginId: request.loginId,
  });
  
  try {
    // Normalize login ID
    const loginId = request.loginId.trim();
    
    // Find user
    const user = await authRepo.findUserByLoginId(env.DB, loginId);
    
    if (!user) {
      logger.warn(AuthEvents.ACTIVATION_FAILURE, {
        requestId,
        loginId,
        reasonCode: AuthFailureReasons.INVALID_CREDENTIALS,
        durationMs: Date.now() - startTime,
      });
      throw new Error('Invalid activation credentials');
    }
    
    // Check if activation hash exists
    if (!user.activation_hash) {
      logger.warn(AuthEvents.ACTIVATION_FAILURE, {
        requestId,
        userId: user.id,
        schoolId: user.school_id,
        reasonCode: AuthFailureReasons.ACTIVATION_INVALID,
        durationMs: Date.now() - startTime,
      });
      throw new Error('Invalid activation credentials');
    }
    
    // Check expiry
    if (user.activation_expires_at) {
      const expiresAt = new Date(user.activation_expires_at);
      if (expiresAt <= new Date()) {
        logger.warn(AuthEvents.ACTIVATION_FAILURE, {
          requestId,
          userId: user.id,
          schoolId: user.school_id,
          reasonCode: AuthFailureReasons.ACTIVATION_EXPIRED,
          durationMs: Date.now() - startTime,
        });
        throw new Error('Activation code expired');
      }
    }
    
    // Verify activation code
    const activationValid = await passwordService.verifyPassword(
      request.activationCode,
      user.activation_hash
    );
    
    if (!activationValid) {
      logger.warn(AuthEvents.ACTIVATION_FAILURE, {
        requestId,
        userId: user.id,
        schoolId: user.school_id,
        reasonCode: AuthFailureReasons.ACTIVATION_INVALID,
        durationMs: Date.now() - startTime,
      });
      throw new Error('Invalid activation credentials');
    }
    
    // Validate new password
    const passwordErrors = passwordService.validatePasswordStrength(request.newPassword);
    if (passwordErrors.length > 0) {
      logger.warn(AuthEvents.ACTIVATION_FAILURE, {
        requestId,
        userId: user.id,
        schoolId: user.school_id,
        reasonCode: AuthFailureReasons.WEAK_PASSWORD,
        durationMs: Date.now() - startTime,
      });
      throw new Error(passwordErrors[0]);
    }
    
    // Hash new password
    const passwordHash = await passwordService.hashPassword(request.newPassword);
    
    // Activate account
    await authRepo.activateUser(env.DB, user.id, passwordHash);
    
    // Revoke all existing sessions (if any)
    await authRepo.revokeAllUserSessions(env.DB, user.id);
    
    // Create audit log
    await authRepo.createAuditLog(env.DB, {
      userId: user.id,
      schoolId: user.school_id,
      entityType: 'user',
      entityId: user.id,
      action: 'ACCOUNT_ACTIVATED',
      before: null,
      after: null,
    });
    
    logger.info(AuthEvents.ACTIVATION_SUCCESS, {
      requestId,
      userId: user.id,
      schoolId: user.school_id,
      role: user.role,
      durationMs: Date.now() - startTime,
    });
    
    return {
      success: true,
      message: 'Account activated successfully',
    };
  } catch (error) {
    throw error;
  }
}

/**
 * Change password flow
 */
export async function changePassword(
  request: PasswordChangeRequest,
  userId: string,
  requestId: string,
  env: AuthEnv
): Promise<PasswordChangeResponse> {
  const startTime = Date.now();
  
  logger.info(AuthEvents.PASSWORD_CHANGE_ATTEMPT, {
    requestId,
    userId,
  });
  
  try {
    // Get current user
    const user = await authRepo.findUserById(env.DB, userId);
    
    if (!user) {
      logger.warn(AuthEvents.PASSWORD_CHANGE_FAILURE, {
        requestId,
        userId,
        reasonCode: AuthFailureReasons.INVALID_CREDENTIALS,
        durationMs: Date.now() - startTime,
      });
      throw new Error('User not found');
    }
    
    // Verify account is active
    if (user.status !== 'active') {
      logger.warn(AuthEvents.PASSWORD_CHANGE_FAILURE, {
        requestId,
        userId,
        schoolId: user.school_id,
        reasonCode: AuthFailureReasons.ACCOUNT_DISABLED,
        durationMs: Date.now() - startTime,
      });
      throw new Error('Account disabled');
    }
    
    // Verify current password
    if (!user.password_hash) {
      logger.warn(AuthEvents.PASSWORD_CHANGE_FAILURE, {
        requestId,
        userId,
        schoolId: user.school_id,
        reasonCode: AuthFailureReasons.INVALID_CREDENTIALS,
        durationMs: Date.now() - startTime,
      });
      throw new Error('Current password incorrect');
    }
    
    const currentPasswordValid = await passwordService.verifyPassword(
      request.currentPassword,
      user.password_hash
    );
    
    if (!currentPasswordValid) {
      logger.warn(AuthEvents.PASSWORD_CHANGE_FAILURE, {
        requestId,
        userId,
        schoolId: user.school_id,
        reasonCode: AuthFailureReasons.PASSWORD_MISMATCH,
        durationMs: Date.now() - startTime,
      });
      throw new Error('Current password incorrect');
    }
    
    // Validate new password
    const passwordErrors = passwordService.validatePasswordStrength(request.newPassword);
    if (passwordErrors.length > 0) {
      logger.warn(AuthEvents.PASSWORD_CHANGE_FAILURE, {
        requestId,
        userId,
        schoolId: user.school_id,
        reasonCode: AuthFailureReasons.WEAK_PASSWORD,
        durationMs: Date.now() - startTime,
      });
      throw new Error(passwordErrors[0]);
    }
    
    // Hash new password
    const passwordHash = await passwordService.hashPassword(request.newPassword);
    
    // Update password and increment token version
    await authRepo.updateUserPassword(env.DB, userId, passwordHash);
    
    // Revoke all existing sessions
    await authRepo.revokeAllUserSessions(env.DB, userId);
    
    // Create audit log
    await authRepo.createAuditLog(env.DB, {
      userId: user.id,
      schoolId: user.school_id,
      entityType: 'user',
      entityId: user.id,
      action: 'PASSWORD_CHANGED',
      before: null,
      after: null,
    });
    
    logger.info(AuthEvents.PASSWORD_CHANGE_SUCCESS, {
      requestId,
      userId,
      schoolId: user.school_id,
      role: user.role,
      durationMs: Date.now() - startTime,
    });
    
    return {
      success: true,
      message: 'Password changed successfully',
    };
  } catch (error) {
    throw error;
  }
}

/**
 * Refresh token flow
 */
export async function refresh(
  request: RefreshRequest,
  requestId: string,
  env: AuthEnv
): Promise<RefreshResponse> {
  const startTime = Date.now();
  
  logger.info(AuthEvents.REFRESH_ATTEMPT, {
    requestId,
  });
  
  try {
    // Parse refresh token
    const parsed = tokenService.parseRefreshToken(request.refreshToken);
    
    if (!parsed) {
      logger.warn(AuthEvents.REFRESH_FAILURE, {
        requestId,
        reasonCode: AuthFailureReasons.TOKEN_INVALID,
        durationMs: Date.now() - startTime,
      });
      throw new Error('Invalid refresh token');
    }
    
    const { sessionId, secret } = parsed;
    
    // Load session
    const session = await authRepo.findSessionById(env.DB, sessionId);
    
    if (!session) {
      logger.warn(AuthEvents.REFRESH_FAILURE, {
        requestId,
        reasonCode: AuthFailureReasons.SESSION_EXPIRED,
        durationMs: Date.now() - startTime,
      });
      throw new Error('Invalid refresh token');
    }
    
    // Verify session validity
    const validation = sessionService.validateSession(session);
    
    if (!validation.valid) {
      // Check if this is a reuse attempt
      if (validation.reason === 'SESSION_REVOKED') {
        // Load all sessions in family to detect reuse
        const familySessions = await authRepo.findSessionsByFamily(env.DB, session.family_id);
        const isCompromised = sessionService.isSessionFamilyCompromised(session, familySessions);
        
        if (isCompromised) {
          // Reuse detected! Revoke entire family
          await authRepo.revokeSessionFamily(env.DB, session.family_id);
          
          logger.error(AuthEvents.REFRESH_REUSE_DETECTED, {
            requestId,
            sessionId: session.id,
            familyId: session.family_id,
            userId: session.user_id,
            reasonCode: AuthFailureReasons.REFRESH_REUSE,
            durationMs: Date.now() - startTime,
          }, 'Refresh token reuse detected - family revoked');
        }
      }
      
      logger.warn(AuthEvents.REFRESH_FAILURE, {
        requestId,
        sessionId: session.id,
        userId: session.user_id,
        reasonCode: validation.reason || AuthFailureReasons.SESSION_EXPIRED,
        durationMs: Date.now() - startTime,
      });
      throw new Error('Invalid refresh token');
    }
    
    // Verify refresh secret
    const secretValid = sessionService.verifyRefreshSecret(secret, session.refresh_hash);
    
    if (!secretValid) {
      logger.warn(AuthEvents.REFRESH_FAILURE, {
        requestId,
        sessionId: session.id,
        userId: session.user_id,
        reasonCode: AuthFailureReasons.TOKEN_INVALID,
        durationMs: Date.now() - startTime,
      });
      throw new Error('Invalid refresh token');
    }
    
    // Load user
    const user = await authRepo.findUserById(env.DB, session.user_id);
    
    if (!user || user.status !== 'active') {
      logger.warn(AuthEvents.REFRESH_FAILURE, {
        requestId,
        sessionId: session.id,
        userId: session.user_id,
        reasonCode: AuthFailureReasons.ACCOUNT_DISABLED,
        durationMs: Date.now() - startTime,
      });
      throw new Error('Invalid refresh token');
    }
    
    // Rotate refresh secret
    const newRefreshSecret = sessionService.generateRefreshSecret();
    const newRefreshHash = sessionService.hashRefreshSecret(newRefreshSecret);
    
    await authRepo.updateSessionRefreshHash(env.DB, sessionId, newRefreshHash);
    
    // Generate new access token
    const accessToken = await tokenService.generateAccessToken(
      {
        userId: user.id,
        role: user.role,
        schoolId: user.school_id,
        sessionId: session.id,
      },
      env
    );
    
    const refreshToken = tokenService.formatRefreshToken(sessionId, newRefreshSecret);
    
    logger.info(AuthEvents.REFRESH_SUCCESS, {
      requestId,
      sessionId: session.id,
      userId: user.id,
      schoolId: user.school_id,
      role: user.role,
      durationMs: Date.now() - startTime,
    });
    
    return {
      accessToken,
      refreshToken,
    };
  } catch (error) {
    throw error;
  }
}

/**
 * Logout flow
 */
export async function logout(
  sessionId: string,
  userId: string,
  requestId: string,
  env: AuthEnv
): Promise<void> {
  const startTime = Date.now();
  
  // Revoke session
  await authRepo.revokeSession(env.DB, sessionId);
  
  // Create audit log
  const user = await authRepo.findUserById(env.DB, userId);
  if (user) {
    await authRepo.createAuditLog(env.DB, {
      userId: user.id,
      schoolId: user.school_id,
      entityType: 'session',
      entityId: sessionId,
      action: 'LOGOUT',
      before: null,
      after: null,
    });
  }
  
  logger.info(AuthEvents.LOGOUT, {
    requestId,
    sessionId,
    userId,
    schoolId: user?.school_id,
    durationMs: Date.now() - startTime,
  });
}
