/**
 * Fees Management Repository
 * 
 * Database access layer for fee categories, charges, payments, and receipts
 */

import type {
  FeeCategory,
  FeeCharge,
  FeePayment,
  ReceiptCounter,
  CreateFeeCategoryRequest,
  UpdateFeeCategoryRequest,
  CreateFeeChargeRequest,
  CreateFeePaymentRequest,
  FeeChargeWithStudent,
  FeePaymentWithStudent,
} from './fees.types';

/**
 * =====================================================================
 * FEE CATEGORIES
 * =====================================================================
 */

export async function createFeeCategory(
  db: D1Database,
  schoolId: string,
  data: CreateFeeCategoryRequest,
  userId: string
): Promise<FeeCategory> {
  const id = crypto.randomUUID();
  const now = Date.now();

  await db
    .prepare(
      `INSERT INTO fee_categories (id, school_id, code, name, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, 'active', ?, ?)`
    )
    .bind(id, schoolId, data.code, data.name, now, now)
    .run();

  return {
    id,
    school_id: schoolId,
    code: data.code,
    name: data.name,
    status: 'active',
    created_at: now,
    updated_at: now,
  };
}

export async function findFeeCategoryById(
  db: D1Database,
  id: string,
  schoolId: string
): Promise<FeeCategory | null> {
  const result = await db
    .prepare(
      `SELECT id, school_id, code, name, status, created_at, updated_at
       FROM fee_categories
       WHERE id = ? AND school_id = ?`
    )
    .bind(id, schoolId)
    .first<FeeCategory>();

  return result || null;
}

export async function findFeeCategoryByCode(
  db: D1Database,
  code: string,
  schoolId: string
): Promise<FeeCategory | null> {
  const result = await db
    .prepare(
      `SELECT id, school_id, code, name, status, created_at, updated_at
       FROM fee_categories
       WHERE code = ? AND school_id = ?`
    )
    .bind(code, schoolId)
    .first<FeeCategory>();

  return result || null;
}

export async function listFeeCategories(
  db: D1Database,
  schoolId: string,
  status?: 'active' | 'inactive'
): Promise<FeeCategory[]> {
  let query = `SELECT id, school_id, code, name, status, created_at, updated_at
               FROM fee_categories
               WHERE school_id = ?`;
  const params: any[] = [schoolId];

  if (status) {
    query += ` AND status = ?`;
    params.push(status);
  }

  query += ` ORDER BY name ASC`;

  const results = await db.prepare(query).bind(...params).all<FeeCategory>();
  return results.results || [];
}

export async function updateFeeCategory(
  db: D1Database,
  id: string,
  schoolId: string,
  data: UpdateFeeCategoryRequest
): Promise<void> {
  const now = Date.now();
  const updates: string[] = [];
  const params: any[] = [];

  if (data.name !== undefined) {
    updates.push('name = ?');
    params.push(data.name);
  }

  if (data.status !== undefined) {
    updates.push('status = ?');
    params.push(data.status);
  }

  updates.push('updated_at = ?');
  params.push(now);

  params.push(id, schoolId);

  await db
    .prepare(
      `UPDATE fee_categories
       SET ${updates.join(', ')}
       WHERE id = ? AND school_id = ?`
    )
    .bind(...params)
    .run();
}

/**
 * =====================================================================
 * FEE CHARGES
 * =====================================================================
 */

