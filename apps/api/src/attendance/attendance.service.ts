/**
 * Attendance Service
 * Business logic for attendance management
 */

import { ulid } from 'ulidx';
import type { TenantContext } from '../authz/authz.types';
import type {
  AttendanceSession,
  AttendanceEntry,
  CreateAttendanceSessionRequest,
  MarkAttendanceRequest,
  AttendanceSummary,
  SubjectAttendanceSummary,
  StudentAttendanceRow,
  AttendanceSessionWithDetails,
  AttendanceEntryWithStudent,
} from './attendance.types';
import { AttendanceError } from './attendance.errors';
import * as attendanceRepo from './attendance.repository';
import * as attendanceAuthz from './attendance.authorization';
import { findById as findClassroomById } from '../academic/classroom.repository';
import { findById as findSubjectById } from '../academic/subject.repository';
import { findActiveByStudent } from '../academic/enrollment.repository';
import { findCurrent as findCurrentAcademicYear } from '../academic/academic-year.repository';

/**
 * Get school settings for attendance
 */
async function getSchoolSettings(db: D1Database, schoolId: string): Promise<{
  teacherEditWindowHours: number;
}> {
  const school = await db
    .prepare('SELECT settings FROM schools WHERE id = ? LIMIT 1')
    .bind(schoolId)
    .first<{ settings: string }>();

  if (!school) {
    return { teacherEditWindowHours: 48 }; // default
  }

  try {
    const settings = JSON.parse(school.settings);
    return {
      teacherEditWindowHours: settings.attendance?.teacherEditWindowHours || 48,
    };
  } catch {
    return { teacherEditWindowHours: 48 };
  }
}

/**
 * Create attendance session
 */
export async function createSession(
  db: D1Database,
  tenant: TenantContext,
  request: CreateAttendanceSessionRequest
): Promise<AttendanceSession> {
  // Validate classroom exists and belongs to school
  const classroom = await findClassroomById(db, request.classroom_id, tenant.schoolId);
  if (!classroom) {
    throw AttendanceError.invalidClassroom();
  }

  // Validate subject exists and belongs to school
  const subject = await findSubjectById(db, request.subject_id, tenant.schoolId);
  if (!subject) {
    throw AttendanceError.invalidSubject();
  }

  // Authorization check
  await attendanceAuthz.ensureCanCreateAttendanceSession(
    db,
    tenant,
    request.classroom_id,
    request.subject_id
  );

  // Check for duplicate session
  const exists = await attendanceRepo.sessionExists(
    db,
    tenant.schoolId,
    request.classroom_id,
    request.subject_id,
    request.session_date,
    request.period_no
  );

  if (exists) {
    throw AttendanceError.duplicateSession();
  }

  // Create session
  const session: AttendanceSession = {
    id: ulid(),
    school_id: tenant.schoolId,
    academic_year_id: classroom.academic_year_id,
    classroom_id: request.classroom_id,
    subject_id: request.subject_id,
    session_date: request.session_date,
    period_no: request.period_no,
    taken_by: tenant.userId,
    status: 'open',
    created_at: Date.now(),
    updated_at: Date.now(),
  };

  return await attendanceRepo.createSession(db, session);
}

/**
 * Get attendance session by ID
 */
export async function getSessionById(
  db: D1Database,
  sessionId: string,
  tenant: TenantContext
): Promise<AttendanceSession> {
  const session = await attendanceRepo.findSessionById(db, sessionId, tenant.schoolId);
  
  if (!session) {
    throw AttendanceError.sessionNotFound(sessionId);
  }

  // Authorization check
  await attendanceAuthz.ensureCanViewAttendanceSession(db, tenant, session);

  return session;
}

/**
 * List attendance sessions
 */
export async function listSessions(
  db: D1Database,
  tenant: TenantContext,
  filters: {
    academic_year_id?: string;
    classroom_id?: string;
    subject_id?: string;
    from_date?: string;
    to_date?: string;
  } = {}
): Promise<AttendanceSessionWithDetails[]> {
  // For teachers, filter by their assignments if no specific filters provided
  // Principal can see all
  
  const sessions = await attendanceRepo.findSessionsWithDetails(
    db,
    tenant.schoolId,
    filters
  );

  // Filter based on authorization
  if (tenant.role === 'teacher') {
    // Teacher can only see sessions they're authorized to view
    const authorizedSessions: AttendanceSessionWithDetails[] = [];
    for (const session of sessions) {
      const canView = await attendanceAuthz.canViewAttendanceSession(db, tenant, session);
      if (canView) {
        authorizedSessions.push(session);
      }
    }
    return authorizedSessions;
  }

  return sessions;
}

