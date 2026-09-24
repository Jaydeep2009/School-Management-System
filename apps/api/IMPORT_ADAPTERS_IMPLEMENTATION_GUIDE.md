# Import Adapters & Cron Jobs Implementation Guide

**Status**: Phase 4 & 5 - CRITICAL for Production  
**Priority**: BLOCKING  
**Estimated Effort**: 16-20 hours

## Overview

This document provides complete implementation specifications for the 6 missing import adapters and 4 cron jobs required for production readiness.

---

## Part 1: Import Adapters (6 Required)

### Pattern Overview

All adapters follow the timetable adapter pattern in `apps/api/src/imports/imports.service.ts`:

1. **Validation Phase** (`validate{Kind}Import`):
   - Parse rows with Zod schema
   - Validate foreign keys (academic year, classroom, subject, teacher, student)
   - Check business rules
   - Detect conflicts within batch
   - Return errors and warnings arrays

2. **Commit Phase** (`commit{Kind}Import`):
   - Re-validate (security)
   - Use `db.batch()` for atomicity
   - Handle duplicates/conflicts
   - Return commit result with counts

### 1. Students Roster Import Adapter

**File**: `apps/api/src/imports/imports.service.ts`

**Row Schema**:
```typescript
const studentsImportRowSchema = z.object({
  academic_year: z.string(),
  classroom_code: z.string(),
  admission_number: z.string(),
  first_name: z.string(),
  middle_name: z.string().optional(),
  last_name: z.string(),
  gender: z.enum(['male', 'female', 'other']).optional(),
  date_of_birth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), // YYYY-MM-DD
  parent_name: z.string().optional(),
  parent_phone: z.string().optional(),
  parent_email: z.string().email().optional(),
  address: z.string().optional(),
});
```

**Validation Rules**:
- Academic year must exist and be 'current' or 'upcoming'
- Classroom must exist in specified academic year
- Admission number must be unique within school
- Date of birth must be valid date
- Auto-generate student_code from code_counters
- Auto-generate login_id (SCHOOL_CODE-S-NNNNNN)
- Auto-generate temporary password
- Check for duplicate admission numbers within batch

**Commit Logic**:
```typescript
async function commitStudentsImport(
  db: D1Database,
  rows: unknown[],
  tenant: TenantContext
): Promise<ImportCommitResult> {
  // For each valid row:
  // 1. Increment code_counter for 'student'
  // 2. Create user (login_id, password_hash, role='student')
  // 3. Create student_profile
  // 4. Create enrollment (status='planned' if year is upcoming, 'active' if current)
  // 
  // ALL IN ONE db.batch() for atomicity
  
  let rowsCreated = 0;
  const statements = [];
  
  for (const row of validatedRows) {
    // Get next student number
    // Add INSERT INTO users
    // Add INSERT INTO student_profiles
    // Add INSERT INTO enrollments
    // Add UPDATE code_counters
    statements.push(...userStatements, ...profileStatements, ...enrollmentStatements);
  }
  
  await db.batch(statements);
  return { rows_created: rowsCreated, ... };
}
```

**Summary Stats**:
- Total students to be created
- Breakdown by classroom
- Breakdown by gender
- Age distribution

---

### 2. Attendance Bulk Import Adapter

**Row Schema**:
```typescript
const attendanceImportRowSchema = z.object({
  academic_year: z.string(),
  classroom_code: z.string(),
  subject_code: z.string(),
  session_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  period_no: z.number().int().min(1),
  student_admission_number: z.string(),
  status: z.enum(['present', 'absent', 'late']),
});
```

**Validation Rules**:
- Academic year must be 'current'
- Classroom must exist
- Subject must exist
- Session date must be within academic year
- Teaching assignment must exist for classroom+subject
- Student must be enrolled in classroom on session_date
- Check for duplicate entries (same session + student)
- Group by session (classroom + subject + date + period) - create attendance_session if not exists
- Validate taken_by (use actor_id from import job)

