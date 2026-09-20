# Structured Logging Examples

## Safe Log Output

All authentication events generate structured JSON logs with safe metadata only. No secrets, passwords, tokens, or hashes ever appear in logs.

### AUTH_LOGIN_ATTEMPT

```json
{
  "level": "info",
  "event": "AUTH_LOGIN_ATTEMPT",
  "timestamp": "2024-01-15T10:30:45.123Z",
  "context": {
    "requestId": "req_01HQABC123DEF456",
    "loginId": "GPS-S-000123"
  }
}
```

**Safe metadata**: requestId, loginId
**Excluded**: password

### AUTH_LOGIN_SUCCESS

```json
{
  "level": "info",
  "event": "AUTH_LOGIN_SUCCESS",
  "timestamp": "2024-01-15T10:30:45.456Z",
  "context": {
    "requestId": "req_01HQABC123DEF456",
    "userId": "01HQUSER789XYZ",
    "schoolId": "01HQSCHOOL456",
    "role": "teacher",
    "sessionId": "01HQSESSION123",
    "durationMs": 145
  }
}
```

**Safe metadata**: requestId, userId, schoolId, role, sessionId, durationMs
**Excluded**: password, accessToken, refreshToken

### AUTH_LOGIN_FAILURE

```json
{
  "level": "warn",
  "event": "AUTH_LOGIN_FAILURE",
  "timestamp": "2024-01-15T10:31:12.789Z",
  "context": {
    "requestId": "req_01HQXYZ789ABC",
    "userId": "01HQUSER789XYZ",
    "reasonCode": "INVALID_CREDENTIALS",
    "durationMs": 142
  }
}
```

**Safe metadata**: requestId, userId (if found), reasonCode, durationMs
**Excluded**: password, detailed failure reason
**Reason codes**: INVALID_CREDENTIALS, ACCOUNT_DISABLED, ACCOUNT_PENDING

### AUTH_ACTIVATION_ATTEMPT

```json
{
  "level": "info",
  "event": "AUTH_ACTIVATION_ATTEMPT",
  "timestamp": "2024-01-15T11:00:00.000Z",
  "context": {
    "requestId": "req_01HQACTIVATE123",
    "loginId": "GPS-S-000456"
  }
}
```

**Safe metadata**: requestId, loginId
**Excluded**: activationCode, newPassword

### AUTH_ACTIVATION_SUCCESS

```json
{
  "level": "info",
  "event": "AUTH_ACTIVATION_SUCCESS",
  "timestamp": "2024-01-15T11:00:00.234Z",
  "context": {
    "requestId": "req_01HQACTIVATE123",
    "userId": "01HQSTUDENT999",
    "schoolId": "01HQSCHOOL456",
    "role": "student",
    "durationMs": 198
  }
}
```

**Safe metadata**: requestId, userId, schoolId, role, durationMs
**Excluded**: activationCode, newPassword, activationHash

### AUTH_PASSWORD_CHANGE_ATTEMPT

```json
{
  "level": "info",
  "event": "AUTH_PASSWORD_CHANGE_ATTEMPT",
  "timestamp": "2024-01-15T12:00:00.000Z",
  "context": {
    "requestId": "req_01HQPWDCHANGE",
    "userId": "01HQTEACHER777"
  }
}
```

**Safe metadata**: requestId, userId
**Excluded**: currentPassword, newPassword

### AUTH_PASSWORD_CHANGE_SUCCESS

```json
{
  "level": "info",
  "event": "AUTH_PASSWORD_CHANGE_SUCCESS",
  "timestamp": "2024-01-15T12:00:00.180Z",
  "context": {
    "requestId": "req_01HQPWDCHANGE",
    "userId": "01HQTEACHER777",
    "schoolId": "01HQSCHOOL456",
    "role": "teacher",
    "durationMs": 175
  }
}
```

**Safe metadata**: requestId, userId, schoolId, role, durationMs
**Excluded**: currentPassword, newPassword, passwordHash

### AUTH_REFRESH_ATTEMPT

```json
{
  "level": "info",
  "event": "AUTH_REFRESH_ATTEMPT",
  "timestamp": "2024-01-15T13:00:00.000Z",
  "context": {
    "requestId": "req_01HQREFRESH111"
  }
}
```

