# Current Academic Year Feature

## Overview
Implemented a manual control system for setting which academic year's data is displayed to all users (students, teachers, principal). This gives the principal complete control over when to switch academic years.

## How It Works

### For Principal:
1. Go to **Academic Structure** page
2. Click on **Academic Years** tab
3. Click **"Set as Current"** button on any academic year
4. Confirm the action
5. That year immediately becomes the current year for **everyone**

### For Students:
- Students always see data from the **current academic year** set by the principal
- Data includes:
  - Profile and enrollment info (classroom, roll number)
  - Attendance records
  - Published marks
  - Assignments
  - Fee information

### For Teachers:
- Teachers see their teaching assignments from the **current academic year**
- This includes:
  - Classes they teach
  - Subjects assigned to them
  - Class teacher status
  - Today's classes and attendance
- When principal switches year, teachers automatically see their assignments for that year

### For Staff & Principal:
- Similar logic applies - all data is filtered by current academic year

## Technical Implementation

### API Changes:

#### New Endpoint:
```
POST /academic-years/:id/set-current
```
- Sets the specified academic year as current
- Automatically closes any existing current year
- Uses atomic batch operation to ensure consistency

#### Modified Service:
- `apps/api/src/academic/academic-year.service.ts`
  - Added `setAsCurrent()` function
  - Uses D1 batch operations for atomicity

#### Modified Student Endpoints:
- `apps/api/src/students/student-me.routes.ts`
  - All endpoints now query for `academic_years.status = 'current'`
  - Changed from `enrollments.status = 'active'` to academic year-based filtering
  - Endpoints affected:
    - GET `/students/me` (profile)
    - GET `/students/me/attendance`
    - GET `/students/me/marks`
    - GET `/students/me/assignments`
    - GET `/students/me/fees`

#### Modified Teacher Endpoints:
- `apps/api/src/academic/teaching-assignment.routes.ts`
  - GET `/teaching-assignments/me/teaching` now filters by current academic year
  - Class teacher assignments also filtered by current year
  - Teachers see only their current year's classes

### Frontend Changes:

#### Academic Structure Page:
- Added **"Set as Current"** button for each academic year
- Button shows **"✓ Current Year"** in green when that year is current
- Confirmation dialog before changing current year

#### Teacher Dashboard:
- Removed client-side academic year filtering
- Backend now handles it automatically

#### API Service:
- Added `setCurrentAcademicYear(id)` method

## Key Benefits:

1. **Manual Control**: Principal decides exactly when to switch academic years
2. **Instant Switching**: All users see new year's data immediately
3. **No Reliance on Enrollment Status**: System doesn't depend on enrollment being marked active/completed
4. **Historical Access**: Principal can temporarily set an old year as current to view historical data
5. **Promotion Independence**: Student promotions and academic year switching are now separate operations
6. **Teacher Continuity**: Teachers see correct classes for each year without manual changes

## Usage Workflow:

### Scenario 1: New Academic Year Starts
1. Principal creates 2026-27 academic year (status: upcoming)
2. Principal promotes all students from 2025-26 to 2026-27
3. Principal creates teaching assignments for 2026-27
4. Students and teachers still see 2025-26 data (because it's still current)
5. When principal is ready: Click "Set as Current" on 2026-27
6. **Instantly**:
   - All students see 2026-27 classroom and data
   - All teachers see 2026-27 teaching assignments
   - All dashboards update automatically

### Scenario 2: View Historical Data
1. Principal wants to check 2024-25 records
2. Click "Set as Current" on 2024-25
3. Check whatever data needed (students see old classes, teachers see old assignments)
4. Click "Set as Current" back on 2026-27
5. System returns to normal operation

### Scenario 3: Teacher Assignments
- Teacher "Mr. Smith" teaches Math for Class 10A in 2025-26
- After promotion, he teaches Math for Class 11A in 2026-27
- When 2026-27 is set as current, his dashboard shows Class 11A
- He can take attendance, upload marks for the correct class automatically

## Database Schema:
No schema changes needed. Uses existing `academic_years.status` column:
- `upcoming` - future year
- `current` - currently active year (only one at a time)
- `closed` - past year
- `archived` - old year

## Deployments:
- **API**: https://sms-api.nmvpmsms.workers.dev (Version: 3e8a525c-e2ba-47c4-b10f-c39dbc889de5)
- **Frontend**: https://82450241.sms-web-34u.pages.dev

## Important Notes:

1. **Only One Current Year**: System enforces only one academic year can be current at a time
2. **Atomic Operations**: Uses D1 batch to ensure old year is closed and new year is set atomically
3. **No Data Loss**: Changing current year doesn't delete or modify any data, just changes what's visible
4. **Audit Trail**: All "set as current" actions are logged in audit_log
5. **Teaching Assignments**: Must be created for each academic year (teachers need assignments in the new year)

## Next Steps:
- You should still run the cleanup SQL to fix the 21 students with duplicate enrollments
- Create teaching assignments for teachers in 2026-27
- Test by setting 2026-27 as current and verifying:
  - Students see their new classrooms (e.g., 11A instead of 10A)
  - Teachers see their new teaching assignments
  - All data is from the correct year
