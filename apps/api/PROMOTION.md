# Promotion & Academic-Year Lifecycle

**Task 10** — Production-oriented promotion batches, student decisions (promote/retain/graduate/leave), year activation, and enrollment lifecycle management.

---

## Overview

The Promotion module manages the transition of students between academic years through structured batches. It supports four outcomes:

1. **Promote** — Student advances to next grade/class
2. **Retain** — Student repeats in same grade (new academic year)
3. **Graduate** — Student completes schooling (account disabled, historical data preserved)
4. **Leave** — Student exits school (account disabled, historical data preserved)

Each decision preserves historical enrollment data and creates new planned enrollments where applicable.

---

## Core Concepts

### Promotion Batch

A promotion batch represents a cohesive group of students transitioning from one academic year to another. Each batch:

- Has a **source year** and **source classroom** (where students are currently enrolled)
- Has a **target year** (where promoted/retained students will enroll)
- Does NOT have a single target classroom at batch level
- Progresses through lifecycle: `draft` → `planned` → `applied` (or `cancelled`)

### Per-Student Target Classrooms

**Important**: There is intentionally NO `to_classroom_id` on `promotion_batches`. Each student can have an individual target classroom through `promotion_items.target_classroom_id`.

This allows flexible promotion patterns:
- Student A: 9-A → 10-A (promote to next grade)
- Student B: 9-A → 10-B (promote to different section)
- Student C: 9-A → 10-A (retain, repeat grade)
- Student D: 9-A → graduate (no target classroom)

### Promotion Item

Each promotion item represents a decision for one student:

- References the student and their source enrollment
- Specifies the decision (promote/retain/graduate/leave)
- For promote/retain: includes `target_classroom_id` and `target_roll_number`
- For graduate/leave: no target classroom (account disabled, historical data preserved)
- Optional reason field for documentation

### Enrollment History

Enrollment history is the source of truth for academic placement. The promotion system:

1. **Preserves source enrollment** with appropriate outcome (promoted/retained/graduated/left)
2. **Creates new planned enrollment** for promote/retain decisions
3. **Links enrollments** via `from_enrollment_id` for historical tracking
4. **Never deletes or overwrites** historical enrollment records

### Account Lifecycle

For students graduating or leaving:

1. **Preserve** student profile (never delete)
2. **Preserve** historical enrollments (never delete)
3. **Set** `users.disabled = 1`
4. **Increment** `users.token_version` to invalidate existing tokens
5. **Revoke** active sessions via session management

Historical data remains queryable indefinitely.

---

## Batch Lifecycle

### 1. Draft State

When created, a batch starts in `draft` status. Principal can:

- Add/modify promotion items
- Specify individual target classrooms per student
- Change decisions
- Cancel the batch

### 2. Planned State

When ready, the batch moves to `planned` status via `/batches/:id/plan`.

The planning operation validates:
- All promote/retain items have target classrooms
- No conflicting enrollments exist in target year
- Target classrooms belong to target year
- All data integrity checks pass

If validation fails, the batch remains in `draft` with detailed error messages.

### 3. Applied State

Once planned, the batch can be applied via `/batches/:id/apply`.

Application executes all decisions:

**Promote:**
- Complete source enrollment with outcome=`promoted`
- Create target enrollment with status=`planned`, link via `from_enrollment_id`

**Retain:**
- Complete source enrollment with outcome=`retained`
- Create target enrollment in new year with status=`planned`

**Graduate:**
- Complete source enrollment with outcome=`graduated`
- Disable user account
- Increment `token_version`
- Revoke active sessions

**Leave:**
- Complete source enrollment with outcome=`left`
- Disable user account
- Increment `token_version`
- Revoke active sessions

After application, the batch is immutable. It cannot be reversed directly (manual correction would require new batches/enrollments).

### 4. Cancelled State

Draft or planned batches can be cancelled with reason. Applied batches cannot be cancelled.

---

## Year Activation

After promotion batches are applied, the new academic year must be activated separately.

### Activation Precheck

`GET /academic-years/:id/activation-check` verifies:
- Year is in `upcoming` status (not already `current` or `closed`)
- Returns any blocking issues
- Lists unresolved students

### Activation Execution

`POST /academic-years/:id/activate` performs:

1. Activate all `planned` enrollments in target year → `active`
2. Close previous `current` year → `closed`
3. Set target year → `current`
4. Return activation statistics

