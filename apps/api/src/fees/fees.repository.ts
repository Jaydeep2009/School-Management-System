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
  FeeChargeWithDetails,
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
 * Find fee charges with filters and student details
 * 
 * IMPORTANT FEE CALCULATION NOTES:
 * - Payments are NOT linked to specific charges in the database
 * - This function calculates totals at the student+year level
 * - Each charge shows the TOTAL payments for that student+year (not per-charge payment)
 * - Status is calculated based on: total charges vs total payments for student+year
 * 
 * For accurate balance calculations, always use calculateFeeSummary() from fees.service
 */
export async function findCharges(
  db: D1Database,
  schoolId: string,
  filters: {
    academicYearId?: string;
    studentId?: string;
    status?: 'pending' | 'partially_paid' | 'paid';
  }
): Promise<FeeChargeWithDetails[]> {
  // Step 1: Get all charges with student details
  let chargeQuery = `
    SELECT 
      fc.id, fc.school_id, fc.student_id, fc.academic_year_id, fc.enrollment_id, fc.fee_category_id,
      fc.kind, fc.title, fc.amount_paise, fc.due_on, fc.created_by, fc.created_at,
      fc.voided_at, fc.voided_by, fc.void_reason,
      sp.student_code,
      sp.first_name || ' ' || COALESCE(sp.middle_name || ' ', '') || sp.last_name as student_name,
      fcat.name as category_name
    FROM fee_charges fc
    LEFT JOIN student_profiles sp ON fc.student_id = sp.user_id
    LEFT JOIN fee_categories fcat ON fc.fee_category_id = fcat.id
    WHERE fc.school_id = ? AND fc.voided_at IS NULL
  `;
  
  const params: any[] = [schoolId];

  if (filters.academicYearId) {
    chargeQuery += ` AND fc.academic_year_id = ?`;
    params.push(filters.academicYearId);
  }

  if (filters.studentId) {
    chargeQuery += ` AND fc.student_id = ?`;
    params.push(filters.studentId);
  }

  chargeQuery += ` ORDER BY fc.due_on DESC, fc.created_at DESC`;

  const chargeResults = await db.prepare(chargeQuery).bind(...params).all<any>();
  const charges = chargeResults.results || [];

  // If no charges, return empty array
  if (charges.length === 0) {
    return [];
  }

  // Step 2: Get payment totals per student+year combination
  let paymentQuery = `
    SELECT 
      fp.student_id,
      fp.academic_year_id,
      SUM(fp.amount_paise) as total_paid_paise
    FROM fee_payments fp
    WHERE fp.school_id = ? AND fp.voided_at IS NULL
  `;
  
  const paymentParams: any[] = [schoolId];

  if (filters.academicYearId) {
    paymentQuery += ` AND fp.academic_year_id = ?`;
    paymentParams.push(filters.academicYearId);
  }

  if (filters.studentId) {
    paymentQuery += ` AND fp.student_id = ?`;
    paymentParams.push(filters.studentId);
  }

  paymentQuery += ` GROUP BY fp.student_id, fp.academic_year_id`;

  const paymentResults = await db.prepare(paymentQuery).bind(...paymentParams).all<any>();
  
  // Build map of student+year -> total payment
  const paymentTotals = new Map<string, number>();
  for (const row of (paymentResults.results || [])) {
    const key = `${row.student_id}-${row.academic_year_id}`;
    paymentTotals.set(key, row.total_paid_paise || 0);
  }

  // Step 3: Calculate charge totals per student+year
  const studentYearTotals = new Map<string, {totalCharges: number, totalPaid: number}>();
  
  for (const charge of charges) {
    const key = `${charge.student_id}-${charge.academic_year_id}`;
    const existing = studentYearTotals.get(key) || {totalCharges: 0, totalPaid: 0};
    existing.totalCharges += charge.amount_paise;
    existing.totalPaid = paymentTotals.get(key) || 0;
    studentYearTotals.set(key, existing);
  }

  // Step 4: Attach totals to each charge and calculate status
  const result = charges.map((row: any) => {
    const key = `${row.student_id}-${row.academic_year_id}`;
    const totals = studentYearTotals.get(key) || {totalCharges: 0, totalPaid: 0};
    
    // Status is based on student+year totals, not individual charge
    const status = totals.totalPaid >= totals.totalCharges ? 'paid' 
                 : totals.totalPaid > 0 ? 'partially_paid' 
                 : 'pending';

    return {
      ...row,
      amount: row.amount_paise / 100,
      total_paid: totals.totalPaid / 100, // TOTAL for this student+year, not per charge
      status,
    };
  });

  // Apply status filter if specified
  if (filters.status) {
    return result.filter(r => r.status === filters.status);
  }

  return result;
}
/**
 * =====================================================================
 * FEE PAYMENTS
 * =====================================================================
 */

/**
 * Create fee payment with receipt number generation
 * 
 * IMPORTANT: This executes TWO sequential operations:
 * 1. Generate receipt number (atomic counter increment)
 * 2. Insert payment record with that receipt number
 * 
 * These are NOT atomic together because:
 * - D1/SQLite RETURNING value cannot be passed between batch statements
 * - Payment INSERT requires the receipt_no from counter INCREMENT
 * 
 * Guarantees:
 * - NO duplicate receipt numbers (counter increment is atomic)
 * - NO payment without receipt number (we generate first, then insert)
 * - Receipt gaps are POSSIBLE (if payment insert fails after counter increment)
 * - This is ACCEPTABLE per financial system requirements
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

  // Step 1: Generate receipt number atomically
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

  const receiptNo = `REC/${financialYear}/${counterResult.last_number.toString().padStart(6, '0')}`;

  // Step 2: Insert payment with generated receipt number
  // If this fails, receipt number is skipped (gap) - acceptable
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
