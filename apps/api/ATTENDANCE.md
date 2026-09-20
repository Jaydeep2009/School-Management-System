# Attendance Management Module

## Overview

The Attendance Management module handles recording and reporting of student attendance for classroom teaching sessions. It enforces strict authorization rules, maintains audit trails, and supports configurable edit windows.

## Attendance Model

### Attendance Session
Represents a teaching session for:
- **Classroom** + **Subject** + **Date** + **Period**

Each session is unique and identified by these four components.

### Attendance Entry
Individual student attendance record with:
- **Status**: `present` or `absent` (only these two values)
- **Student**: Must be enrolled in the session's classroom
- **Enrollment**: Valid enrollment linking student to classroom

### Session Status
- **open**: Teachers can mark/modify attendance (within edit window)
- **locked**: Only principal can modify (override)

## Permissions

### Principal
- Create sessions for any classroom/subject
- View all attendance in the school
- Mark/modify attendance for any session (including locked sessions)
- Lock/unlock any session
- Override teacher edit window restrictions
- All overrides are audited

### Teacher
- Create sessions only for assigned classroom+subject (via teaching_assignments)
- Mark/modify attendance only for assigned classroom+subject
- Can modify only within the edit window (default: 48 hours)
- Cannot modify locked sessions (principal override required)
- Lock sessions for their assigned subjects

### Class Teacher (Special Rule)
- A class teacher is identified by `classrooms.class_teacher_id`
- **VIEW**: Can view attendance for all subjects in their classroom
- **MODIFY**: Can only modify attendance for subjects they are assigned to (via teaching_assignments)
- Being a class teacher does NOT grant modification permission for unassigned subjects

### Student
- View own attendance only via `/me/attendance` endpoint
- Cannot view other students' attendance
- Cannot mark or modify attendance

## Edit Window

Teachers can modify attendance only within a configurable time window after the session is created.

### Configuration
Stored in school settings:
```json
{
  "attendance": {
    "teacherEditWindowHours": 48
  }
}
```

Default: 48 hours if not configured

### Enforcement
- Within window + session open → Teacher can modify
- Outside window → Teacher cannot modify, Principal can override
- Session locked → Only Principal can modify

## API Endpoints

### Create Attendance Session
```
POST /attendance/sessions
Authorization: Principal or assigned teacher

Body:
{
  "classroom_id": "string",
  "subject_id": "string",
  "session_date": "YYYY-MM-DD",
  "period_no": 1
}

Response: 201 Created
{
  "data": { AttendanceSession }
}
```

### List Attendance Sessions
```
GET /attendance/sessions?classroom_id=...&subject_id=...&from_date=...&to_date=...
Authorization: Principal or authorized teacher

Response: 200 OK
{
  "data": [{ AttendanceSessionWithDetails }]
}
```

### Get Session Details
```
GET /attendance/sessions/:id
Authorization: Principal or authorized teacher

Response: 200 OK
{
  "data": { AttendanceSession }
}
```

### Get Session Entries
```
GET /attendance/sessions/:id/entries
Authorization: Principal or authorized teacher

Response: 200 OK
{
  "data": [{ AttendanceEntryWithStudent }]
}
```

### Mark Attendance (Bulk)
```
PUT /attendance/sessions/:id/entries
Authorization: Principal or assigned teacher (within edit window)

Body:
{
  "entries": [
    {
      "student_id": "string",
      "status": "present" | "absent"
    }
  ]
}

Response: 200 OK
{
  "data": { "updated": number }
}
```

### Lock Session
```
POST /attendance/sessions/:id/lock
Authorization: Principal or assigned teacher

Response: 200 OK
{
  "message": "Session locked successfully"
}
```

### Unlock Session
```
POST /attendance/sessions/:id/unlock
Authorization: Principal only

Response: 200 OK
{
  "message": "Session unlocked successfully"
}
```

### Get Student Summary
```
GET /attendance/students/:studentId/summary?academic_year_id=...&classroom_id=...
Authorization: Principal, authorized teacher, or the student

Response: 200 OK
{
  "data": {
    "total_sessions": number,
    "present": number,
    "absent": number,
    "percentage": number
  }
}
```

