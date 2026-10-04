-- Migration: Add image URL support to timetables
-- This allows principals to upload timetable images instead of manual entry
-- Date: 2026-01-19

-- Add image_url column to timetables table
ALTER TABLE timetables ADD COLUMN image_url TEXT;

-- Add comment explaining the feature
-- Principals can upload a timetable image for each classroom
-- Teachers assigned to that classroom and students in that classroom can view it
