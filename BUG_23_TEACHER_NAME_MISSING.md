# 🐛 Bug #23: Teacher Name Not Displayed in Details

**Date**: January 19, 2026  
**Severity**: P2 - High (UI displays blank name field)  
**Status**: ✅ FIXED

---

## Issue
When principal clicks on a teacher name to view details, the "Full Name" field shows empty even though other details (employee code, date of birth, etc.) are displayed correctly.

---

## Root Cause
The `findByIdWithUser()` function in `teacher.repository.ts` was missing the computed `full_name` column in its SQL query. Other functions like `findById()` and `findByUserId()` had this computed column, but `findByIdWithUser()` was only selecting individual name components (`first_name`, `middle_name`, `last_name`) without concatenating them.

---

## Fix

### File: `apps/api/src/accounts/teacher.repository.ts`

**Added computed column to SQL query**:
```sql
(tp.first_name || COALESCE(' ' || tp.middle_name, '') || ' ' || tp.last_name) as full_name
```

**Added to return object**:
```typescript
profile: {
  // ... other fields
  full_name: result.full_name,  // ← Added this line
  // ... other fields
}
```

---

## Testing
1. ✅ Login as Principal
2. ✅ Navigate to Teachers section
3. ✅ Click on a teacher name
4. ✅ Verify "Full Name" field displays correctly

---

## Deployment
- **Version**: 9a895f76-6c0a-43d9-916f-ef9254be2fb4
- **Status**: ✅ Live

---

## Related Bugs
- **Bug #22**: Fixed SQL column name (`starts_on` vs `start_date`)
- **Bug #20**: Fixed teacher profile SQL error