### Get Student Subject-wise Attendance
```
GET /attendance/students/:studentId/subject-wise?academic_year_id=...
Authorization: Principal, authorized teacher, or the student

Response: 200 OK
{
  "data": [
    {
      "subject_id": "string",
      "subject_name": "string",
      "total_sessions": number,
      "present": number,
      "absent": number,
      "percentage": number
    }
  ]
}
```

### Get Classroom Report
```
GET /attendance/classrooms/:classroomId/report?subject_id=...&from_date=...&to_date=...
Authorization: Principal or authorized teacher

Response: 200 OK
{
  "data": [
    {
      "student_id": "string",
      "student_code": "string",
      "student_name": "string",
      "total_sessions": number,
      "present": number,
      "absent": number,
      "percentage": number
    }
  ]
}
```

### Get My Attendance (Student Self-service)
```
GET /me/attendance
Authorization: Student only

Response: 200 OK
{
  "data": {
    "summary": { AttendanceSummary },
    "subject_wise": [{ SubjectAttendanceSummary }]
  }
}
```

## Attendance Calculation

**Percentage Formula:**
```
percentage = (present_sessions / total_sessions) × 100
```

Rounded to 2 decimal places.

## Security & Validation

### School Isolation
- All queries are school-scoped
- Cross-school access is denied
- School ID is derived from authenticated context, never from client

### Enrollment Validation
- Every attendance entry must correspond to a valid enrollment
- Student must be enrolled in the session's classroom
- Enrollment must be for the same academic year

### Duplicate Prevention
- Database enforces unique constraint: classroom + subject + date + period
- Duplicate session creation is rejected (409 Conflict)

### IDOR Prevention
- Teacher A cannot access Teacher B's classrooms
- Student A cannot view Student B's attendance
- All endpoints verify authorization before data access

### Audit Trail
All attendance operations are audited:
- `created` - Session created
- `marked_attendance` - Attendance marked/updated
- `locked` - Session locked
- `unlocked` - Session unlocked

Principal overrides are explicitly logged.

## Database Constraints

The module relies on these database integrity constraints:

1. **Unique Session**: `(classroom_id, subject_id, session_date, period_no)`
2. **Unique Entry**: `(session_id, student_id)`
3. **Foreign Keys**:
   - `classroom_id` → classrooms
   - `subject_id` → subjects
   - `enrollment_id` → enrollments
   - `taken_by` → users
   - `updated_by` → users

## Bulk Attendance Write Behavior

Bulk attendance marking validates all entries before committing any writes:

1. **Pre-validation**: All students and their enrollments are validated before any database writes
2. **Batch execution**: D1's `batch()` API is used to execute all insert/update statements
3. **Atomicity**: D1 batch statements execute in order within a single HTTP request
4. **Failure behavior**: If validation fails, no entries are written; if a batch statement fails, subsequent statements in that batch are not executed

**Important**: D1 does not provide traditional ACID transaction guarantees or automatic rollback across all statements. The implementation validates comprehensively before writes to minimize partial-write scenarios.

## Not Implemented (Future Work)

- Parent attendance access
- Notifications (SMS/email/WhatsApp)
- Biometric/GPS attendance
- Late/excused/half-day statuses
- Automated disciplinary actions based on percentage
- Attendance percentage thresholds
- Leave management

## Error Codes

- `ATTENDANCE_SESSION_NOT_FOUND` (404)
- `ATTENDANCE_SESSION_LOCKED` (400)
- `ATTENDANCE_DUPLICATE_SESSION` (409)
- `ATTENDANCE_NOT_AUTHORIZED` (403)
- `ATTENDANCE_EDIT_WINDOW_EXPIRED` (403)
- `ATTENDANCE_INVALID_STUDENT` (400)
- `ATTENDANCE_INVALID_ENROLLMENT` (400)
- `ATTENDANCE_INVALID_STATUS` (400)
- `ATTENDANCE_ACADEMIC_YEAR_CLOSED` (400)
- `ATTENDANCE_INVALID_CLASSROOM` (404)
- `ATTENDANCE_INVALID_SUBJECT` (404)
- `ATTENDANCE_INVALID_ASSIGNMENT` (403)
