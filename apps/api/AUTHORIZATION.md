# Authorization Foundation

## Overview

The authorization module implements role-based access control (RBAC) with relationship-based policies and strict tenant isolation for the School Management System.

**Architecture**: Request → Authentication → TenantContext → Authorization → Service → Database

**Key Principle**: **Deny by default** - all policies explicitly allow access, never implicitly.

---

## Role Model (Locked)

### Roles

1. **super_admin** - Platform-level authority (not in users table)
2. **principal** - School administrative authority
3. **teacher** - Relationship-based classroom/subject access
4. **student** - Self-scoped access

**IMPORTANT**: `super_admin` is a special role recognized by authorization policies but not stored in the `users` table. It exists only in TenantContext for platform-level operations.

---

## Tenant Isolation

### Core Principle

**ALL authorization decisions enforce**: `resource.school_id === tenant.schoolId`

### Protected Against

✅ Client cannot override:
- `body.schoolId`
- `query.schoolId`
- `path/:schoolId`
- `X-School-Id` header
- `X-User-Id` header
- `X-Role` header

✅ TenantContext source: **Authentication middleware only**
- Derived from verified JWT claims
- User record from database
- Session validation

### Super Admin Exception

`super_admin` has platform-level access across all schools for administrative purposes.

---

## Authorization Policies

### Role Checks

```typescript
requireRole(tenant, 'principal')        // Require specific role
requireAnyRole(tenant, ['principal', 'teacher'])  // Require any of roles
```

### School Access

```typescript
canAccessSchool(tenant, schoolId)       // Check school ownership
ensureSchoolAccess(tenant, schoolId)    // Throw if denied
```

**Rules**:
- `super_admin`: All schools
- Others: Only `tenant.schoolId`

### Classroom Access

```typescript
canViewClassroom(db, tenant, { classroomId, schoolId })
```

**Rules**:
- **Super Admin**: All classrooms
- **Principal**: Own school classrooms
- **Teacher**: Own school + (teaching assignment OR class teacher)
- **Student**: Own school + active enrollment

### Student Access

```typescript
canViewStudent(db, tenant, { studentId, schoolId })
```

**Rules**:
- **Super Admin**: All students
- **Principal**: Own school students
- **Teacher**: Own school + student in teacher's classroom
- **Student**: Self only

### Teaching Assignments

```typescript
hasTeachingAssignment(db, tenant, {
  teacherId,
  classroomId,
  subjectId,
  schoolId
})
```

**Verification**: Database-backed relationship check
- Must query `teaching_assignments` table
- Filters: `teacher_id`, `classroom_id`, `subject_id`, `school_id`, `status='active'`
- **Never assumes teacher role alone grants access**

### Class Teacher

```typescript
isClassTeacher(db, tenant, classroomId, schoolId)
```

**Verification**: `classrooms.class_teacher_id === teacher_profile.id`

**Important**: Class teacher status provides **VIEW-only** access to other subjects. Modification requires explicit teaching assignment.

---

## Attendance Authorization

### View Attendance

```typescript
canViewAttendance(db, tenant, {
  classroomId,
  subjectId,
  schoolId
}, studentId?)
```

**Rules**:
- **Super Admin**: All
- **Principal**: Own school
- **Teacher**: Teaching assignment OR class teacher
- **Student**: Own attendance only

### Modify Attendance

```typescript
canModifyAttendance(db, tenant, {
  classroomId,
  subjectId,
  schoolId
})
```

**Rules**:
- **Super Admin**: All
- **Principal**: Own school
- **Teacher**: **MUST have teaching assignment** (class teacher alone insufficient)
- **Student**: Denied

**Critical**: Class teacher can **VIEW** attendance for all subjects but can only **MODIFY** attendance for their assigned subject.

---

## Marks Authorization

### View Marks

```typescript
canViewMarks(db, tenant, {
  classroomId,
  subjectId,
  schoolId
}, studentId?)
```

**Same rules as attendance VIEW**

### Modify Marks

```typescript
canModifyMarks(db, tenant, {
  classroomId,
  subjectId,
  schoolId
})
```

**Same rules as attendance MODIFY**

**Critical**: Class teacher can **VIEW** marks for all subjects but can only **MODIFY** marks for their assigned subject.

---

## Fees Authorization

### View Fees

```typescript
canViewFees(db, tenant, studentId, schoolId)
```

**Rules**:
- **Super Admin**: All
- **Principal**: Own school
- **Student**: Own fees only
- **Teacher**: Denied (unless future requirements change)

### Modify Fees

```typescript
canModifyFees(tenant, schoolId)
```

