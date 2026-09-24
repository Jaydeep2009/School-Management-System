# Phase 0, Task 1: Exhaustive Schema Diff - Complete Report

**Date**: September 19, 2026

## CRITICAL FINDING: Schema-Code Mismatch

**teaching_assignments table does NOT have these columns**:
- ❌ `academic_year_id` 
- ❌ `status`

**Reference schema** (line 231-245 of `schema-reference/migrations/0001_init.sql`):
```sql
CREATE TABLE teaching_assignments (
  id TEXT PRIMARY KEY,
  school_id TEXT NOT NULL,
  classroom_id TEXT NOT NULL,
  subject_id TEXT NOT NULL,
  teacher_id TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  
  UNIQUE (classroom_id, subject_id),
  FOREIGN KEY (classroom_id, school_id) REFERENCES classrooms(id, school_id),
  FOREIGN KEY (subject_id, school_id) REFERENCES subjects(id, school_id),
  FOREIGN KEY (teacher_id, school_id) REFERENCES teacher_profiles(user_id, school_id)
);
```

**Repo schema** (line 276-290 of `apps/api/migrations/0001_init.sql`):
```sql
-- IDENTICAL to reference (no academic_year_id, no status)
```

**But code references non-existent columns**:
- `apps/api/src/academic/teaching-assignment.repository.ts` - ALL queries SELECT status and academic_year_id
- `apps/api/src/academic/academic.types.ts` - TeachingAssignment interface includes status and academic_year_id
- `apps/api/src/authz/authz.repository.ts` - findTeachingAssignment filters by `status = 'active'`

**Spec confirmation** (`spec-v1.1-patch.md` line 18):
> `teaching_assignments` | Composite FKs to classroom, subject, teacher profile (same school). Redundant `idx_teaching_assignments_class` dropped

No mention of status or academic_year_id columns being added or removed.

**Impact**: Every authorization check using `findTeachingAssignment` will FAIL at runtime with SQL error "no such column: status"

---

## Complete Table-by-Table Diff

### Tables Identical (4 of 25)

1. **schools** ✅ Byte-identical
2. **sessions** ✅ Byte-identical  
3. **assignment_attachments** ✅ Byte-identical
4. **audit_log** ✅ Byte-identical

### Tables With Differences (21 of 25)

#### 1. users
**Repo adds**:
- Trigger: `trg_users_login_id_school_prefix` (validates login_id starts with school code)
- Trigger: `trg_users_login_id_school_prefix_update` (same for UPDATE)

**Verdict**: ✅ Approved - repo adds safety

---

#### 2. teacher_profiles
**Differences**:
1. **employee_code**: Reference nullable, Repo `NOT NULL`
2. **Repo adds**: Trigger `trg_teacher_profile_role` (validates user_id is teacher role)

**Verdict**: 
- ⚠️ employee_code NOT NULL - **DECISION PENDING** (is this intentional?)
- ✅ Trigger approved - adds safety

---

#### 3. student_profiles
**Repo adds**:
- Trigger: `trg_student_profile_role` (validates user_id is student role)

**Verdict**: ✅ Approved - repo adds safety

---

#### 4. academic_years
**Difference**: Whitespace/formatting only in CHECK constraint
**Verdict**: ✅ Functionally identical

---

#### 5. classrooms
**Difference**: Whitespace/formatting only
**Verdict**: ✅ Functionally identical

---

#### 6. subjects
**Difference**: Whitespace/formatting only
**Verdict**: ✅ Functionally identical

---

#### 7. teaching_assignments
**Difference**: None found - both schemas identical (7 columns, no status, no academic_year_id)
**Critical Issue**: ❌ **Code expects columns that don't exist**
**Verdict**: ⚠️ **MUST FIX CODE** (not schema)

---

#### 8. enrollments
**Differences**:
1. Minor whitespace in CHECK constraints
2. Comment formatting

**Verdict**: ✅ Functionally identical

---

#### 9. promotion_batches
**Differences**:
1. **created_by FK**: Reference has simple FK, Repo adds composite FK `(created_by, school_id)`

**Reference**:
```sql
created_by TEXT NOT NULL REFERENCES users(id),
```

