/**
 * Fees Management Authorization
 * 
 * Authorization rules for fee management operations
 */

import type { TenantContext } from '../auth/auth.types';
import { FeesError } from './fees.errors';

/**
 * Ensure user can manage fees (list all charges, view summaries)
 * Only Principal can manage fees
 */
export function ensureCanManageFees(tenant: TenantContext): void {
  if (tenant.role !== 'principal') {
    throw FeesError.unauthorized('manage fees');
  }
}

/**
 * Ensure user can manage fee categories
 * Only Principal can manage categories
 */
export function ensureCanManageCategories(tenant: TenantContext): void {
  if (tenant.role !== 'principal') {
    throw FeesError.unauthorized('manage fee categories');
  }
}

/**
 * Ensure user can create fee charges
 * Only Principal can create charges
 */
export function ensureCanCreateCharges(tenant: TenantContext): void {
  if (tenant.role !== 'principal') {
    throw FeesError.unauthorized('create fee charges');
  }
}

/**
 * Ensure user can void fee charges
 * Only Principal can void charges
 */
export function ensureCanVoidCharges(tenant: TenantContext): void {
  if (tenant.role !== 'principal') {
    throw FeesError.unauthorized('void fee charges');
  }
}

/**
 * Ensure user can record payments
 * Only Principal can record payments
 */
export function ensureCanRecordPayments(tenant: TenantContext): void {
  if (tenant.role !== 'principal') {
    throw FeesError.unauthorized('record payments');
  }
}

/**
 * Ensure user can void payments
 * Only Principal can void payments
 */
export function ensureCanVoidPayments(tenant: TenantContext): void {
  if (tenant.role !== 'principal') {
    throw FeesError.unauthorized('void payments');
  }
}

/**
 * Ensure user can view student fee records
 * Principal can view all students in their school
 * Students can only view their own records (checked separately)
 * Teachers have no fee access
 */
export function ensureCanViewStudentFees(tenant: TenantContext): void {
  if (tenant.role === 'teacher') {
    throw FeesError.unauthorized('view student fees');
  }
  // Principal and student roles proceed (student access is further restricted by studentId match)
}

/**
 * Ensure student can only access their own fees
 */
export function ensureStudentAccessOwnFeesOnly(
  tenant: TenantContext,
  studentId: string
): void {
  if (tenant.role === 'student' && tenant.userId !== studentId) {
    throw FeesError.unauthorized('access another student\'s fees');
  }
}
