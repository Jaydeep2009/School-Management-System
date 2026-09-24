# School Management System - Frontend Implementation Tasks

## Project Overview

Complete frontend implementation for a School Management System with **Principal**, **Teacher**, and **Student** roles. The backend APIs are fully implemented and tested (102 passing tests). This document outlines all required frontend pages and features.

---

## Tech Stack

- **Framework**: React 18 with TypeScript
- **Routing**: React Router v7
- **Build**: Vite
- **Styling**: CSS (existing design system with inline styles)
- **State**: React hooks (useState, useEffect)
- **API**: Fetch API with centralized service (`apiService`)
- **Auth**: JWT tokens (accessToken + refreshToken)

---

## Current Status

### ✅ Completed
- Principal Dashboard (with KPIs and widgets)
- Super Admin login and school management
- Principal provisioning flow
- Basic layout components (Sidebar, Header, Cards, Buttons)
- Authentication hooks and protected routes
- API service with token management
- Principal pages: Students, Teachers, Academic Structure, Attendance, Marks, Assignments, Fees, Promotions, Timetable, Birthdays

### ❌ Not Implemented
- Account activation flow **(HIGH PRIORITY - BLOCKING LOGIN)**
- Principal detail pages (student details, teacher details, etc.)
- Teacher role frontend (complete)
- Student role frontend (complete)
- Actual CRUD operations (create/edit forms)
- Excel import functionality
- Advanced filtering and search
- Form validation and error handling
- Real-time features

---

## Backend API Summary

### Authentication (`/auth`)
- ✅ `POST /auth/login` - Login (all roles)
- ✅ `POST /auth/activate` - Activate account with temporary password
- ✅ `POST /auth/change-password` - Change password
- ✅ `POST /auth/refresh` - Refresh access token
- ✅ `POST /auth/logout` - Logout
- ✅ `GET /auth/me` - Get current user info

### Super Admin (`/schools`)
- ✅ `GET /schools` - List schools
- ✅ `POST /schools` - Create school
- ✅ `GET /schools/:id` - Get school details
- ✅ `PATCH /schools/:id` - Update school
- ✅ `POST /schools/:id/suspend` - Suspend school
- ✅ `POST /schools/:id/activate` - Activate school
- ✅ `POST /schools/:id/archive` - Archive school
- ✅ `POST /schools/:id/principal` - Provision Principal

### Academic Structure
- ✅ `GET /academic-years` - List academic years
- ✅ `POST /academic-years` - Create academic year
- ✅ `GET /academic-years/:id` - Get academic year
- ✅ `PATCH /academic-years/:id` - Update academic year
- ✅ `POST /academic-years/:id/activate` - Activate academic year
- ✅ `POST /academic-years/:id/close` - Close academic year
- ✅ `GET /classrooms` - List classrooms
- ✅ `POST /classrooms` - Create classroom
- ✅ `GET /classrooms/:id` - Get classroom
- ✅ `PATCH /classrooms/:id` - Update classroom
- ✅ `GET /subjects` - List subjects
- ✅ `POST /subjects` - Create subject
- ✅ `GET /subjects/:id` - Get subject
- ✅ `PATCH /subjects/:id` - Update subject
- ✅ `GET /enrollments` - List enrollments
- ✅ `POST /enrollments` - Create enrollment
- ✅ `GET /enrollments/:id` - Get enrollment
- ✅ `PATCH /enrollments/:id` - Update enrollment
- ✅ `GET /teaching-assignments` - List teaching assignments
- ✅ `POST /teaching-assignments` - Create teaching assignment
- ✅ `GET /teaching-assignments/:id` - Get teaching assignment
- ✅ `PATCH /teaching-assignments/:id` - Update teaching assignment