**Commit Logic**:
1. Group rows by unique session (classroom_id + subject_id + date + period)
2. For each session:
   - Check if attendance_session exists (UNIQUE constraint)
   - If not, INSERT attendance_session
   - INSERT all attendance_entries for that session
3. Use db.batch() for all statements

**Summary Stats**:
- Total sessions: X
- Total entries: Y
- Present: A, Absent: B, Late: C
- Coverage: % of enrolled students marked

---

### 3. Marks Bulk Import Adapter

**Row Schema**:
```typescript
const marksImportRowSchema = z.object({
  academic_year: z.string(),
  classroom_code: z.string(),
  subject_code: z.string(),
  assessment_name: z.string(),
  student_admission_number: z.string(),
  marks_obtained: z.number().nullable(), // null = absent/exempt
  status: z.enum(['graded', 'absent', 'exempt']),
});
```

**Validation Rules**:
- Academic year must exist
- Classroom must exist
- Subject must exist  
- Assessment must exist (classroom + subject + name)
- Check assessment is not locked (is_locked = 0)
- Student must be enrolled in classroom
- Marks obtained <= assessment.max_marks
- Status 'graded' requires marks_obtained
- Status 'absent'/'exempt' requires marks_obtained = null
- Check for duplicates (assessment_id + student_id)

**Commit Logic**:
1. Group by assessment
2. For each assessment+student:
   - INSERT or REPLACE INTO marks (assessment_id, student_id, marks_obtained, status)
3. Use WITHOUT ROWID optimization (marks table is WITHOUT ROWID)
4. Use db.batch()

**Summary Stats**:
- Total marks imported: X
- By assessment: assessment_name (Y marks)
- Graded: A, Absent: B, Exempt: C
- Average marks by assessment

---

### 4. Fee Charges Bulk Import Adapter

**Row Schema**:
```typescript
const feeChargesImportRowSchema = z.object({
  academic_year: z.string(),
  student_admission_number: z.string(),
  fee_category_code: z.string(),
  amount: z.number(),
  due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  description: z.string().optional(),
});
```

**Validation Rules**:
- Academic year must exist
- Student must exist and be enrolled in that year
- Fee category must exist
- Amount must be positive (negative = concession, allow)
- Due date must be valid date
- Check for duplicate charges (prevent double-charging same fee)

**Commit Logic**:
1. For each row:
   - INSERT INTO fee_charges (id=ulid, school_id, student_id, fee_category_id, amount, due_date, description, created_by=actor_id)
2. Fee charges are immutable after insert (trigger enforces)
3. Use db.batch()

**Summary Stats**:
- Total charges: X
- Total amount: $Y
- By category: category_name ($Z)
- By student: count distribution
- By due date: upcoming, overdue

---

### 5. Fee Payments Bulk Import Adapter

**Row Schema**:
```typescript
const feePaymentsImportRowSchema = z.object({
  student_admission_number: z.string(),
  amount: z.number().positive(),
  payment_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  payment_method: z.enum(['cash', 'cheque', 'online', 'card']),
  reference_number: z.string().optional(),
  notes: z.string().optional(),
});
```

**Validation Rules**:
- Student must exist
- Amount must be positive
- Payment date must be valid date
- Payment method must be valid enum
- Auto-generate receipt_number from receipt_counters
- Check reference_number uniqueness if provided

**Commit Logic**:
1. For each row:
   - Increment receipt_counter
   - INSERT INTO fee_payments (id=ulid, school_id, student_id, amount, payment_date, payment_method, receipt_number, reference_number, notes, received_by=actor_id)
2. Fee payments are immutable after insert (trigger enforces)
3. Use db.batch()

**Summary Stats**:
- Total payments: X
- Total amount: $Y
- By method: cash ($A), cheque ($B), ...
- By date: daily breakdown
- By student: payment count distribution

---

### 6. Promotion Excel Mode Adapter

**Row Schema**:
```typescript
const promotionImportRowSchema = z.object({
  student_admission_number: z.string(),
  outcome: z.enum(['promoted', 'retained', 'left']),
  target_classroom_code: z.string().optional(), // Required if promoted
  reason: z.string().optional(), // Required if left
});
```

