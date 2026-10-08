# Principal Cannot Create Assessments - Workaround

## Problem

Principals cannot create assessments due to a database foreign key constraint that requires a teaching assignment to exist for every classroom-subject combination.

### Root Cause

The `assessments` table has this foreign key constraint:

```sql
FOREIGN KEY (classroom_id, subject_id)
  REFERENCES teaching_assignments(classroom_id, subject_id)
```

This means an assessment can only be created if there's already a teaching assignment for that classroom and subject. This was intended to ensure data integrity but it's too restrictive for principals.

### Why Can't We Fix It?

Cloudflare D1 doesn't allow:
1. Dropping foreign key constraints directly (`ALTER TABLE DROP CONSTRAINT` not supported)
2. Disabling foreign key checks (`PRAGMA foreign_keys = OFF` doesn't work in D1 remote)
3. Recreating the table with existing data when FK constraints are enforced

##  Workaround Solutions

### Solution 1: Create Teaching Assignment First (Recommended)

Before creating an assessment, ensure a teaching assignment exists:

1. **Navigate to Academic > Teaching Assignments**
2. **Create assignment** for the classroom and subject
3. **Then create the assessment**

**Example:**
- Want to create "Unit Test 1" for Grade 11-A, Subject: Mathematics
- First create: Teaching Assignment → Teacher: Any teacher → Grade 11-A → Mathematics
- Then create the assessment

### Solution 2: Assign Principal as Teacher (Temporary)

As a temporary measure, you can assign the principal user as the teacher for that classroom-subject combination:

1. Go to Teaching Assignments
2. Add Principal as teacher for desired classroom-subject pairs
3. Create assessments
4. Later, reassign to actual teachers

### Solution 3: Use Teacher Account

If a teacher is already assigned to the classroom-subject:
- Ask the teacher to create the assessment
- Principal can then manage (publish/lock/unlock) it

## Impact

**Current Behavior:**
- ✅ Teachers can create assessments (for their assigned subjects)
- ❌ Principals CANNOT create assessments without teaching assignment
- ✅ Principals CAN manage existing assessments (edit/publish/lock/unlock)
- ✅ Principals CAN view all assessments
- ✅ Students can view published marks

**Expected Behavior:**
- Principals should be able to create assessments for ANY classroom-subject combination
- Teaching assignments should be optional for assessment creation

## Future Fix

To properly fix this, we need to:

1. **Backup the database**
2. **Export all assessment data**
3. **Drop and recreate assessments table without the FK constraint**
4. **Reimport the data**

This requires database downtime and careful execution. For now, use the workarounds above.

## Alternative: Remove FK via Database Recreation

**⚠️ WARNING: This is a destructive operation and requires downtime!**

If you absolutely need principals to create assessments without teaching assignments, you can:

1. Export all data from `assessments` table
2. Drop the `assessments` table
3. Recreate it without the teaching_assignments foreign key
4. Reimport the data
5. Mark migration 0007 as applied manually

This should only be done during a maintenance window with proper backups.

## Status

**Current Status:** ❌ BLOCKED - Foreign key constraint prevents principal from creating assessments

**Recommended Action:** Use Solution 1 (create teaching assignments first)

**Long-term Fix:** Requires database schema change (migration 0007 prepared but cannot be applied due to D1 limitations)

---

**Related Files:**
- Migration prepared: `apps/api/migrations/0007_remove_assessment_teaching_fk.sql`
- Authorization code: `apps/api/src/marks/marks.authorization.ts` (already allows principals)
- Schema definition: `apps/api/migrations/0001_init.sql` (line 467 has the FK)

