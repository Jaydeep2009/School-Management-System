# Cloudflare Deployment Setup Guide

## Current Status
✅ Code committed to git  
⏳ Cloudflare account connection in progress  

## Step-by-Step Deployment Instructions

### 1. Login to Cloudflare (In Progress)

The browser should have opened automatically. If not, open this URL:
```
https://dash.cloudflare.com/oauth2/auth?...
```

**What to do**:
1. The browser window should have opened
2. Login with your Cloudflare account credentials
3. Click "Authorize" to grant Wrangler access
4. Browser will show "Successfully logged in"
5. Return to terminal

**If browser didn't open**:
- Copy the URL from the terminal output
- Open it manually in your browser
- Complete the authorization

### 2. Create D1 Database

Once logged in, create the production database:

```powershell
cd apps/api
npx wrangler d1 create sms-production-db
```

This will output something like:
```
✅ Successfully created DB 'sms-production-db'!

[[d1_databases]]
binding = "DB"
database_name = "sms-production-db"
database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
```

**IMPORTANT**: Copy the `database_id` value!

### 3. Update wrangler.jsonc

Open `apps/api/wrangler.jsonc` and update the database configuration:

**Before** (local dev):
```jsonc
{
  "compatibility_date": "2024-01-01",
  "main": "src/index.ts",
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "sms-local-db",
      "database_id": "local-db-id"
    }
  ]
}
```

**After** (production):
```jsonc
{
  "compatibility_date": "2024-01-01",
  "main": "src/index.ts",
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "sms-production-db",
      "database_id": "YOUR-ACTUAL-DATABASE-ID-HERE"  // Replace with the ID from step 2
    }
  ]
}
```

### 4. Run Database Migrations

Execute the schema migration to create all tables:

```powershell
cd apps/api
npx wrangler d1 execute sms-production-db --remote --file=../../schema-reference/migrations/0001_init.sql
```

This will create all required tables in your Cloudflare D1 database.

**Verify migration success**:
```powershell
npx wrangler d1 execute sms-production-db --remote --command="SELECT name FROM sqlite_master WHERE type='table';"
```

You should see a list of all tables created.

### 5. Set Environment Variables

Create secrets for sensitive data:

```powershell
cd apps/api

# JWT Secret (generate a strong random string)
npx wrangler secret put JWT_SECRET
# When prompted, enter a strong random string (32+ characters)

# Super Admin Password
npx wrangler secret put SUPER_ADMIN_PASSWORD
# When prompted, enter your desired super admin password
```

### 6. Deploy the API

Deploy your Worker to Cloudflare:

```powershell
cd apps/api
npm run deploy
```

Or manually:
```powershell
npx wrangler deploy
```

**Expected output**:
```
✨ Compiled Worker successfully
✨ Uploading script...
✨ Deployment complete!
🌍 https://sms-api.YOUR-SUBDOMAIN.workers.dev
```

### 7. Test the Deployment

Test the API endpoint:

```powershell
# Test health endpoint
curl https://sms-api.YOUR-SUBDOMAIN.workers.dev/health

# Test super admin login
curl -X POST https://sms-api.YOUR-SUBDOMAIN.workers.dev/super-admin/login `
  -H "Content-Type: application/json" `
  -d '{"password":"YOUR-SUPER-ADMIN-PASSWORD"}'
```

### 8. Configure Frontend

Update the frontend to point to your deployed API:

**apps/web/src/services/api.ts**:
```typescript
// Before (local dev)
const API_BASE_URL = 'http://localhost:8787';

// After (production)
const API_BASE_URL = 'https://sms-api.YOUR-SUBDOMAIN.workers.dev';
```

Or use environment variables:
```typescript
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8787';
```

Then create **apps/web/.env.production**:
```
VITE_API_URL=https://sms-api.YOUR-SUBDOMAIN.workers.dev
```

### 9. Deploy Frontend (Optional - Cloudflare Pages)

If you want to deploy the frontend to Cloudflare Pages:

```powershell
cd apps/web

# Build the frontend
npm run build

# Deploy to Pages
npx wrangler pages deploy dist --project-name=sms-web
```

**Or connect via GitHub**:
1. Go to Cloudflare Dashboard → Pages
2. Click "Create a project"
3. Connect your GitHub repository
4. Set build settings:
   - Framework preset: Vite
   - Build command: `cd apps/web && npm install && npm run build`
   - Build output directory: `apps/web/dist`
   - Root directory: `/`
