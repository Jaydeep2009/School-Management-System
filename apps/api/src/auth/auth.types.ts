/**
 * Authentication types
 */

export type UserRole = 'principal' | 'teacher' | 'student';
export type UserStatus = 'active' | 'disabled';

/**
 * School-scoped tenant context (principal/teacher/student)
 * NEVER accept these values from client requests
 * 
 * Uses discriminated union with kind: 'school'
 */
export interface TenantContext {
  kind: 'school';
  userId: string;
  role: UserRole;
  schoolId: string;
  sessionId: string;
}

/**
 * Platform-level Super Admin context
 * Used exclusively for platform operations
 * 
 * Uses discriminated union with kind: 'platform'
 */
export interface SuperAdminContext {
  kind: 'platform';
  userId: null;
  role: 'super_admin';
  schoolId: null;
  sessionId: null;
  tokenVersion: number;
}

/**
 * Authenticated context - discriminated union
 * Middleware produces this, routes narrow to specific type
 */
export type AuthenticatedContext = TenantContext | SuperAdminContext;

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

/**
 * Super Admin login request
 */
export interface SuperAdminLoginRequest {
  loginId: string;
  password: string;
}

/**
 * Super Admin login response
 * NO refresh token - access token only with 15min expiry
 */
export interface SuperAdminLoginResponse {
  accessToken: string;
}

/**
 * Super Admin JWT payload
 */
export interface SuperAdminTokenPayload {
  sub: 'super-admin'; // Fixed platform identifier
  role: 'super_admin';
  tokenVersion: number;
  iat: number;
  exp: number;
}
