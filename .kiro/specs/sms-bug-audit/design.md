# School Management System - Comprehensive Bug Fix Design

## Overview

This design document provides a systematic technical approach to fixing 10 identified bugs in the School Management System. The bugs primarily fall into patterns of:
1. **Missing Academic Year Context Integration** - Pages that don't filter by selected year
2. **Missing Data Refresh on Year Change** - Pages that don't update when year switches
3. **Data Presentation Issues** - Fees showing duplicate students instead of grouped view
4. **Infrastructure Configuration** - R2 storage disabled blocking file uploads

The design follows consistent patterns to ensure all pages properly integrate with academic year context, refresh data when context changes, and present information correctly. All fixes preserve existing working functionality on pages like Students, Marks, and Attendance which already implement these patterns correctly.

## Glossary

- **Bug_Condition (C)**: The condition that triggers each bug - either missing academic year filtering, missing refresh logic, incorrect data grouping, or disabled infrastructure
- **Property (P)**: The desired behavior after fixes - proper filtering, automatic refresh, correct presentation, and enabled features
- **Preservation**: Existing correctly-implemented pages (Students, Marks, Attendance) that must remain unchanged
- **useAcademicYear Hook**: React context hook providing `selectedYear`, `allYears`, `setSelectedYear` from AcademicYearContext
- **selectedYear**: The currently selected academic year object with `id`, `label`, `start_date`, `end_date`, `status` properties
- **useEffect Dependencies**: Array that triggers effect re-execution when values change - must include `selectedYear?.id` for year-dependent pages
- **apiService**: Frontend service layer for making API calls to backend, located in `apps/web/src/services/api.ts`
- **Fee Charge Grouping**: Aggregating multiple fee charges per student to show one row with expandable details

## Technical Architecture

### Academic Year Integration Pattern

All year-dependent pages follow this standard pattern:

```typescript
import { useAcademicYear } from '../contexts/AcademicYearContext';

export function PageComponent() {
  const { selectedYear } = useAcademicYear();
  const [data, setData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [selectedYear?.id]); // CRITICAL: Include selectedYear?.id in dependency array

  const loadData = async () => {
    if (!selectedYear) {
      setData([]);
      return;
    }
    
    try {
      setIsLoading(true);
      const response = await apiService.getData({
        academic_year_id: selectedYear.id // Pass year filter to API
      });
      setData(response.data);
    } finally {
      setIsLoading(false);
    }
  };

  // Render empty state if no year selected
  if (!selectedYear) {
    return <EmptyState message="Please select an academic year" />;
  }

  return <DataView data={data} />;
}
```

### Key Integration Points

1. **Import the hook**: `import { useAcademicYear } from '../contexts/AcademicYearContext';`
2. **Destructure selectedYear**: `const { selectedYear } = useAcademicYear();`
3. **Add to useEffect dependencies**: `[selectedYear?.id]`
4. **Pass to API calls**: `{ academic_year_id: selectedYear.id }`
5. **Handle null state**: Show empty state when `!selectedYear`

---

## Bug Fixes

### Bug #1: Fees Page Missing Academic Year Filter

**Files to Modify:**
- `apps/web/src/pages/Fees.tsx`

**Current Behavior:**
- No import of `useAcademicYear` hook
- `useEffect` has empty dependency array `[]`
- API call `apiService.getFeeCharges()` has no parameters
- Displays fee charges from ALL academic years

**Technical Approach:**

1. **Add Academic Year Context Integration**
   - Import and use the `useAcademicYear` hook
   - Access `selectedYear` from context

2. **Update useEffect Dependencies**
   - Add `selectedYear?.id` to dependency array
   - Triggers reload when year changes

3. **Modify API Call**
   - Pass `academic_year_id` parameter to `getFeeCharges()`
   - Backend already supports this parameter

4. **Add Null Handling**
   - Check if `selectedYear` is null before API call
   - Show appropriate empty state message

**Code Changes:**

```typescript
// At the top of the file, add import
import { useAcademicYear } from '../contexts/AcademicYearContext';

export function Fees() {
  const { user, logout } = useAuth();
  const { selectedYear } = useAcademicYear(); // ADD THIS LINE
  const navigate = useNavigate();

  // ... existing state declarations ...

  // CHANGE THIS: Add selectedYear?.id to dependency array
  useEffect(() => {
    loadFeeCharges();
  }, [selectedYear?.id]); // CHANGED FROM: []

  // MODIFY THIS FUNCTION: Add year filter and null check
  const loadFeeCharges = async () => {
    // Add null check
    if (!selectedYear) {
      setFeeCharges([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      
      // CHANGED: Pass academic_year_id parameter
      const response = await apiService.getFeeCharges({
        academic_year_id: selectedYear.id
      });
      
      setFeeCharges(response.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load fee charges');
    } finally {
      setIsLoading(false);
    }
  };

  // ... rest of the component ...

  // ADD: Early return for no year selected
  if (!selectedYear) {
    return (
      <Layout schoolName={'SMS'} principalName={"User"} onLogout={logout}>
        <div style={{ padding: '32px', textAlign: 'center', color: '#64748b' }}>
          <p>Please select an academic year to view fee charges</p>
        </div>
      </Layout>
    );
  }

  // ... rest of the render logic ...
}
```

**API Service Update** (if needed):

Check `apps/web/src/services/api.ts` and ensure `getFeeCharges` accepts parameters:

```typescript
getFeeCharges: (params?: { academic_year_id?: string }) =>
  apiClient.get('/fees/charges', { params }).then((res) => res.data),
```

**Testing Strategy:**
- Load Fees page with year selected - verify only that year's charges appear
- Switch academic year - verify charges list refreshes automatically
- Set selectedYear to null - verify empty state appears
- Compare charge IDs with database to ensure filtering works

**Side Effects & Mitigation:**
- None - backend already supports this filter parameter
- Page will show fewer charges (correctly filtered)
- Users expecting to see all years will need to switch years to view others

---

### Bug #2: Fees List Shows Duplicate Students

**Files to Modify:**
- `apps/web/src/pages/Fees.tsx` (presentation logic)

**Current Behavior:**
- Each fee charge renders as a separate table row
- Student with 3 charges appears 3 times
- No way to see total fees per student at a glance
- Payment recording is per-charge, not per-student

**Technical Approach:**

1. **Group Charges by Student**
   - After fetching charges, transform data to group by `student_id`
   - Calculate aggregate totals per student

2. **Create Aggregated Data Structure**
   ```typescript
   interface GroupedFeeCharge {
     student_id: string;
     student_name: string;
     student_code: string;
     charges: FeeCharge[]; // Individual charges
     totalCharged: number; // Sum of all charge amounts
     totalPaid: number; // Sum of all payments
     balance: number; // totalCharged - totalPaid
     status: 'pending' | 'partially_paid' | 'paid';
   }
   ```