**Important:** Multiple promotion batches may be applied before year activation. Activation is a separate, explicit operation.

---

## Grade-Level Suggestion

When fetching promotion candidates via `GET /promotions/candidates`, the response includes a `suggested_target_classroom_id`.

The suggestion logic:
- Finds classrooms in target year with `grade_level = source_grade_level + 1`
- Returns the first matching classroom (if any)
- Principal must explicitly select target (suggestion is not automatically applied)

This provides convenience without enforcing rigid grade progression.

---

## Integrity Checks

The promotion system enforces:

1. **No duplicate enrollments**: A student cannot have multiple active/planned enrollments in the same academic year
2. **Chronological year order**: Target year must start after source year
3. **Classroom-year alignment**: Target classrooms must belong to target year
4. **Status progression**: Draft→planned→applied transitions are validated
5. **Immutability after application**: Applied batches cannot be modified
6. **Historical preservation**: Source enrollments are completed, never deleted

---

## Authorization

**All promotion operations require Principal role.**

Only principals can:
- View promotion candidates
- Create/modify promotion batches
- Plan and apply batches
- Activate academic years

Teachers and students have no promotion access.

---

## Endpoints

### Promotion Candidates
- `GET /promotions/candidates?academic_year_id=...&classroom_id=...` — List students eligible for promotion

### Promotion Batches
- `POST /promotions/batches` — Create new batch
- `GET /promotions/batches?status=...` — List batches (optionally filtered by status)
- `GET /promotions/batches/:id` — Get batch details
- `POST /promotions/batches/:id/plan` — Validate and plan batch
- `POST /promotions/batches/:id/apply` — Execute batch decisions
- `POST /promotions/batches/:id/cancel` — Cancel draft/planned batch

### Promotion Items
- `GET /promotions/batches/:id/items` — List items in batch
- `PUT /promotions/batches/:id/items` — Bulk upsert promotion items

### Year Activation
- `GET /academic-years/:id/activation-check` — Check activation readiness
- `POST /academic-years/:id/activate` — Activate new academic year

---

## Database Schema

### promotion_batches

```sql
CREATE TABLE promotion_batches (
  id TEXT PRIMARY KEY,
  school_id TEXT NOT NULL,
  from_academic_year_id TEXT NOT NULL,
  to_academic_year_id TEXT NOT NULL,
  from_classroom_id TEXT NOT NULL,
  created_by TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (school_id) REFERENCES schools(id),
  FOREIGN KEY (from_academic_year_id) REFERENCES academic_years(id),
  FOREIGN KEY (to_academic_year_id) REFERENCES academic_years(id),
  FOREIGN KEY (from_classroom_id) REFERENCES classrooms(id),
  FOREIGN KEY (created_by) REFERENCES users(id)
);
```

- `status`: 'draft' | 'planned' | 'applied' | 'cancelled'
- **Note**: There is NO `to_classroom_id` column (individual targets specified per student)

### promotion_items

```sql
CREATE TABLE promotion_items (
  id TEXT PRIMARY KEY,
  promotion_batch_id TEXT NOT NULL,
  student_id TEXT NOT NULL,
  source_enrollment_id TEXT NOT NULL,
  target_classroom_id TEXT,
  target_roll_number TEXT NOT NULL,
  decision TEXT NOT NULL,
  reason TEXT,
  target_enrollment_id TEXT,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (promotion_batch_id) REFERENCES promotion_batches(id),
  FOREIGN KEY (student_id) REFERENCES users(id),
  FOREIGN KEY (source_enrollment_id) REFERENCES enrollments(id),
  FOREIGN KEY (target_classroom_id) REFERENCES classrooms(id),
  FOREIGN KEY (target_enrollment_id) REFERENCES enrollments(id),
  UNIQUE (promotion_batch_id, student_id)
);
```

- `decision`: 'promote' | 'retain' | 'graduate' | 'leave'
- `target_classroom_id`: Required for promote/retain, NULL for graduate/leave
- `target_enrollment_id`: Populated after batch application

### enrollments (relevant fields)

```sql
CREATE TABLE enrollments (
  -- ... other fields ...
  status TEXT NOT NULL DEFAULT 'planned',
  outcome TEXT,
  from_enrollment_id TEXT,
  -- ... other fields ...
  FOREIGN KEY (from_enrollment_id) REFERENCES enrollments(id)
);
```

