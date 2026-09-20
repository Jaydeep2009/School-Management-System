/**
 * Marks & Assessments Authorization
 * 
 * Authorization logic for assessments and marks
 * Enforces role-based access control and teaching assignment validation
 */

import type { D1Database } from '@cloudflare/workers-types';
import type { TenantContext } from '../auth/auth.types';
import type { Assessment } from './marks.types';
import * as teachingAssignmentRepo from '../academic/teaching-assignment.repository';

/**
 * Find teaching assignment for teacher
 */
async function findTeachingAssignment(
  db: D1Database,
  teacherId: string,
  classroomId: string,
  subjectId: string,
  schoolId: string
) {
  return await teachingAssignmentRepo.findByClassroomAndSubject(
    db,
    classroomId,
    subjectId,
    schoolId,
    'active'
  );
}

/**
 * Check if user is class teacher for classroom
 */
async function isClassTeacher(
  db: D1Database,
  userId: string,
  classroomId: string,
  schoolId: string
): Promise<boolean> {
  const result = await db
    .prepare(
      `SELECT 1
       FROM classrooms
       WHERE id = ?
         AND school_id = ?
         AND class_teacher_id = ?
       LIMIT 1`
    )
    .bind(classroomId, schoolId, userId)
    .first();

  return result !== null;
}

/**
 * Check if user can create assessment
 */
export async function canCreateAssessment(
  db: D1Database,
  tenant: TenantContext,
  classroomId: string,
  subjectId: string
): Promise<boolean> {
  // Principal can create assessments for any classroom/subject
  if (tenant.role === 'principal') {
    return true;
  }

  // Teacher must have teaching assignment
  if (tenant.role === 'teacher') {
    const assignment = await findTeachingAssignment(
      db,
      tenant.userId,
      classroomId,
      subjectId,
      tenant.schoolId
    );
    return assignment !== null;
  }

  return false;
}

/**
 * Check if user can modify assessment
 * Returns { allowed: boolean, isPrincipalOverride?: boolean }
 */
export async function canModifyAssessment(
  db: D1Database,
  tenant: TenantContext,
  assessment: Assessment
): Promise<{ allowed: boolean; isPrincipalOverride?: boolean }> {
  // Assessment must be from same school
  if (assessment.school_id !== tenant.schoolId) {
    return { allowed: false };
  }

  // Principal can always modify (override if locked)
  if (tenant.role === 'principal') {
    return {
      allowed: true,
      isPrincipalOverride: assessment.is_locked,
    };
  }

  // Teacher checks
  if (tenant.role === 'teacher') {
    // Must have teaching assignment
    const assignment = await findTeachingAssignment(
      db,
      tenant.userId,
      assessment.classroom_id,
      assessment.subject_id,
      tenant.schoolId
    );

    if (!assignment) {
      return { allowed: false };
    }

    // Assessment must not be locked
    if (assessment.is_locked) {
      return { allowed: false };
    }

    return { allowed: true };
  }

  return { allowed: false };
}

/**
 * Check if user can view assessment
 */
export async function canViewAssessment(
  db: D1Database,
  tenant: TenantContext,
  assessment: Assessment
): Promise<boolean> {
  // Assessment must be from same school
  if (assessment.school_id !== tenant.schoolId) {
    return false;
  }

  // Principal can view all
  if (tenant.role === 'principal') {
    return true;
  }

  // Teacher can view if:
  // 1. They have teaching assignment for this classroom+subject
  // 2. They are class teacher of this classroom (view-only for other subjects)
  if (tenant.role === 'teacher') {
    // Check teaching assignment
    const assignment = await findTeachingAssignment(
      db,
      tenant.userId,
      assessment.classroom_id,
      assessment.subject_id,
      tenant.schoolId
    );

    if (assignment) {
      return true;
    }

    // Check if class teacher
    const classTeacher = await isClassTeacher(
      db,
      tenant.userId,
      assessment.classroom_id,
      tenant.schoolId
    );

    return classTeacher;
  }

  return false;
}

/**
 * Check if user can publish assessment
 */
