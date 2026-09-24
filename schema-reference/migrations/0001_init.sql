-- =====================================================================
-- School Management System: D1 schema, spec v1.1
-- Apply with:  wrangler d1 migrations apply <DB>   (local first, then staging)
--
-- Conventions: ULID TEXT ids, INTEGER UTC epoch-ms timestamps,
-- 'YYYY-MM-DD' TEXT dates, INTEGER 0/1 booleans, money in paise.
--
-- Cross-tenant and cross-year safety is enforced with composite foreign
-- keys against the UNIQUE(id, school_id[, academic_year_id]) indexes below.
-- Rules that need more than one row (or another table's data) are
-- enforced by the service layer AND detectable with src/integrity-checks.ts.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. schools
-- ---------------------------------------------------------------------
CREATE TABLE schools (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE
    CHECK (length(code) BETWEEN 2 AND 8 AND code NOT GLOB '*[^A-Z0-9]*'),
  name TEXT NOT NULL,
  timezone TEXT NOT NULL DEFAULT 'Asia/Kolkata',
  phone TEXT,
  email TEXT,
  address TEXT,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'suspended', 'archived')),
  settings TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(settings)),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

-- schools.code is baked into login ids and receipt numbers: never changes.
CREATE TRIGGER trg_schools_code_immutable
BEFORE UPDATE OF code ON schools
WHEN NEW.code <> OLD.code
BEGIN
  SELECT RAISE(ABORT, 'schools.code is immutable');
END;

-- ---------------------------------------------------------------------
-- 2. users (Super Admin is NOT stored here; it lives in Worker secrets)
-- login_id format: <SCHOOLCODE>-<P|T|S>-<sequence>, e.g. GPS-S-000123
-- ---------------------------------------------------------------------
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  school_id TEXT NOT NULL REFERENCES schools(id),
  login_id TEXT NOT NULL UNIQUE CHECK (login_id = upper(login_id)),
  role TEXT NOT NULL CHECK (role IN ('principal', 'teacher', 'student')),
  password_hash TEXT,
  activation_hash TEXT,
  activation_expires_at INTEGER,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'disabled')),
  token_version INTEGER NOT NULL DEFAULT 0,
  must_change_password INTEGER NOT NULL DEFAULT 0 CHECK (must_change_password IN (0, 1)),
  last_login_at INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,

  UNIQUE (id, school_id),
  -- the role letter in the login id must agree with the role
  CHECK (
    (role = 'principal' AND login_id GLOB '*-P-[0-9]*') OR
    (role = 'teacher'   AND login_id GLOB '*-T-[0-9]*') OR
    (role = 'student'   AND login_id GLOB '*-S-[0-9]*')
  ),
  -- an account must be able to sign in: password, or a pending activation
  CHECK (password_hash IS NOT NULL OR activation_hash IS NOT NULL),
  CHECK (activation_hash IS NULL OR activation_expires_at IS NOT NULL)
);
CREATE INDEX idx_users_school_role ON users(school_id, role);
CREATE INDEX idx_users_school_status ON users(school_id, status);

-- ---------------------------------------------------------------------
-- 3. sessions (refresh tokens)
-- Refresh token wire format:  <sessions.id>.<secret>
-- Lookup by PRIMARY KEY (id), then compare SHA-256(secret) with refresh_hash.
-- ---------------------------------------------------------------------
CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  refresh_hash TEXT NOT NULL,
  family_id TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  revoked_at INTEGER,
  user_agent TEXT,
  created_at INTEGER NOT NULL
);
CREATE INDEX idx_sessions_user ON sessions(user_id);
CREATE INDEX idx_sessions_family ON sessions(family_id);
CREATE INDEX idx_sessions_expiry ON sessions(expires_at);

