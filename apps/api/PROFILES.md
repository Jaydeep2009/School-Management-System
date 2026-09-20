# Student & Teacher Profiles + Birthday Management

**Task 11** — Profile viewing, editing, current enrollment derivation, and birthday queries with privacy controls.

---

## Overview

The Profiles module provides:

1. **Teacher Profile Management** — View and edit teacher profiles
2. **Student Profile Management** — View and edit student profiles
3. **Current Enrollment Derivation** — Compute student's current class from enrollments
4. **Historical Enrollment Query** — View student's enrollment history (Principal only)
5. **Birthday Management** — Query teacher and student birthdays with privacy controls

All operations enforce strict tenant isolation and role-based access control.

---

## Core Concepts

### Profile vs. Account

**Account** (managed by account-management module):
- `users` table: login_id, password, role, status, token_version
- Account lifecycle: creation, activation, password reset, disable/reactivate

**Profile** (managed by this profiles module):
- `teacher_profiles` and `student_profiles` tables
- Personal information: names, phone, DOB, address, parent info
- Profile editing does NOT change account status, role, or authentication fields

The modules are complementary but separate:
- Account management controls WHO can log in
- Profile management controls WHAT information is displayed/editable

### Current Enrollment

**Important**: `student_profiles` does NOT contain a `current_classroom_id` column.

Current class is derived dynamically from:
```
enrollments (status='active')
  ↓
academic_years (status='current')
  ↓
classrooms
```

This ensures enrollment history remains authoritative.

A student's "current" enrollment means:
- `academic_years.status = 'current'`
- `enrollments.status = 'active'`
- Linked to specific classroom with grade/division/roll number

### Birthday Privacy (Minor DOB Masking)

For student birthdays, we protect minors' full date of birth:

**Birthday lists expose only**:
- Student name
- Classroom/grade
- Day and month (MM-DD format via `dob_md`)

**Birthday lists do NOT expose**:
- Full date of birth with year

**Full DOB access**:
- Student self-profile: Yes (student can see their own full DOB)
- Principal viewing full profile: Yes (administrative need)
- Class teacher viewing birthday list: No (only MM-DD)

This follows privacy-by-design for minor student data.

---

## Authorization Model

### Principal

Principal can:
- ✅ View any teacher profile in their school
- ✅ Edit any teacher profile
- ✅ View any student profile in their school
- ✅ Edit any student profile
- ✅ View student's current enrollment
- ✅ View student's historical enrollments
- ✅ View all teacher birthdays (school-wide)
- ✅ View all student birthdays (school-wide)

Principal **cannot**:
- ❌ Access profiles from another school
- ❌ Change account security fields (role, login_id, password_hash, token_version)

### Teacher

Teacher can:
- ✅ View own teacher profile
- ✅ Edit own teacher profile (limited fields)
- ✅ View student profiles for students in their assigned classroom (class teacher)
- ✅ View current enrollment for students in their assigned classroom
- ✅ View student birthdays for students in their assigned classroom

Teacher **cannot**:
- ❌ View other teachers' profiles
- ❌ Edit other teachers' profiles
- ❌ View students outside their assigned classroom
- ❌ Edit student profiles
- ❌ View student historical enrollments
- ❌ View school-wide student data
- ❌ Access profiles from another school
- ❌ Subject teachers (non-class-teacher) do NOT automatically get birthday access

### Student

Student can:
- ✅ View own student profile
- ✅ View own current enrollment
- ✅ See own full date of birth

Student **cannot**:
- ❌ Edit own profile (self-service editing not implemented in V1)
- ❌ View other students' profiles
- ❌ View teacher profiles
- ❌ View birthday information
- ❌ View historical enrollments

---

## Endpoints

### Teacher Profiles

**GET /teachers/:userId**
- Authorization: Principal (any teacher), Teacher (self only)
- Returns: Complete teacher profile

**PUT /teachers/:userId/profile**
- Authorization: Principal (any teacher), Teacher (self only)
- Body: `UpdateTeacherProfileRequest`
- Editable fields: first_name, middle_name, last_name, phone, date_of_birth, joining_date
- Non-editable: user_id, school_id, employee_code, role, account status

### Student Profiles

**GET /students/:userId**
- Authorization: Principal (any student), Teacher (class teacher only), Student (self only)
- Returns: Student profile + current enrollment

**GET /students/:userId/enrollment**
- Authorization: Principal, Teacher (class teacher only), Student (self only)
- Returns: Current enrollment details (classroom, grade, division, roll number, class teacher)

**GET /students/:userId/enrollments**
- Authorization: Principal only
- Returns: Complete enrollment history (all years)

