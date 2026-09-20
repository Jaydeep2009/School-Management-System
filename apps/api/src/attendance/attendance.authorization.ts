/**
 * Attendance Authorization Logic
 * Handles permission checks for attendance operations
 */

import type { TenantContext } from '../authz/authz.types';
import type { AttendanceSession } from './attendance.types';
import { AttendanceError } from './attendance.errors';
import { findTeachingAssignment, isClassTeacher } from '../authz/authz.repository';

/**
 * Check if user can create attendance session
 * Principal: Always allowed
 * Teacher: Must have teaching assignment for classroom+subject
 */
export async function canCreateAttendanceSession(
  db: D1Database,
  tenant: TenantContext,
  classroomId: string,
  subjectId: string
): Promise<boolean> {
  // Principal can always create
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
 * Check if user can modify attendance for a session
 * Principal: Always allowed (with override capability)
 * Teacher: Must have teaching assignment AND be within edit window (unless principal override)
 */
export async function canModifyAttendance(
  db: D1Database,
  tenant: TenantContext,
  session: AttendanceSession,
  teacherEditWindowHours: number = 48
): Promise<{ allowed: boolean; reason?: string; isPrincipalOverride?: boolean }> {
  // Session must be from same school
  if (session.school_id !== tenant.schoolId) {
    return { allowed: false, reason: 'Session belongs to different school' };
  }

  // Principal can always modify (override)
  if (tenant.role === 'principal') {
    // Check if it's an override (session locked or outside edit window)
    const isLocked = session.status === 'locked';
    const isOutsideWindow = isOutsideEditWindow(session, teacherEditWindowHours);
    return { 
      allowed: true, 
      isPrincipalOverride: isLocked || isOutsideWindow 
    };
  }

  // Teacher checks
  if (tenant.role === 'teacher') {
    // Must have teaching assignment
    const assignment = await findTeachingAssignment(
      db,
      tenant.userId,
      session.classroom_id,
      session.subject_id,
      tenant.schoolId
    );

    if (!assignment) {
      return { allowed: false, reason: 'No teaching assignment for this classroom and subject' };
    }

    // Session must not be locked
    if (session.status === 'locked') {
      return { allowed: false, reason: 'Session is locked' };
    }

    // Must be within edit window
    if (isOutsideEditWindow(session, teacherEditWindowHours)) {
      return { allowed: false, reason: 'Teacher edit window has expired' };
    }

    return { allowed: true };
  }

  return { allowed: false, reason: 'Invalid role for attendance modification' };
}

/**
 * Check if user can view attendance for a session
 * Principal: All sessions in school
 * Teacher: Assigned subjects + all subjects for class teacher
 * Student: Not applicable (use student-specific endpoint)
 */
export async function canViewAttendanceSession(
  db: D1Database,
  tenant: TenantContext,
  session: AttendanceSession
): Promise<boolean> {
  // Session must be from same school
  if (session.school_id !== tenant.schoolId) {
    return false;
  }

  // Principal can view all
  if (tenant.role === 'principal') {
    return true;
  }

  // Teacher can view if:
  // 1. They have teaching assignment for this classroom+subject, OR
  // 2. They are class teacher for this classroom
  if (tenant.role === 'teacher') {
    // Check teaching assignment
    const assignment = await findTeachingAssignment(
      db,
      tenant.userId,
      session.classroom_id,
      session.subject_id,
      tenant.schoolId
    );

    if (assignment) {
      return true;
    }

    // Check if class teacher
    const isClassTeacherResult = await isClassTeacher(
      db,
      tenant.userId,
      session.classroom_id,
      tenant.schoolId
    );

    return isClassTeacherResult;
  }

  return false;
}

/**
 * Check if user can lock/unlock attendance session
 * Only principal and authorized teachers (within window) can lock
 * Only principal can unlock
 */
export async function canLockAttendanceSession(
  db: D1Database,
  tenant: TenantContext,
  session: AttendanceSession
): Promise<boolean> {
  // Session must be from same school
  if (session.school_id !== tenant.schoolId) {
    return false;
  }

  // Principal can always lock
  if (tenant.role === 'principal') {
    return true;
  }

  // Teacher can lock only if they have assignment
  if (tenant.role === 'teacher') {
    const assignment = await findTeachingAssignment(
      db,
      tenant.userId,
      session.classroom_id,
      session.subject_id,
      tenant.schoolId
    );
    return assignment !== null;
  }

  return false;
}

export async function canUnlockAttendanceSession(
  db: D1Database,
  tenant: TenantContext,
  session: AttendanceSession
): Promise<boolean> {
  // Only principal can unlock
  if (tenant.role !== 'principal') {
    return false;
  }

  // Session must be from same school
  return session.school_id === tenant.schoolId;
}

/**
 * Helper: Check if session is outside teacher edit window
 * Edit window is calculated from the session date, not the created_at timestamp
 */
function isOutsideEditWindow(
  session: AttendanceSession,
  editWindowHours: number
): boolean {
  const now = Date.now();
  const windowMs = editWindowHours * 60 * 60 * 1000;
  
  // Parse session_date (YYYY-MM-DD) and convert to timestamp
  // Session date is in the school timezone (Asia/Kolkata), but for edit window
  // we calculate from end of that calendar day
  const sessionDate = new Date(session.session_date + 'T23:59:59');
  const sessionEndTime = sessionDate.getTime();
  
  return (now - sessionEndTime) > windowMs;
}

/**
 * Ensure user can create attendance session (throws if not)
 */
export async function ensureCanCreateAttendanceSession(
  db: D1Database,
  tenant: TenantContext,
  classroomId: string,
  subjectId: string
): Promise<void> {
  const allowed = await canCreateAttendanceSession(db, tenant, classroomId, subjectId);
  
  if (!allowed) {
    throw AttendanceError.invalidAssignment();
  }
}

/**
 * Ensure user can modify attendance (throws if not)
 */
export async function ensureCanModifyAttendance(
  db: D1Database,
  tenant: TenantContext,
  session: AttendanceSession,
  teacherEditWindowHours: number = 48
): Promise<{ isPrincipalOverride: boolean }> {
  const result = await canModifyAttendance(db, tenant, session, teacherEditWindowHours);
  
  if (!result.allowed) {
    if (result.reason === 'Session is locked') {
      throw AttendanceError.sessionLocked();
    } else if (result.reason === 'Teacher edit window has expired') {
      throw AttendanceError.editWindowExpired();
    } else {
      throw AttendanceError.notAuthorized(result.reason);
    }
  }

  return { isPrincipalOverride: result.isPrincipalOverride || false };
}

/**
 * Ensure user can view attendance session (throws if not)
 */
export async function ensureCanViewAttendanceSession(
  db: D1Database,
  tenant: TenantContext,
  session: AttendanceSession
): Promise<void> {
  const allowed = await canViewAttendanceSession(db, tenant, session);
  
  if (!allowed) {
    throw AttendanceError.notAuthorized('You do not have permission to view this attendance session');
  }
}
