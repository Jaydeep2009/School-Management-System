-- Birthday Debugging SQL Queries
-- Run these in your D1 database to debug why birthdays aren't showing

-- =================================================================
-- STEP 1: Check if ANY students exist
-- =================================================================
SELECT COUNT(*) as total_students
FROM students
WHERE school_id = 'YOUR_SCHOOL_ID';

-- Expected: Should show a number > 0


-- =================================================================
-- STEP 2: Check if students have date_of_birth set
-- =================================================================
SELECT 
  COUNT(*) as students_with_birthdays,
  COUNT(date_of_birth) as has_dob
FROM students
WHERE school_id = 'YOUR_SCHOOL_ID';

-- Expected: has_dob should be > 0


-- =================================================================
-- STEP 3: Check student_profiles table
-- =================================================================
SELECT COUNT(*) as total_profiles
FROM student_profiles
WHERE school_id = 'YOUR_SCHOOL_ID'
  AND dob_md IS NOT NULL;

-- Expected: Should show a number > 0
-- NOTE: dob_md is computed field (MM-DD format)


-- =================================================================
-- STEP 4: Check enrollments
-- =================================================================
SELECT 
  e.student_id,
  e.classroom_id,
  e.academic_year_id,
  e.status as enrollment_status,
  ay.status as year_status,
  ay.label as year_label
FROM enrollments e
INNER JOIN academic_years ay ON e.academic_year_id = ay.id
WHERE e.school_id = 'YOUR_SCHOOL_ID'
LIMIT 10;

-- Expected: Should show enrollments
-- CHECK: ay.status should be 'current' for active year


-- =================================================================
-- STEP 5: Check teaching assignments for a specific teacher
-- =================================================================
SELECT 
  ta.id,
  ta.teacher_id,
  ta.classroom_id,
  c.classroom_code,
  s.name as subject_name,
  u.login_id as teacher_login
FROM teaching_assignments ta
INNER JOIN classrooms c ON ta.classroom_id = c.id
INNER JOIN subjects s ON ta.subject_id = s.id
INNER JOIN users u ON ta.teacher_id = u.id
WHERE ta.school_id = 'YOUR_SCHOOL_ID'
  AND u.role = 'teacher'
LIMIT 10;

-- Expected: Should show teaching assignments
-- NOTE: Copy a teacher_id from results for next queries


-- =================================================================
-- STEP 6: Get classrooms for specific teacher (NEW FUNCTION)
-- =================================================================
SELECT DISTINCT classroom_id
FROM teaching_assignments
WHERE school_id = 'YOUR_SCHOOL_ID' 
  AND teacher_id = 'PASTE_TEACHER_ID_HERE';

-- Expected: Should return 1 or more classroom_ids
-- This is what findTeacherClassrooms() returns


-- =================================================================
-- STEP 7: Full birthday query (what API runs)
-- =================================================================
SELECT 
  sp.user_id,
  sp.student_code,
  sp.first_name,
  sp.middle_name,
  sp.last_name,
  sp.dob_md,
  sp.date_of_birth as full_dob,
  c.classroom_code,
  c.grade_name,
  c.division_name,
  e.status as enrollment_status,
  ay.status as year_status,
  ay.label as year_label
FROM student_profiles sp
JOIN enrollments e ON sp.user_id = e.student_id
JOIN academic_years ay ON e.academic_year_id = ay.id
JOIN classrooms c ON e.classroom_id = c.id
WHERE sp.school_id = 'YOUR_SCHOOL_ID'
  AND sp.dob_md IS NOT NULL
  AND sp.status = 'active'
  AND ay.status = 'current'  -- ⚠️ CRITICAL: Year must be 'current'
  AND e.status = 'active'
  AND e.classroom_id IN (
    SELECT DISTINCT classroom_id
    FROM teaching_assignments
    WHERE teacher_id = 'PASTE_TEACHER_ID_HERE'
      AND school_id = 'YOUR_SCHOOL_ID'
  )
ORDER BY sp.dob_md;

