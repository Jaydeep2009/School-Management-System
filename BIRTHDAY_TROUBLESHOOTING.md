# 🔍 Birthday Troubleshooting - Why Aren't Birthdays Showing?

## 🎯 Most Likely Cause

Based on the query logic, **99% chance** the issue is one of these:

### 1. **Academic Year Status is NOT 'current'** ⚠️

The birthday query has this critical filter:
```sql
AND ay.status = 'current'  -- ⚠️ MUST be 'current', not 'active'
```

**Check**: Do you have an academic year with `status = 'current'`?

**Quick Fix**:
```sql
-- Set your active year to 'current'
UPDATE academic_years 
SET status = 'current', is_current = 1
WHERE school_id = 'YOUR_SCHOOL_ID'
  AND label = '2024-2025';  -- Change to your year
```

---

### 2. **Students Don't Have `dob_md` Field Set** ⚠️

The query filters by:
```sql
AND sp.dob_md IS NOT NULL
```

`dob_md` is a computed field (MM-DD format) that should be in `student_profiles` table.

**Quick Fix**:
```sql
-- Regenerate dob_md from date_of_birth
UPDATE student_profiles
SET dob_md = strftime('%m-%d', date_of_birth)
WHERE school_id = 'YOUR_SCHOOL_ID'
  AND date_of_birth IS NOT NULL
  AND (dob_md IS NULL OR dob_md = '');
```

---

### 3. **Teacher Has No Teaching Assignments** ⚠️

The new logic requires teaching assignments.

**Check**:
```sql
SELECT COUNT(*) 
FROM teaching_assignments 
WHERE teacher_id = 'YOUR_TEACHER_ID';
```

If `0`, you need to create teaching assignments.

---

## 🔧 Step-by-Step Fix

### Option 1: Use Wrangler CLI (Recommended)

```bash
# 1. Check academic year status
wrangler d1 execute sms-production-db --remote \
  --command "SELECT id, label, status, is_current FROM academic_years"

# If none are 'current', fix it:
wrangler d1 execute sms-production-db --remote \
  --command "UPDATE academic_years SET status = 'current', is_current = 1 WHERE label = '2024-2025'"

# 2. Check dob_md field
wrangler d1 execute sms-production-db --remote \
  --command "SELECT COUNT(*) as with_dob_md FROM student_profiles WHERE dob_md IS NOT NULL"

# If count is 0, fix it:
wrangler d1 execute sms-production-db --remote \
  --command "UPDATE student_profiles SET dob_md = strftime('%m-%d', date_of_birth) WHERE date_of_birth IS NOT NULL"

# 3. Check teaching assignments
wrangler d1 execute sms-production-db --remote \
  --command "SELECT COUNT(*) as assignments FROM teaching_assignments"

# If 0, you need to create assignments via the UI
```

---

### Option 2: Via API/UI

**Fix Academic Year**:
1. Go to Settings → Academic Years
2. Find your current year (e.g., "2024-2025")
3. Make sure it's marked as "Current"
4. Click "Set as Current" if needed

**Fix Student Birthdays**:
1. This should happen automatically when students are created
2. If missing, you may need to re-save student profiles

**Fix Teaching Assignments**:
1. Go to Teachers page
2. Click on a teacher
3. Add teaching assignments (which subjects they teach to which classes)

---

## 🧪 Quick Test

Run this query to see what's blocking results:

```sql
-- This shows you which conditions are failing
SELECT 
  'Total students' as check_name,
  COUNT(*) as count
FROM student_profiles 
WHERE school_id = 'YOUR_SCHOOL_ID'

UNION ALL

SELECT 
  'With dob_md' as check_name,
  COUNT(*) as count
FROM student_profiles 
WHERE school_id = 'YOUR_SCHOOL_ID' AND dob_md IS NOT NULL

UNION ALL

SELECT 
  'Active students' as check_name,
  COUNT(*) as count
FROM student_profiles 
WHERE school_id = 'YOUR_SCHOOL_ID' AND status = 'active'

UNION ALL

SELECT 
  'With enrollments' as check_name,
  COUNT(DISTINCT sp.user_id) as count
FROM student_profiles sp
JOIN enrollments e ON sp.user_id = e.student_id
WHERE sp.school_id = 'YOUR_SCHOOL_ID'

UNION ALL

SELECT 
  'Current year enrollments' as check_name,
  COUNT(DISTINCT sp.user_id) as count
FROM student_profiles sp
JOIN enrollments e ON sp.user_id = e.student_id
JOIN academic_years ay ON e.academic_year_id = ay.id
WHERE sp.school_id = 'YOUR_SCHOOL_ID' AND ay.status = 'current'

UNION ALL

SELECT 
  'With teaching assignments' as check_name,
  COUNT(DISTINCT sp.user_id) as count
FROM student_profiles sp
JOIN enrollments e ON sp.user_id = e.student_id
JOIN academic_years ay ON e.academic_year_id = ay.id
WHERE sp.school_id = 'YOUR_SCHOOL_ID' 
  AND ay.status = 'current'
  AND e.classroom_id IN (
    SELECT DISTINCT classroom_id FROM teaching_assignments 
    WHERE school_id = 'YOUR_SCHOOL_ID'
  );
```

