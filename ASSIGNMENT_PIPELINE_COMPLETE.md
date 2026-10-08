# Assignment Pipeline - Complete Implementation

## Overview
Complete assignment management system for teachers and students. Teachers can create assignments with PDF attachments, and students can view and download them.

## Features Implemented

### Teacher Features
✅ **Create Assignments**
- Create assignments for specific classroom and subject
- Add title, description, and due date
- Upload PDF attachments
- Draft/Publish workflow
- Only teachers with teaching assignment for that classroom+subject can create

✅ **View Assignments**
- List all assignments for their teaching assignments
- Filter by classroom, subject, and academic year
- View assignment details with all attachments
- See student count and due dates

✅ **Manage Assignments**
- Edit draft assignments
- Upload multiple PDF attachments
- Publish assignments (makes them visible to students)
- Close assignments
- Delete attachments

### Student Features
✅ **View Assignments**
- See all published assignments for their classroom
- Filter by subject and due date status
- View upcoming vs past-due assignments
- Clear visual indicators for overdue assignments

✅ **Download Attachments**
- View all attachments for each assignment
- Download PDF files
- No submission capability (view-only)

### Authorization Rules
✅ **Teachers**
- Must have teaching assignment for classroom+subject to create/edit
- Class teachers can view assignments for their class but can only edit assignments for subjects they teach
- Can only modify assignments in draft status
- Can publish and close their own assignments

✅ **Students**
- Can only view published assignments
- Can only see assignments for their enrolled classroom
- Can download attachments from published assignments

✅ **Principal**
- No access to assignments (teachers and students only)

## Database Schema

### assignments table
```sql
- id (TEXT, PRIMARY KEY)
- school_id (TEXT, NOT NULL)
- academic_year_id (TEXT, NOT NULL)
- classroom_id (TEXT, NOT NULL)
- subject_id (TEXT, NOT NULL)
- created_by (TEXT, NOT NULL) -- teacher user_id
- title (TEXT, NOT NULL)
- description (TEXT)
- due_at (INTEGER) -- Unix timestamp
- status (TEXT, DEFAULT 'draft') -- draft, published, closed
- created_at (INTEGER, NOT NULL)
- updated_at (INTEGER, NOT NULL)
```

### assignment_attachments table
```sql
- id (TEXT, PRIMARY KEY)
- assignment_id (TEXT, NOT NULL)
- file_name (TEXT, NOT NULL)
- r2_key (TEXT, NOT NULL) -- Cloudflare R2 storage key
- content_type (TEXT) -- application/pdf
- size_bytes (INTEGER)
- uploaded_by (TEXT, NOT NULL) -- teacher user_id
- created_at (INTEGER, NOT NULL)
```

## API Endpoints

### Teacher Endpoints
```
POST   /assignments                          - Create assignment
GET    /assignments                          - List assignments (filtered by teaching)
GET    /assignments/:id                      - Get assignment details
PUT    /assignments/:id                      - Update assignment (draft only)
POST   /assignments/:id/publish              - Publish assignment
POST   /assignments/:id/close                - Close assignment
POST   /assignments/:id/attachments          - Upload attachment (PDF only)
GET    /assignments/:id/attachments          - List attachments
GET    /assignments/:id/attachments/:attId   - Download attachment
DELETE /assignments/:id/attachments/:attId   - Delete attachment
```

### Student Endpoints
```
GET /me/assignments                          - List published assignments for student's classroom
```

## Frontend Routes

### Teacher Routes
```
/teacher/assignments          - List all assignments
/teacher/assignments/new      - Create new assignment form
/teacher/assignments/:id      - Assignment detail page
```

### Student Routes
```
/student/assignments          - List assignments with filters
```

## Navigation

### Teacher Sidebar
- Dashboard
- My Students
- Attendance
- Marks
- **Assignments** ← NEW
- Timetable

### Student Sidebar
- Dashboard
- Timetable
- My Attendance
- My Marks
- **Assignments** ← NEW
- Fees
- My Profile

## File Upload

### Restrictions
- **PDF files only** (enforced in UI and backend)
- Stored in Cloudflare R2 bucket
- File size limits: Check R2 configuration

### Storage Structure
```
assignments/{assignment_id}/{attachment_id}.pdf
```

