# Verification Responses - Four Required Items

**Date**: September 19, 2026

This document provides the four specific responses you requested before approving any build work.

---

## ITEM 1: The 25 Table Names (Corrected)

**My error**: I originally counted 26 tables - this was wrong. Both schemas have **exactly 25 tables**.

### All 25 Tables (Reference and Repo Match):
1. schools
2. users
3. sessions
4. teacher_profiles
5. student_profiles
6. academic_years
7. classrooms
8. subjects
9. teaching_assignments
10. enrollments
11. promotion_batches
12. promotion_items
13. attendance_sessions
14. attendance_entries
15. assessments
16. marks
17. assignments
18. assignment_attachments
19. fee_categories
20. fee_charges
21. fee_payments
22. receipt_counters
23. code_counters
24. import_jobs
25. audit_log

**Conclusion**: Your "25 tables" is correct. Repo matches your reference exactly on table count.

---

## ITEM 2: Schema Diff - Reconciliation Status

### File Comparison Complete

**Status**: ✅ Repo schema is STRICTER than reference (all changes add safety)

### Differences Found:

#### 1. **teacher_profiles.employee_code** - Nullability
- **Your reference**: `employee_code TEXT` (nullable)
- **Repo**: `employee_code TEXT NOT NULL`
- **Verdict**: Repo requires employee_code. Is this intentional?

#### 2. **Additional Triggers** (Repo has 6 extra)
**Your reference has 5 triggers**:
- trg_schools_code_immutable
- trg_fee_charges_no_delete
- trg_fee_charges_immutable
- trg_fee_payments_no_delete
- trg_fee_payments_immutable

**Repo has 11 triggers** (adds these 6):
- `trg_users_login_id_school_prefix` - validates login_id starts with school code
- `trg_users_login_id_school_prefix_update` - same for UPDATE
- `trg_teacher_profile_role` - ensures teacher_profiles only references teacher users
- `trg_student_profile_role` - ensures student_profiles only references student users
- `trg_audit_log_no_update` - prevents UPDATE on audit_log
- `trg_audit_log_no_delete` - prevents DELETE on audit_log

**Verdict**: Extra triggers add data integrity. Repo is more defensive.

#### 3. **CHECK Constraints on Counters** (Repo has 2 extra)
- `receipt_counters.last_number`: Repo adds `CHECK (last_number >= 0)`
- `code_counters.last_number`: Repo adds `CHECK (last_number >= 0)`

**Your reference**: No CHECK on last_number
**Verdict**: Prevents negative counters. Good safety addition.

#### 4. **Foreign Keys on void columns** (Repo uses composite FKs)
**Your reference**:
```sql
voided_by TEXT REFERENCES users(id)  -- simple FK
```

**Repo**:
```sql
voided_by TEXT,
...
FOREIGN KEY (voided_by, school_id) REFERENCES users(id, school_id)  -- composite FK
```

**Verdict**: Composite FK prevents cross-tenant voiding (more secure).

### Reconciliation Decision

**DO NOT merge your reference over the repo**. The repo schema is **strictly better** - every change adds safety:
- NOT NULL prevents missing employee codes
- Extra triggers enforce data integrity rules
- CHECK constraints prevent negative counters
- Composite FKs add tenant isolation to void operations

**Recommendation**: ✅ **KEEP repo schema as-is**. Update your reference to match repo (hardened version).

### Test Suite Status

**Your real test suite extraction**:
- Extracted from `schema-reference/test/schema.test.ts`
- Status: ❓ Not yet copied to repo
- Next step: Drop your test file into `apps/api/src/lib/db/schema.test.ts` (replace mock-based one)

---

## ITEM 3: Authorization Logic - Four Questions Answered

### Full Authorization Code (Attendance)

