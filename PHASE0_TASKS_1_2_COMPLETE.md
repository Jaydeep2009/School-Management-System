# Phase 0 - Tasks 1 & 2 Complete

**Date**: September 19, 2026  
**Status**: ✅ Complete

## Task 1: Exhaustive Schema Diff ✅

**Result**: Repo schema is APPROVED as stricter than reference

**Files Created**:
- `PHASE0_TASK1_SCHEMA_DIFF_COMPLETE.md` - Full table-by-table comparison

**Key Findings**:
- **25 tables total** (not 26 as originally counted)
- **4 tables identical**: schools, sessions, assignment_attachments, audit_log
- **21 tables with differences**: All differences are approved (repo adds safety)

**Approved Additions in Repo**:
1. 6 additional triggers (login_id validation, profile role validation, audit immutability)
2. 7 composite foreign keys for tenant safety (created_by, voided_by fields)
3. 2 CHECK constraints for non-negative counters

**Decision Pending**:
- `teacher_profiles.employee_code NOT NULL` - Is this intentional? (Repo has it, reference doesn't)

---

## Task 2: teaching_assignments Schema-Code Mismatch ✅ FIXED

**Critical Issue Found**: Code expected `status` and `academic_year_id` columns that DON'T EXIST in schema

**Root Cause**: Codebase was written for a different schema version

**Fix Applied**: Updated code to match schema (schema is source of truth per spec-v1.1-patch.md)

### Files Modified:

1. **apps/api/src/academic/academic.types.ts**
   - Removed `TeachingAssignmentStatus` type
   - Removed `status` and `academic_year_id` from `TeachingAssignment` interface
   - Removed `academic_year_id` from `CreateTeachingAssignmentRequest`
   - Removed `status` from `UpdateTeachingAssignmentRequest`

2. **apps/api/src/academic/teaching-assignment.repository.ts**
   - Removed status/academic_year_id from all SELECT queries
   - Removed status filter from `findByClassroomAndSubject`
   - Removed academic_year_id from INSERT
   - Removed status from UPDATE
   - Fixed all bindings

3. **apps/api/src/academic/teaching-assignment.service.ts**
   - Removed academic_year_id validation logic
   - Removed status filter from list function
   - Removed completed-status check from update
   - Simplified create to match schema

4. **apps/api/src/academic/academic.schemas.ts**
   - Removed `teachingAssignmentStatusSchema`
   - Removed academic_year_id from create schema
   - Removed status from update schema

5. **apps/api/src/authz/authz.repository.ts**
   - Removed `status = 'active'` filter from `findTeachingAssignment`
   - Removed `status = 'active'` filter from `findAnyTeachingAssignment`

6. **apps/api/src/assignments/assignments.authorization.ts**
   - Removed 5th parameter ('active') from `findByClassroomAndSubject` call

7. **apps/api/src/marks/marks.authorization.ts**
   - Removed 5th parameter ('active') from `findByClassroomAndSubject` call
   - Removed `status: 'active'` from findAll filters

### Schema Truth (per spec-v1.1-patch.md):

```sql
CREATE TABLE teaching_assignments (
  id TEXT PRIMARY KEY,
  school_id TEXT NOT NULL,
  classroom_id TEXT NOT NULL,
  subject_id TEXT NOT NULL,
  teacher_id TEXT,  -- nullable: subject offered but no teacher yet
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  
  UNIQUE (classroom_id, subject_id),
  FOREIGN KEY (classroom_id, school_id) REFERENCES classrooms(id, school_id),
  FOREIGN KEY (subject_id, school_id) REFERENCES subjects(id, school_id),
  FOREIGN KEY (teacher_id, school_id) REFERENCES teacher_profiles(user_id, school_id)
);
```

**Rationale**: 
- Academic year is derived from classroom (classrooms have academic_year_id)
- No status needed - existence in table means assignment is active
- To "deactivate" an assignment: set teacher_id to NULL or delete the row

### Verification:

```bash
cd apps/api
pnpm typecheck
```

**Result**: ✅ **0 errors**

---

## Task 3: Code Generation Validation - PENDING

**Next**: Verify that `login_id`, `employee_code`, `student_code`, `admission_number` are ALL generated server-side from `code_counters` in the same transaction as account creation.

**Files to Check**:
- User creation endpoints (students, teachers, principals)
- Student profile creation
- Teacher profile creation

---

## Task 4: Real Test Suite Replacement - PENDING

**Next**: Replace mock-based `schema.test.ts` with real 80-test suite from `schema-reference/test/schema.test.ts`

**Requirements**:
- Adapt to repo's reconciled schema (extra triggers, composite FKs, CHECK constraints)
- Run against real D1/SQLite, not mocks
- All tests must pass before Phase 1

---

## Summary

✅ **Task 1 Complete**: Exhaustive schema diff documented  
✅ **Task 2 Complete**: teaching_assignments code fixed to match schema  
⏳ **Task 3 Pending**: Code generation validation  
⏳ **Task 4 Pending**: Real test suite replacement

**Typecheck Status**: ✅ PASSING (0 errors)

**Ready for**: Task 3 (code generation validation)
