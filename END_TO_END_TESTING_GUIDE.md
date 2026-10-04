# 🧪 School Management System - End-to-End Testing Guide

## 📋 Table of Contents
1. [System Overview](#system-overview)
2. [Pre-Testing Setup](#pre-testing-setup)
3. [Authentication & User Management](#authentication--user-management)
4. [Academic Structure](#academic-structure)
5. [Teacher Features](#teacher-features)
6. [Student Features](#student-features)
7. [Birthday System](#birthday-system)
8. [Performance & Security](#performance--security)
9. [Common Issues & Troubleshooting](#common-issues--troubleshooting)

---

## System Overview

### Current Deployment
- **Frontend**: https://503355c0.sms-web-34u.pages.dev
- **API**: https://sms-api.nmvpmsms.workers.dev
- **Database**: Cloudflare D1 (sms-production-db)

### User Roles
1. **Principal** - Full system access
2. **Teacher** - Class teacher or subject teacher
3. **Student** - Self-service access

---

## Pre-Testing Setup

### ✅ Verify Deployment Status

```bash
# Check API is accessible
curl https://sms-api.nmvpmsms.workers.dev/health

# Expected: {"status":"healthy","timestamp":"..."}
```

### ✅ Test Database Connection

```bash
# List academic years
wrangler d1 execute sms-production-db --remote --command "SELECT id, label, status FROM academic_years LIMIT 5"

# Expected: Shows list of academic years with at least one 'current'
```

### ✅ Browser Setup

**Requirements**:
- Modern browser (Chrome, Firefox, Edge, Safari)
- JavaScript enabled
- Cookies enabled
- Developer console accessible (F12)

**Test Browsers**:
- ✅ Desktop Chrome/Edge
- ✅ Desktop Firefox
- ✅ Mobile Safari
- ✅ Mobile Chrome

---

## Authentication & User Management

### Test 1: Principal Login

**Objective**: Verify principal can login and access dashboard

**Steps**:
1. Navigate to https://503355c0.sms-web-34u.pages.dev
2. Click "Principal Login"
3. Enter credentials:
   - Email: `[principal_email]`
   - Password: `[principal_password]`
4. Click "Login"

**Expected Results**:
- ✅ Redirects to `/dashboard`
- ✅ Shows "Welcome, Principal" message
- ✅ Sidebar shows all menu items:
  - Dashboard
  - Students
  - Teachers
  - Academic Structure
  - Marks & Assessments
  - Assignments
  - Fees
  - Timetable
  - Promotions
  - Academic Years
  - Birthdays
  - Imports
  - Audit Logs
- ✅ Academic year dropdown shows years
- ✅ Top right shows principal name

**Error Cases**:
- ❌ Invalid email → "Invalid credentials"
- ❌ Wrong password → "Invalid credentials"
- ❌ Empty fields → "Email and password are required"

---

### Test 2: Teacher Login

**Objective**: Verify teacher can login with correct role detection

**Test 2.1: Class Teacher Login**

**Steps**:
1. Logout if logged in
2. Navigate to homepage
3. Click "Teacher Login"
4. Enter credentials:
   - Login ID: `6314-T-000002`
   - Password: `[teacher_password]`
5. Click "Login"

**Expected Results**:
- ✅ Redirects to `/teacher/dashboard`
- ✅ Shows "Welcome back, Teacher!"
- ✅ Sidebar shows teacher menu items:
  - Dashboard
  - My Students
  - Attendance
  - Marks
  - Assignments
  - Timetable
  - **Birthdays** ← Must be visible for class teachers
- ✅ Dashboard shows "Class Teacher" card with classroom info
- ✅ Shows "Upcoming Birthdays" widget if students have birthdays

**Test 2.2: Non-Class Teacher Login**

**Steps**:
1. Logout
2. Login as teacher WITHOUT class teacher assignment
3. Check sidebar

**Expected Results**:
- ✅ Sidebar does NOT show "Birthdays" menu
- ✅ Dashboard does NOT show "Class Teacher" card
- ✅ Dashboard does NOT show birthdays widget

---

### Test 3: Student Login

**Objective**: Verify student can login and access their data

**Steps**:
1. Logout
2. Navigate to homepage
3. Click "Student Login"
4. Enter credentials:
   - Login ID: `[student_login_id]`
   - Password: `[student_password]`
5. Click "Login"

**Expected Results**:
- ✅ Redirects to `/student/dashboard`
- ✅ Shows student name
- ✅ Sidebar shows student menu items:
  - Dashboard
  - My Attendance
  - My Marks
  - Assignments
  - Fees
  - My Profile
- ✅ No "Birthdays" menu (students can't view birthdays)

---

### Test 4: Session Management

**Objective**: Verify token expiry and session handling

**Test 4.1: Token Expiry**

**Steps**:
1. Login as any user
2. Wait 8 hours (for regular users) or 4 hours (for super admins)
3. Try to navigate or refresh page

**Expected Results**:
- ✅ Redirects to login page
- ✅ Shows "Session expired" message
- ✅ Token is cleared from localStorage

**Test 4.2: Logout**

**Steps**:
1. Login as any user
2. Click "Logout" button in sidebar

**Expected Results**:
- ✅ Redirects to login page
- ✅ Token is cleared
- ✅ Cannot access protected pages by typing URL

**Test 4.3: Concurrent Sessions**

**Steps**:
1. Login on Browser A
2. Login with same user on Browser B
3. Try to use session from Browser A

**Expected Results**:
- ✅ Both sessions work independently
- ✅ Each has its own token
- ✅ Logout in one doesn't affect the other

---

## Academic Structure

### Test 5: Academic Year Management

**Objective**: Verify academic year CRUD and status management

**Steps**:
1. Login as Principal
2. Navigate to "Academic Years"
3. Verify current year is visible and marked as "Current"
4. Click "Add Academic Year"
5. Fill form:
   - Label: "2026-27"
   - Start Date: Select future date
   - End Date: Select date after start
   - Status: "upcoming"
6. Click "Save"

**Expected Results**:
- ✅ New year appears in list
- ✅ Only ONE year can have status "current"
- ✅ Year dropdown in header updates
- ✅ Changing current year filters data across system

**Test Academic Year Filtering**:
1. Change academic year dropdown to different year
2. Navigate to Students page
3. Verify students filtered by selected year
4. Navigate to Teachers page
5. Verify teachers filtered by selected year

---

### Test 6: Classroom Management

**Objective**: Verify classroom CRUD operations

**Steps**:
1. Login as Principal
2. Navigate to "Academic Structure" → "Classrooms"
3. Click "Add Classroom"
4. Fill form:
   - Grade: "10"
   - Division: "A"
   - Class Teacher: Select from dropdown
   - Academic Year: Select current year
5. Click "Save"

**Expected Results**:
- ✅ Classroom appears in list as "10-A"
- ✅ Class teacher is assigned
- ✅ Can edit classroom details
- ✅ Can delete classroom (if no students enrolled)
- ✅ Cannot delete if students enrolled (shows error)

---

### Test 7: Subject Management

**Objective**: Verify subject CRUD operations

**Steps**:
1. Login as Principal
2. Navigate to "Academic Structure" → "Subjects"
3. Click "Add Subject"
4. Fill form:
   - Name: "Physics"
   - Subject Code: "PHY"
   - Status: "active"
5. Click "Save"

**Expected Results**:
- ✅ Subject appears in list
- ✅ Can edit subject
- ✅ Can deactivate subject
- ✅ Deactivated subjects don't show in teaching assignments

---

### Test 8: Teaching Assignments

**Objective**: Verify teacher-classroom-subject linking

**Steps**:
1. Login as Principal
2. Navigate to "Teachers"
3. Click on a teacher
4. Scroll to "Teaching Assignments" section
5. Click "Add Assignment"
6. Fill form:
   - Classroom: Select "10-A"
   - Subject: Select "Physics"
7. Click "Save"

**Expected Results**:
- ✅ Assignment appears in teacher's list
- ✅ Teacher can now see that classroom's students
- ✅ If teacher is class teacher of that classroom:
  - ✅ "Birthdays" menu appears in sidebar
  - ✅ Assignment shows "Class Teacher" badge
- ✅ Cannot create duplicate assignment (same classroom + subject)

---

## Teacher Features

### Test 9: Teacher Dashboard

**Objective**: Verify dashboard shows correct information

**Steps**:
1. Login as class teacher (`6314-T-000002`)
2. View dashboard

**Expected Results**:
- ✅ Shows teaching assignment count
- ✅ Shows pending attendance count
- ✅ Shows "Class Teacher" card with:
  - Classroom name (e.g., "11-A")
  - Student count
  - Quick action buttons (Attendance, Marks)
- ✅ Shows "Today's Classes" section:
  - Lists classes for today
  - Shows if attendance marked (green checkmark)
  - Shows "Mark Attendance" button if not marked
- ✅ Shows "My Teaching" section:
  - Lists all teaching assignments
  - Shows "Class Teacher" badge where applicable
- ✅ Shows "Upcoming Birthdays" widget (if class teacher):
  - Shows up to 5 upcoming birthdays
  - Shows days until birthday
  - Shows "View All Birthdays" button
- ✅ Shows "Last updated" timestamp
- ✅ Has "Refresh" button that works

**Test Dashboard Refresh**:
1. Click "Refresh" button
2. Verify:
   - ✅ Shows loading state
   - ✅ Updates timestamp
   - ✅ Reloads all data

---

### Test 10: My Students (Class Teacher)

**Objective**: Verify class teacher can view their students

**Steps**:
1. Login as class teacher
2. Navigate to "My Students"

**Expected Results**:
- ✅ Shows list of students in teacher's classroom
- ✅ Shows student details:
  - Name
  - Roll number
  - Student code
  - Email
  - Phone
  - Status
- ✅ Search functionality works
- ✅ Can filter by status (Active/Inactive)
- ✅ Click student opens detail view
- ✅ Can view student's attendance
- ✅ Can view student's marks

---

### Test 11: Attendance Taking

**Objective**: Verify teacher can mark attendance

**Test 11.1: Mark New Attendance**

**Steps**:
1. Login as teacher
2. Navigate to "Attendance"
3. Click "Take Attendance"
4. Select:
   - Classroom: "10-A"
   - Subject: "Physics"
   - Date: Today
5. Mark students as Present/Absent/Late
6. Click "Submit"

**Expected Results**:
- ✅ Attendance session created
- ✅ Shows success message
- ✅ Redirects to attendance list
- ✅ New session appears with "Marked" status
- ✅ Dashboard shows class as "Marked" (green checkmark)

**Test 11.2: View Attendance**

**Steps**:
1. Navigate to "Attendance"
2. Select filters (classroom, date range)
3. View list

**Expected Results**:
- ✅ Shows attendance sessions
- ✅ Shows date, classroom, subject
- ✅ Shows attendance summary (Present/Absent/Late counts)
- ✅ Can click to view details
- ✅ Can export to Excel

**Test 11.3: Edit Attendance**

**Steps**:
1. View attendance session
2. Click "Edit"
3. Change student status
4. Click "Update"

**Expected Results**:
- ✅ Attendance updated
- ✅ Shows success message
- ✅ Summary counts update

---

### Test 12: Marks Entry

**Objective**: Verify teacher can enter and manage marks

**Test 12.1: Create Assessment**

**Steps**:
1. Login as teacher
2. Navigate to "Marks"
3. Click "Create Assessment"
4. Fill form:
   - Name: "Mid-Term Exam"
   - Type: "Exam"
   - Total Marks: 100
   - Passing Marks: 40
   - Classroom: "10-A"
   - Subject: "Physics"
   - Date: Today
5. Click "Create"

**Expected Results**:
- ✅ Assessment created
- ✅ Shows in assessments list
- ✅ Shows "Not Published" status

**Test 12.2: Enter Marks**

**Steps**:
1. Click on assessment
2. Click "Enter Marks"
3. For each student, enter marks (0-100)
4. Click "Save"

**Expected Results**:
- ✅ Marks saved for each student
- ✅ Shows validation for marks > total marks
- ✅ Shows pass/fail status automatically
- ✅ Can save as draft and continue later

**Test 12.3: Publish Marks**

**Steps**:
1. View assessment with all marks entered
2. Click "Publish"
3. Confirm

**Expected Results**:
- ✅ Status changes to "Published"
- ✅ Students can now see their marks
- ✅ Cannot edit marks after publishing (must unpublish first)

---

## Birthday System

### Test 13: Birthday Visibility (Class Teacher)

**Objective**: Verify class teachers can view birthdays

**Pre-requisites**:
- Teacher must be assigned as class teacher of a classroom
- Classroom must have students with birthdates set
- Classroom's academic year must be "current"

**Steps**:
1. Login as class teacher (`6314-T-000002`)
2. Check sidebar

**Expected Results**:
- ✅ "Birthdays" menu item is visible
- ✅ Dashboard shows "Upcoming Birthdays" widget

**Steps**:
3. Click "Birthdays" in sidebar

**Expected Results**:
- ✅ Shows page title "Birthdays"
- ✅ Shows subtitle "Upcoming birthdays for teachers and students"
- ✅ Shows filter: "This Week" / "All"
- ✅ Shows list of students with birthdays
- ✅ Each entry shows:
  - Student name
  - Birthday date (e.g., "January 15")
  - Days until birthday (e.g., "In 15 days" or "Today!")
  - Classroom name
  - Cake icon 🎂

**Test Filter**:
1. Toggle between "This Week" and "All"
2. Verify:
   - ✅ "This Week" shows only birthdays within 7 days
   - ✅ "All" shows all birthdays, sorted by date

---

### Test 14: Birthday Visibility (Non-Class Teacher)

**Objective**: Verify regular teachers cannot view birthdays

**Steps**:
1. Logout
2. Login as teacher who is NOT a class teacher
3. Check sidebar

**Expected Results**:
- ❌ "Birthdays" menu item is NOT visible
- ❌ Dashboard does NOT show birthday widget
- ❌ Typing `/teacher/birthdays` URL manually shows error or redirects

---

### Test 15: Birthday Data Accuracy

**Objective**: Verify birthday data is correct

**Steps**:
1. Login as Principal
2. Navigate to Students
3. Note 3 students with different birth dates
4. Logout and login as class teacher of those students
5. Navigate to Birthdays page

**Expected Results**:
- ✅ All 3 students appear if birthdays are upcoming
- ✅ Birthday dates match student profiles
- ✅ "Days until" calculation is accurate
- ✅ Students are sorted by date (nearest first)

**Test Edge Cases**:

**Case 1: Birthday Today**
- Student with birthday today shows "Today!" ✅
- Highlighted with special styling (yellow background) ✅

**Case 2: Birthday Tomorrow**
- Shows "In 1 day" ✅

**Case 3: Birthday Already Passed**
- If filtering "This Week": doesn't show ✅
- If filtering "All": shows with future year calculation ✅

**Case 4: No Students with Birthdays Set**
- Shows "No upcoming birthdays" message ✅

---

### Test 16: Birthday System Integration

**Objective**: Verify birthday system works end-to-end

**Test Scenario**: New Teacher Assignment

**Steps**:
1. Login as Principal
2. Create new teacher account
3. Create new classroom "12-B"
4. Assign new teacher as class teacher of "12-B"
5. Enroll 5 students in "12-B" with various birthdates
6. Logout

7. Login as the new teacher
8. Check dashboard

**Expected Results**:
- ✅ "Birthdays" menu appears in sidebar (because they're a class teacher)
- ✅ Dashboard shows "Class Teacher" card for "12-B"
- ✅ Dashboard shows birthday widget with students from "12-B"
- ✅ Clicking "View All Birthdays" shows full list
- ✅ Only shows students from "12-B" (their class)
- ✅ Does NOT show students from other classrooms

**Test Scenario**: Remove Class Teacher Status

**Steps**:
1. Login as Principal
2. Edit classroom "12-B"
3. Change class teacher to different teacher
4. Logout

5. Login as original teacher (no longer class teacher)

**Expected Results**:
- ❌ "Birthdays" menu is NO LONGER visible
- ❌ Dashboard does NOT show "Class Teacher" card
- ❌ Dashboard does NOT show birthday widget

---

### Test 17: Birthday Performance

**Objective**: Verify birthday queries are performant

**Steps**:
1. Login as class teacher with large classroom (50+ students)
2. Navigate to Birthdays page
3. Measure load time (use browser DevTools Network tab)

**Expected Results**:
- ✅ Page loads in < 2 seconds
- ✅ API response time < 500ms
- ✅ No JavaScript errors in console
- ✅ Smooth filtering between "This Week" and "All"

---

## Student Features

### Test 18: Student Dashboard

**Objective**: Verify student can view their information

**Steps**:
1. Login as student
2. View dashboard

**Expected Results**:
- ✅ Shows student name and classroom
- ✅ Shows attendance summary (Present, Absent, Late percentages)
- ✅ Shows upcoming assignments
- ✅ Shows recent marks/grades
- ✅ Shows fee payment status

---

### Test 19: Student Attendance View

**Objective**: Verify student can view their attendance

**Steps**:
1. Login as student
2. Navigate to "My Attendance"

**Expected Results**:
- ✅ Shows attendance calendar or list
- ✅ Shows status for each day (Present/Absent/Late)
- ✅ Shows attendance percentage
- ✅ Can filter by date range
- ✅ Can export attendance report

---

### Test 20: Student Marks View

**Objective**: Verify student can view their marks

**Steps**:
1. Login as student
2. Navigate to "My Marks"

**Expected Results**:
- ✅ Shows list of published assessments only
- ✅ Shows marks obtained and total marks
- ✅ Shows pass/fail status
- ✅ Shows grade if applicable
- ✅ Cannot see unpublished marks
- ✅ Can filter by subject or date

---

## Performance & Security

### Test 21: Page Load Performance

**Objective**: Verify pages load quickly

**Test All Major Pages**:

| Page | Expected Load Time |
|------|-------------------|
| Login | < 1s |
| Dashboard (any role) | < 2s |
| Students List (100 students) | < 2s |
| Teachers List (50 teachers) | < 2s |
| Attendance Entry | < 1.5s |
| Marks Entry | < 2s |
| Birthdays | < 1s |

**Steps**:
1. Open browser DevTools (F12)
2. Go to Network tab
3. Navigate to page
4. Check "Load" time at bottom

**Expected Results**:
- ✅ All pages load within expected time
- ✅ No 404 errors in console
- ✅ No failed API requests
- ✅ Images load correctly

---

### Test 22: API Response Times

**Objective**: Verify API endpoints respond quickly

**Steps**:
1. Login as any user
2. Open browser DevTools
3. Go to Network tab
4. Filter by "Fetch/XHR"
5. Navigate through application
6. Check response times

**Expected Results**:

| Endpoint | Max Response Time |
|----------|------------------|
| /auth/login | 500ms |
| /students | 800ms |
| /teachers | 800ms |
| /teaching-assignments/me/teaching | 300ms |
| /profiles/birthdays/upcoming | 400ms |
| /attendance/sessions | 600ms |
| /marks/assessments | 600ms |

---

### Test 23: Security - Authorization

**Objective**: Verify role-based access control

**Test 23.1: Teacher Cannot Access Principal Features**

**Steps**:
1. Login as teacher
2. Try to manually navigate to:
   - `/students/new` (create student)
   - `/teachers/new` (create teacher)
   - `/academic-years` (manage years)

**Expected Results**:
- ❌ Access denied or redirects to teacher dashboard
- ❌ Shows error message "Unauthorized"

**Test 23.2: Student Cannot Access Teacher Features**

**Steps**:
1. Login as student
2. Try to navigate to:
   - `/teacher/dashboard`
   - `/teacher/attendance`
   - `/teacher/birthdays`

**Expected Results**:
- ❌ Access denied or redirects to student dashboard
- ❌ Shows error message

**Test 23.3: Unauthenticated Access**

**Steps**:
1. Logout (or open incognito window)
2. Try to navigate to protected routes

**Expected Results**:
- ❌ Redirects to login page
- ❌ Cannot access any protected data

---

### Test 24: Security - Data Isolation

**Objective**: Verify users only see their authorized data

**Test 24.1: Teacher Data Isolation**

**Steps**:
1. Login as Teacher A (class teacher of 10-A)
2. Note students visible
3. Logout
4. Login as Teacher B (class teacher of 10-B)
5. Compare students

**Expected Results**:
- ✅ Teacher A only sees students from 10-A
- ✅ Teacher B only sees students from 10-B
- ✅ No overlap unless teacher teaches both classes

**Test 24.2: Birthday Data Isolation**

**Steps**:
1. Login as Teacher A (class teacher of 10-A)
2. Go to Birthdays page
3. Note which students appear
4. Logout
5. Login as Teacher B (class teacher of 10-B)
6. Go to Birthdays page

**Expected Results**:
- ✅ Teacher A only sees birthdays from 10-A
- ✅ Teacher B only sees birthdays from 10-B
- ✅ No data leakage between classrooms

---

### Test 25: Input Validation

**Objective**: Verify forms validate input correctly

**Test Login Form**:
- ✅ Empty email → Error
- ✅ Invalid email format → Error
- ✅ Empty password → Error
- ✅ SQL injection attempt → Sanitized/blocked

**Test Student Creation**:
- ✅ Empty required fields → Error
- ✅ Invalid email format → Error
- ✅ Invalid phone format → Error
- ✅ Future birth date → Error
- ✅ XSS attempt in name field → Sanitized

**Test Marks Entry**:
- ✅ Marks > total marks → Error
- ✅ Negative marks → Error
- ✅ Non-numeric marks → Error
- ✅ Empty marks → Warning (can save as draft)

---

## Common Issues & Troubleshooting

### Issue 1: "Birthdays" Menu Not Showing

**Symptoms**:
- Teacher is logged in
- Teacher is class teacher
- Sidebar doesn't show "Birthdays" menu

**Diagnostic Steps**:

1. **Check if teacher is actually a class teacher**:
```javascript
// Run in browser console
fetch('https://sms-api.nmvpmsms.workers.dev/teaching-assignments/me/teaching', {
  headers: { 'Authorization': 'Bearer ' + localStorage.getItem('accessToken') }
})
.then(r => r.json())
.then(data => {
  console.log('Assignments:', data.data?.length);
  const isClassTeacher = data.data?.some(a => !!a.is_class_teacher);
  console.log('Is class teacher?', isClassTeacher);
});
```

Expected: `Is class teacher? true`

2. **Check if classroom has current academic year**:
```sql
-- Via wrangler CLI
wrangler d1 execute sms-production-db --remote --command "
SELECT c.classroom_code, ay.label, ay.status 
FROM classrooms c 
INNER JOIN academic_years ay ON c.academic_year_id = ay.id 
WHERE c.class_teacher_id = 'TEACHER_ID'
"
```

Expected: `status` should be `'current'`

3. **Check if students exist in classroom**:
```sql
wrangler d1 execute sms-production-db --remote --command "
SELECT COUNT(*) as student_count 
FROM enrollments 
WHERE classroom_id = 'CLASSROOM_ID'
"
```

Expected: `student_count > 0`

**Solutions**:
- ✅ Assign teacher as class teacher: Update `classrooms.class_teacher_id`
- ✅ Set academic year to current: `UPDATE academic_years SET status = 'current' WHERE id = 'YEAR_ID'`
- ✅ Add teaching assignment: Create entry in `teaching_assignments` table
- ✅ Hard refresh browser: Ctrl+F5

---

### Issue 2: No Birthdays Showing

**Symptoms**:
- "Birthdays" menu visible
- Birthday page loads but shows no students

**Diagnostic Steps**:

1. **Check if students have birthdates set**:
```sql
SELECT COUNT(*) as with_birthdays 
FROM student_profiles 
WHERE dob_md IS NOT NULL
```

2. **Check if birthdays are in the future**:
```sql
SELECT first_name, last_name, date_of_birth, dob_md 
FROM student_profiles 
WHERE dob_md >= strftime('%m-%d', 'now')
LIMIT 10
```

3. **Run full birthday query**:
```sql
SELECT sp.first_name, sp.last_name, sp.dob_md, c.classroom_code
FROM student_profiles sp
INNER JOIN enrollments e ON sp.user_id = e.student_id
INNER JOIN academic_years ay ON e.academic_year_id = ay.id
INNER JOIN classrooms c ON e.classroom_id = c.id
WHERE ay.status = 'current'
  AND sp.dob_md IS NOT NULL
  AND c.class_teacher_id = 'TEACHER_ID'
ORDER BY sp.dob_md
```

**Solutions**:
- ✅ Add birthdates to students
- ✅ Regenerate dob_md: `UPDATE student_profiles SET dob_md = strftime('%m-%d', date_of_birth)`
- ✅ Enroll students in current year classrooms

---

### Issue 3: "Session Expired" Error

**Symptoms**:
- User gets logged out unexpectedly
- "Session expired" message appears

**Causes**:
- Token expired (8 hours for users, 4 hours for super admins)
- Browser cleared localStorage
- Multiple tabs caused token conflict

**Solutions**:
- ✅ Login again
- ✅ Check token expiry time is reasonable
- ✅ Don't clear browser data during active session

---

### Issue 4: Data Not Loading

**Symptoms**:
- Page shows loading spinner indefinitely
- Error in console

**Diagnostic Steps**:

1. **Check browser console** (F12):
   - Look for errors (red text)
   - Note exact error message

2. **Check network requests**:
   - Go to Network tab
   - Look for failed requests (red status)
   - Check response

3. **Check API health**:
```bash
curl https://sms-api.nmvpmsms.workers.dev/health
```

**Common Solutions**:
- ✅ Hard refresh: Ctrl+F5
- ✅ Clear browser cache
- ✅ Check internet connection
- ✅ Verify API is deployed and running

---

### Issue 5: Academic Year Filter Not Working

**Symptoms**:
- Changing year dropdown doesn't filter data
- Shows data from all years

**Diagnostic Steps**:

1. **Check if selectedYear is set**:
```javascript
// In browser console
console.log('Selected year:', JSON.parse(localStorage.getItem('selectedAcademicYear') || 'null'));
```

2. **Check API request includes year filter**:
   - Open Network tab
   - Filter API request
   - Check query parameters

**Solutions**:
- ✅ Refresh page after changing year
- ✅ Ensure academic year context is loaded
- ✅ Verify data has `academic_year_id` field

---

## Performance Benchmarks

### Expected Metrics

| Metric | Target | Warning | Critical |
|--------|--------|---------|----------|
| Page Load Time | < 2s | 2-3s | > 3s |
| API Response | < 500ms | 500ms-1s | > 1s |
| Database Query | < 100ms | 100-300ms | > 300ms |
| First Contentful Paint | < 1s | 1-2s | > 2s |
| Time to Interactive | < 2s | 2-4s | > 4s |

### Load Testing

**Concurrent Users**:
- ✅ 10 users: No performance degradation
- ✅ 50 users: Response time < 2x normal
- ✅ 100 users: Response time < 3x normal
- ⚠️ 200+ users: May experience delays

---

## Test Report Template

### Test Execution Summary

**Date**: [Date]  
**Tester**: [Name]  
**Environment**: Production  
**Frontend URL**: https://503355c0.sms-web-34u.pages.dev  
**API URL**: https://sms-api.nmvpmsms.workers.dev

### Test Results

| Test # | Test Name | Status | Notes |
|--------|-----------|--------|-------|
| 1 | Principal Login | ✅ Pass | |
| 2.1 | Class Teacher Login | ✅ Pass | |
| 2.2 | Non-Class Teacher Login | ✅ Pass | |
| 3 | Student Login | ✅ Pass | |
| ... | ... | ... | ... |

### Issues Found

| Issue # | Severity | Description | Status |
|---------|----------|-------------|--------|
| 1 | High | Birthdays not showing for Teacher X | 🔧 In Progress |
| 2 | Low | Typo in dashboard heading | ✅ Fixed |

### Summary

- **Total Tests**: 25
- **Passed**: 23 ✅
- **Failed**: 2 ❌
- **Blocked**: 0 ⛔

### Sign-off

- [ ] All critical tests passed
- [ ] No P0/P1 bugs remain
- [ ] Performance meets targets
- [ ] Security tests passed
- [ ] Ready for production use

**Approved by**: ________________  
**Date**: ________________

---

## Automation Scripts

### Quick Health Check Script

```bash
#!/bin/bash
# health_check.sh - Quick system health check

echo "=== SMS Health Check ==="

echo "1. Checking API..."
curl -s https://sms-api.nmvpmsms.workers.dev/health | jq

echo "2. Checking Frontend..."
curl -s -o /dev/null -w "%{http_code}" https://503355c0.sms-web-34u.pages.dev

echo "3. Checking Database..."
wrangler d1 execute sms-production-db --remote --command "SELECT COUNT(*) as count FROM users"

echo "Health check complete!"
```

### Birthday Data Validation Script

```sql
-- birthday_validation.sql
-- Run to validate birthday data integrity

-- Check 1: Students without birthdates
SELECT COUNT(*) as students_without_birthdates
FROM students
WHERE date_of_birth IS NULL;

-- Check 2: Students without dob_md
SELECT COUNT(*) as students_without_dob_md
FROM student_profiles
WHERE date_of_birth IS NOT NULL AND dob_md IS NULL;

-- Check 3: Classrooms without class teachers
SELECT COUNT(*) as classrooms_without_teacher
FROM classrooms
WHERE class_teacher_id IS NULL AND academic_year_id IN (
  SELECT id FROM academic_years WHERE status = 'current'
);

-- Check 4: Class teachers without teaching assignments
SELECT u.login_id, COUNT(ta.id) as assignment_count
FROM users u
INNER JOIN classrooms c ON u.id = c.class_teacher_id
LEFT JOIN teaching_assignments ta ON u.id = ta.teacher_id
WHERE u.role = 'teacher'
GROUP BY u.id, u.login_id
HAVING assignment_count = 0;
```

---

## Conclusion

This testing guide covers end-to-end functionality of the SMS system with special focus on:
- ✅ Authentication & authorization
- ✅ Role-based access control
- ✅ Birthday system for class teachers
- ✅ Data isolation and security
- ✅ Performance benchmarks

**Next Steps**:
1. Execute all tests systematically
2. Document results in test report
3. Fix any issues found
4. Re-test failed cases
5. Sign off when all critical tests pass

**For Support**:
- Check troubleshooting section first
- Review browser console for errors
- Check Cloudflare dashboard for API logs
- Verify database state with SQL queries

🎉 **Happy Testing!**
