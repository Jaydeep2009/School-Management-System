# Marks & Assessments Management Module

## Overview

The Marks & Assessments Management module handles creation, publication, and reporting of student assessments and marks. It enforces strict authorization rules, maintains audit trails, and supports weighted grading calculations.

## Assessment Model

### Assessment
Represents an evaluation for a specific classroom and subject:
- **Classroom** + **Subject** + **Name** (unique together)
- **Max Marks**: Maximum possible score (must be > 0)
- **Weightage**: Optional weightage for aggregation (>= 0)
- **Held On**: Optional date when assessment was conducted
- **Status**: Published and locked flags

### Mark Entry
Individual student mark record:
- **Status**: `graded`, `absent`, or `exempt` (only these three values)
- **Marks Obtained**: Numeric value for graded, null for absent/exempt
- **Student**: Must be enrolled in the assessment's classroom
- **Enrollment**: Valid enrollment linking student to classroom

### Assessment Lifecycle
- **Created**: `is_published = false`, `is_locked = false` (draft)
- **Published**: `is_published = true` (visible to students)
- **Locked**: `is_locked = true` (teacher modification restricted)

## Permissions

### Principal
- Create assessments for any classroom/subject
- View all assessments in the school
- Modify assessments (including locked ones - logged as override)
- Enter/modify marks for any assessment
- Publish and lock any assessment
- Unlock any assessment
- View all student marks
- All overrides are audited

### Teacher
- Create assessments only for assigned classroom+subject (via teaching_assignments)
- Modify assessments only for assigned classroom+subject
- Cannot modify locked assessments (principal override required)
- Enter/modify marks only for assigned classroom+subject
- Publish and lock assessments for assigned subjects
- View marks for assigned subjects

### Class Teacher (Special Rule)
- A class teacher is identified by `classrooms.class_teacher_id`
- **VIEW**: Can view marks for all subjects in their classroom
- **MODIFY**: Can only modify marks for subjects they are assigned to (via teaching_assignments)
- Being a class teacher does NOT grant modification permission for unassigned subjects

**Example:**
Teacher A is class teacher of 10-A and teaches Mathematics in 10-A (has teaching_assignment).

- Mathematics (assigned): CREATE ✓, VIEW ✓, MODIFY ✓, PUBLISH/LOCK ✓
- English (not assigned): CREATE ✗, VIEW ✓, MODIFY ✗, PUBLISH/LOCK ✗
- Science (not assigned): CREATE ✗, VIEW ✓, MODIFY ✗, PUBLISH/LOCK ✗

Class teacher role provides **view-only** access to unassigned subjects.

### Student
- View own marks only via `/me/marks` endpoint
- Can only see published assessments
- Cannot view other students' marks
- Cannot create, modify, or publish assessments
- Cannot enter or modify marks

## Mark Status Semantics

### Graded
```
status = 'graded'
marks_obtained = numeric value (0 <= marks <= max_marks)
```

### Absent
```
status = 'absent'
marks_obtained = null
```
Do NOT represent absent as 0 marks with graded status.

### Exempt
```
status = 'exempt'
marks_obtained = null
```
Used when a student is exempted from an assessment.

## API Endpoints

### Create Assessment
```
POST /marks/assessments
Authorization: Principal or assigned teacher

Body:
{
  "classroom_id": "string",
  "subject_id": "string",
  "name": "Unit Test 1",
  "max_marks": 50,
  "weightage": 10,
  "held_on": "2026-09-20"
}

Response: 201 Created
{
  "data": { Assessment }
}
```

### List Assessments
```
GET /marks/assessments?classroom_id=...&subject_id=...&academic_year_id=...&is_published=true
Authorization: Principal, authorized teacher, or student

Response: 200 OK
{
  "data": [{ AssessmentWithDetails }]
}
```

Students only see published assessments.

### Get Assessment Details
```
GET /marks/assessments/:id
Authorization: Principal or authorized teacher

Response: 200 OK
{
  "data": { AssessmentWithDetails }
}
```

### Update Assessment
```
PUT /marks/assessments/:id
Authorization: Principal or assigned teacher (if not locked)

Body:
{
  "name": "Unit Test 1 - Revised",
  "max_marks": 60,
  "weightage": 15,
  "held_on": "2026-09-25"
}

Response: 200 OK
{
  "message": "Assessment updated successfully"
}
```

### Publish Assessment
```
POST /marks/assessments/:id/publish
Authorization: Principal or assigned teacher

Response: 200 OK
{
  "message": "Assessment published successfully"
}
```

Once published, students can view their marks.

### Lock Assessment
```
POST /marks/assessments/:id/lock
Authorization: Principal or assigned teacher

Response: 200 OK
{
  "message": "Assessment locked successfully"
}
```

Once locked, normal teachers cannot modify marks. Principal can override.

