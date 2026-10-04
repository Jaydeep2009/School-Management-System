-- Migration: Add period_timings table for school-wide period definitions
-- This allows schools to define their daily schedule structure
-- Date: 2026-01-19

-- Period timings define the school day structure (Period 1, Break, Lunch, etc.)
CREATE TABLE period_timings (
  id TEXT PRIMARY KEY,
  school_id TEXT NOT NULL REFERENCES schools(id),
  academic_year_id TEXT NOT NULL,
  period_no INTEGER NOT NULL CHECK (period_no >= 0),
  start_time TEXT NOT NULL CHECK (length(start_time) = 5),
  end_time TEXT NOT NULL CHECK (length(end_time) = 5),
  label TEXT NOT NULL, -- "Period 1", "Break", "Lunch", etc.
  is_break BOOLEAN NOT NULL DEFAULT FALSE,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  UNIQUE (id, school_id),
  UNIQUE (school_id, academic_year_id, period_no),
  FOREIGN KEY (academic_year_id, school_id) REFERENCES academic_years(id, school_id),
  CHECK (start_time < end_time)
);

CREATE INDEX idx_period_timings_school_year ON period_timings(school_id, academic_year_id);
CREATE INDEX idx_period_timings_period_no ON period_timings(period_no);

-- Default period timings will be created via API when principal sets up timetable
-- This keeps the migration simple and allows per-school customization
