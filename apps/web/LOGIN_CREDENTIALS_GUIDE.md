# Login Credentials Guide

## Authentication System Overview

The SMS authentication system has two tiers:

### 1. Super Admin (Platform Level)
- **NOT stored in database**
- Configured in Cloudflare Worker secrets
- Can create schools and provision principals
- Cannot log in through the regular login page

### 2. Regular Users (School Level)
- **Principal**: School administrator
- **Teacher**: School teacher
- **Student**: School student
- Stored in `users` table with school_id

## Current Situation

**Problem**: There are NO user credentials available for testing because:

1. Super Admin credentials are in Worker secrets (not in database)
2. Regular users (Principal/Teacher/Student) can only be created by Super Admin
3. No seed data exists to create initial users

## Solution Options

### Option 1: Create Seed Data Script (Recommended for Development)

Create a script to insert test data directly into the D1 database:

```typescript
// scripts/seed-dev-data.ts
import { ulid } from 'ulid';
import { hashPassword } from '../src/lib/auth/password.service';

async function seedDevData(db: D1Database) {
  const schoolId = ulid();
  const principalId = ulid();
  const now = Date.now();
  
  // 1. Create test school
  await db.prepare(`
    INSERT INTO schools (id, code, name, timezone, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).bind(
    schoolId,
    'TEST',
    'Test School',
    'Asia/Kolkata',
    'active',
    now,
    now
  ).run();
  
  // 2. Create test principal
  const password = 'Test@123'; // TEMPORARY PASSWORD
  const passwordHash = await hashPassword(password);
  
  await db.prepare(`
    INSERT INTO users (
      id, school_id, login_id, role, password_hash,
      status, must_change_password, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    principalId,
    schoolId,
    'TEST-P-000001',
    'principal',
    passwordHash,
    'active',
    0, // Set to 1 to force password change
    now,
    now
  ).run();
  
  console.log('✅ Seed data created');
  console.log('Login ID: TEST-P-000001');
  console.log('Password: Test@123');
}
```

**Run with:**
```bash
wrangler d1 execute SMS-dev --file=scripts/seed-dev-data.sql
```

### Option 2: Direct SQL Insert (Quick Test)

Run SQL directly against D1 database:

```sql
-- Create test school
INSERT INTO schools (id, code, name, timezone, status, created_at, updated_at)
VALUES (
  '01JGXYZ123ABCD456EFGH',  -- Replace with actual ULID
  'TEST',
  'Test School',
  'Asia/Kolkata',
  'active',
  1735689600000,
  1735689600000
);

-- Create test principal (PASSWORD: Test@123)
INSERT INTO users (
  id, school_id, login_id, role, password_hash,
  status, must_change_password, created_at, updated_at
) VALUES (
  '01JGXYZ789DEFGH123IJK',  -- Replace with actual ULID
  '01JGXYZ123ABCD456EFGH',  -- Same school ID as above
  'TEST-P-000001',
  'principal',
  '$argon2id$v=19$m=65536,t=3,p=4$<HASH_HERE>',  -- Need actual Argon2 hash
  'active',
  0,
  1735689600000,
  1735689600000
);
```

**Problem**: You need to generate a proper Argon2id hash for the password.

### Option 3: Use Super Admin API (If Secrets Configured)

If Super Admin credentials are configured in Worker secrets:

1. **Create School:**
```bash
POST /schools
Authorization: Bearer <SUPER_ADMIN_TOKEN>
{
  "code": "TEST",
  "name": "Test School",
  "timezone": "Asia/Kolkata"
}
```

2. **Create Principal:**
```bash
POST /schools/:schoolId/principal
Authorization: Bearer <SUPER_ADMIN_TOKEN>
{
  "full_name": "Test Principal",
  "date_of_birth": "1980-01-01"
}
```

Response will include temporary password.

### Option 4: Backend Test Helper (Development Only)

Add a development-only endpoint to create test users:

```typescript
// apps/api/src/dev/dev.routes.ts (DEV ONLY!)
import { Hono } from 'hono';

const dev = new Hono();

// ⚠️ DISABLE IN PRODUCTION
if (process.env.NODE_ENV === 'development') {
  dev.post('/create-test-principal', async (c) => {
    const { schoolCode, name } = await c.req.json();
    
    // Create school + principal with known credentials
    // ...
    
    return c.json({
      loginId: `${schoolCode}-P-000001`,
      password: 'Test@123'
    });
  });
}

export default dev;
```

## Recommended Immediate Action

**For Quick Testing:**

1. Check if Cloudflare Worker has Super Admin secrets configured
2. If yes, use Super Admin API to create a school and principal
3. Use the returned temporary password to log in

**For Long-term Development:**

Create a `seed:dev` script that:
- Creates a test school
- Creates a test principal with known credentials
- Optionally creates teachers and students
- Runs automatically in local development

## Example Test Credentials Format

Once created, credentials will look like:

```
Login ID: TEST-P-000001
Password: <temporary-password-from-provisioning>
```

Where:
- `TEST` = School code
- `P` = Principal role
- `000001` = Sequential number

## Security Notes

⚠️ **IMPORTANT**:
- Never commit real passwords to git
- Use strong passwords for production
- Test credentials should only work in development
- Super Admin access should be tightly controlled
- Seed data should be disabled in production

## Next Steps

1. **Check Worker Configuration**: See if Super Admin secrets are set
2. **Create Seed Script**: Write `scripts/seed-dev.ts` for local development
3. **Document Provisioning Flow**: Create guide for creating new schools/principals
4. **Add Dev Utilities**: Consider adding CLI tools for user management

## Current Blocker

**You cannot test the login page until at least one of these is done:**
- Super Admin provisions a principal via API
- Seed script creates test users in database
- Direct SQL insert with proper password hash

Would you like me to:
1. Create a seed data script for local development?
2. Add a dev-only endpoint to create test users?
3. Check the Worker configuration for Super Admin setup?
