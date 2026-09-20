/**
 * Fees Management Service
 * 
 * Business logic for fee categories, charges, payments, and ledger calculations
 */

import type { TenantContext } from '../auth/auth.types';
import type {
  FeeCategory,
  FeeCharge,
  FeePayment,
  CreateFeeCategoryRequest,
  UpdateFeeCategoryRequest,
  CreateFeeChargeRequest,
  CreateFeePaymentRequest,
  FeeSummary,
  StudentFeeLedgerEntry,
  StudentFeeDetails,
} from './fees.types';
import * as feesRepo from './fees.repository';
import * as feesAuthz from './fees.authorization';
import { FeesError } from './fees.errors';
import { logAudit } from '../lib/audit/audit.service';

/**
 * =====================================================================
 * FINANCIAL YEAR HELPER
 * =====================================================================
 */

/**
 * Derive financial year identifier from academic year label
 * Example: "2026-27" -> "2026-27"
 * This keeps it simple - use the academic year label as the financial year
 */
function getFinancialYear(academicYearLabel: string): string {
  return academicYearLabel;
}

/**
 * =====================================================================
 * FEE CATEGORIES
 * =====================================================================
 */

export async function createFeeCategory(
  db: D1Database,
  tenant: TenantContext,
  data: CreateFeeCategoryRequest
): Promise<FeeCategory> {
  feesAuthz.ensureCanManageCategories(tenant);

  // Check if code already exists
  const existing = await feesRepo.findFeeCategoryByCode(db, data.code, tenant.schoolId);
  if (existing) {
    throw FeesError.categoryCodeExists(data.code);
  }

  const category = await feesRepo.createFeeCategory(db, tenant.schoolId, data, tenant.userId);

  // Audit log
  await logAudit(db, tenant, 'fee_category_created', 'fee_category', category.id, null, category);

  return category;
}

export async function listFeeCategories(
  db: D1Database,
  tenant: TenantContext,
  status?: 'active' | 'inactive'
): Promise<FeeCategory[]> {
  feesAuthz.ensureCanManageCategories(tenant);

  return await feesRepo.listFeeCategories(db, tenant.schoolId, status);
}

export async function updateFeeCategory(
  db: D1Database,
  categoryId: string,
  tenant: TenantContext,
  data: UpdateFeeCategoryRequest
): Promise<void> {
  feesAuthz.ensureCanManageCategories(tenant);

  const category = await feesRepo.findFeeCategoryById(db, categoryId, tenant.schoolId);
  if (!category) {
    throw FeesError.categoryNotFound(categoryId);
  }

  const before = category;

  await feesRepo.updateFeeCategory(db, categoryId, tenant.schoolId, data);

  const after = await feesRepo.findFeeCategoryById(db, categoryId, tenant.schoolId);

  // Audit log
  await logAudit(db, tenant, 'fee_category_updated', 'fee_category', categoryId, before, after);
}

/**
 * =====================================================================
 * FEE CHARGES
 * =====================================================================
 */

export async function createFeeCharge(
  db: D1Database,
  tenant: TenantContext,
  data: CreateFeeChargeRequest
): Promise<FeeCharge> {
  feesAuthz.ensureCanCreateCharges(tenant);

  // Validate student exists in school
  const student = await feesRepo.findStudentProfile(db, data.student_id, tenant.schoolId);
  if (!student) {
    throw FeesError.studentNotFound(data.student_id);
  }

  // Validate academic year exists in school
  const academicYear = await feesRepo.findAcademicYear(db, data.academic_year_id, tenant.schoolId);
  if (!academicYear) {
    throw FeesError.academicYearNotFound(data.academic_year_id);
  }

  // Validate enrollment if provided
  if (data.enrollment_id) {
    const enrollment = await feesRepo.findEnrollment(db, data.enrollment_id, tenant.schoolId);
    if (!enrollment) {
      throw FeesError.enrollmentNotFound(data.enrollment_id);
    }
    // Ensure enrollment matches student and year
    if (enrollment.student_id !== data.student_id || enrollment.academic_year_id !== data.academic_year_id) {
      throw FeesError.enrollmentNotFound(data.enrollment_id);
    }
  }

  // Validate category if provided
  if (data.fee_category_id) {
    const category = await feesRepo.findFeeCategoryById(db, data.fee_category_id, tenant.schoolId);
    if (!category) {
      throw FeesError.categoryNotFound(data.fee_category_id);
    }
    if (category.status !== 'active') {
      throw FeesError.categoryInactive(data.fee_category_id);
    }
  }

  // Validate amount based on kind
  if (data.kind === 'fee' || data.kind === 'carry_forward') {
    if (data.amount_paise <= 0) {
      throw FeesError.invalidChargeAmount(data.kind, data.amount_paise);
    }
  } else if (data.kind === 'concession') {
    if (data.amount_paise >= 0) {
      throw FeesError.invalidChargeAmount(data.kind, data.amount_paise);
    }
  }

  const charge = await feesRepo.createFeeCharge(db, tenant.schoolId, data, tenant.userId);

  // Audit log
  await logAudit(db, tenant, 'fee_charge_created', 'fee_charge', charge.id, null, charge);

  return charge;
}

