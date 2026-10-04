# Timetable System - End-to-End Testing Guide

## Overview
Complete testing workflow for the professional timetable management system.

## Test Environment
- **API**: https://sms-api.nmvpmsms.workers.dev (Version: e9736a54-7424-4e61-94e1-1d4ac4cef0e6)
- **Frontend**: https://e71070c2.sms-web-34u.pages.dev

## Prerequisites
Before testing timetables, ensure the following data exists in your system:
1. ✅ At least one Academic Year with status = 'current'
2. ✅ At least one Classroom assigned to the current academic year
3. ✅ At least 2-3 Teachers with teaching assignments
4. ✅ At least 2-3 Subjects
5. ✅ Teaching assignments linking teachers to subjects and classrooms
6. ✅ At least one Student enrolled in a classroom

---

## Test Flow 1: Principal - Period Setup

### Step 1: Login as Principal
1. Navigate to the frontend URL
2. Login with principal credentials
3. Verify dashboard loads successfully

### Step 2: Navigate to Period Setup
1. Click on "Period Setup" in navigation or go to `/period-setup`
2. Verify page loads with current academic year selected

### Step 3: Initialize Default Periods
**If no periods exist:**
1. Click "Initialize Defaults" button
2. Verify 10 periods are created:
   - Period 1: 08:00-08:45
   - Period 2: 08:45-09:30
   - Period 3: 09:30-10:15
   - Period 4: 10:15-11:00 (Break)
   - Period 5: 11:00-11:45
   - Period 6: 11:45-12:30
   - Period 7: 12:30-13:15
   - Period 8: 13:15-14:00 (Break)
   - Period 9: 14:00-14:45
   - Period 10: 14:45-15:30

### Step 4: Edit Period Timing
1. Click edit icon on any period
2. Modify start_time, end_time, or label
3. Click "Save"
4. Verify changes are reflected immediately

### Step 5: Add Custom Period
1. Click "Add Period"
2. Fill in: Label, Start Time, End Time
3. Check/uncheck "Break" checkbox
4. Click "Add"
5. Verify new period appears in the list

### Step 6: Delete Period
1. Click delete icon on a period
2. Confirm deletion
3. Verify period is removed from list

**Expected Results:**
- ✅ Periods can be initialized with defaults
- ✅ Periods can be added, edited, and deleted
- ✅ Break periods are visually distinct (yellow background)
- ✅ Changes persist after page reload

---

## Test Flow 2: Principal - Create Timetable

### Step 1: Navigate to Timetable List
1. Go to `/timetable`
2. Verify list shows existing timetables (if any)

### Step 2: Create New Timetable
1. Click "Create Timetable" button
2. Fill in form:
   - Name: "Grade 10A - Semester 1"
   - Select Classroom: Choose a classroom with teaching assignments
   - Academic Year: Auto-selected (current year)
   - Status: Draft
3. Click "Create Timetable"
4. Verify redirect to Timetable Builder (`/timetable/builder/:id`)

### Step 3: Use Timetable Builder
**Grid Layout:**
- Rows: Days (Monday - Saturday)
- Columns: Periods (from Period Setup)
- Each cell contains 2 dropdowns: Subject + Teacher

**Assign Classes:**
1. **Monday, Period 1:**
   - Select Subject: "Mathematics"
   - Select Teacher: Only teachers assigned to (Classroom, Mathematics) appear
   - Verify selection saves (blue highlight)

2. **Monday, Period 2:**
   - Select Subject: "English"
   - Select Teacher: Choose from validated list
   
3. **Continue for multiple periods across different days**

4. **Test Clash Detection:**
   - Try to assign the same teacher to two different classrooms at Monday Period 1
   - Expected: Clash warning appears in red
   - Note: This checks teacher availability across all published timetables

### Step 4: Save Timetable
1. Click "Save" button (top-right)
2. Verify success message
3. Verify all entries are saved (refresh and check they persist)

