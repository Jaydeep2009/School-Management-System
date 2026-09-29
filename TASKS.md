# SMS Project - Task Backlog

**Last Updated**: 2026-09-19  
**Current Sprint**: Sprint 3 - Bug Fixes & Polish  
**Next Sprint**: Sprint 4 - Teacher Dashboard Enhancement

---

## 🔥 CRITICAL - Sprint 3 (This Week)

### TASK-001: Fix Fees List UI - Group by Student
**Priority**: P0 (Critical)  
**Status**: ❌ TODO  
**Effort**: 4 hours  
**Assigned**: Unassigned

**Description**: Rewrite fees list to show one row per student with expandable charge details

**Acceptance Criteria**:
- [ ] One row per student showing: name, student code, total charged, total paid, balance, status
- [ ] Click row to expand/collapse individual charges
- [ ] Expandable section shows: category, amount, paid, balance, due date per charge
- [ ] "Pay" button on each unpaid charge (individual)
- [ ] Status badges: Paid (green), Partial (yellow), Pending (red)
- [ ] Sort by balance descending (highest pending first)
- [ ] Mobile responsive

**Files to Edit**:
- `apps/web/src/pages/Fees.tsx` - Main rewrite

**Implementation Notes**:
```typescript
// Group charges by student
interface StudentFeeSummary {
  student_id: string;
  student_name: string;
  student_code: string;
  total_charged: number;
  total_paid: number;
  balance: number;
  status: 'paid' | 'partially_paid' | 'pending';
  charges: FeeCharge[];
}

// Group function
const groupByStudent = (charges: FeeCharge[]): StudentFeeSummary[] => {
  // Implementation in task
}
```

**Testing**:
- [ ] Create multiple charges for same student
- [ ] Verify totals are accurate
- [ ] Expand/collapse works
- [ ] Payment modal works for individual charges

---

### TASK-002: Enable R2 Storage for File Uploads
**Priority**: P0 (Critical)  
**Status**: ❌ TODO  
**Effort**: 30 minutes  
**Assigned**: Unassigned

**Description**: Enable R2 bucket binding for assignment file uploads

**Acceptance Criteria**:
- [ ] R2 enabled in Cloudflare dashboard
- [ ] Uncomment R2 binding in wrangler.jsonc
- [ ] Deploy API successfully
- [ ] Test file upload (create assignment with attachment)
- [ ] Verify file accessible via R2 URL

**Steps**:
1. Go to Cloudflare Dashboard → R2
2. Create bucket: `sms-uploads`
3. Edit `apps/api/wrangler.jsonc`:
   ```jsonc
   // Uncomment lines 24-30
   [[r2_buckets]]
   binding = "UPLOADS"
   bucket_name = "sms-uploads"
   ```
4. Deploy: `cd apps/api && wrangler deploy`
5. Test assignment creation with file

**Files to Edit**:
- `apps/api/wrangler.jsonc` - Uncomment R2 binding

**Testing**:
- [ ] Create assignment
- [ ] Upload file (< 10MB)
- [ ] Verify file appears in assignments list
- [ ] Download file from student view
- [ ] Check R2 dashboard shows file

---

### TASK-003: Enforce Attendance Edit Window (48 Hours)
**Priority**: P0 (Security)  
**Status**: ❌ TODO  
**Effort**: 2 hours  
**Assigned**: Unassigned

**Description**: Add server-side validation to prevent attendance editing after 48 hours

**Acceptance Criteria**:
- [ ] Cannot edit attendance > 48 hours old (non-principal)
- [ ] Error message: "Edit window expired (48 hours). Contact principal."
- [ ] Principal can override (add `skipEditWindow` flag)
- [ ] UI shows edit window countdown for recent attendance
- [ ] Tests for edit window validation

**Files to Edit**:
- `apps/api/src/attendance/attendance.service.ts` - Add validation
- `apps/api/src/attendance/attendance.routes.ts` - Check principal override
- `apps/web/src/pages/Attendance.tsx` - Show countdown, disable edit button

**Implementation**:
```typescript
// In attendance.service.ts
function validateEditWindow(
  attendanceDate: string,
  userRole: string,
  skipEditWindow?: boolean
): void {
  if (userRole === 'principal' || skipEditWindow) {
    return; // Principals can edit anytime
  }

  const now = new Date();
  const date = new Date(attendanceDate);
  const hoursDiff = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

  if (hoursDiff > 48) {
    throw new Error('Edit window expired (48 hours). Contact principal.');
  }
}

// Call in updateAttendance()
validateEditWindow(existingRecord.date, tenant.role);
```