/**
 * Mark attendance (bulk)
 */
export async function markAttendance(
  db: D1Database,
  sessionId: string,
  tenant: TenantContext,
  request: MarkAttendanceRequest
): Promise<{ updated: number }> {
  // Get session
  const session = await attendanceRepo.findSessionById(db, sessionId, tenant.schoolId);
  
  if (!session) {
    throw AttendanceError.sessionNotFound(sessionId);
  }

  // Get settings
  const settings = await getSchoolSettings(db, tenant.schoolId);

  // Authorization check
  const { isPrincipalOverride } = await attendanceAuthz.ensureCanModifyAttendance(
    db,
    tenant,
    session,
    settings.teacherEditWindowHours
  );

  // Validate all students and their enrollments
  const validatedEntries: AttendanceEntry[] = [];
  
  for (const entry of request.entries) {
    // Find active enrollment for student in this classroom
    const enrollments = await findActiveByStudent(
      db,
      entry.student_id,
      tenant.schoolId
    );

    const validEnrollment = enrollments.find(
      e => e.classroom_id === session.classroom_id && 
           e.academic_year_id === session.academic_year_id
    );

    if (!validEnrollment) {
      throw AttendanceError.invalidEnrollment();
    }

    validatedEntries.push({
      session_id: sessionId,
      student_id: entry.student_id,
      enrollment_id: validEnrollment.id,
      status: entry.status,
      updated_by: tenant.userId,
      updated_at: Date.now(),
    });
  }

  // Upsert all entries in a batch
  const statements = validatedEntries.map(entry =>
    db.prepare(
      `INSERT INTO attendance_entries (session_id, student_id, enrollment_id, status, updated_by, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(session_id, student_id) DO UPDATE SET
         status = excluded.status,
         updated_by = excluded.updated_by,
         updated_at = excluded.updated_at`
    ).bind(
      entry.session_id,
      entry.student_id,
      entry.enrollment_id,
      entry.status,
      entry.updated_by,
      entry.updated_at
    )
  );

  await db.batch(statements);

  return { updated: validatedEntries.length };
}

/**
 * Get attendance entries for a session
 * Auto-generates entries for all enrolled students if none exist
 */
export async function getSessionEntries(
  db: D1Database,
  sessionId: string,
  tenant: TenantContext
): Promise<AttendanceEntryWithStudent[]> {
  const session = await attendanceRepo.findSessionById(db, sessionId, tenant.schoolId);
  
  if (!session) {
    throw AttendanceError.sessionNotFound(sessionId);
  }

  await attendanceAuthz.ensureCanViewAttendanceSession(db, tenant, session);

  // Check if entries already exist
  let entries = await attendanceRepo.findEntriesBySessionWithDetails(db, sessionId);
  
  // If no entries exist, auto-generate for all enrolled students in the classroom
  if (entries.length === 0) {
    // Get all students enrolled in this classroom for the academic year
    const enrollments = await db
      .prepare(
        `SELECT e.id as enrollment_id, e.student_id, 
                sp.student_code, 
                sp.first_name || ' ' || sp.last_name as student_name
         FROM enrollments e
         JOIN student_profiles sp ON e.student_id = sp.user_id
         WHERE e.classroom_id = ? 
           AND e.academic_year_id = ?
           AND e.status IN ('active', 'planned')
         ORDER BY sp.student_code`
      )
      .bind(session.classroom_id, session.academic_year_id)
      .all<any>();
    
    const students = enrollments.results || [];
    
    // Create default entries (absent) for all students
    const timestamp = Date.now();
    for (const student of students) {
      const entry: AttendanceEntry = {
        session_id: sessionId,
        student_id: student.student_id,
        enrollment_id: student.enrollment_id,
        status: 'absent', // Default to absent, teacher will mark present
        updated_by: tenant.userId,
        updated_at: timestamp,
      };
      
      await attendanceRepo.upsertEntry(db, entry);
    }
    
    // Reload entries with details
    entries = await attendanceRepo.findEntriesBySessionWithDetails(db, sessionId);
  }

  return entries;
}

/**
 * Lock attendance session
 */
export async function lockSession(
  db: D1Database,
  sessionId: string,
  tenant: TenantContext
): Promise<void> {
  const session = await attendanceRepo.findSessionById(db, sessionId, tenant.schoolId);
  
  if (!session) {
    throw AttendanceError.sessionNotFound(sessionId);
  }

  const canLock = await attendanceAuthz.canLockAttendanceSession(db, tenant, session);
  
  if (!canLock) {
    throw AttendanceError.notAuthorized('Cannot lock this attendance session');
  }

  await attendanceRepo.updateSessionStatus(db, sessionId, tenant.schoolId, 'locked');
}

