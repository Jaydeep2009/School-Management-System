# School Management System - Comprehensive Bug Audit Requirements

## Introduction

This document identifies and specifies fixes for multiple logic and behavioral issues in the School Management System (SMS). The system is a multi-tenant application with a React/TypeScript frontend and Cloudflare Workers backend using D1 database. Academic year context management is critical to the system's correctness, as data must be properly scoped by academic year.

The bugs identified fall into several categories:
1. **Academic Year Filtering Issues** - Pages not respecting selected academic year
2. **Data Grouping/Display Issues** - Incorrect presentation of aggregated data
3. **Infrastructure Configuration** - Disabled features causing failures
4. **Missing Re-fetch Logic** - Stale data when context changes
5. **Missing Academic Year Context** - Pages that should filter by year but don't

This specification follows the bug condition methodology to ensure systematic validation of fixes.

---

## Bug Analysis

### Current Behavior (Defect)

#### 1. Fees Page Missing Academic Year Filter

**1.1** WHEN the user navigates to the Fees page (apps/web/src/pages/Fees.tsx) THEN the system displays fee charges from ALL academic years regardless of the selected year in the header dropdown

**1.2** WHEN the user switches the academic year using the header dropdown on the Fees page THEN the system does NOT refresh the fee charges list to show only charges for the selected year

**1.3** WHEN the backend API endpoint `/fees/charges` is called from the Fees page THEN the request does NOT include the `academic_year_id` query parameter even though the backend supports it

**1.4** WHEN selectedYear is null or undefined on the Fees page THEN the system still makes API calls without proper null handling

#### 2. Fees List Shows Duplicate Students

**2.1** WHEN a student has multiple fee charges (e.g., "Tuition Fee", "Lab Fee", "Library Fee") THEN the system creates a separate table row for each charge

**2.2** WHEN viewing the fees list THEN the same student name appears multiple times in the table, once for each individual fee charge

**2.3** WHEN trying to track total fees per student THEN the user must manually calculate across multiple rows, making it difficult to see the complete picture

**2.4** WHEN clicking "Record Payment" for one charge THEN the payment is only applied to that specific charge, not providing a way to pay multiple charges at once

#### 3. R2 Storage Disabled

**3.1** WHEN a teacher tries to upload an assignment attachment THEN the upload fails because R2 storage binding is commented out in wrangler.jsonc

**3.2** WHEN a user tries to upload a timetable image THEN the upload fails with an error about missing storage binding

**3.3** WHEN viewing the wrangler.jsonc configuration file THEN the r2_buckets section (lines 24-30) is commented out with a note "Temporarily disabled until R2 is enabled in Cloudflare dashboard"

**3.4** WHEN any file upload feature is used THEN it completely fails because the STORAGE binding is unavailable

#### 4. Attendance Edit Window Already Enforced (NOT A BUG)

**INVESTIGATION RESULT:** The 48-hour attendance edit window IS properly enforced at the backend level:
- Backend properly implements `isOutsideEditWindow()` check in `attendance.authorization.ts`
- The `ensureCanModifyAttendance()` function is called before allowing edits
- Teachers are correctly blocked from editing attendance sessions older than 48 hours
- Principals can override with proper audit logging

**STATUS:** This is NOT a bug - the system is working correctly.

#### 5. Academic Year Switching Doesn't Refresh Data on Multiple Pages

**5.1** WHEN the user switches academic year using the header dropdown THEN the Fees page (Fees.tsx) does NOT reload its data because it doesn't include `selectedYear?.id` in the useEffect dependency array

**5.2** WHEN the user switches academic year THEN the Timetable page (Timetable.tsx) does NOT reload timetables because it has no academic year filter at all

**5.3** WHEN the user switches academic year THEN the Teachers page (Teachers.tsx) does NOT filter or refresh data because it doesn't use the academic year context

**5.4** WHEN the user switches academic year THEN the Promotions page (Promotions.tsx) does NOT filter promotion batches by year because it has no year context integration

**5.5** WHEN selectedYear changes from a valid year to null or vice versa THEN pages may crash or show incorrect data due to missing null checks

#### 6. Timetable Page Missing Academic Year Filter

**6.1** WHEN viewing the Timetables list page (Timetable.tsx) THEN the system displays timetables from ALL academic years mixed together

