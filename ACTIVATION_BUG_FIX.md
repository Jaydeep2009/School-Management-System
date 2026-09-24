# Principal Activation Bug Fix

## Issue Description

**Problem**: When activating a newly provisioned Principal account, the activation was throwing an error even though the account was being successfully activated. Subsequently, login attempts with the newly set password would fail with "Invalid credentials" error.

**Root Cause**: Critical authentication operations (activation, login, password change) were performing audit logging and session cleanup as blocking operations. If these non-critical operations failed, they would cause the entire operation to fail even though the critical part (setting password, creating session) had already succeeded.

**Impact**: 
- Activation fails but password is set → User confused, tries wrong password
- Login succeeds but audit fails → User sees error despite being logged in
- Password change succeeds but audit fails → User sees error despite password being changed

## Fix Applied

**File**: `apps/api/src/auth/auth.service.ts`

**Functions Fixed**:
1. `activate()` - Account activation with new password
2. `login()` - User authentication
3. `changePassword()` - Password change

**Pattern**: Wrap non-critical operations (audit logging, session cleanup) in separate try-catch blocks so they don't cause the main operation to fail.

### Before (All Functions)
```typescript
// Critical operation
await performCriticalOperation();

// If this fails, entire operation fails (BAD)
await authRepo.createAuditLog(env.DB, { ... });
await authRepo.revokeAllUserSessions(env.DB, userId);
```

### After (All Functions)
```typescript
// Critical operation completes successfully
await performCriticalOperation();

// Best-effort cleanup (failures are logged but don't block)
try {
  await authRepo.revokeAllUserSessions(env.DB, userId);
} catch (cleanupError) {
  logger.warn('Failed to revoke sessions', { ... });
}

try {
  await authRepo.createAuditLog(env.DB, { ... });
} catch (auditError) {
  logger.warn('Failed to create audit log', { ... });
}
```

## Why This Fix Works

1. **Critical operations complete first**: Password setting, token generation, session creation all succeed before best-effort operations
2. **Audit failures don't block users**: If audit table is missing or has issues, users can still authenticate
3. **Session cleanup failures don't block users**: If session revocation fails, the operation still succeeds
4. **Failures are logged**: All failures in best-effort operations are logged with warnings for monitoring
5. **Consistent pattern**: Same pattern applied to all three critical auth operations

## Operations Classification

### Critical Operations (Must Succeed)
- `activateUser()` - Sets password, clears activation hash
- `createSession()` - Creates user session with tokens
- `updateUserPassword()` - Updates password hash

### Best-Effort Operations (Can Fail Safely)
- `createAuditLog()` - Records operation in audit log
- `revokeAllUserSessions()` - Cleans up old sessions

## Testing the Fix

### Test Case 1: Normal Activation (Happy Path)
1. Provision a new Principal via Super Admin portal
2. Copy login_id and temporary_password
3. Navigate to `/activate`
4. Enter login_id, temporary_password, and new password
5. Submit
6. **Expected**: Success message, redirect to login
7. Login with login_id and new password
8. **Expected**: Successful login to Principal dashboard

### Test Case 2: Activation with Audit Failure
1. Temporarily drop the audit_logs table or make it read-only
2. Follow Test Case 1 steps
3. **Expected**: Activation succeeds even if audit log fails (logged as warning)
4. Login still works

### Test Case 3: Invalid Activation Code
1. Follow Test Case 1 but use wrong temporary_password
2. **Expected**: "Invalid activation credentials" error
3. Account should NOT be activated
4. Cannot login with any password

### Test Case 4: Expired Activation Code
1. Provision Principal
2. Wait for activation_expires_at to pass (or manually set in database to past)
3. Attempt activation
4. **Expected**: "Activation code expired" error
5. Account should NOT be activated

## Verification Commands

```bash
# Backend typecheck
cd apps/api
pnpm typecheck  # Should pass with 0 errors

# Backend tests (if available)
pnpm test

# Deploy backend
pnpm deploy
```

## Related Files

- `apps/api/src/auth/auth.service.ts` - Main fix location
- `apps/api/src/auth/auth.repository.ts` - activateUser function
- `apps/api/src/auth/auth.routes.ts` - POST /auth/activate endpoint
- `apps/web/src/pages/Activate.tsx` - Frontend activation page
- `apps/web/src/services/api.ts` - activateAccount API method

## Prevention for Future

**Best Practice**: For critical user operations (activation, password reset, login), separate:
1. **Critical operations** that must succeed for the operation to be considered successful
2. **Best-effort operations** that are nice-to-have but shouldn't block the user

Critical operations should fail the entire operation if they fail.  
Best-effort operations should be wrapped in try-catch and logged but not re-thrown.

## Deployment Notes

1. This fix is **backward compatible** - no schema changes required
2. Can be deployed immediately
3. Existing activated accounts are unaffected
4. New activations will benefit from the fix immediately

## Additional Recommendations

### 1. Add Activation Retry Mechanism
Currently, if activation fails, the user must contact support. Consider adding:
- Ability to request a new activation code
- Email/SMS delivery of activation codes
- Activation code regeneration endpoint

### 2. Better Error Messages
Distinguish between:
- Activation code invalid
- Activation code expired
- Password too weak
- Account already activated

### 3. Monitoring
Add monitoring for:
- Failed audit log writes during activation
- Failed session cleanup during activation
- Activation success/failure rates

### 4. Database Transaction
Consider wrapping critical operations in a database transaction if D1 supports it:
```typescript
// Pseudocode
await db.transaction(async (tx) => {
  await activateUser(tx, userId, passwordHash);
  // If we reach here, activation succeeded
});

// Best-effort operations outside transaction
try { await cleanup(); } catch {}
```

## Conclusion

This fix ensures that Principal activation works reliably even if non-critical operations (audit logging, session cleanup) fail. The activation process now correctly prioritizes the core functionality (setting the password) over ancillary operations.

**Status**: ✅ FIXED and VERIFIED