**PUT /students/:userId/profile**
- Authorization: Principal only
- Body: `UpdateStudentProfileRequest`
- Editable fields: first_name, middle_name, last_name, gender, date_of_birth, phone, email, address, parent_name, parent_phone, parent_email
- Non-editable: user_id, school_id, student_code, admission_number, role, account status

### Self-Service (via existing `/me/profile`)

**GET /me/profile**
- Authorization: Any authenticated user
- Returns:
  - Teacher: teacher profile
  - Student: student profile
  - Principal: user_id and school_id

### Birthdays

**GET /birthdays/teachers?month=9**
- Authorization: Principal only
- Query params:
  - `month` (1-12): Filter by month
  - `today=true`: Birthdays today
  - `thisWeek=true`: Birthdays in next 7 days
- Returns: List of teacher birthdays (name, employee_code, dob_md)

**GET /birthdays/students?month=9&classroomId=...**
- Authorization: Principal (school-wide), Teacher (class teacher classrooms only)
- Query params:
  - `month` (1-12): Filter by month
  - `today=true`: Birthdays today
  - `thisWeek=true`: Birthdays in next 7 days
  - `classroomId` (uuid): Filter by classroom (optional)
- Returns: List of student birthdays (name, classroom, grade, division, dob_md)
- **Privacy**: Full DOB year is NOT included in response

---

## Current Enrollment Derivation

The `getCurrentEnrollment` service method queries:

```sql
SELECT 
  e.id as enrollment_id,
  ay.label as academic_year_label,
  ay.status as academic_year_status,
  c.code as classroom_code,
  c.grade_name,
  c.division_name,
  c.grade_level,
  e.roll_number,
  e.status as enrollment_status,
  c.class_teacher_id,
  tp.first_name || ' ' || tp.last_name as class_teacher_name
FROM enrollments e
JOIN academic_years ay ON e.academic_year_id = ay.id
JOIN classrooms c ON e.classroom_id = c.id
LEFT JOIN teacher_profiles tp ON c.class_teacher_id = tp.user_id
WHERE e.student_id = ?
  AND e.school_id = ?
  AND ay.status = 'current'
  AND e.status = 'active'
LIMIT 1
```

This ensures:
- Only the current academic year is considered
- Only active enrollments are returned
- Historical enrollments remain untouched
- No denormalized `current_classroom_id` is needed

---

## Profile Editing Rules

### Allowed Fields

**Teacher Profile:**
- first_name, middle_name, last_name
- phone
- date_of_birth
- joining_date

**Student Profile:**
- first_name, middle_name, last_name
- gender
- date_of_birth
- phone, email, address
- parent_name, parent_phone, parent_email

### Forbidden Fields

Profile editing **never changes**:
- user_id
- school_id
- role
- login_id
- student_code / employee_code
- admission_number
- password_hash
- activation_hash
- token_version
- account status (active/disabled)
- must_change_password

These remain controlled by the account-management module.

### DOB Validation

When `date_of_birth` is updated:
1. Must be valid YYYY-MM-DD format
2. Must be reasonable for the role:
   - Teacher: 18-80 years old
   - Student: 3-25 years old
3. `dob_md` is automatically recomputed as `substr(date_of_birth, 6, 5)`

The database CHECK constraint enforces:
```sql
CHECK (
  (date_of_birth IS NULL AND dob_md IS NULL) OR
  (date_of_birth IS NOT NULL AND dob_md IS substr(date_of_birth, 6, 5))
)
```

This prevents manual `dob_md` manipulation.

---

## Birthday Management

### Storage

Birthdays use the `dob_md` column (format: 'MM-DD') for efficient querying:
- `teacher_profiles.dob_md`
- `student_profiles.dob_md`

Indexed for performance:
```sql
CREATE INDEX idx_teacher_birthday ON teacher_profiles(school_id, dob_md);
CREATE INDEX idx_student_birthday ON student_profiles(school_id, dob_md);
```

### Query Patterns

**Month Filter:**
```
WHERE substr(dob_md, 1, 2) = '09'
```

**Today:**
```
WHERE dob_md = '09-20'
```

**This Week:**
- Fetch all birthdays, filter in memory for next 7 days
- Handles month/year boundaries correctly

### Class Teacher Scoping

When a teacher queries student birthdays:
1. Find classrooms where `classrooms.class_teacher_id = teacher.user_id`
2. Filter students to only those classrooms
3. If teacher is not a class teacher, return empty list

This prevents subject teachers from automatically seeing all student birthdays.

### Principal Scoping

Principal sees all birthdays school-wide (no classroom filter).

---

## Tenant Isolation

Every query enforces school isolation:

**Teacher Profiles:**
```sql
WHERE user_id = ? AND school_id = ?
```