```typescript
// From apps/api/src/attendance/attendance.authorization.ts

export async function canViewAttendanceSession(
  db: D1Database,
  tenant: TenantContext,
  session: AttendanceSession
): Promise<boolean> {
  // Session must be from same school
  if (session.school_id !== tenant.schoolId) {
    return false;
  }

  // Principal can view all
  if (tenant.role === 'principal') {
    return true;
  }

  // Teacher can view if:
  // 1. They have teaching assignment for this classroom+subject, OR
  // 2. They are class teacher for this classroom
  if (tenant.role === 'teacher') {
    // Check teaching assignment
    const assignment = await findTeachingAssignment(
      db,
      tenant.userId,
      session.classroom_id,
      session.subject_id,
      tenant.schoolId
    );

    if (assignment) {
      return true;
    }

    // Check if class teacher
    const isClassTeacherResult = await isClassTeacher(
      db,
      tenant.userId,
      session.classroom_id,
      tenant.schoolId
    );

    return isClassTeacherResult;
  }

  return false;
}

export async function canModifyAttendance(
  db: D1Database,
  tenant: TenantContext,
  session: AttendanceSession,
  teacherEditWindowHours: number = 48
): Promise<{ allowed: boolean; reason?: string; isPrincipalOverride?: boolean }> {
  // Session must be from same school
  if (session.school_id !== tenant.schoolId) {
    return { allowed: false, reason: 'Session belongs to different school' };
  }

  // Principal can always modify (override)
  if (tenant.role === 'principal') {
    // Check if it's an override (session locked or outside edit window)
    const isLocked = session.status === 'locked';
    const isOutsideWindow = isOutsideEditWindow(session, teacherEditWindowHours);
    return { 
      allowed: true, 
      isPrincipalOverride: isLocked || isOutsideWindow 
    };
  }

  // Teacher checks
  if (tenant.role === 'teacher') {
    // Must have teaching assignment
    const assignment = await findTeachingAssignment(
      db,
      tenant.userId,
      session.classroom_id,
      session.subject_id,
      tenant.schoolId
    );

    if (!assignment) {
      return { allowed: false, reason: 'No teaching assignment for this classroom and subject' };
    }

    // Session must not be locked
    if (session.status === 'locked') {
      return { allowed: false, reason: 'Session is locked' };
    }

    // Must be within edit window
    if (isOutsideEditWindow(session, teacherEditWindowHours)) {
      return { allowed: false, reason: 'Teacher edit window has expired' };
    }

    return { allowed: true };
  }

  return { allowed: false, reason: 'Invalid role for attendance modification' };
}
```

### Full Authorization Code (Marks)

```typescript
// From apps/api/src/marks/marks.authorization.ts

export async function canViewAssessment(
  db: D1Database,
  tenant: TenantContext,
  assessment: Assessment
): Promise<boolean> {
  // Assessment must be from same school
  if (assessment.school_id !== tenant.schoolId) {
    return false;
  }

  // Principal can view all
  if (tenant.role === 'principal') {
    return true;
  }

  // Teacher can view if:
  // 1. They have teaching assignment for this classroom+subject
  // 2. They are class teacher of this classroom (view-only for other subjects)
  if (tenant.role === 'teacher') {
    // Check teaching assignment
    const assignment = await findTeachingAssignment(
      db,
      tenant.userId,
      assessment.classroom_id,
      assessment.subject_id,
      tenant.schoolId
    );

    if (assignment) {
      return true;
    }

    // Check if class teacher
    const classTeacher = await isClassTeacher(
      db,
      tenant.userId,
      assessment.classroom_id,
      tenant.schoolId
    );

    return classTeacher;
  }

  return false;
}

export async function canModifyAssessment(
  db: D1Database,
  tenant: TenantContext,
  assessment: Assessment
): Promise<{ allowed: boolean; isPrincipalOverride?: boolean }> {
  // Assessment must be from same school
  if (assessment.school_id !== tenant.schoolId) {
    return { allowed: false };
  }

  // Principal can always modify (override if locked)
  if (tenant.role === 'principal') {
    return {
      allowed: true,
      isPrincipalOverride: assessment.is_locked,
    };
  }

  // Teacher checks
  if (tenant.role === 'teacher') {
    // Must have teaching assignment
    const assignment = await findTeachingAssignment(
      db,
      tenant.userId,
      assessment.classroom_id,
      assessment.subject_id,
      tenant.schoolId
    );

    if (!assignment) {
      return { allowed: false };
    }

    // Assessment must not be locked
    if (assessment.is_locked) {
      return { allowed: false };
    }

    return { allowed: true };
  }

  return { allowed: false };
}
```

### Security Helper (Tenant Isolation)