5. Add environment variable: `VITE_API_URL=https://sms-api.YOUR-SUBDOMAIN.workers.dev`

## Configuration Files Reference

### wrangler.jsonc (Production Ready)
```jsonc
{
  "$schema": "https://developers.cloudflare.com/workers/wrangler/configuration/",
  "name": "sms-api",
  "compatibility_date": "2024-01-01",
  "main": "src/index.ts",
  
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "sms-production-db",
      "database_id": "YOUR-DATABASE-ID"
    }
  ],

  "triggers": {
    "crons": [
      "0 1 * * *",  // Attendance stats at 1 AM UTC
      "0 2 * * *",  // Marks stats at 2 AM UTC
      "0 6 * * *",  // Birthday digest at 6 AM UTC
      "0 8 * * *"   // Fee reminders at 8 AM UTC
    ]
  },

  "observability": {
    "enabled": true
  }
}
```

### .env.production (Frontend)
```
VITE_API_URL=https://sms-api.YOUR-SUBDOMAIN.workers.dev
```

## Deployment Checklist

- [ ] 1. Login to Cloudflare account via `npx wrangler login`
- [ ] 2. Create D1 database: `npx wrangler d1 create sms-production-db`
- [ ] 3. Copy database_id from output
- [ ] 4. Update `apps/api/wrangler.jsonc` with actual database_id
- [ ] 5. Run migrations: `npx wrangler d1 execute sms-production-db --remote --file=...`
- [ ] 6. Set JWT_SECRET: `npx wrangler secret put JWT_SECRET`
- [ ] 7. Set SUPER_ADMIN_PASSWORD: `npx wrangler secret put SUPER_ADMIN_PASSWORD`
- [ ] 8. Deploy API: `npm run deploy` from apps/api
- [ ] 9. Test API endpoint in browser
- [ ] 10. Update frontend API_BASE_URL
- [ ] 11. Build frontend: `npm run build` from apps/web
- [ ] 12. Deploy frontend to Cloudflare Pages (optional)

## Common Issues & Solutions

### Issue: "Database not found"
**Solution**: Make sure you created the D1 database and updated wrangler.jsonc with the correct database_id.

### Issue: "Authentication failed"
**Solution**: Check that JWT_SECRET is set as a secret, not in wrangler.jsonc.

### Issue: "CORS errors in frontend"
**Solution**: API automatically handles CORS. Make sure you're using the correct API URL (https, not http).

### Issue: "Cron jobs not running"
**Solution**: Cron triggers only work on paid Workers plans. For testing, use the Cloudflare Dashboard to manually trigger.

### Issue: "Migrations failed"
**Solution**: Check the SQL file path is correct. Make sure you're using `--remote` flag for production database.

## Monitoring & Logs

### View Worker Logs
```powershell
npx wrangler tail
```

### View D1 Database
```powershell
# List all rows in a table
npx wrangler d1 execute sms-production-db --remote --command="SELECT * FROM schools LIMIT 10;"

# Check cron job history
npx wrangler d1 execute sms-production-db --remote --command="SELECT * FROM audit_logs WHERE action LIKE 'cron_%' ORDER BY created_at DESC LIMIT 20;"
```

### Cloudflare Dashboard
- Workers Dashboard: https://dash.cloudflare.com → Workers & Pages
- D1 Dashboard: https://dash.cloudflare.com → D1
- Analytics: View request metrics, error rates, and performance

## Next Steps After Deployment

1. **Create First School**:
   - Login as Super Admin
   - Go to Schools → Create School
   - Provision Principal account

2. **Test All Features**:
   - Login as Principal
   - Create Academic Year
   - Create Classrooms
   - Import Students via Excel
   - Assign Teachers to subjects
   - Test all dashboards

3. **Set Up Monitoring**:
   - Enable Cloudflare Analytics
   - Set up alerts for errors
   - Monitor D1 database size

4. **Security Hardening**:
   - Use custom domain with SSL
   - Enable rate limiting if needed
   - Review audit logs regularly

---

**Status**: Ready for deployment  
**Estimated Time**: 10-15 minutes  
**Prerequisites**: Cloudflare account (free or paid)
