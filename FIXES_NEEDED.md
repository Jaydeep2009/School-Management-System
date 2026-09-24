# Pending Fixes - Teacher/Student Details

## Issue 1: Copy Credentials When Creating Teacher

**Problem**: When principal creates a teacher, credentials shown in alert() - hard to copy

**Fix Needed**: Create a modal with copy buttons

**Location**: `apps/web/src/pages/TeacherForm.tsx` line ~110

**Current Code**:
```typescript
alert(
  `Teacher created successfully!\n\n` +
  `Login ID: ${credentials.login_id}\n` +
  `Temporary Password: ${credentials.temporary_password}\n\n` +
  `Please save these credentials and share with the teacher.`
);
```

**Replace With**: Modal component with:
- Login ID with copy button
- Temporary Password with copy button
- Option to download/print
- Close button

## Issue 2: Missing Teacher Details

**Problem**: Principal can't see teacher's DOB and other details in teacher detail view

**Location**: `apps/web/src/pages/TeacherDetail.tsx`

**Fields Missing**:
- Date of Birth
- Joining Date  
- Phone
- Other contact details

**Fix**: Add these fields to the detail view

## Issue 3: Missing Student Details

**Problem**: Principal can't see student's parent info, DOB, etc in student detail view

**Location**: `apps/web/src/pages/StudentDetail.tsx` (if exists) or Students.tsx detail modal

**Fields Missing**:
- Date of Birth
- Parent Name
- Parent Phone
- Parent Email
- Address
- Gender
- Phone
- Email

**Fix**: Add comprehensive detail view showing all fields

## Implementation Priority

1. ✅ Fix teacher credentials modal with copy buttons (HIGH)
2. ✅ Add missing teacher details (HIGH)
3. ✅ Add missing student details (HIGH)

All fixes needed in frontend only - API already returns complete data.