**Student Profiles:**
```sql
WHERE user_id = ? AND school_id = ?
```

**Current Enrollment:**
```sql
WHERE e.student_id = ? AND e.school_id = ?
```

**Birthdays:**
```sql
WHERE school_id = ?
```

Cross-school IDs **never** leak data. A 404/403 is returned for cross-tenant access attempts.

---

## Account Lifecycle

Profile operations respect existing account lifecycle:

**Disabled accounts:**
- Profile queries still work (for historical/administrative purposes)
- Profile editing is allowed by Principal (may need to fix data before reactivation)
- Disabled students/teachers do NOT appear in active birthday lists

**Birthday filters respect status:**
```sql
WHERE status = 'active' AND ...
```

Withdrawn students and inactive teachers are excluded from birthday lists.

---

## Audit Logging

Profile modifications are audited:

**Actions:**
- `teacher_profile_updated`
- `student_profile_updated`

**Audit payload includes:**
- actor (userId, role, schoolId)
- entity (teacher or student)
- entity_id (user_id)
- before (profile state before update)
- after (profile state after update)
- timestamp

**NOT audited:**
- Password hashes
- Activation hashes
- Session tokens
- Birthday READ operations (no audit entry for queries)

---

## Error Handling

Typed errors with HTTP status codes:

- `PROFILE_NOT_FOUND` (404)
- `TEACHER_NOT_FOUND` (404)
- `STUDENT_NOT_FOUND` (404)
- `PROFILE_ACCESS_DENIED` (403)
- `PROFILE_VALIDATION_FAILED` (400)
- `PROFILE_INVALID_DATE` (400)
- `NO_CURRENT_ENROLLMENT` (404)
- `BIRTHDAY_ACCESS_DENIED` (403)
- `INVALID_BIRTHDAY_FILTER` (400)

Cross-tenant access produces safe 403/404 (does not leak whether profile exists in another school).

---

## Database Schema (No Changes Required)

This module uses existing tables:

### teacher_profiles

```sql
CREATE TABLE teacher_profiles (
  user_id TEXT PRIMARY KEY,
  school_id TEXT NOT NULL,
  employee_code TEXT NOT NULL,
  first_name TEXT NOT NULL,
  middle_name TEXT,
  last_name TEXT NOT NULL,
  phone TEXT,
  date_of_birth TEXT,
  dob_md TEXT,
  joining_date TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  UNIQUE (school_id, employee_code),
  UNIQUE (user_id, school_id),
  FOREIGN KEY (user_id, school_id) REFERENCES users(id, school_id),
  CHECK (
    (date_of_birth IS NULL AND dob_md IS NULL) OR
    (date_of_birth IS NOT NULL AND dob_md IS substr(date_of_birth, 6, 5))
  )
);
```

### student_profiles

```sql
CREATE TABLE student_profiles (
  user_id TEXT PRIMARY KEY,
  school_id TEXT NOT NULL,
  student_code TEXT NOT NULL,
  admission_number TEXT NOT NULL,
  first_name TEXT NOT NULL,
  middle_name TEXT,
  last_name TEXT NOT NULL,
  gender TEXT,
  date_of_birth TEXT,
  dob_md TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  parent_name TEXT,
  parent_phone TEXT,
  parent_email TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  UNIQUE (school_id, student_code),
  UNIQUE (school_id, admission_number),
  UNIQUE (user_id, school_id),
  FOREIGN KEY (user_id, school_id) REFERENCES users(id, school_id),
  CHECK (
    (date_of_birth IS NULL AND dob_md IS NULL) OR
    (date_of_birth IS NOT NULL AND dob_md IS substr(date_of_birth, 6, 5))
  )
);
```

**No migration required.** All necessary fields and indexes already exist.

---

## V1 Exclusions

The following features are **not included** in Task 11:

1. **Student self-service profile editing** — Students can view but not edit
2. **Teacher viewing all teacher birthdays** — Only Principal has teacher birthday access
3. **Subject teacher birthday access** — Only class teachers get student birthday access
4. **Parent accounts** — Not implemented
5. **Birthday notifications** — Query endpoints only, no automated notifications
6. **Excel import/export** — Not included in this task
7. **Dashboard widgets** — Backend only, no dashboard implementation
8. **Profile photo upload** — Not implemented
9. **Custom profile fields** — Schema uses existing fields only
10. **Bulk profile updates** — One profile at a time only

---

## Authorization Security Review

### Cross-School Access ✅

All queries use `WHERE school_id = tenant.schoolId`:
- Teacher profiles
- Student profiles
- Current enrollments
- Birthdays

Cross-school IDs produce 403/404, never leak data.

### Class Teacher Scope ✅