### Accounts
- ✅ `GET /teachers` - List teachers
- ✅ `POST /teachers` - Create teacher
- ✅ `GET /teachers/:id` - Get teacher profile
- ✅ `PATCH /teachers/:id` - Update teacher profile
- ✅ `POST /teachers/:id/disable` - Disable teacher
- ✅ `POST /teachers/:id/reactivate` - Reactivate teacher
- ✅ `POST /teachers/:id/reset-password` - Reset teacher password
- ✅ `GET /students` - List students
- ✅ `POST /students` - Create student
- ✅ `POST /students/bulk-provision` - Bulk create students
- ✅ `GET /students/:id` - Get student profile
- ✅ `PATCH /students/:id` - Update student profile
- ✅ `POST /students/:id/disable` - Disable student
- ✅ `POST /students/:id/reactivate` - Reactivate student
- ✅ `POST /students/:id/reset-password` - Reset student password
- ✅ `GET /me` - Get current user profile
- ✅ `PATCH /me` - Update own profile

### Attendance
- ✅ `GET /attendance/sessions` - List attendance sessions
- ✅ `POST /attendance/sessions` - Create attendance session
- ✅ `GET /attendance/sessions/:id` - Get session details
- ✅ `GET /attendance/sessions/:id/entries` - Get session entries
- ✅ `PUT /attendance/sessions/:id/entries` - Mark attendance (bulk)
- ✅ `POST /attendance/sessions/:id/lock` - Lock session
- ✅ `POST /attendance/sessions/:id/unlock` - Unlock session
- ✅ `GET /attendance/students/:studentId/summary` - Get student attendance summary
- ✅ `GET /attendance/students/:studentId/subject-wise` - Get subject-wise attendance
- ✅ `GET /attendance/classrooms/:classroomId/report` - Get classroom attendance report
- ✅ `GET /me/attendance` - Get own attendance (student)

### Marks & Assessments
- ✅ `GET /marks/assessments` - List assessments
- ✅ `POST /marks/assessments` - Create assessment
- ✅ `GET /marks/assessments/:id` - Get assessment
- ✅ `PATCH /marks/assessments/:id` - Update assessment
- ✅ `POST /marks/assessments/:id/publish` - Publish assessment
- ✅ `POST /marks/assessments/:id/lock` - Lock assessment
- ✅ `GET /marks/assessments/:id/marks` - Get marks for assessment
- ✅ `PUT /marks/assessments/:id/marks` - Submit marks (bulk)
- ✅ `GET /marks/students/:studentId` - Get student marks
- ✅ `GET /marks/students/:studentId/summary` - Get student marks summary
- ✅ `GET /me/marks` - Get own marks (student)

### Assignments
- ✅ `GET /assignments` - List assignments
- ✅ `POST /assignments` - Create assignment
- ✅ `GET /assignments/:id` - Get assignment
- ✅ `PATCH /assignments/:id` - Update assignment
- ✅ `DELETE /assignments/:id` - Delete assignment
- ✅ `POST /assignments/:id/attachment` - Upload attachment

### Fees
- ✅ `GET /fees/categories` - List fee categories
- ✅ `POST /fees/categories` - Create fee category
- ✅ `GET /fees/categories/:id` - Get fee category
- ✅ `PATCH /fees/categories/:id` - Update fee category
- ✅ `GET /fees/charges` - List charges
- ✅ `POST /fees/charges` - Create charge
- ✅ `POST /fees/charges/bulk` - Create charges (bulk)
- ✅ `POST /fees/charges/carry-forward` - Carry forward from previous year
- ✅ `POST /fees/charges/:id/void` - Void charge
- ✅ `GET /fees/concessions` - List concessions
- ✅ `POST /fees/concessions` - Create concession
- ✅ `POST /fees/concessions/:id/void` - Void concession
- ✅ `GET /fees/payments` - List payments
- ✅ `POST /fees/payments` - Record payment
- ✅ `POST /fees/payments/:id/void` - Void payment
- ✅ `GET /fees/ledger/:studentId` - Get student fee ledger
- ✅ `GET /fees/students/:studentId/balance` - Get student balance
- ✅ `GET /me/fees` - Get own fees (student)

