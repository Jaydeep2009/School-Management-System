# Academic Structure Foundation

This document describes the academic structure implementation: academic years, classrooms, subjects, teaching assignments, and enrollments.

## Overview

The academic structure provides the foundational resources for organizing school operations:

- **Academic Years**: Define time periods for school operations (e.g., "2024-2025")
- **Classrooms**: Organize students into groups (e.g., "Grade 10 - Section A")
- **Subjects**: Define curriculum subjects (e.g., "Mathematics", "Physics")
- **Teaching Assignments**: Map teachers to classroom-subject combinations
- **Enrollments**: Track student membership in classrooms across academic years

## Security Model

### Tenant Isolation

**All queries are school-scoped**. Every repository query includes a `WHERE school_id = ?` clause:

```typescript
// ✅ CORRECT: Always filter by school_id
const year = await db
  .prepare('SELECT * FROM academic_years WHERE id = ? AND school_id = ?')
  .bind(id, schoolId)
  .first();

// ❌ WRONG: Never query without school_id filter
const year = await db
  .prepare('SELECT * FROM academic_years WHERE id = ?')
  .bind(id)
  .first();
```

### Authorization

All routes use the existing authorization foundation:

- **Principal**: Full access (create, read, update)
- **Teacher**: Read-only access (with relationship-based filtering)
- **Student**: Read-only access (limited to own records)

The service layer never checks roles—that's the responsibility of route handlers and the authorization service.

### Client Override Protection

**Never trust client-provided values**:

```typescript
// ✅ CORRECT: schoolId from authenticated TenantContext
const tenant = getTenant(c);
await service.create(db, tenant.schoolId, data);

// ❌ WRONG: Never use client-provided schoolId
await service.create(db, data.schoolId, data); // SECURITY VIOLATION
```

## API Endpoints

### Academic Years

```
GET    /academic-years          List all academic years
GET    /academic-years/current  Get current academic year
GET    /academic-years/:id      Get academic year by ID
POST   /academic-years          Create academic year (principal only)
PATCH  /academic-years/:id      Update academic year (principal only)
POST   /academic-years/:id/activate  Activate academic year (principal only)
POST   /academic-years/:id/close     Close academic year (principal only)
```

**Business Rules**:
- Only one `current` academic year per school
- Status transitions: `upcoming` → `current` → `closed`
- `starts_on` must be before `ends_on`
- Cannot modify dates/label after status is `current` or `closed`
- Label must be unique within school

### Classrooms

```
GET    /classrooms        List classrooms
GET    /classrooms/:id    Get classroom by ID
POST   /classrooms        Create classroom (principal only)
PATCH  /classrooms/:id    Update classroom (principal only)
```

**Query Parameters** (GET /classrooms):
- `academic_year_id`: Filter by academic year
- `status`: Filter by status (active|inactive|archived)

**Business Rules**:
- `classroom_code` must be unique within academic year
- `grade_name` + `division_name` must be unique within academic year
- Classroom must belong to an active academic year
- `class_teacher_id` is optional (teachers can be assigned later)

**Authorization**:
- Principal: View all classrooms
- Teacher: View classrooms they teach or are class teacher of
- Student: View their own classroom

### Subjects

```
GET    /subjects        List subjects
GET    /subjects/:id    Get subject by ID
POST   /subjects        Create subject (principal only)
PATCH  /subjects/:id    Update subject (principal only)
```

**Query Parameters** (GET /subjects):
- `status`: Filter by status (active|inactive)

**Business Rules**:
- `subject_code` must be unique within school
- Subjects are school-wide (not year-specific)

### Teaching Assignments

```
GET    /teaching-assignments        List teaching assignments
GET    /teaching-assignments/:id    Get teaching assignment by ID
POST   /teaching-assignments        Create assignment (principal only)
PATCH  /teaching-assignments/:id    Update assignment (principal only)
```

**Query Parameters** (GET /teaching-assignments):
- `academic_year_id`: Filter by academic year
- `teacher_id`: Filter by teacher
- `classroom_id`: Filter by classroom
- `subject_id`: Filter by subject
- `status`: Filter by status (active|completed)

**Business Rules**:
- Only one active assignment per classroom-subject combination
- Classroom, subject, and teacher must all belong to same school
- Classroom must belong to the specified academic year
- Classroom and subject must both be `active`
- Cannot change teacher for `completed` assignments

### Enrollments

```
GET    /enrollments        List enrollments
GET    /enrollments/:id    Get enrollment by ID
POST   /enrollments        Create enrollment (principal only)
PATCH  /enrollments/:id    Update enrollment (principal only)
```

**Query Parameters** (GET /enrollments):
- `academic_year_id`: Filter by academic year
- `classroom_id`: Filter by classroom
- `student_id`: Filter by student
- `status`: Filter by status

**Business Rules**:
- Student can have only one `active` enrollment per academic year
- No duplicate enrollment for same student+classroom+year
- Classroom must belong to the specified academic year
- Classroom must be `active`
- Status transitions:
  - `planned` → `active`, `left`
  - `active` → `completed`, `left`, `transferred`
  - `completed`, `left`, `transferred` are terminal states