-- ---------------------------------------------------------------------
-- 4. teacher_profiles
-- ---------------------------------------------------------------------
CREATE TABLE teacher_profiles (
  user_id TEXT PRIMARY KEY,
  school_id TEXT NOT NULL,
  employee_code TEXT,
  first_name TEXT NOT NULL,
  middle_name TEXT,
  last_name TEXT NOT NULL,
  phone TEXT,
  date_of_birth TEXT CHECK (date_of_birth IS NULL OR date(date_of_birth) IS date_of_birth),
  dob_md TEXT,
  joining_date TEXT CHECK (joining_date IS NULL OR date(joining_date) IS joining_date),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,

  UNIQUE (school_id, employee_code),
  UNIQUE (user_id, school_id),
  FOREIGN KEY (user_id, school_id) REFERENCES users(id, school_id),
  -- dob_md ('MM-DD') is always derived from date_of_birth.
  -- NOTE: must be IS, not =: '=' yields NULL (which a CHECK accepts) when dob_md is NULL.
  CHECK (
    (date_of_birth IS NULL AND dob_md IS NULL) OR
    (date_of_birth IS NOT NULL AND dob_md IS substr(date_of_birth, 6, 5))
  )
);
CREATE INDEX idx_teacher_birthday ON teacher_profiles(school_id, dob_md);

-- ---------------------------------------------------------------------
-- 5. student_profiles (identity is independent of class)
-- ---------------------------------------------------------------------
CREATE TABLE student_profiles (
  user_id TEXT PRIMARY KEY,
  school_id TEXT NOT NULL,
  student_code TEXT NOT NULL,
  admission_number TEXT NOT NULL,
  first_name TEXT NOT NULL,
  middle_name TEXT,
  last_name TEXT NOT NULL,
  gender TEXT,
  date_of_birth TEXT CHECK (date_of_birth IS NULL OR date(date_of_birth) IS date_of_birth),
  dob_md TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  parent_name TEXT,
  parent_phone TEXT,
  parent_email TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'withdrawn')),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,

  UNIQUE (school_id, student_code),
  UNIQUE (school_id, admission_number),
  UNIQUE (user_id, school_id),
  FOREIGN KEY (user_id, school_id) REFERENCES users(id, school_id),
  CHECK (
    (date_of_birth IS NULL AND dob_md IS NULL) OR
    (date_of_birth IS NOT NULL AND dob_md IS substr(date_of_birth, 6, 5))
  )
);
CREATE INDEX idx_student_birthday ON student_profiles(school_id, dob_md);

-- ---------------------------------------------------------------------
-- 6. academic_years  (upcoming -> current -> closed; one current per school)
-- ---------------------------------------------------------------------
CREATE TABLE academic_years (
  id TEXT PRIMARY KEY,
  school_id TEXT NOT NULL REFERENCES schools(id),
  label TEXT NOT NULL,
  starts_on TEXT NOT NULL CHECK (date(starts_on) IS starts_on),
  ends_on TEXT NOT NULL CHECK (date(ends_on) IS ends_on),
  status TEXT NOT NULL DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'current', 'closed')),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,

  UNIQUE (school_id, label),
  UNIQUE (id, school_id),
  CHECK (starts_on < ends_on)
);
CREATE UNIQUE INDEX uq_current_academic_year ON academic_years(school_id) WHERE status = 'current';

-- ---------------------------------------------------------------------
-- 7. classrooms (grade + division within one academic year)
-- grade_level is numeric so rollover can suggest grade_level + 1.
-- Convention: pre-primary uses values <= 0.
-- ---------------------------------------------------------------------
CREATE TABLE classrooms (
  id TEXT PRIMARY KEY,
  school_id TEXT NOT NULL,
  academic_year_id TEXT NOT NULL,
  classroom_code TEXT NOT NULL,
  grade_name TEXT NOT NULL,
  division_name TEXT NOT NULL,
  grade_level INTEGER NOT NULL CHECK (grade_level BETWEEN -5 AND 20),
  class_teacher_id TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,

  UNIQUE (school_id, academic_year_id, classroom_code),
  UNIQUE (school_id, academic_year_id, grade_name, division_name),
  -- parent keys for composite foreign keys elsewhere
  UNIQUE (id, school_id),
  UNIQUE (id, school_id, academic_year_id),
  FOREIGN KEY (academic_year_id, school_id) REFERENCES academic_years(id, school_id),
  FOREIGN KEY (class_teacher_id, school_id) REFERENCES teacher_profiles(user_id, school_id)
);
CREATE INDEX idx_classrooms_year ON classrooms(academic_year_id, status);
CREATE INDEX idx_classrooms_teacher ON classrooms(class_teacher_id);

