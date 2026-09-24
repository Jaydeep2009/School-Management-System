# Phase 0 - Exhaustive Schema Diff Report

**Date**: September 19, 2026  
**Comparison**: Repo `apps/api/migrations/0001_init.sql` vs Reference `schema-reference/migrations/0001_init.sql`

## Summary

- **Total Tables**: 25
- **Identical**: 4 (schools, sessions, assignment_attachments, audit_log)
- **Different**: 21 (detailed below)

---

## Tables With NO Differences (Byte-Identical)

1. **schools** ✅
2. **sessions** ✅
3. **assignment_attachments** ✅
4. **audit_log** ✅

---

## Tables With Differences (Detailed Analysis)

### 1. users

**Difference**: Additional triggers in repo

**Reference has**:
- CREATE TABLE users (basic definition)
- Index: idx_users_school_role
- Index: idx_users_school_status
- Unique index: uq_active_principal_per_school

**Repo adds**:
- Trigger: `trg_users_login_id_school_prefix` (BEFORE INSERT)
- Trigger: `trg_users_login_id_school_prefix_update` (BEFORE UPDATE)

**Verdict**: ✅ Repo adds safety (validates login_id prefix matches school code)

---

### 2. teacher_profiles

**Difference 1**: employee_code nullability
- **Reference**: `employee_code TEXT` (nullable)
- **Repo**: `employee_code TEXT NOT NULL`

**Difference 2**: Additional trigger in repo
- **Repo adds**: `trg_teacher_profile_role` (ensures user_id references teacher role)

**Verdict**: ⚠️ **DECISION REQUIRED** - Should employee_code be required?

---

### 3. student_profiles

**Difference**: Additional trigger in repo
- **Repo adds**: `trg_student_profile_role` (ensures user_id references student role)

**Verdict**: ✅ Repo adds safety

---

### 4. academic_years

**Difference**: Line break / whitespace only
- Same columns, same constraints
- Different formatting of CHECK constraint

**Verdict**: ✅ Functionally identical

---

### 5. classrooms

**Difference**: Line break / whitespace only

**Verdict**: ✅ Functionally identical

---

### 6. subjects

**Difference**: Line break / whitespace only

**Verdict**: ✅ Functionally identical

---

### 7. teaching_assignments

**Difference**: Formatting only (no CREATE INDEX line breaks in reference)

**Critical Check**: Does teaching_assignments have a status column?

**Reference schema** (line 231-245):
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

**Repo schema** (reading now...):
