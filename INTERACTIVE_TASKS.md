# 🎯 Interactive Task Management
**School Management System**  
**Last Updated**: September 19, 2026

---

## 📋 How to Use This File

This file contains **clickable task commands** that you can run directly from VS Code or your terminal.

### Running Tasks

#### Option 1: VS Code Task Runner
1. Press `Ctrl+Shift+P` (Windows) or `Cmd+Shift+P` (Mac)
2. Type "Tasks: Run Task"
3. Select the task you want to run

#### Option 2: Terminal (Copy-Paste)
Copy the command and paste it into your PowerShell terminal

#### Option 3: Create VS Code tasks.json
This file structure can be converted to `.vscode/tasks.json` for one-click execution

---

## 🚨 CRITICAL TASKS (Do These First)

### TASK-001: Debug Student API 404 Error
**Priority**: P0 (BLOCKING)  
**Status**: ❌ TODO  
**Estimated Time**: 2-4 hours

**Problem**: `GET /students/me` returns 404 (Student not found)

**Steps to Debug**:
```powershell
# 1. Check student data in database
wrangler d1 execute sms-production-db --command="SELECT * FROM users WHERE username LIKE 'S%' LIMIT 5;"

# 2. Check student profiles
wrangler d1 execute sms-production-db --command="SELECT * FROM student_profiles LIMIT 5;"

# 3. Check enrollments
wrangler d1 execute sms-production-db --command="SELECT * FROM enrollments WHERE status='active' LIMIT 5;"

# 4. Check specific student (replace with actual user_id from JWT)
wrangler d1 execute sms-production-db --command="SELECT sp.*, e.*, c.classroom_code FROM student_profiles sp LEFT JOIN enrollments e ON sp.user_id = e.student_id LEFT JOIN classrooms c ON e.classroom_id = c.id WHERE sp.user_id='<USER_ID>';"

# 5. Check API logs
wrangler tail --format=pretty
```

**Files to Check**:
- `apps/api/src/students/student.repository.ts` (line ~50, findByUserId function)
- `apps/api/src/students/student-me.routes.ts` (line ~23, GET /students/me endpoint)

**Fix Actions**:
1. Add logging to findByUserId function
2. Verify JWT token parsing
3. Check enrollment status and academic year
4. Ensure all LEFT JOINs are correct

**Test After Fix**:
```powershell
# Test student login and profile access
cd apps/web
npm run dev
# Login as student, navigate to Profile page
```

---

### TASK-002: Debug Fee Payment Validation Error
**Priority**: P0 (BLOCKING)  
**Status**: ❌ TODO  
**Estimated Time**: 2-4 hours

**Problem**: `POST /fees/payments` returns 400 (Validation error)

**Steps to Debug**:
```powershell
# 1. Check payment schema
code apps/api/src/fees/fees.schemas.ts

# 2. Check request payload (open browser DevTools, Network tab, copy request payload)
# Expected format:
# {
#   "student_id": "string",
#   "academic_year_id": "string",
#   "charge_ids": ["string"],
#   "amount": 100,  // NUMBER, not string
#   "payment_method": "cash",  // Must be: cash, upi, bank_transfer, or check
#   "payment_date": "2026-09-19",
#   "receipt_number": "REC001",
#   "remarks": "Payment for tuition"
# }

# 3. Check fees routes for error logging
code apps/api/src/fees/fees.routes.ts

# 4. Test API directly with curl
curl -X POST https://sms-api.nmvpmsms.workers.dev/fees/payments `
  -H "Content-Type: application/json" `
  -H "Authorization: Bearer <JWT_TOKEN>" `
  -d '{
    "student_id": "test123",
    "academic_year_id": "year123",
    "charge_ids": ["charge123"],
    "amount": 100,
    "payment_method": "cash",
    "payment_date": "2026-09-19",
    "receipt_number": "REC001"
  }'
```

**Files to Check**:
- `apps/api/src/fees/fees.schemas.ts` (payment validation schema)
- `apps/api/src/fees/fees.routes.ts` (POST /fees/payments endpoint)
- `apps/web/src/pages/Fees.tsx` (payment submission code)

**Fix Actions**:
1. Add detailed validation error logging
2. Ensure amount is sent as number, not string
3. Verify payment_method enum values match
4. Check charge_ids array format

**Test After Fix**:
```powershell
cd apps/web
npm run dev
# Login as principal, go to Fees page, record a payment
```

---

### TASK-003: Fix Teachers Academic Year Filter
**Priority**: P0 (DATA LEAKAGE)  
**Status**: ❌ TODO  
**Estimated Time**: 5 minutes

**Problem**: Teachers page shows all teachers from all years

**Quick Fix**:
```powershell
# Open the file
code apps/web/src/pages/Teachers.tsx

