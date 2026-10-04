# Avatar Undefined Name Error Fix

## Issue
Application was crashing with error:
```
TypeError: Cannot read properties of undefined (reading 'split')
    at getInitials (utils.ts:40:6)
    at Avatar (Avatar.tsx:16:20)
```

## Root Cause
Multiple issues:
1. **`getInitials` utility**: Called `.split()` on potentially undefined name string
2. **Avatar component**: Required `name` prop but received undefined values
3. **TeacherDashboard**: Called `user.loginId.split('_')` without checking if `loginId` exists

## Fixes Applied

### 1. Made `getInitials` defensive (utils.ts)
```tsx
// Before
export function getInitials(name: string): string {
  return name.split(' ')...  // ❌ Crashes if name is undefined
}

// After
export function getInitials(name: string): string {
  if (!name) return '??';  // ✅ Safe fallback
  return name.split(' ')...
}
```

### 2. Made Avatar name optional with default (Avatar.tsx)
```tsx
// Before
interface AvatarProps {
  name: string;  // ❌ Required, can receive undefined
  ...
}
export function Avatar({ name, ... }: AvatarProps) {

// After
interface AvatarProps {
  name?: string;  // ✅ Optional
  ...
}
export function Avatar({ name = 'User', ... }: AvatarProps) {  // ✅ Default value
```

### 3. Added optional chaining in TeacherDashboard
```tsx
// Before
Welcome back, {user.loginId.split('_')[0] || 'Teacher'}!  // ❌ Crashes if undefined

// After
Welcome back, {user.loginId?.split('_')[0] || 'Teacher'}!  // ✅ Safe with ?.
```

## Why This Happened
The `user` object from the auth context might not have `loginId` populated in certain states (e.g., during initial load, after certain auth flows, or with different user types).

## Deployment
✅ Frontend deployed successfully
- **URL**: https://5651046d.sms-web-34u.pages.dev
- **Status**: Error fixed, app no longer crashes

## Testing
1. ✅ Navigate to any page as any user role
2. ✅ Sidebar avatar displays correctly
3. ✅ No crash on undefined loginId
4. ✅ Fallback initials show "??" for missing names
5. ✅ Default "User" name when completely undefined

## Files Modified
- `apps/web/src/lib/utils.ts` - Added null check in `getInitials()`
- `apps/web/src/components/ui/Avatar.tsx` - Made name optional with default
- `apps/web/src/pages/TeacherDashboard.tsx` - Added optional chaining for loginId

## Best Practices Applied
1. **Defensive programming**: Always check for undefined/null before string operations
2. **Optional chaining**: Use `?.` operator for potentially undefined properties
3. **Default parameters**: Provide sensible defaults for optional props
4. **Fallback values**: Use `||` operator to provide fallback values

## Related Issues
This same pattern should be checked throughout the codebase wherever:
- `user.loginId` is accessed
- String operations like `.split()`, `.substring()`, etc. are performed
- Required props might receive undefined values
