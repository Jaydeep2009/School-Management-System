# Tenant Isolation Verification - Task 2 Complete

**Date**: Phase 0 Task 2 Completion  
**Status**: ✅ VERIFIED - All tenant isolation intact

## Executive Summary

All `teaching_assignments` queries maintain `school_id` filters in WHERE clauses after removing non-existent `status` and `academic_year_id` columns. All function signatures preserve the `schoolId` parameter through the entire call chain.

---

## 1. Repository Layer - `teaching-assignment.repository.ts`

### Function: `findByClassroomAndSubject`

**Signature**:
```typescript
export async function findByClassroomAndSubject(
  db: D1Database,
  classroomId: string,
  subjectId: string,
  schoolId: string  // ✅ Parameter present
): Promise<TeachingAssignment | null>
```

**SQL Query**:
```sql
SELECT id, school_id, teacher_id, classroom_id, subject_id, created_at, updated_at
FROM teaching_assignments
WHERE classroom_id = ?
  AND subject_id = ?
  AND school_id = ?  -- ✅ TENANT FILTER PRESENT
LIMIT 1
```

**Bindings**: `.bind(classroomId, subjectId, schoolId)` ✅

---

## 2. Authorization Layer - `authz.repository.ts`

### Function: `findTeachingAssignment`

**Signature**:
```typescript
export async function findTeachingAssignment(
  db: D1Database,
  teacherId: string,
  classroomId: string,
  subjectId: string,
  schoolId: string  // ✅ Parameter present
): Promise<TeachingAssignment | null>
```

**SQL Query**:
```sql
SELECT id, teacher_id, classroom_id, subject_id, school_id
FROM teaching_assignments
WHERE teacher_id = ?
  AND classroom_id = ?
  AND subject_id = ?
  AND school_id = ?  -- ✅ TENANT FILTER PRESENT
LIMIT 1
```

**Bindings**: `.bind(teacherId, classroomId, subjectId, schoolId)` ✅

---

## 3. Assignments Authorization - `assignments.authorization.ts`

### Local Helper Function: `findTeachingAssignment`

**Signature** (lines 15-23):
```typescript
async function findTeachingAssignment(
  db: D1Database,
  teacherId: string,
  classroomId: string,
  subjectId: string,
  schoolId: string  // ✅ Parameter present
) {
  return await teachingAssignmentRepo.findByClassroomAndSubject(
    db,
    classroomId,
    subjectId,
    schoolId  // ✅ Passed to repository
  );
}
```

### Callers (all pass `tenant.schoolId` from JWT):

| Function | Line | Passes |
|----------|------|--------|
| `canCreateAssignment` | 68 | `tenant.schoolId` ✅ |
| `canModifyAssignment` | 106 | `tenant.schoolId` ✅ |
| `canViewAssignment` | 150 | `tenant.schoolId` ✅ |
| `canPublishAssignment` | ~220 | `tenant.schoolId` ✅ |
| `canCloseAssignment` | ~245 | `tenant.schoolId` ✅ |
| `canManageAttachments` | ~275 | `tenant.schoolId` ✅ |

**Change Made**: Removed 5th parameter `'active'` (non-existent status field)

---

## 4. Marks Authorization - `marks.authorization.ts`

### Local Helper Function: `findTeachingAssignment`

**Signature** (lines 15-27):
```typescript
async function findTeachingAssignment(
  db: D1Database,
  teacherId: string,
  classroomId: string,
  subjectId: string,
  schoolId: string  // ✅ Parameter present
) {
  return await teachingAssignmentRepo.findByClassroomAndSubject(
    db,
    classroomId,
    subjectId,
    schoolId  // ✅ Passed to repository
  );
}
```

### Callers (all pass `tenant.schoolId` from JWT):

| Function | Line | Passes |
|----------|------|--------|
| `canCreateAssessment` | 68 | `tenant.schoolId` ✅ |
| `canModifyAssessment` | 106 | `tenant.schoolId` ✅ |
| `canViewAssessment` | 150 | `tenant.schoolId` ✅ |
| `canPublishAssessment` | ~200 | `tenant.schoolId` ✅ |
| `canLockAssessment` | ~225 | `tenant.schoolId` ✅ |