**Safe metadata**: requestId
**Excluded**: refreshToken, refreshSecret

### AUTH_REFRESH_SUCCESS

```json
{
  "level": "info",
  "event": "AUTH_REFRESH_SUCCESS",
  "timestamp": "2024-01-15T13:00:00.050Z",
  "context": {
    "requestId": "req_01HQREFRESH111",
    "sessionId": "01HQSESSION123",
    "userId": "01HQTEACHER777",
    "schoolId": "01HQSCHOOL456",
    "role": "teacher",
    "durationMs": 48
  }
}
```

**Safe metadata**: requestId, sessionId, userId, schoolId, role, durationMs
**Excluded**: refreshToken, refreshSecret, refreshHash, newAccessToken, newRefreshToken

### AUTH_REFRESH_REUSE_DETECTED

```json
{
  "level": "error",
  "event": "AUTH_REFRESH_REUSE_DETECTED",
  "timestamp": "2024-01-15T13:05:00.000Z",
  "message": "Refresh token reuse detected - family revoked",
  "context": {
    "requestId": "req_01HQREUSE999",
    "sessionId": "01HQSESSION123",
    "familyId": "01HQFAMILY888",
    "userId": "01HQTEACHER777",
    "reasonCode": "REFRESH_REUSE",
    "durationMs": 42
  }
}
```

**Safe metadata**: requestId, sessionId, familyId, userId, reasonCode, durationMs
**Excluded**: refreshToken, refreshSecret

### AUTH_LOGOUT

```json
{
  "level": "info",
  "event": "AUTH_LOGOUT",
  "timestamp": "2024-01-15T14:00:00.000Z",
  "context": {
    "requestId": "req_01HQLOGOUT555",
    "sessionId": "01HQSESSION123",
    "userId": "01HQTEACHER777",
    "schoolId": "01HQSCHOOL456",
    "durationMs": 18
  }
}
```

**Safe metadata**: requestId, sessionId, userId, schoolId, durationMs
**Excluded**: accessToken, refreshToken

### AUTH_TOKEN_INVALID

```json
{
  "level": "warn",
  "event": "AUTH_TOKEN_INVALID",
  "timestamp": "2024-01-15T15:00:00.000Z",
  "context": {
    "requestId": "req_01HQINVALID666",
    "reasonCode": "TOKEN_INVALID"
  }
}
```

**Safe metadata**: requestId, reasonCode
**Excluded**: token, Authorization header

### AUTH_TOKEN_EXPIRED

```json
{
  "level": "warn",
  "event": "AUTH_TOKEN_EXPIRED",
  "timestamp": "2024-01-15T15:30:00.000Z",
  "context": {
    "requestId": "req_01HQEXPIRED777",
    "reasonCode": "TOKEN_EXPIRED"
  }
}
```

**Safe metadata**: requestId, reasonCode
**Excluded**: token, Authorization header

### AUTH_SESSION_REVOKED

```json
{
  "level": "warn",
  "event": "AUTH_SESSION_REVOKED",
  "timestamp": "2024-01-15T16:00:00.000Z",
  "context": {
    "requestId": "req_01HQREVOKED888",
    "sessionId": "01HQSESSION123",
    "userId": "01HQTEACHER777",
    "reasonCode": "SESSION_REVOKED"
  }
}
```

**Safe metadata**: requestId, sessionId, userId, reasonCode
**Excluded**: token

### AUTH_ACCOUNT_DISABLED

```json
{
  "level": "warn",
  "event": "AUTH_ACCOUNT_DISABLED",
  "timestamp": "2024-01-15T16:30:00.000Z",
  "context": {
    "requestId": "req_01HQDISABLED999",
    "userId": "01HQUSER123",
    "reasonCode": "ACCOUNT_DISABLED"
  }
}
```

**Safe metadata**: requestId, userId, reasonCode
**Excluded**: token, password

## Security Properties

### ✅ Never Logged

The following values NEVER appear in logs under any circumstances:

