-- Add Teaching Assignment for Your Teacher
-- This will allow your teacher to see birthdays

-- STEP 1: Find your teacher ID
-- Login as the teacher, then in browser console run:
-- console.log(JSON.parse(localStorage.getItem('user')).id)

-- STEP 2: Replace TEACHER_ID below with the ID from Step 1

-- STEP 3: Get a subject (any subject will work)
SELECT id as subject_id FROM subjects LIMIT 1;

-- STEP 4: Run this command (replace YOUR_TEACHER_ID and YOUR_SUBJECT_ID)
INSERT INTO teaching_assignments (
  id,
  teacher_id,
  classroom_id,
  subject_id,
  academic_year_id,
  school_id,
  created_at,
  updated_at
) VALUES (
  lower(hex(randomblob(16))),  -- Generate random ID
  'YOUR_TEACHER_ID',  -- ← Replace with teacher ID from Step 1
  'e30a1326-e3f9-4bae-b48c-ef76ad7b43dc',  -- Classroom 10-A (has 12 students)
  'YOUR_SUBJECT_ID',  -- ← Replace with subject ID from Step 3
  '44193068-0196-441a-adca-fbb23838845a',  -- Current academic year 2025-26
  (SELECT school_id FROM users WHERE id = 'YOUR_TEACHER_ID'),  -- Auto-get school_id
  datetime('now'),
  datetime('now')
);

-- After running this, your teacher will see 12 birthdays!
