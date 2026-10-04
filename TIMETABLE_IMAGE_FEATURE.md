# 📅 Timetable Image Upload Feature

**Date**: January 19, 2026  
**Status**: ✅ DEPLOYED

---

## Overview

Simplified timetable management by allowing principals to upload timetable images instead of manual period-by-period entry.

---

## Features

### ✅ For Principals:
1. Select classroom and academic year
2. Upload timetable image (PNG/JPG, max 2MB)
3. Preview before upload
4. Automatically published when uploaded
5. Can replace/update existing timetable images

### ✅ For Teachers:
- View timetable images for classes they teach
- Download timetable images

### ✅ For Students:
- View timetable image for their enrolled classroom
- Download timetable images

---

## Implementation

### Database:
- ✅ Column `timetables.image_url` already exists
- Stores base64-encoded image data directly in SQLite
- No external storage (R2) required for simplicity

### Frontend Pages:

#### 1. Timetable Upload (`/timetable/upload`)
- Principal-only access
- Classroom selector (filtered by selected academic year)
- Drag-and-drop image upload
- Live preview
- Auto-generates timetable name (e.g., "11 A Timetable")
- Validates:
  - File type (PNG, JPG, JPEG)
  - File size (max 2MB)

#### 2. Timetable List (`/timetable`)
- Updated button: "Upload Timetable" instead of "New Timetable"
- Shows image icon for timetables with images

#### 3. Timetable Detail (`/timetable/:id`)
- Displays uploaded timetable image
- Download button
- Replace image button
- Publish/Archive actions

---

## Access Control

### Routes:
- `GET /timetables` - Principal, Teachers (for their classes), Students (their class)
- `POST /timetables` - Principal only
- `GET /timetables/:id` - Principal, Teachers (for their classes), Students (their class)
- `PATCH /timetables/:id` - Principal only

### UI Navigation:
- **Principal**: Full access from sidebar → Timetable
- **Teachers**: Will see timetable for their assigned classes
- **Students**: Will see timetable for their enrolled classroom

---

## Technical Details

### Image Storage:
```typescript
// Convert to base64
const reader = new FileReader();
reader.onloadend = () => {
  const base64 = reader.result as string; // data:image/png;base64,...
  // Store in database
};
reader.readAsDataURL(file);
```

### Size Limits:
- Max file size: 2MB (enforced in frontend)
- Recommended image dimensions: 1920x1080 or smaller
- Format: PNG, JPG, JPEG

### Viewing:
- Images display in responsive container
- Max height: 800px with object-fit: contain
- Download as PNG file

---

## Files Modified

### Frontend:
1. ✅ `apps/web/src/pages/TimetableUpload.tsx` - NEW (Image upload page)
2. ✅ `apps/web/src/pages/Timetable.tsx` - Updated button text
3. ✅ `apps/web/src/pages/TimetableDetail.tsx` - Simplified to show image
4. ✅ `apps/web/src/App.tsx` - Added /timetable/upload route

### Backend:
1. ✅ `apps/api/migrations/0003_add_timetable_image.sql` - Created (column already exists)
2. ⏳ No API changes needed - existing endpoints support `image_url` field

---

## Deployment

**Frontend:**
- **URL**: https://3fdf7dea.sms-web-34u.pages.dev
- **Status**: ✅ Live

**Backend:**
- No changes required
- Existing API endpoints handle `image_url` field

---

## Usage Instructions

### For Principals:

1. **Upload Timetable**:
   - Go to Timetable from sidebar
   - Click "Upload Timetable"
   - Select classroom
   - Upload image (PNG/JPG, max 2MB)
   - Click "Upload Timetable"
   - Timetable is automatically published

2. **Replace Timetable**:
   - Click on existing timetable
   - Click "Replace Image"
   - Upload new image

3. **Manage Status**:
   - Draft → Publish (makes it visible to teachers/students)
   - Published → Archive (hides from active view)

### For Teachers:
- View timetables for classes you teach
- Download timetable images

### For Students:
- View timetable for your enrolled class
- Download timetable image

---

## Next Steps (Future Enhancements)

### Optional Improvements:
1. **Teacher/Student Views**: Add dedicated timetable pages for teachers and students
2. **R2 Storage**: Migrate to Cloudflare R2 for larger images
3. **Image Optimization**: Auto-compress images before storage
4. **Multiple Timetables**: Allow multiple versions per class
5. **Notifications**: Notify teachers/students when timetable updated

---

## Testing Checklist

### Principal:
- [ ] Can access /timetable/upload
- [ ] Can select classroom
- [ ] Can upload image (PNG/JPG)
- [ ] Image preview works
- [ ] File size validation (>2MB shows error)
- [ ] Timetable appears in list after upload
- [ ] Can view uploaded timetable
- [ ] Can download timetable image
- [ ] Can replace existing timetable image
- [ ] Can publish/archive timetables

### Teachers (Future):
- [ ] Can view timetables for assigned classes
- [ ] Can download timetable images
- [ ] Cannot upload or edit timetables

### Students (Future):
- [ ] Can view timetable for enrolled class
- [ ] Can download timetable image
- [ ] Cannot upload or edit timetables

---

**Status**: ✅ Core feature deployed and ready for testing!
**Note**: Teacher and student timetable views need to be added to their respective dashboards
