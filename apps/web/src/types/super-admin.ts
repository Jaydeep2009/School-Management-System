/**
 * Super Admin Types
 * Based on actual backend API contracts
 */

export interface SuperAdmin {
  id: 'super-admin';
  role: 'super_admin';
}

export interface SuperAdminLoginRequest {
  loginId: string;
  password: string;
}

export interface SuperAdminLoginResponse {
  accessToken: string;
}

export type SchoolStatus = 'active' | 'suspended' | 'archived';

export interface School {
  id: string;
  code: string;
  name: string;
  status: SchoolStatus;
  timezone: string;
  phone?: string;
  email?: string;
  address?: string;
  settings?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  suspended_at?: string;
  archived_at?: string;
}

export interface CreateSchoolRequest {
  code: string;
  name: string;
  timezone?: string;
  phone?: string;
  email?: string;
  address?: string;
  settings?: Record<string, unknown>;
}

export interface UpdateSchoolRequest {
  name?: string;
  timezone?: string;
  phone?: string;
  email?: string;
  address?: string;
  settings?: Record<string, unknown>;
}

export interface CreatePrincipalRequest {
  full_name: string;
  date_of_birth: string; // YYYY-MM-DD
  gender: 'male' | 'female' | 'other';
}

/**
 * Principal creation response
 * Matches backend API: POST /schools/:id/principal
 */
export interface PrincipalCredentials {
  user_id: string;
  login_id: string;
  temporary_password: string;
}

export interface SchoolFilters {
  status?: SchoolStatus;
  search?: string;
}