**Repo**:
```sql
created_by TEXT NOT NULL,
...
FOREIGN KEY (created_by, school_id) REFERENCES users(id, school_id),
```

**Verdict**: ✅ Approved - repo adds tenant safety

---

#### 10. promotion_items
**Difference**: Whitespace/formatting only
**Verdict**: ✅ Functionally identical

---

#### 11. attendance_sessions
**Difference**: Whitespace/formatting only
**Verdict**: ✅ Functionally identical

---

#### 12. attendance_entries
**Difference**: Whitespace/formatting only
**Verdict**: ✅ Functionally identical

---

#### 13. assessments
**Differences**:
1. **created_by FK**: Reference has simple FK, Repo has composite FK `(created_by, school_id)`

**Verdict**: ✅ Approved - repo adds tenant safety

---

#### 14. marks
**Difference**: Whitespace/formatting only
**Verdict**: ✅ Functionally identical

---

#### 15. assignments
**Differences**:
1. **created_by FK**: Reference has simple FK, Repo has composite FK `(created_by, school_id)`

**Verdict**: ✅ Approved - repo adds tenant safety

---

#### 16. fee_categories
**Difference**: None found
**Verdict**: ✅ Identical

---

#### 17. fee_charges
**Differences**:
1. **voided_by FK**: Reference simple `REFERENCES users(id)`, Repo composite `(voided_by, school_id)`
2. **created_by FK**: Reference simple, Repo composite

**Verdict**: ✅ Approved - repo adds tenant safety to void operations

---

#### 18. fee_payments
**Differences**:
1. **voided_by FK**: Reference simple, Repo composite
2. **recorded_by FK**: Reference simple, Repo composite

**Verdict**: ✅ Approved - repo adds tenant safety

---

#### 19. receipt_counters
**Difference**: 
- **Repo adds**: `CHECK (last_number >= 0)`

**Reference**:
```sql
last_number INTEGER NOT NULL DEFAULT 0,
```

**Repo**:
```sql
last_number INTEGER NOT NULL DEFAULT 0 CHECK (last_number >= 0),
```

**Verdict**: ✅ Approved - prevents negative counters

---

#### 20. code_counters
**Difference**: 
- **Repo adds**: `CHECK (last_number >= 0)`

**Verdict**: ✅ Approved - prevents negative counters

---

#### 21. import_jobs
**Difference**: Minor whitespace in CHECK constraints
**Verdict**: ✅ Functionally identical

---

## Summary of Differences

### Approved Changes (Repo Stricter Than Reference)

1. **6 Additional Triggers** (all add safety):
   - `trg_users_login_id_school_prefix` 
   - `trg_users_login_id_school_prefix_update`
   - `trg_teacher_profile_role`
   - `trg_student_profile_role`
   - `trg_audit_log_no_update` (note: reference also has these in the triggers section)
   - `trg_audit_log_no_delete`

2. **Composite Foreign Keys** (7 locations - tenant safety):
   - promotion_batches.created_by
   - assessments.created_by
   - assignments.created_by
   - fee_charges.created_by
   - fee_charges.voided_by
   - fee_payments.recorded_by
   - fee_payments.voided_by

3. **CHECK Constraints** (2 locations):
   - receipt_counters.last_number >= 0
   - code_counters.last_number >= 0

### Decisions Required

1. **teacher_profiles.employee_code NOT NULL**: Intentional or revert to nullable?

### Critical Fixes Required

1. ❌ **Remove status and academic_year_id from teaching_assignments code**:
   - Fix academic.types.ts TeachingAssignment interface
   - Fix teaching-assignment.repository.ts (all queries)
   - Fix authz.repository.ts findTeachingAssignment
   - Remove TeachingAssignmentStatus type
   - Update all authorization logic that uses status filter

---

## Reconciliation Decision

**APPROVED**: Keep repo's stricter schema with all additional triggers, composite FKs, and CHECK constraints.

**REQUIRED FIXES**:
1. Fix teaching_assignments code mismatch
2. Decide on employee_code NOT NULL

**NO SCHEMA CHANGES NEEDED** - code needs to match schema, not vice versa.
