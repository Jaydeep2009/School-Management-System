-- Cleanup script to fix partially promoted students
-- This fixes students who have 2 active enrollments (one in current year, one in target year)

-- Step 1: Find students with duplicate active enrollments
-- Run this first to see who is affected:
SELECT 
  e1.student_id,
  sp.first_name || ' ' || sp.last_name as student_name,
  e1.id as old_enrollment_id,
  e1.academic_year_id as old_year,
  ay1.label as old_year_label,
  e2.id as new_enrollment_id,
  e2.academic_year_id as new_year,
  ay2.label as new_year_label
FROM enrollments e1
JOIN enrollments e2 ON e1.student_id = e2.student_id AND e1.id != e2.id
JOIN student_profiles sp ON e1.student_id = sp.user_id
JOIN academic_years ay1 ON e1.academic_year_id = ay1.id
JOIN academic_years ay2 ON e2.academic_year_id = ay2.id
WHERE e1.status = 'active' 
  AND e2.status = 'active'
  AND e1.academic_year_id < e2.academic_year_id  -- older year
ORDER BY student_name;

-- Step 2: Fix by marking older enrollments as completed
-- IMPORTANT: Only run this after verifying Step 1 shows the correct students
UPDATE enrollments
SET 
  status = 'completed',
  left_on = date('now'),
  updated_at = unixepoch() * 1000
WHERE id IN (
  SELECT e1.id
  FROM enrollments e1
  JOIN enrollments e2 ON e1.student_id = e2.student_id AND e1.id != e2.id
  WHERE e1.status = 'active' 
    AND e2.status = 'active'
    AND e1.academic_year_id < e2.academic_year_id
);
