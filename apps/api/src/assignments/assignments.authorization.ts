/**
 * Assignments Authorization
 * 
 * Authorization logic for assignments and attachments
 * Enforces role-based access control and teaching assignment validation
 */

import type { D1Database } from '@cloudflare/workers-types';
import type { TenantContext } from '../auth/auth.types';
import type { Assignment } from './assignments.types';
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
 * Check if user can create assignment
 */
export async function canCreateAssignment(
  db: D1Database,
  tenant: TenantContext,
  classroomId: string,
  subjectId: string
): Promise<boolean> {
  // Principal can create assignments for any classroom/subject
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
 * Check if user can modify assignment
 */
export async function canModifyAssignment(
  db: D1Database,
  tenant: TenantContext,
  assignment: Assignment
): Promise<boolean> {
  // Assignment must be from same school
  if (assignment.school_id !== tenant.schoolId) {
    return false;
  }

  // Principal can always modify
  if (tenant.role === 'principal') {
    return true;
  }

  // Teacher checks
  if (tenant.role === 'teacher') {
    // Must have teaching assignment
    const teachingAssignment = await findTeachingAssignment(
      db,
      tenant.userId,
      assignment.classroom_id,
      assignment.subject_id,
      tenant.schoolId
    );

    if (!teachingAssignment) {
      return false;
    }

    // Can only modify drafts (published/closed require principal)
    return assignment.status === 'draft';
  }

  return false;
}

/**
 * Check if user can view assignment
 */
export async function canViewAssignment(
  db: D1Database,
  tenant: TenantContext,
  assignment: Assignment
): Promise<boolean> {
  // Assignment must be from same school
  if (assignment.school_id !== tenant.schoolId) {
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
    const teachingAssignment = await findTeachingAssignment(
      db,
      tenant.userId,
      assignment.classroom_id,
      assignment.subject_id,
      tenant.schoolId
    );

    if (teachingAssignment) {
      return true;
    }

    // Check if class teacher
    const classTeacher = await isClassTeacher(
      db,
      tenant.userId,
      assignment.classroom_id,
      tenant.schoolId
    );

    return classTeacher;
  }

  // Students can view published assignments for their classroom
  if (tenant.role === 'student') {
    // Students can only view published assignments
    if (assignment.status !== 'published') {
      return false;
    }

    // Check if student is enrolled in the classroom
    const enrollment = await db
      .prepare(
        `SELECT 1
         FROM enrollments
         WHERE student_id = ?
           AND classroom_id = ?
           AND school_id = ?
           AND status = 'active'
         LIMIT 1`
      )
      .bind(tenant.userId, assignment.classroom_id, tenant.schoolId)
      .first();

    return enrollment !== null;
  }

  return false;
}

/**
 * Check if user can publish assignment
 */
export async function canPublishAssignment(
  db: D1Database,
  tenant: TenantContext,
  assignment: Assignment
): Promise<boolean> {
  // Assignment must be from same school
  if (assignment.school_id !== tenant.schoolId) {
    return false;
  }

  // Must be draft
  if (assignment.status !== 'draft') {
    return false;
  }

  // Principal can always publish
  if (tenant.role === 'principal') {
    return true;
  }

  // Teacher can publish if they have assignment
  if (tenant.role === 'teacher') {
    const teachingAssignment = await findTeachingAssignment(
      db,
      tenant.userId,
      assignment.classroom_id,
      assignment.subject_id,
      tenant.schoolId
    );
    return teachingAssignment !== null;
  }

  return false;
}

/**
 * Check if user can close assignment
 */
export async function canCloseAssignment(
  db: D1Database,
  tenant: TenantContext,
  assignment: Assignment
): Promise<boolean> {
  // Assignment must be from same school
  if (assignment.school_id !== tenant.schoolId) {
    return false;
  }

  // Must be published
  if (assignment.status !== 'published') {
    return false;
  }

  // Principal can always close
  if (tenant.role === 'principal') {
    return true;
  }

  // Teacher can close if they have assignment
  if (tenant.role === 'teacher') {
    const teachingAssignment = await findTeachingAssignment(
      db,
      tenant.userId,
      assignment.classroom_id,
      assignment.subject_id,
      tenant.schoolId
    );
    return teachingAssignment !== null;
  }

  return false;
}

/**
 * Check if user can manage attachments
 */
export async function canManageAttachments(
  db: D1Database,
  tenant: TenantContext,
  assignment: Assignment
): Promise<boolean> {
  // Assignment must be from same school
  if (assignment.school_id !== tenant.schoolId) {
    return false;
  }

  // Principal can always manage
  if (tenant.role === 'principal') {
    return true;
  }

  // Teacher can manage attachments for draft assignments
  if (tenant.role === 'teacher') {
    // Must have teaching assignment
    const teachingAssignment = await findTeachingAssignment(
      db,
      tenant.userId,
      assignment.classroom_id,
      assignment.subject_id,
      tenant.schoolId
    );

    if (!teachingAssignment) {
      return false;
    }

    // Can only manage draft attachments
    return assignment.status === 'draft';
  }

  return false;
}

/**
 * Ensure user can create assignment (throws if not)
 */
export async function ensureCanCreateAssignment(
  db: D1Database,
  tenant: TenantContext,
  classroomId: string,
  subjectId: string
): Promise<void> {
  const can = await canCreateAssignment(db, tenant, classroomId, subjectId);
  if (!can) {
    throw new Error('Not authorized to create assignment for this classroom and subject');
  }
}

/**
 * Ensure user can modify assignment (throws if not)
 */
export async function ensureCanModifyAssignment(
  db: D1Database,
  tenant: TenantContext,
  assignment: Assignment
): Promise<void> {
  const can = await canModifyAssignment(db, tenant, assignment);
  if (!can) {
    throw new Error('Not authorized to modify this assignment');
  }
}

/**
 * Ensure user can view assignment (throws if not)
 */
export async function ensureCanViewAssignment(
  db: D1Database,
  tenant: TenantContext,
  assignment: Assignment
): Promise<void> {
  const can = await canViewAssignment(db, tenant, assignment);
  if (!can) {
    throw new Error('Not authorized to view this assignment');
  }
}