**6.2** WHEN the backend API endpoint `/timetables` supports `academic_year_id` filtering (confirmed in timetable.routes.ts line 67) THEN the frontend does NOT use this filter parameter

**6.3** WHEN a school has 5 years of historical timetables THEN the principal sees all 50+ timetables in one long list without year filtering

#### 7. Teachers Page Missing Academic Year Context

**7.1** WHEN viewing the Teachers list page (Teachers.tsx) THEN the page does NOT use the `useAcademicYear` hook at all

**7.2** WHEN a teacher is assigned to classes in multiple academic years THEN there's no way to filter or view teaching assignments by year

**7.3** WHEN navigating to the Teachers page THEN the academic year dropdown in the header becomes non-functional for this page's context

#### 8. Promotions Page Missing Academic Year Filter

**8.1** WHEN viewing the Promotions list page (Promotions.tsx) THEN the system displays ALL promotion batches across all years

**8.2** WHEN a promotion batch has `from_academic_year_id` and `to_academic_year_id` THEN there's no filtering based on the selected academic year in context

**8.3** WHEN trying to find recent promotions THEN the user must scroll through years of historical promotion batches

#### 9. Assignment Form Academic Year Logic Inconsistency

**9.1** WHEN creating a new assignment in AssignmentForm.tsx THEN the academic year is derived from the selected classroom's `academic_year_id` property

**9.2** WHEN the classroom data is loaded THEN there's no guarantee that `classroom.academic_year_id` exists or matches the selected academic year context

**9.3** WHEN submitting the form THEN the code falls back to `selectedAcademicYear` if `classroom.academic_year_id` is missing, creating potential data inconsistency

**9.4** WHEN a classroom exists in multiple academic years THEN the assignment might be associated with the wrong year

#### 10. Students Page Partial Academic Year Integration

**10.1** WHEN the Students page loads data THEN it correctly adds `academic_year_id` filter (line 68 in Students.tsx)

**10.2** WHEN loading classrooms for the import feature THEN the system filters classrooms by `selectedYear?.id` (line 69)

**10.3** WHEN the selected academic year changes THEN the useEffect dependency array includes `selectedYear?.id` (line 51), so it DOES refresh correctly

**STATUS:** Students page is CORRECTLY implemented - included here as a positive example

#### 11. Marks and Attendance Pages Implemented Correctly

**STATUS:** Both Marks.tsx and Attendance.tsx correctly:
- Use `useAcademicYear` hook
- Include `selectedYear?.id` in useEffect dependency array
- Pass `academic_year_id` to API calls
- Handle null selectedYear gracefully

These are CORRECTLY implemented.

#### 12. Assignments Page Partial Implementation

**12.1** WHEN the Assignments page loads THEN it uses `useAcademicYear` hook correctly

**12.2** WHEN the Assignments page filters API requests THEN it uses a ternary operator: `selectedYear?.id ? { academic_year_id: selectedYear.id } : {}` (line 28)

**12.3** WHEN selectedYear is null THEN the page still makes API calls without academic year filter, potentially loading assignments from ALL years

**12.4** WHEN selectedYear?.id changes THEN the useEffect DOES re-trigger, which is correct

**STATUS:** Partially correct - should enforce academic year requirement or show empty state when no year selected

#### 13. AcademicStructure Page Mixed Behavior

**13.1** WHEN viewing the "Classrooms" tab in AcademicStructure.tsx THEN the system correctly filters by `selectedYear?.id` if present (line 78)

**13.2** WHEN viewing the "Teaching Assignments" tab THEN the system does NOT filter by academic year, showing assignments from all years

**13.3** WHEN viewing the "Enrollments" tab THEN the system does NOT filter by academic year

**13.4** WHEN `selectedYear` changes THEN the useEffect re-triggers (line 29), which is correct

**STATUS:** Partial implementation - some tabs filter, others don't

---

### Expected Behavior (Correct)

#### 2. Fees Page Academic Year Filter (Bug #1)

**2.1** WHEN the user navigates to the Fees page THEN the system SHALL display ONLY fee charges for the currently selected academic year from the header dropdown

**2.2** WHEN the user switches the academic year using the header dropdown THEN the system SHALL immediately re-fetch and display fee charges for the newly selected year

**2.3** WHEN calling the `/fees/charges` API endpoint THEN the request SHALL include `academic_year_id` query parameter with the value of `selectedYear.id`