- `left_on` required when transitioning to `left` or `transferred`
- `outcome` can only be set when status is `completed`

**Roll Numbers**:
- Roll numbers are enrollment-specific (not on student profile)
- A student's roll number may differ across years or schools
- Roll numbers are optional and can be assigned later

**Authorization**:
- Principal: Full access
- Teacher: View enrollments in their classrooms
- Student: View own enrollments only

## Audit Logging

All mutations are logged to the `audit_log` table with before/after states:

**Academic Year Events**:
- `created`: New academic year created
- `updated`: Academic year details updated
- `activated`: Academic year set to current
- `closed`: Academic year closed

**Classroom Events**:
- `created`: New classroom created
- `updated`: Classroom details updated
- `class_teacher_assigned`: Class teacher assigned to classroom
- `class_teacher_removed`: Class teacher removed from classroom

**Subject Events**:
- `created`: New subject created
- `updated`: Subject details updated

**Teaching Assignment Events**:
- `teacher_assigned`: Teaching assignment created
- `teacher_changed`: Teacher changed for assignment
- `updated`: Assignment details updated

**Enrollment Events**:
- `enrollment_created`: Student enrolled in classroom
- `enrollment_completed`: Enrollment marked as completed
- `enrollment_status_changed`: Enrollment status changed
- `updated`: Enrollment details updated

Audit entries include:
- Actor (user ID and role)
- Entity type and ID
- Before/after states (JSON)
- Timestamp
- School ID (for filtering)

## Architecture

### Layer Structure

```
Routes (auth + authz)
  ↓
Services (business logic)
  ↓
Repositories (data access)
  ↓
Database (D1)
```

**Repositories**: Pure data access, all queries school-scoped
**Services**: Business logic, validation, lifecycle rules
**Routes**: Authentication, authorization, request/response handling, audit logging

### File Organization

```
apps/api/src/academic/
  ├── academic.types.ts              # TypeScript types
  ├── academic.schemas.ts            # Zod validation schemas
  ├── academic.test.ts               # Comprehensive test suite
  │
  ├── academic-year.repository.ts    # Data access layer
  ├── academic-year.service.ts       # Business logic layer
  ├── academic-year.routes.ts        # HTTP routes
  │
  ├── classroom.repository.ts
  ├── classroom.service.ts
  ├── classroom.routes.ts
  │
  ├── subject.repository.ts
  ├── subject.service.ts
  ├── subject.routes.ts
  │
  ├── teaching-assignment.repository.ts
  ├── teaching-assignment.service.ts
  ├── teaching-assignment.routes.ts
  │
  ├── enrollment.repository.ts
  ├── enrollment.service.ts
  └── enrollment.routes.ts

apps/api/src/lib/audit/
  └── audit.service.ts               # Audit logging
```

## Example Usage

### Creating an Academic Year

```bash
POST /academic-years
Authorization: Bearer <token>
Content-Type: application/json

{
  "label": "2024-2025",
  "starts_on": "2024-04-01",
  "ends_on": "2025-03-31",
  "status": "upcoming"
}
```

### Creating a Classroom

```bash
POST /classrooms
Authorization: Bearer <token>
Content-Type: application/json

{
  "academic_year_id": "year-uuid",
  "classroom_code": "10-A",
  "grade_name": "Grade 10",
  "division_name": "A",
  "grade_level": 10,
  "class_teacher_id": "teacher-uuid"
}
```

### Assigning a Teacher

```bash
POST /teaching-assignments
Authorization: Bearer <token>
Content-Type: application/json

{
  "academic_year_id": "year-uuid",
  "teacher_id": "teacher-uuid",
  "classroom_id": "classroom-uuid",
  "subject_id": "subject-uuid"
}
```

### Enrolling a Student

```bash
POST /enrollments
Authorization: Bearer <token>
Content-Type: application/json

{
  "academic_year_id": "year-uuid",
  "classroom_id": "classroom-uuid",
  "student_id": "student-uuid",
  "roll_number": "1",
  "joined_on": "2024-04-01",
  "status": "active"
}
```

## Testing

The test suite (`academic.test.ts`) covers:

**Tenant Isolation**:
- Cross-school access denial for all entities
- List operations only return own school's data
- Updates cannot modify other schools' data

**Business Logic**:
- One current academic year per school
- Unique constraints (labels, codes, grade+division)
- Date validation (starts_on < ends_on)
- Status transitions
- Lifecycle rules

**Cross-Resource Validation**:
- Classroom-year relationship validation
- Active status requirements
- Teacher/student school membership

**Enrollment Rules**:
- One active enrollment per year
- Status transitions
- Duplicate prevention

Run tests:
```bash
pnpm test
```

All 159 tests pass (22 academic structure tests + 137 existing tests).

## Data Model

### academic_years
- `id`: UUID primary key
- `school_id`: Foreign key to schools (tenant isolation)
- `label`: Academic year label (e.g., "2024-2025")
- `starts_on`: Start date (DATE)
- `ends_on`: End date (DATE)
- `status`: upcoming | current | closed
- `created_at`, `updated_at`: Timestamps

