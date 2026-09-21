# Timetable Management

**Task 12** — Versioned class timetables with conflict detection, publish/archive lifecycle, and Excel import support.

---

## Overview

The Timetable module provides comprehensive class schedule management with:

1. **Versioned Timetables** — Multiple draft/published/archived versions per classroom
2. **Immutable Published Versions** — Historical timetable preservation
3. **Conflict Detection** — Class slot and teacher conflicts
4. **Teaching Assignment Validation** — Only assigned teachers can be scheduled
5. **Excel Import** — Upload timetable from standardized template
6. **Self-Service Views** — Students/teachers can view their schedules

---

## Versioning Model

Each timetable is identified by:
- School
- Academic Year
- Classroom
- **Version** (server-generated, incremental)

### Version Lifecycle

```
Draft v1 → Published v1 → Archived v1
                ↓
Draft v2 → Published v2 → Archived v2
                ↓
Draft v3 (current)
```

**Rules:**
- Only ONE published version per classroom/year at a time
- Published versions are IMMUTABLE
- Editing requires creating new version
- Version numbers are server-generated (never client-provided)

---

## Timetable Status

- **draft** — Editable, not visible to students/teachers
- **published** — Active, visible, immutable
- **archived** — Historical, immutable, retained for records

---

## Database Schema

### timetables

```sql
CREATE TABLE timetables (
  id TEXT PRIMARY KEY,
  school_id TEXT NOT NULL,
  academic_year_id TEXT NOT NULL,
  classroom_id TEXT NOT NULL,
  version INTEGER NOT NULL CHECK (version > 0),
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'published', 'archived')),
  created_by TEXT NOT NULL,
  published_at INTEGER,
  archived_at INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  UNIQUE (school_id, academic_year_id, classroom_id, version)
);

CREATE UNIQUE INDEX uq_published_timetable
  ON timetables(school_id, academic_year_id, classroom_id)
  WHERE status = 'published';
```

### timetable_entries

```sql
CREATE TABLE timetable_entries (
  id TEXT PRIMARY KEY,
  timetable_id TEXT NOT NULL REFERENCES timetables(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 1 AND 7),
  period_no INTEGER NOT NULL CHECK (period_no > 0),
  subject_id TEXT NOT NULL,
  teacher_id TEXT NOT NULL,
  start_time TEXT CHECK (start_time IS NULL OR length(start_time) = 5),
  end_time TEXT CHECK (end_time IS NULL OR length(end_time) = 5),
  room TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  UNIQUE (timetable_id, day_of_week, period_no),
  CHECK (start_time IS NULL OR end_time IS NULL OR start_time < end_time)
);
```

**Day of Week Convention:**
- 1 = Monday
- 2 = Tuesday
- 3 = Wednesday
- 4 = Thursday
- 5 = Friday
- 6 = Saturday
- 7 = Sunday

---

## Endpoints

### Timetable CRUD

**POST /timetables**
- Create new timetable (draft v1)
- Authorization: Principal only
- Returns: Timetable

**GET /timetables**
- List timetables (filterable by academic_year_id, classroom_id, status)
- Authorization: Principal, Teacher (limited), Student (limited)
- Returns: TimetableWithDetails[]

**GET /timetables/:id**
- Get timetable by ID
- Authorization: Principal, Teacher (limited), Student (limited)
- Returns: Timetable

**PUT /timetables/:id**
- Update draft timetable (name only)
- Authorization: Principal only
- Returns: Timetable

**DELETE /timetables/:id**
- Delete draft timetable
- Authorization: Principal only
- Note: Cannot delete published/archived

### Version Management

**POST /timetables/:id/new-version**
- Create new version from existing (copies all entries)
- Authorization: Principal only
- Returns: New draft timetable

**POST /timetables/:id/publish**
- Publish draft timetable
- Validates: entries exist, no conflicts, teaching assignments
- Archives current published version (if any)
- Sets new version as published
- Authorization: Principal only
- Returns: Published timetable