### Promotions
- ✅ `GET /promotions/batches` - List promotion batches
- ✅ `POST /promotions/batches` - Create promotion batch
- ✅ `GET /promotions/batches/:id` - Get promotion batch
- ✅ `GET /promotions/batches/:id/candidates` - Get promotion candidates
- ✅ `PUT /promotions/batches/:id/decisions` - Set promotion decisions (bulk)
- ✅ `POST /promotions/batches/:id/plan` - Plan promotion
- ✅ `GET /promotions/batches/:id/checks` - Get activation checks
- ✅ `POST /promotions/batches/:id/apply` - Apply promotion
- ✅ `POST /promotions/batches/:id/cancel` - Cancel promotion

### Timetable
- ✅ `GET /timetables/versions` - List timetable versions
- ✅ `POST /timetables/versions` - Create timetable version
- ✅ `GET /timetables/versions/:id` - Get timetable version
- ✅ `POST /timetables/versions/:id/publish` - Publish timetable
- ✅ `GET /timetables/versions/:id/entries` - Get timetable entries
- ✅ `PUT /timetables/versions/:id/entries` - Update timetable entries (bulk)
- ✅ `GET /timetables/classrooms/:classroomId` - Get classroom timetable
- ✅ `GET /timetables/teachers/:teacherId` - Get teacher timetable
- ✅ `GET /me/timetable` - Get own timetable (teacher/student)

### Excel Imports
- ✅ `POST /imports/preview` - Preview import data
- ✅ `POST /imports/commit` - Commit import data
- Support: students, attendance, marks, fee-payments, fee-charges, promotion, timetable

### Profiles & Birthdays
- ✅ `GET /birthdays/upcoming` - Get upcoming birthdays
- ✅ `GET /birthdays/today` - Get today's birthdays
- ✅ `GET /teachers/:id/profile` - Get teacher profile
- ✅ `GET /students/:id/profile` - Get student profile

---

## Task Breakdown

## 🔴 CRITICAL - BLOCKING ISSUE

### Task 0: Fix Account Activation Flow ⚠️ **URGENT**
**Priority**: CRITICAL  
**Blocking**: All new Principals cannot login  
**Status**: Bug - Activation succeeds but shows error  

#### Problem
- Newly provisioned Principals receive temporary credentials
- Backend stores temporary password in `activation_hash`, not `password_hash`
- When Principal tries to activate: backend succeeds but frontend shows "401 Unauthorized"
- Database confirms account is activated but user cannot login
- Internal server error on login attempt

#### Root Cause
- Frontend showing misleading error when activation actually succeeds
- Password verification failing during login
- Possible issue with password hash format or JWT token generation

#### Current Status
```
✅ Activation page created (apps/web/src/pages/Activate.tsx)
✅ API method added (apiService.activateAccount)
✅ Route added (/activate)
✅ Login page has activation link
❌ Activation appears to fail but database updates
❌ Login with activated account returns 500 error
```

#### Fix Required
1. **Debug activation response handling**
   - Check if backend returns success correctly
   - Verify frontend error handling
   - Test with backend console logs

2. **Debug login flow for activated accounts**
   - Check password hash verification
   - Verify JWT token generation
   - Check session creation

3. **Manual testing flow**
   - Super Admin provisions Principal → Get credentials
   - Principal goes to /activate → Enter credentials → Set password
   - Backend should return success
   - Frontend should show success screen
   - Principal logs in with new password → Should access dashboard

#### Files to Check
- `apps/api/src/auth/auth.service.ts` - Activation and login logic
- `apps/web/src/pages/Activate.tsx` - Frontend activation page
- `apps/web/src/services/api.ts` - API service
- Backend `.dev.vars` - JWT_SECRET configuration

#### Success Criteria
- ✅ Principal can activate account without errors
- ✅ Activation success screen displays correctly
- ✅ Principal can login with new password
- ✅ Principal Dashboard loads successfully
- ✅ No 401 or 500 errors

---

## PHASE 1: Core Principal Features (Detail Pages & CRUD)

### Task 1.1: Student Management
**Pages**:
- Student Details Page (`/students/:id`)
- Create Student Page (`/students/new`)
- Edit Student Page (`/students/:id/edit`)
- Bulk Student Provision Page (`/students/bulk-provision`)