-- ---------------------------------------------------------------------
-- 8. subjects
-- ---------------------------------------------------------------------
CREATE TABLE subjects (
  id TEXT PRIMARY KEY,
  school_id TEXT NOT NULL REFERENCES schools(id),
  subject_code TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,

  UNIQUE (school_id, subject_code),
  UNIQUE (id, school_id)
);
CREATE INDEX idx_subjects_school_status ON subjects(school_id, status);

-- ---------------------------------------------------------------------
-- 9. teaching_assignments: which subjects a class offers, and who teaches
-- them. teacher_id NULL = subject offered, no teacher yet.
-- UNIQUE(classroom_id, subject_id) is the parent key that attendance
-- sessions, assessments and assignments reference, so they can only exist
-- for subjects the class actually offers.
-- ---------------------------------------------------------------------
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
CREATE INDEX idx_teaching_assignments_teacher ON teaching_assignments(teacher_id);
-- (no separate classroom_id index: UNIQUE(classroom_id, subject_id) covers it)

-- ---------------------------------------------------------------------
-- 10. enrollments (historical student <-> class link)
--
--   planned      created by a promotion plan for an upcoming year
--   active       the student's live class in the current year
--   completed    ended normally (year closed)
--   left         left the school
--   transferred  moved to ANOTHER CLASS INSIDE THE SCHOOL during the year
--
-- outcome is decided by promotion and written on the *source* (active)
-- enrollment at plan time; activation reads it. It is never set on a
-- planned row.
-- No default for status: every insert must choose.
-- ---------------------------------------------------------------------
CREATE TABLE enrollments (
  id TEXT PRIMARY KEY,
  school_id TEXT NOT NULL,
  academic_year_id TEXT NOT NULL,
  classroom_id TEXT NOT NULL,
  student_id TEXT NOT NULL,
  roll_number INTEGER,
  joined_on TEXT NOT NULL CHECK (date(joined_on) IS joined_on),
  left_on TEXT CHECK (left_on IS NULL OR date(left_on) IS left_on),
  status TEXT NOT NULL
    CHECK (status IN ('planned', 'active', 'completed', 'left', 'transferred')),
  outcome TEXT CHECK (outcome IN ('promoted', 'retained', 'graduated', 'left')),
  from_enrollment_id TEXT REFERENCES enrollments(id),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,

  UNIQUE (id, student_id),
  FOREIGN KEY (classroom_id, school_id, academic_year_id)
    REFERENCES classrooms(id, school_id, academic_year_id),
  FOREIGN KEY (student_id, school_id) REFERENCES student_profiles(user_id, school_id),
  CHECK (
    (status IN ('planned', 'active') AND left_on IS NULL) OR
    (status IN ('completed', 'left', 'transferred') AND left_on IS NOT NULL AND left_on >= joined_on)
  ),
  CHECK (status <> 'planned' OR outcome IS NULL)
);
-- exactly one live (active or planned) enrollment per student per year
CREATE UNIQUE INDEX uq_live_enrollment
  ON enrollments(student_id, academic_year_id) WHERE status IN ('active', 'planned');
CREATE INDEX idx_enrollments_class_status ON enrollments(classroom_id, status);
CREATE INDEX idx_enrollments_student_year ON enrollments(student_id, academic_year_id);
CREATE INDEX idx_enrollments_school_year ON enrollments(school_id, academic_year_id);