**POST /timetables/:id/archive**
- Archive timetable
- Authorization: Principal only
- Returns: Archived timetable

### Entry Management

**GET /timetables/:id/entries**
- List entries for timetable
- Authorization: Principal, Teacher (limited), Student (limited)
- Returns: TimetableEntryWithDetails[]

**POST /timetables/:id/entries**
- Create entry in draft timetable
- Validates: teaching assignment, conflicts
- Authorization: Principal only
- Returns: TimetableEntry

**PUT /timetables/:id/entries/:entryId**
- Update entry in draft timetable
- Validates: teaching assignment
- Authorization: Principal only
- Returns: TimetableEntry

**DELETE /timetables/:id/entries/:entryId**
- Delete entry from draft timetable
- Authorization: Principal only

### Read Operations

**GET /classrooms/:classroomId/timetable**
- Get published timetable for classroom
- Authorization: All authenticated users
- Returns: { timetable, entries }

**GET /me/timetable**
- Get my timetable
- Student: Own classroom's published timetable
- Teacher: Own teaching schedule across all classes
- Authorization: Student, Teacher
- Returns: { timetable, entries }

---

## Conflict Detection

### Class Slot Conflict

A classroom cannot have two subjects in the same period.

**Example Invalid:**
```
10-A, Monday, Period 2 → Mathematics
10-A, Monday, Period 2 → Physics (CONFLICT)
```

**Enforcement:**
- Database: UNIQUE(timetable_id, day_of_week, period_no)
- Service: Checked during entry creation
- Import: Row-level validation

### Teacher Conflict

A teacher cannot teach two classrooms simultaneously.

**Example Invalid:**
```
Teacher T000123, Monday, Period 3 → Class 10-A
Teacher T000123, Monday, Period 3 → Class 9-B (CONFLICT)
```

**Enforcement:**
- Service: Query published timetables during validation
- Import: Cross-classroom conflict detection

### Teaching Assignment Validation

Only teachers with valid teaching assignments can be scheduled.

**Validation:**
```sql
SELECT COUNT(*) FROM teaching_assignments
WHERE teacher_id = ? AND subject_id = ? AND classroom_id = ? AND school_id = ?
```

---

## Published Timetable Immutability

Once `status = 'published'`:
- Cannot modify name
- Cannot add/edit/delete entries
- Cannot unpublish

**To edit published timetable:**
```
1. POST /timetables/:id/new-version (creates draft v+1, copies entries)
2. Modify draft entries
3. POST /timetables/:newId/publish (archives old, publishes new)
```

**Historical Preservation:**
- Archived versions remain in database
- Principal can view version history
- Students/teachers see only current published version

---

## Excel Import

### Template Format

**Canonical Columns:**
```
academic_year | classroom_code | day | period_no | start_time | end_time | subject_code | teacher_code | room
```

**Example:**
```
2026-27 | 10-A | MON | 1 | 09:00 | 09:45 | MATH | T000123 | R101
2026-27 | 10-A | MON | 2 | 09:45 | 10:30 | PHY  | T000456 | R101
2026-27 | 10-A | TUE | 1 | 09:00 | 09:45 | ENG  | T000789 | R102
```

**Field Requirements:**
- **academic_year**: Academic year label (e.g., "2024-25")
- **classroom_code**: Classroom code (e.g., "10-A")
- **day**: MON, TUE, WED, THU, FRI, SAT, SUN
- **period_no**: Integer > 0
- **start_time**: HH:MM (optional)
- **end_time**: HH:MM (optional)
- **subject_code**: Subject code
- **teacher_code**: Teacher employee code
- **room**: Room name (optional)

**Import Workflow:**
```
1. Download template (frontend generates XLSX with instructions)
2. Principal fills template
3. Browser parses XLSX → JSON rows
4. POST /imports/timetable/preview (validates, returns errors)
5. Principal reviews errors/warnings
6. POST /imports/:id/commit (creates draft timetables)
7. Principal publishes timetables
```