### Step 5: Publish Timetable
1. Click "Publish" button
2. Confirm publication
3. Verify status changes from "Draft" to "Published"
4. Verify timetable becomes visible to teachers and students

**Expected Results:**
- ✅ Timetable form creates draft timetable
- ✅ Builder loads with Days × Periods grid
- ✅ Subject dropdown shows all subjects
- ✅ Teacher dropdown shows only valid teachers (teaching assignments)
- ✅ Clash detection warns about teacher conflicts
- ✅ Save persists all entries
- ✅ Publish makes timetable active
- ✅ Published timetables become immutable (cannot edit)

---

## Test Flow 3: Teacher - View My Timetable

### Step 1: Login as Teacher
1. Logout from principal account
2. Login with teacher credentials (a teacher assigned in the timetable)

### Step 2: Navigate to My Timetable
1. Go to `/teacher/timetable`
2. Verify page loads successfully

### Step 3: Verify Personalized Schedule
**Summary Stats:**
- Total classes per week (count)
- Number of unique subjects taught
- Number of unique classrooms

**Grid View:**
- Days where teacher has classes
- Only periods where teacher is assigned
- Each cell shows:
  - Subject name
  - Classroom name
  - Time slot (if period timings exist)

### Step 4: Verify Data Accuracy
1. Cross-reference with timetable created by principal
2. Verify only this teacher's classes appear
3. Verify classroom names are correct
4. Verify timings match period setup

**Expected Results:**
- ✅ Teacher sees only their assigned classes
- ✅ Summary stats are accurate
- ✅ Grid shows only days with classes
- ✅ Free periods show "Free" indicator
- ✅ Data matches principal's timetable

---

## Test Flow 4: Student - View Class Timetable

### Step 1: Login as Student
1. Logout from teacher account
2. Login with student credentials (enrolled in a classroom)

### Step 2: Navigate to Class Timetable
1. Go to `/student/timetable`
2. Verify page loads successfully

### Step 3: Verify Complete Class Schedule
**Summary Stats:**
- Total periods per week
- Number of subjects
- Number of teachers

**Grid View:**
- All days with classes
- All periods in the school day
- Each cell shows:
  - Subject name
  - Teacher name (not just classroom)
  - Time slot

### Step 4: Verify Data Accuracy
1. Cross-reference with principal's timetable for this classroom
2. Verify all subjects appear
3. Verify all teacher names are correct
4. Verify timings match period setup

**Expected Results:**
- ✅ Student sees complete classroom schedule
- ✅ Summary stats are accurate
- ✅ All periods visible (including free periods)
- ✅ Teacher names displayed for each subject
- ✅ Data matches principal's timetable

---

## Test Flow 5: Validation & Error Handling

### Clash Detection Tests

**Test 1: Teacher Double-Booking**
1. As principal, create two timetables for different classrooms
2. Publish first timetable with Teacher A at Monday Period 1
3. In second timetable, try to assign Teacher A to Monday Period 1
4. Expected: Clash warning in builder UI
5. Expected: API returns 409 error if attempted to save

**Test 2: Classroom Double-Booking**
1. Try to create overlapping entries for same classroom
2. Expected: Validation prevents this

**Test 3: Invalid Teaching Assignment**
1. Try to assign a teacher to a subject they're not assigned to teach
2. Expected: Teacher doesn't appear in dropdown (UI prevention)
3. Expected: API returns 400 error if forced via API

### Edge Cases

**Test 1: No Period Timings**
1. Delete all periods from Period Setup
2. Try to create timetable
3. Expected: Builder shows warning and redirects to Period Setup

**Test 2: No Teaching Assignments**
1. Create classroom with no teaching assignments
2. Try to build timetable
3. Expected: Teacher dropdowns are empty

**Test 3: Student Not Enrolled**
1. Login as student with no active enrollment
2. Navigate to timetable
3. Expected: "No Timetable Available" message

**Test 4: Teacher with No Assignments**
1. Login as teacher with no teaching assignments
2. Navigate to timetable
3. Expected: "No Classes Scheduled" message

