-- Migration: Remove teaching_assignments foreign key from assessments table
-- Description: Allow principals to create assessments without requiring teaching assignments
-- This enables assessment creation before teacher assignments are finalized
-- Date: 2026-10-06

-- SQLite doesn't support DROP CONSTRAINT, so we need to recreate the table

-- Step 0: Disable foreign key checks temporarily
PRAGMA foreign_keys = OFF;

-- Step 1: Create new assessments table without the teaching_assignments FK
CREATE TABLE assessments_new (
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
  created_by TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  UNIQUE (classroom_id, subject_id, name),
  FOREIGN KEY (created_by, school_id) REFERENCES users(id, school_id),
  FOREIGN KEY (classroom_id, school_id, academic_year_id)
    REFERENCES classrooms(id, school_id, academic_year_id)
  -- Removed: FOREIGN KEY (classroom_id, subject_id) REFERENCES teaching_assignments(classroom_id, subject_id)
);

-- Step 2: Copy all existing data
INSERT INTO assessments_new 
SELECT id, school_id, academic_year_id, classroom_id, subject_id, name, max_marks, 
       weightage, held_on, is_published, is_locked, created_by, created_at, updated_at
FROM assessments;

-- Step 3: Drop old table
DROP TABLE assessments;

-- Step 4: Rename new table to original name
ALTER TABLE assessments_new RENAME TO assessments;

-- Step 5: Recreate index
CREATE INDEX idx_assessments_school_year ON assessments(school_id, academic_year_id);

-- Step 6: Re-enable foreign key checks
PRAGMA foreign_keys = ON;

