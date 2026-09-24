/**
 * Authentication types
 */

export type UserRole = 'principal' | 'teacher' | 'student';

export interface User {
  id: string;
  loginId: string;
  role: UserRole;
  schoolId: string;
  mustChangePassword: boolean;
}

export interface Principal {
  id: string;
  name: string;
  email: string;
  phone?: string;
  school_id: string;
  school_name?: string;
  default_academic_year_id?: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

export interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}
