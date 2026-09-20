# Fees Management Module

## Overview

The Fees Management module implements a production-oriented financial ledger for tracking student fees, concessions, carry-forward balances, and payments. It enforces strict append-only integrity, school isolation, and role-based authorization.

## Architecture

### Ledger Model

The fee system is built on an **append-only ledger** architecture:

- **No deletion**: Fee charges and payments are never deleted from the database
- **Voiding**: Corrections are made by voiding entries with a required reason
- **Immutability**: Once created, charge/payment amounts and core fields cannot be edited
- **Audit trail**: All mutations are logged with before/after state

### Financial Data Model

```
Fee Categories (master data)
    ↓
Fee Charges (ledger entries)
    - fee: Regular fee charge (positive amount)
    - concession: Discount (negative amount)
    - carry_forward: Balance from previous year (positive amount)
    
Fee Payments (ledger entries)
    - Receipt-numbered payments (positive amount)
    - Generated sequentially per financial year
```

## Database Tables

### fee_categories

Master data for fee types (Tuition, Transport, Lab, etc.)

- `id` - UUID primary key
- `school_id` - School isolation
- `code` - Unique code within school (alphanumeric, underscore, hyphen)
- `name` - Display name
- `status` - `active` | `inactive`
- `created_at`, `updated_at` - Timestamps

**Constraints:**
- Unique: `(school_id, code)`
- Index: `(id, school_id)` for tenant-safe lookups

### fee_charges

Append-only ledger of fee charges

- `id` - UUID primary key
- `school_id` - School isolation
- `student_id` - FK to users (student)
- `academic_year_id` - FK to academic_years
- `enrollment_id` - Optional FK to enrollments
- `fee_category_id` - Optional FK to fee_categories
- `kind` - `fee` | `concession` | `carry_forward`
- `title` - Description (e.g., "Tuition Fee Q1")
- `amount_paise` - Integer amount in paise
  - Positive for `fee` and `carry_forward`
  - Negative for `concession`
- `due_on` - Optional due date (YYYY-MM-DD)
- `created_by` - FK to users (principal who created it)
- `created_at` - Timestamp
- `voided_at` - Void timestamp (null if active)
- `voided_by` - FK to users (principal who voided it)
- `void_reason` - Required reason for voiding

**Indexes:**
- `(student_id, academic_year_id)` - Student fee queries
- `(school_id, academic_year_id)` - School-wide reports

### fee_payments

Append-only ledger of payments

- `id` - UUID primary key
- `school_id` - School isolation
- `student_id` - FK to users (student)
- `academic_year_id` - FK to academic_years
- `receipt_no` - Sequential receipt number (server-generated)
- `amount_paise` - Integer amount in paise (always positive)
- `paid_on` - Payment date (YYYY-MM-DD)
- `method` - `cash` | `upi` | `bank_transfer` | `other`
- `reference` - Optional external reference (cheque no, transaction ID, etc.)
- `recorded_by` - FK to users (principal who recorded it)
- `created_at` - Timestamp
- `voided_at` - Void timestamp (null if active)
- `voided_by` - FK to users (principal who voided it)
- `void_reason` - Required reason for voiding

**Constraints:**
- Unique: `(school_id, receipt_no)`

**Indexes:**
- `(student_id, academic_year_id)` - Student payment queries
- `(school_id, paid_on)` - Date-based reports

### receipt_counters

Receipt number sequencing (per school, per financial year)

- `school_id` - School isolation
- `financial_year` - Financial year identifier (e.g., "2026-27")
- `last_number` - Last issued receipt number (integer)

**Primary Key:** `(school_id, financial_year)`

**Atomic Increment:**
```sql
INSERT INTO receipt_counters (school_id, financial_year, last_number)
VALUES (?, ?, 1)
ON CONFLICT (school_id, financial_year)
DO UPDATE SET last_number = last_number + 1
RETURNING last_number
```

This ensures thread-safe receipt number generation without gaps or duplicates.

## Authorization

### Principal