**Indexes**: `school_id`, `school_id + status`

### classrooms
- `id`: UUID primary key
- `school_id`: Foreign key to schools (tenant isolation)
- `academic_year_id`: Foreign key to academic_years
- `classroom_code`: Unique code within year
- `grade_name`: Grade name (e.g., "Grade 10")
- `division_name`: Division name (e.g., "A")
- `grade_level`: Numeric level for sorting
- `class_teacher_id`: Optional foreign key to users
- `status`: active | inactive | archived
- `created_at`, `updated_at`: Timestamps

**Indexes**: `school_id`, `academic_year_id`, `class_teacher_id`
**Unique**: `school_id + academic_year_id + classroom_code`
**Unique**: `school_id + academic_year_id + grade_name + division_name`

### subjects
- `id`: UUID primary key
- `school_id`: Foreign key to schools (tenant isolation)
- `subject_code`: Unique code within school
- `name`: Subject name
- `description`: Optional description
- `status`: active | inactive
- `created_at`, `updated_at`: Timestamps

**Indexes**: `school_id`
**Unique**: `school_id + subject_code`

### teaching_assignments
- `id`: UUID primary key
- `school_id`: Foreign key to schools (tenant isolation)
- `academic_year_id`: Foreign key to academic_years
- `teacher_id`: Foreign key to users
- `classroom_id`: Foreign key to classrooms
- `subject_id`: Foreign key to subjects
- `status`: active | completed
- `created_at`, `updated_at`: Timestamps

**Indexes**: `school_id`, `teacher_id`, `classroom_id`, `subject_id`, `academic_year_id`
**Unique**: `school_id + classroom_id + subject_id + status` (for active)

### enrollments
- `id`: UUID primary key
- `school_id`: Foreign key to schools (tenant isolation)
- `academic_year_id`: Foreign key to academic_years
- `classroom_id`: Foreign key to classrooms
- `student_id`: Foreign key to users
- `roll_number`: Optional roll number
- `joined_on`: Date student joined classroom
- `left_on`: Optional date student left
- `status`: planned | active | completed | left | transferred
- `outcome`: promoted | repeated | dropped (nullable)
- `from_enrollment_id`: Optional link to previous enrollment
- `created_at`, `updated_at`: Timestamps

**Indexes**: `school_id`, `student_id`, `classroom_id`, `academic_year_id`
**Unique**: `school_id + academic_year_id + classroom_id + student_id`

## Future Enhancements

Features explicitly **not implemented** in this foundation (deferred to later tasks):

- Student CRUD operations
- Teacher CRUD operations
- Attendance tracking
- Marks and assessments
- Fee management
- Promotion workflow (moving students between years)
- Bulk operations (bulk enrollment, bulk teaching assignments)
- Cascade delete handling
- Soft delete support
- Historical data queries
- Reporting and analytics
- Import/export functionality

## Implementation Notes

### Design Decisions

**Repository Pattern**: All data access goes through repositories with explicit school-scoping
- **Chosen**: Repository methods always require `schoolId` parameter
- **Rejected**: Trusting resource ownership after initial fetch
- **Reason**: Prevent cross-tenant access at the query level

**Status Enums**: Using database-enforced enums
- **Chosen**: Match enum values exactly to database schema
- **Rejected**: String literals without validation
- **Reason**: Type safety and database constraint enforcement

**Roll Numbers on Enrollment**: Roll numbers stored per enrollment, not per student
- **Chosen**: `enrollments.roll_number` column
- **Rejected**: `student_profiles.roll_number` column
- **Reason**: Roll numbers can change across years/schools, must preserve history

**Class Teacher as Field**: Class teacher is a classroom field, not a role
- **Chosen**: `classrooms.class_teacher_id` field
- **Rejected**: Special "class_teacher" role or separate table
- **Reason**: Simplicity, matches authorization requirements (class teacher ≠ role)

**Immutable Audit Log**: Audit entries cannot be modified or deleted
- **Chosen**: Database triggers prevent UPDATE/DELETE on audit_log
- **Rejected**: Application-level protection only
- **Reason**: Guarantee audit trail integrity

### Verification

All verification passing:
- ✅ TypeScript compilation: No errors
- ✅ Tests: 159 passed (22 academic + 137 existing)
- ✅ Build: Worker 364.27 KiB
- ✅ Tenant isolation: Verified in tests
- ✅ Authorization integration: Uses existing authz service
- ✅ Audit logging: All mutations logged

### Migration Path

This implementation is compatible with the existing D1 schema (`0001_init.sql`). No schema changes required.

To use:
1. Ensure database is migrated: `pnpm db:migrate`
2. Routes are already registered in `src/index.ts`
3. Test with principal credentials (teachers/students have read-only access)

## Support

For questions or issues:
- Review test suite for examples: `src/academic/academic.test.ts`
- Check authorization rules: `src/authz/authz.service.ts`
- Verify tenant isolation: All repositories filter by `school_id`
- Check audit logs: `audit_log` table for mutation history
