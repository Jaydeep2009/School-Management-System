/**
 * Profiles Authorization
 * 
 * Authorization rules for profile and birthday access
 */

import type { TenantContext } from '../auth/auth.types';
import { ProfileError } from './profiles.errors';

/**
 * Ensure user can view teacher profile
 * 
 * Rules:
 * - Principal: can view any teacher in their school
 * - Teacher: can view own profile only
 * - Student: cannot view teacher profiles
 */
export function ensureCanViewTeacherProfile(
  tenant: TenantContext,
  teacherUserId: string
): void {
  if (tenant.role === 'principal') {
    // Principal can view any teacher in their school (school filtering happens in repository)
    return;
  }

  if (tenant.role === 'teacher' && tenant.userId === teacherUserId) {
    // Teacher can view own profile
    return;
  }

  throw ProfileError.accessDenied('You do not have permission to view this teacher profile');
}

/**
 * Ensure user can edit teacher profile
 * 
 * Rules:
 * - Principal: can edit any teacher in their school
 * - Teacher: can edit own profile only (limited fields)
 * - Student: cannot edit teacher profiles
 */
export function ensureCanEditTeacherProfile(
  tenant: TenantContext,
  teacherUserId: string
): void {
  if (tenant.role === 'principal') {
    // Principal can edit any teacher in their school
    return;
  }

  if (tenant.role === 'teacher' && tenant.userId === teacherUserId) {
    // Teacher can edit own profile
    return;
  }

  throw ProfileError.accessDenied('You do not have permission to edit this teacher profile');
}

/**
 * Ensure user can view student profile
 * 
 * Rules:
 * - Principal: can view any student in their school
 * - Teacher: requires teaching relationship (checked separately)
 * - Student: can view own profile only
 */
export function ensureCanViewStudentProfile(
  tenant: TenantContext,
  studentUserId: string
): void {
  if (tenant.role === 'principal') {
    // Principal can view any student in their school
    return;
  }

  if (tenant.role === 'student' && tenant.userId === studentUserId) {
    // Student can view own profile
    return;
  }

  if (tenant.role === 'teacher') {
    // Teacher access requires classroom/teaching relationship
    // This will be checked separately in the service layer
    return;
  }

  throw ProfileError.accessDenied('You do not have permission to view this student profile');
}

/**
 * Ensure user can edit student profile
 * 
 * Rules:
 * - Principal: can edit any student in their school
 * - Teacher: cannot edit student profiles
 * - Student: cannot edit profiles (self-service not implemented in V1)
 */
export function ensureCanEditStudentProfile(
  tenant: TenantContext
): void {
  if (tenant.role === 'principal') {
    // Principal can edit any student in their school
    return;
  }

  throw ProfileError.accessDenied('Only principals can edit student profiles');
}

/**
 * Ensure user can view teacher birthdays
 * 
 * Rules:
 * - Principal: can view all teacher birthdays in their school
 * - Teacher: not implemented in V1 (could be added for staff visibility)
 * - Student: cannot view teacher birthdays
 */
export function ensureCanViewTeacherBirthdays(
  tenant: TenantContext
): void {
  if (tenant.role === 'principal') {
    return;
  }

  throw ProfileError.birthdayAccessDenied('Only principals can view teacher birthdays');
}

/**
 * Ensure user can view student birthdays
 * 
 * Rules:
 * - Principal: can view all student birthdays in their school
 * - Teacher: can view birthdays of students in their assigned classrooms (class teacher)
 * - Student: cannot view other student birthdays
 */
export function ensureCanViewStudentBirthdays(
  tenant: TenantContext
): void {
  if (tenant.role === 'principal' || tenant.role === 'teacher') {
    // Both Principal and class teachers can view student birthdays
    // Class teacher scope filtering happens in service layer
    return;
  }

  throw ProfileError.birthdayAccessDenied('You do not have permission to view student birthdays');
}