```typescript
// From apps/api/src/authz/authz.repository.ts

export async function findTeachingAssignment(
  db: D1Database,
  teacherId: string,
  classroomId: string,
  subjectId: string,
  schoolId: string
): Promise<TeachingAssignment | null> {
  const result = await db
    .prepare(
      `SELECT id, teacher_id, classroom_id, subject_id, school_id
       FROM teaching_assignments
       WHERE teacher_id = ?
         AND classroom_id = ?
         AND subject_id = ?
         AND school_id = ?  -- SECURITY: tenant isolation
         AND status = 'active'
       LIMIT 1`
    )
    .bind(teacherId, classroomId, subjectId, schoolId)
    .first<TeachingAssignment>();

  return result || null;
}

export async function isClassTeacher(
  db: D1Database,
  teacherId: string,
  classroomId: string,
  schoolId: string
): Promise<boolean> {
  const classroom = await db
    .prepare(
      `SELECT id
       FROM classrooms
       WHERE id = ?
         AND school_id = ?  -- SECURITY: tenant isolation
         AND class_teacher_id = ?
       LIMIT 1`
    )
    .bind(classroomId, schoolId, teacherId)
    .first();

  return classroom !== null;
}
```

---

### DIRECT ANSWERS TO YOUR FOUR QUESTIONS:

#### Q1: Does a class teacher get **read** access to every subject taught in their own classroom, even subjects they don't personally teach?

**Answer**: ✅ **YES**

**Evidence**: 
- `canViewAttendanceSession` (line 95-137): Class teacher check returns true after teaching assignment check fails
- `canViewAssessment` (line 147-168): Class teacher check returns true for viewing assessments in their classroom
- Logic: `if (assignment) return true; else if (isClassTeacher) return true;`

**Verdict**: Class teacher can VIEW all subjects in their classroom. ✅ CORRECT per your spec.

#### Q2: Does a class teacher get **write** access ONLY to the subject(s) they're assigned to teach via `teaching_assignments` — i.e., being class teacher alone never grants write?

**Answer**: ✅ **YES** 

**Evidence**:
- `canModifyAttendance` (line 39-95): Teacher write requires `findTeachingAssignment`, NO fallback to `isClassTeacher`
- `canModifyAssessment` (line 89-126): Teacher write requires `findTeachingAssignment`, NO fallback to `isClassTeacher`
- Code path for teacher write: `assignment = findTeachingAssignment(); if (!assignment) return {allowed: false};`

**Verdict**: Class teacher status NEVER grants write access. Only teaching_assignments grant write. ✅ CORRECT per your spec.

#### Q3: Is a non-principal write blocked when the classroom's academic year is not `current`, while a principal's write is still allowed (and audited)?

**Answer**: ❌ **NO - This check is MISSING**

**Evidence**:
- Searched all authorization files for `academic_year.*status` or `year.*status.*current`: **No matches found**
- `canModifyAttendance`: Checks teaching assignment, locked status, edit window - does NOT check year status
- `canModifyAssessment`: Checks teaching assignment, locked status - does NOT check year status
- `enterMarks` service (line 392-508): No academic year status validation before writes

**Gap Found**: Teachers can modify attendance/marks in closed or upcoming years if they have teaching assignments.

**What happens**: 
- Principal write: Allowed (no year check)
- Teacher write: Allowed if has assignment (no year check)
- Audit: Logged as `isPrincipalOverride` only for locked items, NOT for year overrides

**Verdict**: ❌ **TASK REQUIRED** - Add year status check to authorization logic.

#### Q4: Where is `schoolId`/`studentId` sourced from in these checks — token only, or could a URL param or body field override it?

**Answer**: ✅ **Token only (Secure)**

**Evidence**:

1. **schoolId**: Always from `tenant.schoolId`
   - `tenant` comes from `requireSchoolTenant(c)` middleware
   - Middleware extracts from JWT (see `apps/api/src/auth/auth.middleware.ts`)
   - Example from authorization: `if (session.school_id !== tenant.schoolId) return false;`
   - **Never** sourced from URL params or request body

2. **studentId**: ⚠️ **Mixed** (depends on endpoint)
   - `/me/*` endpoints: `tenant.userId` from token ✅
   - Other endpoints: Request parameter, then validated ⚠️
   