**Testing**:
- [ ] Teacher edits today's attendance (should work)
- [ ] Teacher edits 2-day-old attendance (should fail)
- [ ] Principal edits old attendance (should work)
- [ ] Error message displays correctly
- [ ] UI shows countdown timer

---

### TASK-004: Implement Password Reset Flow
**Priority**: P0 (Critical)  
**Status**: ❌ TODO  
**Effort**: 8 hours  
**Assigned**: Unassigned

**Description**: Add forgot password functionality with email-based reset

**Acceptance Criteria**:
- [ ] POST /auth/forgot-password endpoint
- [ ] Generate password reset token (ULID, 1-hour expiry)
- [ ] Store token hash in database (new table: password_reset_tokens)
- [ ] Send email with reset link (or show token for now)
- [ ] POST /auth/reset-password endpoint
- [ ] Validate token, update password
- [ ] Frontend: Forgot password page
- [ ] Frontend: Reset password page
- [ ] Audit logging for reset events

**Database Migration**:
```sql
CREATE TABLE password_reset_tokens (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  token_hash TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  used_at INTEGER,
  created_at INTEGER DEFAULT (unixepoch()),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX idx_reset_tokens_user ON password_reset_tokens(user_id);
CREATE INDEX idx_reset_tokens_hash ON password_reset_tokens(token_hash);
```

**Files to Create**:
- `apps/api/src/auth/password-reset.service.ts`
- `apps/web/src/pages/ForgotPassword.tsx`
- `apps/web/src/pages/ResetPassword.tsx`

**Files to Edit**:
- `apps/api/src/auth/auth.routes.ts` - Add routes
- `apps/api/src/auth/auth.schemas.ts` - Add validation
- `apps/web/src/App.tsx` - Add routes

**Testing**:
- [ ] Request reset (valid email)
- [ ] Request reset (invalid email) - no error (security)
- [ ] Token expires after 1 hour
- [ ] Token can only be used once
- [ ] Password successfully updated
- [ ] Can login with new password
- [ ] Audit logs record reset events

---

## 🚀 HIGH PRIORITY - Sprint 4 (Next Week)

### TASK-005: Create Teacher "My Teaching" Page
**Priority**: P1 (High)  
**Status**: ❌ TODO  
**Effort**: 6 hours  
**Assigned**: Unassigned

**Description**: List all teaching assignments for logged-in teacher