3. **Update Table Rendering**
   - Display one row per student
   - Show aggregate amounts
   - Add expandable row to show individual charges

4. **Update Payment Recording**
   - Allow payment to be allocated to student (not just single charge)
   - Backend already handles student-level payments

**Code Changes:**

```typescript
export function Fees() {
  // ... existing imports and setup ...

  const [feeCharges, setFeeCharges] = useState<any[]>([]);
  const [groupedCharges, setGroupedCharges] = useState<any[]>([]); // ADD THIS
  const [expandedStudents, setExpandedStudents] = useState<Set<string>>(new Set()); // ADD THIS

  const loadFeeCharges = async () => {
    // ... existing load logic ...
    const response = await apiService.getFeeCharges({
      academic_year_id: selectedYear.id
    });
    
    setFeeCharges(response.data);
    
    // ADD THIS: Group charges by student
    const grouped = groupChargesByStudent(response.data);
    setGroupedCharges(grouped);
    
    // ... rest of load logic ...
  };

  // ADD THIS FUNCTION: Group charges by student
  const groupChargesByStudent = (charges: any[]) => {
    const studentMap = new Map<string, any>();

    charges.forEach((charge) => {
      const studentId = charge.student_id;
      
      if (!studentMap.has(studentId)) {
        studentMap.set(studentId, {
          student_id: studentId,
          student_name: charge.student_name,
          student_code: charge.student_code,
          charges: [],
          totalCharged: 0,
          totalPaid: 0,
          balance: 0,
          status: 'pending',
        });
      }

      const student = studentMap.get(studentId)!;
      student.charges.push(charge);
      student.totalCharged += charge.amount;
      student.totalPaid += charge.total_paid || 0;
    });

    // Calculate balance and status for each student
    return Array.from(studentMap.values()).map((student) => {
      student.balance = student.totalCharged - student.totalPaid;
      
      if (student.totalPaid === 0) {
        student.status = 'pending';
      } else if (student.balance > 0) {
        student.status = 'partially_paid';
      } else {
        student.status = 'paid';
      }
      
      return student;
    });
  };

  // ADD THIS FUNCTION: Toggle row expansion
  const toggleStudentExpansion = (studentId: string) => {
    const newExpanded = new Set(expandedStudents);
    if (newExpanded.has(studentId)) {
      newExpanded.delete(studentId);
    } else {
      newExpanded.add(studentId);
    }
    setExpandedStudents(newExpanded);
  };

  // MODIFY handleRecordPayment to work with student
  const handleRecordPayment = async (studentId: string) => {
    if (!paymentAmount || paymentAmount <= 0) {
      alert('Please enter a valid payment amount');
      return;
    }

    const student = groupedCharges.find(s => s.student_id === studentId);
    if (!student) {
      alert('Student not found');
      return;
    }

    try {
      await apiService.recordPayment({
        student_id: studentId,
        academic_year_id: selectedYear.id, // Use current year
        amount: paymentAmount,
        payment_method: paymentMethod,
        payment_date: new Date().toISOString().split('T')[0],
      });
      setRecordingPayment(null);
      setPaymentAmount(0);
      await loadFeeCharges();
      alert('Payment recorded successfully');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to record payment');
    }
  };

  // MODIFY TABLE RENDERING: Use groupedCharges instead of feeCharges
  return (
    <Layout schoolName={'SMS'} principalName={"User"} onLogout={logout}>
      {/* ... header content ... */}

      <Card>
        <div style={{ padding: '24px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#0f172a', marginBottom: '16px' }}>
            Fee Charges ({groupedCharges.length} students)
          </h2>
          
          {groupedCharges.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 24px', color: '#64748b' }}>
              <DollarSign size={48} style={{ color: '#cbd5e1', marginBottom: '16px', margin: '0 auto' }} />
              <p>No fee charges found for this academic year</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #e2e8f0' }}>
                    <th style={{ padding: '12px', textAlign: 'left', fontSize: '14px', fontWeight: 600, color: '#64748b' }}>Student</th>
                    <th style={{ padding: '12px', textAlign: 'right', fontSize: '14px', fontWeight: 600, color: '#64748b' }}>Total Charged</th>
                    <th style={{ padding: '12px', textAlign: 'right', fontSize: '14px', fontWeight: 600, color: '#64748b' }}>Total Paid</th>
                    <th style={{ padding: '12px', textAlign: 'right', fontSize: '14px', fontWeight: 600, color: '#64748b' }}>Balance</th>
                    <th style={{ padding: '12px', textAlign: 'center', fontSize: '14px', fontWeight: 600, color: '#64748b' }}>Status</th>
                    <th style={{ padding: '12px', textAlign: 'right', fontSize: '14px', fontWeight: 600, color: '#64748b' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {groupedCharges.map((student) => {
                    const isPaid = student.status === 'paid';
                    const isPartiallyPaid = student.status === 'partially_paid';
                    const isExpanded = expandedStudents.has(student.student_id);

                    return (
                      <>
                        {/* Main Student Row */}
                        <tr 
                          key={student.student_id} 
                          style={{ 
                            borderBottom: '1px solid #e2e8f0',
                            backgroundColor: isExpanded ? '#f8fafc' : 'white',
                            cursor: 'pointer'
                          }}
                          onClick={() => toggleStudentExpansion(student.student_id)}
                        >
                          <td style={{ padding: '12px', fontSize: '14px', fontWeight: 500, color: '#0f172a' }}>
                            {student.student_name || 'Unknown'}
                            {student.student_code && (
                              <div style={{ fontSize: '12px', color: '#64748b' }}>{student.student_code}</div>
                            )}
                            <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                              {student.charges.length} charge{student.charges.length !== 1 ? 's' : ''}
                            </div>
                          </td>
                          <td style={{ padding: '12px', fontSize: '14px', color: '#0f172a', textAlign: 'right', fontWeight: 500 }}>
                            ${student.totalCharged.toFixed(2)}
                          </td>
                          <td style={{ padding: '12px', fontSize: '14px', color: '#16a34a', textAlign: 'right', fontWeight: 500 }}>
                            ${student.totalPaid.toFixed(2)}
                          </td>
                          <td style={{ padding: '12px', fontSize: '14px', color: '#dc2626', textAlign: 'right', fontWeight: 500 }}>
                            ${student.balance.toFixed(2)}
                          </td>
                          <td style={{ padding: '12px', textAlign: 'center' }}>
                            {isPaid ? (
                              <span style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                padding: '4px 8px',
                                background: '#dcfce7',
                                color: '#166534',
                                borderRadius: '4px',
                                fontSize: '12px',
                                fontWeight: 500,
                              }}>
                                <CheckCircle size={12} />
                                Paid
                              </span>
                            ) : isPartiallyPaid ? (
                              <span style={{
                                padding: '4px 8px',
                                background: '#fef3c7',
                                color: '#92400e',
                                borderRadius: '4px',
                                fontSize: '12px',
                                fontWeight: 500,
                              }}>
                                Partial
                              </span>
                            ) : (
                              <span style={{
                                padding: '4px 8px',
                                background: '#fee2e2',
                                color: '#dc2626',
                                borderRadius: '4px',
                                fontSize: '12px',
                                fontWeight: 500,
                              }}>
                                Pending
                              </span>
                            )}
                          </td>
                          <td style={{ padding: '12px', textAlign: 'right' }}>
                            {!isPaid && recordingPayment !== student.student_id && (
                              <Button
                                variant="secondary"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setRecordingPayment(student.student_id);
                                  setPaymentAmount(student.balance);
                                }}
                              >
                                Record Payment
                              </Button>
                            )}
                          </td>
                        </tr>

                        {/* Expanded Charge Details */}
                        {isExpanded && (
                          <tr key={`${student.student_id}-details`}>
                            <td colSpan={6} style={{ padding: '0 12px 12px 48px', backgroundColor: '#f8fafc' }}>
                              <div style={{ fontSize: '13px', color: '#64748b', fontWeight: 600, marginBottom: '8px' }}>
                                Individual Charges:
                              </div>
                              {student.charges.map((charge: any) => (
                                <div 
                                  key={charge.id} 
                                  style={{ 
                                    display: 'flex', 
                                    justifyContent: 'space-between', 
                                    padding: '6px 0',
                                    borderBottom: '1px solid #e2e8f0',
                                    fontSize: '13px'
                                  }}
                                >
                                  <span style={{ color: '#64748b' }}>{charge.category_name}</span>
                                  <span style={{ color: '#0f172a', fontWeight: 500 }}>
                                    ${charge.amount.toFixed(2)} 
                                    {charge.total_paid > 0 && (
                                      <span style={{ color: '#16a34a', marginLeft: '8px' }}>
                                        (Paid: ${charge.total_paid.toFixed(2)})
                                      </span>
                                    )}
                                  </span>
                                </div>
                              ))}
                            </td>
                          </tr>
                        )}
                      </>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Card>

      {/* Payment Modal - same as before but references student_id */}
    </Layout>
  );
}
```