- `password`
- `currentPassword`
- `newPassword`
- `activationCode`
- Raw access tokens (JWT strings)
- Raw refresh tokens (`<sessionId>.<secret>`)
- Refresh secrets (the part after the dot)
- `password_hash` (scrypt hashes)
- `activation_hash`
- `refresh_hash` (SHA-256 hashes)
- `Authorization` header values
- Request bodies containing credentials

### ✅ Always Logged

The following metadata is always included when available:

- `level`: info, warn, error
- `event`: event type constant
- `timestamp`: ISO 8601 timestamp
- `requestId`: request correlation ID
- `userId`: user identifier (when known)
- `schoolId`: tenant identifier (when known)
- `role`: user role (when known)
- `sessionId`: session identifier (when appropriate)
- `reasonCode`: generic failure reason (never detailed)
- `durationMs`: operation duration

### ✅ Reason Codes

Generic reason codes that don't leak implementation details:

- `INVALID_CREDENTIALS`: Login/activation failed (doesn't reveal if user exists)
- `ACCOUNT_DISABLED`: User account is disabled
- `ACCOUNT_PENDING`: User hasn't activated yet
- `TOKEN_INVALID`: JWT signature or format invalid
- `TOKEN_EXPIRED`: JWT expired
- `SESSION_REVOKED`: Session was revoked
- `SESSION_EXPIRED`: Session expired
- `REFRESH_REUSE`: Refresh token reuse detected
- `VALIDATION_ERROR`: Input validation failed

## Log Analysis Examples

### Successful Login Flow

```
[INFO] AUTH_LOGIN_ATTEMPT { requestId: "req_123", loginId: "GPS-S-000123" }
[INFO] AUTH_LOGIN_SUCCESS { requestId: "req_123", userId: "user_789", schoolId: "school_456", role: "teacher", sessionId: "session_999", durationMs: 145 }
```

### Failed Login Flow

```
[INFO] AUTH_LOGIN_ATTEMPT { requestId: "req_124", loginId: "GPS-S-000456" }
[WARN] AUTH_LOGIN_FAILURE { requestId: "req_124", reasonCode: "INVALID_CREDENTIALS", durationMs: 142 }
```

### Refresh Token Reuse Attack

```
[INFO] AUTH_REFRESH_ATTEMPT { requestId: "req_125" }
[INFO] AUTH_REFRESH_SUCCESS { requestId: "req_125", sessionId: "session_999", userId: "user_789", schoolId: "school_456", role: "teacher", durationMs: 48 }
[INFO] AUTH_REFRESH_ATTEMPT { requestId: "req_126" }
[ERROR] AUTH_REFRESH_REUSE_DETECTED { requestId: "req_126", sessionId: "session_999", familyId: "family_888", userId: "user_789", reasonCode: "REFRESH_REUSE", durationMs: 42 }
```

### Password Change Flow

```
[INFO] AUTH_PASSWORD_CHANGE_ATTEMPT { requestId: "req_127", userId: "user_789" }
[INFO] AUTH_PASSWORD_CHANGE_SUCCESS { requestId: "req_127", userId: "user_789", schoolId: "school_456", role: "teacher", durationMs: 175 }
```

## Verification

Tests in `logging-safety.test.ts` verify:

1. **Forbidden strings never appear**: Tests scan all log output for passwords, tokens, hashes, and secrets
2. **Required metadata always present**: Tests verify requestId, event, timestamp in all logs
3. **Safe context only**: Tests verify only approved metadata fields appear in logs
4. **Reason codes used correctly**: Tests verify generic reason codes, not detailed failure messages

Run: `pnpm test logging-safety`

## Compliance

- [✅] **PCI DSS 3.2.1**: No PANs in logs (not applicable - no payment cards)
- [✅] **GDPR Article 32**: Appropriate security measures for personal data
- [✅] **OWASP Logging Cheat Sheet**: No sensitive data in logs
- [✅] **CWE-532**: Prevents insertion of sensitive information into log files
- [✅] **NIST 800-53 AU-9**: Protects audit information from unauthorized disclosure

## References

- OWASP Logging Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html
- CWE-532: Insertion of Sensitive Information into Log File: https://cwe.mitre.org/data/definitions/532.html
- NIST SP 800-53 AU-9: Protection of Audit Information