**Rules**:
- **Super Admin**: All
- **Principal**: Own school
- **Teacher**: Denied
- **Student**: Denied

---

## Database Queries (School-Scoped)

All authorization repository queries enforce `school_id` filtering:

### Teaching Assignments

```sql
SELECT * FROM teaching_assignments
WHERE teacher_id = ?
  AND classroom_id = ?
  AND subject_id = ?
  AND school_id = ?  -- REQUIRED
  AND status = 'active'
```

### Classrooms

```sql
SELECT * FROM classrooms
WHERE id = ?
  AND school_id = ?  -- REQUIRED
```

### Students

```sql
SELECT * FROM student_profiles
WHERE id = ?
  AND school_id = ?  -- REQUIRED
```

### Enrollments

```sql
SELECT * FROM enrollments
WHERE student_id = ?
  AND classroom_id = ?
  AND school_id = ?  -- REQUIRED
  AND status = 'active'
```

**Never query without `school_id` filter** to prevent accidental cross-tenant access.

---

## Error Handling

### Error Types

```typescript
AuthzError {
  code: AuthzErrorCode
  httpStatus: 403
  message: string
}
```

### Error Codes

- `FORBIDDEN` - Generic denial
- `INSUFFICIENT_ROLE` - Role requirement not met
- `TENANT_MISMATCH` - Cross-school access attempt
- `RELATIONSHIP_REQUIRED` - Missing required relationship
- `SELF_ACCESS_ONLY` - Student accessing other student data

### HTTP Status Mapping

- `401 Unauthorized` - Not authenticated (from auth middleware)
- `403 Forbidden` - Authenticated but not authorized (from authz)

**Important**: Always return `403` for authorization failures, **never `404`**, to avoid leaking resource existence across tenants.

---

## Logging

### Authorization Events

```typescript
AuthzEvents.AUTHZ_DENIED
AuthzEvents.AUTHZ_GRANTED
AuthzEvents.TENANT_MISMATCH
AuthzEvents.INSUFFICIENT_ROLE
AuthzEvents.RELATIONSHIP_MISSING
```

### Safe Metadata

Logs include:
- `requestId`
- `userId`
- `schoolId`
- `role`
- `resourceType`
- `action`
- `reasonCode`

Logs **NEVER** include:
- Passwords
- Tokens
- Authorization headers
- Sensitive student data
- Financial records

---

## Test Coverage

### Test Statistics

**Total Authorization Tests**: 52

### Test Matrix

#### Tenant Isolation (6 tests)
- ✅ Principal own school access
- ✅ Principal cross-school denial
- ✅ Teacher cross-school denial
- ✅ Student cross-school denial
- ✅ Super admin platform access
- ✅ Tenant mismatch error handling

#### Role Checks (4 tests)
- ✅ Specific role requirement
- ✅ Insufficient role denial
- ✅ Any-of-roles check
- ✅ No matching role denial

#### Classroom Access (7 tests)
- ✅ Principal own school
- ✅ Principal cross-school denial
- ✅ Teacher with teaching assignment
- ✅ Teacher without assignment denial
- ✅ Class teacher access
- ✅ Student with enrollment
- ✅ Student without enrollment denial

#### Student Access (5 tests)
- ✅ Student self-access
- ✅ Student-to-student denial
- ✅ Principal school access
- ✅ Teacher classroom relationship
- ✅ Teacher without relationship denial

#### Teaching Assignments (4 tests)
- ✅ Specific assignment verification
- ✅ No assignment denial
- ✅ Class teacher verification
- ✅ Non-class-teacher denial

#### Attendance (7 tests)
- ✅ Teacher with assignment VIEW
- ✅ Class teacher VIEW other subjects
- ✅ Teacher MODIFY with assignment
- ✅ Class teacher MODIFY denial for other subjects
- ✅ Student VIEW own
- ✅ Student MODIFY denial
- ✅ Principal VIEW and MODIFY

#### Marks (4 tests)
- ✅ Class teacher VIEW other subjects
- ✅ Class teacher MODIFY denial for other subjects
- ✅ Student VIEW own
- ✅ Student MODIFY denial

#### Fees (5 tests)
- ✅ Student VIEW own
- ✅ Student VIEW other denial
- ✅ Principal MODIFY
- ✅ Teacher MODIFY denial
- ✅ Student MODIFY denial

#### Client Override Protection (3 tests)
- ✅ Ignores body.schoolId
- ✅ Ignores client role claim
- ✅ Ignores client userId

#### Fail Closed (3 tests)
- ✅ Unverified resource denial
- ✅ Missing teacher profile denial
- ✅ Missing student profile denial

