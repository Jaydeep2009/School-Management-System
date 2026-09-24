# D1 Database Specification: V1.1 patch

Applies on top of "Final D1 Database Specification, V1". Where this document and V1 disagree, **this document and `migrations/0001_init.sql` win**.

**Verified:** the migration was applied to SQLite 3.49 (better-sqlite3) with foreign keys on, and 80 tests pass (`npm test`). The suite was mutation-checked: nine deliberate schema breaks were each caught. It has **not** been run on Cloudflare D1 itself, so run `wrangler d1 migrations apply --local` and then staging before locking. D1 is SQLite, but confirm triggers and composite foreign keys there.

---

## 1. What changed and why

| Area | Change | Reason |
|---|---|---|
| Types | Unchanged (ULID `TEXT`, epoch-ms `INTEGER`, `YYYY-MM-DD` `TEXT`) | Already correct |
| Dates | Every date column has `CHECK (date(col) IS col)` | Rejects `2010-02-30` and unpadded `2010-2-8`. Must be `IS`, not `=`, or unpadded dates slip through as NULL. |
| Birthdays | `dob_md` must equal `substr(date_of_birth, 6, 5)` (`IS`, NULL-safe) | Prevents birthday keys drifting from the date of birth |
| `sessions` | Refresh token is `<sessions.id>.<secret>`, looked up by primary key. Added `idx_sessions_family` | Looking up by `refresh_hash` alone is a full table scan (test proves it) |
| `users` | `login_id` upper-case, and its role letter (`-P-`, `-T-`, `-S-`) must match `role`. Must have a password or a pending activation (with expiry). Added `UNIQUE(id, school_id)` | Catches mislabelled accounts and un-loginable rows |
| `schools` | `code` is 2-8 upper-case letters/digits and **immutable** (trigger) | It is baked into login ids and receipt numbers |
| Profiles | Composite FK `(user_id, school_id)` to `users` | A profile can never sit in a different school from its account |
| `classrooms` | `class_teacher_id` must be a **teacher profile of the same school** (was: any user) | A student or principal can no longer be a class teacher |
| `teaching_assignments` | Composite FKs to classroom, subject, teacher profile (same school). Redundant `idx_teaching_assignments_class` dropped | Cross-tenant safety; `UNIQUE(classroom_id, subject_id)` already covers it |
| Sessions, assessments, assignments | FK `(classroom_id, subject_id)` to `teaching_assignments`, and `(classroom_id, school_id, academic_year_id)` to `classrooms` | They can only exist for a subject the class offers, in the class's own year and school. `academic_year_id` can no longer drift from the classroom |
| `enrollments` | `status` has **no default**. `(status, left_on, outcome)` are cross-checked. Composite FKs to classroom (school + year) and student (school). `UNIQUE(id, student_id)` | Forces explicit status; blocks cross-school and wrong-year rows |
| `attendance_entries`, `marks` | FK `(enrollment_id, student_id)` to `enrollments(id, student_id)` | An entry can no longer name one student and another student's enrollment |
| `marks` | Same-row CHECK: graded means marks >= 0; absent/exempt means marks NULL | Was service-only; now impossible to store contradictory rows |
| `promotion_batches` | Statuses `draft, planned, applied, cancelled` (was `completed`, which was ambiguous). `planned_at`, `applied_at`. One non-cancelled batch per class per target year. Composite FKs for class+year and target year | Defines the lifecycle; blocks double promotion |
| `promotion_items` | `UNIQUE(batch, student)`. Decision/target CHECK. Source and target enrollment must belong to the student | All were service-only |
| `fee_categories` | **Restored.** `fee_charges.fee_category_id` (required when `kind = 'fee'`) | Free-text titles make category reports unreliable |
| `fee_charges` | Sign rules (`fee`/`carry_forward` > 0, `concession` < 0). Void columns all-or-none. Composite FKs (student+school, year+school, enrollment+student, category+school) | Ledger integrity |
| Ledger | **Triggers:** no DELETE on `fee_charges`/`fee_payments`; only a first-time void may UPDATE | "Never delete financial records" is now enforced, not just documented |
| `code_counters` | **New.** Sequences per school and role for `login_id`, `student_code`, `employee_code` | V1 had no generator, so bulk imports could collide |
| `import_jobs` | `payload` nullable and cleared after commit; new status `committing`; `actor_id` FK; `kind` CHECK (adds `fee-charges`); JSON validity checks | Payload holds student PII; commit needs a claim step |
| `audit_log` | `actor_role` CHECK (adds `system`); `before`/`after` must be valid JSON | Cron and system actions need an actor |
| Indexes | Dropped `idx_assessments_class_subject`, `idx_attendance_sessions_subject_date`, `idx_promotion_items_batch` (each duplicated or duplicated a UNIQUE index). Query-plan tests cover 19 hot queries | Fewer writes on the biggest tables |

### Consequences to be aware of

- **Creating a student is one transaction, in order:** `users`, then `student_profiles`, then (optionally) `enrollments`. Composite FKs need the parent row first.
- **A class-subject offering cannot be deleted once it has sessions, assessments or assignments** (foreign key). To stop teaching a subject, set `teacher_id` to NULL or mark the classroom inactive. This is intentional: history must not lose its parent.
- **Adding a new "parent key"** for a composite FK means an extra `UNIQUE` index on a small table. Accepted deliberately.

---

## 2. What the database enforces vs what the service must enforce

Rules the **database** enforces (each has a test): one current year per school; one live enrollment per student per year; no duplicate student in a session/assessment/promotion batch; attendance `present`/`absent` only; marks status/marks consistency and marks >= 0; payment amount > 0; unique receipt per school; ledger append-only; void needs reason and actor; cross-school and cross-year references; entry/mark student matches enrollment student; sessions only for offered subjects; decision/target consistency; valid dates and `dob_md`; immutable school code.