**Full fee management authority:**
- ✅ Create/update fee categories
- ✅ Create fee charges (fee, concession, carry_forward)
- ✅ Void fee charges (with reason)
- ✅ Record payments
- ✅ Void payments (with reason)
- ✅ View all student fee records in school
- ✅ Access previous academic years
- ✅ All actions are audited

### Teacher

**No fee access:**
- ❌ Cannot create charges
- ❌ Cannot record payments
- ❌ Cannot view student fees
- ❌ Teachers have no fee management privileges in V1

### Student

**Read-only self-service:**
- ✅ View own fee summary and ledger
- ✅ Access previous academic years
- ❌ Cannot mutate any fee data
- ❌ Cannot access another student's fees

**Security Enforcement:**
- Student ID is always derived from `TenantContext.userId`
- Student cannot provide arbitrary `student_id` in requests
- School ID always comes from `TenantContext.schoolId`

## Fee Charge Kinds

### fee

Regular fee charge (positive amount)

**Example:**
```json
{
  "kind": "fee",
  "title": "Tuition Fee - Q1",
  "amount_paise": 5000000,  // ₹50,000.00
  "fee_category_id": "uuid",
  "due_on": "2026-06-30"
}
```

### concession

Discount or waiver (negative amount)

**Example:**
```json
{
  "kind": "concession",
  "title": "Merit Scholarship",
  "amount_paise": -200000,  // -₹2,000.00 (negative)
  "fee_category_id": "uuid"
}
```

**Representation:**
- Stored as negative integer in database
- Naturally reduces the outstanding balance when summed
- Client must send negative value

### carry_forward

Previous year balance brought forward (positive amount)

**Example:**
```json
{
  "kind": "carry_forward",
  "title": "Balance from 2025-26",
  "amount_paise": 300000,  // ₹3,000.00
  "due_on": "2026-04-01"
}
```

**Important:**
- Carry-forward is **NOT automatic**
- Must be explicitly created by Principal as a new charge
- Represents unpaid balance from previous academic year

## Balance Calculation

**Pure calculation (no database state):**

```typescript
// Active charges (non-voided)
const activeCharges = charges.filter(c => c.voided_at === null);

// Separate by kind
const fees = activeCharges.filter(c => c.kind === 'fee');
const concessions = activeCharges.filter(c => c.kind === 'concession');
const carryForward = activeCharges.filter(c => c.kind === 'carry_forward');

// Calculate totals
const totalFees = sum(fees.map(f => f.amount_paise));
const totalConcessions = sum(concessions.map(c => c.amount_paise)); // Negative
const totalCarryForward = sum(carryForward.map(cf => cf.amount_paise));

// Total charges = fees + concessions + carry_forward
const totalCharges = totalFees + totalConcessions + totalCarryForward;

// Active payments (non-voided)
const activePayments = payments.filter(p => p.voided_at === null);
const totalPayments = sum(activePayments.map(p => p.amount_paise));

// Balance
const balance = totalCharges - totalPayments;
```

**Example:**

| Type | Description | Amount (₹) | Paise |
|------|-------------|------------|-------|
| fee | Tuition Fee | 20,000 | 2,000,000 |
| fee | Transport Fee | 5,000 | 500,000 |
| concession | Scholarship | -2,000 | -200,000 |
| carry_forward | Previous balance | 3,000 | 300,000 |
| **Total Charges** | | **26,000** | **2,600,000** |
| payment | Receipt 000001 | -10,000 | -1,000,000 |
| **Balance** | | **16,000** | **1,600,000** |

## Receipt Numbering

### Format

Zero-padded 6-digit sequential number per financial year:

```
Financial Year 2026-27:
  000001
  000002
  000003
  ...
  999999

Financial Year 2027-28:
  000001  (restarts)
  000002
  ...
```

### Financial Year Derivation

Uses academic year label as financial year identifier:

```typescript
function getFinancialYear(academicYearLabel: string): string {
  return academicYearLabel; // "2026-27"
}
```

