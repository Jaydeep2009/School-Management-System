/**
 * Authorization service
 * 
 * Core authorization policies for the SMS application
 * SECURITY: Deny by default, never trust client-provided context
 */

import type {
  TenantContext,
  UserRole,
  ClassroomAccessContext,
  StudentAccessContext,
  TeachingAssignmentContext,
  AttendanceAuthzContext,
  MarksAuthzContext,
} from './authz.types';
import * as authzRepo from './authz.repository';
import {
  forbidden,
  insufficientRole,
  tenantMismatch,
  relationshipRequired,
  selfAccessOnly,
} from './authz.errors';

/**
 * Require specific role
 * Throws if tenant does not have required role
 */
export function requireRole(tenant: TenantContext, role: UserRole): void {
  if (tenant.role !== role) {
    throw insufficientRole(role);
  }
}

/**
 * Require any of the specified roles
 * Throws if tenant does not have any of the required roles
 */
export function requireAnyRole(tenant: TenantContext, roles: UserRole[]): void {
  if (!roles.includes(tenant.role as UserRole)) {
    throw insufficientRole(roles.join(' or '));
  }
}

/**
 * Check if tenant can access a school
 * SECURITY: Only allows access to tenant's own school
 * Client-provided schoolId is NEVER trusted
 */
export function canAccessSchool(tenant: TenantContext, schoolId: string): boolean {
  // Super admin has platform-level access
  if (tenant.role === 'super_admin') {
    return true;
  }

  // All other roles: must match tenant's school
  return tenant.schoolId === schoolId;
}

/**
 * Ensure school access or throw
 */
export function ensureSchoolAccess(tenant: TenantContext, schoolId: string): void {
  if (!canAccessSchool(tenant, schoolId)) {
    throw tenantMismatch();
  }
}

/**
 * Check if user can view a classroom
 * 
 * Rules:
 * - Super admin: yes
 * - Principal: own school only
 * - Teacher: own school + has teaching assignment or is class teacher
 * - Student: own school + active enrollment in classroom
 */
export async function canViewClassroom(
  db: D1Database,
  tenant: TenantContext,
  context: ClassroomAccessContext
): Promise<boolean> {
  // Super admin can view all
  if (tenant.role === 'super_admin') {
    return true;
  }

  // Must be same school
  if (!canAccessSchool(tenant, context.schoolId)) {
    return false;
  }

  // Principal can view all classrooms in their school
  if (tenant.role === 'principal') {
    return true;
  }

  // Teacher: check relationship
  if (tenant.role === 'teacher') {
    // Find teacher profile
    const teacherProfile = await authzRepo.findTeacherProfileByUserId(
      db,
      tenant.userId,
      tenant.schoolId
    );

    if (!teacherProfile) {
      return false;
    }

    // Check if teacher has any teaching assignment in this classroom
    const hasAssignment = await authzRepo.findAnyTeachingAssignment(
      db,
      teacherProfile.id,
      context.classroomId,
      context.schoolId
    );

    if (hasAssignment) {
      return true;
    }

    // Check if teacher is the class teacher
    const isClassTeacherFlag = await authzRepo.isClassTeacher(
      db,
      teacherProfile.id,
      context.classroomId,
      context.schoolId
    );

    return isClassTeacherFlag;
  }

  // Student: check active enrollment
  if (tenant.role === 'student') {
    const studentProfile = await authzRepo.findStudentProfileByUserId(
      db,
      tenant.userId,
      tenant.schoolId
    );

    if (!studentProfile) {
      return false;
    }

    const enrollment = await authzRepo.findActiveEnrollment(
      db,
      studentProfile.id,
      context.classroomId,
      context.schoolId
    );

    return enrollment !== null;
  }

  // Deny by default
  return false;
}

/**
 * Ensure classroom view access or throw
 */