**Acceptance Criteria**:
- [ ] GET /me/teaching endpoint (returns teacher's assignments only)
- [ ] Frontend page shows: Classroom, Subject, Days, Time
- [ ] Click assignment to see detail page (students, attendance, marks)
- [ ] Filter by active academic year
- [ ] Sort by classroom code
- [ ] Mobile responsive

**Files to Create**:
- `apps/api/src/accounts/me.routes.ts` - Add /me/teaching endpoint (if not exists, modify existing)
- `apps/web/src/pages/TeacherMyTeaching.tsx`

**Files to Edit**:
- `apps/web/src/App.tsx` - Add route
- `apps/web/src/components/layout/Layout.tsx` - Add nav link

**API Response**:
```typescript
{
  data: [
    {
      id: string,
      classroom_code: string,
      classroom_name: string,
      grade_name: string,
      division_name: string,
      subject_name: string,
      academic_year: string,
      student_count: number
    }
  ]
}
```

**Testing**:
- [ ] Teacher with 3 assignments sees all 3
- [ ] Teacher with no assignments sees empty state
- [ ] Click assignment navigates to detail page
- [ ] Filtering works
- [ ] Mobile layout works

---

### TASK-006: Teacher Attendance Marking Interface
**Priority**: P1 (High)  
**Status**: ❌ TODO  
**Effort**: 8 hours  
**Assigned**: Unassigned

**Description**: Quick attendance marking UI for teachers (only their subjects)

**Acceptance Criteria**:
- [ ] Page shows teacher's classes for today
- [ ] Select class+subject to mark attendance
- [ ] Student list with Present/Absent toggle
- [ ] Bulk actions: Mark All Present, Mark All Absent
- [ ] Shows previously marked attendance (edit mode)
- [ ] Save button with confirmation
- [ ] Success/error messages
- [ ] Edit window countdown visible
- [ ] Only shows subjects teacher teaches (API enforces)

**Files to Create**:
- `apps/web/src/pages/TeacherAttendanceMarking.tsx`

**Files to Edit**:
- `apps/api/src/attendance/attendance.routes.ts` - Filter by teacher
- `apps/web/src/App.tsx` - Add route

**UI Mockup**:
```
┌─────────────────────────────────────────┐
│ Mark Attendance - Sept 19, 2026         │
├─────────────────────────────────────────┤
│ Class: [Dropdown: 1-A, 2-B, ...]        │
│ Subject: [Dropdown: Math, Science, ...] │
├─────────────────────────────────────────┤
│ [✓ Mark All Present] [✗ Mark All Absent]│
├─────────────────────────────────────────┤
│ ☑ Jay Doe (S000001)         [Present ▼] │
│ ☑ Jane Smith (S000002)      [Present ▼] │
│ ☐ John Doe (S000003)        [Absent  ▼] │
│ ...                                      │
├─────────────────────────────────────────┤
│ [Save Attendance]  [Cancel]             │
│ ⏰ Edit window: 47h 23m remaining        │
└─────────────────────────────────────────┘
```

**Testing**:
- [ ] Select class and subject
- [ ] Mark all present works
- [ ] Mark all absent works
- [ ] Individual toggles work
- [ ] Save persists attendance
- [ ] Edit mode loads existing attendance
- [ ] Edit window countdown shows
- [ ] Teacher cannot see other teacher's subjects

---

### TASK-007: Class Teacher Read-Only View (All Subjects)
**Priority**: P1 (High)  
**Status**: ❌ TODO  
**Effort**: 6 hours  
**Assigned**: Unassigned

**Description**: Class teachers can VIEW attendance/marks for ALL subjects in their class (read-only)

**Acceptance Criteria**:
- [ ] GET /me/class-teacher-info endpoint (returns classroom if class teacher)
- [ ] Class teacher sees "Class Overview" link in dashboard
- [ ] Overview page shows attendance matrix (all students × all subjects × dates)
- [ ] Shows marks for all subjects (read-only)
- [ ] Clear indication: "Read-only - You don't teach this subject"
- [ ] No edit buttons for subjects they don't teach
- [ ] Can still edit subjects they DO teach

**Files to Create**:
- `apps/web/src/pages/ClassTeacherOverview.tsx`

**Files to Edit**:
- `apps/api/src/accounts/me.routes.ts` - Add /me/class-teacher-info
- `apps/api/src/attendance/attendance.service.ts` - Add class teacher read access
- `apps/api/src/marks/marks.service.ts` - Add class teacher read access

**Backend Logic**:
```typescript
// In attendance.service.ts
function canViewAttendance(userId, classroomId, subjectId) {
  // Can view if:
  // 1. User teaches this subject, OR
  // 2. User is class teacher of this classroom
  return teachesSubject(userId, classroomId, subjectId) || 
         isClassTeacherOf(userId, classroomId);
}

function canEditAttendance(userId, classroomId, subjectId) {
  // Can edit ONLY if user teaches this subject
  // Class teacher status does NOT grant edit rights
  return teachesSubject(userId, classroomId, subjectId);
}
```

**Testing**:
- [ ] Class teacher sees "Class Overview" link
- [ ] Regular teacher doesn't see link
- [ ] Overview shows all subjects
- [ ] Edit buttons only on subjects they teach
- [ ] "Read-only" badge on other subjects
- [ ] Attendance data accurate
- [ ] Marks data accurate

---

### TASK-008: Add Rate Limiting to Auth Endpoints
**Priority**: P1 (Security)  
**Status**: ❌ TODO  
**Effort**: 4 hours  
**Assigned**: Unassigned

**Description**: Prevent brute force attacks on login endpoint

**Acceptance Criteria**:
- [ ] Cloudflare Rate Limiting rule: Max 5 login attempts per IP per 15 minutes
- [ ] After 5 failed attempts, lock account for 15 minutes
- [ ] Store failed attempts in database (or use Cloudflare WAF)
- [ ] Show error: "Too many attempts. Try again in X minutes."
- [ ] Audit log records rate limit hits
- [ ] Admin can manually unlock accounts

**Implementation Options**:
1. **Cloudflare WAF** (Recommended):
   - Add rate limiting rule in Cloudflare dashboard
   - Path: `/auth/login`
   - Threshold: 5 requests per 15 minutes per IP
   - Action: Block with 429 status

2. **Application-level**:
   - Track failed attempts in database
   - Lock account after threshold
   - Require CAPTCHA after 3 attempts

**Files to Edit** (Option 2):
- `apps/api/src/auth/auth.service.ts` - Track attempts
- Create table: `login_attempts`

**Testing**:
- [ ] 5 failed logins from same IP
- [ ] 6th attempt blocked
- [ ] Wait 15 minutes, can try again
- [ ] Different IP not affected
- [ ] Successful login resets counter

---

## 📊 MEDIUM PRIORITY - Sprint 5

### TASK-009: Analytics Dashboard with Charts
**Priority**: P2 (Medium)  
**Status**: ❌ TODO  
**Effort**: 12 hours

**Description**: Add graphs for attendance trends, fee collection, performance

**Acceptance Criteria**:
- [ ] Attendance trend line chart (last 30 days)
- [ ] Fee collection bar chart (by month)
- [ ] Subject-wise performance radar chart
- [ ] Class comparison stacked bar chart
- [ ] Filters: Date range, class, subject
- [ ] Export chart as PNG/PDF
- [ ] Mobile responsive

**Files to Create**:
- `apps/web/src/pages/AnalyticsDashboard.tsx`
- `apps/api/src/analytics/analytics.routes.ts`
- `apps/api/src/analytics/analytics.service.ts`

**Charts Library**: Recharts (already installed)

---

### TASK-010: Grade Calculation System
**Priority**: P2 (Medium)  
**Status**: ❌ TODO  
**Effort**: 8 hours

**Description**: Auto-calculate letter grades from marks

**Acceptance Criteria**:
- [ ] Define grading scheme: 90-100=A+, 80-89=A, 70-79=B+, etc.
- [ ] Store scheme in database (configurable per school)
- [ ] Compute grade when marks entered
- [ ] Display grade in marks list
- [ ] Report card shows grades
- [ ] Rank calculation (1, 2, 3, ...)
- [ ] GPA/CGPA computation

**Database**:
```sql
CREATE TABLE grading_schemes (
  id TEXT PRIMARY KEY,
  school_id TEXT NOT NULL,
  name TEXT NOT NULL,
  min_marks INTEGER NOT NULL,
  max_marks INTEGER NOT NULL,
  grade TEXT NOT NULL,
  grade_point REAL NOT NULL,
  created_at INTEGER DEFAULT (unixepoch())
);
```

---

### TASK-011: Email Notification System
**Priority**: P2 (Medium)  
**Status**: ❌ TODO  
**Effort**: 16 hours

**Description**: Send email notifications for events

**Acceptance Criteria**:
- [ ] Email service integration (SendGrid/Resend/Mailgun)
- [ ] Templates: Absence alert, fee reminder, marks published
- [ ] Queue system for batch emails
- [ ] Unsubscribe functionality
- [ ] Email preferences per user
- [ ] Audit log for sent emails

**Triggers**:
- Student absent → Email parent
- Fee due date approaching → Email parent
- Marks published → Email student/parent
- Assignment posted → Email students

---

### TASK-012: Assignment Submissions (Student Upload)
**Priority**: P2 (Medium)  
**Status**: ❌ TODO  
**Effort**: 24 hours

**Description**: Students can submit homework online

**Acceptance Criteria**:
- [ ] Student uploads file (PDF, DOC, image)
- [ ] Submission deadline enforcement
- [ ] Late submission penalty
- [ ] Teacher grading interface
- [ ] Rubric-based evaluation
- [ ] Comments on submission
- [ ] Resubmission allowed (configurable)

**Database**:
```sql
CREATE TABLE assignment_submissions (
  id TEXT PRIMARY KEY,
  assignment_id TEXT NOT NULL,
  student_id TEXT NOT NULL,
  file_key TEXT NOT NULL,
  submitted_at INTEGER NOT NULL,
  grade REAL,
  feedback TEXT,
  graded_at INTEGER,
  graded_by TEXT,
  is_late BOOLEAN DEFAULT 0,
  FOREIGN KEY (assignment_id) REFERENCES homework_assignments(id),
  FOREIGN KEY (student_id) REFERENCES users(id)
);
```

---

## 🎨 LOW PRIORITY - Backlog

### TASK-013: Mobile App (React Native)
**Priority**: P3 (Low)  
**Effort**: 100+ hours

**Description**: Native iOS/Android apps

---

### TASK-014: Parent Portal
**Priority**: P3 (Low)  
**Effort**: 40 hours

**Description**: Separate parent role with multi-child support

---

### TASK-015: Online Payment Gateway
**Priority**: P3 (Low)  
**Effort**: 24 hours

**Description**: Razorpay/Stripe integration for fee payment

---

### TASK-016: Advanced Timetable Features
**Priority**: P3 (Low)  
**Effort**: 20 hours

**Description**: Conflict detection, auto-scheduling, teacher availability

---

## 🐛 BUG FIXES - Ongoing

### BUG-001: Academic Year Context Inconsistency
**Priority**: P2  
**Status**: ❌ TODO  
**Effort**: 4 hours

**Description**: Selected year doesn't persist across pages

**Files to Fix**:
- `apps/web/src/contexts/AcademicYearContext.tsx`

---

### BUG-002: Payment Method Name Mismatch
**Priority**: P3  
**Status**: ❌ TODO  
**Effort**: 1 hour

**Description**: Frontend sends 'check', backend expects 'upi/cash/bank_transfer'

**Files to Fix**:
- `apps/web/src/pages/Fees.tsx` - Update dropdown values

---

### BUG-003: Excel Import Error Messages
**Priority**: P2  
**Status**: ❌ TODO  
**Effort**: 4 hours

**Description**: Generic errors on import failures, need row-by-row validation

**Files to Fix**:
- `apps/api/src/attendance/attendance.service.ts`
- `apps/api/src/marks/marks.service.ts`

---

### BUG-004: Mobile Navigation Clunky
**Priority**: P2  
**Status**: ❌ TODO  
**Effort**: 6 hours

**Description**: Sidebar doesn't collapse, need hamburger menu

**Files to Fix**:
- `apps/web/src/components/layout/Layout.tsx`

---

## 📝 DOCUMENTATION TASKS

### DOC-001: API Documentation (OpenAPI)
**Priority**: P2  
**Status**: ❌ TODO  
**Effort**: 8 hours

**Description**: Generate OpenAPI/Swagger docs for all endpoints

---

### DOC-002: User Manual (Principal)
**Priority**: P2  
**Status**: ❌ TODO  
**Effort**: 16 hours

**Description**: Step-by-step guide for principals

---

### DOC-003: User Manual (Teacher)
**Priority**: P2  
**Status**: ❌ TODO  
**Effort**: 12 hours

---

### DOC-004: User Manual (Student)
**Priority**: P2  
**Status**: ❌ TODO  
**Effort**: 8 hours

---

## 🧪 TESTING TASKS

### TEST-001: E2E Tests (Playwright)
**Priority**: P2  
**Status**: ❌ TODO  
**Effort**: 24 hours

**Description**: Critical user flows

---

### TEST-002: Load Testing
**Priority**: P3  
**Status**: ❌ TODO  
**Effort**: 8 hours

**Description**: Test with 1000 concurrent users

---

## 📊 Task Summary

| Status | Count |
|--------|-------|
| ❌ TODO | 20+ |
| 🚧 In Progress | 0 |
| ✅ Done | 0 |

### By Priority
| Priority | Count |
|----------|-------|
| P0 (Critical) | 4 |
| P1 (High) | 4 |
| P2 (Medium) | 10+ |
| P3 (Low) | 4+ |

---

## 🎯 Recommended Sprint Plan

**Sprint 3 (Current Week)**:
- TASK-001: Fix Fees UI
- TASK-002: Enable R2
- TASK-003: Edit window
- TASK-004: Password reset

**Sprint 4 (Next Week)**:
- TASK-005: My Teaching page
- TASK-006: Attendance marking
- TASK-007: Class teacher view
- TASK-008: Rate limiting

**Sprint 5**:
- TASK-009: Analytics charts
- TASK-010: Grade calculation
- TASK-011: Email notifications

**Sprint 6**:
- TASK-012: Assignment submissions
- Bug fixes
- Documentation

---

## 📌 How to Use This File

### Start a Task
```bash
# Mark task as in progress (manually edit or use script)
# Change status from ❌ TODO to 🚧 In Progress
```

### Complete a Task
```bash
# Mark as done
# Change status to ✅ Done
# Update completion date
```

### Add New Task
```bash
# Use template:
### TASK-XXX: Task Name
**Priority**: P0/P1/P2/P3
**Status**: ❌ TODO / 🚧 In Progress / ✅ Done
**Effort**: X hours
**Assigned**: Name

**Description**: ...

**Acceptance Criteria**:
- [ ] Criterion 1
- [ ] Criterion 2

**Files to Edit**:
- file1.ts
- file2.tsx

**Testing**:
- [ ] Test 1
- [ ] Test 2
```

---

**Last Updated**: 2026-09-19  
**Next Review**: End of Sprint 3
