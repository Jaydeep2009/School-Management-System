# SMS Project Compliance Audit - Task List

**Date**: September 19, 2026  
**Status**: 🔍 AUDIT IN PROGRESS

This document tracks compliance of the current implementation against the full product brief. Each section indicates whether the current implementation matches requirements, and what needs to be fixed.

---

## 1. Authentication & Authorization Model

### 1.1 Super Admin Authentication ✅ COMPLIANT
**Requirement**: Super Admin credentials in Worker secrets, NOT in users table, separate login endpoint  
**Current Status**: ✅ Implemented correctly
- `/auth/super-admin/login` exists
- Credentials in Worker secrets (SUPER_ADMIN_LOGIN_ID, SUPER_ADMIN_PASSWORD_HASH)
- Short-lived JWT with no schoolId
- No refresh token
- **Action**: None required

### 1.2 School User Authentication ✅ MOSTLY COMPLIANT
**Requirement**: users table, generated login_id format `<SCHOOLCODE>-<P|T|S>-<sequence>`, activation code flow  
**Current Status**: ✅ Implemented
- Login ID format correct
- Activation flow exists
- Session management with refresh tokens
- **Issues Found**:
  - ❌ **CRITICAL**: Activation flow bug (fixed in ACTIVATION_BUG_FIX.md)
- **Action**: ✅ Already fixed in this session

### 1.3 Role-Based Access Control ⚠️ PARTIALLY COMPLIANT
**Requirement**: Four roles with specific capabilities per the permissions matrix  
**Current Status**: ⚠️ Implemented but needs verification

**Issues to Verify**:
- ❌ **Class Teacher designation**: Is `classrooms.class_teacher_id` properly implemented?
- ❌ **Ownership policies**: Are `canViewSubjectData` and `canEditSubjectData` implemented?
- ❌ **Teacher subject filtering**: Can teachers only see their assigned subjects?
- ❌ **Student isolation**: Can students only see their own data?

**Actions Required**:
```
[ ] Task 1.3.1: Verify classrooms.class_teacher_id column exists in schema
[ ] Task 1.3.2: Implement canViewSubjectData policy function
[ ] Task 1.3.3: Implement canEditSubjectData policy function
[ ] Task 1.3.4: Add policy checks to all attendance/marks routes
[ ] Task 1.3.5: Verify teacher routes filter by teaching_assignments
[ ] Task 1.3.6: Verify student /me/* routes only use token userId
```

---

## 2. Database Schema Compliance

### 2.1 Core Tables ⚠️ NEEDS VERIFICATION
**Requirement**: 23 tables as defined in migrations/0001_init.sql  
**Current Status**: Unknown - needs audit

**Actions Required**:
```
[ ] Task 2.1.1: Read full migrations/0001_init.sql and verify all 23 tables exist
[ ] Task 2.1.2: Verify WITHOUT ROWID on appropriate tables
[ ] Task 2.1.3: Verify all triggers and indexes exist
[ ] Task 2.1.4: Verify all foreign key constraints
[ ] Task 2.1.5: Verify partial unique indexes (one active principal, one current year, etc.)
```

### 2.2 Enrollment Model ❌ NEEDS IMPLEMENTATION
**Requirement**: Status `planned | active | completed | left | transferred`, exactly one live enrollment per student per year  
**Current Status**: Unknown

**Actions Required**:
```
[ ] Task 2.2.1: Verify enrollments table has all required statuses
[ ] Task 2.2.2: Verify partial unique index for one live enrollment per student per year
[ ] Task 2.2.3: Verify enrollment history is never edited in place (append-only)
```

### 2.3 Fee Ledger ❌ NEEDS VERIFICATION
**Requirement**: Integer paise, void-not-delete triggers, gapless receipt numbers  
**Current Status**: Unknown

**Actions Required**:
```
[ ] Task 2.3.1: Verify amounts are stored in INTEGER paise (not REAL/DECIMAL)
[ ] Task 2.3.2: Verify fee_payments has voided_at, void_reason columns
[ ] Task 2.3.3: Verify triggers prevent DELETE on fee_charges and fee_payments
[ ] Task 2.3.4: Verify receipt_counters table for gapless numbering
[ ] Task 2.3.5: Verify server-generated receipt numbers (not client-provided)
```