### Unlock Assessment
```
POST /marks/assessments/:id/unlock
Authorization: Principal only

Response: 200 OK
{
  "message": "Assessment unlocked successfully"
}
```

### Enter/Update Marks (Bulk)
```
PUT /marks/assessments/:id/marks
Authorization: Principal or assigned teacher (if not locked)

Body:
{
  "entries": [
    {
      "student_id": "student-1",
      "status": "graded",
      "marks_obtained": 42
    },
    {
      "student_id": "student-2",
      "status": "absent",
      "marks_obtained": null
    },
    {
      "student_id": "student-3",
      "status": "exempt",
      "marks_obtained": null
    }
  ]
}

Response: 200 OK
{
  "data": { "updated": 3 }
}
```

**Bulk Entry Limit**: Maximum 500 entries per request.

### Get Assessment Marks
```
GET /marks/assessments/:id/marks
Authorization: Principal or authorized teacher

Response: 200 OK
{
  "data": [{ MarkWithStudent }]
}
```

### Get Student Marks Summary
```
GET /marks/students/:studentId/summary?academic_year_id=...&classroom_id=...&subject_id=...
Authorization: Principal, authorized teacher, or the student

Response: 200 OK
{
  "data": [
    {
      "assessment_id": "...",
      "assessment_name": "Unit Test 1",
      "subject_id": "...",
      "subject_name": "Mathematics",
      "max_marks": 50,
      "weightage": 10,
      "marks_obtained": 42,
      "status": "graded",
      "held_on": "2026-09-20",
      "is_published": true
    }
  ]
}
```

### Get Student Subject-wise Marks
```
GET /marks/students/:studentId/subject-wise?academic_year_id=...&classroom_id=...
Authorization: Principal, authorized teacher, or the student

Response: 200 OK
{
  "data": [
    {
      "subject_id": "...",
      "subject_name": "Mathematics",
      "assessments": [
        {
          "assessment_id": "...",
          "assessment_name": "Unit Test 1",
          "max_marks": 50,
          "weightage": 10,
          "marks_obtained": 42,
          "status": "graded",
          "held_on": "2026-09-20",
          "weighted_contribution": 8.4
        }
      ],
      "total_weighted": 8.4,
      "total_weightage": 10
    }
  ]
}
```

### Get Classroom Marks Report
```
GET /marks/classrooms/:classroomId/report?subject_id=...&assessment_id=...
Authorization: Principal or authorized teacher

Response: 200 OK
{
  "data": [
    {
      "student_id": "...",
      "student_code": "S000001",
      "student_name": "John Doe",
      "roll_number": "1",
      "marks": [
        {
          "assessment_id": "...",
          "assessment_name": "Unit Test 1",
          "max_marks": 50,
          "marks_obtained": 42,
          "status": "graded"
        }
      ]
    }
  ]
}
```

### Get My Marks (Student Self-service)
```
GET /me/marks
Authorization: Student only

Response: 200 OK
{
  "data": {
    "summary": [{ StudentAssessmentSummary }],
    "subject_wise": [{ SubjectMarksSummary }]
  }
}
```

## Grading & Aggregation

### Weighted Contribution
Formula: `(marks_obtained / max_marks) × weightage`

Example:
- Max marks: 50
- Marks obtained: 40
- Weightage: 10
- Weighted contribution: (40/50) × 10 = 8

### Aggregate Weighted Marks
For a subject with multiple assessments:
- Sum of all weighted contributions = Total weighted
- Sum of all weightages = Total weightage

### Absent/Exempt Handling
- Absent and exempt assessments are excluded from numerical aggregation
- Their status is preserved in reports
- Do NOT convert absent/exempt to 0 marks

## Security & Validation

### School Isolation
- All queries are school-scoped
- Cross-school access is denied
- School ID is derived from authenticated context, never from client

### Enrollment Validation
- Every mark entry must correspond to a valid enrollment
- Student must be enrolled in the assessment's classroom
- Enrollment must be for the same academic year

### Duplicate Prevention
- Database enforces unique constraint: classroom + subject + name
- Duplicate assessment creation is rejected (409 Conflict)

### IDOR Prevention
- Teacher A cannot access Teacher B's unrelated classrooms
- Student A cannot view Student B's marks
- All endpoints verify authorization before data access

### Mark Bounds Validation
- Graded marks must be: `0 <= marks_obtained <= max_marks`
- Negative marks rejected
- Marks over max rejected
- Absent/exempt must have null marks

### Audit Trail
All assessment and marks operations are audited:
- `assessment_created` - Assessment created
- `assessment_updated` - Assessment updated
- `assessment_updated_override` - Assessment updated by principal (locked)
- `assessment_published` - Assessment published
- `assessment_locked` - Assessment locked
- `assessment_unlocked` - Assessment unlocked
- `marks_entered` - Marks entered/updated
- `marks_entered_override` - Marks entered by principal (locked assessment)

