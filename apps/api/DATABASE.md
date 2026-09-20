# Database Foundation

This document describes the D1 database schema and local development setup for the School Management System.

## Schema Overview

The database schema is defined in the SQL migration file `migrations/0001_init.sql`. This is the **source of truth** for the database structure.

### Key Design Principles

1. **ULID IDs**: All primary keys use ULID (Universally Unique Lexicographically Sortable Identifier) stored as TEXT
2. **Timestamps**: Unix epoch milliseconds stored as INTEGER
3. **Dates**: ISO format 'YYYY-MM-DD' stored as TEXT
4. **Booleans**: INTEGER 0/1
5. **Money**: Integer paise (smallest currency unit)
6. **JSON**: Stored as TEXT with `json_valid()` constraints

### Tenant Isolation

The schema enforces strict tenant isolation through composite foreign keys. Examples:

- `FOREIGN KEY (user_id, school_id) REFERENCES users(id, school_id)`
- `FOREIGN KEY (classroom_id, school_id, academic_year_id) REFERENCES classrooms(id, school_id, academic_year_id)`

This prevents cross-school data references at the database level.

### Tables (25 total)

#### Core Tables
- `schools` - School/tenant records
- `users` - User accounts (principal, teacher, student)
- `sessions` - Refresh tokens for authentication
- `teacher_profiles` - Teacher-specific information
- `student_profiles` - Student-specific information

#### Academic Structure
- `academic_years` - School year definitions (one current per school)
- `classrooms` - Grade/division within an academic year
- `subjects` - Subject catalog
- `teaching_assignments` - Which subjects each class offers
- `enrollments` - Student enrollment history

#### Promotion
- `promotion_batches` - Batch promotion workflows
- `promotion_items` - Individual student promotion decisions

#### Attendance
- `attendance_sessions` - Attendance taking sessions
- `attendance_entries` - Individual student attendance (WITHOUT ROWID)

#### Assessments
- `assessments` - Tests/exams
- `marks` - Student marks (WITHOUT ROWID)

#### Assignments
- `assignments` - Homework assignments
- `assignment_attachments` - R2 file metadata

#### Fees
- `fee_categories` - Fee types
- `fee_charges` - Append-only ledger of charges
- `fee_payments` - Append-only payment records
- `receipt_counters` - Receipt number sequences
- `code_counters` - Login ID / student code sequences

#### System
- `import_jobs` - Excel import workflow
- `audit_log` - Immutable audit trail

## Critical Constraints

### Academic Years
Only one `current` academic year per school:
```sql
CREATE UNIQUE INDEX uq_current_academic_year 
  ON academic_years(school_id) WHERE status = 'current';
```

### Enrollments
Only one live (`active` or `planned`) enrollment per student per academic year:
```sql
CREATE UNIQUE INDEX uq_live_enrollment
  ON enrollments(student_id, academic_year_id) 
  WHERE status IN ('active', 'planned');
```

### Principal
Only one active principal per school:
```sql
CREATE UNIQUE INDEX uq_active_principal_per_school
  ON users(school_id)
  WHERE role = 'principal' AND status = 'active';
```

### Financial Records
Fee charges and payments are append-only. Triggers prevent deletion:
```sql
CREATE TRIGGER trg_fee_charges_no_delete BEFORE DELETE ON fee_charges
BEGIN SELECT RAISE(ABORT, 'fee_charges are append-only: void instead of deleting'); END;
```

Only first-time voiding is permitted (cannot un-void or re-void).

## Integrity Checks

Business rules that require cross-row or cross-table validation are implemented in `src/lib/db/integrity-checks.ts`:

- `marks_over_max` - Marks exceeding assessment max_marks
- `attendance_entry_wrong_classroom` - Attendance for wrong classroom
- `attendance_entry_outside_enrollment` - Attendance outside enrollment period
- `marks_wrong_classroom` - Marks for wrong classroom
- `promotion_target_wrong_year` - Promotion to wrong academic year
- `promotion_source_wrong_class` - Promotion from wrong classroom
- `active_enrollment_in_non_current_year` - Active enrollment in past/future year
- `planned_enrollment_in_started_year` - Planned enrollment in current year
- `withdrawn_student_still_live` - Withdrawn student with active enrollment

Run integrity checks periodically or before critical operations.

## Local Development

### Prerequisites

- Node.js >= 18.0.0
- pnpm >= 9.0.0
- Wrangler CLI (installed via project dependencies)

### Initial Setup

1. **Install dependencies**:
   ```bash
   pnpm install
   ```

2. **Apply migrations** to local D1 database:
   ```bash
   pnpm --filter @sms/api db:migrate
   ```

   This creates a local SQLite database at `.wrangler/state/v3/d1/miniflare-D1DatabaseObject/<id>.sqlite`.

