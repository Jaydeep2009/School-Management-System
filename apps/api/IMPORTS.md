# Excel Import Infrastructure

**Task 12** — Generic import infrastructure with preview/commit workflow, row-level validation, and timetable import implementation.

---

## Overview

The Imports module provides reusable Excel import infrastructure with:

1. **Preview/Commit Workflow** — Validate before applying changes
2. **Row-Level Validation** — Detailed error reporting with field/code/message
3. **Expiry Management** — Auto-expire uncommitted previews after 24 hours
4. **Extensible Architecture** — Support for multiple import kinds
5. **Audit Logging** — Full operation tracking

---

## Import Workflow

```
1. Frontend: Parse Excel → JSON rows
2. POST /imports/:kind/preview → Validation → Import job created
3. Review: Errors/warnings displayed to user
4. Decision:
   - If valid: POST /imports/:id/commit → Apply changes
   - If invalid: Fix Excel, retry preview
   - If stale: POST /imports/:id/cancel, start over
```

**Key Principles:**
- Import never modifies existing data until commit
- Preview can be reviewed/cancelled without side effects
- Validation errors prevent commit
- Expired previews cannot be committed

---

## Database Schema

### import_jobs

```sql
CREATE TABLE import_jobs (
  id TEXT PRIMARY KEY,
  school_id TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('timetable')),
  status TEXT NOT NULL CHECK (status IN ('preview', 'committed', 'cancelled', 'expired')),
  created_by TEXT NOT NULL,
  preview_data TEXT NOT NULL,
  validation_errors TEXT,
  result_summary TEXT,
  expires_at INTEGER NOT NULL,
  committed_at INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
```

**Fields:**
- **id**: Unique identifier (ulid)
- **school_id**: Tenant isolation
- **kind**: Import type ('timetable')
- **status**: Lifecycle state
- **created_by**: User who initiated import
- **preview_data**: JSON string of parsed rows
- **validation_errors**: JSON string of validation errors
- **result_summary**: JSON string of commit results
- **expires_at**: Unix timestamp (24h from creation)
- **committed_at**: Unix timestamp of commit
- **created_at/updated_at**: Timestamps

---

## Import Status Lifecycle

```
preview → committed (success)
        → cancelled (user action)
        → expired (auto after 24h)
```

**Status Rules:**
- **preview**: Can be retrieved, committed, or cancelled
- **committed**: Final, immutable
- **cancelled**: Final, immutable
- **expired**: Final, cannot be committed

**Expiry Logic:**
- Preview expires 24 hours after creation
- GET /imports/:id returns expired status if past expires_at
- Commit operation checks expiry before applying changes

---

## Endpoints

### POST /imports/:kind/preview

Preview import with validation.

**Request:**
```json
{
  "rows": [
    {
      "academic_year": "2026-27",
      "classroom_code": "10-A",
      "day": "MON",
      "period_no": 1,
      "start_time": "09:00",
      "end_time": "09:45",
      "subject_code": "MATH",
      "teacher_code": "T000123",
      "room": "R101"
    }
  ]
}
```

**Response (Success):**
```json
{
  "data": {
    "id": "01J...",
    "school_id": "...",
    "kind": "timetable",
    "status": "preview",
    "created_by": "...",
    "preview_data": "[...]",
    "validation_errors": null,
    "expires_at": 1737398400,
    "created_at": 1737312000,
    "updated_at": 1737312000
  }
}
```

**Response (Validation Errors):**
```json
{
  "data": {
    "id": "01J...",
    "status": "preview",
    "validation_errors": "[{\"row\":3,\"field\":\"teacher_code\",\"code\":\"NOT_FOUND\",\"message\":\"Teacher T999999 not found\"}]",
    ...
  }
}
```

**Authorization:** Principal only (kind-specific)

### GET /imports/:id

Get import job details.

**Response:**
```json
{
  "data": {
    "id": "01J...",
    "status": "preview",
    "expires_at": 1737398400,
    ...
  }
}
```

**Auto-Expiry:**
If `expires_at < now()`, status returned as "expired".