Principal overrides are explicitly logged.

## Database Constraints

The module relies on these database integrity constraints:

1. **Unique Assessment**: `(classroom_id, subject_id, name)`
2. **Unique Mark**: `(assessment_id, student_id)`
3. **Max Marks Check**: `max_marks > 0`
4. **Weightage Check**: `weightage IS NULL OR weightage >= 0`
5. **Mark Status Check**: Status must be graded/absent/exempt with appropriate marks_obtained
6. **Foreign Keys**:
   - `classroom_id` → classrooms
   - `subject_id` → subjects
   - `enrollment_id` → enrollments
   - `created_by` → users
   - `updated_by` → users

## Bulk Marks Write Behavior

Bulk marks entry validates all entries before committing any writes:

1. **Pre-validation**: All students, enrollments, and mark values are validated before any database writes
2. **Batch execution**: D1's `batch()` API is used to execute all insert/update statements
3. **Atomicity**: D1 batch statements execute in order within a single HTTP request
4. **Failure behavior**: If validation fails, no entries are written; if a batch statement fails, subsequent statements in that batch are not executed

**Important**: D1 does not provide traditional ACID transaction guarantees or automatic rollback across all statements. The implementation validates comprehensively before writes to minimize partial-write scenarios.

## Academic Year Rules

- Assessments belong to the classroom's academic year
- Normal teachers cannot create assessments for closed academic years
- Principal can override this restriction
- Historical marks remain accessible according to authorization rules

## Authorization Matrix

The system does NOT have a separate "class teacher" role. Authorization is based on:
- **Principal**: Full school authority
- **Teacher with teaching assignment**: Create/modify/publish/lock for assigned subjects
- **Teacher who is class teacher**: View-only access to all subjects in their classroom

| User Type                           | Create | View | Modify | Modify Locked | Publish/Lock | Unlock |
| ----------------------------------- | ------ | ---- | ------ | ------------- | ------------ | ------ |
| **Principal**                       | ✓ All  | ✓ All| ✓ All  | ✓ (override)  | ✓            | ✓      |
| **Teacher with assignment**         | ✓ Own  | ✓ Own| ✓ Own  | ✗             | ✓ Own        | ✗      |
| **Teacher as class teacher only**   | ✗      | ✓ All in class | ✗    | ✗             | ✗            | ✗      |
| **Student**                         | ✗      | ✓ Own (published) | ✗  | ✗             | ✗            | ✗      |

**Important**: A teacher who is BOTH class teacher AND has a teaching assignment for a subject gets full create/modify/publish/lock permissions for that subject. Being class teacher alone only grants view access to other subjects.

## Error Codes

- `ASSESSMENT_NOT_FOUND` (404)
- `ASSESSMENT_DUPLICATE` (409)
- `ASSESSMENT_NOT_AUTHORIZED` (403)
- `ASSESSMENT_LOCKED` (400)
- `ASSESSMENT_ALREADY_PUBLISHED` (400)
- `ASSESSMENT_INVALID_CLASSROOM` (404)
- `ASSESSMENT_INVALID_SUBJECT` (404)
- `ASSESSMENT_ACADEMIC_YEAR_CLOSED` (400)
- `MARKS_INVALID_STUDENT` (400)
- `MARKS_INVALID_ENROLLMENT` (400)
- `MARKS_INVALID_STATUS` (400)
- `MARKS_REQUIRED_FOR_GRADED` (400)
- `MARKS_MUST_BE_NULL_FOR_ABSENT` (400)
- `MARKS_MUST_BE_NULL_FOR_EXEMPT` (400)
- `MARKS_OVER_MAX` (400)
- `MARKS_NOT_AUTHORIZED` (403)

## Not Implemented (Future Work)

- Report-card PDF generation
- Parent accounts and parent-accessible marks
- Notifications (SMS/email/WhatsApp) on publication
- Grade letters (A/B/C/D/F)
- Pass/fail thresholds
- GPA/CGPA calculation
- Class ranking and percentile
- Moderation workflows
- Teacher peer review
- Online exams and automatic grading
- AI-based grading
- Student assignment submissions
- Rubric-based grading
- Grade boundaries and curves

## Implementation Notes

### Grading Module Separation
The grading calculation logic (`marks.grading.ts`) is kept separate from:
- Database access
- Authorization
- HTTP routing
- Audit logging

This allows deterministic testing and future extensibility.

### Class Teacher View vs Modify
Class teachers have view access to all subjects in their classroom but can only modify marks for subjects they are explicitly assigned to via `teaching_assignments`.

### Published vs Locked
- **Published**: Makes marks visible to students
- **Locked**: Prevents teacher modification (principal can override)

These are independent flags. An assessment can be published but not locked, allowing continued teacher corrections while students see their marks.
