# Assignment Creation Fix - Database Schema Alignment

## Problem
Assignment creation form dropdowns were not loading, showing error:
```
D1_ERROR: no such column: code at offset 22: SQLITE_ERROR
```

## Root Cause
Multiple tables use specific column names, but queries were referencing generic `code` column:
- `subjects` table has `subject_code` (not `code`)
- `classrooms` table has `classroom_code` (not `code`)

## Database Schema
```sql
subjects table columns:
- id
- school_id
- subject_code  ← Correct column name
- name
- description
- status
- created_at
- updated_at

classrooms table columns:
- id
- school_id
- classroom_code  ← Correct column name
- grade_name
- division_name
- grade_level
- class_teacher_id
- academic_year_id
- status
- created_at
- updated_at
```

## Fixed Files

### 1. apps/api/src/students/student-me.routes.ts
- Line 163: Changed `s.code as subject_code` → `s.subject_code as subject_code`
- Line 176: Changed `GROUP BY s.id, s.name, s.code` → `GROUP BY s.id, s.name, s.subject_code`
- Line 255: Changed `s.code as subject_code` → `s.subject_code as subject_code`
- Line 371: Changed `s.code as subject_code` → `s.subject_code as subject_code`

### 2. apps/api/src/assignments/assignments.service.ts
- Line 76: Changed `SELECT id, school_id, code, name, status FROM subjects` → `SELECT id, school_id, subject_code, name, status FROM subjects`
- Updated TypeScript type: `code: string` → `subject_code: string`

### 3. apps/api/src/imports/imports.service.ts
- Line 317: Changed `SELECT id FROM subjects WHERE school_id = ? AND code = ?` → `... AND subject_code = ?`
- Line 464: Changed `SELECT id FROM subjects WHERE school_id = ? AND code = ?` → `... AND subject_code = ?`
- Line 591: Changed `SELECT id FROM classrooms WHERE school_id = ? AND code = ?` → `... AND classroom_code = ?`
- Line 793: Changed `SELECT id FROM classrooms WHERE school_id = ? AND code = ?` → `... AND classroom_code = ?`
- Line 944: Changed `SELECT id FROM subjects WHERE school_id = ? AND code = ?` → `... AND subject_code = ?`
- Line 1157: Changed `SELECT id FROM subjects WHERE school_id = ? AND code = ?` → `... AND subject_code = ?`
- Line 1371: Changed `SELECT id FROM subjects WHERE school_id = ? AND code = ?` → `... AND subject_code = ?`
- Line 1569: Changed `SELECT id FROM subjects WHERE school_id = ? AND code = ?` → `... AND subject_code = ?`

## Deployment
- **Latest API Version**: `4d89e37e-4a16-411e-8973-d346f6f1801a`
- Deployed: 2026-09-19
- URL: https://sms-api.nmvpmsms.workers.dev

## Testing

### Important: Clear Browser Cache!
The browser may be caching the old API responses. To test properly:

**Option 1: Hard Refresh**
- Windows/Linux: `Ctrl + Shift + R` or `Ctrl + F5`
- Mac: `Cmd + Shift + R`

**Option 2: Clear Cache in DevTools**
1. Open DevTools (F12)
2. Right-click the refresh button
3. Select "Empty Cache and Hard Reload"

**Option 3: Use Incognito/Private Window**
- Open a new incognito/private window
- Login again and test

### Test Steps
1. Clear cache using one of the methods above
2. Navigate to: Teacher Dashboard → Assignments → Create Assignment
3. Classroom dropdown should now load properly
4. Subject dropdown should now load properly
5. Form should submit successfully

## Next Steps
1. Test complete workflow: create assignment → upload PDF → publish
2. Verify student can view/download assignments
3. Test filtering by subject/classroom
