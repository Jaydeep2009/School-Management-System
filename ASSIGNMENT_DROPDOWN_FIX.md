# Assignment Form Dropdown Fix

## Issues Fixed
1. ✅ Database error: `D1_ERROR: no such column: code`
2. ✅ Empty classroom dropdown
3. ✅ Empty subject dropdown
4. ✅ Wrong redirect after creating assignment

## Root Causes

### 1. Column Name Mismatches
Multiple queries were using `code` instead of the actual column names:
- `subjects` table has `subject_code` (not `code`)
- `classrooms` table has `classroom_code` (not `code`)

### 2. API Response Field Names
The API was returning different field names than the frontend expected:
- API returned `name`, frontend expected `classroom_name`
- API returned `name`, frontend expected `subject_name`

### 3. Route Mismatch
After creating assignment, was redirecting to `/assignments/:id` instead of `/teacher/assignments/:id`

## Changes Made

### Backend (API)

**apps/api/src/academic/classroom.repository.ts**
- Line 77: Changed `c.grade_name || ' ' || c.division_name as name` → `... as classroom_name`
- This makes the API return `classroom_name` which matches what the frontend expects

**apps/api/src/academic/subject.repository.ts**
- Line 44: Changed `SELECT id, school_id, subject_code, name, description...` → `... name as subject_name ...`
- This makes the API return `subject_name` which matches what the frontend expects

**apps/api/src/students/student-me.routes.ts**
- Line 163: `s.code` → `s.subject_code`
- Line 176: `GROUP BY ... s.code` → `... s.subject_code`
- Line 255: `s.code` → `s.subject_code`
- Line 371: `s.code` → `s.subject_code`

**apps/api/src/assignments/assignments.service.ts**
- Line 76: `SELECT id, school_id, code, name...` → `... subject_code ...`
- Updated TypeScript type accordingly

**apps/api/src/imports/imports.service.ts**
- Fixed 6 queries: Changed `AND code = ?` → `AND subject_code = ?` for subjects
- Fixed 2 queries: Changed `AND code = ?` → `AND classroom_code = ?` for classrooms

### Frontend (Web)

**apps/web/src/pages/AssignmentForm.tsx**
- Line 131: Changed `navigate('/assignments/${response.data.id}')` → `navigate('/teacher/assignments/${response.data.id}')`
- This fixes the redirect after creating an assignment

## Deployment

**API Version**: `0a6dddb5-afd1-422b-9e97-4414f3919a38`
**Frontend URL**: https://454cc6f2.sms-web-34u.pages.dev

## Testing

1. Navigate to: https://454cc6f2.sms-web-34u.pages.dev
2. Login as a teacher
3. Go to Assignments → Create Assignment
4. **Classroom dropdown** should now show classrooms (e.g., "Grade 10 A")
5. **Subject dropdown** should now show subjects (e.g., "Mathematics")
6. Fill in title, description, due date
7. Click "Create Assignment"
8. Should redirect to `/teacher/assignments/:id` (assignment detail page)

## Next Steps
1. Test complete assignment creation workflow
2. Add PDF upload functionality on assignment detail page
3. Test student view of assignments