-- Expected: Should return students with birthdays
-- If empty, check which condition is failing


-- =================================================================
-- STEP 8: Debug - Remove filters one by one
-- =================================================================

-- Remove ay.status = 'current' filter
SELECT 
  sp.user_id,
  sp.first_name,
  sp.last_name,
  sp.dob_md,
  ay.status as year_status,
  ay.label as year_label
FROM student_profiles sp
JOIN enrollments e ON sp.user_id = e.student_id
JOIN academic_years ay ON e.academic_year_id = ay.id
JOIN classrooms c ON e.classroom_id = c.id
WHERE sp.school_id = 'YOUR_SCHOOL_ID'
  AND sp.dob_md IS NOT NULL
  AND sp.status = 'active'
  -- AND ay.status = 'current'  -- ⚠️ REMOVED TO TEST
  AND e.status = 'active'
  AND e.classroom_id IN (
    SELECT DISTINCT classroom_id
    FROM teaching_assignments
    WHERE teacher_id = 'PASTE_TEACHER_ID_HERE'
      AND school_id = 'YOUR_SCHOOL_ID'
  );

-- If this returns results but Step 7 doesn't:
-- PROBLEM: ay.status is not 'current'
-- SOLUTION: Update academic year status


-- =================================================================
-- STEP 9: Check academic year status
-- =================================================================
SELECT 
  id,
  label,
  status,
  start_date,
  end_date,
  is_current
FROM academic_years
WHERE school_id = 'YOUR_SCHOOL_ID'
ORDER BY start_date DESC;

-- Expected: One year should have status = 'current'
-- If none: Run UPDATE query below


-- =================================================================
-- FIX: Set academic year to current
-- =================================================================
-- First, remove 'current' from all years
UPDATE academic_years 
SET status = 'active', is_current = 0
WHERE school_id = 'YOUR_SCHOOL_ID';

-- Then set ONE year to current (adjust year as needed)
UPDATE academic_years 
SET status = 'current', is_current = 1
WHERE school_id = 'YOUR_SCHOOL_ID'
  AND label = '2024-2025';  -- ⚠️ Change this to your actual year


-- =================================================================
-- STEP 10: Verify students have birthdays in MM-DD format
-- =================================================================
SELECT 
  first_name,
  last_name,
  date_of_birth,
  dob_md,
  CASE 
    WHEN dob_md IS NULL THEN 'Missing dob_md'
    WHEN date_of_birth IS NULL THEN 'Missing date_of_birth'
    ELSE 'OK'
  END as status
FROM student_profiles
WHERE school_id = 'YOUR_SCHOOL_ID'
LIMIT 20;

-- Expected: dob_md should be in format '09-25'
-- If NULL: Need to regenerate from date_of_birth


-- =================================================================
-- FIX: Regenerate dob_md from date_of_birth
-- =================================================================
UPDATE student_profiles
SET dob_md = strftime('%m-%d', date_of_birth)
WHERE school_id = 'YOUR_SCHOOL_ID'
  AND date_of_birth IS NOT NULL
  AND dob_md IS NULL;


-- =================================================================
-- SUMMARY OF COMMON ISSUES
-- =================================================================

/*
ISSUE 1: ay.status != 'current'
SYMPTOM: Query returns no results
FIX: Set one academic year to status='current'

ISSUE 2: dob_md is NULL
SYMPTOM: Query returns no results (filtered out by dob_md IS NOT NULL)
FIX: Regenerate dob_md from date_of_birth

ISSUE 3: No teaching assignments
SYMPTOM: Subquery returns no classroom_ids
FIX: Create teaching assignments for teacher

ISSUE 4: No enrollments
SYMPTOM: JOIN fails, no results
FIX: Enroll students in classrooms

ISSUE 5: e.status != 'active'
SYMPTOM: Query filters out students
FIX: Set enrollment status to 'active'

ISSUE 6: sp.status != 'active'
SYMPTOM: Query filters out students
FIX: Set student profile status to 'active'
*/
