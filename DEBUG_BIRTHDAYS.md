# Birthday Debugging Guide

## Quick Checks

### 1. Check if students have birthdays set

Run this SQL query in your D1 database:

```sql
SELECT 
  s.id,
  s.first_name,
  s.last_name,
  s.date_of_birth,
  e.classroom_id,
  c.classroom_code
FROM students s
LEFT JOIN enrollments e ON s.id = e.student_id
LEFT JOIN classrooms c ON e.classroom_id = c.id
WHERE s.school_id = 'YOUR_SCHOOL_ID'
ORDER BY s.date_of_birth;
```

**Expected**: Students should have `date_of_birth` filled in (not NULL)

---

### 2. Check if teacher has teaching assignments

```sql
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
  AND ta.teacher_id = 'YOUR_TEACHER_ID';
```

**Expected**: Should show at least one teaching assignment

---

### 3. Check if students are enrolled in teacher's classrooms

```sql
SELECT 
  ta.classroom_id,
  c.classroom_code,
  COUNT(e.id) as student_count
FROM teaching_assignments ta
INNER JOIN classrooms c ON ta.classroom_id = c.id
LEFT JOIN enrollments e ON c.id = e.classroom_id
WHERE ta.teacher_id = 'YOUR_TEACHER_ID'
  AND ta.school_id = 'YOUR_SCHOOL_ID'
GROUP BY ta.classroom_id, c.classroom_code;
```

**Expected**: Each classroom should have student_count > 0

---

### 4. Check findTeacherClassrooms function

```sql
-- This is what the API is running
SELECT DISTINCT classroom_id
FROM teaching_assignments
WHERE school_id = 'YOUR_SCHOOL_ID' 
  AND teacher_id = 'YOUR_TEACHER_ID';
```

**Expected**: Should return classroom IDs

---

### 5. Full birthday query (what the API runs)

```sql
SELECT 
  s.id as user_id,
  s.first_name,
  s.last_name,
  s.date_of_birth as full_dob,
  strftime('%m-%d', s.date_of_birth) as dob_md,
  c.grade_name,
  c.division_name,
  c.classroom_code
FROM students s
INNER JOIN enrollments e ON s.id = e.student_id
INNER JOIN classrooms c ON e.classroom_id = c.id
WHERE s.school_id = 'YOUR_SCHOOL_ID'
  AND e.classroom_id IN (
    SELECT DISTINCT classroom_id
    FROM teaching_assignments
    WHERE teacher_id = 'YOUR_TEACHER_ID'
      AND school_id = 'YOUR_SCHOOL_ID'
  )
  AND s.date_of_birth IS NOT NULL
ORDER BY dob_md;
```

**Expected**: Should return students with birthdays

---

## Common Issues

### Issue 1: No birthdays showing

**Possible causes**:
1. ❌ Students don't have `date_of_birth` set
2. ❌ Teacher has no teaching assignments
3. ❌ Classrooms have no enrolled students
4. ❌ Students' birthdays are in wrong format
5. ❌ Old API version cached

**Solutions**:
1. ✅ Set student birthdays in student profiles
2. ✅ Assign teacher to classes (teaching_assignments)
3. ✅ Enroll students in classrooms
4. ✅ Ensure date format is YYYY-MM-DD
5. ✅ Hard refresh page (Ctrl+F5)

---

### Issue 2: Only showing some students

**Possible cause**: Not all classrooms have enrollments

**Check**:
```sql
-- Find classrooms with no students
SELECT 
  c.id,
  c.classroom_code,
  COUNT(e.id) as student_count
FROM classrooms c
INNER JOIN teaching_assignments ta ON c.id = ta.classroom_id
LEFT JOIN enrollments e ON c.id = e.classroom_id
WHERE ta.teacher_id = 'YOUR_TEACHER_ID'
  AND c.school_id = 'YOUR_SCHOOL_ID'
GROUP BY c.id, c.classroom_code
HAVING student_count = 0;
```