/**
 * Unlock attendance session
 */
export async function unlockSession(
  db: D1Database,
  sessionId: string,
  tenant: TenantContext
): Promise<void> {
  const session = await attendanceRepo.findSessionById(db, sessionId, tenant.schoolId);
  
  if (!session) {
    throw AttendanceError.sessionNotFound(sessionId);
  }

  const canUnlock = await attendanceAuthz.canUnlockAttendanceSession(db, tenant, session);
  
  if (!canUnlock) {
    throw AttendanceError.notAuthorized('Only principal can unlock attendance sessions');
  }

  await attendanceRepo.updateSessionStatus(db, sessionId, tenant.schoolId, 'open');
}

/**
 * Get student attendance summary
 */
export async function getStudentSummary(
  db: D1Database,
  studentId: string,
  tenant: TenantContext,
  filters: {
    academic_year_id?: string;
    classroom_id?: string;
    subject_id?: string;
    from_date?: string;
    to_date?: string;
  } = {}
): Promise<AttendanceSummary> {
  // Students can only view their own
  if (tenant.role === 'student' && tenant.userId !== studentId) {
    throw AttendanceError.notAuthorized('Cannot view another student\'s attendance');
  }

  const summary = await attendanceRepo.getStudentAttendanceSummary(
    db,
    studentId,
    tenant.schoolId,
    filters
  );

  const percentage = summary.total_sessions > 0
    ? (summary.present / summary.total_sessions) * 100
    : 0;

  return {
    total_sessions: summary.total_sessions,
    present: summary.present,
    absent: summary.absent,
    percentage: Math.round(percentage * 100) / 100, // Round to 2 decimals
  };
}

/**
 * Get student subject-wise attendance
 */
export async function getStudentSubjectWise(
  db: D1Database,
  studentId: string,
  tenant: TenantContext,
  filters: {
    academic_year_id?: string;
    classroom_id?: string;
  } = {}
): Promise<SubjectAttendanceSummary[]> {
  // Students can only view their own
  if (tenant.role === 'student' && tenant.userId !== studentId) {
    throw AttendanceError.notAuthorized('Cannot view another student\'s attendance');
  }

  const results = await attendanceRepo.getStudentSubjectWiseAttendance(
    db,
    studentId,
    tenant.schoolId,
    filters
  );

  return results.map(r => ({
    subject_id: r.subject_id,
    subject_name: r.subject_name,
    total_sessions: r.total_sessions,
    present: r.present,
    absent: r.absent,
    percentage: r.total_sessions > 0
      ? Math.round((r.present / r.total_sessions) * 10000) / 100
      : 0,
  }));
}

/**
 * Get classroom attendance report
 */
export async function getClassroomReport(
  db: D1Database,
  classroomId: string,
  tenant: TenantContext,
  filters: {
    academic_year_id?: string;
    subject_id?: string;
    from_date?: string;
    to_date?: string;
  } = {}
): Promise<StudentAttendanceRow[]> {
  // Authorization: Principal or class teacher or assigned subject teacher
  const classroom = await findClassroomById(db, classroomId, tenant.schoolId);
  
  if (!classroom) {
    throw AttendanceError.invalidClassroom();
  }

  const results = await attendanceRepo.getClassroomAttendanceSummary(
    db,
    classroomId,
    tenant.schoolId,
    filters
  );

  return results.map(r => ({
    student_id: r.student_id,
    student_code: r.student_code,
    student_name: r.student_name,
    total_sessions: r.total_sessions,
    present: r.present,
    absent: r.absent,
    percentage: r.total_sessions > 0
      ? Math.round((r.present / r.total_sessions) * 10000) / 100
      : 0,
  }));
}

/**
 * Get student's own attendance (for /me endpoint)
 */
export async function getMyAttendance(
  db: D1Database,
  tenant: TenantContext
): Promise<{
  summary: AttendanceSummary;
  subject_wise: SubjectAttendanceSummary[];
}> {
  if (tenant.role !== 'student') {
    throw AttendanceError.notAuthorized('This endpoint is for students only');
  }

  // Get current academic year for filtering
  const currentYear = await findCurrentAcademicYear(db, tenant.schoolId);
  
  const filters = currentYear ? { academic_year_id: currentYear.id } : {};

  const summary = await getStudentSummary(db, tenant.userId, tenant, filters);
  const subject_wise = await getStudentSubjectWise(db, tenant.userId, tenant, filters);

  return {
    summary,
    subject_wise,
  };
}
