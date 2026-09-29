# Spec: SMS Critical Tasks

## 1 Requirements

### 1.1 Fix Fees List UI
The fees list currently shows one row per charge, causing the same student to appear multiple times. Need to group charges by student with expandable details.

**Current Issue:**
- Jay Doe appears 3 times (one per charge)
- Confusing for principals to track total per student
- Hard to see payment status at student level

**Expected:**
- One row per student showing: name, code, total charged, total paid, balance, status
- Click to expand shows individual charges
- Status badges: Paid (green), Partial (yellow), Pending (red)

### 1.2 Enable R2 Storage
File uploads (assignments, profile pictures) are currently broken because R2 binding is commented out.

**Current Issue:**
- R2 binding commented in wrangler.jsonc (error 10042)
- Assignment file uploads fail
- Profile picture uploads fail

**Expected:**
- R2 enabled in Cloudflare dashboard
- Bucket created: sms-uploads
- Binding uncommented in wrangler.jsonc
- File uploads working

### 1.3 Enforce Attendance Edit Window
Teachers can currently edit attendance records from any date, bypassing the 48-hour window policy.

**Current Issue:**
- No backend validation for 48-hour rule
- Security gap - teachers can modify old records
- Policy enforcement relies on manual checking

**Expected:**
- Server-side validation blocks edits > 48 hours old
- Principal can override
- UI shows countdown timer
- Error message: "Edit window expired (48 hours). Contact principal."

### 1.4 Password Reset Flow
Users who forget passwords have no way to recover their accounts.

**Current Issue:**
- No forgot password functionality
- Users locked out must contact admin manually
- Security risk - admins reset passwords manually

**Expected:**
- POST /auth/forgot-password endpoint
- Email with reset link (or token for now)
- POST /auth/reset-password endpoint
- Frontend pages: ForgotPassword.tsx, ResetPassword.tsx
- Audit logging

## 2 Design

### 2.1 Fees List UI Architecture
```typescript
// Data structure
interface StudentFeeSummary {
  student_id: string;
  student_name: string;
  student_code: string;
  total_charged: number;
  total_paid: number;
  balance: number;
  status: 'paid' | 'partially_paid' | 'pending';
  charges: FeeCharge[];
}

// Grouping function
function groupChargesByStudent(charges: FeeCharge[]): StudentFeeSummary[] {
  const map = new Map<string, StudentFeeSummary>();
  
  charges.forEach(charge => {
    if (!map.has(charge.student_id)) {
      map.set(charge.student_id, {
        student_id: charge.student_id,
        student_name: charge.student_name,
        student_code: charge.student_code,
        total_charged: 0,
        total_paid: 0,
        balance: 0,
        status: 'pending',
        charges: []
      });
    }
    
    const summary = map.get(charge.student_id)!;
    summary.charges.push(charge);
    summary.total_charged += charge.amount;
    summary.total_paid += charge.total_paid || 0;
  });
  
  return Array.from(map.values()).map(s => {
    s.balance = s.total_charged - s.total_paid;
    s.status = s.balance <= 0 ? 'paid' : s.total_paid > 0 ? 'partially_paid' : 'pending';
    return s;
  }).sort((a, b) => b.balance - a.balance);
}
```

### 2.2 R2 Configuration
```jsonc
// wrangler.jsonc
[[r2_buckets]]
binding = "UPLOADS"
bucket_name = "sms-uploads"
```

**Deployment steps:**
1. Cloudflare Dashboard → R2 → Create bucket "sms-uploads"
2. Uncomment lines 24-30 in wrangler.jsonc
3. Deploy: `wrangler deploy`
4. Test upload

### 2.3 Edit Window Validation
```typescript
// attendance.service.ts
function validateEditWindow(
  attendanceDate: string,
  userRole: string,
  skipEditWindow?: boolean
): void {
  if (userRole === 'principal' || skipEditWindow) {
    return;
  }

  const now = new Date();
  const date = new Date(attendanceDate);
  const hoursDiff = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

  if (hoursDiff > 48) {
    throw new Error('Edit window expired (48 hours). Contact principal.');
  }
}
```

### 2.4 Password Reset Schema
```sql
CREATE TABLE password_reset_tokens (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  token_hash TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  used_at INTEGER,
  created_at INTEGER DEFAULT (unixepoch()),
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

## 3 Implementation Plan

### Task 1: Fix Fees List UI
**Effort:** 4 hours

**Steps:**
1. Add groupChargesByStudent function to Fees.tsx
2. Update state to store StudentFeeSummary[]
3. Rewrite table to show one row per student
4. Add expand/collapse logic with React state
5. Style expanded rows differently (gray background)
6. Add status badges with color coding
7. Test with multiple charges per student

**Files:**
- apps/web/src/pages/Fees.tsx

### Task 2: Enable R2 Storage
**Effort:** 30 minutes

**Steps:**
1. Login to Cloudflare Dashboard
2. Go to R2 section
3. Create bucket: sms-uploads
4. Edit apps/api/wrangler.jsonc
5. Uncomment lines 24-30
6. Run: cd apps/api && wrangler deploy
7. Test: Create assignment with file upload
8. Verify file in R2 dashboard

**Files:**
- apps/api/wrangler.jsonc

### Task 3: Enforce Edit Window
**Effort:** 2 hours

**Steps:**
1. Add validateEditWindow function to attendance.service.ts
2. Call it in updateAttendance before making changes
3. Add skipEditWindow parameter for principal override
4. Update attendance.routes.ts to pass userRole
5. Frontend: Add countdown timer component
6. Frontend: Disable edit button if expired
7. Write tests for validation

**Files:**
- apps/api/src/attendance/attendance.service.ts
- apps/api/src/attendance/attendance.routes.ts
- apps/web/src/pages/Attendance.tsx

### Task 4: Password Reset Flow
**Effort:** 8 hours

**Steps:**
1. Create migration for password_reset_tokens table
2. Create password-reset.service.ts
3. Implement requestReset(email) - generates token
4. Implement validateResetToken(token)
5. Implement resetPassword(token, newPassword)
6. Add routes: POST /auth/forgot-password, POST /auth/reset-password
7. Create ForgotPassword.tsx (input email)
8. Create ResetPassword.tsx (input new password)
9. Add routes to App.tsx
10. Email integration (or console.log token for now)
11. Add audit logging
12. Write tests

**Files:**
- apps/api/migrations/000X_password_reset.sql (new)
- apps/api/src/auth/password-reset.service.ts (new)
- apps/api/src/auth/auth.routes.ts
- apps/api/src/auth/auth.schemas.ts
- apps/web/src/pages/ForgotPassword.tsx (new)
- apps/web/src/pages/ResetPassword.tsx (new)
- apps/web/src/App.tsx

## Start task
[ ] 1. Fix Fees List UI - Group by Student
- Rewrite Fees.tsx to show one row per student
- Add expand/collapse for charge details
- _Requirements: 1.1, 2.1, 3 Task 1_

## Start task
[ ] 2. Enable R2 Storage for File Uploads
- Enable R2 bucket in Cloudflare
- Uncomment wrangler.jsonc binding
- _Requirements: 1.2, 2.2, 3 Task 2_

## Start task
[ ] 3. Enforce Attendance Edit Window
- Add server-side 48-hour validation
- UI countdown timer
- _Requirements: 1.3, 2.3, 3 Task 3_

## Start task
[ ] 4. Password Reset Flow
- Create reset token system
- Build forgot/reset pages
- _Requirements: 1.4, 2.4, 3 Task 4_