#### Error Types (4 tests)
- ✅ Forbidden error
- ✅ Insufficient role error
- ✅ Tenant mismatch error
- ✅ Always 403 status

---

## Security Checklist

### ✅ Implemented

- [✅] Deny by default
- [✅] No cross-tenant access
- [✅] Client context never trusted
- [✅] All database queries school-scoped
- [✅] Teaching assignments database-verified
- [✅] Class teacher VIEW-only for other subjects
- [✅] Students self-scoped
- [✅] No resource existence leakage (always 403)
- [✅] No secrets in logs
- [✅] No `any` types
- [✅] No `@ts-ignore`
- [✅] 154 tests passing (52 authz-specific)
- [✅] TypeScript strict mode
- [✅] Worker compatible

### Critical Rules Enforced

1. **Class Teacher Limitation**: Can VIEW all subjects in their class but can only MODIFY their assigned subject
2. **Teaching Assignment Required**: Teacher role alone does NOT grant access; must verify database relationship
3. **Student Self-Scope**: Students can only access their own records
4. **Tenant Isolation**: All policies verify `resource.school_id === tenant.schoolId`
5. **Fail Closed**: Missing/invalid data results in denial, not accidental allow

---

## Architecture Decisions

### Why Not CASL/OPA/External Engine?

**Decision**: In-code TypeScript policies

**Reasons**:
- Modular monolith architecture
- Simple, testable, explicit
- No additional dependencies
- No network latency
- Type-safe at compile time
- Easy to debug and maintain

### Why Relationship-Based for Teachers?

**Decision**: Database-backed teaching_assignments table

**Reasons**:
- Teachers don't automatically access all school data
- Explicit assignment model
- Class teacher has limited privileges
- Subject-specific authorization
- Audit trail of assignments
- Flexible for scheduling changes

### Why Separate authz Module?

**Decision**: `apps/api/src/authz/` with own types/service/repo

**Reasons**:
- Clear separation from authentication
- Reusable across future business modules
- Testable in isolation
- No circular dependencies
- Framework-independent design

---

## Integration Example

```typescript
import { requireAuth, AuthContext } from './auth/auth.middleware';
import * as authz from './authz/authz.service';

// Protected route with authorization
app.post('/students/:id/marks', requireAuth, async (c: Context<AuthContext>) => {
  const tenant = c.get('tenant');
  const studentId = c.req.param('id');
  const { classroomId, subjectId } = await c.req.json();
  
  // 1. Verify school ownership
  authz.ensureSchoolAccess(tenant, tenant.schoolId);
  
  // 2. Check authorization
  const canModify = await authz.canModifyMarks(
    c.env.DB,
    tenant,
    { classroomId, subjectId, schoolId: tenant.schoolId }
  );
  
  if (!canModify) {
    return c.json({ error: 'Forbidden' }, 403);
  }
  
  // 3. Proceed with business logic
  // ...
});
```

---

## Future Enhancements

### Not Implemented (Intentionally)

- ⏳ Dynamic permissions table
- ⏳ Role hierarchy
- ⏳ Permission inheritance
- ⏳ Policy DSL
- ⏳ External policy engine
- ⏳ Attribute-based access control (ABAC)

**Rationale**: YAGNI - build simple foundation, add complexity only when needed.

### Potential Additions

- Teacher access to fee data (if required by business)
- Parent role (future)
- Admin assistant role (future)
- Department-level permissions (future)
- Time-based access (e.g., exam windows)
- Conditional policies (e.g., only during school hours)

---

## References

- [OWASP Authorization Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html)
- [NIST RBAC Model](https://csrc.nist.gov/projects/role-based-access-control)
- RFC 2904: AAA Authorization Framework

---

## File Structure

```
apps/api/src/authz/
├── authz.types.ts        # Types, contexts, interfaces
├── authz.errors.ts       # Error classes and helpers
├── authz.repository.ts   # School-scoped database queries
├── authz.service.ts      # Authorization policies
└── authz.test.ts         # Comprehensive test suite (52 tests)
```

---

## Verification Commands

```bash
# Run all tests
pnpm test
# 154 tests passing (52 authz-specific)

# Run authorization tests only
pnpm --filter @sms/api test authz

# Type check
pnpm typecheck

# Build
pnpm build
```

---

## Summary

The authorization foundation provides:

✅ **Secure**: Deny by default, tenant-isolated, client-proof
✅ **Flexible**: Role + relationship-based policies
✅ **Testable**: 52 comprehensive tests
✅ **Maintainable**: Clear separation, explicit policies
✅ **Type-safe**: Full TypeScript coverage
✅ **Worker-ready**: No external dependencies

**Ready for business module integration** (Students, Teachers, Attendance, Marks, Fees APIs).