---

## 3. API Routes Compliance

### 3.1 Ownership Policy Enforcement ❌ NOT IMPLEMENTED
**Requirement**: `canViewSubjectData` and `canEditSubjectData` on every attendance/marks route  
**Current Status**: ❌ Not found in codebase

**Actions Required**:
```
[ ] Task 3.1.1: Create apps/api/src/policies/teaching.ts
[ ] Task 3.1.2: Implement canViewSubjectData(repo, user, classroomId, subjectId)
    - Returns true if: principal, OR classroom's class_teacher_id matches, OR teaching_assignments exists
[ ] Task 3.1.3: Implement canEditSubjectData(repo, user, classroomId, subjectId)
    - Returns true if: principal (audited), OR teaching_assignments exists
    - Class teacher status alone NEVER grants edit rights
[ ] Task 3.1.4: Add policy checks to GET /attendance routes
[ ] Task 3.1.5: Add policy checks to PUT /attendance routes
[ ] Task 3.1.6: Add policy checks to GET /marks routes
[ ] Task 3.1.7: Add policy checks to PUT /marks routes
[ ] Task 3.1.8: Verify academic year = 'current' check for non-principal edits
```

### 3.2 Repository Pattern ⚠️ NEEDS VERIFICATION
**Requirement**: Every repository must use `forSchool(db, schoolId)`, schoolId only from JWT  
**Current Status**: Unknown

**Actions Required**:
```
[ ] Task 3.2.1: Audit all repository files for forSchool() usage
[ ] Task 3.2.2: Verify no raw db handle passed to services without schoolId
[ ] Task 3.2.3: Add code review checklist item
[ ] Task 3.2.4: Write test: user from School A requesting School B's resource gets 404
```

### 3.3 Tenant Isolation Tests ❌ MISSING
**Requirement**: Every route needs a test proving cross-tenant isolation  
**Current Status**: ❌ Tests not found

**Actions Required**:
```
[ ] Task 3.3.1: Create test suite for cross-tenant isolation
[ ] Task 3.3.2: Test students route: School A user cannot access School B student
[ ] Task 3.3.3: Test teachers route: School A user cannot access School B teacher
[ ] Task 3.3.4: Test attendance route: School A teacher cannot mark School B attendance
[ ] Task 3.3.5: Test marks route: School A teacher cannot enter School B marks
[ ] Task 3.3.6: Test fees route: School A cannot see School B fees
```

---

## 4. Excel Import Pipeline

### 4.1 Import Pipeline Architecture ⚠️ NEEDS VERIFICATION
**Requirement**: Shared pipeline with dry-run → preview → commit, adapters for each kind  
**Current Status**: ⚠️ Partially implemented (TimetableImport exists)

**Actions Required**:
```
[ ] Task 4.1.1: Verify import_jobs table exists with status field (previewed/committing/committed/failed)
[ ] Task 4.1.2: Verify dry-run stores validated rows with expiry
[ ] Task 4.1.3: Verify commit uses claim UPDATE with exact WHERE clause (prevents double-commit)
[ ] Task 4.1.4: Create adapters for: students, attendance, marks, fee-charges, fee-payments, promotion
[ ] Task 4.1.5: Verify row-level error reporting {row, column, code, message}
[ ] Task 4.1.6: Verify formula-injection guard (=/+/-/@ prefix → prepend ')
[ ] Task 4.1.7: Verify dates normalized to YYYY-MM-DD
```

### 4.2 Import Kinds Required ❌ INCOMPLETE
**Requirement**: 6 import kinds: students, attendance, marks, fee-charges, fee-payments, promotion  
**Current Status**: Only timetable import found

**Actions Required**:
```
[ ] Task 4.2.1: Implement students roster import (template → dry-run → commit)
[ ] Task 4.2.2: Implement attendance import
[ ] Task 4.2.3: Implement marks import
[ ] Task 4.2.4: Implement fee-charges import
[ ] Task 4.2.5: Implement fee-payments import
[ ] Task 4.2.6: Implement promotion import (select/unselect + Excel mode)
```

---

## 5. Promotion and Year Rollover

