# Assignment System Testing & Troubleshooting Checklist

Complete guide to test and fix assignment viewing/downloading issues.

---

## 🔍 **Issue:** Assignments not showing or downloadable

### Root Causes:
1. Assignments might not be published (still in draft)
2. Teaching assignment missing (teacher not assigned to subject)
3. Frontend not calling correct endpoints
4. Attachments not being loaded with assignment details

---

## ✅ **Testing Checklist**

### **1. Create Assignment (Teacher/Principal)**

**Steps:**
1. Login as Principal or Teacher
2. Navigate to Assignments → "New Assignment"
3. Fill in:
   - Classroom
   - Subject  
   - Title: "Test Assignment"
   - Description: "This is a test"
   - Due Date: (future date)
4. Click "Create Assignment"

**Expected:** Assignment created successfully, redirected to assignment detail page

**Status:** ___________

---

### **2. Upload Attachment**

**Steps:**
1. On assignment detail page
2. Click "Choose File" or "Upload Attachment"
3. Select a PDF or image file
4. Click Upload

**Expected:** 
- File uploads to R2
- Attachment appears in list
- Shows file name and size

**Status:** ___________

**If fails, check:**
```bash
# Check R2 binding in deployment
cd apps/api
npx wrangler deployments list

# Should show:
# env.STORAGE    R2 Bucket    sms-storage
```

---

### **3. Publish Assignment**

**Steps:**
1. On assignment detail page
2. Click "Publish" button
3. Confirm publication

**Expected:**
- Status changes from "Draft" to "Published"
- "Publish" button disappears
- "Close" button appears

**Status:** ___________

**If draft assignments are not editable:**
Check that user is assigned teacher for that subject in teaching_assignments table.

---

### **4. View Assignment List (Teacher)**

**Steps:**
1. Login as Teacher
2. Navigate to "Assignments"
3. Check assignment list

**Expected:**
- All assignments for assigned subjects appear
- Shows title, classroom, subject, due date
- Can click to view details

**Status:** ___________

**Debugging:**

Open browser console (F12) and check:
```
1. Network tab → Look for GET /assignments request
2. Check response - should contain array of assignments
3. Look for errors in Console tab
```

**Common Issues:**
- **Empty list but assignments exist:** Teacher not assigned via teaching_assignments
- **403 Forbidden:** Authorization issue
- **500 Error:** Backend error, check logs

---

### **5. Download Attachment (Teacher)**

**Steps:**
1. Open published assignment
2. Click on attachment file name or Download button
3. File should download

**Expected:**
- File downloads with correct name
- Content matches uploaded file
- No errors

**Status:** ___________

**Current Implementation:**
```typescript
// apps/web/src/pages/AssignmentDetail.tsx
const handleDownload = async (attachmentId: string, filename: string) => {
  const response = await apiService.getAssignmentAttachmentUrl(id, attachmentId);
  const url = response.data.url;
  
  // Download via link
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
};
```

**This is WRONG!** The API doesn't return a URL, it streams the file.

---

### **6. View Assignments (Student)**

**Steps:**
1. Login as Student
2. Navigate to "My Assignments" or "Assignments"
3. Check list

**Expected:**
- Only **PUBLISHED** assignments for student's classroom
- Shows title, subject, due date, description
- Attachments are downloadable

**Status:** ___________

**API Endpoint:** `GET /me/assignments`

**Debugging:**
```bash
# Test API directly
curl https://sms-api.nmvpmsms.workers.dev/me/assignments \
  -H "Authorization: Bearer STUDENT_JWT_TOKEN"
```

**Expected Response:**
```json
{
  "data": [
    {
      "id": "assignment-123",
      "title": "Test Assignment",
      "subject_name": "Mathematics",
      "classroom_name": "10-A",
      "due_date": "2026-10-15T00:00:00Z",
      "description": "...",
      "attachments": [...]
    }
  ]
}
```

---

### **7. Download Attachment (Student)**

**Steps:**
1. Student opens assignment
2. Clicks "Download Attachment"
3. File downloads

**Expected:**
- Only published assignments are accessible
- Attachments download correctly
- No 403 errors

**Status:** ___________

---

## 🔧 **Fixes Needed**

### **Fix 1: Correct Download Implementation**

The current download method is wrong. The backend streams files, not URLs.

**File:** `apps/web/src/pages/AssignmentDetail.tsx`

**Change this:**
```typescript
const handleDownload = async (attachmentId: string, filename: string) => {
  if (!id) return;
  try {
    const response = await apiService.getAssignmentAttachmentUrl(id, attachmentId);
    const url = response.data.url;
    
    // Create temporary link and trigger download
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (err) {
    alert(err instanceof Error ? err.message : 'Failed to download file');
  }
};
```

**To this:**
```typescript
const handleDownload = async (attachmentId: string, filename: string) => {
  if (!id) return;
  try {
    // Download directly from API (which streams the file)
    const url = `${apiService.baseUrl}/assignments/${id}/attachments/${attachmentId}`;
    const token = localStorage.getItem('token');
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!response.ok) {
      throw new Error('Download failed');
    }
    
    // Get blob and download
    const blob = await response.blob();
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(downloadUrl);
  } catch (err) {
    alert(err instanceof Error ? err.message : 'Failed to download file');
  }
};
```

---

### **Fix 2: Load Attachments with Assignment**

**File:** `apps/web/src/pages/AssignmentDetail.tsx`

