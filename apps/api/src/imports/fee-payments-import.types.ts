/**
 * Fee Payments Import Types
 */

export interface FeePaymentsImportRow {
  academic_year: string;
  student_admission_number: string;
  amount: number; // In rupees (will convert to paise)
  paid_on: string; // YYYY-MM-DD
  method: string; // 'cash', 'upi', 'bank_transfer', 'other'
  reference?: string;
}
