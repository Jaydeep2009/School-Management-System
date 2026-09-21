/**
 * Timetable Authorization
 */

import type { TenantContext } from '../auth/auth.types';
import { TimetableError } from './timetable.errors';

/**
 * Ensure user can manage timetables (create, edit, publish, archive)
 * 
 * Rules:
 * - Principal: can manage all timetables in their school
 * - Teacher: cannot manage timetables
 * - Student: cannot manage timetables
 */
export function ensureCanManageTimetables(tenant: TenantContext): void {
  if (tenant.role === 'principal') {
    return;
  }

  throw TimetableError.accessDenied('Only principals can manage timetables');
}

/**
 * Ensure user can view timetable
 * 
 * Rules:
 * - Principal: can view all timetables in their school
 * - Teacher: can view timetables for classrooms where they teach
 * - Student: can view own classroom timetable
 */
export function ensureCanViewTimetable(tenant: TenantContext): void {
  // All authenticated users can view timetables
  // Specific access control happens at repository/service level based on relationships
  return;
}

/**
 * Ensure user can publish timetable
 */
export function ensureCanPublishTimetable(tenant: TenantContext): void {
  ensureCanManageTimetables(tenant);
}

/**
 * Ensure user can archive timetable
 */
export function ensureCanArchiveTimetable(tenant: TenantContext): void {
  ensureCanManageTimetables(tenant);
}
