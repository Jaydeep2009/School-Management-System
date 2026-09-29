-- Migration: Add admission_batch to student_profiles
-- This allows grouping students by admission batch (e.g., "2024 Batch", "2025 Batch")

ALTER TABLE student_profiles ADD COLUMN admission_batch TEXT;

CREATE INDEX idx_student_admission_batch ON student_profiles(school_id, admission_batch);