**Example from marks service**:
```typescript
// enterMarks function (line 392)
for (const entry of request.entries) {
  // student_id comes from request body
  const enrollments = await findActiveByStudent(
    db,
    entry.student_id,  // ⚠️ From request, not token
    tenant.schoolId    // ✅ From token
  );
  
  // But then validated: must have active enrollment in same school
  const validEnrollment = enrollments.find(
    (e: any) => e.school_id === tenant.schoolId  // Implicit tenant check
  );
}
```

**Security Pattern**:
- URL/body params provide entity IDs (student_id, classroom_id, etc.)
- But ALL database queries include `school_id = tenant.schoolId` filter
- Cross-tenant access blocked by WHERE clause, not by rejecting the student_id

**Example query** (from authz.repository.ts line 108):
```sql
SELECT * FROM enrollments
WHERE student_id = ?          -- from request
  AND classroom_id = ?        -- from request
  AND school_id = ?           -- from token (tenant.schoolId)
  AND status = 'active'
```

**Verdict**: ✅ **SECURE** - schoolId always from token, studentId from request but validated via schoolId-scoped queries.

---

### Summary: Authorization Logic Assessment

| Requirement | Status | Evidence |
|-------------|--------|----------|
| Class teacher READ all subjects | ✅ YES | Both authorization files check `isClassTeacher` after assignment check |
| Class teacher WRITE only assigned | ✅ YES | Write functions check `findTeachingAssignment` only, no class teacher fallback |
| Non-principal blocked on non-current year | ❌ NO | No academic year status checks found in any authorization file |
| schoolId/studentId from token | ✅ YES | schoolId always from `tenant.schoolId`, studentId validated via tenant-scoped queries |

**Tasks Required**:
1. ❌ **Add academic year status check** to `canModifyAttendance` and `canModifyAssessment`
2. ⚠️ **Mark principal override** when writing to non-current year (for audit purposes)

---

## ITEM 4: activateYear Function - Atomicity Analysis

### Full Function Code

```typescript
// From apps/api/src/promotion/promotion.service.ts (line 507-582)

async function activateYear(
  db: D1Database,
  yearId: string,
  tenant: TenantContext
): Promise<ActivationResult> {
  promotionAuthz.ensureCanActivateYear(tenant);

  // Run prechecks
  const precheck = await checkYearActivation(db, yearId, tenant);
  if (!precheck.can_activate) {
    throw PromotionError.activationBlocked(precheck.issues);
  }

  const year = await promotionRepo.findAcademicYear(db, yearId, tenant.schoolId);
  if (!year) {
    throw PromotionError.yearNotFound(yearId);
  }

  // Find current year
  const currentYearResult = await db
    .prepare(`SELECT id FROM academic_years WHERE school_id = ? AND status = 'current'`)
    .bind(tenant.schoolId)
    .first<{ id: string }>();

  const now = Date.now();
  let previousYearId = currentYearResult?.id || null;

  // Audit start
  await logAudit(db, tenant, 'promotion_year_activation_started', 'academic_year', yearId, null, {
    previous_year_id: previousYearId,
    new_year_id: yearId,
  });

  // Activate planned enrollments in target year
  const enrollmentsResult = await db
    .prepare(
      `UPDATE enrollments
       SET status = 'active', updated_at = ?
       WHERE academic_year_id = ? AND school_id = ? AND status = 'planned'`
    )
    .bind(now, yearId, tenant.schoolId)
    .run();

  const enrollmentsActivated = enrollmentsResult.meta?.changes || 0;

  // Close previous year
  if (previousYearId) {
    await db
      .prepare(`UPDATE academic_years SET status = 'closed', updated_at = ? WHERE id = ?`)
      .bind(now, previousYearId)
      .run();
  }

  // Activate new year
  await db
    .prepare(`UPDATE academic_years SET status = 'current', updated_at = ? WHERE id = ?`)
    .bind(now, yearId)
    .run();

  const result: ActivationResult = {
    success: true,
    previous_year_id: previousYearId || '',
    new_year_id: yearId,
    students_promoted: 0, // TODO: Calculate from applied batches
    students_retained: 0,
    students_graduated: 0,
    students_left: 0,
    enrollments_activated: enrollmentsActivated,
    sessions_revoked: 0,
  };

  // Audit completion
  await logAudit(db, tenant, 'promotion_year_activation_completed', 'academic_year', yearId, null, result);

  return result;
}
```

