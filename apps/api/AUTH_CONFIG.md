# Authentication Configuration

## Overview

The School Management System uses JWT-based authentication with refresh token rotation and comprehensive security logging.

## Required Environment Variables

### Development

For local development, `JWT_SECRET` is configured in `wrangler.jsonc` under `vars`:

```jsonc
"vars": {
  "JWT_SECRET": "dev-secret-change-in-production-use-wrangler-secret-put"
}
```

### Production

For production deployment, **DO NOT** commit secrets to `wrangler.jsonc`. Instead, use Wrangler secrets:

```bash
# Set JWT secret
wrangler secret put JWT_SECRET
# Enter a secure secret when prompted (e.g., output from: openssl rand -base64 32)
```

## Token Configuration

### Access Tokens
- **Expiry**: 15 minutes
- **Algorithm**: HS256
- **Claims**: userId (sub), role, schoolId, sessionId, iat, exp
- **Usage**: Included in Authorization header as `Bearer <token>`

### Refresh Tokens
- **Expiry**: 30 days
- **Format**: `<sessionId>.<secret>`
- **Storage**: Only SHA-256 hash stored in database
- **Rotation**: New secret generated on each refresh
- **Reuse Detection**: Entire session family revoked if reused token detected

## Password Requirements

- Minimum 8 characters
- Maximum 128 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- At least one special character

## Password Hashing

- **Algorithm**: scrypt
- **Parameters**: N=16384, r=8, p=1
- **Salt**: 16 bytes (128 bits) random
- **Output**: 32 bytes (256 bits)
- **Format**: `scrypt$<params>$<salt>$<hash>`

## Session Management

### Session Creation
- Created on successful login or activation
- Stores SHA-256 hash of refresh secret
- Includes family_id for reuse detection
- Records user_agent for audit trail

### Session Revocation
- Individual session: On logout
- All user sessions: On password change, activation
- Session family: On refresh token reuse detection

## Security Events

All authentication events are logged with structured format:

```json
{
  "level": "info",
  "event": "AUTH_LOGIN_SUCCESS",
  "timestamp": "2024-01-15T10:30:45.123Z",
  "context": {
    "requestId": "01HQXYZ...",
    "userId": "01HQABC...",
    "schoolId": "01HQDEF...",
    "role": "teacher",
    "sessionId": "01HQGHI...",
    "durationMs": 42
  }
}
```

### Logged Events

**Login**: AUTH_LOGIN_ATTEMPT, AUTH_LOGIN_SUCCESS, AUTH_LOGIN_FAILURE
**Activation**: AUTH_ACTIVATION_ATTEMPT, AUTH_ACTIVATION_SUCCESS, AUTH_ACTIVATION_FAILURE
**Password Change**: AUTH_PASSWORD_CHANGE_ATTEMPT, AUTH_PASSWORD_CHANGE_SUCCESS, AUTH_PASSWORD_CHANGE_FAILURE
**Refresh**: AUTH_REFRESH_ATTEMPT, AUTH_REFRESH_SUCCESS, AUTH_REFRESH_FAILURE, AUTH_REFRESH_REUSE_DETECTED
**Logout**: AUTH_LOGOUT, AUTH_SESSION_REVOKED, AUTH_ALL_SESSIONS_REVOKED
**Access Control**: AUTH_TOKEN_INVALID, AUTH_TOKEN_EXPIRED, AUTH_ACCOUNT_DISABLED, AUTH_ACCESS_DENIED

### Never Logged

- Passwords (plaintext or hashed)
- Activation codes
- Refresh tokens (raw or hashed)
- Access tokens
- Authorization headers
- Full request bodies containing credentials

## API Endpoints

### POST /auth/login
**Request**:
```json
{
  "loginId": "GPS-S-000123",
  "password": "SecurePass123!"
}
```

**Response** (200):
```json
{
  "accessToken": "eyJhbGc...",
  "refreshToken": "01HQXYZ....abc123",
  "user": {
    "id": "01HQABC...",
    "loginId": "GPS-S-000123",
    "role": "student",
    "schoolId": "01HQDEF...",
    "mustChangePassword": false
  }
}
```

### POST /auth/activate
**Request**:
```json
{
  "loginId": "GPS-S-000123",
  "activationCode": "...",
  "newPassword": "NewSecurePass123!"
}
```

**Response** (200):
```json
{
  "success": true,
  "message": "Account activated successfully"
}
```

### POST /auth/change-password
**Headers**: `Authorization: Bearer <accessToken>`

**Request**:
```json
{
  "currentPassword": "OldPass123!",
  "newPassword": "NewSecurePass456!"
}
```

**Response** (200):
```json
{
  "success": true,
  "message": "Password changed successfully"
}
```

### POST /auth/refresh
**Request**:
```json
{
  "refreshToken": "01HQXYZ....abc123"
}
```

**Response** (200):
```json
{
  "accessToken": "eyJhbGc...",
  "refreshToken": "01HQXYZ....def456"
}
```

### POST /auth/logout
**Headers**: `Authorization: Bearer <accessToken>`

**Response** (200):
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

### GET /auth/me (Test Endpoint)
**Headers**: `Authorization: Bearer <accessToken>`

**Response** (200):
```json
{
  "userId": "01HQABC...",
  "role": "teacher",
  "schoolId": "01HQDEF...",
  "sessionId": "01HQGHI..."
}
```

## Tenant Isolation

Every authenticated request includes server-derived `TenantContext`:

```typescript
{
  userId: string;
  role: 'principal' | 'teacher' | 'student';
  schoolId: string;
  sessionId: string;
}
```

**NEVER** trust these values from client requests. The authentication middleware derives them from the verified JWT and database state.

## Error Responses

Authentication errors use generic messages to prevent information disclosure:

- Invalid credentials → `"Invalid credentials"` (401)
- User not found → `"Invalid credentials"` (401)
- Account disabled → `"Invalid credentials"` (401)
- Expired/invalid token → `"Unauthorized"` or `"Token expired"` (401)
- Session revoked → `"Session revoked"` (401)

## Production Deployment Checklist

- [ ] Set `JWT_SECRET` using `wrangler secret put` (NOT in wrangler.jsonc)
- [ ] Verify `JWT_SECRET` has high entropy (≥256 bits)
- [ ] Create production D1 database
- [ ] Update `wrangler.jsonc` with production database IDs
- [ ] Configure observability/logging for production
- [ ] Test all authentication flows in staging environment
- [ ] Verify refresh token rotation works correctly
- [ ] Test refresh token reuse detection
- [ ] Verify session revocation on password change
- [ ] Test disabled account rejection
- [ ] Review security event logs for sensitive data leaks
- [ ] Configure rate limiting (future enhancement)
- [ ] Set up monitoring/alerting for AUTH_REFRESH_REUSE_DETECTED events
