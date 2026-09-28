# 🔥 Sprint 3 - Critical Bug Fixes

## Task completed
[x] 1. Fix Fees List UI - Group by Student
- Rewrite Fees.tsx to show one row per student with expandable charge details
- Add grouping logic for charges by student_id
- Show total charged, total paid, balance per student
- Expandable rows showing individual charges
- Status badges: Paid (green), Partial (yellow), Pending (red)
- _Files: apps/web/src/pages/Fees.tsx_
- _Requirements: TASK-001, SMS_COMPREHENSIVE_ANALYSIS.md section 7.1_

## Start task  
[ ] 2. Enable R2 Storage for File Uploads
- Enable R2 bucket in Cloudflare dashboard
- Uncomment R2 binding in wrangler.jsonc (lines 24-30)
- Create bucket: sms-uploads
- Deploy API and test file upload
- Verify assignment attachments work
- _Files: apps/api/wrangler.jsonc_
- _Requirements: TASK-002, File upload functionality_

## Start task
[ ] 3. Enforce Attendance Edit Window (48 Hours)
- Add validateEditWindow() function in attendance.service.ts
- Prevent non-principal users from editing attendance > 48 hours old
- Show error: "Edit window expired (48 hours). Contact principal."
- Add countdown timer in UI
- Allow principal override
- _Files: apps/api/src/attendance/attendance.service.ts, apps/api/src/attendance/attendance.routes.ts, apps/web/src/pages/Attendance.tsx_
- _Requirements: TASK-003, Security requirement_

## Start task
[ ] 4. Implement Password Reset Flow
- Create password_reset_tokens table
- Add POST /auth/forgot-password endpoint
- Generate reset token (ULID, 1-hour expiry)
- Add POST /auth/reset-password endpoint
- Create ForgotPassword.tsx page
- Create ResetPassword.tsx page
- Email integration (or show token for now)
- _Files: apps/api/src/auth/auth.routes.ts, apps/api/src/auth/password-reset.service.ts, apps/web/src/pages/ForgotPassword.tsx, apps/web/src/pages/ResetPassword.tsx_
- _Requirements: TASK-004, Critical user need_

---

# 🚀 Sprint 4 - Teacher Dashboard Enhancement

## Start task
[ ] 5. Create Teacher "My Teaching" Page
- Add GET /me/teaching endpoint (filter by current teacher)
- Create TeacherMyTeaching.tsx page
- Show all teaching assignments: classroom, subject, days, time
- Click assignment to see detail page
- Filter by active academic year
- _Files: apps/api/src/accounts/me.routes.ts, apps/web/src/pages/TeacherMyTeaching.tsx_
- _Requirements: TASK-005, TEACHER_DASHBOARD_PROGRESS.md_

## Start task
[ ] 6. Teacher Attendance Marking Interface
- Create TeacherAttendanceMarking.tsx page
- Quick attendance UI: select class+subject, mark present/absent
- Bulk actions: Mark All Present, Mark All Absent
- Show edit window countdown
- Only show subjects teacher teaches (API enforced)
- Save with confirmation
- _Files: apps/web/src/pages/TeacherAttendanceMarking.tsx, apps/api/src/attendance/attendance.routes.ts_
- _Requirements: TASK-006, Teacher workflow improvement_

## Start task
[ ] 7. Class Teacher Read-Only View (All Subjects)
- Add GET /me/class-teacher-info endpoint
- Create ClassTeacherOverview.tsx page
- Show attendance matrix for ALL subjects (read-only for non-taught)
- Show marks for all subjects (read-only for non-taught)
- Clear "Read-only" badges on other subjects
- Edit buttons only on subjects they teach
- _Files: apps/web/src/pages/ClassTeacherOverview.tsx, apps/api/src/accounts/me.routes.ts, apps/api/src/attendance/attendance.service.ts_
- _Requirements: TASK-007, TEACHER_DASHBOARD_PROGRESS.md section 4.3_

## Start task
[ ] 8. Add Rate Limiting to Auth Endpoints
- Configure Cloudflare Rate Limiting rule (5 attempts per 15 min)
- OR implement application-level rate limiting
- Track failed login attempts
- Lock account after threshold
- Show error: "Too many attempts. Try again in X minutes."
- _Files: apps/api/src/auth/auth.service.ts, Cloudflare Dashboard_
- _Requirements: TASK-008, Security - prevent brute force_

---

# 📊 Sprint 5 - Analytics & Enhancements

## Start task
[ ] 9. Analytics Dashboard with Charts
- Create AnalyticsDashboard.tsx with Recharts
- Attendance trend line chart (last 30 days)
- Fee collection bar chart (by month)
- Subject-wise performance radar chart
- Class comparison stacked bars
- Filters: date range, class, subject
- _Files: apps/web/src/pages/AnalyticsDashboard.tsx, apps/api/src/analytics/analytics.routes.ts_
- _Requirements: TASK-009, Data visualization_