**Why simple?**
- Keeps receipt numbering aligned with academic year
- No complex tax/accounting year rules needed in V1
- Can be extended later if business requires fiscal year offset

### Atomic Generation

Receipt numbers are generated atomically using SQLite's `INSERT OR REPLACE` with increment:

```sql
INSERT INTO receipt_counters (school_id, financial_year, last_number)
VALUES (?, ?, 1)
ON CONFLICT (school_id, financial_year)
DO UPDATE SET last_number = last_number + 1
RETURNING last_number
```

**Guarantees:**
- No duplicate receipt numbers
- No gaps under normal operation
- Thread-safe for concurrent requests (single SQLite statement)
- School-isolated counters

**Limitations:**
- D1/SQLite does not provide cross-system transactions
- If payment record insert fails after counter increment, that number is lost (gap)
- This is acceptable for financial systems - gaps are logged, duplicates are not allowed

## Voiding

### Purpose

Financial records cannot be deleted. Corrections are made by voiding:

**Before Void:**
```json
{
  "id": "charge-uuid",
  "amount_paise": 5000000,
  "voided_at": null,
  "voided_by": null,
  "void_reason": null
}
```

**After Void:**
```json
{
  "id": "charge-uuid",
  "amount_paise": 5000000,  // Original amount unchanged
  "voided_at": 1726761600000,
  "voided_by": "principal-uuid",
  "void_reason": "Duplicate entry - correcting"
}
```

### Rules

1. **Reason required**: Void requests must include a meaningful reason
2. **No re-voiding**: Cannot void an already-voided entry
3. **Immutable original data**: Amount, title, kind, date remain unchanged
4. **Audit logged**: Voiding action is logged with before/after state
5. **Balance calculation**: Voided entries are excluded from active balance

### Endpoints

```
POST /fees/charges/:id/void
POST /fees/payments/:id/void

Body:
{
  "reason": "Duplicate entry - correcting"
}
```

## API Endpoints

### Fee Categories (Principal Only)

#### POST /fees/categories
Create fee category

**Request:**
```json
{
  "code": "TUITION",
  "name": "Tuition Fee"
}
```

**Response:** `201 Created`
```json
{
  "data": {
    "id": "uuid",
    "school_id": "school-uuid",
    "code": "TUITION",
    "name": "Tuition Fee",
    "status": "active",
    "created_at": 1726761600000,
    "updated_at": 1726761600000
  }
}
```

#### GET /fees/categories
List fee categories

**Query Params:**
- `status` (optional): `active` | `inactive`

**Response:** `200 OK`
```json
{
  "data": [
    { "id": "uuid", "code": "TUITION", "name": "Tuition Fee", "status": "active", ... },
    { "id": "uuid", "code": "TRANSPORT", "name": "Transport Fee", "status": "active", ... }
  ]
}
```

#### PUT /fees/categories/:id
Update fee category

**Request:**
```json
{
  "name": "Tuition and Exam Fee",
  "status": "inactive"
}
```

**Response:** `200 OK`

---

### Fee Charges (Principal Only)

#### POST /fees/charges
Create fee charge

**Request:**
```json
{
  "student_id": "student-uuid",
  "academic_year_id": "year-uuid",
  "enrollment_id": "enrollment-uuid",  // Optional
  "fee_category_id": "category-uuid",  // Optional
  "kind": "fee",
  "title": "Tuition Fee - Q1",
  "amount_paise": 5000000,  // ₹50,000.00
  "due_on": "2026-06-30"    // Optional
}
```

**Validation:**
- `kind = 'fee'` or `'carry_forward'` → `amount_paise` must be positive
- `kind = 'concession'` → `amount_paise` must be negative

**Response:** `201 Created`

#### GET /fees/students/:studentId/charges
List student's fee charges

**Query Params:**
- `academic_year_id` (optional): Filter by academic year

**Authorization:**
- Principal: can view any student in their school
- Student: can only view own charges (studentId must match authenticated user)

**Response:** `200 OK`

#### POST /fees/charges/:id/void
Void fee charge

