/**
 * Authorization errors
 * 
 * Consistent error handling for authorization failures
 * SECURITY: Do not reveal cross-tenant resource existence
 */

/**
 * Authorization error codes
 */
export enum AuthzErrorCode {
  FORBIDDEN = 'FORBIDDEN',
  INSUFFICIENT_ROLE = 'INSUFFICIENT_ROLE',
  TENANT_MISMATCH = 'TENANT_MISMATCH',
  RELATIONSHIP_REQUIRED = 'RELATIONSHIP_REQUIRED',
  SELF_ACCESS_ONLY = 'SELF_ACCESS_ONLY',
}

/**
 * Authorization error
 */
export class AuthzError extends Error {
  readonly code: AuthzErrorCode;
  readonly httpStatus: number;

  constructor(code: AuthzErrorCode, message?: string) {
    super(message || 'Forbidden');
    this.name = 'AuthzError';
    this.code = code;
    
    // All authorization errors map to 403
    // Do not use 404 to avoid leaking resource existence
    this.httpStatus = 403;
  }
}

/**
 * Create forbidden error
 */
export function forbidden(reason?: string): AuthzError {
  return new AuthzError(
    AuthzErrorCode.FORBIDDEN,
    reason || 'Access denied'
  );
}

/**
 * Create insufficient role error
 */
export function insufficientRole(requiredRole: string): AuthzError {
  return new AuthzError(
    AuthzErrorCode.INSUFFICIENT_ROLE,
    `Requires ${requiredRole} role`
  );
}

/**
 * Create tenant mismatch error
 */
export function tenantMismatch(): AuthzError {
  return new AuthzError(
    AuthzErrorCode.TENANT_MISMATCH,
    'Resource not accessible'
  );
}

/**
 * Create relationship required error
 */
export function relationshipRequired(relationshipType: string): AuthzError {
  return new AuthzError(
    AuthzErrorCode.RELATIONSHIP_REQUIRED,
    `Requires ${relationshipType} relationship`
  );
}

/**
 * Create self-access only error
 */
export function selfAccessOnly(): AuthzError {
  return new AuthzError(
    AuthzErrorCode.SELF_ACCESS_ONLY,
    'Access limited to own resources'
  );
}