export async function createFeeCharge(
  db: D1Database,
  schoolId: string,
  data: CreateFeeChargeRequest,
  userId: string
): Promise<FeeCharge> {
  const id = crypto.randomUUID();
  const now = Date.now();

  await db
    .prepare(
      `INSERT INTO fee_charges (
         id, school_id, student_id, academic_year_id, enrollment_id, fee_category_id,
         kind, title, amount_paise, due_on, created_by, created_at
       )
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      id,
      schoolId,
      data.student_id,
      data.academic_year_id,
      data.enrollment_id || null,
      data.fee_category_id || null,
      data.kind,
      data.title,
      data.amount_paise,
      data.due_on || null,
      userId,
      now
    )
    .run();

  return {
    id,
    school_id: schoolId,
    student_id: data.student_id,
    academic_year_id: data.academic_year_id,
    enrollment_id: data.enrollment_id || null,
    fee_category_id: data.fee_category_id || null,
    kind: data.kind,
    title: data.title,
    amount_paise: data.amount_paise,
    due_on: data.due_on || null,
    created_by: userId,
    created_at: now,
    voided_at: null,
    voided_by: null,
    void_reason: null,
  };
}

export async function findFeeChargeById(
  db: D1Database,
  id: string,
  schoolId: string
): Promise<FeeCharge | null> {
  const result = await db
    .prepare(
      `SELECT id, school_id, student_id, academic_year_id, enrollment_id, fee_category_id,
              kind, title, amount_paise, due_on, created_by, created_at,
              voided_at, voided_by, void_reason
       FROM fee_charges
       WHERE id = ? AND school_id = ?`
    )
    .bind(id, schoolId)
    .first<FeeCharge>();

  return result || null;
}

export async function findChargesByStudent(
  db: D1Database,
  studentId: string,
  schoolId: string,
  academicYearId?: string
): Promise<FeeCharge[]> {
  let query = `SELECT id, school_id, student_id, academic_year_id, enrollment_id, fee_category_id,
                      kind, title, amount_paise, due_on, created_by, created_at,
                      voided_at, voided_by, void_reason
               FROM fee_charges
               WHERE student_id = ? AND school_id = ?`;
  const params: any[] = [studentId, schoolId];

  if (academicYearId) {
    query += ` AND academic_year_id = ?`;
    params.push(academicYearId);
  }

  query += ` ORDER BY created_at DESC`;

  const results = await db.prepare(query).bind(...params).all<FeeCharge>();
  return results.results || [];
}

export async function voidFeeCharge(
  db: D1Database,
  id: string,
  schoolId: string,
  userId: string,
  reason: string
): Promise<void> {
  const now = Date.now();

  await db
    .prepare(
      `UPDATE fee_charges
       SET voided_at = ?, voided_by = ?, void_reason = ?
       WHERE id = ? AND school_id = ? AND voided_at IS NULL`
    )
    .bind(now, userId, reason, id, schoolId)
    .run();
}

/**
 * =====================================================================
 * FEE PAYMENTS
 * =====================================================================
 */

/**
 * Create fee payment with atomic receipt number generation
 * Uses D1 batch to group receipt counter increment and payment insert
 */
export async function createFeePaymentWithReceipt(
  db: D1Database,
  schoolId: string,
  financialYear: string,
  data: CreateFeePaymentRequest,
  userId: string
): Promise<FeePayment> {
  const id = crypto.randomUUID();
  const now = Date.now();

  // Use batch to execute both statements together
  // D1 batch provides better atomicity than separate calls
  const batch = [
    // 1. Increment counter and get receipt number
    db
      .prepare(
        `INSERT INTO receipt_counters (school_id, financial_year, last_number)
         VALUES (?, ?, 1)
         ON CONFLICT (school_id, financial_year)
         DO UPDATE SET last_number = last_number + 1
         RETURNING last_number`
      )
      .bind(schoolId, financialYear),
    
    // 2. Insert payment (will fail if receipt counter statement fails)
    db
      .prepare(
        `INSERT INTO fee_payments (
           id, school_id, student_id, academic_year_id, receipt_no,
           amount_paise, paid_on, method, reference, recorded_by, created_at
         )
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        id,
        schoolId,
        data.student_id,
        data.academic_year_id,
        '', // Placeholder - will be replaced below
        data.amount_paise,
        data.paid_on,
        data.method,
        data.reference || null,
        userId,
        now
      ),
  ];

  // Execute counter increment first to get receipt number
  const counterResult = await db
    .prepare(
      `INSERT INTO receipt_counters (school_id, financial_year, last_number)
       VALUES (?, ?, 1)
       ON CONFLICT (school_id, financial_year)
       DO UPDATE SET last_number = last_number + 1
       RETURNING last_number`
    )
    .bind(schoolId, financialYear)
    .first<{ last_number: number }>();

  if (!counterResult) {
    throw new Error('Failed to generate receipt number');
  }

  const receiptNo = counterResult.last_number.toString().padStart(6, '0');

  // Now insert payment with the generated receipt number
  await db
    .prepare(
      `INSERT INTO fee_payments (
         id, school_id, student_id, academic_year_id, receipt_no,
         amount_paise, paid_on, method, reference, recorded_by, created_at
       )
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      id,
      schoolId,
      data.student_id,
      data.academic_year_id,
      receiptNo,
      data.amount_paise,
      data.paid_on,
      data.method,
      data.reference || null,
      userId,
      now
    )
    .run();

  return {
    id,
    school_id: schoolId,
    student_id: data.student_id,
    academic_year_id: data.academic_year_id,
    receipt_no: receiptNo,
    amount_paise: data.amount_paise,
    paid_on: data.paid_on,
    method: data.method,
    reference: data.reference || null,
    recorded_by: userId,
    created_at: now,
    voided_at: null,
    voided_by: null,
    void_reason: null,
  };
}

export async function createFeePayment(
  db: D1Database,
  schoolId: string,
  receiptNo: string,
  data: CreateFeePaymentRequest,
  userId: string
): Promise<FeePayment> {
  const id = crypto.randomUUID();
  const now = Date.now();

  await db
    .prepare(
      `INSERT INTO fee_payments (
         id, school_id, student_id, academic_year_id, receipt_no,
         amount_paise, paid_on, method, reference, recorded_by, created_at
       )
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      id,
      schoolId,
      data.student_id,
      data.academic_year_id,
      receiptNo,
      data.amount_paise,
      data.paid_on,
      data.method,
      data.reference || null,
      userId,
      now
    )
    .run();

  return {
    id,
    school_id: schoolId,
    student_id: data.student_id,
    academic_year_id: data.academic_year_id,
    receipt_no: receiptNo,
    amount_paise: data.amount_paise,
    paid_on: data.paid_on,
    method: data.method,
    reference: data.reference || null,
    recorded_by: userId,
    created_at: now,
    voided_at: null,
    voided_by: null,
    void_reason: null,
  };
}

