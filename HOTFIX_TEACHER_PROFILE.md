# 🔥 Hotfix: Teacher Profile SQL Error

**Date**: January 19, 2026  
**Issue**: D1_ERROR: no such column: id at offset 322: SQLITE_ERROR  
**Severity**: 🔴 Critical - Blocking feature  
**Status**: ✅ FIXED & DEPLOYED

---

## Problem

When clicking on a teacher's profile, the system threw a SQL error:
```
D1_ERROR: no such column: id at offset 322: SQLITE_ERROR
```

**Root Cause**: The `teacher_profiles` table uses `user_id` as the primary key (no separate `id` column), but the `findByIdWithUser()` function in `teacher.repository.ts` was selecting `tp.user_id as profile_id` and then trying to access `result.profile_id` which doesn't exist after the query execution.

---

## Solution

Fixed the SQL query in `findByIdWithUser()` to properly map columns:

### Before (Broken):
```sql
SELECT 
  tp.user_id as profile_id,  -- ❌ Aliased but not used correctly
  tp.user_id,
  -- ... other columns
FROM teacher_profiles tp
INNER JOIN users u ON tp.user_id = u.id
WHERE tp.user_id = ? AND tp.school_id = ?
```

### After (Fixed):
```sql
SELECT 
  tp.user_id,  -- ✅ Simply select user_id
  tp.school_id,
  -- ... other columns
FROM teacher_profiles tp
INNER JOIN users u ON tp.user_id = u.id
WHERE tp.user_id = ? AND tp.school_id = ?
```

Then map `id: result.user_id` in the return object (since `id` field in TypeScript = `user_id` in database).

---

## Files Changed

1. `apps/api/src/accounts/teacher.repository.ts`
   - Fixed `findByIdWithUser()` query
   - Fixed `create()` return value to use `id: data.user_id`
   - Updated return object mapping

---

## Deployment

- **API Version**: e0a49d5c-8bdb-4c1d-aa43-c5049ccb5721
- **Deployed**: January 19, 2026
- **Build Time**: 8.48 sec
- **Status**: ✅ Live

---

## Testing

✅ **Verified**: Teacher profile page now loads without errors
✅ **Verified**: SQL query returns correct data
✅ **Verified**: No regressions in other teacher endpoints

---

## Related Issues

This is a schema mismatch issue where:
- Database: `teacher_profiles` has PRIMARY KEY on `user_id` (no `id` column)
- TypeScript: `TeacherProfile` interface has `id: string` field
- Solution: Always map `id: user_id` when querying

Other functions like `findById()`, `findByUserId()`, `findByEmployeeCode()` were already correctly using `SELECT user_id as id`.

---

## Prevention

Going forward:
1. ✅ Ensure all teacher queries use `user_id as id` alias
2. ✅ Document that `TeacherProfile.id === teacher_profiles.user_id`
3. 🔄 Consider adding database comments/documentation
4. 🔄 Add integration test for teacher profile endpoint

---

**Status**: ✅ **RESOLVED**
