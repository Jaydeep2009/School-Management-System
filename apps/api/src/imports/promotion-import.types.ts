/**
 * Promotion Import Types
 */

export interface PromotionImportRow {
  student_admission_number: string;
  from_classroom_code: string;
  to_classroom_code: string;
  outcome: string; // 'promoted', 'repeated', 'dropped'
  remarks?: string;
}