export async function canPublishAssessment(
  db: D1Database,
  tenant: TenantContext,
  assessment: Assessment
): Promise<boolean> {
  // Assessment must be from same school
  if (assessment.school_id !== tenant.schoolId) {
    return false;
  }

  // Principal can always publish
  if (tenant.role === 'principal') {
    return true;
  }

  // Teacher can publish if they have assignment
  if (tenant.role === 'teacher') {
    const assignment = await findTeachingAssignment(
      db,
      tenant.userId,
      assessment.classroom_id,
      assessment.subject_id,
      tenant.schoolId
    );
    return assignment !== null;
  }

  return false;
}

/**
 * Check if user can lock assessment
 */
export async function canLockAssessment(
  db: D1Database,
  tenant: TenantContext,
  assessment: Assessment
): Promise<boolean> {
  // Assessment must be from same school
  if (assessment.school_id !== tenant.schoolId) {
    return false;
  }

  // Principal can always lock
  if (tenant.role === 'principal') {
    return true;
  }

  // Teacher can lock if they have assignment
  if (tenant.role === 'teacher') {
    const assignment = await findTeachingAssignment(
      db,
      tenant.userId,
      assessment.classroom_id,
      assessment.subject_id,
      tenant.schoolId
    );
    return assignment !== null;
  }

  return false;
}

/**
 * Check if user can unlock assessment
 * Only principal can unlock
 */
export async function canUnlockAssessment(
  db: D1Database,
  tenant: TenantContext,
  assessment: Assessment
): Promise<boolean> {
  // Only principal can unlock
  if (tenant.role !== 'principal') {
    return false;
  }

  // Assessment must be from same school
  return assessment.school_id === tenant.schoolId;
}

/**
 * Check if user can view student marks
 */
export async function canViewStudentMarks(
  db: D1Database,
  tenant: TenantContext,
  studentId: string,
  classroomId?: string
): Promise<boolean> {
  // Principal can view all
  if (tenant.role === 'principal') {
    return true;
  }

  // Student can only view their own
  if (tenant.role === 'student') {
    return tenant.userId === studentId;
  }

  // Teacher can view if:
  // 1. They have any teaching assignment in the student's classroom
  // 2. They are class teacher of the student's classroom
  if (tenant.role === 'teacher' && classroomId) {
    // Check teaching assignment for any subject in this classroom
    const assignments = await teachingAssignmentRepo.findAll(
      db,
      tenant.schoolId,
      {
        teacher_id: tenant.userId,
        classroom_id: classroomId,
        status: 'active',
      }
    );

    if (assignments.length > 0) {
      return true;
    }

    // Check if class teacher
    const classTeacher = await isClassTeacher(
      db,
      tenant.userId,
      classroomId,
      tenant.schoolId
    );

    return classTeacher;
  }

  return false;
}

/**
 * Ensure user can create assessment (throws if not)
 */
export async function ensureCanCreateAssessment(
  db: D1Database,
  tenant: TenantContext,
  classroomId: string,
  subjectId: string
): Promise<void> {
  const can = await canCreateAssessment(db, tenant, classroomId, subjectId);
  if (!can) {
    throw new Error('Not authorized to create assessment for this classroom and subject');
  }
}

/**
 * Ensure user can modify assessment (throws if not)
 */
export async function ensureCanModifyAssessment(
  db: D1Database,
  tenant: TenantContext,
  assessment: Assessment
): Promise<{ isPrincipalOverride: boolean }> {
  const result = await canModifyAssessment(db, tenant, assessment);
  if (!result.allowed) {
    throw new Error('Not authorized to modify this assessment');
  }
  return { isPrincipalOverride: result.isPrincipalOverride || false };
}

/**
 * Ensure user can view assessment (throws if not)
 */
export async function ensureCanViewAssessment(
  db: D1Database,
  tenant: TenantContext,
  assessment: Assessment
): Promise<void> {
  const can = await canViewAssessment(db, tenant, assessment);
  if (!can) {
    throw new Error('Not authorized to view this assessment');
  }
}
