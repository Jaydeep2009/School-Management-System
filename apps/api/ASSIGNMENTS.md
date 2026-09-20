# Assignments Management Module

## Overview

The Assignments Management module handles creation, distribution, and lifecycle management of homework assignments. It supports private R2 file attachments, enforces strict authorization rules, and maintains audit trails.

## Assignment Model

### Assignment
Represents a homework assignment for a specific classroom and subject:
- **Classroom** + **Subject** + **Title**
- **Due Date**: Optional timestamp
- **Status**: `draft`, `published`, `closed`
- **Attachments**: Private R2 files with metadata

### Assignment Lifecycle

```
DRAFT → PUBLISHED → CLOSED
```

**DRAFT:**
- Created by principal or assigned teacher
- Can be modified
- Attachments can be added/removed
- Not visible to students

**PUBLISHED:**
- Visible to enrolled students
- Cannot be casually modified by teachers
- Attachments should not be replaced
- Principal can perform administrative corrections

**CLOSED:**
- Remains readable/history-visible
- No normal teacher modification
- No new student workflow
- Principal may administratively manage

## Permissions

### Principal
- Create assignments for any classroom/subject
- View all assignments in the school
- Modify assignments (including published/closed)
- Publish and close any assignment
- Manage attachments at any stage
- All administrative actions are audited

### Teacher with Teaching Assignment
- Create assignments only for assigned classroom+subject (via teaching_assignments)
- View assignments for assigned classroom+subject
- Modify **draft** assignments only
- Publish assignments for assigned subjects
- Close assignments for assigned subjects
- Manage attachments for **draft** assignments only

### Class Teacher (Special Rule)
- A class teacher is identified by `classrooms.class_teacher_id`
- **VIEW**: Can view assignments for all subjects in their classroom
- **MODIFY**: Can only modify assignments for subjects they are assigned to (via teaching_assignments)
- Being a class teacher does NOT grant modification permission for unassigned subjects

**Example:**
Teacher A is class teacher of 10-A and teaches Mathematics in 10-A (has teaching_assignment).

- Mathematics (assigned): CREATE ✓, VIEW ✓, MODIFY ✓, PUBLISH/CLOSE ✓, ATTACHMENTS ✓
- English (not assigned): CREATE ✗, VIEW ✓, MODIFY ✗, PUBLISH/CLOSE ✗, ATTACHMENTS ✗
- Science (not assigned): CREATE ✗, VIEW ✓, MODIFY ✗, PUBLISH/CLOSE ✗, ATTACHMENTS ✗

Class teacher role provides **view-only** access to unassigned subjects.

### Student
- View own classroom's published assignments only via `/me/assignments` endpoint
- Cannot create, modify, publish, or close assignments
- Cannot upload teacher attachments
- Can download published assignment attachments
- Identity derived from authenticated token (cannot be spoofed)

## API Endpoints

### Create Assignment
```
POST /assignments
Authorization: Principal or assigned teacher

Body:
{
  "classroom_id": "string",
  "subject_id": "string",
  "title": "Chapter 5 Homework",
  "description": "Complete exercises 1-10",
  "due_at": 1726761600000  // Unix timestamp
}

Response: 201 Created
{
  "data": { Assignment }
}
```

### List Assignments
```
GET /assignments?classroom_id=...&subject_id=...&status=published
Authorization: Principal, authorized teacher, or student

Response: 200 OK
{
  "data": [{ AssignmentWithDetails }]
}
```

Students automatically see only their classroom's published assignments.

### Get Assignment Details
```
GET /assignments/:id
Authorization: Principal, authorized teacher, or student (if published)

Response: 200 OK
{
  "data": { AssignmentWithDetails }
}
```

### Update Assignment
```
PUT /assignments/:id
Authorization: Principal or assigned teacher (draft only)

Body:
{
  "title": "Updated title",
  "description": "Updated description",
  "due_at": 1726848000000
}

Response: 200 OK
{
  "message": "Assignment updated successfully"
}
```

Teachers can only update draft assignments. Principal can update at any stage.

### Publish Assignment
```
POST /assignments/:id/publish
Authorization: Principal or assigned teacher

Response: 200 OK
{
  "message": "Assignment published successfully"
}
```

Makes the assignment visible to students.

### Close Assignment
```
POST /assignments/:id/close
Authorization: Principal or assigned teacher

Response: 200 OK
{
  "message": "Assignment closed successfully"
}
```

Marks the assignment as closed. Can only close published assignments.

