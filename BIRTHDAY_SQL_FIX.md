# Birthday API SQL Column Fix

## Issue
Birthday endpoint was returning 500 error:
```
D1_ERROR: no such column: c.code at offset 176: SQLITE_ERROR
```

Also, class teachers couldn't see student birthdays from their assigned classes.

## Root Cause
1. SQL queries in `apps/api/src/profiles/profiles.repository.ts` were referencing `c.code` for classroom code, but the actual database column name is `c.classroom_code`.
2. The `/birthdays/upcoming` endpoint was trying to fetch teacher birthdays for all users, which failed for teachers since they don't have permission to view teacher birthdays.

## Database Schema
From `apps/api/migrations/0001_init.sql`:
```sql
CREATE TABLE classrooms (
  id TEXT PRIMARY KEY,
  school_id TEXT NOT NULL,
  academic_year_id TEXT NOT NULL,
  classroom_code TEXT NOT NULL,  -- ✅ Correct column name
  grade_name TEXT NOT NULL,
  division_name TEXT NOT NULL,
  ...
)
```

## Fixes Applied

### 1. Fixed 4 SQL queries in `profiles.repository.ts`:

1. **findCurrentEnrollment** (line 262)
   - Changed: `c.code as classroom_code`
   - To: `c.classroom_code as classroom_code`

2. **findHistoricalEnrollments** (line 298)
   - Changed: `c.code as classroom_code`
   - To: `c.classroom_code as classroom_code`

3. **findStudentBirthdays** (line 390)
   - Changed: `c.code as classroom_code`
   - To: `c.classroom_code as classroom_code`

4. **findStudentBirthdaysInMonth** (line 438)
   - Changed: `c.code as classroom_code`
   - To: `c.classroom_code as classroom_code`

### 2. Fixed role-based birthday access in `profiles.routes.ts`:

Updated `/birthdays/upcoming` endpoint to handle different roles:
- **Principals**: Can see both teacher AND student birthdays
- **Teachers**: Can see only student birthdays from their assigned classes
- **Students**: Cannot view birthdays

This allows class teachers to see upcoming birthdays for students in their class without exposing teacher birthdays.

## Cleanup
Also removed temporary debug logging and authorization bypass that were added during troubleshooting.

## Deployment
✅ API deployed successfully
- Version: `bf2c11e1-92aa-4a7e-9767-f1a78e95ba18`
- URL: https://sms-api.nmvpmsms.workers.dev
- Status: All birthday endpoints now working

## Testing
Test the fix by refreshing the dashboard:

### As Principal:
1. Birthday widget loads without 500 errors
2. Upcoming birthdays display for both teachers and students
3. Classroom info shows correctly for students

### As Class Teacher:
1. Birthday widget loads without errors
2. Only student birthdays from your assigned class(es) are visible
3. Teacher birthdays are not shown (principal-only feature)
4. Classroom info displays correctly

## Files Modified
- `apps/api/src/profiles/profiles.repository.ts` - Fixed 4 SQL column references
- `apps/api/src/profiles/profiles.routes.ts` - Added role-based birthday filtering, removed debug logging
- `apps/api/src/profiles/profiles.authorization.ts` - Restored proper authorization

## Authorization Flow
```
GET /profiles/birthdays/upcoming
├─ Principal
│  ├─ Fetch teacher birthdays ✅
│  └─ Fetch student birthdays ✅
├─ Teacher (Class Teacher)
│  ├─ Skip teacher birthdays (not allowed)
│  └─ Fetch student birthdays from assigned classes ✅
└─ Student
   └─ Return 403 Forbidden ❌
```

## Related Files
- See: `BIRTHDAY_PIPELINE_COMPLETE.md` - Full birthday feature overview
- See: `BIRTHDAY_API_FIX.md` - Previous routing fixes