### 5.1 Promotion Model ❌ NOT IMPLEMENTED
**Requirement**: Two-phase plan → activate, promotion_batches and promotion_items tables  
**Current Status**: ❌ Tables might exist but service logic not verified

**Actions Required**:
```
[ ] Task 5.1.1: Verify promotion_batches table exists (status: draft/planned/applied/cancelled)
[ ] Task 5.1.2: Verify promotion_items table exists (action: promote/retain/graduate/leave)
[ ] Task 5.1.3: Implement promotion planning service (select/unselect list or Excel)
[ ] Task 5.1.4: Implement dry-run/preview (counts by outcome, row-level problems)
[ ] Task 5.1.5: Implement revise plan (can re-run before activation)
[ ] Task 5.1.6: Verify planned enrollments created (status='planned')
[ ] Task 5.1.7: Verify current year enrollment untouched until activation
```

### 5.2 Year Activation ❌ NOT IMPLEMENTED
**Requirement**: Atomic activation via ACTIVATION_STATEMENTS, prechecks must pass  
**Current Status**: ❌ Not found

**Actions Required**:
```
[ ] Task 5.2.1: Verify src/integrity-checks.ts exists with ACTIVATION_PRECHECKS
[ ] Task 5.2.2: Verify ACTIVATION_STATEMENTS SQL (close old year, open new, flip enrollments)
[ ] Task 5.2.3: Implement POST /academic-years/:id/activate endpoint
[ ] Task 5.2.4: Run ACTIVATION_PRECHECKS before activation (must return zero rows)
[ ] Task 5.2.5: Execute ACTIVATION_STATEMENTS as atomic db.batch()
[ ] Task 5.2.6: Disable leavers' logins and revoke sessions
[ ] Task 5.2.7: Mark graduates' profiles inactive
[ ] Task 5.2.8: Write one audit log entry for activation
[ ] Task 5.2.9: Test: activation is set-based, independent of student count
```

---

## 6. Frontend Implementation Gaps

### 6.1 Role-Based UI ⚠️ PARTIALLY IMPLEMENTED
**Requirement**: Separate screens per role with ownership-aware filtering  
**Current Status**: ⚠️ Dashboards exist but filtering needs verification

**Actions Required**:
```
[ ] Task 6.1.1: Verify teacher screens only show teaching_assignments they own
[ ] Task 6.1.2: Verify class teacher sees read-only cross-subject view
[ ] Task 6.1.3: Verify student /me routes only fetch their own data
[ ] Task 6.1.4: Add ownership-aware pickers (don't show unavailable options)
[ ] Task 6.1.5: Gray out/disable read-only cells in class teacher view
```

### 6.2 Excel Import UI ❌ INCOMPLETE
**Requirement**: Shared 4-step component reused across all import kinds  
**Current Status**: ❌ Only timetable import UI exists

**Actions Required**:
```
[ ] Task 6.2.1: Extract shared ImportWizard component (download → upload → preview → confirm)
[ ] Task 6.2.2: Create UI for student roster import
[ ] Task 6.2.3: Create UI for attendance import
[ ] Task 6.2.4: Create UI for marks import
[ ] Task 6.2.5: Create UI for fee-charges import
[ ] Task 6.2.6: Create UI for fee-payments import
[ ] Task 6.2.7: Create UI for promotion import
[ ] Task 6.2.8: Show row-level errors inline (row #, column, message)
[ ] Task 6.2.9: Show diff/preview before commit (never silent bulk write)
```

### 6.3 Promotion UI ❌ NOT IMPLEMENTED
**Requirement**: Select/unselect list OR Excel mode, preview counts, explicit confirm  
**Current Status**: ❌ PromotionBatchDetail exists but incomplete

**Actions Required**:
```
[ ] Task 6.3.1: Build per-class promotion workspace UI
[ ] Task 6.3.2: Add select/unselect list view (all active students pre-selected)
[ ] Task 6.3.3: Add inline target-class dropdown + roll-number field
[ ] Task 6.3.4: Add unselect action (Retain/Leave/Graduate radio buttons)
[ ] Task 6.3.5: Add Excel mode toggle
[ ] Task 6.3.6: Build preview screen (counts by outcome, target class, row problems)
[ ] Task 6.3.7: Add "Revise plan" button (re-entry before activation)
[ ] Task 6.3.8: Build activate-year screen with prechecks as blocking list
[ ] Task 6.3.9: Show summary after activation (what changed)
```