**2.4** WHEN selectedYear is null or undefined THEN the system SHALL display an empty state message prompting the user to select an academic year, rather than attempting API calls

**2.5** WHEN the Fees page component mounts or selectedYear changes THEN the useEffect hook SHALL re-execute to load fresh data

#### 3. Fees List Student Grouping (Bug #2)

**3.1** WHEN displaying fee charges THEN the system SHALL group multiple charges by student, showing one row per student

**3.2** WHEN a student has multiple charges THEN the table row SHALL display the student once with expandable details showing all individual charges

**3.3** WHEN viewing the fees list THEN each student row SHALL show:
  - Student name and code
  - Total charged amount (sum of all charges)
  - Total paid amount (sum of all payments)
  - Outstanding balance (total charged - total paid)
  - Overall payment status (pending/partially_paid/paid)

**3.4** WHEN clicking "Record Payment" for a grouped student row THEN the system SHALL allow recording payment that can be allocated across multiple charges

**3.5** WHEN expanding a student row THEN the system SHALL show individual charge details with per-charge amounts and status

#### 4. R2 Storage Configuration (Bug #3)

**4.1** WHEN wrangler.jsonc is configured THEN the r2_buckets section SHALL be uncommented and properly configured

**4.2** WHEN the backend code references `c.env.STORAGE` THEN the binding SHALL exist and be functional

**4.3** WHEN a teacher uploads an assignment attachment THEN the file SHALL be successfully stored in R2

**4.4** WHEN a user uploads a timetable image THEN the file SHALL be successfully stored in R2

**4.5** WHEN file uploads are attempted THEN the system SHALL return success responses with proper file URLs

#### 5. Academic Year Switching Data Refresh (Bug #5)

**5.1** WHEN the Fees page component's useEffect dependency array includes `selectedYear?.id` THEN changing the academic year SHALL trigger data reload

**5.2** WHEN the Timetable page is loaded THEN it SHALL use `useAcademicYear` hook and filter timetables by `selectedYear.id`

**5.3** WHEN the Teachers page displays teaching assignments THEN it SHALL filter assignments by the selected academic year context

**5.4** WHEN the Promotions page is loaded THEN it SHALL filter promotion batches to show only those relevant to the selected academic year (from_year or to_year matches)

**5.5** WHEN selectedYear is null on any year-dependent page THEN the page SHALL either show an empty state message or default to the active/current year

#### 6. Timetable Academic Year Filter (Bug #6)

**6.1** WHEN loading timetables on the Timetable list page THEN the API request SHALL include `academic_year_id` query parameter

**6.2** WHEN the Timetable page component mounts THEN it SHALL use the `useAcademicYear` hook to access `selectedYear`

**6.3** WHEN selectedYear changes THEN the useEffect SHALL re-trigger to reload filtered timetables

**6.4** WHEN selectedYear is null THEN the system SHALL show a message prompting the user to select an academic year

#### 7. Teachers Page Academic Year Context (Bug #7)

**7.1** WHEN viewing the Teachers list page THEN the page SHALL import and use the `useAcademicYear` hook

**7.2** WHEN viewing a teacher's detail page THEN teaching assignments SHALL be filterable by academic year

**7.3** WHEN the selected academic year changes THEN any year-dependent teacher data SHALL refresh

**7.4** WHEN displaying teacher information THEN the UI SHALL indicate which academic year's data is being shown

#### 8. Promotions Academic Year Filter (Bug #8)

**8.1** WHEN loading promotion batches THEN the API request SHALL filter batches where `from_academic_year_id` OR `to_academic_year_id` matches the selected academic year

**8.2** WHEN the Promotions page component mounts THEN it SHALL use the `useAcademicYear` hook

**8.3** WHEN selectedYear changes THEN the useEffect SHALL re-trigger to reload filtered promotion batches

**8.4** WHEN selectedYear is null THEN the system SHALL default to showing active/current year promotions or display a year selection prompt

#### 9. Assignment Form Academic Year Consistency (Bug #9)

**9.1** WHEN creating an assignment THEN the academic_year_id SHALL be explicitly taken from `selectedYear.id` from the academic year context

**9.2** WHEN filtering classrooms in the form THEN ONLY classrooms belonging to the selected academic year SHALL be displayed in the dropdown

**9.3** WHEN no academic year is selected THEN the form SHALL display a warning message and disable the submit button