-- ---------------------------------------------------------------------
-- 11. promotion_batches   draft -> planned -> applied | cancelled
--   draft      items being edited, no planned enrollments yet
--   planned    planned enrollments exist; outcomes written; still editable
--   applied    the target year was activated
--   cancelled  abandoned
-- No to_classroom_id: every student has their own target.
-- ---------------------------------------------------------------------
CREATE TABLE promotion_batches (
  id TEXT PRIMARY KEY,
  school_id TEXT NOT NULL,
  from_academic_year_id TEXT NOT NULL,
  to_academic_year_id TEXT NOT NULL,
  from_classroom_id TEXT NOT NULL,
  created_by TEXT NOT NULL REFERENCES users(id),
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'planned', 'applied', 'cancelled')),
  created_at INTEGER NOT NULL,
  planned_at INTEGER,
  applied_at INTEGER,

  UNIQUE (id, school_id),
  FOREIGN KEY (from_classroom_id, school_id, from_academic_year_id)
    REFERENCES classrooms(id, school_id, academic_year_id),
  FOREIGN KEY (to_academic_year_id, school_id) REFERENCES academic_years(id, school_id),
  CHECK (from_academic_year_id <> to_academic_year_id),
  CHECK (status <> 'planned' OR planned_at IS NOT NULL),
  CHECK (status <> 'applied' OR applied_at IS NOT NULL)
);
-- a class can have only one non-cancelled batch per target year
CREATE UNIQUE INDEX uq_open_promotion_batch
  ON promotion_batches(from_classroom_id, to_academic_year_id) WHERE status <> 'cancelled';

-- ---------------------------------------------------------------------
-- 12. promotion_items
-- ---------------------------------------------------------------------
CREATE TABLE promotion_items (
  id TEXT PRIMARY KEY,
  promotion_batch_id TEXT NOT NULL REFERENCES promotion_batches(id),
  student_id TEXT NOT NULL REFERENCES student_profiles(user_id),
  source_enrollment_id TEXT NOT NULL,
  target_classroom_id TEXT REFERENCES classrooms(id),
  target_roll_number INTEGER,
  decision TEXT NOT NULL CHECK (decision IN ('promote', 'retain', 'graduate', 'leave')),
  reason TEXT,
  target_enrollment_id TEXT,
  created_at INTEGER NOT NULL,

  UNIQUE (promotion_batch_id, student_id),
  -- the source (and target) enrollment must belong to this student
  FOREIGN KEY (source_enrollment_id, student_id) REFERENCES enrollments(id, student_id),
  FOREIGN KEY (target_enrollment_id, student_id) REFERENCES enrollments(id, student_id),
  CHECK (
    (decision IN ('promote', 'retain') AND target_classroom_id IS NOT NULL) OR
    (decision IN ('graduate', 'leave') AND target_classroom_id IS NULL)
  )
);
-- (no separate batch index: UNIQUE(promotion_batch_id, student_id) covers it)
CREATE INDEX idx_promotion_items_student ON promotion_items(student_id);

-- ---------------------------------------------------------------------
-- 13. attendance_sessions
-- ---------------------------------------------------------------------
CREATE TABLE attendance_sessions (
  id TEXT PRIMARY KEY,
  school_id TEXT NOT NULL,
  academic_year_id TEXT NOT NULL,
  classroom_id TEXT NOT NULL,
  subject_id TEXT NOT NULL,
  session_date TEXT NOT NULL CHECK (date(session_date) IS session_date),
  period_no INTEGER NOT NULL DEFAULT 1 CHECK (period_no >= 1),
  taken_by TEXT NOT NULL REFERENCES users(id),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'locked')),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,

  UNIQUE (classroom_id, subject_id, session_date, period_no),
  FOREIGN KEY (classroom_id, school_id, academic_year_id)
    REFERENCES classrooms(id, school_id, academic_year_id),
  FOREIGN KEY (classroom_id, subject_id)
    REFERENCES teaching_assignments(classroom_id, subject_id)
);
CREATE INDEX idx_attendance_sessions_class_date ON attendance_sessions(classroom_id, session_date);
CREATE INDEX idx_attendance_sessions_school_year ON attendance_sessions(school_id, academic_year_id);
-- (teacher/subject lookups use the UNIQUE index above)