### checkYearActivation (Prechecks)

```typescript
// From apps/api/src/promotion/promotion.service.ts (line 473-505)

async function checkYearActivation(
  db: D1Database,
  yearId: string,
  tenant: TenantContext
): Promise<{ can_activate: boolean; issues: string[] }> {
  promotionAuthz.ensureCanActivateYear(tenant);

  const issues: string[] = [];

  // Check: year exists and is upcoming
  const year = await promotionRepo.findAcademicYear(db, yearId, tenant.schoolId);
  if (!year) {
    issues.push('Academic year not found');
    return { can_activate: false, issues };
  }

  if (year.status !== 'upcoming') {
    issues.push('Year must be in upcoming status to activate');
  }

  // Check: all active students have promotion decisions
  const studentsWithoutDecisions = await db
    .prepare(
      `SELECT COUNT(*) as count
       FROM enrollments e
       WHERE e.school_id = ?
         AND e.status = 'active'
         AND e.outcome IS NULL`
    )
    .bind(tenant.schoolId)
    .first<{ count: number }>();

  if (studentsWithoutDecisions && studentsWithoutDecisions.count > 0) {
    issues.push(`${studentsWithoutDecisions.count} active students have no promotion decision`);
  }

  return {
    can_activate: issues.length === 0,
    issues,
  };
}
```

---

### DIRECT ANSWERS TO YOUR THREE QUESTIONS:

#### Q1: Are the enrollment status flips, year status flips, login disables, and session revocations run as one `db.batch()` / one transaction, or as sequential awaited statements?

**Answer**: ❌ **Sequential awaited statements (NOT atomic)**

**Evidence** (line 536-561):
```typescript
// Statement 1: Activate enrollments
const enrollmentsResult = await db.prepare(`UPDATE enrollments...`).run();

// Statement 2: Close previous year
if (previousYearId) {
  await db.prepare(`UPDATE academic_years SET status = 'closed'...`).run();
}

// Statement 3: Activate new year
await db.prepare(`UPDATE academic_years SET status = 'current'...`).run();
```

**NOT using db.batch()**: Each statement is awaited separately.

**Missing operations**:
- ❌ No login disables for leavers
- ❌ No session revocations
- ❌ No profile status updates for graduates

#### Q2: If sequential: what happens to already-applied steps if a later step throws?

**Answer**: ⚠️ **Half-promoted school (DATA CORRUPTION RISK)**

**Failure scenarios**:

1. **Enrollments activated → year close FAILS**:
   ```
   Result: Students active in NEW year, but old year still marked 'current'
   Impact: Two "current" years exist (violates UNIQUE INDEX)
   Recovery: Manual database fix required
   ```

2. **Enrollments activated, previous closed → new year activation FAILS**:
   ```
   Result: Students active in upcoming year, NO current year exists
   Impact: All current-year queries return empty
   Recovery: Manual database fix required
   ```

3. **Partial success, exception thrown before audit log**:
   ```
   Result: Database changed, no audit trail of who/when
   Impact: Cannot trace who triggered partial activation
   Recovery: Audit log missing, investigation difficult
   ```

**Real-world example**:
```
School has 500 students in Grade 1-5.
Grade 5 students are set to graduate.

Activation starts:
✅ UPDATE enrollments succeeds (200 new active enrollments)
❌ UPDATE academic_years fails (D1 timeout or network error)

Now: 
- 200 students are active in the NEW year
- But academic_years still shows OLD year as 'current'
- Grade 5 students NOT marked as graduated
- Their logins still active (should be disabled)
- They appear enrolled in two years simultaneously
```

#### Q3: Does it run the equivalent of `ACTIVATION_PRECHECKS` (every active student has a decision, every promote/retain student has a planned enrollment) and refuse to proceed if any check returns rows?

**Answer**: ⚠️ **PARTIAL** - Runs prechecks but they're incomplete

**What `checkYearActivation` checks** (line 473-505):
1. ✅ Year exists and is 'upcoming'
2. ✅ All active students have `outcome` set

**What it DOES NOT check**:
3. ❌ All students with outcome='promoted' or 'retained' have a planned enrollment in target year
4. ❌ All planned enrollments in target year have valid target classrooms
5. ❌ No orphaned planned enrollments (student has decision='graduate' but also has planned enrollment)
6. ❌ All promotion batches targeting this year are in 'applied' status

