// Common types for the School Management System

/**
 * API Response wrapper
 */
export interface ApiResponse<T = unknown> {
  data?: T;
  error?: string;
  message?: string;
}

/**
 * Pagination metadata
 */
export interface PaginationMeta {
  page: number;
  pageSize: number;
  totalPages: number;
  totalCount: number;
}

/**
 * Paginated response
 */
export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  meta: PaginationMeta;
}

/**
 * Health check response
 */
export interface HealthCheckResponse {
  status: 'ok' | 'error';
  timestamp: string;
  database: 'connected' | 'disconnected';
  error?: string;
}

/**
 * Common error codes
 */
export enum ErrorCode {
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  NOT_FOUND = 'NOT_FOUND',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
}

/**
 * API Error
 */
export interface ApiError {
  code: ErrorCode;
  message: string;
  details?: Record<string, unknown>;
}
