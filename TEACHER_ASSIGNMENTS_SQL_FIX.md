# Teacher Assignments SQL Column Fix

## Issue
When clicking on a teacher's name to view their details, the app crashed with:
```
D1_ERROR: no such column: s.subject_name at offset 86: SQLITE_ERROR
GET /teachers/{teacherId}/assignments 500
```

## Root Cause
SQL query in `apps/api/src/accounts/teacher.routes.ts` was using incorrect column names:
- Used: `s.subject_name` 
- Correct: `s.name` (subjects table has column "name", not "subject_name")

Also in ORDER BY clause:
- Used: `s.subject_name`
- Correct: `s.name`

## Database Schema
From `apps/api/migrations/0001_init.sql`:
```sql
CREATE TABLE subjects (
  id TEXT PRIMARY KEY,
  school_id TEXT NOT NULL,
  subject_code TEXT NOT NULL,
  name TEXT NOT NULL,           -- ✅ Correct column name
  description TEXT,
  ...
)
```

## Fix Applied
**File**: `apps/api/src/accounts/teacher.routes.ts` (Line ~333)

**Before**:
```sql
SELECT 
  ta.id as assignment_id,
  ta.subject_id,
  s.subject_name,              -- ❌ Wrong
  s.subject_code,
  ...
ORDER BY ... s.subject_name    -- ❌ Wrong
```

**After**:
```sql
SELECT 
  ta.id as assignment_id,
  ta.subject_id,
  s.name as subject_name,      -- ✅ Correct (aliased for compatibility)
  s.subject_code,
  ...
ORDER BY ... s.name            -- ✅ Correct
```

## Deployment
✅ API deployed successfully
- **Version**: f3cf3f38-8547-45ea-ab0b-ff5053e0c79e
- **URL**: https://sms-api.nmvpmsms.workers.dev

## Testing
✅ Click on any teacher's name in the Teachers list
✅ Teacher detail page should load successfully
✅ Teaching assignments should display correctly
✅ Shows: subject name, classroom, academic year

## Impact
- Teachers list page now works completely
- Teacher detail view shows all teaching assignments
- No more 500 errors when viewing teacher details

## Related
Similar fixes were made earlier for:
- Birthday queries (c.code → c.classroom_code)
- Student profile queries

This type of issue occurs when SQL queries reference column names that don't match the actual database schema. Always verify column names against the migration files.
