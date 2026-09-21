/**
 * School Management Authorization
 * 
 * SECURITY: Only Super Admin can manage schools
 */

import type { TenantContext } from '../authz/authz.types';

/**
 * Ensure user is Super Admin
 * 
 * School management is Super Admin only - no exceptions
 */
export function ensureSuperAdmin(tenant: TenantContext): void {
  if (tenant.role !== 'super_admin') {
    throw new Error('Forbidden: Super Admin access required');
  }
}

/**
 * Check if user is Super Admin
 */
export function isSuperAdmin(tenant: TenantContext): boolean {
  return tenant.role === 'super_admin';
}
