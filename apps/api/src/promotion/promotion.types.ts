/**
 * Promotion Types
 */

/**
 * Promotion action types
 */
export type PromotionAction = 'promote' | 'retain' | 'graduate' | 'dropout';

/**
 * Single student promotion request
 */
export interface PromoteStudentRequest {
  enrollment_id: string;
  action: PromotionAction;
  new_classroom_id?: string; // For promote/retain actions
  new_academic_year_id: string;
  remarks?: string;
}

/**
 * Bulk promotion request
 */
export interface BulkPromotionRequest {
  classroom_id: string;
  current_academic_year_id: string;
  new_academic_year_id: string;
  action: PromotionAction;
  new_grade?: number; // Target grade for promotion
  student_ids?: string[]; // If empty, applies to all students in classroom
  remarks?: string;
}

/**
 * Promotion preview result
 */
export interface PromotionPreview {
  classroom_id: string;
  classroom_name: string;
  current_grade: number;
  total_students: number;
  students: PromotionPreviewStudent[];
}

/**
 * Individual student in promotion preview
 */
export interface PromotionPreviewStudent {
  enrollment_id: string;
  student_id: string;
  student_name: string;
  roll_number: string;
  current_grade: number;
  suggested_action: PromotionAction;
  suggested_new_grade?: number;
}

/**
 * Promotion result
 */
export interface PromotionResult {
  success_count: number;
  failed_count: number;
  errors: string[];
  promoted_enrollments: string[];
}