**Validation Rules**:
- Must have active promotion batch for current year
- Student must be enrolled in current year
- Outcome 'promoted': target_classroom_code required, must be in upcoming year
- Outcome 'retained': target_classroom same as current
- Outcome 'left': reason required
- Check for duplicate students in batch
- Validate ALL students in a classroom are included (completeness check - warning if missing)

**Commit Logic**:
1. Get active promotion_batch_id
2. For each row:
   - INSERT INTO promotion_items (id=ulid, batch_id, student_id, outcome, target_classroom_id, reason)
3. Use db.batch()
4. Batch remains 'draft' - user must click "Activate Year" separately

**Summary Stats**:
- Total students: X
- Promoted: A (to Y classrooms)
- Retained: B
- Leaving: C
- By source classroom: breakdown
- By target classroom: breakdown
- Unresolved students: list admission numbers

---

## Part 2: Integration Tests

**File**: `apps/api/src/imports/imports.integration.test.ts` (NEW)

For each adapter, create tests:

```typescript
describe('Students Import Adapter', () => {
  it('should validate and commit valid student roster', async () => {
    // Setup: create academic year, classroom
    // Call previewImport with valid rows
    // Assert 0 errors
    // Call commitImport
    // Assert students created with correct data
    // Assert enrollments created
  });

  it('should detect duplicate admission numbers', async () => {
    // Two rows with same admission_number
    // Assert error on row 2
  });

  it('should reject invalid date of birth', async () => {
    // Invalid date format
    // Assert validation error
  });

  it('should be atomic - all or nothing', async () => {
    // 10 valid rows + 1 invalid (non-existent classroom)
    // Commit should fail
    // Assert 0 students created
  });
});

// Repeat for all 6 adapters
```

---

## Part 3: Cron Jobs (4 Required)

### Architecture

**File**: `apps/api/src/cron/handlers.ts` (NEW)

Cron jobs run on Cloudflare Workers scheduled triggers defined in `wrangler.toml`.

### 1. Birthday Digest Cron

**Schedule**: Daily at 6:00 AM IST

