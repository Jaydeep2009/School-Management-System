-- Migration: Make teacher_id nullable in timetable_entries
-- Description: Allow timetable entries to use teacher_name text instead of requiring teacher_id
-- SQLite doesn't support ALTER COLUMN, so we need to recreate the table

-- Step 1: Create new table with teacher_id nullable
CREATE TABLE timetable_entries_new (
  id TEXT PRIMARY KEY,
  timetable_id TEXT NOT NULL,
  day_of_week INTEGER NOT NULL,
  period_no INTEGER NOT NULL,
  subject_id TEXT NOT NULL,
  teacher_id TEXT,
  teacher_name TEXT,
  start_time TEXT,
  end_time TEXT,
  room TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (timetable_id) REFERENCES timetables(id) ON DELETE CASCADE,
  FOREIGN KEY (subject_id) REFERENCES subjects(id),
  FOREIGN KEY (teacher_id) REFERENCES users(id)
);

-- Step 2: Copy all existing data
INSERT INTO timetable_entries_new 
SELECT id, timetable_id, day_of_week, period_no, subject_id, teacher_id, teacher_name, start_time, end_time, room, created_at, updated_at
FROM timetable_entries;

-- Step 3: Drop old table
DROP TABLE timetable_entries;

-- Step 4: Rename new table to original name
ALTER TABLE timetable_entries_new RENAME TO timetable_entries;

-- Step 5: Recreate indexes
CREATE INDEX idx_timetable_entries_timetable ON timetable_entries(timetable_id);
CREATE INDEX idx_timetable_entries_subject ON timetable_entries(subject_id);
CREATE INDEX idx_timetable_entries_teacher ON timetable_entries(teacher_id);
CREATE INDEX idx_timetable_entries_schedule ON timetable_entries(day_of_week, period_no);