### 6.4 Fee Management UI ⚠️ NEEDS VERIFICATION
**Requirement**: Receipts with gapless numbering, client-rendered PDF bills  
**Current Status**: ⚠️ Fee pages exist but features need verification

**Actions Required**:
```
[ ] Task 6.4.1: Verify receipt display shows server-generated receipt number
[ ] Task 6.4.2: Verify void payment has required reason field
[ ] Task 6.4.3: Verify voided payments show in ledger (not deleted)
[ ] Task 6.4.4: Implement client-side PDF bill rendering (jsPDF or print-to-PDF)
[ ] Task 6.4.5: Verify ₹ symbol renders correctly in PDF
[ ] Task 6.4.6: Add per-student ledger view (charges, payments, running balance)
```

### 6.5 Credentials Sheet ❌ MISSING
**Requirement**: One-time display after account creation (individual or bulk)  
**Current Status**: ⚠️ PrincipalCredentialsDialog exists but limited

**Actions Required**:
```
[ ] Task 6.5.1: Create reusable CredentialsSheet component
[ ] Task 6.5.2: Show after individual student creation
[ ] Task 6.5.3: Show after individual teacher creation
[ ] Task 6.5.4: Show after bulk import (list of all created accounts)
[ ] Task 6.5.5: Add download option (CSV or PDF)
[ ] Task 6.5.6: Make clear this is shown exactly once
[ ] Task 6.5.7: Never persist credentials after dialog close
```

---

## 7. Security & Compliance

### 7.1 Authorization Enforcement ⚠️ NEEDS VERIFICATION
**Requirement**: Server-side on every route, schoolId/studentId only from JWT  
**Current Status**: ⚠️ Partially implemented

**Actions Required**:
```
[ ] Task 7.1.1: Audit all routes for requireAuth middleware
[ ] Task 7.1.2: Verify schoolId never comes from URL param or request body
[ ] Task 7.1.3: Verify studentId for /me routes comes from token only
[ ] Task 7.1.4: Add rate limiting middleware (login, Super Admin login especially)
[ ] Task 7.1.5: Add Turnstile integration (or document as pre-production gate)
```

### 7.2 Audit Logging ⚠️ NEEDS VERIFICATION
**Requirement**: Audit critical operations with old→new values  
**Current Status**: ⚠️ Audit logs exist but coverage unknown

**Actions Required**:
```
[ ] Task 7.2.1: Verify audit_log table exists with actor_role, entity_type, action, before, after
[ ] Task 7.2.2: Verify logins audited
[ ] Task 7.2.3: Verify password resets audited
[ ] Task 7.2.4: Verify imports audited
[ ] Task 7.2.5: Verify attendance/marks edits audited (old→new)
[ ] Task 7.2.6: Verify fee voids audited with reason
[ ] Task 7.2.7: Verify promotion/activation audited
[ ] Task 7.2.8: Verify role changes audited
[ ] Task 7.2.9: Verify NO PII in logs (redact passwords, tokens, activation codes)
```

### 7.3 Data Integrity ❌ NEEDS VERIFICATION
**Requirement**: Fee ledger is append-only, void-not-delete enforced by triggers  
**Current Status**: ❌ Not verified

**Actions Required**:
```
[ ] Task 7.3.1: Verify DELETE trigger on fee_charges (RAISE ABORT)
[ ] Task 7.3.2: Verify DELETE trigger on fee_payments (RAISE ABORT)
[ ] Task 7.3.3: Test: attempt to DELETE fee_charges row fails
[ ] Task 7.3.4: Test: attempt to DELETE fee_payments row fails
[ ] Task 7.3.5: Verify void uses UPDATE, not DELETE
```

---

## 8. Missing Features from Product Brief

### 8.1 Teaching Assignments Management ⚠️ NEEDS VERIFICATION
**Requirement**: Per-classroom matrix of subject → teacher  
**Current Status**: ⚠️ AcademicStructure page exists but UI needs verification