**Logic**:
```typescript
export async function birthdayDigestCron(env: Env): Promise<void> {
  const db = env.DB;
  const today = new Date();
  const todayMD = `${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  // Find all students with birthday today
  const students = await db.prepare(`
    SELECT s.school_id, s.first_name, s.last_name, s.student_code, s.date_of_birth,
           c.name as classroom_name
    FROM student_profiles s
    INNER JOIN enrollments e ON s.user_id = e.student_id AND e.status = 'active'
    INNER JOIN classrooms c ON e.classroom_id = c.id
    WHERE s.dob_md = ?
    ORDER BY s.school_id, c.name, s.first_name
  `).bind(todayMD).all();

  // Group by school
  const bySchool = groupBy(students.results, 'school_id');

  // For each school, compile list and log/email
  for (const [schoolId, schoolStudents] of Object.entries(bySchool)) {
    console.log(`[Birthday Digest] ${schoolId}: ${schoolStudents.length} birthdays today`);
    // TODO: Send email notification to principal
    // TODO: Store in notifications table
  }
}
```

**wrangler.toml**:
```toml
[triggers]
crons = ["0 0 * * *"]  # Daily at midnight UTC (adjust for IST)
```

---

### 2. Attendance Statistics Cron

**Schedule**: Daily at 1:00 AM IST

**Logic**:
```typescript
export async function attendanceStatsCron(env: Env): Promise<void> {
  const db = env.DB;

  // Calculate daily attendance percentage per classroom
  // Calculate weekly attendance percentage per student
  // Identify students with < 75% attendance (alert threshold)
  // Update attendance_summary table (create if needed)

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const dateStr = yesterday.toISOString().split('T')[0];

  const stats = await db.prepare(`
    SELECT 
      c.id as classroom_id,
      c.code as classroom_code,
      COUNT(DISTINCT ae.student_id) as total_students,
      SUM(CASE WHEN ae.status = 'present' THEN 1 ELSE 0 END) as present_count,
      SUM(CASE WHEN ae.status = 'absent' THEN 1 ELSE 0 END) as absent_count
    FROM attendance_sessions asess
    INNER JOIN attendance_entries ae ON asess.id = ae.session_id
    INNER JOIN classrooms c ON asess.classroom_id = c.id
    WHERE asess.session_date = ?
    GROUP BY c.id
  `).bind(dateStr).all();

  console.log(`[Attendance Stats] Processed ${stats.results.length} classrooms for ${dateStr}`);
}
```

---

### 3. Marks Statistics Cron

**Schedule**: Daily at 2:00 AM IST

**Logic**:
```typescript
export async function marksStatsCron(env: Env): Promise<void> {
  const db = env.DB;

  // Calculate per-assessment statistics:
  // - Mean, median, std deviation
  // - Grade distribution (A/B/C/D/F based on percentage)
  // - Topper (highest marks)
  // - Students failing (< 40%)
  
  // Calculate per-student statistics:
  // - Overall average across all subjects
  // - Rank in class
  // - Performance trend

  const recentAssessments = await db.prepare(`
    SELECT id, name, max_marks, classroom_id
    FROM assessments
    WHERE is_published = 1 AND is_locked = 1
    AND updated_at > ?
  `).bind(Date.now() - 86400000).all(); // Last 24 hours

  for (const assessment of recentAssessments.results) {
    const marks = await db.prepare(`
      SELECT marks_obtained, status
      FROM marks
      WHERE assessment_id = ? AND status = 'graded'
    `).bind(assessment.id).all();

    // Calculate stats
    const obtained = marks.results.map(m => m.marks_obtained);
    const mean = obtained.reduce((a, b) => a + b, 0) / obtained.length;
    // ... more stats

    console.log(`[Marks Stats] Assessment ${assessment.name}: Mean = ${mean}`);
  }
}
```

---

### 4. Fee Reminders Cron

**Schedule**: Daily at 8:00 AM IST

**Logic**:
```typescript
export async function feeRemindersCron(env: Env): Promise<void> {
  const db = env.DB;

  // Find students with overdue fee charges
  const today = Date.now();

  const overdueCharges = await db.prepare(`
    SELECT 
      fc.id,
      fc.student_id,
      s.first_name,
      s.last_name,
      s.student_code,
      s.parent_phone,
      s.parent_email,
      fcat.name as fee_category,
      fc.amount,
      fc.due_date,
      fc.school_id
    FROM fee_charges fc
    INNER JOIN student_profiles s ON fc.student_id = s.user_id
    INNER JOIN fee_categories fcat ON fc.fee_category_id = fcat.id
    WHERE fc.due_date < ?
    AND fc.voided_at IS NULL
    AND fc.id NOT IN (
      SELECT fee_charge_id FROM fee_payments WHERE fee_charge_id IS NOT NULL
    )
    ORDER BY fc.school_id, fc.due_date
  `).bind(today).all();

  console.log(`[Fee Reminders] ${overdueCharges.results.length} overdue charges`);

  // Group by school and send reminder notifications
  // TODO: Send SMS/Email to parents
  // TODO: Store in notifications table
}
```

---

### Wrangler Configuration

**File**: `apps/api/wrangler.toml`

```toml
[triggers]
crons = [
  "0 0 * * *",    # Birthday digest - midnight UTC (5:30 AM IST)
  "19 30 * * *",  # Attendance stats - 7:30 PM UTC (1:00 AM IST)
  "20 30 * * *",  # Marks stats - 8:30 PM UTC (2:00 AM IST)  
  "2 30 * * *",   # Fee reminders - 2:30 AM UTC (8:00 AM IST)
]

