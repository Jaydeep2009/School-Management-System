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
 */
export interface CreatePrincipalRequest {
  first_name: string;
  middle_name?: string;
  last_name: string;
  phone?: string;
  date_of_birth?: string;
  joining_date?: string;
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