export async function listChargesForStudent(
  db: D1Database,
  studentId: string,
  tenant: TenantContext,
  academicYearId?: string
): Promise<FeeCharge[]> {
  feesAuthz.ensureCanViewStudentFees(tenant);

  // Validate student belongs to school
  const student = await feesRepo.findStudentProfile(db, studentId, tenant.schoolId);
  if (!student) {
    throw FeesError.studentNotFound(studentId);
  }

  // Students can only view their own records
  feesAuthz.ensureStudentAccessOwnFeesOnly(tenant, studentId);

  return await feesRepo.findChargesByStudent(db, studentId, tenant.schoolId, academicYearId);
}

export async function voidFeeCharge(
  db: D1Database,
  chargeId: string,
  tenant: TenantContext,
  reason: string
): Promise<void> {
  feesAuthz.ensureCanVoidCharges(tenant);

  const charge = await feesRepo.findFeeChargeById(db, chargeId, tenant.schoolId);
  if (!charge) {
    throw FeesError.chargeNotFound(chargeId);
  }

  if (charge.voided_at !== null) {
    throw FeesError.chargeAlreadyVoided(chargeId);
  }

  const before = charge;

  await feesRepo.voidFeeCharge(db, chargeId, tenant.schoolId, tenant.userId, reason);

  const after = await feesRepo.findFeeChargeById(db, chargeId, tenant.schoolId);

  // Audit log
  await logAudit(db, tenant, 'fee_charge_voided', 'fee_charge', chargeId, before, after);
}

/**
 * =====================================================================
 * FEE PAYMENTS
 * =====================================================================
 */

export async function recordFeePayment(
  db: D1Database,
  tenant: TenantContext,
  data: CreateFeePaymentRequest
): Promise<FeePayment> {
  feesAuthz.ensureCanRecordPayments(tenant);

  // Validate student exists in school
  const student = await feesRepo.findStudentProfile(db, data.student_id, tenant.schoolId);
  if (!student) {
    throw FeesError.studentNotFound(data.student_id);
  }

  // Validate academic year exists in school
  const academicYear = await feesRepo.findAcademicYear(db, data.academic_year_id, tenant.schoolId);
  if (!academicYear) {
    throw FeesError.academicYearNotFound(data.academic_year_id);
  }

  // Generate receipt number and create payment in a batch for better atomicity
  const financialYear = getFinancialYear(academicYear.label);
  const payment = await feesRepo.createFeePaymentWithReceipt(
    db,
    tenant.schoolId,
    financialYear,
    data,
    tenant.userId
  );

  // Audit log
  await logAudit(db, tenant, 'fee_payment_recorded', 'fee_payment', payment.id, null, payment);

  return payment;
}

export async function listPaymentsForStudent(
  db: D1Database,
  studentId: string,
  tenant: TenantContext,
  academicYearId?: string
): Promise<FeePayment[]> {
  feesAuthz.ensureCanViewStudentFees(tenant);

  // Validate student belongs to school
  const student = await feesRepo.findStudentProfile(db, studentId, tenant.schoolId);
  if (!student) {
    throw FeesError.studentNotFound(studentId);
  }

  // Students can only view their own records
  feesAuthz.ensureStudentAccessOwnFeesOnly(tenant, studentId);

  return await feesRepo.findPaymentsByStudent(db, studentId, tenant.schoolId, academicYearId);
}

export async function voidFeePayment(
  db: D1Database,
  paymentId: string,
  tenant: TenantContext,
  reason: string
): Promise<void> {
  feesAuthz.ensureCanVoidPayments(tenant);

  const payment = await feesRepo.findFeePaymentById(db, paymentId, tenant.schoolId);
  if (!payment) {
    throw FeesError.paymentNotFound(paymentId);
  }

  if (payment.voided_at !== null) {
    throw FeesError.paymentAlreadyVoided(paymentId);
  }

  const before = payment;

  await feesRepo.voidFeePayment(db, paymentId, tenant.schoolId, tenant.userId, reason);

  const after = await feesRepo.findFeePaymentById(db, paymentId, tenant.schoolId);

  // Audit log
  await logAudit(db, tenant, 'fee_payment_voided', 'fee_payment', paymentId, before, after);
}

/**
 * =====================================================================
 * LEDGER CALCULATIONS (PURE FUNCTIONS)
 * =====================================================================
 */

/**
 * Calculate fee summary from charges and payments
 * Pure function - no database access
 */