**Authorization:** Owner or Principal

### POST /imports/:id/commit

Commit previewed import.

**Request:**
```json
{}
```

**Response:**
```json
{
  "data": {
    "id": "01J...",
    "status": "committed",
    "result_summary": "{\"timetables_created\":3,\"entries_created\":45}",
    "committed_at": 1737312300,
    ...
  }
}
```

**Validation:**
- Import must be in "preview" status
- Import must not be expired
- Validation errors must be empty

**Authorization:** Owner or Principal

### POST /imports/:id/cancel

Cancel previewed import.

**Request:**
```json
{}
```

**Response:**
```json
{
  "message": "Import cancelled"
}
```

**Authorization:** Owner or Principal

---

## Timetable Import

### Excel Template Format

**Required Columns:**
```
academic_year | classroom_code | day | period_no | start_time | end_time | subject_code | teacher_code | room
```

**Field Specifications:**

| Field | Type | Required | Format | Example |
|-------|------|----------|--------|---------|
| academic_year | string | Yes | Year label | "2026-27" |
| classroom_code | string | Yes | Classroom code | "10-A" |
| day | string | Yes | MON/TUE/WED/THU/FRI/SAT/SUN | "MON" |
| period_no | integer | Yes | > 0 | 1 |
| start_time | string | No | HH:MM | "09:00" |
| end_time | string | No | HH:MM | "09:45" |
| subject_code | string | Yes | Subject code | "MATH" |
| teacher_code | string | Yes | Employee code | "T000123" |
| room | string | No | Room name | "R101" |

### Validation Rules

**Per-Row Validation:**

1. **Academic Year Validation**
   - Field: `academic_year`
   - Checks: Year exists in school, matches label
   - Error codes: `YEAR_NOT_FOUND`

2. **Classroom Validation**
   - Field: `classroom_code`
   - Checks: Classroom exists in school and year
   - Error codes: `CLASSROOM_NOT_FOUND`

3. **Day Validation**
   - Field: `day`
   - Checks: Valid day (MON-SUN)
   - Error codes: `INVALID_DAY`

4. **Period Validation**
   - Field: `period_no`
   - Checks: Integer > 0
   - Error codes: `INVALID_PERIOD`

5. **Subject Validation**
   - Field: `subject_code`
   - Checks: Subject exists in school
   - Error codes: `SUBJECT_NOT_FOUND`

6. **Teacher Validation**
   - Field: `teacher_code`
   - Checks: Teacher exists in school
   - Error codes: `TEACHER_NOT_FOUND`

7. **Teaching Assignment Validation**
   - Field: `teacher_code`
   - Checks: Teacher assigned to subject/classroom
   - Error codes: `MISSING_TEACHING_ASSIGNMENT`

8. **Time Format Validation**
   - Fields: `start_time`, `end_time`
   - Checks: HH:MM format, start < end
   - Error codes: `INVALID_TIME_FORMAT`, `INVALID_TIME_RANGE`

**Cross-Row Validation:**

9. **Class Slot Conflict**
   - Checks: No duplicate (classroom, day, period) in spreadsheet
   - Error code: `CLASS_SLOT_CONFLICT`
   - Error message includes conflicting row numbers

10. **Teacher Conflict**
    - Checks: Teacher not teaching another class at same time
    - Error code: `TEACHER_CONFLICT`
    - Queries published timetables for conflicts
    - Error message includes conflicting classroom

**Error Response Format:**
```json
{
  "row": 12,
  "field": "teacher_code",
  "code": "TEACHER_CONFLICT",
  "message": "Teacher T000123 is already assigned to Class 9-B on MON period 3"
}
```

### Import Behavior

**Timetable Creation:**
- Rows grouped by `(academic_year, classroom_code)`
- One draft timetable created per group
- Version number auto-generated (next available)
- Timetable name: `"{classroom_code} Timetable {academic_year}"`

**Entry Creation:**
- Each valid row creates one `timetable_entry`
- Entries linked to created draft timetable
- Day converted to integer (1-7)
- Optional fields (start_time, end_time, room) preserved