-- ---------------------------------------------------------------------
-- 14. attendance_entries
-- Present/absent only. An entry may exist only for a student enrolled in
-- the session's classroom on the session date (service rule; see
-- integrity checks). student_id must match the enrollment's student.
-- ---------------------------------------------------------------------
CREATE TABLE attendance_entries (
  session_id TEXT NOT NULL REFERENCES attendance_sessions(id),
  student_id TEXT NOT NULL,
  enrollment_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('present', 'absent')),
  updated_by TEXT NOT NULL REFERENCES users(id),
  updated_at INTEGER NOT NULL,

  PRIMARY KEY (session_id, student_id),
  FOREIGN KEY (enrollment_id, student_id) REFERENCES enrollments(id, student_id)
) WITHOUT ROWID;
CREATE INDEX idx_attendance_entries_student ON attendance_entries(student_id);

-- ---------------------------------------------------------------------
-- 15. assessments
-- ---------------------------------------------------------------------
CREATE TABLE assessments (
  id TEXT PRIMARY KEY,
  school_id TEXT NOT NULL,
  academic_year_id TEXT NOT NULL,
  classroom_id TEXT NOT NULL,
  subject_id TEXT NOT NULL,
  name TEXT NOT NULL,
  max_marks REAL NOT NULL CHECK (max_marks > 0),
  weightage REAL CHECK (weightage IS NULL OR weightage >= 0),
  held_on TEXT CHECK (held_on IS NULL OR date(held_on) IS held_on),
  is_published INTEGER NOT NULL DEFAULT 0 CHECK (is_published IN (0, 1)),
  is_locked INTEGER NOT NULL DEFAULT 0 CHECK (is_locked IN (0, 1)),
  created_by TEXT NOT NULL REFERENCES users(id),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,

  UNIQUE (classroom_id, subject_id, name),
  FOREIGN KEY (classroom_id, school_id, academic_year_id)
    REFERENCES classrooms(id, school_id, academic_year_id),
  FOREIGN KEY (classroom_id, subject_id)
    REFERENCES teaching_assignments(classroom_id, subject_id)
);
CREATE INDEX idx_assessments_school_year ON assessments(school_id, academic_year_id);
-- (class+subject lookups use the UNIQUE index above)

-- ---------------------------------------------------------------------
-- 16. marks
--   graded  -> marks_obtained required, >= 0  (upper bound: service + integrity check)
--   absent / exempt -> marks_obtained NULL
-- ---------------------------------------------------------------------
CREATE TABLE marks (
  assessment_id TEXT NOT NULL REFERENCES assessments(id),
  student_id TEXT NOT NULL,
  enrollment_id TEXT NOT NULL,
  marks_obtained REAL,
  status TEXT NOT NULL DEFAULT 'graded' CHECK (status IN ('graded', 'absent', 'exempt')),
  updated_by TEXT NOT NULL REFERENCES users(id),
  updated_at INTEGER NOT NULL,

  PRIMARY KEY (assessment_id, student_id),
  FOREIGN KEY (enrollment_id, student_id) REFERENCES enrollments(id, student_id),
  CHECK (
    (status = 'graded' AND marks_obtained IS NOT NULL AND marks_obtained >= 0) OR
    (status IN ('absent', 'exempt') AND marks_obtained IS NULL)
  )
) WITHOUT ROWID;
CREATE INDEX idx_marks_student ON marks(student_id);

