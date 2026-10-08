-- Migration: Add teacher_name column to timetable_entries
-- Description: Store teacher names as text from uploaded timetables instead of requiring teacher_id lookups
-- This allows timetables to display any teacher name without creating fake teacher accounts

-- Add teacher_name column (nullable to support existing entries)
ALTER TABLE timetable_entries ADD COLUMN teacher_name TEXT;

-- Make teacher_id nullable since we'll use teacher_name for uploaded timetables
-- Note: SQLite doesn't support ALTER COLUMN, so existing data remains unchanged
-- New entries can use either teacher_id (for system-linked) or teacher_name (for text display)
