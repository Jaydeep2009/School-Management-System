# R2 Testing Guide

Quick guide to test R2 storage is working correctly.

---

## ✅ **Status: R2 is Deployed!**

Your API deployment shows:
```
env.STORAGE              R2 Bucket      
  sms-storage
```

**Deployment ID**: `7b0aaf72-18e1-4e39-8b70-53cc7fcddb85`

---

## 🧪 **Test 1: Upload Assignment Attachment**

### Prerequisites:
1. You need to be logged in as **Principal** or **Teacher**
2. Have a valid JWT token
3. Have an existing assignment ID

### Step 1: Get Your JWT Token

Log in via the web app and copy your token from browser storage:
```javascript
// In browser console (F12)
localStorage.getItem('token')
```

Or use the API:
```bash
curl -X POST https://sms-api.nmvpmsms.workers.dev/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "login_id": "your_login_id",
    "password": "your_password"
  }'
```

### Step 2: Create a Test Assignment (if needed)

```bash
curl -X POST https://sms-api.nmvpmsms.workers.dev/assignments \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "classroom_id": "YOUR_CLASSROOM_ID",
    "subject_id": "YOUR_SUBJECT_ID",
    "title": "Test Assignment for R2",
    "description": "Testing file upload to R2 storage"
  }'
```

**Response:**
```json
{
  "data": {
    "id": "assignment-123",
    "title": "Test Assignment for R2",
    "status": "draft",
    ...
  }
}
```

**Save the `assignment-123` ID!**

### Step 3: Upload a File

Create a test PDF or use any file:
```bash
# Create a test file
echo "This is a test assignment file" > test-assignment.txt

# Upload to R2
curl -X POST https://sms-api.nmvpmsms.workers.dev/assignments/assignment-123/attachments \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "file=@test-assignment.txt"
```

**Expected Response:**
```json
{
  "data": {
    "id": "attachment-456",
    "file_name": "test-assignment.txt",
    "content_type": "text/plain",
    "size_bytes": 34,
    "created_at": 1726761600000
  }
}
```

✅ **Success!** Your file is now in R2.

### Step 4: Verify in Cloudflare Dashboard

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Click **R2** in the left sidebar
3. Click on **sms-storage** bucket
4. Navigate to: `schools/{your-school-id}/assignments/{assignment-id}/`
5. You should see your uploaded file!

**File path format:**
```
schools/school-abc123/assignments/assignment-123/uuid-test-assignment.txt
```

### Step 5: Download the File

```bash
curl https://sms-api.nmvpmsms.workers.dev/assignments/assignment-123/attachments/attachment-456 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -o downloaded-file.txt

# Verify content
cat downloaded-file.txt
```

**Expected:** Same content as the uploaded file.

---

## 🧪 **Test 2: Upload Timetable Image**

If you have the timetable feature enabled:

### Upload Timetable Image:
```bash
curl -X POST https://sms-api.nmvpmsms.workers.dev/timetables/timetable-123/image \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "file=@timetable.jpg"
```

**Expected Response:**
```json
{
  "data": {
    "filename": "1726761600000.jpg",
    "size": 245678
  }
}
```

### Download Timetable Image:
```bash
curl https://sms-api.nmvpmsms.workers.dev/timetables/timetable-123/image/1726761600000.jpg \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -o downloaded-timetable.jpg
```

---

## 🧪 **Test 3: Check R2 Storage Usage**

### View All Files in Your School:

```bash
# This would require adding a debug endpoint (optional)
curl https://sms-api.nmvpmsms.workers.dev/debug/r2-stats \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Or check in Cloudflare Dashboard:**
1. Go to R2 → sms-storage
2. Click **Metrics** tab
3. View:
   - Objects stored
   - Storage used
   - Request count

---

## 🧪 **Test 4: Delete Attachment**

### Delete the test file:
```bash
curl -X DELETE https://sms-api.nmvpmsms.workers.dev/assignments/assignment-123/attachments/attachment-456 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Expected Response:**
```json
{
  "message": "Attachment deleted successfully"
}
```

### Verify Deletion:
1. Try to download again (should fail with 404)
2. Check R2 Dashboard (file should be gone)

---

## ✅ **Test Checklist**

- [ ] Upload assignment attachment
- [ ] View file in R2 Dashboard
- [ ] Download attachment via API
- [ ] Verify correct content type
- [ ] Delete attachment
- [ ] Verify file removed from R2
- [ ] Test with different file types (PDF, PNG, DOCX)
- [ ] Test file size limits (max 50MB)
- [ ] Test unauthorized access (should fail)
- [ ] Test cross-school access (should fail)

---

## 🐛 **Common Issues**

### Issue: "STORAGE is not defined"

**Solution:** R2 binding not properly deployed.
```bash
cd apps/api
npm run deploy
```

Check output for:
```
env.STORAGE              R2 Bucket      
  sms-storage
```

### Issue: "Bucket not found"

**Solution:** Bucket name mismatch.
1. Check bucket name in Cloudflare Dashboard
2. Update `wrangler.jsonc` if needed
3. Redeploy

### Issue: "Upload failed"

**Possible causes:**
- File too large (>50MB)
- Invalid file type
- Not authorized (need to be principal/teacher)
- Assignment is published (can only upload to drafts)

### Issue: "Cannot download file"

**Possible causes:**
- File doesn't exist in R2 (check dashboard)
- Wrong attachment ID
- User not authorized
- Assignment not published (students can't access drafts)

---

## 📊 **Expected File Structure in R2**

After testing, your R2 bucket should look like:

```
sms-storage/
├── schools/
│   └── {school-id}/
│       └── assignments/
│           ├── {assignment-1}/
│           │   ├── {uuid}-homework.pdf
│           │   └── {uuid}-worksheet.docx
│           └── {assignment-2}/
│               └── {uuid}-test.txt
└── timetables/
    └── {school-id}/
        └── {timetable-id}/
            └── {timestamp}.jpg
```

**Security verified:**
- ✅ Files grouped by school ID (isolation)
- ✅ UUIDs prevent collisions
- ✅ No public access (all via API)
- ✅ Original filenames preserved (but sanitized)

---

## 🎯 **Production Checklist**

Before going live with assignment attachments:

- [ ] R2 bucket created (`sms-storage`)
- [ ] Bucket is **private** (not public)
- [ ] R2 binding deployed and working
- [ ] Test upload successful
- [ ] Test download successful
- [ ] Test deletion successful
- [ ] Verify file size limits (50MB)
- [ ] Verify allowed file types (PDF, images, docs)
- [ ] Test authorization (only assigned teachers)
- [ ] Test student access (only published assignments)
- [ ] Monitor R2 metrics in dashboard
- [ ] Set up billing alerts (optional)

---

## 💡 **Tips**

1. **File Types**: Stick to common types (PDF, DOCX, JPG, PNG)
2. **File Size**: Keep under 10MB for faster uploads
3. **Naming**: Use descriptive filenames (e.g., "Chapter5-Homework.pdf")
4. **Testing**: Test with various file types before production
5. **Monitoring**: Check R2 metrics weekly for usage trends

---

## 📝 **Notes**

- **Free Tier**: You get 10GB storage + 1M writes + 10M reads FREE per month
- **No Egress Fees**: Downloading files is always FREE (unlike S3)
- **Global CDN**: Files are automatically distributed via Cloudflare's network
- **Private by Default**: All files require authentication to access
- **School Isolation**: Each school's files are separate and secure

---

**Your R2 storage is ready! Start uploading assignment attachments.** 🚀

For detailed API documentation, see `ASSIGNMENTS.md`.