export async function ensureCanViewClassroom(
  db: D1Database,
  tenant: TenantContext,
  context: ClassroomAccessContext
): Promise<void> {
  const allowed = await canViewClassroom(db, tenant, context);
  if (!allowed) {
    throw forbidden('Cannot access classroom');
  }
}

/**
 * Check if user can view a student
 * 
 * Rules:
 * - Super admin: yes
 * - Principal: own school only
 * - Teacher: own school + student in teacher's classroom
 * - Student: only self
 */
export async function canViewStudent(
  db: D1Database,
  tenant: TenantContext,
  context: StudentAccessContext
): Promise<boolean> {
  // Super admin can view all
  if (tenant.role === 'super_admin') {
    return true;
  }

  // Must be same school
  if (!canAccessSchool(tenant, context.schoolId)) {
    return false;
  }

  // Principal can view all students in their school
  if (tenant.role === 'principal') {
    return true;
  }

  // Teacher: check if student is in a classroom teacher has access to
  if (tenant.role === 'teacher') {
    const teacherProfile = await authzRepo.findTeacherProfileByUserId(
      db,
      tenant.userId,
      tenant.schoolId
    );

    if (!teacherProfile) {
      return false;
    }

    return await authzRepo.canTeacherAccessStudent(
      db,
      teacherProfile.id,
      context.studentId,
      context.schoolId
    );
  }

  // Student: only self
  if (tenant.role === 'student') {
    const studentProfile = await authzRepo.findStudentProfileByUserId(
      db,
      tenant.userId,
      tenant.schoolId
    );

    if (!studentProfile) {
      return false;
    }

    return studentProfile.id === context.studentId;
  }

  // Deny by default
  return false;
}

/**
 * Ensure student view access or throw
 */
export async function ensureCanViewStudent(
  db: D1Database,
  tenant: TenantContext,
  context: StudentAccessContext
): Promise<void> {
  const allowed = await canViewStudent(db, tenant, context);
  if (!allowed) {
    throw forbidden('Cannot access student');
  }
}

/**
 * Check if teacher has a specific teaching assignment
 * 
 * Must verify actual database relationship: teacher + classroom + subject
 * SECURITY: Does NOT assume teacher role alone grants access
 */
export async function hasTeachingAssignment(
  db: D1Database,
  tenant: TenantContext,
  context: TeachingAssignmentContext
): Promise<boolean> {
  // Must be a teacher
  if (tenant.role !== 'teacher') {
    return false;
  }

  // Must be same school
  if (!canAccessSchool(tenant, context.schoolId)) {
    return false;
  }

  // Find teacher profile
  const teacherProfile = await authzRepo.findTeacherProfileByUserId(
    db,
    tenant.userId,
    tenant.schoolId
  );

  if (!teacherProfile) {
    return false;
  }

  // If no subject specified, check any assignment in classroom
  if (!context.subjectId) {
    const assignment = await authzRepo.findAnyTeachingAssignment(
      db,
      teacherProfile.id,
      context.classroomId,
      context.schoolId
    );
    return assignment !== null;
  }

  // Check specific teaching assignment
  const assignment = await authzRepo.findTeachingAssignment(
    db,
    teacherProfile.id,
    context.classroomId,
    context.subjectId,
    context.schoolId
  );

  return assignment !== null;
}

/**
 * Check if teacher is the class teacher for a classroom
 * 
 * Must verify: classrooms.class_teacher_id === teacher_profile.id
 * AND classroom.school_id === tenant.schoolId
 */
export async function isClassTeacher(
  db: D1Database,
  tenant: TenantContext,
  classroomId: string,
  schoolId: string
): Promise<boolean> {
  // Must be a teacher
  if (tenant.role !== 'teacher') {
    return false;
  }

  // Must be same school
  if (!canAccessSchool(tenant, schoolId)) {
    return false;
  }

  // Find teacher profile
  const teacherProfile = await authzRepo.findTeacherProfileByUserId(
    db,
    tenant.userId,
    tenant.schoolId
  );

  if (!teacherProfile) {
    return false;
  }

  return await authzRepo.isClassTeacher(
    db,
    teacherProfile.id,
    classroomId,
    schoolId
  );
}

