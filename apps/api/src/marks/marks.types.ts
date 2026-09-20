/**
 * Marks & Assessments Types
 */

/**
 * Mark status enum
 */
export type MarkStatus = 'graded' | 'absent' | 'exempt';

/**
 * Assessment model
 */
export interface Assessment {
  id: string;
  school_id: string;
  academic_year_id: string;
  classroom_id: string;
  subject_id: string;
  name: string;
  max_marks: number;
  weightage: number | null;
  held_on: string | null; // YYYY-MM-DD
  is_published: boolean;
  is_locked: boolean;
  created_by: string;
  created_at: number;
  updated_at: number;
}

/**
 * Assessment with subject and classroom details
 */
export interface AssessmentWithDetails extends Assessment {
  subject_name: string;
  classroom_name: string;
  classroom_section: string;
}

/**
 * Mark entry model
 */
export interface Mark {
  assessment_id: string;
  student_id: string;
  enrollment_id: string;
  marks_obtained: number | null;
  status: MarkStatus;
  updated_by: string;
  updated_at: number;
}

/**
 * Mark with student details
 */
export interface MarkWithStudent extends Mark {
  student_code: string;
  student_name: string;
  roll_number: string | null;
}

/**
 * Create assessment request
 */
export interface CreateAssessmentRequest {
  classroom_id: string;
  subject_id: string;
  name: string;
  max_marks: number;
  weightage?: number;
  held_on?: string; // YYYY-MM-DD
}

/**
 * Update assessment request
 */
export interface UpdateAssessmentRequest {
  name?: string;
  max_marks?: number;
  weightage?: number;
  held_on?: string;
}

/**
 * Bulk marks entry request
 */
export interface BulkMarksRequest {
  entries: MarkEntry[];
}

/**
 * Single mark entry
 */
export interface MarkEntry {
  student_id: string;
  status: MarkStatus;
  marks_obtained: number | null;
}

/**
 * Student assessment summary
 */
export interface StudentAssessmentSummary {
  assessment_id: string;
  assessment_name: string;
  subject_id: string;
  subject_name: string;
  max_marks: number;
  weightage: number | null;
  marks_obtained: number | null;
  status: MarkStatus;
  held_on: string | null;
  is_published: boolean;
}

/**
 * Subject-wise marks summary
 */
export interface SubjectMarksSummary {
  subject_id: string;
  subject_name: string;
  assessments: AssessmentMark[];
  total_weighted: number | null;
  total_weightage: number | null;
}

/**
 * Individual assessment mark in summary
 */
export interface AssessmentMark {
  assessment_id: string;
  assessment_name: string;
  max_marks: number;
  weightage: number | null;
  marks_obtained: number | null;
  status: MarkStatus;
  held_on: string | null;
  weighted_contribution: number | null;
}

/**
 * Classroom marks report entry
 */
export interface ClassroomReportEntry {
  student_id: string;
  student_code: string;
  student_name: string;
  roll_number: string | null;
  marks: AssessmentMarkEntry[];
}

/**
 * Assessment mark in classroom report
 */
export interface AssessmentMarkEntry {
  assessment_id: string;
  assessment_name: string;
  max_marks: number;
  marks_obtained: number | null;
  status: MarkStatus;
}

/**
 * Student my marks response
 */
export interface MyMarksResponse {
  summary: StudentAssessmentSummary[];
  subject_wise: SubjectMarksSummary[];
}
