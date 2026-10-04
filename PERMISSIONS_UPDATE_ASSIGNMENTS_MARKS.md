# 🔒 Permissions Update: Assignments & Marks Access Control

**Date**: January 19, 2026  
**Status**: ✅ DEPLOYED

---

## Changes Summary

Updated access control for Assignments and Assessments/Marks to reflect correct business rules.

---

## 1. Assignments Access

### Before:
- Principal: Full access (Create, View, Edit, Delete)
- Teachers: Full access
- Students: View-only

### After:
- **Principal**: ❌ NO ACCESS (removed entirely)
- **Teachers**: ✅ Full access (Create, View, Edit, Delete)
- **Students**: ✅ View-only (Read assignments, download attachments)

### Changes Made:
1. ✅ Removed "Assignments" from Principal sidebar navigation
2. ✅ Removed principal assignment routes (`/assignments`, `/assignments/new`, `/assignments/:id`, `/assignments/:id/edit`)
3. ✅ Added comment explaining removal
4. ✅ Kept teacher routes (`/teacher/assignments`)
5. ✅ Kept student routes (`/student/assignments`)

**Files Modified:**
- `apps/web/src/components/layout/Sidebar.tsx`
- `apps/web/src/App.tsx`

---

## 2. Marks & Assessments Access

### Before:
- Principal: Full access (Create, View, Edit assessments and marks)
- Teachers: Full access
- Students: View-only

### After:
- **Principal**: ✅ VIEW-ONLY (Can see assessments and marks, cannot create/edit)
- **Teachers**: ✅ Full access (Create, View, Edit, Update marks, Lock/Unlock, Publish)
- **Students**: ✅ View-only (See their own marks)

### Changes Made:

#### Marks.tsx Page:
1. ✅ Hide "New Assessment" button for principals
2. ✅ Updated description text: "View assessments and marks (Read-only)" for principals
3. ✅ Show "Create Assessment" button only for teachers in empty state

#### AssessmentDetail.tsx Page:
1. ✅ Hide all action buttons for principals:
   - Edit button
   - Save Marks button
   - Publish button
   - Lock/Unlock buttons
2. ✅ Show "View-only mode" badge for principals
3. ✅ Disable all mark entry controls:
   - Grade/Absent/Exempt status buttons
   - Marks input field
4. ✅ Keep all functionality for teachers

**Files Modified:**
- `apps/web/src/pages/Marks.tsx`
- `apps/web/src/pages/AssessmentDetail.tsx`

---

## User Experience

### Principal:
- Can navigate to "Marks & Assessments" from sidebar
- Can view list of all assessments
- Can click on assessment to view details
- Can see student marks (read-only)
- **Cannot** create new assessments
- **Cannot** edit marks or assessment details
- Sees "View-only mode" indicator

### Teacher:
- Full access to all assignment and assessment features
- Can create, edit, delete assignments
- Can create assessments
- Can enter and update marks
- Can lock/unlock and publish assessments

### Student:
- Can view assignments for their classroom
- Can download assignment attachments
- Can view their own marks
- No create/edit capabilities

---

## Deployment

**Frontend:**
- **Version**: https://741910f7.sms-web-34u.pages.dev
- **Status**: ✅ Live
- **Build**: Successful

**API:**
- No backend changes required (authorization already handled correctly)

---

## Testing Checklist

### Principal:
- [ ] No "Assignments" link in sidebar
- [ ] Can access "Marks & Assessments"
- [ ] No "New Assessment" button visible
- [ ] When viewing assessment: "View-only mode" badge shown
- [ ] Cannot edit marks or change assessment details

### Teacher:
- [ ] Can access "Assignments" from sidebar
- [ ] Can create/edit assignments
- [ ] Can access "Marks" from sidebar
- [ ] Can create new assessments
- [ ] Can enter and update marks
- [ ] Can lock/unlock and publish assessments

### Student:
- [ ] Can access "Assignments" from sidebar
- [ ] Can view assignments (read-only)
- [ ] Can access "My Marks" from sidebar
- [ ] Can view their marks (read-only)

---

## Related Issues
- Closes: User request for correct permissions
- Part of: Bug fixing and E2E testing phase