/**
 * Check if user can view attendance
 * 
 * Rules:
 * - Super admin: yes
 * - Principal: own school
 * - Teacher: has teaching assignment for classroom+subject OR is class teacher (VIEW only)
 * - Student: own attendance only
 */
export async function canViewAttendance(
  db: D1Database,
  tenant: TenantContext,
  context: AttendanceAuthzContext,
  studentId?: string
): Promise<boolean> {
  // Super admin can view all
  if (tenant.role === 'super_admin') {
    return true;
  }

  // Must be same school
  if (!canAccessSchool(tenant, context.schoolId)) {
    return false;
  }

  // Principal can view all attendance in their school
  if (tenant.role === 'principal') {
    return true;
  }

  // Teacher: check teaching assignment OR class teacher
  if (tenant.role === 'teacher') {
    const teacherProfile = await authzRepo.findTeacherProfileByUserId(
      db,
      tenant.userId,
      tenant.schoolId
    );

    if (!teacherProfile) {
      return false;
    }

    // Check if has teaching assignment for this classroom+subject
    const assignment = await authzRepo.findTeachingAssignment(
      db,
      teacherProfile.id,
      context.classroomId,
      context.subjectId,
      context.schoolId
    );

    if (assignment) {
      return true;
    }

    // Check if is class teacher (VIEW-only access for other subjects)
    const isClassTeacherFlag = await authzRepo.isClassTeacher(
      db,
      teacherProfile.id,
      context.classroomId,
      context.schoolId
    );

    return isClassTeacherFlag;
  }

  // Student: only own attendance
  if (tenant.role === 'student' && studentId) {
    const studentProfile = await authzRepo.findStudentProfileByUserId(
      db,
      tenant.userId,
      tenant.schoolId
    );

    if (!studentProfile) {
      return false;
    }

    return studentProfile.id === studentId;
  }

  // Deny by default
  return false;
}

/**
 * Check if user can modify attendance
 * 
 * Rules:
 * - Super admin: yes
 * - Principal: own school
 * - Teacher: MUST have teaching assignment for classroom+subject
 *   (class teacher status alone is NOT sufficient)
 * - Student: no
 */
export async function canModifyAttendance(
  db: D1Database,
  tenant: TenantContext,
  context: AttendanceAuthzContext
): Promise<boolean> {
  // Super admin can modify all
  if (tenant.role === 'super_admin') {
    return true;
  }

  // Must be same school
  if (!canAccessSchool(tenant, context.schoolId)) {
    return false;
  }

  // Principal can modify all attendance in their school
  if (tenant.role === 'principal') {
    return true;
  }

  // Teacher: MUST have teaching assignment (class teacher alone not sufficient)
  if (tenant.role === 'teacher') {
    const teacherProfile = await authzRepo.findTeacherProfileByUserId(
      db,
      tenant.userId,
      tenant.schoolId
    );

    if (!teacherProfile) {
      return false;
    }

    // Check teaching assignment for this specific classroom+subject
    const assignment = await authzRepo.findTeachingAssignment(
      db,
      teacherProfile.id,
      context.classroomId,
      context.subjectId,
      context.schoolId
    );

    return assignment !== null;
  }

  // Student cannot modify attendance
  // Deny by default
  return false;
}

/**
 * Check if user can view marks
 * 
 * Same rules as attendance VIEW
 */