-- ---------------------------------------------------------------------
-- 17. assignments (homework)
-- ---------------------------------------------------------------------
CREATE TABLE assignments (
  id TEXT PRIMARY KEY,
  school_id TEXT NOT NULL,
  academic_year_id TEXT NOT NULL,
  classroom_id TEXT NOT NULL,
  subject_id TEXT NOT NULL,
  created_by TEXT NOT NULL REFERENCES users(id),
  title TEXT NOT NULL,
  description TEXT,
  due_at INTEGER,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'closed')),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,

  FOREIGN KEY (classroom_id, school_id, academic_year_id)
    REFERENCES classrooms(id, school_id, academic_year_id),
  FOREIGN KEY (classroom_id, subject_id)
    REFERENCES teaching_assignments(classroom_id, subject_id)
);
CREATE INDEX idx_assignments_class_subject ON assignments(classroom_id, subject_id);

-- ---------------------------------------------------------------------
-- 18. assignment_attachments (R2 metadata only; bucket stays private)
-- ---------------------------------------------------------------------
CREATE TABLE assignment_attachments (
  id TEXT PRIMARY KEY,
  assignment_id TEXT NOT NULL REFERENCES assignments(id),
  file_name TEXT NOT NULL,
  r2_key TEXT NOT NULL UNIQUE,
  content_type TEXT,
  size_bytes INTEGER CHECK (size_bytes IS NULL OR size_bytes >= 0),
  uploaded_by TEXT NOT NULL REFERENCES users(id),
  created_at INTEGER NOT NULL
);
CREATE INDEX idx_assignment_attachments_assignment ON assignment_attachments(assignment_id);

-- ---------------------------------------------------------------------
-- 19. fee_categories
-- ---------------------------------------------------------------------
CREATE TABLE fee_categories (
  id TEXT PRIMARY KEY,
  school_id TEXT NOT NULL REFERENCES schools(id),
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,

  UNIQUE (school_id, code),
  UNIQUE (id, school_id)
);

-- ---------------------------------------------------------------------
-- 20. fee_charges: append-only ledger of what a student owes.
-- Concession = negative amount. Corrections = void + new charge.
-- Immutable after insert except for the void columns (trigger below).
-- ---------------------------------------------------------------------
CREATE TABLE fee_charges (
  id TEXT PRIMARY KEY,
  school_id TEXT NOT NULL,
  student_id TEXT NOT NULL,
  academic_year_id TEXT NOT NULL,
  enrollment_id TEXT,
  fee_category_id TEXT,
  kind TEXT NOT NULL DEFAULT 'fee' CHECK (kind IN ('fee', 'concession', 'carry_forward')),
  title TEXT NOT NULL,
  amount_paise INTEGER NOT NULL,
  due_on TEXT CHECK (due_on IS NULL OR date(due_on) IS due_on),
  created_by TEXT NOT NULL REFERENCES users(id),
  created_at INTEGER NOT NULL,
  voided_at INTEGER,
  voided_by TEXT REFERENCES users(id),
  void_reason TEXT,

  FOREIGN KEY (student_id, school_id) REFERENCES student_profiles(user_id, school_id),
  FOREIGN KEY (academic_year_id, school_id) REFERENCES academic_years(id, school_id),
  FOREIGN KEY (enrollment_id, student_id) REFERENCES enrollments(id, student_id),
  FOREIGN KEY (fee_category_id, school_id) REFERENCES fee_categories(id, school_id),
  CHECK (
    (kind = 'concession' AND amount_paise < 0) OR
    (kind <> 'concession' AND amount_paise > 0)
  ),
  CHECK (kind <> 'fee' OR fee_category_id IS NOT NULL),
  CHECK (
    (voided_at IS NULL AND voided_by IS NULL AND void_reason IS NULL) OR
    (voided_at IS NOT NULL AND voided_by IS NOT NULL AND void_reason IS NOT NULL)
  )
);
CREATE INDEX idx_fee_charges_student_year ON fee_charges(student_id, academic_year_id);
CREATE INDEX idx_fee_charges_school_year ON fee_charges(school_id, academic_year_id);