**Request:**
```json
{
  "reason": "Duplicate entry"
}
```

**Response:** `200 OK`

---

### Fee Payments (Principal Only)

#### POST /fees/payments
Record fee payment

**Request:**
```json
{
  "student_id": "student-uuid",
  "academic_year_id": "year-uuid",
  "amount_paise": 1000000,  // ₹10,000.00
  "paid_on": "2026-05-15",
  "method": "upi",
  "reference": "TXN123456789"  // Optional
}
```

**Receipt Number:**
- Server-generated sequentially
- Client cannot provide `receipt_no`

**Response:** `201 Created`
```json
{
  "data": {
    "id": "uuid",
    "receipt_no": "000042",
    "amount_paise": 1000000,
    "paid_on": "2026-05-15",
    "method": "upi",
    "reference": "TXN123456789",
    ...
  }
}
```

#### GET /fees/students/:studentId/payments
List student's fee payments

**Query Params:**
- `academic_year_id` (optional): Filter by academic year

**Authorization:**
- Principal: can view any student in their school
- Student: can only view own payments (studentId must match authenticated user)

**Response:** `200 OK`

#### POST /fees/payments/:id/void
Void fee payment

**Request:**
```json
{
  "reason": "Incorrect amount - re-recording"
}
```

**Response:** `200 OK`

---

### Fee Summary (Principal/Student)

#### GET /fees/students/:studentId/summary
Get student fee summary for an academic year

**Query Params:**
- `academic_year_id` (required): Academic year to query

**Authorization:**
- Principal: can view any student in their school
- Student: can only view own summary (studentId must match authenticated user)

**Response:** `200 OK`
```json
{
  "data": {
    "student_id": "student-uuid",
    "academic_year_id": "year-uuid",
    "total_charges_paise": 2600000,  // ₹26,000
    "total_fees_paise": 2500000,     // ₹25,000
    "total_concessions_paise": -200000,  // -₹2,000
    "total_carry_forward_paise": 300000,  // ₹3,000
    "total_payments_paise": 1000000,      // ₹10,000
    "balance_paise": 1600000,             // ₹16,000
    "charge_count": 4,
    "payment_count": 1
  }
}
```

---

### Student Self-Service

#### GET /me/fees/:academicYearId
Get own fee details for an academic year

**Authorization:** Student only

**Security:**
- Student ID derived from `TenantContext.userId`
- Cannot access another student's fees
- No `studentId` in request path

**Response:** `200 OK`
```json
{
  "data": {
    "academic_year_id": "year-uuid",
    "academic_year_label": "2026-27",
    "summary": {
      "student_id": "student-uuid",
      "total_charges_paise": 2600000,
      "total_payments_paise": 1000000,
      "balance_paise": 1600000,
      ...
    },
    "ledger": [
      {
        "type": "charge",
        "id": "uuid",
        "date": "2026-06-30",
        "title": "Tuition Fee - Q1",
        "amount_paise": 2000000,
        "kind": "fee",
        "is_voided": false,
        "created_at": 1726761600000
      },
      {
        "type": "payment",
        "id": "uuid",
        "date": "2026-05-15",
        "title": "Payment",
        "amount_paise": 1000000,
        "receipt_no": "000042",
        "method": "upi",
        "reference": "TXN123456789",
        "is_voided": false,
        "created_at": 1726761700000
      }
    ]
  }
}
```

## School Isolation

**All queries are school-scoped:**

```typescript
// Bad - Cross-school vulnerability
const charge = await db
  .prepare('SELECT * FROM fee_charges WHERE id = ?')
  .bind(chargeId)
  .first();

// Good - School-scoped
const charge = await db
  .prepare('SELECT * FROM fee_charges WHERE id = ? AND school_id = ?')
  .bind(chargeId, tenant.schoolId)
  .first();
```

**Enforcement:**
- `tenant.schoolId` always comes from authenticated token
- Repository layer enforces school isolation on all queries
- Cross-school access fails closed (returns 404)

## Audit Logging

All fee mutations are audited:

