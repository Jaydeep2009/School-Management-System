# Test Student Password Formula

## Problem
Student activation showing "Invalid credentials" even with correct formula.

## Possible Causes

### 1. Old Students (Created Before Deploy)
Students created/imported BEFORE the latest deployment still have **random passwords** in the database, not the formula-based ones.

**Solution**: Delete and re-import the students, OR reset their passwords.

### 2. Wrong Formula
Make sure you're using the exact formula:
```
{ADMISSION_NUMBER}@{SCHOOL_CODE}
```

**Example**:
- Admission Number: `ADM001`
- School Code: `GPS`
- Password: `ADM001@GPS` (case-sensitive!)

### 3. Case Sensitivity
The school code and admission number must match EXACTLY how they're stored in the database.

## How to Fix

### Option 1: Reset Student Password (Recommended)

1. Login as Principal
2. Go to Students list
3. Find the student
4. Click "Reset Password" 
5. The system will generate a new password using the formula
6. Student can now login with: `{ADMISSION_NUMBER}@{SCHOOL_CODE}`

### Option 2: Re-import Students

1. Login as Principal
2. Delete existing students (if they were imported before)
3. Import Excel again
4. New students will have formula-based passwords

### Option 3: Create New Student Manually

1. Login as Principal
2. Click "Add Student"
3. Fill in student details including admission number
4. Student will be created with formula password
5. Student can login with: `{ADMISSION_NUMBER}@{SCHOOL_CODE}`

## Verification Steps

To verify the formula is working:

1. **Create a NEW student** (after the deployment)
   - Admission Number: `TEST001`
   - School Code: (check your school's code)
   
2. **Try to activate with**:
   - Login ID: (the one shown in student list, e.g., `GPS-S-000099`)
   - Temporary Password: `TEST001@{YOUR_SCHOOL_CODE}`
   
3. **If this works**, then old students need password reset

4. **If this doesn't work**, there might be an issue with:
   - School code format
   - Case sensitivity
   - Database not updated

## Check Your School Code

To find your school code:
1. Login as Super Admin
2. Go to Schools list
3. Check the "Code" column for your school
4. Use EXACTLY this code in the formula (case-sensitive)

## Example

If your school details are:
- School Name: "Green Park School"
- School Code: `GPS`

And student details are:
- Admission Number: `2024001`
- Login ID: `GPS-S-000001`

Then:
- **First Login Password**: `2024001@GPS`
- **NOT**: `2024001@gps` or `2024001@Gps` (wrong case)
- **NOT**: `ADM2024001@GPS` (don't add "ADM" if not in admission number)

## Still Not Working?

If you've:
1. ✅ Created a NEW student after deployment
2. ✅ Used exact school code (case-sensitive)
3. ✅ Used exact admission number
4. ✅ Still getting "Invalid credentials"

Then there might be a bug. Please provide:
- Student Login ID
- Student Admission Number  
- School Code
- Exact password you're trying
- Screenshot of error

And I'll investigate further.