Rules the **service** must enforce, each with an integrity query in `src/integrity-checks.ts` that returns violating rows (empty means healthy):

| Rule | Integrity check |
|---|---|
| Marks never exceed `max_marks` | `marks_over_max` |
| Attendance entry's enrollment is in the session's classroom | `attendance_entry_wrong_classroom` |
| Attendance entry only while the student was enrolled | `attendance_entry_outside_enrollment` |
| Mark's enrollment is in the assessment's classroom | `marks_wrong_classroom` |
| Promotion target class is in the batch's target year and school | `promotion_target_wrong_year` |
| Promotion source enrollment is in the batch's class | `promotion_source_wrong_class` |
| `active` enrollments belong to the current year | `active_enrollment_in_non_current_year` |
| `planned` enrollments belong to an upcoming year | `planned_enrollment_in_started_year` |
| Withdrawal is one transaction (no live login or class left) | `withdrawn_student_still_live` |

Run them in tests, in the year-activation checklist, and nightly from a Cron Trigger (alert on any rows).

---

## 3. Semantics to lock

### Enrollment status

| Status | Meaning |
|---|---|
| `planned` | Created by a promotion plan for an *upcoming* year. Never has an `outcome`. |
| `active` | The student's live class in the current year |
| `completed` | Ended normally (year closed). `left_on` = the year's `ends_on` |
| `left` | Left the school |
| `transferred` | Moved to **another class inside the school** during the year (for example 10-A to 10-B) |

`outcome` (`promoted`, `retained`, `graduated`, `left`) is **decided by the promotion plan and written on the source (active) enrollment when the plan is committed**. It can be rewritten until activation. Activation reads it and never invents it.

### Promotion batch state machine

`draft` (items being edited) then `planned` (planned enrollments exist, outcomes written, still editable) then `applied` (year activated). `cancelled` from `draft` or `planned`. Re-planning the same class replaces its planned enrollments and outcomes.

### Year activation

`ACTIVATION_PRECHECKS` must return no rows (every active student has an outcome; every promote/retain student has a planned enrollment). Then run `ACTIVATION_STATEMENTS` in order, in **one `db.batch()`**:

1. leavers end as `left`; everyone else as `completed`; planned enrollments become `active`
2. leavers: profile `withdrawn`, login disabled, `token_version + 1`, sessions revoked
3. graduates: profile `inactive` (login policy is a school decision)
4. old year `closed` **first**, then new year `current` (the partial unique index allows only one)
5. promotion batches become `applied`; one audit row

The statements are set-based, so they do not depend on student count or D1's 100-bound-parameter limit. The suite proves history is untouched (last year's attendance still points at last year's enrollment), each student ends with exactly one live enrollment, and a failure part-way changes nothing.

**Carry-forward of unpaid fees** is a service step (chunked inserts of `kind = 'carry_forward'` charges), because ids are generated in the application.

---

## 4. Protocols

**Codes.** `login_id = <SCHOOLCODE>-<P|T|S>-<6-digit sequence>` (for example `GPS-S-000123`). `student_code = 'S' + sequence`, `employee_code = 'T' + sequence`. Allocate from `code_counters` with `INSERT ... ON CONFLICT DO UPDATE SET last_number = last_number + 1 RETURNING last_number` in the same batch as the user insert.

**Refresh token.** `<sessions.id>.<secret>`; store `SHA-256(secret)` in `refresh_hash`. Lookup by primary key, then compare hashes in constant time. Rotating creates a new row with the same `family_id`; reuse of a revoked token revokes the whole family.

**Receipts.** Allocate in the same transaction as the payment (counter `UPDATE`, then insert using the counter value). The financial-year part comes from the **server's creation time, not `paid_on`**, so a backdated payment never breaks numbering. The suite proves a failed payment rolls its number back (no gaps).

**Import commit.** Run `IMPORT_CLAIM_SQL` (one guarded `UPDATE`) and proceed only if exactly one row changed. It rejects expired previews, already-claimed or committed previews, another school's preview, and another user's preview. Then run the domain batch, then mark `committed` (`committed_at`, `payload = NULL`). A Cron marks `committing` rows older than their `expires_at` as `failed`, and clears payloads of finished jobs. Keep payloads well under D1's 2 MB row limit.

**Bulk fee charges.** `fee-charges` is now an import kind (Class or Student ID, category, title, amount, due date). There is no `fee_structures` table in V1.

---

## 5. Migrations and Drizzle

- **The SQL file is the source of truth.** As far as I could find, Drizzle's SQLite schema builder has no `WITHOUT ROWID` option, and it cannot express triggers or some CHECK forms. Hand-written migrations under `migrations/` keep those. Declare the Drizzle schema to match, for queries and types only.
- Add a CI test that compares `PRAGMA table_info` and `PRAGMA index_list` of the migrated database against the Drizzle schema, so they cannot drift.
- Never let `drizzle-kit generate` overwrite these tables. A table rebuild would silently drop `WITHOUT ROWID` and the triggers.
- D1 enforces foreign keys. Order statements parent-first in every batch.

---

## 6. Still open (decisions, not defects)

1. **Graduates' logins:** disabled at activation, or read-only for a while? (Default here: profile `inactive`, login unchanged.)
2. **Unpaid fees at promotion:** warn, block, or carry forward automatically?
3. **`attendance_sessions.status = 'locked'`:** who sets it (Cron after the edit window, or the principal)? It overlaps the edit-window setting.
4. **`audit_log` immutability:** not enforced by triggers, because a retention job may need to archive and delete old rows. Decide the retention policy first.
5. **Fee structures:** an optional later table for applying a class fee plan in one action.