**9.4** WHEN submitting the assignment form THEN the backend SHALL validate that the classroom, subject, and academic year are consistent

#### 10. Assignments Page Academic Year Requirement (Bug #12)

**10.1** WHEN selectedYear is null or undefined THEN the Assignments page SHALL display an empty state message asking the user to select an academic year

**10.2** WHEN making API calls THEN the system SHALL NOT proceed if selectedYear is null

**10.3** WHEN selectedYear has a valid value THEN the API call SHALL include the `academic_year_id` parameter

#### 11. AcademicStructure Teaching and Enrollments Filtering (Bug #13)

**11.1** WHEN viewing the "Teaching Assignments" tab THEN the API call SHALL include `academic_year_id` filter parameter

**11.2** WHEN viewing the "Enrollments" tab THEN the API call SHALL include `academic_year_id` filter parameter

**11.3** WHEN selectedYear is null on these tabs THEN the system SHALL show an appropriate message

---

### Unchanged Behavior (Regression Prevention)

#### 3. Working Academic Year Implementations Must Remain Functional

**3.1** WHEN viewing the Students page THEN the system SHALL CONTINUE TO correctly filter students by academic year and refresh when the year changes

**3.2** WHEN viewing the Marks page THEN the system SHALL CONTINUE TO correctly filter assessments by academic year with proper useEffect dependency

**3.3** WHEN viewing the Attendance page THEN the system SHALL CONTINUE TO correctly filter attendance sessions by academic year

**3.4** WHEN the AcademicStructure page loads the "Classrooms" tab THEN it SHALL CONTINUE TO filter classrooms by selected academic year

#### 4. Attendance Edit Window Enforcement Must Remain Active

**4.1** WHEN a teacher attempts to edit attendance older than 48 hours THEN the backend SHALL CONTINUE TO reject the request with "Teacher edit window has expired" error

**4.2** WHEN a principal edits old attendance sessions THEN the system SHALL CONTINUE TO allow it and log it as a principal override

**4.3** WHEN calling `ensureCanModifyAttendance()` THEN the authorization checks SHALL CONTINUE TO function correctly

#### 5. Non-Year-Dependent Pages Must Remain Unaffected

**5.1** WHEN viewing the Birthdays page THEN it SHALL CONTINUE TO function without academic year filtering (birthdays are not year-specific)

**5.2** WHEN viewing the Super Admin pages (SchoolsList, CreateSchool, etc.) THEN they SHALL CONTINUE TO work without academic year context

**5.3** WHEN viewing student/teacher login flows (Activate, Login) THEN they SHALL CONTINUE TO work without academic year dependencies

#### 6. Existing API Response Structures Must Not Change

**6.1** WHEN backend API endpoints add academic_year_id filtering THEN the response data structure SHALL CONTINUE TO match existing frontend expectations

**6.2** WHEN frontend adds academic_year_id to API requests THEN it SHALL NOT break backward compatibility for endpoints that handle missing parameters gracefully

#### 7. Academic Year Context Provider Must Continue Working

**7.1** WHEN the app loads THEN AcademicYearContext SHALL CONTINUE TO auto-load years and select the active/current year by default

**7.2** WHEN academic year is changed in the header dropdown THEN all subscribed pages SHALL CONTINUE TO receive the updated selectedYear value

**7.3** WHEN academic years are refreshed THEN the context SHALL CONTINUE TO persist selection in localStorage

#### 8. Form Validation and Data Integrity Must Be Preserved

**8.1** WHEN creating records with academic year references THEN existing validation rules SHALL CONTINUE TO apply

**8.2** WHEN attempting to create cross-year invalid relationships (e.g., enrollment in classroom from wrong year) THEN validation errors SHALL CONTINUE TO be raised

---

## Bug Condition Analysis

### Bug #1: Fees Page Academic Year Filter

**Bug Condition Function:**
```pascal
FUNCTION isBugCondition_FeesNoFilter(request: PageRequest)
  INPUT: request contains page="Fees" and selectedYear
  OUTPUT: boolean
  
  RETURN request.page = "Fees" 
    AND (request.apiParams.academic_year_id IS NULL
         OR request.effectDeps does NOT include selectedYear.id)
END FUNCTION
```

**Property: Fix Checking**
```pascal
FOR ALL request WHERE isBugCondition_FeesNoFilter(request) DO
  result ← renderFeesPage'(request)
  ASSERT result.apiParams includes academic_year_id = selectedYear.id
  ASSERT result.effectDeps includes selectedYear?.id
  ASSERT result.displayedCharges all have matching academic_year_id
END FOR
```