| Action | Description | Before | After |
|--------|-------------|--------|-------|
| `fee_category_created` | New category | null | Full record |
| `fee_category_updated` | Category update | Old record | New record |
| `fee_charge_created` | New charge | null | Full record |
| `fee_charge_voided` | Charge voided | Pre-void | Post-void |
| `fee_payment_recorded` | New payment | null | Full record |
| `fee_payment_voided` | Payment voided | Pre-void | Post-void |

**Audit record:**
```typescript
{
  actor_id: "principal-uuid",
  actor_role: "principal",
  action: "fee_charge_voided",
  entity: "fee_charge",
  entity_id: "charge-uuid",
  school_id: "school-uuid",
  before: "{...original charge}",
  after: "{...charge with void fields}",
  at: 1726761600000
}
```

## Append-Only Integrity

### Database Enforcement

The schema enforces append-only behavior:

```sql
-- Trigger to prevent DELETE on fee_charges
CREATE TRIGGER IF NOT EXISTS prevent_fee_charges_delete
BEFORE DELETE ON fee_charges
BEGIN
  SELECT RAISE(ABORT, 'DELETE not allowed on fee_charges');
END;

-- Trigger to prevent DELETE on fee_payments
CREATE TRIGGER IF NOT EXISTS prevent_fee_payments_delete
BEFORE DELETE ON fee_payments
BEGIN
  SELECT RAISE(ABORT, 'DELETE not allowed on fee_payments');
END;

-- Trigger to prevent UPDATE of immutable fields
CREATE TRIGGER IF NOT EXISTS prevent_fee_charges_amount_update
BEFORE UPDATE OF amount_paise ON fee_charges
BEGIN
  SELECT RAISE(ABORT, 'Cannot modify amount_paise on fee_charges');
END;
```

### Service Layer Rules

1. **Never issue DELETE** against `fee_charges` or `fee_payments`
2. **Never UPDATE** `amount_paise`, `title`, `kind`, or core financial fields
3. **Corrections** happen via void + new entry
4. **Audit trail** preserved forever

## Previous Academic Years

**Principal:**
- Can view fee records from any academic year
- No restriction on historical data access
- Useful for reporting and auditing

**Student:**
- Can view own fee history from previous years via `/me/fees/:academicYearId`
- Supports multi-year fee queries

**No automatic cleanup:**
- Fee records are never deleted when academic years change
- Financial history is preserved indefinitely

## Carry-Forward Workflow

Carry-forward is **NOT automatic**. It requires explicit principal action:

### End of Year
1. Principal reviews unpaid balances for each student
2. For students with outstanding balance, Principal creates a new charge:

```json
POST /fees/charges
{
  "student_id": "student-uuid",
  "academic_year_id": "2027-28-year-uuid",  // New year
  "kind": "carry_forward",
  "title": "Balance from 2026-27",
  "amount_paise": 1600000,  // ₹16,000 (calculated from old year)
  "due_on": "2027-04-01"
}
```

3. This creates a new ledger entry in the new academic year
4. Old year's records remain unchanged and queryable

## V1 Exclusions

The following features are **NOT implemented** in V1:

### No Payment Allocation

Payments are ledger-level only. We do NOT track:
- Which payment applies to which charge
- Partial payments against specific fees
- Invoice-style allocation

**Reason:** Simplifies V1 implementation. Future versions can add `fee_payment_allocations` table if needed.

### No Fee Structures

We do NOT have:
- Predefined fee structure templates
- Grade-level fee templates
- Bulk fee application

**Reason:** Charges are created individually by principal as needed.

### No Parent Fee Accounts

Students are billed directly. We do NOT have:
- Parent/guardian fee accounts
- Family-level billing
- Sibling discounts

**Reason:** V1 focuses on student-level fee tracking.

### No Online Payment Gateway

We do NOT integrate with:
- Payment gateways (Razorpay, Stripe, etc.)
- Online payment portals
- Automated payment callbacks

**Reason:** V1 is for manual payment recording by principal.

### No Automated Reminders