export function calculateFeeSummary(
  charges: FeeCharge[],
  payments: FeePayment[],
  studentId: string,
  academicYearId: string
): FeeSummary {
  // Filter active charges (not voided)
  const activeCharges = charges.filter(c => c.voided_at === null);

  // Calculate charge totals by kind
  let totalFees = 0;
  let totalConcessions = 0;
  let totalCarryForward = 0;

  for (const charge of activeCharges) {
    if (charge.kind === 'fee') {
      totalFees += charge.amount_paise;
    } else if (charge.kind === 'concession') {
      totalConcessions += charge.amount_paise; // This will be negative
    } else if (charge.kind === 'carry_forward') {
      totalCarryForward += charge.amount_paise;
    }
  }

  // Total charges = fees + concessions (negative) + carry_forward
  const totalCharges = totalFees + totalConcessions + totalCarryForward;

  // Filter non-voided payments
  const activePayments = payments.filter(p => p.voided_at === null);

  // Calculate total payments
  const totalPayments = activePayments.reduce((sum, p) => sum + p.amount_paise, 0);

  // Calculate balance
  const balance = totalCharges - totalPayments;

  return {
    student_id: studentId,
    academic_year_id: academicYearId,
    total_charges_paise: totalCharges,
    total_fees_paise: totalFees,
    total_concessions_paise: totalConcessions,
    total_carry_forward_paise: totalCarryForward,
    total_payments_paise: totalPayments,
    balance_paise: balance,
    charge_count: activeCharges.length,
    payment_count: activePayments.length,
  };
}

/**
 * Get fee summary for a student/year
 */
export async function getFeeSummary(
  db: D1Database,
  studentId: string,
  academicYearId: string,
  tenant: TenantContext
): Promise<FeeSummary> {
  feesAuthz.ensureCanViewStudentFees(tenant);

  // Validate student belongs to school
  const student = await feesRepo.findStudentProfile(db, studentId, tenant.schoolId);
  if (!student) {
    throw FeesError.studentNotFound(studentId);
  }

  // Students can only view their own records
  feesAuthz.ensureStudentAccessOwnFeesOnly(tenant, studentId);

  // Fetch charges and payments
  const charges = await feesRepo.findChargesByStudent(db, studentId, tenant.schoolId, academicYearId);
  const payments = await feesRepo.findPaymentsByStudent(db, studentId, tenant.schoolId, academicYearId);

  return calculateFeeSummary(charges, payments, studentId, academicYearId);
}

/**
 * =====================================================================
 * STUDENT SELF-SERVICE
 * =====================================================================
 */

/**
 * Get student's own fee details for an academic year
 */
export async function getStudentFeeDetails(
  db: D1Database,
  academicYearId: string,
  tenant: TenantContext
): Promise<StudentFeeDetails> {
  // Must be a student
  if (tenant.role !== 'student') {
    throw FeesError.unauthorized('access student fees');
  }

  // Get student profile to get student_id from user_id
  const student = await feesRepo.findStudentProfile(db, tenant.userId, tenant.schoolId);
  if (!student) {
    throw FeesError.studentNotFound(tenant.userId);
  }

  const studentId = student.user_id;

  // Validate academic year
  const academicYear = await feesRepo.findAcademicYear(db, academicYearId, tenant.schoolId);
  if (!academicYear) {
    throw FeesError.academicYearNotFound(academicYearId);
  }

  // Fetch charges and payments
  const charges = await feesRepo.findChargesByStudent(db, studentId, tenant.schoolId, academicYearId);
  const payments = await feesRepo.findPaymentsByStudent(db, studentId, tenant.schoolId, academicYearId);

  // Calculate summary
  const summary = calculateFeeSummary(charges, payments, studentId, academicYearId);

  // Build ledger entries (charges + payments combined)
  const ledger: StudentFeeLedgerEntry[] = [];

  // Add charges
  for (const charge of charges) {
    ledger.push({
      type: 'charge',
      id: charge.id,
      date: charge.due_on || new Date(charge.created_at).toISOString().split('T')[0],
      title: charge.title,
      amount_paise: Math.abs(charge.amount_paise), // Always show as positive for display
      kind: charge.kind,
      is_voided: charge.voided_at !== null,
      created_at: charge.created_at,
    });
  }

  // Add payments
  for (const payment of payments) {
    ledger.push({
      type: 'payment',
      id: payment.id,
      date: payment.paid_on,
      title: 'Payment',
      amount_paise: payment.amount_paise,
      receipt_no: payment.receipt_no,
      method: payment.method,
      reference: payment.reference,
      is_voided: payment.voided_at !== null,
      created_at: payment.created_at,
    });
  }

  // Sort ledger by date descending, then by created_at descending
  ledger.sort((a, b) => {
    if (a.date !== b.date) {
      return b.date.localeCompare(a.date);
    }
    return b.created_at - a.created_at;
  });

  return {
    academic_year_id: academicYearId,
    academic_year_label: academicYear.label,
    summary,
    ledger,
  };
}
