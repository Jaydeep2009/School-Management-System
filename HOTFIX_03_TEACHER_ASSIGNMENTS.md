# 🔥 Hotfix #3: Teacher Assignments SQL Error

**Date**: January 19, 2026  
**Issue**: 500 Internal Server Error on `/teachers/:id/assignments`  
**Severity**: 🔴 Critical - Blocking teacher dashboard  
**Status**: ✅ FIXED & DEPLOYED

---

## Problem

When loading the teacher dashboard, the system tried to fetch teaching assignments and got a 500 error:

```
GET https://sms-api.nmvpmsms.workers.dev/teachers/90351ed2d2546ac691ee81dbeeb655e2/assignments
500 (Internal Server Error)
```

**Root Cause**: SQL query was trying to join `teaching_assignments` with `academic_years` on a non-existent `ta.academic_year_id` column.

```sql
-- ❌ WRONG (teaching_assignments has no academic_year_id)
FROM teaching_assignments ta
INNER JOIN academic_years ay ON ta.academic_year_id = ay.id
```

---

## Database Schema

The `teaching_assignments` table structure:
```sql
CREATE TABLE teaching_assignments (
  id TEXT PRIMARY KEY,
  school_id TEXT NOT NULL,
  classroom_id TEXT NOT NULL,  -- ← Links to classroom
  subject_id TEXT NOT NULL,
  teacher_id TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  -- NO academic_year_id column!
);
```

The academic year is determined through the **classroom relationship**:
```
teaching_assignment → classroom → academic_year
```

---

## Solution

Fixed the SQL query to join `academic_years` through `classrooms`:

### Before (Broken):
```sql
SELECT 
  ta.id as assignment_id,
  ...
  ta.academic_year_id,  -- ❌ Column doesn't exist!
  ay.label as academic_year
FROM teaching_assignments ta
INNER JOIN subjects s ON ta.subject_id = s.id
INNER JOIN classrooms c ON ta.classroom_id = c.id
INNER JOIN academic_years ay ON ta.academic_year_id = ay.id  -- ❌ Wrong join!
WHERE ta.teacher_id = ? AND ta.school_id = ?
```

### After (Fixed):
```sql
SELECT 
  ta.id as assignment_id,
  ...
  c.academic_year_id,  -- ✅ Get from classroom
  ay.label as academic_year
FROM teaching_assignments ta
INNER JOIN subjects s ON ta.subject_id = s.id
INNER JOIN classrooms c ON ta.classroom_id = c.id
INNER JOIN academic_years ay ON c.academic_year_id = ay.id  -- ✅ Join through classroom!
WHERE ta.teacher_id = ? AND ta.school_id = ?
```

---

## Files Changed

1. `apps/api/src/accounts/teacher.routes.ts`
   - Fixed `GET /:id/assignments` endpoint
   - Changed join from `ta.academic_year_id` to `c.academic_year_id`
   - Query now works correctly

---

## Deployment

- **API Version**: ee318d8b-f55a-4130-9f4a-de222f9eb4f2
- **Deployed**: January 19, 2026
- **Build Time**: 9.32 sec
- **Status**: ✅ Live

---

## Testing

✅ **Verified**: Teacher dashboard loads without errors  
✅ **Verified**: Teaching assignments query returns correct data  
✅ **Verified**: Academic year information included correctly

---

## Impact

**Before**: Teacher dashboard wouldn't load (500 error)  
**After**: Dashboard loads correctly, shows teaching assignments and class teacher info

---

## Related Tables

This highlights the database relationships:
```
teaching_assignments (has no academic_year_id)
  ├─ classroom_id → classrooms
  │                   └─ academic_year_id → academic_years
  ├─ subject_id → subjects
  └─ teacher_id → teacher_profiles
```

---

## Prevention

Going forward:
1. ✅ Review all queries that join teaching_assignments
2. ✅ Document that academic year comes from classroom
3. 🔄 Add ERD diagram to documentation
4. 🔄 Add integration test for teacher assignments endpoint

---

**Status**: ✅ **RESOLVED**  
**Rollback**: Previous version (e67bab3b) available if needed