**Features**:
- View full student profile with all fields
- Edit student information
- View enrollment history
- View attendance summary
- View marks/grades
- View fee ledger
- Disable/reactivate student
- Reset student password
- Bulk student creation via form or Excel

**API Integration**:
- `GET /students/:id`
- `PATCH /students/:id`
- `POST /students`
- `POST /students/bulk-provision`
- `POST /students/:id/disable`
- `POST /students/:id/reactivate`
- `POST /students/:id/reset-password`
- `GET /fees/ledger/:studentId`
- `GET /attendance/students/:studentId/summary`

### Task 1.2: Teacher Management
**Pages**:
- Teacher Details Page (`/teachers/:id`)
- Create Teacher Page (`/teachers/new`)
- Edit Teacher Page (`/teachers/:id/edit`)

**Features**:
- View full teacher profile
- View teaching assignments
- View assigned classrooms and subjects
- Edit teacher information
- Disable/reactivate teacher
- Reset teacher password

**API Integration**:
- `GET /teachers/:id`
- `PATCH /teachers/:id`
- `POST /teachers`
- `POST /teachers/:id/disable`
- `POST /teachers/:id/reactivate`
- `POST /teachers/:id/reset-password`
- `GET /teaching-assignments` (filter by teacher)

### Task 1.3: Academic Year Management
**Pages**:
- Academic Year Details Page (`/academic-years/:id`)
- Create Academic Year Page (`/academic-years/new`)
- Edit Academic Year Page (`/academic-years/:id/edit`)

**Features**:
- View academic year details and statistics
- Create new academic year
- Edit academic year (dates, label)
- Activate academic year (with validation)
- Close academic year
- View classrooms and students count
- Display activation checks

**API Integration**:
- `GET /academic-years/:id`
- `POST /academic-years`
- `PATCH /academic-years/:id`
- `POST /academic-years/:id/activate`
- `POST /academic-years/:id/close`

### Task 1.4: Classroom Management
**Pages**:
- Classroom Details Page (`/classrooms/:id`)
- Create Classroom Page (`/classrooms/new`)
- Edit Classroom Page (`/classrooms/:id/edit`)

**Features**:
- View classroom details
- View enrolled students
- View assigned teachers and subjects
- View class teacher
- Create classroom
- Edit classroom
- Assign class teacher

**API Integration**:
- `GET /classrooms/:id`
- `POST /classrooms`
- `PATCH /classrooms/:id`
- `GET /enrollments` (filter by classroom)
- `GET /teaching-assignments` (filter by classroom)

### Task 1.5: Subject Management
**Pages**:
- Subject Details Page (`/subjects/:id`)
- Create Subject Page (`/subjects/new`)
- Edit Subject Page (`/subjects/:id/edit`)

**Features**:
- View subject details
- View classrooms teaching this subject
- View assigned teachers
- Create subject
- Edit subject

**API Integration**:
- `GET /subjects/:id`
- `POST /subjects`
- `PATCH /subjects/:id`
- `GET /teaching-assignments` (filter by subject)

### Task 1.6: Enrollment Management
**Pages**:
- Enrollment Management Page (combined with Classroom Details)
- Bulk Enroll Students Page

**Features**:
- Enroll students in classrooms
- View enrollment details
- Update enrollment (roll number)
- Change enrollment status
- Bulk enrollment

**API Integration**:
- `POST /enrollments`
- `GET /enrollments/:id`
- `PATCH /enrollments/:id`

### Task 1.7: Teaching Assignment Management
**Pages**:
- Teaching Assignment Page (combined with Classroom Details)

**Features**:
- Assign teacher to classroom + subject
- Mark class teacher
- View all assignments
- Update assignments
- Remove assignments

**API Integration**:
- `POST /teaching-assignments`
- `GET /teaching-assignments/:id`
- `PATCH /teaching-assignments/:id`

---

## PHASE 2: Principal Attendance Features

### Task 2.1: Attendance Session Management
**Pages**:
- Attendance Session Details Page (`/attendance/:id`)
- Create Attendance Session Page (`/attendance/new`)

