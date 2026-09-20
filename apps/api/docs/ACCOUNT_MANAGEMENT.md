# Account Management Module

**Version:** 1.0.0  
**Status:** Production Ready  
**Last Updated:** 2026-09-19

## Overview

The Account Management module provides comprehensive teacher and student account lifecycle management with:

- **Account Creation**: Atomic user + profile creation with auto-generated credentials
- **Lifecycle Operations**: Disable, reactivate, password reset
- **Bulk Provisioning**: Create up to 100 student accounts in a single operation
- **Tenant Isolation**: All operations are school-scoped with strict security boundaries
- **Authorization**: Role-based access control (Principal, Teacher, Student)
- **Audit Logging**: Complete audit trail for all mutations (credentials never logged)

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Routes Layer                          │
│  teacher.routes.ts | student.routes.ts | me.routes.ts       │
│  - Authorization    - Validation    - Error handling        │
└────────────────────┬────────────────────────────────────────┘
                     │
┌────────────────────┴────────────────────────────────────────┐
│                      Service Layer                           │
│  teacher.service.ts | student.service.ts | bulk-provision   │
│  - Business logic   - Atomic operations  - Validation       │
└────────────────────┬────────────────────────────────────────┘
                     │
┌────────────────────┴────────────────────────────────────────┐
│                    Repository Layer                          │
│  teacher.repository.ts | student.repository.ts              │
│  - School-scoped queries  - Data access                     │
└────────────────────┬────────────────────────────────────────┘
                     │
