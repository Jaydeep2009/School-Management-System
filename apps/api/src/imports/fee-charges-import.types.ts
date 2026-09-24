/**
 * Fee Charges Import Types
 */

export interface FeeChargesImportRow {
  academic_year: string;
  student_admission_number: string;
  fee_category_code?: string;
  kind: string; // 'fee', 'concession', 'carry_forward'
  title: string;
  amount: number; // In rupees (will convert to paise)
  due_on?: string; // YYYY-MM-DD
}