[[unsafe.bindings]]
name = "CRON_SECRET"
type = "secret"
text = "your-cron-secret-here"
```

**Cron Handler**: `apps/api/src/index.ts`

```typescript
import { birthdayDigestCron, attendanceStatsCron, marksStatsCron, feeRemindersCron } from './cron/handlers';

export default {
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    const cron = event.cron;
    
    console.log(`[CRON] Triggered: ${cron}`);

    try {
      switch (cron) {
        case '0 0 * * *':
          await birthdayDigestCron(env);
          break;
        case '19 30 * * *':
          await attendanceStatsCron(env);
          break;
        case '20 30 * * *':
          await marksStatsCron(env);
          break;
        case '2 30 * * *':
          await feeRemindersCron(env);
          break;
        default:
          console.warn(`[CRON] Unknown schedule: ${cron}`);
      }
    } catch (error) {
      console.error(`[CRON] Error in ${cron}:`, error);
      // Don't throw - cron should not fail
    }
  },

  async fetch(request: Request, env: Env): Promise<Response> {
    // ... existing HTTP handler
  }
};
```

---

## Testing Strategy

1. **Unit Tests** (per adapter):
   - Valid input → success
   - Invalid FK → error
   - Duplicate detection
   - Business rule violations
   - Atomicity (all-or-nothing)

2. **Integration Tests** (with real D1):
   - End-to-end import flow
   - Preview → Commit → Verify
   - Large datasets (100+ rows)
   - Concurrent imports (race conditions)

3. **Cron Tests**:
   - Mock env.DB
   - Verify correct data fetched
   - Verify correct calculations
   - Verify idempotency (run twice = same result)

---

## Implementation Checklist

### Import Adapters
- [ ] Students: validate + commit functions
- [ ] Attendance: validate + commit functions
- [ ] Marks: validate + commit functions
- [ ] Fee Charges: validate + commit functions
- [ ] Fee Payments: validate + commit functions
- [ ] Promotion: validate + commit functions
- [ ] Integration tests (1 file, 30+ tests)

### Cron Jobs
- [ ] Create `apps/api/src/cron/handlers.ts`
- [ ] Birthday digest implementation
- [ ] Attendance stats implementation
- [ ] Marks stats implementation
- [ ] Fee reminders implementation
- [ ] Update `wrangler.toml` with cron triggers
- [ ] Update `src/index.ts` with scheduled handler
- [ ] Unit tests for each cron (mock DB)

### Final Verification
- [ ] Run full test suite: `pnpm test`
- [ ] TypeCheck: `pnpm typecheck`
- [ ] Build: `pnpm build`
- [ ] Deploy to dev: `pnpm deploy`
- [ ] Test one cron manually: `wrangler dev --test-scheduled`

---

## Estimated Timeline

- Import Adapters: 12-14 hours
  - Students: 2h
  - Attendance: 2.5h
  - Marks: 2h
  - Fee Charges: 1.5h
  - Fee Payments: 1.5h
  - Promotion: 2h
  - Tests: 3h

- Cron Jobs: 4-6 hours
  - Birthday: 1h
  - Attendance Stats: 1.5h
  - Marks Stats: 1.5h
  - Fee Reminders: 1h
  - Configuration: 0.5h
  - Tests: 1h

**Total: 16-20 hours**

---

## Priority Order

1. **Students** (highest impact - needed for all other imports)
2. **Marks** (needed for report cards)
3. **Attendance** (needed for compliance reporting)
4. **Fee Charges** (needed for billing)
5. **Fee Payments** (needed for accounting)
6. **Promotion** (end-of-year operation)
7. **Birthday Cron** (nice-to-have)
8. **Attendance Stats Cron** (monitoring)
9. **Marks Stats Cron** (analytics)
10. **Fee Reminders Cron** (collections)

---

## Success Criteria

✅ All 6 import adapters implemented  
✅ All 4 cron jobs implemented  
✅ 30+ integration tests passing  
✅ TypeCheck: 0 errors  
✅ Build: Success  
✅ Manual testing: Import 100+ students successfully  
✅ Manual testing: Trigger cron job successfully  

---

**End of Implementation Guide**