**Actions Required**:
```
[ ] Task 8.1.1: Verify teaching_assignments CRUD routes exist
[ ] Task 8.1.2: Build per-classroom matrix UI (subjects × teachers)
[ ] Task 8.1.3: Flag "unassigned" subjects clearly
[ ] Task 8.1.4: Allow NULL teacher_id (subject offered but not assigned)
```

### 8.2 Class Teacher Assignment ❌ NEEDS IMPLEMENTATION
**Requirement**: PUT /classrooms/:id/class-teacher endpoint  
**Current Status**: ❌ Not found

**Actions Required**:
```
[ ] Task 8.2.1: Create PUT /classrooms/:id/class-teacher endpoint
[ ] Task 8.2.2: Verify classrooms.class_teacher_id column exists
[ ] Task 8.2.3: Validate teacher belongs to same school
[ ] Task 8.2.4: Add UI picker in classroom edit form
[ ] Task 8.2.5: Audit class teacher assignment changes
```

### 8.3 Student Birthdays (Class Teacher Only) ❌ NOT IMPLEMENTED
**Requirement**: GET /classrooms/:id/birthdays endpoint  
**Current Status**: ❌ Not found (only GET /birthdays/upcoming exists)

**Actions Required**:
```
[ ] Task 8.3.1: Create GET /classrooms/:id/birthdays endpoint
[ ] Task 8.3.2: Verify dob_md column exists (MM-DD for efficient birthday queries)
[ ] Task 8.3.3: Implement policy check (class teacher OR principal only)
[ ] Task 8.3.4: Add UI in teacher portal (visible only if class teacher)
```

### 8.4 Credentials Sheet Download ❌ NOT IMPLEMENTED
**Requirement**: GET /credentials-sheets/:id endpoint  
**Current Status**: ❌ Not found

**Actions Required**:
```
[ ] Task 8.4.1: Create credentials-sheets table (id, school_id, created_by, created_at, entries JSON)
[ ] Task 8.4.2: Store credentials temporarily after bulk creation
[ ] Task 8.4.3: Create GET /credentials-sheets/:id endpoint
[ ] Task 8.4.4: Expire credentials sheets after 24 hours
[ ] Task 8.4.5: Add CSV/PDF download UI
```

### 8.5 Assignment Attachments (R2) ⚠️ NEEDS VERIFICATION
**Requirement**: R2 storage with server-generated keys, size/MIME allow-lists  
**Current Status**: ⚠️ Upload exists but validation needs verification

**Actions Required**:
```
[ ] Task 8.5.1: Verify R2 bucket is private (no public URLs)
[ ] Task 8.5.2: Verify object keys are server-generated (not client-provided)
[ ] Task 8.5.3: Add file size limit (e.g., 10MB)
[ ] Task 8.5.4: Add MIME type allow-list (PDF, images, docs only)
[ ] Task 8.5.5: Add ownership check before download
[ ] Task 8.5.6: Stream downloads through authenticated API route
```

---

## 9. Architecture Compliance

### 9.1 Layered Structure ⚠️ NEEDS VERIFICATION
**Requirement**: Route → Service → Repository, services are pure TS  
**Current Status**: ⚠️ Structure exists but compliance unknown

**Actions Required**:
```
[ ] Task 9.1.1: Audit services for database-free business logic
[ ] Task 9.1.2: Verify services don't import Drizzle/D1 directly
[ ] Task 9.1.3: Verify repositories are the only layer touching D1
[ ] Task 9.1.4: Verify all repositories use forSchool() wrapper
```

### 9.2 Drizzle Usage ⚠️ NEEDS CLARIFICATION
**Requirement**: Drizzle for queries and types ONLY, not for schema generation  
**Current Status**: ⚠️ Unclear if Drizzle is used correctly

**Actions Required**:
```
[ ] Task 9.2.1: Verify schema is hand-written SQL (migrations/0001_init.sql)
[ ] Task 9.2.2: Verify Drizzle schema.ts declared to MATCH SQL (not generate it)
[ ] Task 9.2.3: Verify wrangler d1 migrations apply is the only schema deployment
[ ] Task 9.2.4: Document: DO NOT use drizzle-kit push/generate for schema changes
```