### Bug #2: Fees List Grouping

**Bug Condition Function:**
```pascal
FUNCTION isBugCondition_FeesDuplicate(charges: FeeCharge[])
  INPUT: charges array for display
  OUTPUT: boolean
  
  studentIds ← unique student_ids in charges
  rowCount ← count of table rows
  
  RETURN rowCount > studentIds.length
END FUNCTION
```

**Property: Fix Checking**
```pascal
FOR ALL charges WHERE isBugCondition_FeesDuplicate(charges) DO
  result ← renderFeesTable'(charges)
  studentIds ← unique student_ids in charges
  ASSERT result.rowCount = studentIds.length
  ASSERT each row shows total for all charges for that student
END FOR
```

### Bug #3: R2 Storage Disabled

**Bug Condition Function:**
```pascal
FUNCTION isBugCondition_R2Disabled(config: WranglerConfig)
  INPUT: wrangler.jsonc configuration
  OUTPUT: boolean
  
  RETURN config.r2_buckets IS commented out
    OR config.r2_buckets IS undefined
END FUNCTION
```

**Property: Fix Checking**
```pascal
FOR ALL config WHERE isBugCondition_R2Disabled(config) DO
  fixedConfig ← enableR2Storage'(config)
  ASSERT fixedConfig.r2_buckets IS defined
  ASSERT fixedConfig.r2_buckets.length > 0
  ASSERT fileUpload(testFile) returns success
END FOR
```

### Bug #5: Academic Year Switching No Refresh

**Bug Condition Function:**
```pascal
FUNCTION isBugCondition_NoRefreshOnYearChange(page: Component)
  INPUT: page component using academic year context
  OUTPUT: boolean
  
  RETURN page.usesAcademicYearData = true
    AND (NOT page.effectDeps.includes(selectedYear?.id)
         OR NOT page.hasAcademicYearFilter)
END FUNCTION
```

**Property: Fix Checking**
```pascal
FOR ALL page WHERE isBugCondition_NoRefreshOnYearChange(page) DO
  // User switches year
  oldYear ← selectedYear
  newYear ← differentYear
  
  result ← page.render'(newYear)
  
  ASSERT result.effectTriggered = true
  ASSERT result.apiRequestIncludesYearId = true
  ASSERT result.displayedData filtered by newYear
END FOR
```

---

## Summary of Bugs

| # | Bug Title | Severity | Affected Files | Fix Complexity |
|---|-----------|----------|----------------|----------------|
| 1 | Fees Page Missing Academic Year Filter | HIGH | Fees.tsx | Low |
| 2 | Fees List Shows Duplicate Students | MEDIUM | Fees.tsx | Medium |
| 3 | R2 Storage Disabled Breaking File Uploads | CRITICAL | wrangler.jsonc | Low (config only) |
| 5 | Multiple Pages Don't Refresh on Year Switch | HIGH | Fees.tsx, Timetable.tsx, Promotions.tsx | Low |
| 6 | Timetable Missing Academic Year Filter | HIGH | Timetable.tsx | Low |
| 7 | Teachers Page Missing Year Context | MEDIUM | Teachers.tsx | Medium |
| 8 | Promotions Missing Year Filter | MEDIUM | Promotions.tsx | Low |
| 9 | Assignment Form Year Logic Inconsistent | MEDIUM | AssignmentForm.tsx | Low |
| 12 | Assignments Page Allows Null Year | LOW | Assignments.tsx | Low |
| 13 | AcademicStructure Partial Filtering | MEDIUM | AcademicStructure.tsx | Low |

**Total Bugs Identified: 10**
**Bugs Confirmed Working Correctly: 3** (Attendance edit window, Students page, Marks/Attendance pages)

---

## Preservation Goal

The fix must ensure that all buggy behaviors are corrected without breaking the currently working implementations:

```pascal
// Property: Preservation Checking
FOR ALL X WHERE NOT isBugCondition(X) DO
  ASSERT F(X) = F'(X)
END FOR
```

Where F = original implementation and F' = fixed implementation.

All pages that currently work correctly with academic year filtering (Students, Marks, Attendance, AcademicStructure Classrooms tab) must continue to function identically after fixes are applied.