-- ---------------------------------------------------------------------
-- 21. fee_payments: append-only. receipt_no is generated by the server;
-- its financial-year part comes from the server's creation time, NOT paid_on.
-- ---------------------------------------------------------------------
CREATE TABLE fee_payments (
  id TEXT PRIMARY KEY,
  school_id TEXT NOT NULL,
  student_id TEXT NOT NULL,
  academic_year_id TEXT NOT NULL,
  receipt_no TEXT NOT NULL,
  amount_paise INTEGER NOT NULL CHECK (amount_paise > 0),
  paid_on TEXT NOT NULL CHECK (date(paid_on) IS paid_on),
  method TEXT NOT NULL CHECK (method IN ('cash', 'upi', 'bank_transfer', 'other')),
  reference TEXT,
  recorded_by TEXT NOT NULL REFERENCES users(id),
  created_at INTEGER NOT NULL,
  voided_at INTEGER,
  voided_by TEXT REFERENCES users(id),
  void_reason TEXT,

  UNIQUE (school_id, receipt_no),
  FOREIGN KEY (student_id, school_id) REFERENCES student_profiles(user_id, school_id),
  FOREIGN KEY (academic_year_id, school_id) REFERENCES academic_years(id, school_id),
  CHECK (
    (voided_at IS NULL AND voided_by IS NULL AND void_reason IS NULL) OR
    (voided_at IS NOT NULL AND voided_by IS NOT NULL AND void_reason IS NOT NULL)
  )
);
CREATE INDEX idx_fee_payments_student_year ON fee_payments(student_id, academic_year_id);
CREATE INDEX idx_fee_payments_school_date ON fee_payments(school_id, paid_on);

-- Ledger rows are never deleted, and only the void columns may change,
-- once, and never back.
CREATE TRIGGER trg_fee_charges_no_delete BEFORE DELETE ON fee_charges
BEGIN SELECT RAISE(ABORT, 'fee_charges are append-only: void instead of deleting'); END;

CREATE TRIGGER trg_fee_charges_immutable BEFORE UPDATE ON fee_charges
WHEN NEW.id <> OLD.id OR NEW.school_id <> OLD.school_id OR NEW.student_id <> OLD.student_id
  OR NEW.academic_year_id <> OLD.academic_year_id
  OR NEW.enrollment_id IS NOT OLD.enrollment_id OR NEW.fee_category_id IS NOT OLD.fee_category_id
  OR NEW.kind <> OLD.kind OR NEW.title <> OLD.title OR NEW.amount_paise <> OLD.amount_paise
  OR NEW.due_on IS NOT OLD.due_on OR NEW.created_by <> OLD.created_by OR NEW.created_at <> OLD.created_at
  OR OLD.voided_at IS NOT NULL
BEGIN SELECT RAISE(ABORT, 'fee_charges: only a first-time void may change a charge'); END;

CREATE TRIGGER trg_fee_payments_no_delete BEFORE DELETE ON fee_payments
BEGIN SELECT RAISE(ABORT, 'fee_payments are append-only: void instead of deleting'); END;

CREATE TRIGGER trg_fee_payments_immutable BEFORE UPDATE ON fee_payments
WHEN NEW.id <> OLD.id OR NEW.school_id <> OLD.school_id OR NEW.student_id <> OLD.student_id
  OR NEW.academic_year_id <> OLD.academic_year_id OR NEW.receipt_no <> OLD.receipt_no
  OR NEW.amount_paise <> OLD.amount_paise OR NEW.paid_on <> OLD.paid_on OR NEW.method <> OLD.method
  OR NEW.reference IS NOT OLD.reference OR NEW.recorded_by <> OLD.recorded_by
  OR NEW.created_at <> OLD.created_at OR OLD.voided_at IS NOT NULL
BEGIN SELECT RAISE(ABORT, 'fee_payments: only a first-time void may change a payment'); END;

