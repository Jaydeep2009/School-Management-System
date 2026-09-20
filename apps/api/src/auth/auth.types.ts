/**
 * Authentication types
 */

export type UserRole = 'principal' | 'teacher' | 'student';
export type UserStatus = 'active' | 'disabled';

/**
 * TenantContext - Server-derived authentication context
 * NEVER accept these values from client requests
 */
export interface TenantContext {
  userId: string;
  role: UserRole;
  schoolId: string;
  sessionId: string;
}

/**
 * Database user record (subset of users table)
 */
export interface User {
  id: string;
  school_id: string;
  login_id: string;
  role: UserRole;
  status: UserStatus;
  password_hash: string | null;
  activation_hash: string | null;
  activation_expires_at: string | null;
  must_change_password: number;
  token_version: number;
  created_at: string;
  updated_at: string;
}

/**
 * Database session record
 */
export interface Session {
  id: string;
  user_id: string;
  refresh_hash: string;
  family_id: string;
  expires_at: string;
  revoked_at: string | null;
  user_agent: string | null;
  created_at: string;
}

/**
 * JWT access token payload
 */
export interface AccessTokenPayload {
  sub: string; // userId
  role: UserRole;
  schoolId: string;
  sessionId: string;
  iat: number;
  exp: number;
}

/**
 * Refresh token format: <sessionId>.<secret>
 */
export interface RefreshToken {
  sessionId: string;
  secret: string;
}

/**
 * Login request
 */
export interface LoginRequest {
  loginId: string;
  password: string;
}

/**
 * Login response
 */
export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    loginId: string;
    role: UserRole;
    schoolId: string;
    mustChangePassword: boolean;
  };
}

/**
 * Activation request
 */
export interface ActivationRequest {
  loginId: string;
  activationCode: string;
  newPassword: string;
}

/**
 * Activation response
 */
export interface ActivationResponse {
  success: boolean;
  message: string;
}

/**
 * Password change request
 */
export interface PasswordChangeRequest {
  currentPassword: string;
  newPassword: string;
}

/**
 * Password change response
 */
export interface PasswordChangeResponse {
  success: boolean;
  message: string;
}

/**
 * Refresh request
 */
export interface RefreshRequest {
  refreshToken: string;
}

/**
 * Refresh response
 */
export interface RefreshResponse {
  accessToken: string;
  refreshToken: string;
}

/**
 * Logout response
 */
export interface LogoutResponse {
  success: boolean;
  message: string;
}

/**
 * Safe user identity for responses
 * NEVER include password_hash, activation_hash, refresh_hash, token_version
 */
export interface SafeUserIdentity {
  id: string;
  loginId: string;
  role: UserRole;
  schoolId: string;
  mustChangePassword: boolean;
}