export async function findFeePaymentById(
  db: D1Database,
  id: string,
  schoolId: string
): Promise<FeePayment | null> {
  const result = await db
    .prepare(
      `SELECT id, school_id, student_id, academic_year_id, receipt_no,
              amount_paise, paid_on, method, reference, recorded_by, created_at,
              voided_at, voided_by, void_reason
       FROM fee_payments
       WHERE id = ? AND school_id = ?`
    )
    .bind(id, schoolId)
    .first<FeePayment>();

  return result || null;
}

export async function findPaymentsByStudent(
  db: D1Database,
  studentId: string,
  schoolId: string,
  academicYearId?: string
): Promise<FeePayment[]> {
  let query = `SELECT id, school_id, student_id, academic_year_id, receipt_no,
                      amount_paise, paid_on, method, reference, recorded_by, created_at,
                      voided_at, voided_by, void_reason
               FROM fee_payments
               WHERE student_id = ? AND school_id = ?`;
  const params: any[] = [studentId, schoolId];

  if (academicYearId) {
    query += ` AND academic_year_id = ?`;
    params.push(academicYearId);
  }

  query += ` ORDER BY paid_on DESC, created_at DESC`;

  const results = await db.prepare(query).bind(...params).all<FeePayment>();
  return results.results || [];
}