## Start task
[ ] 10. Grade Calculation System
- Create grading_schemes table (configurable: 90+=A+, 80-89=A, etc.)
- Auto-compute grades when marks entered
- Display grade in marks list and report cards
- Rank calculation (1, 2, 3, ...)
- GPA/CGPA computation
- _Files: apps/api/src/marks/marks.service.ts, Database migration_
- _Requirements: TASK-010, Academic requirement_

## Start task
[ ] 11. Email Notification System
- Integrate email service (SendGrid/Resend/Mailgun)
- Create email templates: absence alert, fee reminder, marks published
- Queue system for batch emails
- Email preferences per user
- Unsubscribe functionality
- _Files: apps/api/src/notifications/email.service.ts_
- _Requirements: TASK-011, Parent communication_

## Start task
[ ] 12. Assignment Submissions (Student Upload)
- Create assignment_submissions table
- Student file upload interface
- Deadline enforcement + late penalty
- Teacher grading interface
- Rubric-based evaluation
- Comments on submission
- _Files: apps/web/src/pages/StudentSubmitAssignment.tsx, apps/web/src/pages/TeacherGradeSubmissions.tsx, apps/api/src/assignments/submissions.service.ts_
- _Requirements: TASK-012, Complete assignment workflow_

---

# 🐛 Bug Fixes

## Start task
[ ] BUG-1. Fix Academic Year Context Inconsistency
- Selected year doesn't persist across pages
- Improve AcademicYearContext state management
- Add consistency checks and localStorage sync
- _Files: apps/web/src/contexts/AcademicYearContext.tsx_
- _Requirements: BUG-001, UX issue_

## Start task
[ ] BUG-2. Payment Method Name Mismatch
- Frontend sends 'check', backend expects 'upi/cash/bank_transfer'
- Align dropdown values with backend enum
- _Files: apps/web/src/pages/Fees.tsx_
- _Requirements: BUG-002, Data consistency_

## Start task
[ ] BUG-3. Excel Import Error Messages
- Generic errors on import failures
- Add row-by-row validation feedback
- Show which rows failed and why
- _Files: apps/api/src/attendance/attendance.service.ts, apps/api/src/marks/marks.service.ts_
- _Requirements: BUG-003, Better error handling_

## Start task
[ ] BUG-4. Mobile Navigation Clunky
- Sidebar doesn't collapse on mobile
- Implement hamburger menu
- Consider bottom navigation for mobile
- _Files: apps/web/src/components/layout/Layout.tsx_
- _Requirements: BUG-004, Mobile UX_

---

# 📚 Documentation Tasks

## Start task
[ ] DOC-1. API Documentation (OpenAPI/Swagger)
- Generate OpenAPI spec for all endpoints
- Add endpoint descriptions and examples
- Set up Swagger UI
- _Requirements: DOC-001, Developer documentation_

## Start task
[ ] DOC-2. User Manual - Principal
- Step-by-step guide for principals
- Screenshots and workflows
- Common tasks and troubleshooting
- _Requirements: DOC-002, End-user documentation_

## Start task
[ ] DOC-3. User Manual - Teacher
- Teacher-specific workflows
- Attendance marking, marks entry, assignments
- _Requirements: DOC-003, End-user documentation_

## Start task
[ ] DOC-4. User Manual - Student
- Student portal guide
- Viewing marks, attendance, fees, assignments
- _Requirements: DOC-004, End-user documentation_

---

# 🎨 Low Priority / Future

## Start task
[ ] 13. Mobile App (React Native)
- Build native iOS/Android apps
- Offline mode
- Push notifications
- _Requirements: TASK-013, Native experience_

## Start task
[ ] 14. Parent Portal
- Separate parent role
- Multi-child support
- View marks, attendance, pay fees
- _Requirements: TASK-014, Parent engagement_

## Start task
[ ] 15. Online Payment Gateway Integration
- Integrate Razorpay/Stripe
- Online fee payment
- Auto-receipt generation
- _Requirements: TASK-015, Digital payments_

## Start task
[ ] 16. Advanced Timetable Features
- Conflict detection
- Auto-scheduling
- Teacher availability tracking
- Room allocation
- _Requirements: TASK-016, Scheduling optimization_

---

# 🧪 Testing Tasks

## Start task
[ ] TEST-1. E2E Tests (Playwright)
- Critical user flows
- Login → Mark Attendance → Enter Marks → Record Payment
- _Requirements: TEST-001, Quality assurance_

## Start task
[ ] TEST-2. Load Testing
- Test with 1000 concurrent users
- Identify bottlenecks
- Optimize slow queries
- _Requirements: TEST-002, Performance validation_

---

**Priority Legend:**
- 🔥 Critical (Sprint 3) - Blocking issues, security
- 🚀 High Priority (Sprint 4) - Core features, teacher workflows
- 📊 Medium (Sprint 5) - Enhancements, analytics
- 🎨 Low - Nice-to-have, future phases

**Status:**
- [ ] Start task - Not started
- [x] Task completed - Finished

**Total Tasks:** 28
**Sprint 3:** 4 critical
**Sprint 4:** 4 high priority
**Sprint 5:** 4 medium priority
**Bugs:** 4
**Docs:** 4
**Future:** 4
**Testing:** 2