**Testing Strategy:**
- Student with 3 charges should appear as 1 row with totals
- Clicking row should expand to show individual charges
- Payment recording should work for student-level payments
- Verify totals sum correctly across all charges

**Side Effects & Mitigation:**
- Changed UI presentation - users will see grouped view
- May need user training on expandable rows
- Payment allocation logic already exists in backend

---

### Bug #3: R2 Storage Disabled

**Files to Modify:**
- `apps/api/wrangler.jsonc`
- Cloudflare Dashboard Configuration (manual step)

**Current Behavior:**
- Lines 24-30 in `wrangler.jsonc` are commented out
- `STORAGE` binding is unavailable to backend code
- All file upload features fail

**Technical Approach:**

1. **Create R2 Bucket in Cloudflare Dashboard**
   - Manual step: Log into Cloudflare dashboard
   - Navigate to R2 section
   - Create bucket named `sms-storage`
   - Note: This is infrastructure setup, not code

2. **Uncomment R2 Configuration**
   - Remove comment markers from `wrangler.jsonc`
   - Ensure bucket names match what was created

3. **Verify Binding Availability**
   - Backend code already uses `c.env.STORAGE`
   - No backend code changes needed

**Code Changes:**

In `apps/api/wrangler.jsonc`, change lines 24-30 from:

```jsonc
// R2 Storage binding for file uploads (timetable images, etc.)
// Temporarily disabled until R2 is enabled in Cloudflare dashboard
// "r2_buckets": [
// 	{
// 		"binding": "STORAGE",
// 		"bucket_name": "sms-storage",
// 		"preview_bucket_name": "sms-storage"
// 	}
// ],
```

To:

```jsonc
// R2 Storage binding for file uploads (timetable images, etc.)
"r2_buckets": [
	{
		"binding": "STORAGE",
		"bucket_name": "sms-storage",
		"preview_bucket_name": "sms-storage"
	}
],
```

**Cloudflare Dashboard Steps:**

