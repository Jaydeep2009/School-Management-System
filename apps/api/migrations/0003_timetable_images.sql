-- =====================================================================
-- Migration 0003: Add image support to timetables
-- =====================================================================

-- Add image_url column to timetables table
ALTER TABLE timetables ADD COLUMN image_url TEXT;

-- Add updated_at tracking for image changes
-- Note: image_url stores the R2 object key or full URL to the timetable image
-- Format: timetables/{school_id}/{timetable_id}/{timestamp}.{ext}
-- Example: timetables/abc-123/timetable-456/1234567890.jpg