### Data Integrity Tests

**Test 1: Academic Year Changes**
1. Create timetable for current year
2. Change academic year status
3. Verify correct timetable displays for each year

**Test 2: Draft vs Published**
1. Verify draft timetables only visible to principals
2. Verify published timetables visible to all roles
3. Verify archived timetables hidden from students/teachers

---

## API Endpoint Testing

### Period Timings API
```bash
# List periods
GET /period-timings?academic_year_id={id}

# Initialize defaults
POST /period-timings/initialize
Body: { "academic_year_id": "..." }

# Create period
POST /period-timings
Body: { "academic_year_id": "...", "period_no": 1, "start_time": "08:00", "end_time": "08:45", "label": "Period 1" }

# Update period
PATCH /period-timings/:id
Body: { "start_time": "08:10", "end_time": "08:55" }

# Delete period
DELETE /period-timings/:id
```

### Timetable API
```bash
# Create timetable
POST /timetables
Body: { "name": "...", "classroom_id": "...", "academic_year_id": "..." }

# Get timetable
GET /timetables/:id

# Create entry
POST /timetables/:id/entries
Body: { "day_of_week": 1, "period_no": 1, "subject_id": "...", "teacher_id": "..." }

# Update entry
PUT /timetables/:id/entries/:entryId
Body: { "subject_id": "...", "teacher_id": "..." }

# Publish timetable
POST /timetables/:id/publish

# Get my timetable (teacher/student)
GET /timetables/me/timetable
```

---

## Success Criteria

### ✅ Principal Flow
- [ ] Can initialize default periods (10 periods)
- [ ] Can add/edit/delete custom periods
- [ ] Can create draft timetable
- [ ] Can use visual builder to assign classes
- [ ] Teacher dropdowns show only valid assignments
- [ ] Clash warnings appear for conflicts
- [ ] Can save timetable entries
- [ ] Can publish timetable
- [ ] Published timetables become read-only

### ✅ Teacher Flow
- [ ] Can view personalized schedule
- [ ] Sees only assigned classes
- [ ] Summary stats are accurate
- [ ] Grid shows correct subjects and classrooms
- [ ] Period timings display correctly

### ✅ Student Flow
- [ ] Can view complete class timetable
- [ ] Sees all subjects and teachers
- [ ] Summary stats are accurate
- [ ] Grid shows full week schedule
- [ ] Period timings display correctly

### ✅ Data Integrity
- [ ] Clash detection prevents double-booking
- [ ] Teaching assignments enforced
- [ ] Draft vs published permissions work
- [ ] Academic year filtering works
- [ ] Data persists correctly

---

## Known Limitations

1. **Break periods** are defined but not rendered in builder grid (only teaching periods shown)
2. **Classroom conflicts** only checked within same timetable (not across timetables)
3. **Teacher conflicts** checked across all published timetables
4. **Period timings** must be set up before creating timetables
5. **Published timetables** cannot be edited (must archive and create new version)

---

## Troubleshooting

### Issue: Teacher dropdown is empty
- **Cause**: No teaching assignments exist for (classroom, subject) combination
- **Fix**: Create teaching assignments in Teaching Assignments section

### Issue: Clash warning appears but shouldn't
- **Cause**: Teacher already assigned at this time in another published timetable
- **Fix**: Check other published timetables, may need to unpublish or reassign

### Issue: Student sees "No Timetable Available"
- **Cause**: Student not enrolled OR no published timetable exists for their classroom
- **Fix**: Ensure enrollment is active and timetable is published

### Issue: Period timings don't appear
- **Cause**: No periods defined for current academic year
- **Fix**: Go to Period Setup and initialize defaults

---

## Report Issues

If any test fails, document:
1. Test step that failed
2. Expected result
3. Actual result
4. Screenshots if UI issue
5. API response if backend issue
6. Browser console errors if frontend issue

---

**Last Updated**: Task #10 - End-to-end testing guide created
**System Version**: API v e9736a54, Frontend v e71070c2