**Features**:
- Create attendance session (classroom + subject + date + period)
- View session details
- View enrolled students for session
- Mark attendance (bulk select all/none)
- Lock/unlock session
- Override teacher edit window (principal only)
- Display edit window status

**API Integration**:
- `POST /attendance/sessions`
- `GET /attendance/sessions/:id`
- `GET /attendance/sessions/:id/entries`
- `PUT /attendance/sessions/:id/entries`
- `POST /attendance/sessions/:id/lock`
- `POST /attendance/sessions/:id/unlock`

### Task 2.2: Attendance Reports
**Pages**:
- Student Attendance Report Page
- Classroom Attendance Report Page

**Features**:
- View student attendance summary (overall and subject-wise)
- View classroom attendance report (all students)
- Filter by date range
- Filter by subject
- Export to Excel/PDF (optional)
- Display attendance percentage

**API Integration**:
- `GET /attendance/students/:studentId/summary`
- `GET /attendance/students/:studentId/subject-wise`
- `GET /attendance/classrooms/:classroomId/report`

---

## PHASE 3: Principal Marks & Assessments

### Task 3.1: Assessment Management
**Pages**:
- Assessment Details Page (`/marks/:id`)
- Create Assessment Page (`/marks/new`)
- Edit Assessment Page (`/marks/:id/edit`)

**Features**:
- Create assessment (name, type, max marks, weightage, date)
- Edit assessment (draft only)
- View assessment details
- View students and marks
- Publish assessment
- Lock assessment
- Display assessment status

**API Integration**:
- `POST /marks/assessments`
- `GET /marks/assessments/:id`
- `PATCH /marks/assessments/:id`
- `POST /marks/assessments/:id/publish`
- `POST /marks/assessments/:id/lock`

### Task 3.2: Marks Entry
**Pages**:
- Marks Entry Page (part of Assessment Details)

**Features**:
- Enter marks for all students (bulk)
- Mark students as absent
- Validate marks against max_marks
- Save draft marks
- Submit marks
- Edit marks (published but not locked)
- View marks summary

**API Integration**:
- `GET /marks/assessments/:id/marks`
- `PUT /marks/assessments/:id/marks`

### Task 3.3: Student Marks Reports
**Pages**:
- Student Marks Report Page

**Features**:
- View student marks across all assessments
- View subject-wise marks
- View overall summary
- Display weighted scores
- Filter by academic year

**API Integration**:
- `GET /marks/students/:studentId`
- `GET /marks/students/:studentId/summary`

---

## PHASE 4: Principal Assignments & Fees

### Task 4.1: Assignment Management
**Pages**:
- Assignment Details Page (`/assignments/:id`)
- Create Assignment Page (`/assignments/new`)
- Edit Assignment Page (`/assignments/:id/edit`)

**Features**:
- Create assignment (title, description, due date, max marks)
- Upload attachment
- View assignment details
- Edit assignment
- Delete assignment
- View assigned classroom

**API Integration**:
- `POST /assignments`
- `GET /assignments/:id`
- `PATCH /assignments/:id`
- `DELETE /assignments/:id`
- `POST /assignments/:id/attachment`

### Task 4.2: Fee Category Management
**Pages**:
- Fee Categories Page (enhanced from current stub)
- Create Fee Category Page

**Features**:
- List fee categories
- Create fee category (name, amount, frequency)
- Edit fee category
- View category details

**API Integration**:
- `GET /fees/categories`
- `POST /fees/categories`
- `GET /fees/categories/:id`
- `PATCH /fees/categories/:id`

### Task 4.3: Fee Charges Management
**Pages**:
- Fee Charges Page
- Create Charge Page
- Bulk Create Charges Page
- Carry Forward Page

**Features**:
- Create individual charge
- Create bulk charges (all students in classroom)
- Carry forward charges from previous year
- Void charge
- View charges list
- Filter by student, category, status

**API Integration**:
- `POST /fees/charges`
- `POST /fees/charges/bulk`
- `POST /fees/charges/carry-forward`
- `POST /fees/charges/:id/void`
- `GET /fees/charges`

