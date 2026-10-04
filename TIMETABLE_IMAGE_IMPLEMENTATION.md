# 📅 Timetable Image Upload Implementation Plan

**Date**: January 19, 2026  
**Status**: 🎯 READY TO IMPLEMENT

---

## Overview

Simplify timetable management by allowing principals to upload timetable images instead of manual period-by-period entry.

---

## Requirements

### Access Control:
- **Principal**: Upload/update timetable images for any class
- **Teachers**: View timetable for classes they teach
- **Class Teacher**: View timetable for their class
- **Students**: View timetable for their enrolled class

### Workflow:
1. Principal selects classroom + academic year
2. Principal uploads timetable image (PNG/JPG)
3. Image is stored and associated with the classroom
4. All authorized users (teachers in that class + students) can view the timetable image

---

## Database Schema

✅ **Already exists**: `timetables.image_url` column (TEXT, nullable)

```sql
-- Column already added
ALTER TABLE timetables ADD COLUMN image_url TEXT;
```

---

## Implementation Steps

### 1. Backend (API)

#### Option A: Use Cloudflare R2 Storage
- Setup R2 bucket for timetable images
- Add R2 binding to wrangler.jsonc
- Create image upload endpoint: `POST /timetables/:id/image`
- Return public R2 URL

#### Option B: Use Base64 Data URLs (Simple)
- Store base64-encoded image directly in `image_url` column
- No external storage needed
- Simpler implementation

**Recommended**: Option B for simplicity (can migrate to R2 later if needed)

### 2. Frontend

#### Timetable Upload Page (`/timetable/new` or `/timetable/:id/edit`):
```
1. Select Classroom (dropdown)
2. Upload Image (drag & drop or file picker)
3. Preview uploaded image
4. Save
```

#### Timetable View Page:
```
- Display uploaded timetable image
- Add zoom controls for better viewing
- Download button
```

### 3. API Endpoints

**Existing endpoints** (just need to handle `image_url`):
- `POST /timetables` - Create timetable with image
- `PATCH /timetables/:id` - Update timetable image
- `GET /timetables/:id` - Get timetable (includes image_url)

**Permissions**:
- Principal: Full CRUD
- Teachers: Read-only (for classes they teach)
- Students: Read-only (for their enrolled class)

---

## File Changes Needed

### Backend:
1. ✅ Migration already applied (`image_url` column exists)
2. Update `timetable.service.ts` - handle image_url in create/update
3. Update `timetable.routes.ts` - add authorization for viewing

### Frontend:
1. **TimetableForm.tsx** - Add image upload field
2. **TimetableDetail.tsx** - Display image with zoom
3. **Teacher/Student timetable views** - Show image

---

## Image Upload Implementation (Base64)

```typescript
// Frontend: Convert image to base64
const handleImageUpload = async (file: File) => {
  const reader = new FileReader();
  reader.onloadend = () => {
    const base64 = reader.result as string;
    setImageUrl(base64); // Store in state
  };
  reader.readAsDataURL(file);
};

// API: Store in database
await db.prepare(`
  UPDATE timetables 
  SET image_url = ?, updated_at = ?
  WHERE id = ? AND school_id = ?
`).bind(imageUrl, Date.now(), id, schoolId).run();
```

---

## Next Steps

1. ✅ Database column verified
2. ⏳ Update TimetableForm for image upload
3. ⏳ Update TimetableDetail to show image
4. ⏳ Add teacher/student timetable view pages
5. ⏳ Test with different image sizes
6. ⏳ Deploy

---

## Considerations

### Image Size Limits:
- Base64 in SQLite: Recommended max 1-2MB
- For larger images, should use R2 storage

### Image Format:
- Support: PNG, JPG, JPEG
- Validate file type on upload
- Consider image compression

### Mobile Viewing:
- Ensure images are responsive
- Add pinch-to-zoom for mobile users

---

**Status**: Ready to implement - do you want me to proceed with the implementation?
