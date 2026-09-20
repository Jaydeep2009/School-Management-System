/**
 * Assignments Types
 */

/**
 * Assignment status enum
 */
export type AssignmentStatus = 'draft' | 'published' | 'closed';

/**
 * Assignment model
 */
export interface Assignment {
  id: string;
  school_id: string;
  academic_year_id: string;
  classroom_id: string;
  subject_id: string;
  created_by: string;
  title: string;
  description: string | null;
  due_at: number | null; // Unix timestamp
  status: AssignmentStatus;
  created_at: number;
  updated_at: number;
}

/**
 * Assignment with details
 */
export interface AssignmentWithDetails extends Assignment {
  subject_name: string;
  classroom_name: string;
  classroom_section: string;
  attachment_count: number;
}

/**
 * Assignment attachment model
 */
export interface AssignmentAttachment {
  id: string;
  assignment_id: string;
  file_name: string;
  r2_key: string;
  content_type: string | null;
  size_bytes: number | null;
  uploaded_by: string;
  created_at: number;
}

/**
 * Assignment attachment response (without internal r2_key)
 */
export interface AssignmentAttachmentResponse {
  id: string;
  file_name: string;
  content_type: string | null;
  size_bytes: number | null;
  created_at: number;
}

/**
 * Create assignment request
 */
export interface CreateAssignmentRequest {
  classroom_id: string;
  subject_id: string;
  title: string;
  description?: string;
  due_at?: number; // Unix timestamp
}

/**
 * Update assignment request
 */
export interface UpdateAssignmentRequest {
  title?: string;
  description?: string;
  due_at?: number | null;
}

/**
 * Assignment list filters
 */
export interface AssignmentListFilters {
  academic_year_id?: string;
  classroom_id?: string;
  subject_id?: string;
  status?: AssignmentStatus;
}

/**
 * Student assignment response
 */
export interface StudentAssignmentResponse {
  id: string;
  subject_name: string;
  title: string;
  description: string | null;
  due_at: number | null;
  created_at: number;
  attachments: AssignmentAttachmentResponse[];
}