# Add these lines after line 39 (inside loadTeachers function):
# if (selectedYear?.id) {
#   filters.academic_year_id = selectedYear.id;
# }
```

**Exact Code to Add** (in Teachers.tsx, line ~39):
```typescript
const loadTeachers = async () => {
  try {
    setIsLoading(true);
    setError(null);
    const filters: Record<string, string> = {};
    if (statusFilter !== 'all') {
      filters.status = statusFilter;
    }
    // 👇 ADD THESE 3 LINES 👇
    if (selectedYear?.id) {
      filters.academic_year_id = selectedYear.id;
    }
    // 👆 ADD THESE 3 LINES 👆
    const response = await apiService.getTeachers(filters);
    setTeachers(response.data || response);
  } catch (err) {
    setError(err instanceof Error ? err.message : 'Failed to load teachers');
  } finally {
    setIsLoading(false);
  }
};
```

**Deploy After Fix**:
```powershell
cd apps/web
npm run build
wrangler pages deploy dist --project-name=sms-web
```

**Test After Fix**:
- Login as principal
- Select academic year 2023-2024
- Navigate to Teachers page
- Verify only 2023-2024 teachers shown
- Switch to 2024-2025
- Verify teachers list updates

---

### TASK-004: Enable R2 Storage
**Priority**: P1 (HIGH)  
**Status**: ❌ TODO  
**Estimated Time**: 30 minutes

**Problem**: File uploads broken (R2 binding commented out)

**Steps**:
```powershell
# 1. Create R2 bucket
# Go to: https://dash.cloudflare.com/
# Navigate to: R2 > Create bucket
# Name: sms-uploads
# Location: Automatic
# Click: Create bucket

# 2. Edit wrangler config
code apps/api/wrangler.jsonc

# 3. Uncomment lines 24-30:
# [[r2_buckets]]
# binding = "UPLOADS"
# bucket_name = "sms-uploads"

# 4. Deploy API
cd apps/api
wrangler deploy

# 5. Test file upload
cd ../web
npm run dev
# Login as teacher, create assignment, upload file
```

**Files to Edit**:
- `apps/api/wrangler.jsonc` (uncomment lines 24-30)

**Test After Fix**:
- Create assignment with file attachment
- Verify file appears in assignments list
- Download file from student view
- Check R2 dashboard shows file: https://dash.cloudflare.com/

---

## 📅 HIGH PRIORITY TASKS

### TASK-005: Rewrite Fees List UI
**Priority**: P1 (HIGH)  
**Status**: ❌ TODO  
**Estimated Time**: 4 hours

**Problem**: Multiple rows per student (confusing)

**Implementation**:
```powershell
# 1. Open fees page
code apps/web/src/pages/Fees.tsx

# 2. Rewrite groupChargesByStudent function
# Group all charges by student
# Show one row per student with:
#   - Student name
#   - Student code
#   - Total charged (sum of all charges)
#   - Total paid (from first charge, not sum)
#   - Balance (charged - paid)
#   - Status badge (Paid/Partial/Pending)
# Click row to expand and see individual charges

# 3. Test locally
cd apps/web
npm run dev

# 4. Deploy when working
npm run build
wrangler pages deploy dist --project-name=sms-web
```

**Reference Implementation**:
See `BUG_FIX_SUMMARY_20260928.md` for grouping logic

---

### TASK-006: Implement Password Reset
**Priority**: P1 (HIGH)  
**Status**: ❌ TODO  
**Estimated Time**: 8 hours

**Implementation**:
```powershell
# 1. Create database migration
code apps/api/migrations/0002_password_reset.sql

# Add:
# CREATE TABLE password_reset_tokens (
#   id TEXT PRIMARY KEY,
#   user_id TEXT NOT NULL,
#   token_hash TEXT NOT NULL,
#   expires_at INTEGER NOT NULL,
#   used_at INTEGER,
#   created_at INTEGER DEFAULT (unixepoch()),
#   FOREIGN KEY (user_id) REFERENCES users(id)
# );

# 2. Create password reset service
code apps/api/src/auth/password-reset.service.ts

# 3. Add routes
code apps/api/src/auth/auth.routes.ts
# Add: POST /auth/forgot-password
# Add: POST /auth/reset-password

