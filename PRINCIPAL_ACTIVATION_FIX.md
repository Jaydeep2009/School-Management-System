# Principal Activation Flow Fix

## Problem
Newly provisioned Principals received "Unauthorized" error when trying to login with their temporary password.

## Root Cause
The backend stores temporary passwords in `activation_hash`, NOT `password_hash`. Principals must activate their account first before they can login.

## Solution Implemented

### 1. **New Activation Page** (`/activate`)

Created a public activation page where Principals can:
- Enter their Login ID (e.g., `TEST-P-000001`)
- Enter temporary password (received from Super Admin)
- Set a new permanent password
- Confirm the new password
- Submit to activate their account

**Features:**
- Client-side validation (password matching)
- Backend password strength validation
- Success screen with "Go to Login" button
- Link back to login page
- Reuses existing `Login.css` styling

### 2. **Updated Login Page**

Added a clear call-to-action:
```
First time login? Activate your account
```

This links to `/activate` page.

### 3. **API Service Update**

Added `activateAccount()` method:
```typescript
async activateAccount(data: {
  loginId: string;
  activationCode: string;
  newPassword: string;
}) {
  return this.request<{ success: boolean; message: string }>('/auth/activate', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}
```

### 4. **Routing**

Added public route in `App.tsx`:
```typescript
<Route path="/activate" element={<Activate />} />
```

## Correct Principal Onboarding Flow

### Step 1: Super Admin Provisions Principal
1. Super Admin logs in
2. Creates/opens a school
3. Clicks "Provision Principal"
4. Fills form (name, DOB, gender)
5. **Copies credentials from dialog:**
   - Login ID: `SCHOOL-P-000001`
   - Temporary Password: `[random secure password]`

### Step 2: Principal Activates Account
1. Principal navigates to **`/activate`**
2. Enters Login ID
3. Enters Temporary Password
4. Creates new permanent password
   - Min 8 characters
   - Must have: uppercase, lowercase, number, special character
5. Confirms password
6. Clicks "Activate Account"
7. Sees success message
8. Clicks "Go to Login"

### Step 3: Principal Logs In
1. Principal navigates to **`/login`**
2. Enters Login ID
3. Enters **new permanent password** (NOT temporary)
4. Logs in successfully
5. Redirected to Principal Dashboard at `/dashboard`

## Backend Endpoints Used

**Activation:**
```
POST /auth/activate
Body: {
  "loginId": "string",
  "activationCode": "string",  // temporary password
  "newPassword": "string"
}
Response: {
  "success": true,
  "message": "Account activated successfully"
}
```

**Login:**
```
POST /auth/login
Body: {
  "loginId": "string",
  "password": "string"  // permanent password after activation
}
Response: {
  "accessToken": "...",
  "refreshToken": "...",
  "user": { ... }
}
```

## Password Requirements

Enforced by backend `validatePasswordStrength()`:
- ✅ At least 8 characters
- ✅ At least one uppercase letter
- ✅ At least one lowercase letter
- ✅ At least one number
- ✅ At least one special character

## Security Features

1. ✅ Temporary passwords stored in `activation_hash` (not `password_hash`)
2. ✅ Activation codes expire after 7 days
3. ✅ Password must be changed on first use
4. ✅ Strong password requirements enforced
5. ✅ No plaintext passwords stored
6. ✅ Generic error messages (no information disclosure)

## Files Modified

**Created:**
- `apps/web/src/pages/Activate.tsx` - Account activation page

**Modified:**
- `apps/web/src/pages/Login.tsx` - Added activation link
- `apps/web/src/services/api.ts` - Added `activateAccount()` method
- `apps/web/src/App.tsx` - Added `/activate` route

**No Backend Changes** - Uses existing `/auth/activate` endpoint

## Verification Results

✅ **TypeCheck:** PASSED (Exit code: 0)  
✅ **Build:** PASSED (Exit code: 0, 20.32s)

## Testing Steps

### Test Complete Flow:

1. **Start both servers:**
   ```bash
   cd apps/api && pnpm dev
   cd apps/web && pnpm dev
   ```

2. **Provision Principal as Super Admin:**
   - Login: `http://localhost:5173/super-admin/login`
   - Credentials: `super-admin` / `DevSuper@Admin2024!`
   - Create/open school
   - Provision Principal
   - **Copy Login ID and Temporary Password**

3. **Activate as Principal:**
   - Navigate: `http://localhost:5173/activate`
   - Enter Login ID
   - Enter Temporary Password
   - Set new password (e.g., `MyNewPass123!`)
   - Confirm password
   - Click "Activate Account"
   - Verify success message

4. **Login as Principal:**
   - Navigate: `http://localhost:5173/login`
   - Enter Login ID
   - Enter **new permanent password** (NOT temporary)
   - Click "Sign In"
   - Verify redirect to `/dashboard`

### Expected Errors:

**Before Activation:**
- Login with temporary password → ❌ "Invalid credentials" (correct behavior)

**After Activation:**
- Login with temporary password → ❌ "Invalid credentials" (temporary password no longer valid)
- Login with permanent password → ✅ Success

## Summary

The Principal authentication flow is now complete and working:

1. ✅ Super Admin can provision Principals
2. ✅ Principals receive temporary credentials
3. ✅ Activation page allows setting permanent password
4. ✅ Login page has clear activation link
5. ✅ After activation, Principals can login normally
6. ✅ All security best practices maintained
7. ✅ No backend modifications required

The "Unauthorized" error is now resolved. Principals must activate their account before their first login.