**Change Made**: Removed 5th parameter `'active'` (non-existent status field)

---

## 5. Service Layer - `teaching-assignment.service.ts`

### Call Site (line 122):

```typescript
const existing = await teachingAssignmentRepo.findByClassroomAndSubject(
  db,
  data.classroom_id,
  data.subject_id,
  schoolId  // ✅ Passed from function parameter (authenticated tenant)
);
```

**Context**: `schoolId` parameter comes from `createTeachingAssignment(db, schoolId, data, actorId)` function signature, which receives it from authenticated JWT context in route handlers.

---

## 6. Tenant Isolation Chain Verification

### Data Flow (School A Teacher Cannot Access School B Assignment):

```
JWT Token (tenant.schoolId = "school_a")
  ↓
Route Handler extracts tenant.schoolId
  ↓
Authorization function receives tenant.schoolId
  ↓
findTeachingAssignment called with tenant.schoolId
  ↓
Repository query: WHERE school_id = ? (bound to "school_a")
  ↓
Database returns ONLY rows where school_id = "school_a"
```

**Result**: A teacher from School A **cannot** resolve a teaching assignment from School B, even if they know the classroom_id and subject_id, because the `school_id` filter is mandatory and sourced from their JWT token.

---

## 7. What Was Changed

### Files Modified (7 total):

1. **apps/api/src/academic/academic.types.ts**
   - Removed `TeachingAssignmentStatus` enum
   - Removed `status` and `academic_year_id` from `TeachingAssignment` type

2. **apps/api/src/academic/teaching-assignment.repository.ts**
   - Removed `status` and `academic_year_id` from all SELECT clauses
   - Removed status filters from queries
   - All queries still have `AND school_id = ?` ✅

3. **apps/api/src/academic/teaching-assignment.service.ts**
   - Removed `academic_year_id` validation logic
   - Call to `findByClassroomAndSubject` still passes `schoolId` ✅

4. **apps/api/src/academic/academic.schemas.ts**
   - Removed `status` and `academic_year_id` from Zod validation schemas

5. **apps/api/src/authz/authz.repository.ts**
   - Removed `AND status = 'active'` filter (column doesn't exist)
   - `AND school_id = ?` filter preserved ✅

6. **apps/api/src/assignments/assignments.authorization.ts**
   - Removed 5th parameter `'active'` from `findByClassroomAndSubject` calls
   - All callers still pass `tenant.schoolId` ✅

7. **apps/api/src/marks/marks.authorization.ts**
   - Removed 5th parameter `'active'` from `findByClassroomAndSubject` calls
   - All callers still pass `tenant.schoolId` ✅

---

## 8. Schema Truth (Ground Truth)

**teaching_assignments table has ONLY these 7 columns**:
- `id` (TEXT PRIMARY KEY)
- `school_id` (TEXT NOT NULL, FK to schools)
- `classroom_id` (TEXT NOT NULL, FK to classrooms)
- `subject_id` (TEXT NOT NULL, FK to subjects)
- `teacher_id` (TEXT NULL, FK to users)
- `created_at` (INTEGER NOT NULL)
- `updated_at` (INTEGER NOT NULL)

**Columns that NEVER existed**:
- ❌ `status`
- ❌ `academic_year_id`

---

## 9. Build Verification

```bash
cd apps/api
pnpm build
```

**Result**: ✅ PASS
- TypeScript compilation: 0 errors
- Wrangler dry-run deploy: Success
- Bundle size: 826.83 KiB / gzipped: 138.68 KiB

---

## 10. Conclusion

✅ **Tenant isolation is intact**  
✅ **All queries have `AND school_id = ?` in WHERE clauses**  
✅ **All function calls pass `schoolId` through the chain**  
✅ **`schoolId` always sourced from `tenant.schoolId` (JWT token)**  
✅ **Build passes with 0 errors**

**Bug Caught**: Found that `status` and `academic_year_id` fields never existed on `teaching_assignments` table but were referenced in 7 files. This was a real schema-code mismatch, not just cleanup.

**Security Verified**: A School A teacher cannot query School B's teaching assignments, even with knowledge of IDs, because the `school_id` filter is mandatory and bound from the authenticated tenant's JWT.