**Non-Destructive:**
- Import NEVER modifies existing timetables
- Import NEVER deletes entries
- Existing published timetables unaffected
- Principal must manually publish imported drafts

**Result Summary:**
```json
{
  "timetables_created": 3,
  "entries_created": 45,
  "timetable_ids": ["01J...", "01J...", "01J..."]
}
```

### Example Import Session

**1. Prepare Excel:**
```
academic_year | classroom_code | day | period_no | subject_code | teacher_code | room
2026-27       | 10-A          | MON | 1         | MATH         | T000123     | R101
2026-27       | 10-A          | MON | 2         | PHY          | T000456     | R101
2026-27       | 10-B          | MON | 1         | ENG          | T000789     | R102
```

**2. Preview:**
```http
POST /imports/timetable/preview
{
  "rows": [...]
}
```

**3. Check Validation:**
- validation_errors: null (valid)
- Preview data stored
- Expires in 24 hours

**4. Commit:**
```http
POST /imports/01J.../commit
```

**5. Result:**
- 2 draft timetables created (10-A, 10-B)
- 3 entries created
- Principal can now publish

---

## Authorization

### Import Kind Permissions

| Kind | Preview | Commit | Cancel |
|------|---------|--------|--------|
| timetable | Principal | Principal/Owner | Principal/Owner |

### Tenant Isolation

All operations scoped to:
- User's `tenant_context.school_id`
- Import validation checks tenant membership
- Referenced entities (classrooms, teachers) validated within tenant

---

## Audit Actions

All import operations logged:
- **import_previewed**: Preview created with validation results
- **import_committed**: Import applied, entities created
- **import_cancelled**: Import cancelled by user

**Audit Context:**
```json
{
  "import_id": "01J...",
  "kind": "timetable",
  "rows_count": 45,
  "errors_count": 2,
  "timetables_created": 3
}
```

---

## Error Handling

### Preview Errors

Validation errors prevent commit but allow preview creation.

**User Experience:**
1. Upload Excel
2. See validation errors in UI
3. Fix Excel
4. Re-upload (creates new preview)
5. Commit when valid

### Commit Errors

- **Import not found**: 404
- **Already committed**: 400 "Import already committed"
- **Expired**: 400 "Import expired"
- **Has validation errors**: 400 "Cannot commit import with validation errors"
- **Not owner**: 403

### Database Errors

Commit operation uses transaction:
- Rollback on any error
- All timetables/entries created atomically
- Import status updated atomically

---

## V1 Implementation

**Current Support:**
- ✅ Timetable import
- ✅ Preview/commit workflow
- ✅ Row-level validation
- ✅ Conflict detection
- ✅ Teaching assignment validation
- ✅ 24-hour expiry
- ✅ Audit logging

**Future Import Kinds:**
- Student enrollment import
- Teacher assignment import
- Fee structure import
- Marks import

---

## Extension Guide

To add new import kind:

1. **Update Schema:**
```sql
CHECK (kind IN ('timetable', 'new_kind'))
```

2. **Define Types:**
```typescript
type NewKindRow = { ... };
```

3. **Implement Validation:**
```typescript
async function validateNewKindRow(db: D1Database, row: NewKindRow, ...): Promise<ValidationError | null>
```

4. **Implement Commit:**
```typescript
async function commitNewKindImport(db: D1Database, rows: NewKindRow[], ...): Promise<CommitResult>
```

5. **Update Service:**
```typescript
case 'new_kind':
  return validateNewKindImport(...);
```

6. **Add Authorization:**
Update `canPreviewImport`, `canCommitImport` functions.

---

## Summary

Task 12 Imports module provides:

- ✅ Generic preview/commit workflow
- ✅ Row-level validation with detailed errors
- ✅ 24-hour preview expiry
- ✅ Timetable import with conflict detection
- ✅ Non-destructive import behavior
- ✅ Comprehensive audit logging
- ✅ Tenant isolation
- ✅ Extensible architecture

The module integrates with Timetable, Academic Structure, and Teaching Assignments modules.