Add this after loading assignment:
```typescript
const loadAssignment = async () => {
  if (!id) return;
  try {
    setIsLoading(true);
    setError(null);
    
    // Load assignment details
    const response = await apiService.getAssignment(id);
    const assignmentData = response.data;
    
    // Load attachments separately if not included
    if (!assignmentData.attachments) {
      const attachmentsRes = await apiService.getAssignmentAttachments(id);
      assignmentData.attachments = attachmentsRes.data || [];
    }
    
    setAssignment(assignmentData);
  } catch (err) {
    setError(err instanceof Error ? err.message : 'Failed to load assignment');
  } finally {
    setIsLoading(false);
  }
};
```

---

### **Fix 3: Add getAssignmentAttachments API Method**

**File:** `apps/web/src/services/api.ts`

Add this method:
```typescript
async getAssignmentAttachments(assignmentId: string) {
  return this.request<{ data: any[] }>(`/assignments/${assignmentId}/attachments`);
}
```

---

### **Fix 4: Student Download Implementation**

**File:** `apps/web/src/pages/StudentAssignments.tsx`

The current `handleDownload` tries to use `attachment_url` which doesn't exist.

**Change this:**
```typescript
const handleDownload = (assignment: any) => {
  if (assignment.attachment_url) {
    window.open(assignment.attachment_url, '_blank');
  }
};
```

**To this:**
```typescript
const handleDownload = async (assignment: any, attachment: any) => {
  try {
    const url = `${apiService.baseUrl}/assignments/${assignment.id}/attachments/${attachment.id}`;
    const token = localStorage.getItem('token');
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!response.ok) {
      throw new Error('Download failed');
    }
    
    const blob = await response.blob();
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = attachment.file_name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(downloadUrl);
  } catch (err) {
    alert('Failed to download attachment');
  }
};
```

**And update the UI:**
```typescript
{assignment.attachments && assignment.attachments.length > 0 && (
  <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #e2e8f0' }}>
    <h4 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px' }}>
      Attachments:
    </h4>
    {assignment.attachments.map((attachment: any) => (
      <button
        key={attachment.id}
        onClick={() => handleDownload(assignment, attachment)}
        style={{ /* ... */ }}
      >
        <Download size={16} />
        {attachment.file_name}
        <span style={{ fontSize: '13px', opacity: 0.8 }}>
          ({(attachment.size_bytes / 1024).toFixed(1)} KB)
        </span>
      </button>
    ))}
  </div>
)}
```

---

## 🧪 **Testing Commands**

### Test Teacher Assignments List
```bash
curl https://sms-api.nmvpmsms.workers.dev/assignments \
  -H "Authorization: Bearer TEACHER_JWT" \
  -H "Content-Type: application/json"
```

### Test Student Assignments
```bash
curl https://sms-api.nmvpmsms.workers.dev/me/assignments \
  -H "Authorization: Bearer STUDENT_JWT"
```

### Test Attachment Download
```bash
curl https://sms-api.nmvpmsms.workers.dev/assignments/ASSIGNMENT_ID/attachments/ATTACHMENT_ID \
  -H "Authorization: Bearer JWT_TOKEN" \
  -o downloaded-file.pdf
```

### Check R2 Files
1. Go to Cloudflare Dashboard → R2
2. Click `sms-storage` bucket
3. Navigate to: `schools/{school-id}/assignments/{assignment-id}/`
4. Verify files are there

---

## 📋 **Common Issues**

### Issue: "Assignment list is empty"

**Cause:** Teacher not assigned to subjects via teaching_assignments

**Fix:**
```sql
-- Check teaching assignments
SELECT * FROM teaching_assignments WHERE teacher_user_id = 'teacher-id';

-- If missing, create one:
INSERT INTO teaching_assignments (
  id, school_id, academic_year_id, classroom_id, subject_id, 
  teacher_user_id, created_at, updated_at
) VALUES (
  'ta-123', 'school-id', 'year-id', 'classroom-id', 'subject-id',
  'teacher-user-id', datetime('now'), datetime('now')
);
```

---

### Issue: "Student can't see assignments"

**Causes:**
1. Assignment not published (status = 'draft')
2. Student not enrolled in classroom
3. Frontend calling wrong endpoint

**Debugging:**
```sql
-- Check student enrollment
SELECT * FROM student_enrollments WHERE student_user_id = 'student-id';

-- Check published assignments
SELECT * FROM assignments WHERE status = 'published' AND classroom_id = 'classroom-id';
```

---

### Issue: "Download fails with 403"

**Causes:**
1. Assignment not published (students can't access drafts)
2. Wrong authorization token
3. Student trying to access different classroom's assignment

**Fix:** Ensure:
- Assignment status is 'published'
- User has valid JWT token
- Student is enrolled in the assignment's classroom

---

### Issue: "R2 file not found"

**Causes:**
1. File wasn't uploaded successfully
2. R2 key mismatch
3. File was deleted

**Debugging:**
```sql
-- Check attachment metadata
SELECT * FROM assignment_attachments WHERE assignment_id = 'assignment-id';

-- Check R2 key format
-- Should be: schools/{school-id}/assignments/{assignment-id}/{uuid}-{filename}
```

---

## ✅ **Success Criteria**

- [ ] Teacher can create assignments
- [ ] Teacher can upload attachments
- [ ] Teacher can publish assignments
- [ ] Teacher can see all their assignments
- [ ] Teacher can download attachments
- [ ] Students see only published assignments for their class
- [ ] Students can download attachments
- [ ] Files are stored in R2 with correct paths
- [ ] Authorization works (no unauthorized access)
- [ ] UI shows proper error messages

---

## 🚀 **Next Steps**

1. Apply the fixes above
2. Deploy frontend changes
3. Test each item in checklist
4. Mark issues as resolved
5. Document any remaining problems