### Upload Attachment
```
POST /assignments/:id/attachments
Authorization: Principal or assigned teacher (draft only)
Content-Type: multipart/form-data

Form Data:
- file: <binary file>

Response: 201 Created
{
  "data": {
    "id": "string",
    "file_name": "homework.pdf",
    "content_type": "application/pdf",
    "size_bytes": 524288,
    "created_at": 1726761600000
  }
}
```

**Maximum file size**: 50MB  
**Allowed types**: PDF, PNG, JPEG, WebP, DOC/DOCX, XLS/XLSX, PPT/PPTX, TXT

### List Attachments
```
GET /assignments/:id/attachments
Authorization: Principal, authorized teacher, or student (if published)

Response: 200 OK
{
  "data": [{ AttachmentResponse }]
}
```

### Download Attachment
```
GET /assignments/:id/attachments/:attachmentId
Authorization: Principal, authorized teacher, or student (if published)

Response: 200 OK
Content-Type: <attachment content type>
Content-Disposition: attachment; filename="homework.pdf"

<binary file stream>
```

The server streams the file directly from R2 after authorization.

### Delete Attachment
```
DELETE /assignments/:id/attachments/:attachmentId
Authorization: Principal or assigned teacher (draft only)

Response: 200 OK
{
  "message": "Attachment deleted successfully"
}
```

### Get My Assignments (Student Self-service)
```
GET /me/assignments
Authorization: Student only

Response: 200 OK
{
  "data": [
    {
      "id": "string",
      "subject_name": "Mathematics",
      "title": "Chapter 5 Homework",
      "description": "Complete exercises 1-10",
      "due_at": 1726761600000,
      "created_at": 1726675200000,
      "attachments": [{ AttachmentResponse }]
    }
  ]
}
```

## R2 Attachment Security

### Private Storage
- R2 bucket is **private** (not public)
- No public URLs generated
- All access requires authentication and authorization

### Secure Key Generation
Attachments are stored with secure, collision-resistant keys:
```
schools/{schoolId}/assignments/{assignmentId}/{randomUUID}-{sanitizedFileName}
```

- Client cannot choose the R2 key
- Path traversal prevented
- School isolation enforced
- Randomized to prevent collisions

### Download Flow
1. User requests attachment by ID
2. Server authenticates user
3. Server loads assignment and attachment metadata from D1
4. Server checks authorization (can user view this assignment?)
5. Server retrieves R2 key from trusted D1 record
6. Server fetches object from R2
7. Server streams file to user

**Never** expose arbitrary R2 keys to clients.