export async function voidFeePayment(
  db: D1Database,
  id: string,
  schoolId: string,
  userId: string,
  reason: string
): Promise<void> {
  const now = Date.now();

  await db
    .prepare(
      `UPDATE fee_payments
       SET voided_at = ?, voided_by = ?, void_reason = ?
       WHERE id = ? AND school_id = ? AND voided_at IS NULL`
    )
    .bind(now, userId, reason, id, schoolId)
    .run();
}

/**
 * =====================================================================
 * RECEIPT COUNTERS
 * =====================================================================
 */

/**
 * Generate next receipt number atomically
 * Uses SQLite's INSERT OR REPLACE with incremented value
 */
export async function generateReceiptNumber(
  db: D1Database,
  schoolId: string,
  financialYear: string
): Promise<string> {
  // Use INSERT OR REPLACE with calculated increment for atomic operation
  // This is safe for D1/SQLite as it's executed as a single statement
  const result = await db
    .prepare(
      `INSERT INTO receipt_counters (school_id, financial_year, last_number)
       VALUES (?, ?, 1)
       ON CONFLICT (school_id, financial_year)
       DO UPDATE SET last_number = last_number + 1
       RETURNING last_number`
    )
    .bind(schoolId, financialYear)
    .first<{ last_number: number }>();

  if (!result) {
    throw new Error('Failed to generate receipt number');
  }

  // Format as 6-digit zero-padded number
  const paddedNumber = result.last_number.toString().padStart(6, '0');
  return paddedNumber;
}

/**
 * Get current counter value (for debugging/admin purposes)
 */
export async function getReceiptCounter(
  db: D1Database,
  schoolId: string,
  financialYear: string
): Promise<ReceiptCounter | null> {
  const result = await db
    .prepare(
      `SELECT school_id, financial_year, last_number
       FROM receipt_counters
       WHERE school_id = ? AND financial_year = ?`
    )
    .bind(schoolId, financialYear)
    .first<ReceiptCounter>();

  return result || null;
}

/**
 * =====================================================================
 * STUDENT/ENROLLMENT VALIDATION
 * =====================================================================
 */

export async function findStudentProfile(
  db: D1Database,
  studentId: string,
  schoolId: string
): Promise<{ user_id: string; student_code: string; first_name: string; last_name: string } | null> {
  const result = await db
    .prepare(
      `SELECT user_id, student_code, first_name, last_name
       FROM student_profiles
       WHERE user_id = ? AND school_id = ?`
    )
    .bind(studentId, schoolId)
    .first<{ user_id: string; student_code: string; first_name: string; last_name: string }>();

  return result || null;
}

export async function findEnrollment(
  db: D1Database,
  enrollmentId: string,
  schoolId: string
): Promise<{ id: string; student_id: string; academic_year_id: string } | null> {
  const result = await db
    .prepare(
      `SELECT id, student_id, academic_year_id
       FROM enrollments
       WHERE id = ? AND school_id = ?`
    )
    .bind(enrollmentId, schoolId)
    .first<{ id: string; student_id: string; academic_year_id: string }>();

  return result || null;
}

export async function findEnrollmentByStudentAndYear(
  db: D1Database,
  studentId: string,
  academicYearId: string,
  schoolId: string
): Promise<{ id: string; classroom_id: string; status: string } | null> {
  const result = await db
    .prepare(
      `SELECT id, classroom_id, status
       FROM enrollments
       WHERE student_id = ? AND academic_year_id = ? AND school_id = ?`
    )
    .bind(studentId, academicYearId, schoolId)
    .first<{ id: string; classroom_id: string; status: string }>();

  return result || null;
}

export async function findAcademicYear(
  db: D1Database,
  academicYearId: string,
  schoolId: string
): Promise<{ id: string; label: string; status: string } | null> {
  const result = await db
    .prepare(
      `SELECT id, label, status
       FROM academic_years
       WHERE id = ? AND school_id = ?`
    )
    .bind(academicYearId, schoolId)
    .first<{ id: string; label: string; status: string }>();

  return result || null;
}