**Missing integrity checks** (should be added):
```sql
-- Check: Every promoted/retained student has planned enrollment
SELECT e.student_id, e.outcome
FROM enrollments e
WHERE e.status = 'active'
  AND e.outcome IN ('promoted', 'retained')
  AND NOT EXISTS (
    SELECT 1 FROM enrollments pe
    WHERE pe.student_id = e.student_id
      AND pe.academic_year_id = ?
      AND pe.status = 'planned'
  );

-- Check: No graduates have planned enrollments
SELECT e.student_id
FROM enrollments e
WHERE e.status = 'active'
  AND e.outcome = 'graduated'
  AND EXISTS (
    SELECT 1 FROM enrollments pe
    WHERE pe.student_id = e.student_id
      AND pe.academic_year_id = ?
      AND pe.status = 'planned'
  );
```

**Named constant status**: ❌ `ACTIVATION_PRECHECKS` does not exist as an exported array of SQL queries.

---

### Summary: activateYear Assessment

| Requirement | Status | Evidence |
|-------------|--------|----------|
| Uses db.batch() for atomicity | ❌ NO | Three sequential `await db.prepare().run()` calls |
| Handles partial failure | ❌ NO | No rollback, half-applied state persists |
| Disables logins for leavers | ❌ NO | Not implemented |
| Revokes sessions | ❌ NO | Not implemented |
| Updates graduate profiles | ❌ NO | Not implemented |
| Runs prechecks | ⚠️ PARTIAL | Checks outcomes exist, but not planned enrollments |
| Refuses if prechecks fail | ✅ YES | Throws PromotionError.activationBlocked |
| ACTIVATION_PRECHECKS constant | ❌ NO | Logic inline, not exported |

**Critical Risk**: ⚠️ **Non-atomic activation can leave database in inconsistent state after network error or D1 timeout.**

---

## TASKS IDENTIFIED FROM VERIFICATION

### High Priority (Blocks Safe Production Use):

1. **Make activateYear atomic**:
   - Replace sequential `await db.prepare().run()` with `db.batch([...])`
   - Add ALL operations to batch:
     - UPDATE enrollments (activate planned)
     - UPDATE enrollments (set outcome=NULL on old actives that are now completed)
     - UPDATE academic_years (close old)
     - UPDATE academic_years (activate new)
     - UPDATE users (disable logins for leavers)
     - DELETE sessions (revoke tokens for leavers)
   - Single batch commit = all-or-nothing

2. **Add academic year status check to authorization**:
   - Add to `canModifyAttendance`: Check classroom's year is 'current' (unless principal)
   - Add to `canModifyAssessment`: Check classroom's year is 'current' (unless principal)
   - Mark principal edits to non-current years as `isPrincipalOverride` in audit

3. **Complete ACTIVATION_PRECHECKS**:
   - Extract prechecks to named constant
   - Add check: promoted/retained students have planned enrollments
   - Add check: graduates don't have planned enrollments
   - Add check: all promotion batches are 'applied'

### Medium Priority (Safety Improvements):

4. **Complete activateYear implementation**:
   - Calculate actual promotion counts (not TODO: 0)
   - Revoke sessions for leavers
   - Mark graduate profiles inactive

5. **Schema reconciliation**:
   - Decide on `employee_code NOT NULL` (repo has it, reference doesn't)
   - Document the 6 extra triggers as intentional hardening

### Low Priority (Naming Consistency):

6. **Authorization naming** (Optional):
   - Keep existing function names (they're descriptive)
   - Update product brief to match implementation
   - OR create wrapper functions with brief's names that call existing ones

---

## NEXT STEPS

**DO NOT START BUILDING** until you:

1. **Confirm schema reconciliation approach**: Keep repo's stricter version or revert to your reference?
2. **Approve the 3 high-priority tasks** above (atomicity, year check, complete prechecks)
3. **Tell me the order**: Which task should I tackle first?

Once confirmed, I'll:
1. Drop your real test suite into place (replace mock tests)
2. Implement the high-priority tasks in the order you specify
3. Verify each change with the test suite

**All authorization logic is working correctly except the year status check**. The missing atomicity in `activateYear` is the biggest risk.

---

**End of Verification Responses**