### Task 4.4: Fee Concessions Management
**Pages**:
- Fee Concessions Page
- Create Concession Page

**Features**:
- Create concession (student, category, amount, reason)
- Void concession
- View concessions list

**API Integration**:
- `POST /fees/concessions`
- `POST /fees/concessions/:id/void`
- `GET /fees/concessions`

### Task 4.5: Fee Payments Management
**Pages**:
- Fee Payments Page
- Record Payment Page

**Features**:
- Record payment (student, amount, mode, reference)
- Void payment
- View payment history
- Generate receipt number (backend does this)
- Display receipt

**API Integration**:
- `POST /fees/payments`
- `POST /fees/payments/:id/void`
- `GET /fees/payments`

### Task 4.6: Student Fee Ledger
**Pages**:
- Student Fee Ledger Page (part of Student Details)

**Features**:
- View all fee transactions (charges, concessions, payments)
- Display running balance
- Display payment status
- Filter by academic year
- Display previous year carry-forward

**API Integration**:
- `GET /fees/ledger/:studentId`
- `GET /fees/students/:studentId/balance`

---

## PHASE 5: Principal Promotions & Timetable

### Task 5.1: Promotion Management
**Pages**:
- Promotion Batch Details Page (`/promotions/:id`)
- Create Promotion Batch Page (`/promotions/new`)
- Promotion Decision Page (bulk)

**Features**:
- Create promotion batch (from year → to year)
- View promotion candidates
- Set promotion decisions (promote/retain/graduate/leave)
- Bulk set decisions
- Plan promotion
- View activation checks
- Apply promotion (execute)
- Cancel promotion
- View batch status

**API Integration**:
- `POST /promotions/batches`
- `GET /promotions/batches/:id`
- `GET /promotions/batches/:id/candidates`
- `PUT /promotions/batches/:id/decisions`
- `POST /promotions/batches/:id/plan`
- `GET /promotions/batches/:id/checks`
- `POST /promotions/batches/:id/apply`
- `POST /promotions/batches/:id/cancel`

### Task 5.2: Timetable Management
**Pages**:
- Timetable Version Page (`/timetable/:id`)
- Create Timetable Version Page (`/timetable/new`)
- Timetable Editor Page (grid view)

**Features**:
- Create timetable version
- Edit timetable entries (classroom + subject + teacher + day + period)
- Grid view (days × periods)
- Publish timetable
- View classroom timetable
- View teacher timetable
- Validate conflicts (same teacher at same time)

**API Integration**:
- `POST /timetables/versions`
- `GET /timetables/versions/:id`
- `GET /timetables/versions/:id/entries`
- `PUT /timetables/versions/:id/entries`
- `POST /timetables/versions/:id/publish`
- `GET /timetables/classrooms/:classroomId`
- `GET /timetables/teachers/:teacherId`

---

## PHASE 6: Excel Import Functionality

### Task 6.1: Import Infrastructure
**Pages**:
- Import Page (`/imports`)
- Preview Import Page
- Import Results Page

**Features**:
- Upload Excel file
- Select import type (students, attendance, marks, fee-payments, etc.)
- Preview import data
- Display validation errors (row-level)
- Confirm and commit import
- Display import results
- Download error report

**API Integration**:
- `POST /imports/preview`
- `POST /imports/commit`

**Import Types**:
- Students (bulk provision)
- Attendance (mark attendance)
- Marks (enter assessment marks)
- Fee Payments (record payments)
- Fee Charges (create charges)
- Promotion (set decisions)
- Timetable (create entries)

---

## PHASE 7: Teacher Role Frontend

### Task 7.1: Teacher Authentication & Dashboard
**Pages**:
- Teacher Dashboard (`/teacher/dashboard`)

**Features**:
- View assigned classrooms and subjects
- View today's timetable
- View upcoming assignments
- View attendance status
- Quick actions (mark attendance, enter marks)

**API Integration**:
- `GET /me`
- `GET /me/timetable`
- `GET /teaching-assignments` (filter by current user)