### 9.3 Testing Infrastructure ❌ INCOMPLETE
**Requirement**: Vitest with @cloudflare/vitest-pool-workers, 80-test schema suite  
**Current Status**: ❌ Tests not verified

**Actions Required**:
```
[ ] Task 9.3.1: Verify vitest.config.ts uses @cloudflare/vitest-pool-workers
[ ] Task 9.3.2: Find/verify the 80-test schema suite
[ ] Task 9.3.3: Extend schema tests, don't replace them
[ ] Task 9.3.4: Add service layer unit tests (pure TS, database-free)
[ ] Task 9.3.5: Add repository integration tests (real D1 instance)
```

---

## 10. Operations & Production Readiness

### 10.1 Cron Jobs ❌ NOT IMPLEMENTED
**Requirement**: Expire stale imports/sessions, nightly D1→R2 backup, birthday digest  
**Current Status**: ❌ Scheduled handlers not found

**Actions Required**:
```
[ ] Task 10.1.1: Create src/cron/import-cleanup.ts (expire stale preview jobs)
[ ] Task 10.1.2: Create src/cron/session-cleanup.ts (delete expired sessions)
[ ] Task 10.1.3: Create src/cron/backup.ts (nightly D1→R2 export)
[ ] Task 10.1.4: Create src/cron/birthday-digest.ts (optional email digest)
[ ] Task 10.1.5: Wire cron triggers in wrangler.jsonc
[ ] Task 10.1.6: Implement export scheduled() in index.ts
```

### 10.2 Integrity Checks ❌ NOT VERIFIED
**Requirement**: src/integrity-checks.ts with queries for data consistency  
**Current Status**: ❌ File not verified

**Actions Required**:
```
[ ] Task 10.2.1: Verify src/integrity-checks.ts exists
[ ] Task 10.2.2: Verify ACTIVATION_PRECHECKS queries
[ ] Task 10.2.3: Verify ACTIVATION_STATEMENTS SQL
[ ] Task 10.2.4: Add integrity check for: one active principal per school
[ ] Task 10.2.5: Add integrity check for: one current academic year per school
[ ] Task 10.2.6: Add integrity check for: one live enrollment per student per year
[ ] Task 10.2.7: Add integrity check for: attendance entries only for enrolled students
[ ] Task 10.2.8: Run integrity checks in CI after migrations
```

### 10.3 Monitoring & Alerts ❌ NOT IMPLEMENTED
**Requirement**: Structured logs, error tracking, alerts on integrity check failures  
**Current Status**: ❌ Not found

**Actions Required**:
```
[ ] Task 10.3.1: Implement structured JSON logging (requestId, schoolId, userId)
[ ] Task 10.3.2: Integrate Workers Logs or external error tracking
[ ] Task 10.3.3: Set up alerts on error rate threshold
[ ] Task 10.3.4: Set up alerts on non-empty integrity check results
[ ] Task 10.3.5: Document: PII must NOT appear in logs
```

---

## 11. Frontend Missing Features

### 11.1 PWA & Mobile Optimization ❌ NOT IMPLEMENTED
**Requirement**: PWA for installability, mobile-first for teacher/student views  
**Current Status**: ❌ Not found

**Actions Required**:
```
[ ] Task 11.1.1: Add PWA manifest.json
[ ] Task 11.1.2: Add service worker for app shell
[ ] Task 11.1.3: Verify mobile-responsive layouts on teacher screens
[ ] Task 11.1.4: Verify mobile-responsive layouts on student screens
[ ] Task 11.1.5: Test: attendance marking on phone between classes
```

### 11.2 Principal Dashboard Widgets ⚠️ INCOMPLETE
**Requirement**: School snapshot, upcoming birthdays, recent activity, alert cards  
**Current Status**: ⚠️ Basic dashboard exists but widgets incomplete

**Actions Required**:
```
[ ] Task 11.2.1: Add school snapshot widget (student/teacher/classroom counts, pending fees)
[ ] Task 11.2.2: Add upcoming teacher birthdays widget
[ ] Task 11.2.3: Add recent activity feed from audit_log (latest imports, payments, edits)
[ ] Task 11.2.4: Add alert cards (classes with no class teacher, subjects with no teacher, expiring imports)
```

