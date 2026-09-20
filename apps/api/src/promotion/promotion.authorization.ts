/**
 * Promotion Authorization
 * 
 * Authorization rules for promotion and year activation operations
 */

import type { TenantContext } from '../auth/auth.types';
import { PromotionError } from './promotion.errors';

/**
 * Ensure user can manage promotions
 * Only Principal can manage promotions
 */
export function ensureCanManagePromotions(tenant: TenantContext): void {
  if (tenant.role !== 'principal') {
    throw PromotionError.unauthorized('manage promotions');
  }
}

/**
 * Ensure user can activate academic years
 * Only Principal can activate years
 */
export function ensureCanActivateYear(tenant: TenantContext): void {
  if (tenant.role !== 'principal') {
    throw PromotionError.unauthorized('activate academic year');
  }
}

/**
 * Ensure user can view promotion data
 * Only Principal can view promotion data
 */
export function ensureCanViewPromotions(tenant: TenantContext): void {
  if (tenant.role !== 'principal') {
    throw PromotionError.unauthorized('view promotions');
  }
}
