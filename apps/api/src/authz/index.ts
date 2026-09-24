/**
 * Authorization Module Exports
 * 
 * Central export point for all authorization functions and types
 */

// Core authorization service functions
export {
  canAccessSchool,
  canViewAttendance,
  canModifyAttendance,
  canViewMarks,
  canModifyMarks,
  canViewFees,
  canModifyFees,
} from './authz.service';

// Ownership policy compliance wrappers (Phase 3)
export {
  canViewSubjectData,
  canEditSubjectData,
} from './ownership';

// Authorization types
export type {
  TenantContext,
  AttendanceAuthzContext,
  MarksAuthzContext,
} from './authz.types';
