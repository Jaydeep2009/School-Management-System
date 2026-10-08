/**
 * School Management Types
 * 
 * Domain types for Super Admin school management and Principal provisioning
 */

/**
 * School status
 */
export type SchoolStatus = 'active' | 'suspended' | 'archived';

/**
 * School entity
 */
export interface School {
  id: string;
  code: string;
  name: string;
  timezone: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  status: SchoolStatus;
  settings: string; // JSON string
  created_at: number;
  updated_at: number;
}

/**
 * School with parsed settings
 */
export interface SchoolWithSettings extends Omit<School, 'settings'> {
  settings: Record<string, unknown>;
}

/**
 * Principal details
 */
export interface PrincipalDetails {
  user_id: string;
  login_id: string;
  status: string;
  created_at: number;
  last_login_at: number | null;
}

/**
 * School with settings and principal details
 */
export interface SchoolWithDetails extends SchoolWithSettings {
  principal: PrincipalDetails | null;
}

/**
 * Create school request
 */
export interface CreateSchoolRequest {
  code: string;
  name: string;
  timezone?: string;
  phone?: string;
  email?: string;
  address?: string;
  settings?: Record<string, unknown>;
}

/**
 * Update school request
 */
export interface UpdateSchoolRequest {
  name?: string;
  timezone?: string;
  phone?: string;
  email?: string;
  address?: string;
  settings?: Record<string, unknown>;
}

/**
 * Create Principal request
 * 
 * Principal accounts only need basic user fields.
 * They do NOT create a teacher_profile or student_profile.
 */
export interface CreatePrincipalRequest {
  full_name: string;
  date_of_birth: string;
  gender: 'male' | 'female' | 'other';
}

/**
 * Principal creation response
 */
export interface PrincipalCreationResponse {
  user_id: string;
  login_id: string;
  temporary_password: string;
}

/**
 * School list filters
 */
export interface SchoolFilters {
  status?: SchoolStatus;
  search?: string;
}
