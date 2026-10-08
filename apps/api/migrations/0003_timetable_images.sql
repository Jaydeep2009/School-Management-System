-- =====================================================================
-- Migration 0003: Add image support to timetables
-- =====================================================================

-- Add image_url column to timetables table (if it doesn't exist)
-- SQLite doesn't support IF NOT EXISTS for ALTER TABLE, so we use a workaround
-- Check if column exists first, then add only if it doesn't exist

-- Note: If this migration fails with "duplicate column", it means the column already exists
-- In that case, manually mark this migration as applied:
-- INSERT INTO d1_migrations (id, name, applied_at) VALUES (4, '0003_timetable_images.sql', datetime('now'));

-- Try to add the column (will fail if it already exists, which is okay for this one-time migration)
ALTER TABLE timetables ADD COLUMN image_url TEXT;

-- Note: image_url stores the R2 object key or full URL to the timetable image
-- Format: timetables/{school_id}/{timetable_id}/{timestamp}.{ext}
-- Example: timetables/abc-123/timetable-456/1234567890.jpg