We do NOT have:
- Email/SMS fee reminders
- Due date notifications
- Overdue alerts

**Reason:** Communication features are out of scope for V1.

## Security Review Checklist

Before deployment, verify:

**Student ID Security:**
- ✅ Student cannot view another student's fees
- ✅ Student cannot create charges
- ✅ Student cannot record payments
- ✅ Student cannot void transactions
- ✅ Student ID always derived from `TenantContext.userId`

**Principal Restrictions:**
- ✅ Principal cannot access another school's data
- ✅ All repository queries are school-scoped
- ✅ Cross-school access returns 404

**Receipt Number Integrity:**
- ✅ Receipt numbers are server-generated
- ✅ Client cannot provide receipt number
- ✅ Atomic increment prevents duplicates
- ✅ School-isolated counters

**Amount Validation:**
- ✅ Fee/carry-forward amounts must be positive
- ✅ Concession amounts must be negative
- ✅ Payment amounts must be positive
- ✅ Amount is integer paise (no float/decimal)

**Void Security:**
- ✅ Void reason is required
- ✅ Cannot void already-voided entry
- ✅ Original amount/fields unchanged
- ✅ Voiding is audited

**Audit Logging:**
- ✅ All mutations are logged
- ✅ Before/after state captured
- ✅ Actor and timestamp recorded
- ✅ No passwords/tokens in audit logs

## D1/SQLite Limitations

**No distributed transactions:**
- D1 does not support ACID transactions across external systems
- Receipt counter increment + payment insert are separate statements
- If payment insert fails, that receipt number is lost (gap)
- This is acceptable - gaps are logged, duplicates are prevented

**Concurrency:**
- Single SQLite statement (INSERT OR REPLACE) is atomic
- Multiple concurrent requests will serialize at the DB level
- Receipt numbers will not duplicate but may have gaps under high concurrency

**Do NOT claim:**
- ❌ "Full ACID guarantees across all operations"
- ❌ "Automatic rollback if payment fails"
- ❌ "Zero gaps in receipt numbers"

**Valid claims:**
- ✅ "Atomic receipt number generation"
- ✅ "No duplicate receipt numbers"
- ✅ "Append-only ledger integrity"

## Amount Representation

**Storage:** Integer paise (1/100th of rupee)

**Conversion:**
- ₹1.00 = 100 paise
- ₹10.50 = 1050 paise
- ₹1,000.00 = 100,000 paise

**Why integers?**
- Avoids floating-point precision errors
- Standard practice in financial systems
- SQLite `INTEGER` column type

**Client Responsibility:**
- Convert rupees to paise before sending to API
- Convert paise to rupees for display
- Do not use JavaScript `Number` for large amounts (use `BigInt` or string)

## Implementation Summary

**Files Created:**
- `src/fees/fees.types.ts` - Type definitions
- `src/fees/fees.schemas.ts` - Zod validation
- `src/fees/fees.errors.ts` - Error classes
- `src/fees/fees.repository.ts` - Database layer
- `src/fees/fees.authorization.ts` - Authorization rules
- `src/fees/fees.service.ts` - Business logic
- `src/fees/fees.routes.ts` - HTTP endpoints

**Files Modified:**
- `src/accounts/me.routes.ts` - Added GET /me/fees/:academicYearId
- `src/index.ts` - Registered fees routes
- `src/lib/audit/audit.service.ts` - Added fee audit actions

**Endpoints:** 11 total
- 3 category endpoints (Principal)
- 3 charge endpoints (Principal)
- 3 payment endpoints (Principal)
- 1 summary endpoint (Principal/Student)
- 1 student self-service endpoint

**Database Tables:** 4 existing tables used as-is
- `fee_categories`
- `fee_charges`
- `fee_payments`
- `receipt_counters`

**Authorization:**
- Principal: Full management
- Teacher: No access
- Student: Read-only self-service

**Key Features:**
- Append-only ledger
- Atomic receipt numbering
- Voiding with reason
- Pure balance calculation
- School isolation
- Audit logging
- Previous-year access