## Workflow

### Teacher Workflow
1. Navigate to **Assignments** from sidebar
2. Click **"New Assignment"** button
3. Fill in form:
   - Select classroom (only their teaching assignments)
   - Select subject (only their teaching assignments)
   - Enter title and description
   - Set due date
4. Click **"Create Assignment"** (saves as draft)
5. Upload PDF attachments
6. Click **"Publish"** to make visible to students
7. Optionally **"Close"** when assignment period is over

### Student Workflow
1. Navigate to **Assignments** from sidebar
2. View list of published assignments for their classroom
3. Filter by subject or due date status
4. Click on assignment to view details
5. Download PDF attachments
6. See visual indicators for upcoming/overdue assignments

## Status Lifecycle

```
draft → published → closed
```

- **draft**: Only visible to creator teacher, can be edited
- **published**: Visible to students, cannot be edited
- **closed**: No longer active, but still visible

## Technical Implementation

### Backend
- Service: `apps/api/src/assignments/assignments.service.ts`
- Routes: `apps/api/src/assignments/assignments.routes.ts`
- Validation: `apps/api/src/assignments/assignments.validation.ts`
- Authorization: Uses existing `authz.service.ts` for teaching assignment checks

### Frontend
- Teacher List: `apps/web/src/pages/Assignments.tsx`
- Teacher Form: `apps/web/src/pages/AssignmentForm.tsx`
- Teacher Detail: `apps/web/src/pages/AssignmentDetail.tsx`
- Student List: `apps/web/src/pages/StudentAssignments.tsx`
- API Service: `apps/web/src/services/api.ts`

### API Service Methods
```typescript
getAssignments(params)                    // List assignments
getAssignmentById(id)                     // Get single assignment
createAssignment(data)                    // Create new assignment
updateAssignment(id, data)                // Update assignment
publishAssignment(id)                     // Publish assignment
closeAssignment(id)                       // Close assignment
uploadAssignmentAttachment(id, file)      // Upload PDF
getAssignmentAttachments(id)              // List attachments
downloadAssignmentAttachment(id, attId)   // Download PDF
deleteAssignmentAttachment(id, attId)     // Delete attachment
getStudentMeAssignments()                 // Student: get assignments
```

## Deployment

### API
```bash
cd apps/api
wrangler deploy
```
**Latest Version:** `30d830e9-692e-4a0b-9efb-197f9bd40644`
**URL:** https://sms-api.nmvpmsms.workers.dev

### Frontend
```bash
cd apps/web
npm run build
wrangler pages deploy dist --project-name=sms-web --commit-dirty=true
```
**Latest Version:** https://8308a389.sms-web-34u.pages.dev
**Production URL:** https://sms-web-34u.pages.dev

## Testing Checklist

### As Teacher
- [ ] Navigate to Assignments page
- [ ] Create new assignment with PDF attachment
- [ ] Verify classroom and subject filtered by teaching assignments
- [ ] Upload multiple PDF files
- [ ] Publish assignment
- [ ] Verify cannot edit published assignment
- [ ] Try to create assignment for non-assigned classroom (should fail)

### As Student
- [ ] Navigate to Assignments page
- [ ] View published assignments for classroom
- [ ] Filter by subject
- [ ] Filter by upcoming/past due
- [ ] Download PDF attachment
- [ ] Verify cannot see draft assignments

### Authorization Tests
- [ ] Teacher without teaching assignment cannot create for classroom
- [ ] Student can only see assignments for enrolled classroom
- [ ] Principal has no access (no menu item, routes blocked)

## Notes

1. **PDF Only**: System enforces PDF-only uploads for consistency
2. **No Submissions**: Students can only view/download, no submission feature
3. **Teaching Assignment Required**: Teachers must have active teaching assignment for classroom+subject
4. **Principal Excluded**: As requested, principals have no access to assignment features
5. **Class Teacher**: If class teacher teaches a subject in their class, they can create assignments for that subject

## Future Enhancements (Not Implemented)

- Student assignment submissions
- Grading/marking of submissions
- Assignment templates
- Batch assignment creation
- Email notifications
- Assignment analytics
- Support for other file types (images, docs)
- Assignment categories/tags
- Recurring assignments