Teacher student access requires:
1. Student has current enrollment
2. Classroom has `class_teacher_id = teacher.user_id`

Verified in `verifyTeacherStudentAccess()`.

### Student Self-Service ✅

Students use `/me/profile` endpoint, which derives `tenant.userId` from JWT.

Route parameter `userId` is never trusted for student self-service.

### Minor DOB Privacy ✅

Student birthday endpoints return:
```typescript
{
  user_id: string;
  student_code: string;
  first_name: string;
  middle_name: string | null;
  last_name: string;
  classroom_code: string;
  grade_name: string;
  division_name: string;
  dob_md: string; // MM-DD only
  // full_dob is NOT included
}
```

Full DOB only exposed in direct profile view (authorized).

### Profile Mutation Authorization ✅

Update operations check:
- Principal: can edit any profile in school
- Teacher: can edit self only
- Student: cannot edit (V1)

Account security fields are never updated through profile routes.

---

## Example Workflows

### 1. Principal Views Student Profile

```http
GET /students/01HZSK9Q5Y7J8XWVN6T4C3K2M1
Authorization: Bearer <principal-jwt>
```

Response:
```json
{
  "data": {
    "user_id": "01HZSK9Q5Y7J8XWVN6T4C3K2M1",
    "school_id": "01HZSK8P4Q6R7SZAW5X3B2N1D0",
    "student_code": "S-000123",
    "admission_number": "2023-000045",
    "first_name": "Rahul",
    "middle_name": null,
    "last_name": "Patil",
    "gender": "Male",
    "date_of_birth": "2010-09-20",
    "dob_md": "09-20",
    "phone": "9876543210",
    "email": "rahul@example.com",
    "address": "Mumbai, Maharashtra",
    "parent_name": "Mr. Patil",
    "parent_phone": "9876543211",
    "parent_email": "parent@example.com",
    "status": "active",
    "created_at": 1700000000000,
    "updated_at": 1700000000000,
    "current_enrollment": {
      "enrollment_id": "01HZSK...",
      "academic_year_id": "01HZSK...",
      "academic_year_label": "2024-25",
      "academic_year_status": "current",
      "classroom_id": "01HZSK...",
      "classroom_code": "10-A",
      "grade_name": "10",
      "division_name": "A",
      "grade_level": 10,
      "roll_number": 15,
      "enrollment_status": "active",
      "joined_on": "2024-04-01",
      "class_teacher_id": "01HZSK...",
      "class_teacher_name": "Mrs. Sharma"
    }
  }
}
```

### 2. Teacher Views Class Student Birthdays

```http
GET /birthdays/students?month=9
Authorization: Bearer <teacher-jwt>
```

Response (only students in teacher's assigned classroom):
```json
{
  "data": [
    {
      "user_id": "01HZSK9Q5Y7J8XWVN6T4C3K2M1",
      "student_code": "S-000123",
      "first_name": "Rahul",
      "middle_name": null,
      "last_name": "Patil",
      "classroom_code": "10-A",
      "grade_name": "10",
      "division_name": "A",
      "dob_md": "09-20"
    }
  ]
}
```

Note: Year is NOT included.

### 3. Principal Updates Student Profile

```http
PUT /students/01HZSK9Q5Y7J8XWVN6T4C3K2M1/profile
Authorization: Bearer <principal-jwt>
Content-Type: application/json

{
  "phone": "9876543299",
  "address": "New Address, Mumbai",
  "parent_email": "newemail@example.com"
}
```

Response: Updated profile with audit log entry.

### 4. Student Views Own Profile

```http
GET /me/profile
Authorization: Bearer <student-jwt>
```

Response:
```json
{
  "data": {
    "type": "student",
    "profile": {
      "user_id": "01HZSK9Q5Y7J8XWVN6T4C3K2M1",
      "first_name": "Rahul",
      "date_of_birth": "2010-09-20",
      ...
    }
  }
}
```

Student sees full DOB for self.

---

## Summary

Task 11 provides comprehensive profile and birthday management with:

- ✅ Teacher profile view/edit
- ✅ Student profile view/edit
- ✅ Current enrollment derivation (no denormalized classroom ID)
- ✅ Historical enrollment query (Principal only)
- ✅ Teacher birthday queries (Principal only)
- ✅ Student birthday queries (Principal + class teachers)
- ✅ Minor DOB privacy (MM-DD only in birthday lists)
- ✅ Self-service profile viewing (via `/me/profile`)
- ✅ Role-based authorization
- ✅ Tenant isolation
- ✅ Account lifecycle respect
- ✅ Audit logging
- ✅ Zod validation
- ✅ Typed errors
- ✅ No database migration required

The module integrates cleanly with existing Account Management, Academic Structure, Authorization, and Audit modules.