---

### Issue 3: "No upcoming birthdays" message

**Possible cause**: All birthdays are in the past (already happened this year)

**Check**:
```sql
-- See all student birthdays (regardless of date)
SELECT 
  s.first_name,
  s.last_name,
  s.date_of_birth,
  strftime('%m-%d', s.date_of_birth) as month_day,
  strftime('%m-%d', 'now') as today_month_day
FROM students s
INNER JOIN enrollments e ON s.id = e.student_id
INNER JOIN teaching_assignments ta ON e.classroom_id = ta.classroom_id
WHERE ta.teacher_id = 'YOUR_TEACHER_ID'
  AND s.school_id = 'YOUR_SCHOOL_ID'
  AND s.date_of_birth IS NOT NULL
ORDER BY month_day;
```

---

## Testing Steps

### Test with Wrangler CLI

```bash
# Get teacher's user ID
wrangler d1 execute sms-production-db --remote \
  --command "SELECT id, login_id FROM users WHERE role = 'teacher' LIMIT 1"

# Get teacher's teaching assignments
wrangler d1 execute sms-production-db --remote \
  --command "SELECT * FROM teaching_assignments WHERE teacher_id = 'TEACHER_ID'"

# Get students in those classrooms
wrangler d1 execute sms-production-db --remote \
  --command "SELECT s.*, e.classroom_id FROM students s INNER JOIN enrollments e ON s.id = e.student_id WHERE e.classroom_id IN (SELECT classroom_id FROM teaching_assignments WHERE teacher_id = 'TEACHER_ID')"
```

### Test API endpoint directly

```bash
# Get auth token first (login)
curl -X POST https://sms-api.nmvpmsms.workers.dev/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"loginId": "teacher@example.com", "password": "password"}'

# Use token to get birthdays
curl https://sms-api.nmvpmsms.workers.dev/api/profiles/birthdays/upcoming \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## Quick Fix: Add Test Birthdays

If you need to quickly test, add some birthdays to existing students:

```sql
-- Update students to have birthdays this week
UPDATE students 
SET date_of_birth = date('now', '+2 days', 'start of month')
WHERE id IN (
  SELECT s.id FROM students s
  INNER JOIN enrollments e ON s.id = e.student_id
  INNER JOIN teaching_assignments ta ON e.classroom_id = ta.classroom_id
  WHERE ta.teacher_id = 'YOUR_TEACHER_ID'
  LIMIT 3
);
```

This will give 3 students birthdays 2 days from now in the current month.

---

## API Response Structure

Expected response from `/api/profiles/birthdays/upcoming`:

```json
{
  "data": [
    {
      "user_id": "student-id-123",
      "role": "student",
      "full_name": "John Doe",
      "date_of_birth": "2010-09-25",
      "classroom": "5 A",
      "days_until": 3
    },
    {
      "user_id": "student-id-456",
      "role": "student",
      "full_name": "Jane Smith",
      "date_of_birth": "2011-09-27",
      "classroom": "5 B",
      "days_until": 5
    }
  ]
}
```

If you get empty array `{"data": []}`, then either:
1. Teacher has no teaching assignments
2. No students in those classrooms
3. No students have birthdays set
4. All birthdays already passed this year

---

## Browser Console Debug

Open browser console and run:

```javascript
// Check if API call is working
fetch('https://sms-api.nmvpmsms.workers.dev/api/profiles/birthdays/upcoming', {
  headers: {
    'Authorization': 'Bearer ' + localStorage.getItem('accessToken')
  }
})
.then(r => r.json())
.then(console.log)
.catch(console.error);
```

This will show you the actual API response.

---

## Next Steps

1. Run query #1 to check if students have birthdays
2. Run query #2 to check if teacher has assignments
3. Run query #3 to check if students are enrolled
4. Run query #5 to see what API should return
5. If no results, add test data with the quick fix
6. Refresh the page and test again