### 11.3 Import Center Hub ❌ NOT IMPLEMENTED
**Requirement**: One hub with tabs for each import kind, job history table  
**Current Status**: ❌ Not found

**Actions Required**:
```
[ ] Task 11.3.1: Create Import Center page with tabs/cards for each kind
[ ] Task 11.3.2: Add job history table (who, when, kind, row counts, status)
[ ] Task 11.3.3: Link to each import wizard from the hub
```

### 11.4 Audit Log Viewer ❌ NOT IMPLEMENTED
**Requirement**: Filterable by entity/date/actor (or raw list for launch)  
**Current Status**: ❌ Not found

**Actions Required**:
```
[ ] Task 11.4.1: Create basic audit log page (raw list with pagination)
[ ] Task 11.4.2: Add filters: entity type, date range, actor (v2)
[ ] Task 11.4.3: Display before→after for edits
```

---

## 12. Documentation & Schema Verification

### 12.1 Schema Source Files ⚠️ NEEDS VERIFICATION
**Requirement**: Three companion files are source of truth  
**Current Status**: ⚠️ Need to verify all three exist and are complete

**Actions Required**:
```
[ ] Task 12.1.1: Read full migrations/0001_init.sql (verify 23 tables)
[ ] Task 12.1.2: Read full src/integrity-checks.ts (verify all checks present)
[ ] Task 12.1.3: Read full docs/spec-v1.1-patch.md (understand schema changes)
[ ] Task 12.1.4: Create SCHEMA_COMPLIANCE.md documenting current state
```

### 12.2 Open Questions ⚠️ NEEDS CLIENT INPUT
**Requirement**: 9 open questions in section 7 of product brief  
**Current Status**: Not answered

**Actions Required**:
```
[ ] Task 12.2.1: Document open question: Unpaid fees at promotion (warn/block/carry-forward?)
[ ] Task 12.2.2: Document open question: Graduates' logins (disable immediately or leave read-only?)
[ ] Task 12.2.3: Document open question: Attendance edit window (how many days back?)
[ ] Task 12.2.4: Document open question: attendance_sessions.status='locked' (auto or manual?)
[ ] Task 12.2.5: Document open question: Scale (one school or group from day one?)
[ ] Task 12.2.6: Document open question: Language (Marathi/Hindi in UI or bills?)
[ ] Task 12.2.7: Document open question: Grading model (percentage/letter/CGPA?)
[ ] Task 12.2.8: Document open question: Audit log UI (full viewer or simple table for launch?)
[ ] Task 12.2.9: Document open question: Section 3 improvements (which are in V1 scope?)
```

---

## Summary Statistics

**Total Tasks**: ~150+
- ✅ **Compliant**: ~10 areas
- ⚠️ **Needs Verification**: ~40 tasks
- ❌ **Not Implemented**: ~100+ tasks

**Critical Path** (High Priority):
1. Ownership policies (canViewSubjectData, canEditSubjectData)
2. Class teacher designation and permissions
3. Tenant isolation tests
4. Fee ledger append-only triggers
5. Promotion model (plan → activate)
6. Year rollover atomic activation
7. Excel import pipeline (5 missing adapters)
8. Credentials sheet system

**Medium Priority**:
- Import Center UI
- PWA/mobile optimization
- Principal dashboard widgets
- Audit log viewer
- Cron jobs

**Low Priority**:
- Documentation improvements
- Additional tests
- Open questions resolution

---

## Next Steps

1. **Read Schema Files**: Complete tasks 12.1.1 - 12.1.3 first
2. **Critical Security**: Tasks 1.3.x (ownership policies) and 3.3.x (tenant isolation)
3. **Data Integrity**: Tasks 7.3.x (fee ledger triggers)
4. **Core Features**: Tasks 5.x (promotion), 4.x (imports)
5. **Client Input**: Task 12.2.x (open questions)

---

**Status Legend**:
- ✅ COMPLIANT: Implemented correctly, no action needed
- ⚠️ NEEDS VERIFICATION: Might be implemented, needs audit
- ❌ NOT IMPLEMENTED: Missing, needs implementation