# 4. Create frontend pages
code apps/web/src/pages/ForgotPassword.tsx
code apps/web/src/pages/ResetPassword.tsx

# 5. Add routes
code apps/web/src/App.tsx

# 6. Run migration
wrangler d1 execute sms-production-db --file=apps/api/migrations/0002_password_reset.sql

# 7. Deploy
cd apps/api
wrangler deploy
cd ../web
npm run build
wrangler pages deploy dist --project-name=sms-web
```

---

### TASK-007: Enforce Attendance Edit Window
**Priority**: P1 (SECURITY)  
**Status**: ❌ TODO  
**Estimated Time**: 2 hours

**Implementation**:
```powershell
# 1. Edit attendance service
code apps/api/src/attendance/attendance.service.ts

# Add validation function:
# function validateEditWindow(attendanceDate: string, userRole: string) {
#   if (userRole === 'principal') return; // Principals can edit anytime
#   const now = new Date();
#   const date = new Date(attendanceDate);
#   const hoursDiff = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
#   if (hoursDiff > 48) {
#     throw new Error('Edit window expired (48 hours). Contact principal.');
#   }
# }

# 2. Call in updateAttendance function

# 3. Test
cd apps/api
npm test

# 4. Deploy
wrangler deploy
```

---

### TASK-008: Build Teacher "My Teaching" Page
**Priority**: P1 (HIGH)  
**Status**: ❌ TODO  
**Estimated Time**: 6 hours

**Implementation**:
```powershell
# 1. Create API endpoint
code apps/api/src/accounts/me.routes.ts
# Add: GET /me/teaching (return teacher's assignments)

# 2. Create frontend page
code apps/web/src/pages/TeacherMyTeaching.tsx

# 3. Add route
code apps/web/src/App.tsx

# 4. Add nav link
code apps/web/src/components/layout/Layout.tsx

# 5. Deploy
cd apps/api
wrangler deploy
cd ../web
npm run build
wrangler pages deploy dist --project-name=sms-web
```

---

## 🔧 DEVELOPMENT TASKS

### DEV-001: Run Development Servers
```powershell
# Terminal 1: Start API dev server
cd apps/api
pnpm dev

# Terminal 2: Start web dev server
cd apps/web
pnpm dev

# Open browser: http://localhost:5173
```

---

### DEV-002: Run Tests
```powershell
# Run all tests
pnpm test

# Run API tests only
cd apps/api
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run specific test file
pnpm test auth.test.ts
```

---

### DEV-003: Build for Production
```powershell
# Build all packages
pnpm build

# Build API only
cd apps/api
pnpm build

# Build web only
cd apps/web
pnpm build
```

---

### DEV-004: Type Check
```powershell
# Type check all packages
pnpm typecheck

# Type check specific package
cd apps/api
pnpm typecheck
```

---

### DEV-005: Lint Code
```powershell
# Lint all packages
pnpm lint

# Lint and fix
pnpm lint --fix

# Lint specific package
cd apps/web
pnpm lint
```

---

## 🚀 DEPLOYMENT TASKS

### DEPLOY-001: Deploy API
```powershell
cd apps/api

# Build
pnpm build

# Deploy to Cloudflare Workers
wrangler deploy

# Check deployment
# URL: https://sms-api.nmvpmsms.workers.dev
```

---

### DEPLOY-002: Deploy Frontend
```powershell
cd apps/web

# Build
pnpm build

# Deploy to Cloudflare Pages
wrangler pages deploy dist --project-name=sms-web

# Check deployment
# URL: https://sms-web.pages.dev (redirects to deployment URL)
```

---

### DEPLOY-003: Run Database Migration
```powershell
cd apps/api

# List databases
wrangler d1 list

# Execute migration
wrangler d1 execute sms-production-db --file=migrations/0001_init.sql

# Check database
wrangler d1 execute sms-production-db --command="SELECT name FROM sqlite_master WHERE type='table';"
```

---

### DEPLOY-004: Set Environment Secrets
```powershell
cd apps/api

# Set JWT secret
wrangler secret put JWT_SECRET
# Enter secret when prompted

# List secrets
wrangler secret list

# Delete secret
wrangler secret delete JWT_SECRET
```

---

## 🔍 DEBUGGING TASKS

### DEBUG-001: View API Logs
```powershell
cd apps/api

# Tail production logs
wrangler tail --format=pretty

