# Deployment Verification Checklist

## 1. Check Deployment Status

After `npm run deploy` completes, you should see:
```
✨ Compiled Worker successfully
✨ Uploading script...
✨ Deployment complete!
🌍 https://sms-api.XXXXXXX.workers.dev
```

Copy your Worker URL: `_____________________________`

## 2. Verify API Health

Test the health endpoint:

```powershell
# Using curl (if available)
curl https://YOUR-WORKER-URL.workers.dev/health

# Using PowerShell
Invoke-RestMethod -Uri "https://YOUR-WORKER-URL.workers.dev/health"
```

**Expected Response**:
```json
{
  "status": "ok",
  "timestamp": "2026-09-19T..."
}
```

## 3. Verify Database Connection

Test that the API can connect to D1:

```powershell
# Check if any schools exist (should be empty initially)
Invoke-RestMethod -Uri "https://YOUR-WORKER-URL.workers.dev/super-admin/schools" `
  -Method GET
```

This should return an authentication error (401) which is correct - it means the API is working!

## 4. Test Super Admin Login

```powershell
# Replace with your actual super admin password
$body = @{
    password = "YOUR-SUPER-ADMIN-PASSWORD"
} | ConvertTo-Json

$response = Invoke-RestMethod -Uri "https://YOUR-WORKER-URL.workers.dev/super-admin/login" `
  -Method POST `
  -Body $body `
  -ContentType "application/json"

# Save the token
$token = $response.data.access_token
Write-Host "Token: $token"
```

**Expected Response**:
```json
{
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "super-admin",
      "role": "super_admin"
    }
  }
}
```

## 5. Verify Cron Jobs Configuration

Check the Cloudflare Dashboard:
1. Go to https://dash.cloudflare.com
2. Navigate to Workers & Pages → sms-api
3. Click on "Triggers" tab
4. You should see 4 cron triggers:
   - `0 1 * * *` - Attendance stats (1 AM UTC)
   - `0 2 * * *` - Marks stats (2 AM UTC)
   - `0 6 * * *` - Birthday digest (6 AM UTC)
   - `0 8 * * *` - Fee reminders (8 AM UTC)

## 6. Check Database Tables

Verify all tables were created:

```powershell
cd apps/api
npx wrangler d1 execute sms-production-db --remote --command="SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;"
```

**Expected Tables** (should see all these):
- academic_years
- assignments
- assignment_submissions
- assessments
- attendance_sessions
- attendance_entries
- audit_logs
- classrooms
- enrollments
- fee_categories
- fee_charges
- fee_payments
- marks
- profiles
- promotion_batches
- promotion_entries
- schools
- school_settings
- subjects
- teaching_assignments
- timetable_schedules
- users

## 7. Test Creating a School (Super Admin)

```powershell
# Using the token from step 4
$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
}

$schoolData = @{
    school_code = "TEST001"
    school_name = "Test School"
    school_display_name = "Test School"
    address = "123 Test St"
    contact_email = "admin@testschool.com"
    contact_phone = "1234567890"
} | ConvertTo-Json

$school = Invoke-RestMethod -Uri "https://YOUR-WORKER-URL.workers.dev/super-admin/schools" `
  -Method POST `
  -Headers $headers `
  -Body $schoolData

Write-Host "School Created: $($school.data.id)"
```

## 8. Verify Import Jobs Table

Check that import_jobs table exists for Excel imports:

```powershell
npx wrangler d1 execute sms-production-db --remote --command="SELECT sql FROM sqlite_master WHERE type='table' AND name='import_jobs';"
```

## 9. Test D1 Write Operations

Insert a test record and verify:

```powershell
# Insert test school setting
npx wrangler d1 execute sms-production-db --remote --command="
INSERT INTO school_settings (id, school_id, key, value, created_at, updated_at)
VALUES ('test-1', 'test-school', 'test_key', 'test_value', datetime('now'), datetime('now'));
"

# Verify it was inserted
npx wrangler d1 execute sms-production-db --remote --command="
SELECT * FROM school_settings WHERE id='test-1';
"

# Clean up test data
npx wrangler d1 execute sms-production-db --remote --command="
DELETE FROM school_settings WHERE id='test-1';
"
```

## 10. Check Worker Logs

View real-time logs:

```powershell
cd apps/api
npx wrangler tail
```

Then make a request to your API in another terminal. You should see logs appear.

## Common Issues & Solutions

### Issue: 401 Unauthorized on all endpoints
**Cause**: JWT_SECRET not set or incorrect  
**Solution**: 
```powershell
npx wrangler secret put JWT_SECRET
# Enter a strong random string (32+ characters)
npm run deploy  # Redeploy
```

### Issue: "Database not found" error
**Cause**: Database binding incorrect in wrangler.jsonc  
**Solution**: Verify database_id matches the one from `wrangler d1 create`

### Issue: Super admin login fails
**Cause**: SUPER_ADMIN_PASSWORD not set  
**Solution**:
```powershell
npx wrangler secret put SUPER_ADMIN_PASSWORD
# Enter your desired password
npm run deploy
```

### Issue: CORS errors from frontend
**Cause**: API URL incorrect or not accessible  
**Solution**: 
- Verify Worker URL is correct (https, not http)
- Check browser console for actual error
- API already has CORS headers configured

### Issue: Cron jobs not visible
**Cause**: Free plan limitation or config error  
**Solution**: 
- Cron triggers require Workers Paid plan ($5/month)
- For testing, manually trigger via Dashboard
- Or test individual cron handler functions directly

### Issue: Tables not created
**Cause**: Migration not run or failed  
**Solution**:
```powershell
# Run migration again
npx wrangler d1 execute sms-production-db --remote --file=../../schema-reference/migrations/0001_init.sql

# Check for errors in output
```

## Production Readiness Checklist

- [ ] API deployed successfully
- [ ] Health endpoint returns 200
- [ ] Super admin login works
- [ ] JWT_SECRET set as secret (not in vars)
- [ ] SUPER_ADMIN_PASSWORD set as secret
- [ ] All database tables created (22 tables)
- [ ] Can create a test school
- [ ] Cron triggers configured (if on paid plan)
- [ ] Worker logs accessible via `wrangler tail`
- [ ] R2 bucket created (for attachments)
- [ ] Custom domain configured (optional)

## Next Steps

Once all checks pass:

1. **Update Frontend Configuration**:
   ```typescript
   // apps/web/src/services/api.ts
   const API_BASE_URL = 'https://YOUR-WORKER-URL.workers.dev';
   ```

2. **Build and Deploy Frontend**:
   ```powershell
   cd apps/web
   npm run build
   npx wrangler pages deploy dist --project-name=sms-web
   ```

3. **Create Your First School**:
   - Login as Super Admin
   - Create a school
   - Provision Principal
   - Test the full flow

4. **Monitor in Production**:
   - Check Cloudflare Dashboard regularly
   - Monitor request metrics
   - Review audit logs
   - Set up alerts for errors

---

**Deployment Date**: _________________  
**Worker URL**: _________________  
**Frontend URL** (if deployed): _________________  
**Status**: ⏳ Verification in progress