export async function canViewMarks(
  db: D1Database,
  tenant: TenantContext,
  context: MarksAuthzContext,
  studentId?: string
): Promise<boolean> {
  // Super admin can view all
  if (tenant.role === 'super_admin') {
    return true;
  }

  // Must be same school
  if (!canAccessSchool(tenant, context.schoolId)) {
    return false;
  }

  // Principal can view all marks in their school
  if (tenant.role === 'principal') {
    return true;
  }

  // Teacher: check teaching assignment OR class teacher
  if (tenant.role === 'teacher') {
    const teacherProfile = await authzRepo.findTeacherProfileByUserId(
      db,
      tenant.userId,
      tenant.schoolId
    );

    if (!teacherProfile) {
      return false;
    }

    // Check if has teaching assignment for this classroom+subject
    const assignment = await authzRepo.findTeachingAssignment(
      db,
      teacherProfile.id,
      context.classroomId,
      context.subjectId,
      context.schoolId
    );

    if (assignment) {
      return true;
    }

    // Check if is class teacher (VIEW-only access for other subjects)
    const isClassTeacherFlag = await authzRepo.isClassTeacher(
      db,
      teacherProfile.id,
      context.classroomId,
      context.schoolId
    );

    return isClassTeacherFlag;
  }

  // Student: only own marks
  if (tenant.role === 'student' && studentId) {
    const studentProfile = await authzRepo.findStudentProfileByUserId(
      db,
      tenant.userId,
      tenant.schoolId
    );

    if (!studentProfile) {
      return false;
    }

    return studentProfile.id === studentId;
  }

  // Deny by default
  return false;
}

/**
 * Check if user can modify marks
 * 
 * Same rules as attendance MODIFY
 */
export async function canModifyMarks(
  db: D1Database,
  tenant: TenantContext,
  context: MarksAuthzContext
): Promise<boolean> {
  // Super admin can modify all
  if (tenant.role === 'super_admin') {
    return true;
  }

  // Must be same school
  if (!canAccessSchool(tenant, context.schoolId)) {
    return false;
  }

  // Principal can modify all marks in their school
  if (tenant.role === 'principal') {
    return true;
  }

  // Teacher: MUST have teaching assignment (class teacher alone not sufficient)
  if (tenant.role === 'teacher') {
    const teacherProfile = await authzRepo.findTeacherProfileByUserId(
      db,
      tenant.userId,
      tenant.schoolId
    );

    if (!teacherProfile) {
      return false;
    }

    // Check teaching assignment for this specific classroom+subject
    const assignment = await authzRepo.findTeachingAssignment(
      db,
      teacherProfile.id,
      context.classroomId,
      context.subjectId,
      context.schoolId
    );

    return assignment !== null;
  }

  // Student cannot modify marks
  // Deny by default
  return false;
}

/**
 * Check if user can view fees (for future fee APIs)
 * 
 * Rules:
 * - Super admin: yes
 * - Principal: own school
 * - Student: own fees only
 * - Teacher: no (unless future requirements change)
 */
export async function canViewFees(
  db: D1Database,
  tenant: TenantContext,
  studentId: string,
  schoolId: string
): Promise<boolean> {
  // Super admin can view all
  if (tenant.role === 'super_admin') {
    return true;
  }

  // Must be same school
  if (!canAccessSchool(tenant, schoolId)) {
    return false;
  }

  // Principal can view all fees in their school
  if (tenant.role === 'principal') {
    return true;
  }

  // Student: only own fees
  if (tenant.role === 'student') {
    const studentProfile = await authzRepo.findStudentProfileByUserId(
      db,
      tenant.userId,
      tenant.schoolId
    );

    if (!studentProfile) {
      return false;
    }

    return studentProfile.id === studentId;
  }

  // Teacher: no access to fees (unless future requirements change)
  // Deny by default
  return false;
}

/**
 * Check if user can modify fees (for future fee APIs)
 * 
 * Rules:
 * - Super admin: yes
 * - Principal: own school
 * - Student: no
 * - Teacher: no
 */
export function canModifyFees(
  tenant: TenantContext,
  schoolId: string
): boolean {
  // Super admin can modify all
  if (tenant.role === 'super_admin') {
    return true;
  }

  // Must be same school
  if (!canAccessSchool(tenant, schoolId)) {
    return false;
  }

  // Principal can modify fees in their school
  if (tenant.role === 'principal') {
    return true;
  }

  // Others: no
  return false;
}