### Task 7.2: Teacher Attendance
**Pages**:
- Teacher Attendance Session List
- Mark Attendance Page

**Features**:
- View assigned sessions
- Create attendance session (assigned classrooms only)
- Mark attendance (within edit window)
- Lock session
- Cannot modify locked sessions
- Cannot modify outside edit window

**Authorization**:
- Only assigned classroom + subject
- Enforce edit window (48 hours default)

### Task 7.3: Teacher Marks Entry
**Pages**:
- Teacher Assessments List
- Teacher Marks Entry Page

**Features**:
- View assessments for assigned subjects
- Enter marks (published assessments only)
- Cannot modify locked assessments
- Bulk marks entry

**Authorization**:
- Only assigned classroom + subject

### Task 7.4: Teacher Assignments
**Pages**:
- Teacher Assignments List
- Create Assignment Page
- View Assignment Details

**Features**:
- Create assignments for assigned subjects
- Edit own assignments
- Delete own assignments
- Upload attachment
- View assignment details

### Task 7.5: Teacher Reports
**Pages**:
- Teacher Classroom Reports
- Teacher Student Reports

**Features**:
- View classroom attendance report (assigned classes)
- View student attendance (assigned classes)
- View student marks (assigned classes)

---

## PHASE 8: Student Role Frontend

### Task 8.1: Student Authentication & Dashboard
**Pages**:
- Student Dashboard (`/student/dashboard`)

**Features**:
- View today's timetable
- View upcoming assignments
- View recent attendance
- View recent marks
- Display academic year info

**API Integration**:
- `GET /me`
- `GET /me/timetable`
- `GET /me/attendance`
- `GET /me/marks`

### Task 8.2: Student Timetable
**Pages**:
- Student Timetable Page

**Features**:
- View own timetable (weekly grid)
- Display day, period, subject, teacher

**API Integration**:
- `GET /me/timetable`

### Task 8.3: Student Attendance
**Pages**:
- Student Attendance Page

**Features**:
- View attendance summary (overall + subject-wise)
- View attendance percentage
- Display attendance records

**API Integration**:
- `GET /me/attendance`

### Task 8.4: Student Marks
**Pages**:
- Student Marks Page

**Features**:
- View marks for all assessments
- View subject-wise marks
- Display overall summary
- View published assessments only

**API Integration**:
- `GET /me/marks`

### Task 8.5: Student Assignments
**Pages**:
- Student Assignments List
- Assignment Details Page

**Features**:
- View assigned assignments
- View assignment details
- View due dates
- Download attachments