3. **Verify migration**:
   ```bash
   pnpm --filter @sms/api db:migrate:list
   ```

### Database Scripts

From the API package (`apps/api`):

```bash
# Apply migrations to local database
pnpm db:migrate

# List applied migrations
pnpm db:migrate:list

# Reset database (drop all tables and re-migrate)
pnpm db:reset
```

### Development Workflow

1. Start the development server:
   ```bash
   pnpm --filter @sms/api dev
   ```

2. The Worker will connect to the local D1 database automatically via the binding in `wrangler.jsonc`:
   ```jsonc
   "d1_databases": [
     {
       "binding": "DB",
       "database_name": "sms-db",
       "database_id": "local-db"
     }
   ]
   ```

3. Access the database in your code:
   ```typescript
   export default {
     async fetch(request, env) {
       const result = await env.DB.prepare('SELECT * FROM schools').all();
       return Response.json(result);
     }
   }
   ```

### Testing

Run database schema tests:
```bash
pnpm --filter @sms/api test
```

Or from the root:
```bash
pnpm test
```

Tests verify:
- Schema structure (tables, indexes, triggers)
- Constraint enforcement
- Business rule validation
- Tenant isolation

### Drizzle ORM

The `src/lib/db/schema.ts` file provides TypeScript types and query builders that mirror the SQL schema.

**IMPORTANT**: DO NOT use `drizzle-kit generate` to recreate migrations. The handwritten SQL migration in `migrations/0001_init.sql` is the authoritative source. It contains SQLite-specific features that Drizzle cannot fully represent:

- Composite foreign keys
- Partial unique indexes
- WITHOUT ROWID tables
- Complex CHECK constraints
- Triggers

Use Drizzle for type-safe queries, not schema generation.

## Common Operations

### Querying with Drizzle

```typescript
import { drizzle } from 'drizzle-orm/d1';
import { schools, users } from './lib/db/schema';
import { eq } from 'drizzle-orm';

export default {
  async fetch(request, env) {
    const db = drizzle(env.DB);
    
    // Select all schools
    const allSchools = await db.select().from(schools);
    
    // Select with condition
    const activeUsers = await db
      .select()
      .from(users)
      .where(eq(users.status, 'active'));
    
    return Response.json({ allSchools, activeUsers });
  }
}
```

### Raw SQL Queries

For complex queries or SQLite-specific features:

```typescript
const result = await env.DB.prepare(
  `SELECT 
    s.name as school_name,
    COUNT(u.id) as user_count
  FROM schools s
  LEFT JOIN users u ON u.school_id = s.id
  WHERE s.status = ?
  GROUP BY s.id`
).bind('active').all();
```

### Transactions

```typescript
const results = await env.DB.batch([
  env.DB.prepare('INSERT INTO schools (id, code, name, ...) VALUES (?, ?, ?, ...)').bind(...),
  env.DB.prepare('INSERT INTO users (id, school_id, ...) VALUES (?, ?, ...)').bind(...),
]);
```

## Production Deployment

**Note**: This foundation is for LOCAL DEVELOPMENT ONLY. Do not deploy to production yet.

When ready for production:

1. Create a production D1 database:
   ```bash
   wrangler d1 create sms-db-production
   ```

2. Update `wrangler.jsonc` with production database ID

3. Apply migrations to production:
   ```bash
   wrangler d1 migrations apply sms-db-production
   ```

4. Deploy the Worker:
   ```bash
   pnpm --filter @sms/api deploy
   ```

## Schema Version

**Current Version**: v1.2 (finalized)

The migration is `0001_init.sql` which creates all 25 tables with their constraints, indexes, and triggers.

## Troubleshooting

### Migration fails

If migration fails partway through:

1. Check which migrations were applied:
   ```bash
   pnpm --filter @sms/api db:migrate:list
   ```

2. Reset the database:
   ```bash
   pnpm --filter @sms/api db:reset
   ```

### Database locked

If you see "database is locked" errors:

1. Stop all running Workers (`wrangler dev`)
2. Wait a few seconds
3. Retry the operation

### Foreign key violations

D1 enforces foreign keys. Ensure:
- Parent records exist before creating children
- Composite foreign keys match (e.g., `school_id` must match in both tables)
- Delete children before parents

## References

- [Cloudflare D1 Documentation](https://developers.cloudflare.com/d1/)
- [Drizzle ORM D1 Guide](https://orm.drizzle.team/docs/get-started-sqlite#cloudflare-d1)
- [SQLite CHECK Constraints](https://www.sqlite.org/lang_createtable.html#check_constraints)
- [SQLite Triggers](https://www.sqlite.org/lang_createtrigger.html)