# Tail with filter
wrangler tail --format=pretty --grep="ERROR"

# View last 100 logs
wrangler tail --format=pretty --lines=100
```

---

### DEBUG-002: Query Database
```powershell
cd apps/api

# Interactive SQL shell
wrangler d1 execute sms-production-db --command="SELECT * FROM users LIMIT 5;"

# Export database dump
wrangler d1 export sms-production-db --output=backup.sql

# Count records
wrangler d1 execute sms-production-db --command="SELECT COUNT(*) FROM student_profiles;"

# Check specific student
wrangler d1 execute sms-production-db --command="SELECT * FROM student_profiles WHERE user_id='<USER_ID>';"
```

---

### DEBUG-003: Check Deployment Status
```powershell
# Check API deployment
wrangler deployments list

# Check Pages deployment
wrangler pages deployment list --project-name=sms-web

# Check Workers health
curl https://sms-api.nmvpmsms.workers.dev/health
```

---

## 🧹 MAINTENANCE TASKS

### MAINT-001: Update Dependencies
```powershell
# Check outdated packages
pnpm outdated

# Update all dependencies
pnpm update

# Update specific package
pnpm update react

# Update to latest (breaking changes)
pnpm update --latest
```

---

### MAINT-002: Clean Build Artifacts
```powershell
# Remove node_modules
Remove-Item -Recurse -Force node_modules

# Remove build outputs
Remove-Item -Recurse -Force dist, .wrangler, apps/*/dist, apps/*/.wrangler

# Clean and reinstall
Remove-Item -Recurse -Force node_modules
pnpm install
```

---

### MAINT-003: Backup Database
```powershell
cd apps/api

# Export database
wrangler d1 export sms-production-db --output=backups/backup-$(Get-Date -Format 'yyyyMMdd-HHmmss').sql

# List backups
Get-ChildItem backups/*.sql | Sort-Object LastWriteTime -Descending
```

---

### MAINT-004: Check Bundle Size
```powershell
cd apps/web

# Build and analyze
pnpm build
pnpm vite-bundle-visualizer

# Check size
Get-ChildItem dist -Recurse | Measure-Object -Property Length -Sum
```

---

## 📊 TASK QUEUE

### Current Sprint (This Week)
- [ ] TASK-001: Debug Student API 404 Error (4h)
- [ ] TASK-002: Debug Fee Payment Validation (4h)
- [ ] TASK-003: Fix Teachers Academic Year Filter (5min)
- [ ] TASK-004: Enable R2 Storage (30min)

### Next Sprint (Next Week)
- [ ] TASK-005: Rewrite Fees List UI (4h)
- [ ] TASK-006: Implement Password Reset (8h)
- [ ] TASK-007: Enforce Attendance Edit Window (2h)
- [ ] TASK-008: Build Teacher "My Teaching" Page (6h)

### Backlog
- [ ] Analytics Dashboard with Charts (12h)
- [ ] Grade Calculation System (8h)
- [ ] Email Notifications (16h)
- [ ] Teacher Attendance Interface (8h)
- [ ] Class Teacher Read-Only Views (6h)
- [ ] Assignment Submissions (24h)
- [ ] Parent Portal (40h)
- [ ] Mobile Apps (100+h)

---

## 🎯 Quick Actions

### Quick Fix Commands
```powershell
# Fix and deploy everything
cd c:\Users\jaysg\Desktop\SMS\School-Management-System
pnpm typecheck && pnpm build && cd apps/api && wrangler deploy && cd ../web && wrangler pages deploy dist --project-name=sms-web

# Run all tests
pnpm test

# Start dev environment
# Terminal 1:
cd apps/api && pnpm dev
# Terminal 2:
cd apps/web && pnpm dev
```

---

## 📝 Notes

### Task Status Legend
- ❌ TODO: Not started
- 🚧 IN PROGRESS: Currently working
- ✅ DONE: Completed
- ⏸️ BLOCKED: Waiting for dependency
- ⚠️ ISSUE: Has problems

### Priority Levels
- P0: CRITICAL (blocking production)
- P1: HIGH (important for users)
- P2: MEDIUM (nice to have)
- P3: LOW (future enhancement)

### Time Estimates
- Quick: < 1 hour
- Short: 1-4 hours
- Medium: 4-8 hours
- Long: 1-2 days
- Very Long: > 2 days

---

**Last Updated**: September 19, 2026  
**Next Review**: After critical tasks completed  
**Total Tasks**: 8 critical + 30+ backlog

