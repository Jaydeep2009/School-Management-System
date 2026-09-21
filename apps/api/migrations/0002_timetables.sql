-- =====================================================================
-- Migration 0002: Timetables and Import Jobs Update
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Update import_jobs kind constraint to include 'timetable'
-- ---------------------------------------------------------------------

-- Drop the old CHECK constraint and recreate with 'timetable' added
-- SQLite doesn't support ALTER TABLE ... DROP CONSTRAINT, so we need to recreate the table

-- Create new table with updated constraint
CREATE TABLE import_jobs_new (
  id TEXT PRIMARY KEY,
  school_id TEXT NOT NULL REFERENCES schools(id),
  kind TEXT NOT NULL
    CHECK (kind IN ('students', 'attendance', 'marks', 'fee-payments', 'fee-charges', 'promotion', 'timetable')),
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

-- Copy data from old table
INSERT INTO import_jobs_new SELECT * FROM import_jobs;

-- Drop old table
DROP TABLE import_jobs;

-- Rename new table
ALTER TABLE import_jobs_new RENAME TO import_jobs;

-- Recreate indexes
CREATE INDEX idx_import_jobs_school_status ON import_jobs(school_id, status);
CREATE INDEX idx_import_jobs_expiry ON import_jobs(expires_at);

-- ---------------------------------------------------------------------
-- 2. timetables (versioned per classroom/academic year)
-- ---------------------------------------------------------------------
CREATE TABLE timetables (
  id TEXT PRIMARY KEY,
  school_id TEXT NOT NULL REFERENCES schools(id),
  academic_year_id TEXT NOT NULL,
  classroom_id TEXT NOT NULL,
  version INTEGER NOT NULL CHECK (version > 0),
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'published', 'archived')),
  created_by TEXT NOT NULL REFERENCES users(id),
  published_at INTEGER,
  archived_at INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  UNIQUE (id, school_id),
  UNIQUE (school_id, academic_year_id, classroom_id, version),
  FOREIGN KEY (academic_year_id, school_id) REFERENCES academic_years(id, school_id),
  FOREIGN KEY (classroom_id, school_id) REFERENCES classrooms(id, school_id),
  CHECK (status <> 'published' OR published_at IS NOT NULL),
  CHECK (status <> 'archived' OR archived_at IS NOT NULL)
);

-- Only one published timetable per classroom/year
CREATE UNIQUE INDEX uq_published_timetable
  ON timetables(school_id, academic_year_id, classroom_id)
  WHERE status = 'published';

CREATE INDEX idx_timetables_school_year ON timetables(school_id, academic_year_id);
CREATE INDEX idx_timetables_classroom ON timetables(classroom_id);
CREATE INDEX idx_timetables_status ON timetables(status);

-- ---------------------------------------------------------------------
-- 3. timetable_entries (individual period slots)
-- ---------------------------------------------------------------------
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
  FOREIGN KEY (subject_id) REFERENCES subjects(id),
  FOREIGN KEY (teacher_id) REFERENCES teacher_profiles(user_id),
  -- No duplicate slots in same timetable
  UNIQUE (timetable_id, day_of_week, period_no),
  -- Time validation
  CHECK (start_time IS NULL OR end_time IS NULL OR start_time < end_time)
);

CREATE INDEX idx_timetable_entries_timetable ON timetable_entries(timetable_id);
CREATE INDEX idx_timetable_entries_day_period ON timetable_entries(timetable_id, day_of_week, period_no);
CREATE INDEX idx_timetable_entries_teacher ON timetable_entries(teacher_id, day_of_week, period_no);
CREATE INDEX idx_timetable_entries_subject ON timetable_entries(subject_id);

