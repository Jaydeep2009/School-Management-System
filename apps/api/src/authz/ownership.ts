/**
 * Ownership Policy Compliance Wrappers
 * 
 * Phase 3 - Task 2
 * 
 * These functions provide spec-compliant naming for ownership policies
 * while delegating to the existing implementation functions.
 * 
 * Per PHASE_2_TASK_1_2_OWNERSHIP_POLICIES.md:
 * - Existing functions: canViewMarks, canModifyMarks
 * - Spec requires: canViewSubjectData, canEditSubjectData
 * - Solution: Create wrapper functions with spec names
 */

import type { TenantContext } from './authz.types';
import type { MarksAuthzContext } from './authz.types';
import { canViewMarks, canModifyMarks } from './authz.service';

/**
 * Check if user can view subject data (marks/assessments)
 * 
 * Spec-compliant wrapper for canViewMarks()
 * 
 * Authorization rules:
 * - Principal: Can view all subject data in their school
 * - Teacher: Can view if has teaching assignment OR is class teacher (VIEW-only for non-assigned subjects)
 * - Student: Can view own marks only (requires studentId parameter)
 * 
 * @param db - D1 database instance
 * @param tenant - Current user's tenant context (userId, schoolId, role)
 * @param context - Subject data context (schoolId, classroomId, subjectId)
 * @param studentId - Optional student ID (required for student role)
 * @returns Promise<boolean> - true if user can view, false otherwise
 */
export async function canViewSubjectData(
  db: D1Database,
  tenant: TenantContext,
  context: MarksAuthzContext,
  studentId?: string
): Promise<boolean> {
  return canViewMarks(db, tenant, context, studentId);
}

/**
 * Check if user can edit subject data (marks/assessments)
 * 
 * Spec-compliant wrapper for canModifyMarks()
 * 
 * Authorization rules:
 * - Principal: Can edit all subject data in their school
 * - Teacher: MUST have teaching assignment (class teacher alone is NOT sufficient)
 * - Student: CANNOT edit (always returns false)
 * 
 * @param db - D1 database instance
 * @param tenant - Current user's tenant context (userId, schoolId, role)
 * @param context - Subject data context (schoolId, classroomId, subjectId)
 * @returns Promise<boolean> - true if user can edit, false otherwise
 */
export async function canEditSubjectData(
  db: D1Database,
  tenant: TenantContext,
  context: MarksAuthzContext
): Promise<boolean> {
  return canModifyMarks(db, tenant, context);
}
