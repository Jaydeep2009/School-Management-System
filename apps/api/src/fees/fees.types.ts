/**
 * Fees Management Types
 * 
 * Financial ledger types for fee categories, charges, payments, and receipts
 */

import type { TenantContext } from '../auth/auth.types';

/**
 * Fee category model
 */
export interface FeeCategory {
  id: string;
  school_id: string;
  code: string;
  name: string;
  status: 'active' | 'inactive';
  created_at: number;
  updated_at: number;
}

/**
 * Fee charge model (append-only ledger)
 */
export interface FeeCharge {
  id: string;
  school_id: string;
  student_id: string;
  academic_year_id: string;
  enrollment_id: string | null;
  fee_category_id: string | null;
  kind: 'fee' | 'concession' | 'carry_forward';
  title: string;
  amount_paise: number; // Integer paise value (e.g., ₹500.00 = 50000 paise)
  due_on: string | null; // Date string YYYY-MM-DD
  created_by: string;
  created_at: number;
  voided_at: number | null;
  voided_by: string | null;
  void_reason: string | null;
}

/**
 * Fee payment model (append-only ledger)
 */
export interface FeePayment {
  id: string;
  school_id: string;
  student_id: string;
  academic_year_id: string;
  receipt_no: string;
  amount_paise: number; // Integer paise value
  paid_on: string; // Date string YYYY-MM-DD
  method: 'cash' | 'upi' | 'bank_transfer' | 'other';
  reference: string | null;
  recorded_by: string;
  created_at: number;
  voided_at: number | null;
  voided_by: string | null;
  void_reason: string | null;
}

/**
 * Receipt counter model
 */
export interface ReceiptCounter {
  school_id: string;
  financial_year: string;
  last_number: number;
}

/**
 * Create fee category request
 */
export interface CreateFeeCategoryRequest {
  code: string;
  name: string;
}

/**
 * Update fee category request
 */
export interface UpdateFeeCategoryRequest {
  name?: string;
  status?: 'active' | 'inactive';
}

/**
 * Create fee charge request
 */
export interface CreateFeeChargeRequest {
  student_id: string;
  academic_year_id: string;
  enrollment_id?: string;
  fee_category_id?: string;
  kind: 'fee' | 'concession' | 'carry_forward';
  title: string;
  amount_paise: number;
  due_on?: string; // Date string YYYY-MM-DD
}

/**
 * Void charge request
 */
export interface VoidChargeRequest {
  reason: string;
}

/**
 * Create fee payment request
 */
export interface CreateFeePaymentRequest {
  student_id: string;
  academic_year_id: string;
  amount_paise: number;
  paid_on: string; // Date string YYYY-MM-DD
  method: 'cash' | 'upi' | 'bank_transfer' | 'other';
  reference?: string;
}

/**
 * Void payment request
 */
export interface VoidPaymentRequest {
  reason: string;
}

/**
 * Fee ledger summary for a student/year
 */
export interface FeeSummary {
  student_id: string;
  academic_year_id: string;
  total_charges_paise: number; // Sum of all active charges (includes carry-forward)
  total_fees_paise: number; // Sum of active fee charges only
  total_concessions_paise: number; // Sum of active concessions (negative)
  total_carry_forward_paise: number; // Sum of active carry-forward
  total_payments_paise: number; // Sum of non-voided payments
  balance_paise: number; // total_charges - total_payments
  charge_count: number;
  payment_count: number;
}

/**
 * Fee charge with student details
 */
export interface FeeChargeWithStudent extends FeeCharge {
  student_name: string;
  student_code: string;
}

/**
 * Fee payment with student details
 */
export interface FeePaymentWithStudent extends FeePayment {
  student_name: string;
  student_code: string;
}

/**
 * Student fee ledger entry (charge or payment)
 */
export interface StudentFeeLedgerEntry {
  type: 'charge' | 'payment';
  id: string;
  date: string; // due_on for charges, paid_on for payments
  title: string;
  amount_paise: number; // positive for charges/payments
  kind?: 'fee' | 'concession' | 'carry_forward'; // Only for charges
  receipt_no?: string; // Only for payments
  method?: 'cash' | 'upi' | 'bank_transfer' | 'other'; // Only for payments
  reference?: string | null; // Only for payments
  is_voided: boolean;
  created_at: number;
}

/**
 * Student fee details (for student self-service)
 */
export interface StudentFeeDetails {
  academic_year_id: string;
  academic_year_label: string;
  summary: FeeSummary;
  ledger: StudentFeeLedgerEntry[];
}