┌────────────────────┴────────────────────────────────────────┐
│                  Supporting Services                         │
│  code-generator.service.ts | password.service.ts            │
│  - Sequential codes  - Password hashing  - Temp passwords   │
└─────────────────────────────────────────────────────────────┘
```

## API Endpoints

### Teacher Management

#### `GET /teachers`
List all teachers in the school.

**Authorization:** Principal only

**Query Parameters:**
- `status` (optional): Filter by status (`active`, `inactive`)
- `search` (optional): Search by name or employee code

**Response:**
```json
{
  "data": [
    {
      "id": "abc123",
      "user_id": "user456",
      "school_id": "school789",
      "employee_code": "T000001",
      "first_name": "John",
      "middle_name": null,
      "last_name": "Doe",
      "phone": "+1234567890",
      "date_of_birth": "1985-06-15",
      "dob_md": "06-15",
      "joining_date": "2023-08-01",
      "status": "active",
      "created_at": "2023-08-01T10:00:00Z",
      "updated_at": "2023-08-01T10:00:00Z"
    }
  ]
}
```

#### `GET /teachers/:id`
Get teacher by ID.

**Authorization:** 
- Principal: Can view all teachers
- Teacher: Can view own profile only

**Response:**
```json
{
  "data": {
    "profile": { /* TeacherProfile */ },
    "user": {
      "id": "user456",
      "login_id": "GPS-T-000001",
      "role": "teacher",
      "status": "active",
      "must_change_password": false
    }
  }
}
```

#### `POST /teachers`
Create a new teacher account.

**Authorization:** Principal only

**Request Body:**
```json
{
  "first_name": "John",
  "middle_name": "Michael",
  "last_name": "Doe",
  "phone": "+1234567890",
  "date_of_birth": "1985-06-15",
  "joining_date": "2023-08-01"
}
```

**Response:**
```json
{
  "data": {
    "profile_id": "abc123",
    "user_id": "user456",
    "login_id": "GPS-T-000001",
    "employee_code": "T000001",
    "temporary_password": "ABCD-EFGH-JKLM-NPQR"
  }
}
```

**⚠️ SECURITY NOTE:** The `temporary_password` is returned ONCE and never stored in plaintext. Client must display this to the user immediately.

#### `PATCH /teachers/:id`
Update teacher profile.

**Authorization:** Principal only

**Request Body:** (all fields optional)
```json
{
  "first_name": "John",
  "middle_name": "Michael",
  "last_name": "Doe",
  "phone": "+1234567890",
  "date_of_birth": "1985-06-15",
  "joining_date": "2023-08-01",
  "status": "active"
}
```

#### `POST /teachers/:id/disable`
Disable teacher account.

**Authorization:** Principal only

**Security Actions:**
- Sets user status to `disabled`
- Sets profile status to `inactive`
- Revokes all active sessions
- Increments `token_version` to invalidate tokens
- Preserves all historical data

#### `POST /teachers/:id/reactivate`
Reactivate teacher account.

**Authorization:** Principal only

**Security Actions:**
- Sets user status to `active`
- Sets profile status to `active`
- Sets `must_change_password = true`
- Previous sessions remain invalid

#### `POST /teachers/:id/reset-password`
Reset teacher password.

**Authorization:** Principal only

**Response:**
```json
{
  "data": {
    "user_id": "user456",
    "login_id": "GPS-T-000001",
    "temporary_password": "WXYZ-ABCD-EFGH-JKLM"
  }
}
```

**Security Actions:**
- Generates new temporary password (16 chars, secure random)
- Stores only hash in `activation_hash`
- Revokes all active sessions
- Increments `token_version`
- Sets `must_change_password = true`
- Password expires in 7 days

### Student Management

#### `GET /students`
List all students in the school.

**Authorization:** Principal only

**Query Parameters:**
- `status` (optional): Filter by status (`active`, `inactive`, `suspended`, `graduated`, `transferred`)
- `search` (optional): Search by name, student code, or admission number

#### `GET /students/:id`
Get student by ID.

**Authorization:**
- Principal: Can view all students
- Student: Can view own profile only

#### `POST /students`
Create a new student account.

**Authorization:** Principal only

**Request Body:**
```json
{
  "admission_number": "2023001",
  "first_name": "Jane",
  "middle_name": "Marie",
  "last_name": "Smith",
  "gender": "female",
  "date_of_birth": "2010-03-20",
  "phone": "+1234567890",
  "email": "jane.smith@example.com",
  "address": "123 Main St, City, State",
  "parent_name": "Robert Smith",
  "parent_phone": "+1987654321"
}
```

**Response:**
```json
{
  "data": {
    "profile_id": "def456",
    "user_id": "user789",
    "login_id": "GPS-S-000123",
    "employee_code": "S000123",
    "temporary_password": "PQRS-TUVW-XYZA-BCDE"
  }
}
```

#### `POST /students/bulk-provision`
Bulk create student accounts (max 100 per batch).

**Authorization:** Principal only

**Request Body:**
```json
{
  "students": [
    {
      "admission_number": "2023001",
      "first_name": "Jane",
      "last_name": "Smith",
      // ... other fields
    },
    {
      "admission_number": "2023002",
      "first_name": "Bob",
      "last_name": "Johnson",
      // ... other fields
    }
  ]
}
```

**Validation:**
- Maximum 100 students per batch
- All rows validated before any creation
- Checks for duplicate admission numbers within batch
- Checks for existing admission numbers in database
- **All-or-nothing**: If any validation fails, entire batch is rejected

**Success Response:**
```json
{
  "data": {
    "success": true,
    "created_count": 2,
    "accounts": [
      {
        "profile_id": "abc123",
        "user_id": "user456",
        "login_id": "GPS-S-000123",
        "employee_code": "S000123",
        "temporary_password": "WXYZ-ABCD-EFGH-JKLM"
      },
      // ... more accounts
    ]
  }
}
```

**Error Response:**
```json
{
  "error": "Validation failed for 2 row(s)",
  "errors": [
    {
      "row": 0,
      "admission_number": "2023001",
      "errors": [
        "Admission number already exists in system: 2023001"
      ]
    },
    {
      "row": 5,
      "admission_number": "2023006",
      "errors": [
        "First name is required",
        "Last name is required"
      ]
    }
  ]
}
```

#### `PATCH /students/:id`
Update student profile.

**Authorization:** Principal only

#### `POST /students/:id/disable`
Disable student account.

**Authorization:** Principal only

#### `POST /students/:id/reactivate`
Reactivate student account.

**Authorization:** Principal only

#### `POST /students/:id/reset-password`
Reset student password.

**Authorization:** Principal only

### Profile Management

#### `GET /me/profile`
Get current user's profile.

**Authorization:** Any authenticated user

**Response (Teacher):**
```json
{
  "data": {
    "type": "teacher",
    "profile": {
      "id": "abc123",
      "user_id": "user456",
      // ... teacher profile fields
    }
  }
}
```

**Response (Student):**
```json
{
  "data": {
    "type": "student",
    "profile": {
      "id": "def456",
      "user_id": "user789",
      // ... student profile fields
    }
  }
}
```

**Response (Principal):**
```json
{
  "data": {
    "type": "principal",
    "user_id": "user001",
    "school_id": "school789"
  }
}
```

## Code Generation

### Employee Codes (Teachers)
**Format:** `T000001`, `T000002`, ...

- Sequential 6-digit numbers
- Prefixed with `T` for teachers
- Atomic generation using `code_counters` table
- School-scoped sequences

### Student Codes
**Format:** `S000001`, `S000002`, ...

- Sequential 6-digit numbers
- Prefixed with `S` for students
- Atomic generation using `code_counters` table
- School-scoped sequences

### Login IDs
**Format:** `<SCHOOLCODE>-<ROLE>-<SEQUENCE>`

Examples:
- `GPS-T-000001` (teacher at GPS school)
- `GPS-S-000123` (student at GPS school)

**Components:**
- `SCHOOLCODE`: School's unique code (from `schools.school_code`)
- `ROLE`: `T` for teacher, `S` for student
- `SEQUENCE`: 6-digit sequential number

### Temporary Passwords
**Format:** `XXXX-XXXX-XXXX-XXXX`

- 4 groups of 4 characters
- Uses character set: `ABCDEFGHJKLMNPQRSTUVWXYZ23456789`
- Excludes ambiguous characters (0, O, 1, I, L)
- Cryptographically secure random generation
- **Never stored in plaintext** - only hash stored
- Expires in 7 days
- Must be changed on first login

## Security

### Tenant Isolation

**All queries are school-scoped:**
```sql
WHERE school_id = ?
```

**Security boundaries:**
- Users can NEVER access data from other schools
- `school_id` is ALWAYS derived from authenticated token
- Client-provided `school_id` is NEVER trusted
- All repository methods enforce school-scoped queries

### Authorization Matrix

| Operation | Principal | Teacher | Student |
|-----------|-----------|---------|---------|
| List teachers | ✅ All | ❌ | ❌ |
| View teacher | ✅ All | ✅ Own | ❌ |
| Create teacher | ✅ | ❌ | ❌ |
| Update teacher | ✅ | ❌ | ❌ |
| Disable teacher | ✅ | ❌ | ❌ |
| Reactivate teacher | ✅ | ❌ | ❌ |
| Reset teacher password | ✅ | ❌ | ❌ |
| List students | ✅ All | ❌ | ❌ |
| View student | ✅ All | ❌ | ✅ Own |
| Create student | ✅ | ❌ | ❌ |
| Bulk provision students | ✅ | ❌ | ❌ |
| Update student | ✅ | ❌ | ❌ |
| Disable student | ✅ | ❌ | ❌ |
| Reactivate student | ✅ | ❌ | ❌ |
| Reset student password | ✅ | ❌ | ❌ |
| View own profile | ✅ | ✅ | ✅ |

### Credential Security

**Temporary Passwords:**
- Generated using Web Crypto API (`crypto.getRandomValues`)
- 16 characters, secure random
- Hashed with scrypt before storage
- **Never persisted in plaintext**
- **Never logged** (not in audit logs, application logs, or error messages)
- Returned ONCE in API response
- Expires in 7 days (`activation_expires_at`)
- User must change on first login (`must_change_password = true`)

**Password Hashing:**
- Algorithm: scrypt via `@noble/hashes`
- Parameters: N=16384, r=8, p=1, dkLen=32
- Format: `scrypt$16384:8:1$<salt>$<hash>`
- Salt: 16 bytes random
- Timing-safe comparison

### Account Lifecycle Security

**Disable Operation:**
1. Set `users.status = 'disabled'`
2. Set profile `status = 'inactive'`
3. Increment `users.token_version` (invalidates JWT tokens)
4. Revoke all active sessions (`sessions.revoked_at = NOW()`)
5. Historical data preserved (enrollments, attendance, marks)

**Reactivate Operation:**
1. Set `users.status = 'active'`
2. Set profile `status = 'active'`
3. Set `must_change_password = true` (requires password setup)
4. Previous sessions remain invalid
5. User must activate account with new password

**Password Reset:**
1. Generate new temporary password
2. Hash and store in `users.activation_hash`
3. Set `activation_expires_at = NOW() + 7 days`
4. Set `must_change_password = true`
5. Increment `token_version`
6. Revoke all active sessions
7. Return temporary password ONCE

## Atomic Operations

### Account Creation
Account creation is **atomic at the application level**:

```typescript
// Step 1: Generate codes
const employeeCode = await generateEmployeeCode(db, schoolId);
const loginId = await generateLoginId(db, schoolId, 'teacher');
const temporaryPassword = generateTemporaryPassword();