### File Validation
- Filename sanitization (remove `../`, `\`, control characters)
- File size limit: 50MB
- Content type validation
- Prevent path traversal attacks

## R2/D1 Consistency

There is no traditional transaction between D1 and R2.

### Upload Process
1. Validate authorization and input
2. Generate secure R2 key
3. Upload file to R2
4. Create metadata record in D1
5. If D1 fails, attempt R2 cleanup
6. Report failure if cleanup also fails

### Delete Process
1. Validate authorization
2. Load metadata from D1
3. Delete object from R2
4. Delete metadata from D1
5. Handle partial failures explicitly

**Important**: D1 does not provide automatic rollback for R2 operations. The implementation validates comprehensively before writes and handles cleanup on failures.

## Authorization Matrix

The system does NOT have a separate "class teacher" role. Authorization is based on:
- **Principal**: Full school authority
- **Teacher with teaching assignment**: Create/modify/publish/close for assigned subjects
- **Teacher who is class teacher**: View-only access to all subjects in their classroom

| User Type                         | Create | View              | Modify      | Publish/Close | Manage Attachments |
| --------------------------------- | ------ | ----------------- | ----------- | ------------- | ------------------ |
| **Principal**                     | ✓ All  | ✓ All             | ✓ All       | ✓             | ✓                  |
| **Teacher with assignment**       | ✓ Own  | ✓ Own             | ✓ Own draft | ✓ Own         | ✓ Own draft        |
| **Teacher as class teacher only** | ✗      | ✓ All in class    | ✗           | ✗             | ✗                  |
| **Student**                       | ✗      | ✓ Own (published) | ✗           | ✗             | download only      |

**Important**: A teacher who is BOTH class teacher AND has a teaching assignment for a subject gets full create/modify/publish/close permissions for that subject. Being class teacher alone only grants view access to other subjects.

## Security & Validation

### School Isolation
- All queries are school-scoped
- Cross-school access denied
- School ID derived from authenticated context, never from client

### IDOR Prevention
- Teacher A cannot access Teacher B's unrelated classrooms
- Student A cannot view Student B's assignments
- Student cannot access unpublished assignments
- All endpoints verify authorization before data access

### Student Self-Access Enforcement
```
TenantContext.userId
  ↓
student_profiles
  ↓
active enrollment
  ↓
classroom
  ↓
published assignments only
```

Students cannot provide arbitrary classroom_id or student_id.

### Attachment Security
- No arbitrary R2 key access
- Filename sanitization
- Size limits enforced
- Content type validation
- Authorization required for download
- Private bucket only

### Academic Validation
When creating assignments:
- Classroom must belong to authenticated school
- Subject must belong to authenticated school
- Teaching assignment must exist for teacher
- Academic year derived from classroom

## Audit Trail

All assignment operations are audited:
- `assignment_created` - Assignment created
- `assignment_updated` - Assignment updated
- `assignment_published` - Assignment published
- `assignment_closed` - Assignment closed
- `assignment_attachment_added` - Attachment uploaded
- `assignment_attachment_deleted` - Attachment deleted

Principal administrative actions are logged with full context.

## Database Constraints

The module relies on these database integrity constraints:

1. **Foreign Keys**:
   - `classroom_id` → classrooms
   - `subject_id` → subjects
   - `created_by` → users
   - `assignment_id` (attachments) → assignments
   - `uploaded_by` (attachments) → users

2. **Status Check**: Status must be `draft`, `published`, or `closed`

3. **Teaching Assignment FK**: Assignment references teaching_assignments table

## Status Transitions

Valid transitions:
- `draft` → `published` ✓
- `published` → `closed` ✓

Invalid transitions:
- `draft` → `closed` ✗ (must publish first)
- `published` → `draft` ✗ (cannot unpublish)
- `closed` → any ✗ (final state)

Principal may perform administrative corrections but cannot reverse core lifecycle logic.

## File Type Support

**Allowed content types:**
- `application/pdf`
- `image/png`, `image/jpeg`, `image/webp`
- `application/msword` (.doc)
- `application/vnd.openxmlformats-officedocument.wordprocessingml.document` (.docx)
- `application/vnd.ms-excel` (.xls)
- `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` (.xlsx)
- `application/vnd.ms-powerpoint` (.ppt)
- `application/vnd.openxmlformats-officedocument.presentationml.presentation` (.pptx)
- `text/plain`

**Maximum size**: 50MB per attachment

## Timezone Handling

Due dates are stored as Unix timestamps. The school's timezone (from `schools.timezone`) should be used when displaying or interpreting dates in the school's local context.

The API accepts and returns timestamps in milliseconds since Unix epoch.

## Error Codes

- `ASSIGNMENT_NOT_FOUND` (404)
- `ASSIGNMENT_FORBIDDEN` (403)
- `ASSIGNMENT_ALREADY_PUBLISHED` (400)
- `ASSIGNMENT_ALREADY_CLOSED` (400)
- `ASSIGNMENT_INVALID_STATUS_TRANSITION` (400)
- `ASSIGNMENT_INVALID_CLASSROOM` (404)
- `ASSIGNMENT_INVALID_SUBJECT` (404)
- `ATTACHMENT_NOT_FOUND` (404)
- `ATTACHMENT_FORBIDDEN` (403)
- `ATTACHMENT_TOO_LARGE` (400)
- `ATTACHMENT_UNSUPPORTED_TYPE` (400)
- `ATTACHMENT_STORAGE_ERROR` (500)
- `ATTACHMENT_CANNOT_MODIFY_PUBLISHED` (400)

## Not Implemented (V1 Exclusions)

The following are explicitly excluded from V1:

- Student submissions
- Submission attachments
- Assignment grading
- Parent accounts and access
- Notifications (SMS/email/push)
- Public R2 URLs or public buckets
- Online submission workflows
- Assignment comments/discussion
- Automatic reminders
- Background jobs or queues
- Assignment templates
- Recurring assignments
- Peer review
- Plagiarism detection

These are future V2/V3 concerns.

## Implementation Notes

### Teaching Assignment Pattern
The authorization logic follows the same pattern as the Marks module:
- Teaching assignment required for create/modify/publish/close
- Class teacher has view-only access without assignment
- Principal has full authority

### Attachment Metadata Only
The `assignment_attachments` table stores **metadata only**. Actual file content is in R2. The `r2_key` is the internal reference used by the server but is not exposed to clients in API responses.

### Atomic Operations
Assignment creation is atomic within D1. Attachment upload is a two-phase operation (R2 upload + D1 metadata) with cleanup on failure.

### Draft Editability
Only draft assignments can be freely modified by teachers. Published/closed assignments require principal authority for corrections. This prevents accidental changes to assignments that students are actively working on.