**API Integration**:
- `GET /assignments` (filter by student's classroom)

### Task 8.6: Student Fees
**Pages**:
- Student Fees Page

**Features**:
- View fee ledger
- View balance
- View payment history
- View charges and concessions

**API Integration**:
- `GET /me/fees`

---

## PHASE 9: Advanced Features

### Task 9.1: Enhanced Search & Filtering
**Features**:
- Advanced search across all list pages
- Multiple filter criteria
- Sort by various fields
- Pagination for large datasets

### Task 9.2: Form Validation
**Features**:
- Client-side validation for all forms
- Match backend validation rules
- Display field-level errors
- Prevent invalid submissions
- Show validation feedback

### Task 9.3: Error Handling
**Features**:
- Global error boundary
- API error handling
- Network error handling
- Display user-friendly error messages
- Retry mechanisms
- Offline state detection

### Task 9.4: Loading States
**Features**:
- Skeleton loaders for all pages
- Button loading states
- Progress indicators for long operations
- Optimistic UI updates

### Task 9.5: Responsive Design
**Features**:
- Mobile-responsive layouts
- Touch-friendly UI elements
- Adaptive navigation
- Mobile-optimized tables

### Task 9.6: Accessibility
**Features**:
- Keyboard navigation
- Screen reader support
- ARIA labels
- Focus management
- Color contrast compliance

---

## Technical Requirements

### Code Quality
- TypeScript strict mode
- No `any` types
- Proper type definitions for all API responses
- Consistent naming conventions
- Component reusability
- DRY principle

### Performance
- Code splitting (React.lazy)
- Memoization (useMemo, useCallback)
- Virtual scrolling for large lists
- Debounced search inputs
- Optimized re-renders

### Testing
- Unit tests for utility functions
- Integration tests for API service
- Component tests for critical flows
- E2E tests for authentication

### Security
- No client-side secrets
- Proper token storage (httpOnly cookies preferred, or secure localStorage)
- XSS prevention
- CSRF protection
- Input sanitization

### Build
- Production build optimization
- Environment variable management
- Asset optimization
- Bundle size monitoring

---

## Priority Order

1. **🔴 CRITICAL**: Fix activation flow (Task 0)
2. **High**: Complete Principal detail pages and CRUD (Phase 1)
3. **High**: Principal attendance features (Phase 2)
4. **Medium**: Principal marks and assessments (Phase 3)
5. **Medium**: Principal assignments and fees (Phase 4)
6. **Medium**: Principal promotions and timetable (Phase 5)
7. **Medium**: Teacher role frontend (Phase 7)
8. **Medium**: Student role frontend (Phase 8)
9. **Low**: Excel import functionality (Phase 6)
10. **Low**: Advanced features (Phase 9)

---

## Estimated Effort

| Phase | Tasks | Estimated Hours |
|-------|-------|----------------|
| Task 0 - Fix Activation | 1 | 4-8 hours |
| Phase 1 - Principal CRUD | 7 | 40-60 hours |
| Phase 2 - Attendance | 2 | 20-30 hours |
| Phase 3 - Marks | 3 | 30-40 hours |
| Phase 4 - Assignments & Fees | 6 | 40-50 hours |
| Phase 5 - Promotions & Timetable | 2 | 30-40 hours |
| Phase 6 - Excel Imports | 1 | 20-30 hours |
| Phase 7 - Teacher Role | 5 | 40-50 hours |
| Phase 8 - Student Role | 6 | 40-50 hours |
| Phase 9 - Advanced | 6 | 40-60 hours |
| **Total** | **39 tasks** | **300-400 hours** |

---

## Success Criteria

### Functional
- ✅ All user roles can authenticate and access appropriate pages
- ✅ All CRUD operations work correctly
- ✅ Authorization rules enforced on frontend
- ✅ All backend APIs integrated
- ✅ Data validation matches backend rules
- ✅ Error handling provides clear feedback

### Non-Functional
- ✅ TypeScript compilation passes with no errors
- ✅ Production build succeeds
- ✅ Pages load in < 3 seconds
- ✅ Responsive on mobile, tablet, desktop
- ✅ Accessible to keyboard users
- ✅ No console errors or warnings

### User Experience
- ✅ Intuitive navigation
- ✅ Consistent design across pages
- ✅ Clear loading and error states
- ✅ Helpful validation messages
- ✅ Smooth transitions and interactions

---

## Getting Started

### Immediate Next Steps

1. **Fix activation flow** (URGENT - Task 0)
   - Debug backend activation response
   - Fix frontend error handling
   - Test complete flow: provision → activate → login

2. **After activation fix, start Phase 1**:
   - Student Details Page
   - Teacher Details Page
   - Create/Edit forms

3. **Build incrementally**:
   - Complete one feature at a time
   - Test thoroughly before moving on
   - Reuse components aggressively

### Development Workflow

```bash
# Start backend
cd apps/api
pnpm dev  # Runs on http://localhost:8787

# Start frontend
cd apps/web
pnpm dev  # Runs on http://localhost:5173

# Run tests
pnpm test

# Type check
pnpm typecheck

# Build
pnpm build
```

---

## Notes

- Backend is **100% complete** with 102 passing tests
- Frontend authentication infrastructure exists
- Layout and basic components are ready
- Focus on **activation bug first**, then build features incrementally
- Reuse existing components and patterns
- Match existing design system
- Keep UI simple and functional
- Test each feature before moving to the next

---

**Document Version**: 1.0  
**Last Updated**: 2026-09-21  
**Status**: Ready for Implementation
