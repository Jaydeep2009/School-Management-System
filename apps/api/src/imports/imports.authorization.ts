/**
 * Imports Authorization
 */

import type { TenantContext } from '../auth/auth.types';
import type { ImportKind } from './imports.types';
import { ImportError } from './imports.errors';

/**
 * Ensure user can perform import for the given kind
 * 
 * Rules:
 * - Principal: can perform all imports
 * - Teacher: restricted based on domain permissions (not implemented in V1)
 * - Student: cannot perform imports
 */
export function ensureCanImport(tenant: TenantContext, kind: ImportKind): void {
  if (tenant.role === 'principal') {
    // Principal can perform all imports
    return;
  }

  // For now, only Principal can perform imports
  // Future: allow teachers for specific kinds based on domain authorization
  throw ImportError.accessDenied(`Only principals can perform ${kind} imports`);
}

/**
 * Ensure user can view import job
 */
export function ensureCanViewImport(tenant: TenantContext, importJob: { school_id: string; actor_id: string }): void {
  if (tenant.schoolId !== importJob.school_id) {
    throw ImportError.accessDenied('Import belongs to another school');
  }

  if (tenant.role === 'principal') {
    // Principal can view all imports in their school
    return;
  }

  if (tenant.userId === importJob.actor_id) {
    // User can view their own imports
    return;
  }

  throw ImportError.accessDenied();
}

/**
 * Ensure user can commit import job
 */
export function ensureCanCommitImport(tenant: TenantContext, importJob: { school_id: string; actor_id: string; kind: ImportKind }): void {
  ensureCanViewImport(tenant, importJob);
  ensureCanImport(tenant, importJob.kind);
}
