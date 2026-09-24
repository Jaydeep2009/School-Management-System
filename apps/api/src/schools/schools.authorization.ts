/**
 * School Management Authorization
 * 
 * SECURITY: Only Super Admin can manage schools
 */

import type { SuperAdminContext } from '../auth/auth.types';

/**
 * Ensure user is Super Admin
 * 
 * School management is Super Admin only - no exceptions
 * 
 * SECURITY: Validates BOTH role and absence of school tenant
 * This prevents forged tokens with super_admin role but school context
 */
export function ensureSuperAdmin(tenant: SuperAdminContext): void {
  // Additional validation (defense in depth)
  // requireSuperAdmin already checked this, but verify again
  if (tenant.kind !== 'platform') {
    throw new Error('Forbidden: Super Admin access required');
  }
  
  if (tenant.role !== 'super_admin') {
    throw new Error('Forbidden: Super Admin access required');
  }
  
  // Must NOT have school tenant (platform-level only)
  if (tenant.userId !== null || tenant.schoolId !== null) {
    throw new Error('Forbidden: Invalid Super Admin context');
  }
}

/**
 * Check if user is Super Admin
 */
export function isSuperAdmin(tenant: SuperAdminContext): boolean {
  return tenant.kind === 'platform' &&
         tenant.role === 'super_admin' && 
         tenant.userId === null && 
         tenant.schoolId === null;
}