### Import Validation

Row-level validation checks:
- Academic year exists in school
- Classroom exists in year
- Day valid (MON-SUN)
- Subject exists in school
- Teacher exists in school
- Teacher has teaching assignment for subject/classroom
- No class slot conflicts
- No teacher conflicts
- Time format valid (HH:MM)
- Start < end

**Error Response Example:**
```json
{
  "row": 12,
  "field": "teacher_code",
  "code": "TEACHER_CONFLICT",
  "message": "Teacher T000123 is already assigned to Class 9-B on MON period 3"
}
```

### Import Behavior

**Non-Destructive:**
- Import creates NEW draft timetables
- Does NOT overwrite existing published timetables
- Does NOT delete entries not in spreadsheet

**Grouping:**
- Rows grouped by academic_year + classroom_code
- One draft timetable created per classroom
- Next version number auto-generated

---

## Authorization Matrix

| Operation | Principal | Class Teacher | Subject Teacher | Student |
|-----------|-----------|---------------|-----------------|---------|
| Create timetable | ✅ | ❌ | ❌ | ❌ |
| Edit draft | ✅ | ❌ | ❌ | ❌ |
| Publish | ✅ | ❌ | ❌ | ❌ |
| Archive | ✅ | ❌ | ❌ | ❌ |
| Upload Excel | ✅ | ❌ | ❌ | ❌ |
| View published | ✅ | Own class | Assigned classes | Own class |
| View versions | ✅ | ❌ | ❌ | ❌ |

---

## Audit Actions

All mutations logged:
- `timetable_created`
- `timetable_updated`
- `timetable_deleted`
- `timetable_version_created`
- `timetable_published`
- `timetable_archived`
- `timetable_entry_created`
- `timetable_entry_updated`
- `timetable_entry_deleted`

Import operations logged via imports module.

---

## Example Workflows

### Create First Timetable

```http
POST /timetables
{
  "academic_year_id": "...",
  "classroom_id": "...",
  "name": "Class 10-A Timetable 2026-27"
}
```

Returns draft v1.

### Add Entries

```http
POST /timetables/:id/entries
{
  "day_of_week": 1,
  "period_no": 1,
  "subject_id": "...",
  "teacher_id": "...",
  "start_time": "09:00",
  "end_time": "09:45",
  "room": "R101"
}
```

### Publish

```http
POST /timetables/:id/publish
```

Validates, archives old published version, publishes new.

### Edit Published Timetable

```http
POST /timetables/:publishedId/new-version
```

Returns draft v2 with all entries copied.

```http
PUT /timetables/:draftV2Id/entries/:entryId
{
  "teacher_id": "new-teacher",
  ...
}
```

```http
POST /timetables/:draftV2Id/publish
```

### Student Views Timetable

```http
GET /me/timetable
```

Returns entries for student's current classroom (published version only).

---

## V1 Limitations

**Not Implemented:**
- Excel template server-side generation (frontend generates using SheetJS)
- School-wide period/bell schedule configuration
- Timetable templates/cloning across years
- Bulk operations (must create entries individually or via Excel)
- Timetable comparison/diff between versions
- Room booking/conflict detection
- Substitute teacher management

**Future Enhancements:**
- Period definitions table (school-wide bell schedule)
- Timetable templates (standard patterns)
- Cross-year cloning
- Room resource management
- Absence/substitute scheduling

---

## Summary

Task 12 Timetable module provides:

- ✅ Versioned timetables (draft/published/archived)
- ✅ Immutable published versions
- ✅ Version history preservation
- ✅ Conflict detection (class slots, teacher schedule)
- ✅ Teaching assignment validation
- ✅ Principal CRUD operations
- ✅ Student/teacher read access
- ✅ Excel import with validation
- ✅ Comprehensive audit logging
- ✅ Tenant isolation

The module integrates with Academic Structure, Teaching Assignments, and Imports modules.