- `status`: 'planned' | 'active' | 'completed' | 'left' | 'transferred'
- `outcome`: 'promoted' | 'retained' | 'graduated' | 'left' | NULL

---

## V1 Exclusions

The following features are **not included** in Task 10:

1. **Transfer across schools** — Only internal promotion within same school
2. **Conditional promotion** (e.g., retest-based decisions)
3. **Partial year enrollment** (mid-year joins/exits)
4. **Automated promotion** based on grade rules
5. **Bulk import** of promotion decisions from external files
6. **Promotion reversal** or undo operations (manual correction required)

---

## Audit Actions

All promotion operations are logged:

- `promotion_batch_created`
- `promotion_batch_updated`
- `promotion_batch_planned`
- `promotion_batch_applied`
- `promotion_batch_cancelled`
- `promotion_item_updated`
- `student_promoted`
- `student_retained`
- `student_graduated`
- `student_left`
- `promotion_year_activation_started`
- `promotion_year_activation_completed`

Each audit entry captures before/after state where applicable.

---

## Error Handling

The promotion module defines 25+ specific error codes including:

- `PROMOTION_BATCH_NOT_FOUND`
- `PROMOTION_YEAR_NOT_FOUND`
- `PROMOTION_INVALID_YEAR_ORDER`
- `PROMOTION_SOURCE_CLASSROOM_INVALID`
- `PROMOTION_TARGET_CLASSROOM_INVALID`
- `PROMOTION_BATCH_INVALID_STATUS`
- `PROMOTION_BATCH_HAS_NO_ITEMS`
- `PROMOTION_CONFLICTING_ENROLLMENT`
- `PROMOTION_TARGET_REQUIRED`
- `PROMOTION_TARGET_FORBIDDEN`
- `PROMOTION_PLANNING_VALIDATION_FAILED`
- `PROMOTION_ACTIVATION_BLOCKED`
- And more...

Each error provides context and HTTP status code for API responses.

---

## Example Workflow

1. **Principal creates batch**:
   ```
   POST /promotions/batches
   {
     "from_academic_year_id": "2023-24",
     "to_academic_year_id": "2024-25",
     "from_classroom_id": "9-A"
   }
   ```

2. **Principal fetches candidates**:
   ```
   GET /promotions/candidates?academic_year_id=2023-24&classroom_id=9-A
   ```
   Response includes suggested target classrooms (grade_level+1).

3. **Principal adds decisions**:
   ```
   PUT /promotions/batches/:id/items
   {
     "items": [
       {
         "student_id": "s1",
         "decision": "promote",
         "target_classroom_id": "10-A",
         "target_roll_number": "1"
       },
       {
         "student_id": "s2",
         "decision": "retain",
         "target_classroom_id": "10-A",
         "target_roll_number": "25"
       },
       {
         "student_id": "s3",
         "decision": "graduate"
       }
     ]
   }
   ```

4. **Principal plans batch**:
   ```
   POST /promotions/batches/:id/plan
   ```
   Validates all items and transitions to `planned` status.

5. **Principal applies batch**:
   ```
   POST /promotions/batches/:id/apply
   ```
   Executes all decisions, creates enrollments, disables graduates.

6. **Principal activates new year** (after all batches applied):
   ```
   GET /academic-years/2024-25/activation-check  # verify readiness
   POST /academic-years/2024-25/activate         # execute activation
   ```
   Activates planned enrollments, closes previous year.

---

## Testing

Per project requirements:
- **No exhaustive test suite** for Task 10
- Verified via **typecheck** and **Worker build**
- Manual/code verification confirms integration

---

## Summary

Task 10 provides comprehensive promotion and year lifecycle management with:

- ✅ Flexible per-student target classroom assignment
- ✅ Four decision types: promote/retain/graduate/leave
- ✅ Three-stage batch lifecycle: draft→planned→applied
- ✅ Separate year activation operation
- ✅ Complete enrollment history preservation
- ✅ Account lifecycle management (disable, token invalidation, session revocation)
- ✅ Principal-only authorization
- ✅ Comprehensive audit logging
- ✅ 25+ specific error codes
- ✅ Grade-level promotion suggestions
- ✅ Conflict detection and validation

The module integrates cleanly with existing Academic Structure, Accounts, and Authorization modules.
