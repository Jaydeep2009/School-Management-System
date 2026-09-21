/**
 * Imports Types
 * 
 * Generic Excel import infrastructure
 */

/**
 * Import kinds supported by the system
 */
export type ImportKind = 
  | 'students'
  | 'attendance'
  | 'marks'
  | 'fee-payments'
  | 'fee-charges'
  | 'promotion'
  | 'timetable';

/**
 * Import job status
 */
export type ImportStatus = 
  | 'previewed'    // Validated, preview available, awaiting commit
  | 'committing'   // Commit in progress
  | 'committed'    // Successfully committed
  | 'failed'       // Failed during commit
  | 'expired';     // Preview expired before commit

/**
 * Import Job (from database)
 */
export interface ImportJob {
  id: string;
  school_id: string;
  kind: ImportKind;
  actor_id: string;
  payload_hash: string;
  payload: string | null;  // JSON string
  summary: string | null;  // JSON string
  status: ImportStatus;
  expires_at: number;
  created_at: number;
  committed_at: number | null;
}

/**
 * Row-level error
 */
export interface ImportRowError {
  row: number;
  field?: string;
  code: string;
  message: string;
}

/**
 * Row-level warning
 */
export interface ImportRowWarning {
  row: number;
  field?: string;
  code: string;
  message: string;
}

/**
 * Import preview result
 */
export interface ImportPreviewResult {
  import_id: string;
  total_rows: number;
  valid_rows: number;
  error_rows: number;
  warning_rows: number;
  errors: ImportRowError[];
  warnings: ImportRowWarning[];
  summary: Record<string, unknown>;
  expires_at: number;
}

/**
 * Import commit result
 */
export interface ImportCommitResult {
  import_id: string;
  success: boolean;
  rows_created: number;
  rows_updated: number;
  rows_skipped: number;
  message: string;
}

/**
 * Generic preview request payload
 */
export interface PreviewImportRequest {
  rows: unknown[];  // Will be validated by kind-specific schema
  options?: Record<string, unknown>;
}

/**
 * Commit import request
 */
export interface CommitImportRequest {
  confirmed: boolean;
}
