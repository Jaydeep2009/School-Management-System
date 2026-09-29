# Timetable Image Upload - Deployment Notes

## STATUS: BLOCKED - Waiting for R2 Enablement

### ✅ Completed Steps:
1. Database migrations applied successfully:
   - ✅ 0002_timetables.sql (timetables table created)
   - ✅ 0003_timetable_images.sql (image_url column added)

### ❌ Blocked Steps:
1. **R2 Not Enabled** - Error code 10042
   - Visit: https://dash.cloudflare.com
   - Navigate to R2 section
   - Click "Enable R2" button
   - Complete any required setup steps

2. **R2 Bucket Creation** - Depends on step 1
   ```bash
   wrangler r2 bucket create sms-storage
   ```

### Next Steps (After R2 is Enabled):

1. Enable R2 in Cloudflare dashboard
2. Create R2 bucket: `wrangler r2 bucket create sms-storage`
3. Deploy API: `cd apps/api && wrangler deploy`
4. Deploy frontend (see below)

## Deploy API

```bash
cd apps/api
wrangler deploy
```

## Deploy Frontend

```bash
cd apps/web
npm run build
cd ../..
wrangler pages deploy apps/web/dist --project-name=sms-web
```

## Verification

After deployment:
1. Log in as Principal
2. Go to Timetable → Select a timetable
3. Upload a timetable image (JPEG, PNG, or WebP, max 5MB)
4. Verify image appears in principal view
5. Log in as Teacher assigned to that classroom
6. Verify image is visible (read-only)
7. Log in as Student enrolled in that classroom  
8. Verify image is visible (read-only)