-- ---------------------------------------------------------------------
-- 22. receipt_counters
-- Allocate atomically in the SAME db.batch()/transaction as the payment:
--   UPDATE receipt_counters SET last_number = last_number + 1 WHERE ...;
--   INSERT INTO fee_payments (..., receipt_no = ... (SELECT last_number ...)) ...
-- If the payment insert fails, the counter update rolls back: no gaps.
-- ---------------------------------------------------------------------
CREATE TABLE receipt_counters (
  school_id TEXT NOT NULL REFERENCES schools(id),
  financial_year TEXT NOT NULL,
  last_number INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (school_id, financial_year)
);

-- ---------------------------------------------------------------------
-- 23. code_counters: sequences for login_id / student_code / employee_code
--   login_id      = <SCHOOLCODE>-<P|T|S>-<6-digit sequence>
--   student_code  = 'S' + sequence     employee_code = 'T' + sequence
-- Allocate with UPDATE ... SET last_number = last_number + 1 ... RETURNING.
-- ---------------------------------------------------------------------
CREATE TABLE code_counters (
  school_id TEXT NOT NULL REFERENCES schools(id),
  kind TEXT NOT NULL CHECK (kind IN ('principal', 'teacher', 'student')),
  last_number INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (school_id, kind)
);

-- ---------------------------------------------------------------------
-- 24. import_jobs
-- previewed -> committing -> committed | failed ;  previewed -> expired
--
-- Commit protocol (see docs): claim the job with ONE guarded UPDATE
--   UPDATE import_jobs SET status='committing'
--    WHERE id=? AND school_id=? AND actor_id=? AND status='previewed' AND expires_at > ?
-- and proceed only if exactly one row changed. A cron marks stale
-- 'committing' rows failed and NULLs payloads of finished jobs.
-- payload holds validated rows (student PII): clear it after commit/expiry.
-- Keep payload well under D1's 2 MB row limit.
-- ---------------------------------------------------------------------
CREATE TABLE import_jobs (
  id TEXT PRIMARY KEY,
  school_id TEXT NOT NULL REFERENCES schools(id),
  kind TEXT NOT NULL
    CHECK (kind IN ('students', 'attendance', 'marks', 'fee-payments', 'fee-charges', 'promotion')),
  actor_id TEXT NOT NULL REFERENCES users(id),
  payload_hash TEXT NOT NULL,
  payload TEXT CHECK (payload IS NULL OR json_valid(payload)),
  summary TEXT CHECK (summary IS NULL OR json_valid(summary)),
  status TEXT NOT NULL
    CHECK (status IN ('previewed', 'committing', 'committed', 'failed', 'expired')),
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  committed_at INTEGER,

  CHECK (status NOT IN ('previewed', 'committing') OR payload IS NOT NULL),
  CHECK (status <> 'committed' OR committed_at IS NOT NULL)
);
CREATE INDEX idx_import_jobs_school_status ON import_jobs(school_id, status);
CREATE INDEX idx_import_jobs_expiry ON import_jobs(expires_at);

-- ---------------------------------------------------------------------
-- 25. audit_log (actor_id has no FK: the Super Admin is not a users row)
-- ---------------------------------------------------------------------
CREATE TABLE audit_log (
  id TEXT PRIMARY KEY,
  school_id TEXT,
  actor_id TEXT NOT NULL,
  actor_role TEXT NOT NULL
    CHECK (actor_role IN ('super_admin', 'principal', 'teacher', 'student', 'system')),
  action TEXT NOT NULL,
  entity TEXT NOT NULL,
  entity_id TEXT,
  before TEXT CHECK (before IS NULL OR json_valid(before)),
  after TEXT CHECK (after IS NULL OR json_valid(after)),
  at INTEGER NOT NULL
);
CREATE INDEX idx_audit_school_time ON audit_log(school_id, at);
CREATE INDEX idx_audit_entity ON audit_log(entity, entity_id);