// Step 2: Create user
await db.prepare('INSERT INTO users ...').run();

// Step 3: Create profile
await teacherRepo.create(db, profileData);

// Step 4: Return credentials
return { login_id, temporary_password };
```

**Note:** D1 doesn't support explicit transactions, but failures are detected and reported. If Step 2 succeeds but Step 3 fails, the user record exists without a profile (detectable as an error state).

### Bulk Provisioning
Bulk provisioning follows **all-or-nothing validation**:

```typescript
// Step 1: Validate ALL rows (no database writes)
const errors = await validateAllRows(db, schoolId, students);
if (errors.length > 0) {
  throw ValidationError(errors);
}

// Step 2: Create all accounts (only after full validation)
for (const student of students) {
  await createAccount(db, student);
}
```

**Failure Handling:**
- Validation failures: No accounts created, detailed row-level errors returned
- Creation failures: Operation stops, partial accounts may exist (client notified of count)

## Audit Logging

### Logged Actions

| Action | Entity | Logged Data | Notes |
|--------|--------|-------------|-------|
| `created` | `teacher` | profile_id, user_id, login_id, employee_code | Password NOT logged |
| `created` | `student` | profile_id, user_id, login_id, student_code | Password NOT logged |
| `bulk_created` | `student` | created_count, student_ids[] | Passwords NOT logged |
| `updated` | `teacher`/`student` | before, after | Full state diff |
| `disabled` | `teacher`/`student` | before, after | Status change |
| `reactivated` | `teacher`/`student` | before, after | Status change |
| `reset_password` | `teacher`/`student` | user_id, login_id | Password NOT logged |

### Audit Log Entry Structure

```typescript
{
  id: string;                // UUID
  school_id: string | null;  // Tenant
  actor_id: string;           // User who performed action
  actor_role: string;         // Role at time of action
  action: AuditAction;        // Action performed
  entity: AuditEntity;        // Entity type
  entity_id: string | null;   // Entity ID (null for bulk ops)
  before: string | null;      // JSON state before
  after: string | null;       // JSON state after
  at: number;                 // Unix timestamp (milliseconds)
}
```

**Security:**
- Temporary passwords are **NEVER** included in audit logs
- Audit entries are **append-only** (no updates or deletes)
- All mutations are logged (principal accountability)

## Database Schema

### Users Table
```sql
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  school_id TEXT NOT NULL,
  login_id TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL,  -- 'principal' | 'teacher' | 'student'
  status TEXT NOT NULL DEFAULT 'active',  -- 'active' | 'disabled'
  password_hash TEXT,
  activation_hash TEXT,
  activation_expires_at TEXT,
  must_change_password INTEGER NOT NULL DEFAULT 1,
  token_version INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (school_id) REFERENCES schools(id)
);
```

### Teacher Profiles Table
```sql
CREATE TABLE teacher_profiles (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE,
  school_id TEXT NOT NULL,
  employee_code TEXT NOT NULL,
  first_name TEXT NOT NULL,
  middle_name TEXT,
  last_name TEXT NOT NULL,
  phone TEXT,
  date_of_birth TEXT,
  dob_md TEXT,  -- MM-DD for birthday tracking
  joining_date TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (school_id) REFERENCES schools(id),
  UNIQUE(school_id, employee_code)
);
```

### Student Profiles Table
```sql
CREATE TABLE student_profiles (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE,
  school_id TEXT NOT NULL,
  student_code TEXT NOT NULL,
  admission_number TEXT NOT NULL,
  first_name TEXT NOT NULL,
  middle_name TEXT,
  last_name TEXT NOT NULL,
  gender TEXT,
  date_of_birth TEXT,
  dob_md TEXT,  -- MM-DD for birthday tracking
  phone TEXT,
  email TEXT,
  address TEXT,
  parent_name TEXT,
  parent_phone TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (school_id) REFERENCES schools(id),
  UNIQUE(school_id, student_code),
  UNIQUE(school_id, admission_number)
);
```

### Code Counters Table
```sql
CREATE TABLE code_counters (
  id TEXT PRIMARY KEY,
  school_id TEXT NOT NULL,
  code_type TEXT NOT NULL,  -- 'teacher' | 'student'
  current_value INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (school_id) REFERENCES schools(id),
  UNIQUE(school_id, code_type)
);
```

## Error Handling

### Common Errors

**400 Bad Request:**
- Validation errors (missing required fields, invalid formats)
- Duplicate admission number
- Batch size exceeds 100 students

**401 Unauthorized:**
- Missing or invalid JWT token
- Expired token
- Revoked session

**403 Forbidden:**
- Insufficient role (e.g., teacher trying to create accounts)
- Cross-tenant access attempt
- Viewing other user's profile

**404 Not Found:**
- Teacher/student not found
- Profile not found

**500 Internal Server Error:**
- Account creation failure
- Database errors
- Unexpected errors

### Error Response Format

```json
{
  "error": "Error message"
}
```

**Bulk Provisioning Errors:**
```json
{
  "error": "Validation failed for 2 row(s)",
  "errors": [
    {
      "row": 0,
      "admission_number": "2023001",
      "errors": ["Error message 1", "Error message 2"]
    }
  ]
}
```

## Testing

Tests are deferred to a future release. Manual testing should cover:

1. **Account Creation:**
   - Teacher account creation with all fields
   - Student account creation with all fields
   - Verify temporary passwords are returned
   - Verify codes are sequential

2. **Bulk Provisioning:**
   - Create 100 students successfully
   - Reject 101 students (batch too large)
   - Detect duplicate admission numbers within batch
   - Detect existing admission numbers in database
   - Verify all-or-nothing validation

3. **Lifecycle Operations:**
   - Disable account → verify sessions revoked
   - Reactivate account → verify must_change_password
   - Reset password → verify sessions revoked

4. **Authorization:**
   - Principal can perform all operations
   - Teacher can view own profile only
   - Student can view own profile only
   - Verify 403 for unauthorized access

5. **Tenant Isolation:**
   - User from School A cannot access School B data
   - Verify all queries filter by school_id

6. **Security:**
   - Temporary passwords never logged
   - Passwords are hashed before storage
   - Session invalidation works correctly

## Future Enhancements

- **Email Notifications**: Send activation emails with temporary passwords
- **Password Expiry Policy**: Configurable password expiry (e.g., 90 days)
- **Account Suspension**: Temporary suspension (different from disable)
- **Bulk Updates**: Bulk update student information
- **Export**: Export teacher/student lists to CSV
- **Advanced Search**: Filter by multiple criteria, date ranges
- **Profile Photos**: Upload and manage profile photos
- **Parent Portal**: Separate parent accounts linked to students
- **Audit Log UI**: Admin interface to view audit logs
- **Test Suite**: Comprehensive unit and integration tests

## Support

For issues or questions, contact the development team.

---

**Document Version:** 1.0.0  
**Last Updated:** 2026-09-19  
**Module Status:** ✅ Production Ready