**Read the results**:
- If count drops at "With dob_md" → Fix Issue #2
- If count drops at "Current year enrollments" → Fix Issue #1
- If count drops at "With teaching assignments" → Fix Issue #3

---

## 🎨 Browser Console Test

Open the birthday page, open browser console (F12), and run:

```javascript
// Test the API call
fetch('https://sms-api.nmvpmsms.workers.dev/api/profiles/birthdays/upcoming', {
  headers: {
    'Authorization': 'Bearer ' + localStorage.getItem('accessToken')
  }
})
.then(r => r.json())
.then(data => {
  console.log('Birthday API Response:', data);
  if (data.data && data.data.length === 0) {
    console.log('⚠️ Empty result - likely one of these issues:');
    console.log('1. Academic year status is not "current"');
    console.log('2. Students missing dob_md field');
    console.log('3. Teacher has no teaching assignments');
  }
})
.catch(error => {
  console.error('API Error:', error);
});
```

---

## 📋 Checklist

Run through this checklist:

- [ ] Students exist in database
- [ ] Students have `date_of_birth` set
- [ ] Students have `dob_md` field set (MM-DD format)
- [ ] Student profiles have `status = 'active'`
- [ ] Students are enrolled in classrooms
- [ ] Enrollments have `status = 'active'`
- [ ] Academic year has `status = 'current'` (not just 'active')
- [ ] Teacher has teaching assignments
- [ ] Teaching assignments are in the current academic year
- [ ] API version is ca9cf293-77ad-4334-93fe-ccb632c5e16a

---

## 🔬 Advanced Debug

If still not working, add temporary logging to the API:

1. Edit `apps/api/src/profiles/profiles.service.ts`
2. Add logging in `getStudentBirthdays()`:

```typescript
export async function getStudentBirthdays(...) {
  // ... existing code ...
  
  if (tenant.role === 'teacher') {
    classroomIds = await profilesRepo.findTeacherClassrooms(db, tenant.userId, tenant.schoolId);
    
    // ADD THIS DEBUG LOG
    console.log('[DEBUG] Teacher classrooms:', {
      teacherId: tenant.userId,
      classroomIds,
      count: classroomIds.length
    });
    
    if (classroomIds.length === 0) {
      return [];
    }
  }
  
  // ... rest of code ...
  
  // ADD THIS DEBUG LOG
  console.log('[DEBUG] Birthday results:', {
    count: birthdays.length,
    birthdays: birthdays.map(b => b.first_name + ' ' + b.last_name)
  });
  
  return birthdays;
}
```

3. Redeploy: `cd apps/api && wrangler deploy`
4. Check Cloudflare logs:
```bash
wrangler tail --remote
```
5. Load the birthdays page
6. See what the logs show

---

## 🎯 Expected Data State

For birthdays to work, you need:

```
Academic Year:
  ✓ id: some-uuid
  ✓ label: "2024-2025"
  ✓ status: "current"  ← MUST BE "current"
  ✓ is_current: 1

Classrooms:
  ✓ id: classroom-uuid
  ✓ classroom_code: "5 A"
  ✓ academic_year_id: (matches year above)

Teaching Assignments:
  ✓ teacher_id: teacher-uuid
  ✓ classroom_id: classroom-uuid (from above)
  ✓ subject_id: some-subject-uuid
  ✓ academic_year_id: (matches year above)

Enrollments:
  ✓ student_id: student-uuid
  ✓ classroom_id: classroom-uuid (from above)
  ✓ academic_year_id: (matches year above)
  ✓ status: "active"

Student Profiles:
  ✓ user_id: student-uuid
  ✓ date_of_birth: "2010-09-25"  (YYYY-MM-DD)
  ✓ dob_md: "09-25"  (MM-DD)
  ✓ status: "active"
```

**All of these must be present and connected!**

---

## 💡 Quick Test Data

If you want to quickly test, run this to create a student with a birthday tomorrow:

```sql
-- Find a student
SELECT id FROM students LIMIT 1;

-- Set their birthday to tomorrow
UPDATE students 
SET date_of_birth = date('now', '+1 day', '-10 years')
WHERE id = 'STUDENT_ID_FROM_ABOVE';

-- Update the student profile
UPDATE student_profiles
SET 
  date_of_birth = date('now', '+1 day', '-10 years'),
  dob_md = strftime('%m-%d', date('now', '+1 day'))
WHERE user_id = 'STUDENT_ID_FROM_ABOVE';
```

Now that student should show up in the birthday list!

---

## 🆘 Still Not Working?

If you've tried everything above, please provide:

1. **Academic year status**:
```sql
SELECT id, label, status, is_current FROM academic_years;
```

2. **Student count with birthdays**:
```sql
SELECT COUNT(*) FROM student_profiles WHERE dob_md IS NOT NULL;
```

3. **Teaching assignments count**:
```sql
SELECT COUNT(*) FROM teaching_assignments;
```

4. **API response** (from browser console test above)

5. **Classroom enrollments**:
```sql
SELECT 
  c.classroom_code,
  COUNT(e.id) as student_count
FROM classrooms c
LEFT JOIN enrollments e ON c.id = e.classroom_id
GROUP BY c.id, c.classroom_code;
```

With this info, I can pinpoint the exact issue!