1. Log into Cloudflare Dashboard (https://dash.cloudflare.com)
2. Navigate to **R2** section in left sidebar
3. Click **Create bucket**
4. Enter name: `sms-storage`
5. Select location (default is fine)
6. Click **Create bucket**
7. Bucket is now available for the binding

**Backend Code Verification:**

No changes needed. Code already references the binding correctly:

```typescript
// In timetable.routes.ts (example)
const imageKey = `timetables/${timetableId}.${ext}`;
await c.env.STORAGE.put(imageKey, imageBuffer, {
  httpMetadata: { contentType: file.type },
});
```

**Testing Strategy:**
- Upload a timetable image - verify success
- Upload an assignment attachment - verify success
- Check R2 bucket in dashboard - verify files appear
- Retrieve uploaded file URL - verify accessible

**Side Effects & Mitigation:**
- Costs: R2 storage has usage-based pricing (storage + operations)
- Mitigation: Monitor usage in dashboard, set up billing alerts
- File cleanup: Implement cleanup for deleted records if needed

---

### Bug #5: Academic Year Switching Doesn't Refresh Data

**Affected Files:**
- `apps/web/src/pages/Fees.tsx` (covered in Bug #1)
- `apps/web/src/pages/Timetable.tsx`
- `apps/web/src/pages/Teachers.tsx`
- `apps/web/src/pages/Promotions.tsx`

**Note:** Bug #1 fix already handles Fees.tsx. The pattern is identical for other pages.

**Technical Approach:**

Same pattern for all pages:
1. Import `useAcademicYear` hook
2. Add `selectedYear?.id` to `useEffect` dependency array
3. Add null check before API calls
4. Pass `academic_year_id` parameter to API calls

**For Timetable.tsx:**

```typescript
import { useAcademicYear } from '../contexts/AcademicYearContext';

export function Timetable() {
  const { selectedYear } = useAcademicYear(); // ADD

  useEffect(() => {
    loadTimetables();
  }, [selectedYear?.id]); // CHANGE: was []

  const loadTimetables = async () => {
    if (!selectedYear) {
      setTimetables([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const response = await apiService.getTimetables({
        academic_year_id: selectedYear.id // ADD
      });
      setTimetables(response.data);
    } finally {
      setIsLoading(false);
    }
  };

  if (!selectedYear) {
    return (
      <Layout schoolName={'SMS'} principalName={"User"} onLogout={logout}>
        <div style={{ padding: '32px', textAlign: 'center', color: '#64748b' }}>
          <p>Please select an academic year to view timetables</p>
        </div>
      </Layout>
    );
  }
}
```

**For Teachers.tsx:**

```typescript
import { useAcademicYear } from '../contexts/AcademicYearContext';

export function Teachers() {
  const { selectedYear } = useAcademicYear(); // ADD

  useEffect(() => {
    loadTeachers();
  }, [statusFilter, selectedYear?.id]); // CHANGE: add selectedYear?.id

  const loadTeachers = async () => {
    // Teachers themselves aren't year-specific, but teaching assignments are
    // So we just load teachers and optionally display year context
    try {
      setIsLoading(true);
      const response = await apiService.getTeachers({ status: statusFilter });
      setTeachers(response.data);
    } finally {
      setIsLoading(false);
    }
  };

  // Note: For Teachers page, you might want to load teaching assignments
  // filtered by year in a separate call or when viewing teacher details
}
```

**For Promotions.tsx:**

```typescript
import { useAcademicYear } from '../contexts/AcademicYearContext';

export function Promotions() {
  const { selectedYear } = useAcademicYear(); // ADD

  useEffect(() => {
    loadPromotions();
  }, [selectedYear?.id]); // CHANGE: was []

  const loadPromotions = async () => {
    if (!selectedYear) {
      setPromotions([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      // Filter promotions where from_year or to_year matches selected year
      const response = await apiService.getPromotions({
        academic_year_id: selectedYear.id
      });
      setPromotions(response.data);
    } finally {
      setIsLoading(false);
    }
  };

  if (!selectedYear) {
    return (
      <Layout schoolName={'SMS'} principalName={"User"} onLogout={logout}>
        <div style={{ padding: '32px', textAlign: 'center', color: '#64748b' }}>
          <p>Please select an academic year to view promotions</p>
        </div>
      </Layout>
    );
  }
}
```

**Testing Strategy:**
- Load each page with year selected
- Switch academic year in header dropdown
- Verify data automatically refreshes for new year
- Verify no duplicate API calls
- Check network tab for proper parameters

**Side Effects & Mitigation:**
- None - this is the correct behavior
- Performance: Each year switch triggers one API call per page

---

### Bug #6: Timetable Page Missing Academic Year Filter

**Files to Modify:**
- `apps/web/src/pages/Timetable.tsx`

**Note:** This is the same fix as Bug #5 for Timetable.tsx, documented above. The fix achieves both:
- Adding academic year filter (Bug #6)
- Enabling refresh on year change (Bug #5)

See "For Timetable.tsx" section under Bug #5 for complete implementation.

---

### Bug #7: Teachers Page Missing Academic Year Context

**Files to Modify:**
- `apps/web/src/pages/Teachers.tsx`

**Current Behavior:**
- No `useAcademicYear` hook imported or used
- Teachers list doesn't consider academic year
- Teaching assignments not filtered by year

**Technical Approach:**

Teachers themselves are not year-specific (a teacher exists across multiple years), but their **teaching assignments** are year-specific. The approach:

1. Import `useAcademicYear` hook for context awareness
2. Display selected year in UI to indicate context
3. When viewing teacher details/assignments, filter by year
4. Keep main teacher list as-is (not year-filtered)

**Code Changes:**

```typescript
import { useAcademicYear } from '../contexts/AcademicYearContext';

export function Teachers() {
  const { user, logout } = useAuth();
  const { selectedYear } = useAcademicYear(); // ADD
  const navigate = useNavigate();

  // ... existing state ...

  useEffect(() => {
    loadTeachers();
  }, [statusFilter, selectedYear?.id]); // ADD selectedYear?.id

  const loadTeachers = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const filters: Record<string, string> = {};
      if (statusFilter !== 'all') {
        filters.status = statusFilter;
      }
      
      const response = await apiService.getTeachers(filters);
      setTeachers(response.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load teachers');
    } finally {
      setIsLoading(false);
    }
  };

  // In render, add year context indicator
  return (
    <Layout schoolName={'SMS'} principalName={"User"} onLogout={logout}>
      <div style={{ padding: '32px' }}>
        <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ fontSize: '28px', fontWeight: 600, color: '#0f172a', marginBottom: '8px' }}>
              Teachers Management
            </h1>
            <p style={{ fontSize: '14px', color: '#64748b' }}>
              {selectedYear 
                ? `Viewing context: ${selectedYear.label}` 
                : 'All teachers'
              }
            </p>
          </div>
          {/* ... buttons ... */}
        </div>

        {/* ... rest of component ... */}
      </div>
    </Layout>
  );
}
```

**For Teacher Detail View** (if you have one, e.g., `TeacherDetail.tsx`):

```typescript
// When loading teaching assignments for a specific teacher
const loadTeachingAssignments = async (teacherId: string) => {
  if (!selectedYear) return [];

  const response = await apiService.getTeachingAssignments({
    teacher_id: teacherId,
    academic_year_id: selectedYear.id // Filter by year
  });
  return response.data;
};
```

**Testing Strategy:**
- Teachers list loads successfully
- Year context indicator displays correctly
- When viewing teacher details, assignments filter by year
- Switching year updates any year-dependent teacher data

**Side Effects & Mitigation:**
- Main teachers list remains unfiltered (correct - teachers exist across years)
- Only year-dependent data (assignments) gets filtered

---

### Bug #8: Promotions Page Missing Academic Year Filter

**Files to Modify:**
- `apps/web/src/pages/Promotions.tsx`

**Note:** This is covered under Bug #5 for Promotions.tsx. See "For Promotions.tsx" section under Bug #5 for complete implementation.

Promotions have `from_academic_year_id` and `to_academic_year_id`, so filtering shows promotions relevant to the selected year.

---

### Bug #9: Assignment Form Academic Year Logic Inconsistency

**Files to Modify:**
- `apps/web/src/pages/AssignmentForm.tsx` or wherever assignment creation form exists

**Current Behavior:**
- Academic year derived from `classroom.academic_year_id`
- Falls back to `selectedAcademicYear` if missing
- Potential inconsistency between classroom year and context year

**Technical Approach:**

1. **Use Academic Year Context as Primary Source**
   - Always use `selectedYear.id` from context
   - Don't derive from classroom data

2. **Filter Classrooms by Selected Year**
   - When loading classroom dropdown, filter by `selectedYear.id`
   - Ensures classroom and year are always consistent

3. **Validate Year Selection**
   - Require year to be selected before form loads
   - Show message if no year selected

**Code Changes:**

```typescript
import { useAcademicYear } from '../contexts/AcademicYearContext';

export function AssignmentForm() {
  const { selectedYear } = useAcademicYear(); // ADD
  const [classrooms, setClassrooms] = useState([]);
  const [selectedClassroom, setSelectedClassroom] = useState('');

  useEffect(() => {
    loadClassrooms();
  }, [selectedYear?.id]); // ADD dependency

  const loadClassrooms = async () => {
    if (!selectedYear) {
      setClassrooms([]);
      return;
    }

    try {
      // CHANGE: Filter classrooms by selected year
      const response = await apiService.getClassrooms({
        academic_year_id: selectedYear.id
      });
      setClassrooms(response.data);
    } catch (err) {
      console.error('Failed to load classrooms:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedYear) {
      alert('Please select an academic year first');
      return;
    }

    if (!selectedClassroom) {
      alert('Please select a classroom');
      return;
    }

    try {
      await apiService.createAssignment({
        title: formData.title,
        description: formData.description,
        classroom_id: selectedClassroom,
        subject_id: formData.subject_id,
        academic_year_id: selectedYear.id, // CHANGE: Always use context year
        due_date: formData.due_date,
        // ... other fields ...
      });

      navigate('/assignments');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to create assignment');
    }
  };

  // ADD: Early return for no year
  if (!selectedYear) {
    return (
      <Layout schoolName={'SMS'} principalName={"User"} onLogout={logout}>
        <div style={{ padding: '32px', textAlign: 'center', color: '#64748b' }}>
          <p>Please select an academic year to create an assignment</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout schoolName={'SMS'} principalName={"User"} onLogout={logout}>
      <form onSubmit={handleSubmit}>
        {/* Show year context */}
        <div style={{ marginBottom: '16px', color: '#64748b', fontSize: '14px' }}>
          Creating assignment for: {selectedYear.label}
        </div>

        {/* Classroom dropdown - now filtered by year */}
        <div>
          <label>Classroom</label>
          <select 
            value={selectedClassroom}
            onChange={(e) => setSelectedClassroom(e.target.value)}
            required
          >
            <option value="">Select classroom</option>
            {classrooms.map((classroom) => (
              <option key={classroom.id} value={classroom.id}>
                {classroom.name}
              </option>
            ))}
          </select>
        </div>

        {/* ... rest of form ... */}
      </form>
    </Layout>
  );
}
```

**Backend Validation** (add if not present):

In `apps/api/src/routes/assignments.routes.ts`:

```typescript
// When creating assignment, validate classroom belongs to academic year
const classroom = await getClassroom(data.classroom_id);
if (classroom.academic_year_id !== data.academic_year_id) {
  return c.json({ 
    error: 'Classroom and academic year mismatch' 
  }, 400);
}
```

**Testing Strategy:**
- Try creating assignment without year selected - verify blocked
- Select year, load form - verify only that year's classrooms appear
- Submit form - verify academic_year_id is correct
- Try submitting with mismatched data - verify validation catches it

**Side Effects & Mitigation:**
- Users must select academic year before creating assignments
- Classroom dropdown may have fewer options (correctly filtered)
- Eliminates confusion about which year an assignment belongs to

---

### Bug #12: Assignments Page Allows Null Year

**Files to Modify:**
- `apps/web/src/pages/Assignments.tsx`

**Current Behavior:**
- Uses ternary: `selectedYear?.id ? { academic_year_id: selectedYear.id } : {}`
- Makes API calls even when `selectedYear` is null
- Loads assignments from ALL years when no year selected

**Technical Approach:**

1. **Enforce Year Requirement**
   - Don't make API calls if `selectedYear` is null
   - Show empty state prompting year selection

2. **Remove Ternary Operator**
   - Always include `academic_year_id` parameter
   - Rely on null check to prevent calls

**Code Changes:**

```typescript
import { useAcademicYear } from '../contexts/AcademicYearContext';

export function Assignments() {
  const { selectedYear } = useAcademicYear();

  useEffect(() => {
    loadAssignments();
  }, [selectedYear?.id]); // Already correct

  const loadAssignments = async () => {
    // ADD: Early return for null year
    if (!selectedYear) {
      setAssignments([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      
      // CHANGE: Remove ternary, always pass year filter
      const response = await apiService.getAssignments({
        academic_year_id: selectedYear.id // Was: selectedYear?.id ? {...} : {}
      });
      
      setAssignments(response.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load assignments');
    } finally {
      setIsLoading(false);
    }
  };

  // ADD: Early return for no year selected
  if (!selectedYear) {
    return (
      <Layout schoolName={'SMS'} principalName={"User"} onLogout={logout}>
        <div style={{ padding: '32px', textAlign: 'center', color: '#64748b' }}>
          <p>Please select an academic year to view assignments</p>
        </div>
      </Layout>
    );
  }

  // ... rest of component ...
}
```

**Testing Strategy:**
- Set selectedYear to null - verify empty state appears
- Select a year - verify assignments for that year load
- Switch year - verify assignments refresh
- Verify no API calls when year is null

**Side Effects & Mitigation:**
- Users must select year to view assignments (correct behavior)
- More explicit than silent filtering

---

### Bug #13: AcademicStructure Page Partial Filtering

**Files to Modify:**
- `apps/web/src/pages/AcademicStructure.tsx`

**Current Behavior:**
- "Classrooms" tab correctly filters by `selectedYear?.id`
- "Teaching Assignments" tab does NOT filter by year
- "Enrollments" tab does NOT filter by year
- `useEffect` already includes `selectedYear?.id` dependency

**Technical Approach:**

The useEffect already triggers on year change, so we only need to:
1. Add year filter to Teaching Assignments API call
2. Add year filter to Enrollments API call

**Code Changes:**

```typescript
import { useAcademicYear } from '../contexts/AcademicYearContext';

export function AcademicStructure() {
  const { selectedYear } = useAcademicYear();

  useEffect(() => {
    loadData();
  }, [activeTab, selectedYear?.id]); // Already correct

  const loadData = async () => {
    if (!selectedYear) {
      // Clear data if no year selected
      setClassrooms([]);
      setTeachingAssignments([]);
      setEnrollments([]);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      if (activeTab === 'classrooms') {
        // ALREADY CORRECT: Filters by year
        const response = await apiService.getClassrooms({
          academic_year_id: selectedYear.id
        });
        setClassrooms(response.data);
      } 
      else if (activeTab === 'teaching') {
        // ADD: Filter teaching assignments by year
        const response = await apiService.getTeachingAssignments({
          academic_year_id: selectedYear.id // ADD THIS PARAMETER
        });
        setTeachingAssignments(response.data);
      } 
      else if (activeTab === 'enrollments') {
        // ADD: Filter enrollments by year
        const response = await apiService.getEnrollments({
          academic_year_id: selectedYear.id // ADD THIS PARAMETER
        });
        setEnrollments(response.data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setIsLoading(false);
    }
  };

  // ADD: Show message if no year selected
  if (!selectedYear) {
    return (
      <Layout schoolName={'SMS'} principalName={"User"} onLogout={logout}>
        <div style={{ padding: '32px', textAlign: 'center', color: '#64748b' }}>
          <p>Please select an academic year to view academic structure</p>
        </div>
      </Layout>
    );
  }

  // ... rest of component ...
}
```

**Backend API Verification:**

Ensure these endpoints support `academic_year_id` parameter:
- `/teaching-assignments` - should filter where `classroom.academic_year_id` matches
- `/enrollments` - should filter where `enrollment.academic_year_id` matches

If not already implemented, add to backend routes:

```typescript
// In teaching-assignments.routes.ts
app.get('/teaching-assignments', async (c) => {
  const { academic_year_id } = c.req.query();
  
  let query = `
    SELECT ta.*, t.first_name, t.last_name, c.name as classroom_name
    FROM teaching_assignments ta
    JOIN teachers t ON ta.teacher_id = t.id
    JOIN classrooms c ON ta.classroom_id = c.id
  `;

  if (academic_year_id) {
    query += ` WHERE c.academic_year_id = ?`;
  }

  const result = academic_year_id
    ? await c.env.DB.prepare(query).bind(academic_year_id).all()
    : await c.env.DB.prepare(query).all();

  return c.json(result.results);
});

// Similar pattern for enrollments
```

**Testing Strategy:**
- Load Academic Structure page with each tab
- Verify all tabs show only data for selected year
- Switch year - verify all tabs refresh
- Compare data counts with database queries

**Side Effects & Mitigation:**
- Each tab now filtered (correct behavior)
- Users see less data per year (expected)

---

## API Changes Summary

### Frontend API Service Updates

In `apps/web/src/services/api.ts`, ensure these methods accept `academic_year_id` parameter:

```typescript
export const apiService = {
  // Fees
  getFeeCharges: (params?: { academic_year_id?: string }) =>
    apiClient.get('/fees/charges', { params }).then((res) => res.data),

  // Timetables
  getTimetables: (params?: { academic_year_id?: string }) =>
    apiClient.get('/timetables', { params }).then((res) => res.data),

  // Promotions
  getPromotions: (params?: { academic_year_id?: string }) =>
    apiClient.get('/promotions', { params }).then((res) => res.data),

  // Assignments
  getAssignments: (params?: { academic_year_id?: string }) =>
    apiClient.get('/assignments', { params }).then((res) => res.data),

  // Classrooms
  getClassrooms: (params?: { academic_year_id?: string; status?: string }) =>
    apiClient.get('/classrooms', { params }).then((res) => res.data),

  // Teaching Assignments
  getTeachingAssignments: (params?: { academic_year_id?: string; teacher_id?: string }) =>
    apiClient.get('/teaching-assignments', { params }).then((res) => res.data),

  // Enrollments
  getEnrollments: (params?: { academic_year_id?: string; classroom_id?: string; student_id?: string }) =>
    apiClient.get('/enrollments', { params }).then((res) => res.data),
};
```

### Backend Route Updates

Most backend routes already support `academic_year_id` filtering. Verify and add if missing:

**Already Implemented:**
- ✅ `/fees/charges` - supports `academic_year_id`
- ✅ `/timetables` - supports `academic_year_id`
- ✅ `/classrooms` - supports `academic_year_id`
- ✅ `/assignments` - supports `academic_year_id`

**May Need Implementation:**
- `/teaching-assignments` - add `academic_year_id` filter
- `/enrollments` - add `academic_year_id` filter
- `/promotions` - add `academic_year_id` filter (match from_year OR to_year)

---

## Testing Strategy

### Unit Tests

For each fixed component:

```typescript
describe('Fees Page Academic Year Integration', () => {
  it('should load charges for selected year only', async () => {
    const mockYear = { id: '2024', label: '2024-2025' };
    renderWithContext(<Fees />, { selectedYear: mockYear });
    
    await waitFor(() => {
      expect(apiService.getFeeCharges).toHaveBeenCalledWith({
        academic_year_id: '2024'
      });
    });
  });

  it('should refresh when year changes', async () => {
    const { rerender } = renderWithContext(<Fees />, { selectedYear: year2024 });
    
    // Change year
    rerender(<Fees />, { selectedYear: year2025 });
    
    await waitFor(() => {
      expect(apiService.getFeeCharges).toHaveBeenCalledWith({
        academic_year_id: '2025'
      });
    });
  });

  it('should show empty state when no year selected', () => {
    renderWithContext(<Fees />, { selectedYear: null });
    expect(screen.getByText(/please select an academic year/i)).toBeInTheDocument();
  });
});

describe('Fees Grouping', () => {
  it('should group charges by student', () => {
    const charges = [
      { student_id: '1', student_name: 'Alice', amount: 100, category_name: 'Tuition' },
      { student_id: '1', student_name: 'Alice', amount: 50, category_name: 'Lab Fee' },
      { student_id: '2', student_name: 'Bob', amount: 100, category_name: 'Tuition' },
    ];
    
    const grouped = groupChargesByStudent(charges);
    
    expect(grouped).toHaveLength(2);
    expect(grouped[0].student_id).toBe('1');
    expect(grouped[0].totalCharged).toBe(150);
    expect(grouped[0].charges).toHaveLength(2);
  });
});
```

### Integration Tests

```typescript
describe('Academic Year Switching Integration', () => {
  it('should update all subscribed pages when year changes', async () => {
    // Navigate to Fees page
    await navigateTo('/fees');
    expect(apiService.getFeeCharges).toHaveBeenCalledWith({ academic_year_id: '2024' });
    
    // Switch year in header
    await switchAcademicYear('2025');
    
    // Verify Fees page refreshed
    expect(apiService.getFeeCharges).toHaveBeenCalledWith({ academic_year_id: '2025' });
    
    // Navigate to Timetables
    await navigateTo('/timetables');
    expect(apiService.getTimetables).toHaveBeenCalledWith({ academic_year_id: '2025' });
  });
});
```

### Property-Based Tests

```typescript
describe('Bug Condition Properties', () => {
  it('Fix Checking: All year-dependent pages include year filter', () => {
    const pages = [Fees, Timetables, Assignments, Promotions];
    
    pages.forEach((Page) => {
      const mockYear = { id: faker.string.uuid(), label: '2024-2025' };
      renderWithContext(<Page />, { selectedYear: mockYear });
      
      // Verify API call includes year filter
      const lastCall = getLastApiCall();
      expect(lastCall.params).toHaveProperty('academic_year_id', mockYear.id);
    });
  });

  it('Preservation: Working pages remain unaffected', () => {
    const workingPages = [Students, Marks, Attendance];
    
    workingPages.forEach((Page) => {
      const mockYear = { id: '2024', label: '2024-2025' };
      const { rerender } = renderWithContext(<Page />, { selectedYear: mockYear });
      
      const initialData = getRenderedData();
      
      // Re-render with same props
      rerender(<Page />, { selectedYear: mockYear });
      
      // Data should be identical
      expect(getRenderedData()).toEqual(initialData);
    });
  });
});
```

### Exploratory Testing

**Manual Test Scenarios:**

1. **Year Switching Flow**
   - Load application → verify default year selected
   - Navigate to each page → verify year filter applied
   - Switch year in header → verify all pages refresh
   - Switch back → verify previous data reappears

2. **Null Year Handling**
   - Clear localStorage academic year
   - Reload app → verify default year selection
   - Programmatically set year to null → verify empty states

3. **R2 File Upload**
   - Upload timetable image → verify success
   - Check R2 bucket → verify file exists
   - Retrieve file URL → verify accessible
   - Delete timetable → verify file remains (or cleanup if implemented)

4. **Fees Grouping**
   - Create multiple charges for same student
   - View Fees page → verify one row per student
   - Expand row → verify individual charges shown
   - Record payment → verify totals update
   - Expand multiple students → verify all work

5. **Regression Testing**
   - Test Students page → verify still works correctly
   - Test Marks page → verify still works correctly
   - Test Attendance page → verify still works correctly
   - Test attendance edit window → verify still enforced

---

## Potential Side Effects & Mitigation

### 1. Performance Impact

**Effect:** Adding `selectedYear?.id` to useEffect dependencies causes data reload on every year switch.

**Mitigation:**
- This is expected and desired behavior
- API calls are already fast (backend caching exists)
- Consider adding loading indicators during transitions
- Could add debouncing if year switching becomes too frequent

### 2. User Experience Changes

**Effect:** Users can no longer see "all years" data at once on filtered pages.

**Mitigation:**
- This is correct multi-tenant behavior
- Academic year is a fundamental filter in school systems
- Add year selector prominence in UI
- Consider adding "all years" option for super admin only

### 3. Empty States When No Year Selected

**Effect:** Pages show empty states instead of loading all data.

**Mitigation:**
- More explicit than implicit filtering
- Context provides default year selection
- Empty states guide users to select year
- Reduces accidental data leaks across years

### 4. Fees Grouping Visual Change

**Effect:** Fees page looks different with grouped rows.

**Mitigation:**
- More usable for users tracking student fees
- Expandable rows provide detail when needed
- Consider user training or tooltip
- Can add "View Individual Charges" toggle if needed

### 5. R2 Storage Costs

**Effect:** Enabling R2 introduces storage and bandwidth costs.

**Mitigation:**
- Set up Cloudflare billing alerts
- Monitor usage in dashboard
- Implement file size limits on uploads
- Consider cleanup policy for old files
- Costs are typically minimal for this use case

### 6. Database Query Changes

**Effect:** Adding year filters changes query patterns and indexes.

**Mitigation:**
- Verify indexes exist on `academic_year_id` columns
- Monitor query performance
- Consider adding composite indexes if needed:
  ```sql
  CREATE INDEX IF NOT EXISTS idx_fees_charges_year 
  ON fee_charges(academic_year_id, student_id);
  
  CREATE INDEX IF NOT EXISTS idx_timetables_year 
  ON timetables(academic_year_id);
  
  CREATE INDEX IF NOT EXISTS idx_classrooms_year 
  ON classrooms(academic_year_id);
  ```

---

## Implementation Order

Recommended order to implement fixes:

### Phase 1: Infrastructure (Critical - Blocks Features)
1. **Bug #3: Enable R2 Storage**
   - Create bucket in Cloudflare Dashboard
   - Uncomment wrangler.jsonc configuration
   - Test file uploads work

### Phase 2: Core Academic Year Integration (High Impact)
2. **Bug #1: Fees Page Year Filter**
   - Add useAcademicYear hook
   - Add year parameter to API call
   - Test filtering works

3. **Bug #5: Year Switching Refresh** (Multiple Pages)
   - Fix Timetable.tsx
   - Fix Promotions.tsx
   - Verify Teachers.tsx context
   - Test year switching on all pages

### Phase 3: Data Presentation (User Experience)
4. **Bug #2: Fees Grouping**
   - Implement grouping logic
   - Update table rendering
   - Test expandable rows
   - Verify payment recording works

### Phase 4: Remaining Year Filters (Completeness)
5. **Bug #6: Timetable Year Filter** (Already done in #5)
6. **Bug #8: Promotions Year Filter** (Already done in #5)
7. **Bug #13: AcademicStructure Teaching/Enrollments**
   - Add year filter to Teaching tab
   - Add year filter to Enrollments tab

### Phase 5: Form Consistency (Data Integrity)
8. **Bug #9: Assignment Form Logic**
   - Use context year as source of truth
   - Filter classrooms by year
   - Add validation

9. **Bug #12: Assignments Page Null Year**
   - Enforce year requirement
   - Remove ternary operator
   - Add empty state

### Phase 6: Enhancement (Optional)
10. **Bug #7: Teachers Page Context**
    - Add useAcademicYear for context awareness
    - Filter teaching assignments by year in detail views

---

## Rollback Plan

If issues arise after deployment:

### Quick Rollback Options

1. **R2 Storage Issues**
   - Comment out r2_buckets in wrangler.jsonc
   - Redeploy
   - File uploads will fail but system continues working

2. **Academic Year Filtering Issues**
   - Remove `academic_year_id` parameter from specific API call
   - Remove from useEffect dependency array
   - Redeploys that specific page

3. **Fees Grouping Issues**
   - Revert to original table rendering
   - Use `feeCharges` instead of `groupedCharges`
   - Remove grouping function

### Monitoring Points

After deployment, monitor:
- API error rates (should not increase)
- Page load times (should remain similar)
- R2 storage usage (should grow steadily with uploads)
- User feedback on fees grouping
- Support tickets about "missing data" (may indicate filtering issues)

---

## Completion Checklist

- [ ] Bug #1: Fees page filters by academic year
- [ ] Bug #2: Fees page groups charges by student
- [ ] Bug #3: R2 storage enabled and working
- [ ] Bug #5: All pages refresh on year switch
  - [ ] Fees.tsx
  - [ ] Timetable.tsx
  - [ ] Teachers.tsx
  - [ ] Promotions.tsx
- [ ] Bug #6: Timetable filters by year
- [ ] Bug #7: Teachers page has year context
- [ ] Bug #8: Promotions filters by year
- [ ] Bug #9: Assignment form uses consistent year logic
- [ ] Bug #12: Assignments page requires year selection
- [ ] Bug #13: AcademicStructure tabs all filter by year
- [ ] All unit tests passing
- [ ] Integration tests passing
- [ ] Manual exploratory testing complete
- [ ] No regressions in Students, Marks, Attendance pages
- [ ] R2 bucket created and configured
- [ ] Database indexes verified
- [ ] Documentation updated

---

## Correctness Properties

Property 1: Bug Condition - Academic Year Filtering

_For any_ page that displays year-dependent data (Fees, Timetables, Assignments, Promotions, AcademicStructure tabs), when a user has selected an academic year, the fixed implementation SHALL filter all displayed data to show ONLY records belonging to that academic year by passing `academic_year_id` parameter to API calls.

**Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5 (Bug #1), 6.1, 6.2, 6.3, 6.4 (Bug #6), 8.1 (Bug #8), 11.1, 11.2 (Bug #13)**

Property 2: Bug Condition - Data Refresh on Year Change

_For any_ page that uses academic year context, when the user switches the selected academic year in the header dropdown, the fixed implementation SHALL automatically re-fetch and display data for the newly selected year by including `selectedYear?.id` in the useEffect dependency array.

**Validates: Requirements 5.1, 5.2, 5.3, 5.4 (Bug #5)**

Property 3: Bug Condition - Fees Student Grouping

_For any_ student who has multiple fee charges in the selected academic year, the fixed Fees page SHALL display exactly one table row for that student showing aggregated totals (total charged, total paid, balance) with individual charges viewable via row expansion, rather than displaying multiple rows.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5 (Bug #2)**

Property 4: Bug Condition - R2 Storage Availability

_For any_ file upload operation (timetable images, assignment attachments), when R2 storage is properly configured in wrangler.jsonc and the Cloudflare R2 bucket exists, the fixed implementation SHALL successfully store files in R2 and return accessible file URLs.

**Validates: Requirements 4.1, 4.2, 4.3, 4.4, 4.5 (Bug #3)**

Property 5: Bug Condition - Null Year Handling

_For any_ page that requires academic year context, when `selectedYear` is null or undefined, the fixed implementation SHALL display an empty state message prompting year selection rather than making API calls without the year filter or crashing.

**Validates: Requirements 2.4 (Bug #1), 5.5 (Bug #5), 6.4 (Bug #6), 8.4 (Bug #8), 10.1, 10.2 (Bug #12)**

Property 6: Bug Condition - Assignment Form Year Consistency

_For any_ assignment creation, the fixed AssignmentForm SHALL use `selectedYear.id` from academic year context as the source of truth for `academic_year_id`, filter the classroom dropdown to show ONLY classrooms from that year, and prevent form submission when no year is selected.

**Validates: Requirements 9.1, 9.2, 9.3, 9.4 (Bug #9)**

Property 7: Preservation - Working Pages Unchanged

_For any_ page that already correctly implements academic year filtering (Students, Marks, Attendance, AcademicStructure Classrooms tab), the fixed implementation SHALL produce identical behavior and data results as the original implementation, preserving all existing functionality.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4 (Unchanged Behavior)**

Property 8: Preservation - Existing API Compatibility

_For any_ backend API endpoint that adds `academic_year_id` filtering, when the parameter is omitted or null, the fixed implementation SHALL maintain backward compatibility by either returning all records or handling the missing parameter gracefully without errors.

**Validates: Requirements 6.1, 6.2 (Unchanged Behavior)**

Property 9: Preservation - Academic Year Context Provider

_For any_ interaction with the AcademicYearContext, the fixed implementation SHALL continue to auto-load academic years on app initialization, select the active/current year by default, persist selection in localStorage, and propagate year changes to all subscribed components.

**Validates: Requirements 7.1, 7.2, 7.3 (Unchanged Behavior)**

---

## Hypothesized Root Causes

### Bug #1 & #5 & #6 & #8: Missing Academic Year Integration

**Root Cause:** Pages were implemented before the Academic Year Context system was established, or were copied from templates that didn't include year integration.

**Evidence:**
- No import of `useAcademicYear` hook
- Empty useEffect dependency arrays
- API calls without year parameters
- Students page (correctly implemented) shows the proper pattern

**Hypothesis Validation:** Comparing working pages (Students, Marks, Attendance) with broken pages confirms this pattern.

### Bug #2: Fees Grouping

**Root Cause:** Direct translation of database records to table rows without intermediate aggregation layer.

**Evidence:**
- Code directly maps `feeCharges.map((charge) => <tr>)`
- No grouping or aggregation logic
- Backend returns flat list of charges

**Hypothesis Validation:** Common pattern when data model (charges) differs from desired presentation (students).

### Bug #3: R2 Storage

**Root Cause:** Cloudflare R2 requires explicit bucket creation and billing setup before configuration can be enabled.

**Evidence:**
- Comment in wrangler.jsonc: "Temporarily disabled until R2 is enabled in Cloudflare dashboard"
- Backend code already uses `c.env.STORAGE`
- No code bugs, purely configuration

**Hypothesis Validation:** Configuration file comment explicitly states this.

### Bug #7: Teachers Page

**Root Cause:** Teachers are not inherently year-specific entities (they exist across years), so year integration was considered optional.

**Evidence:**
- Teachers table has no `academic_year_id` column
- Teaching assignments (many-to-many) are year-specific
- Page was implemented to show "all teachers"

**Hypothesis Validation:** Design decision rather than oversight, but year context still needed for assignments.

### Bug #9: Assignment Form

**Root Cause:** Uncertainty about source of truth for academic year - classroom data vs. context.

**Evidence:**
- Code has fallback logic: `classroom.academic_year_id || selectedAcademicYear`
- Defensive programming created ambiguity
- No single source of truth enforced

**Hypothesis Validation:** Code comments and logic suggest uncertainty during implementation.

### Bug #12: Assignments Page

**Root Cause:** Defensive programming allowing operation without year selection to avoid crashes.

**Evidence:**
- Ternary operator: `selectedYear?.id ? {...} : {}`
- Graceful degradation instead of strict requirements
- No empty state for null year

**Hypothesis Validation:** Pattern of "try to work with whatever data available" vs. "require prerequisites."

### Bug #13: AcademicStructure Tabs

**Root Cause:** Incremental implementation where Classrooms tab was completed first, other tabs pending.

**Evidence:**
- Classrooms tab correctly filters
- Teaching and Enrollments tabs missing filters
- useEffect already includes year dependency (infrastructure ready)

**Hypothesis Validation:** Partial implementation left incomplete.

---

## Conclusion

This design provides systematic fixes for all 10 bugs following consistent patterns:

1. **Academic Year Integration Pattern** - Import hook, add dependency, pass parameter, handle null
2. **Data Grouping Pattern** - Transform API response, aggregate by entity, render grouped view
3. **Infrastructure Configuration** - Enable services, configure bindings, verify availability

All fixes preserve existing working functionality and follow the same patterns already proven in correctly-implemented pages like Students, Marks, and Attendance.

Implementation can proceed in phases, with R2 storage (Bug #3) being highest priority as it completely blocks file uploads. Academic year integration fixes can be rolled out incrementally per page, reducing deployment risk.
