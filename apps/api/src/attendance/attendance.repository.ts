/**
 * Attendance Repository
 * Direct database access for attendance operations
 */

import type {
  AttendanceSession,
  AttendanceEntry,
  AttendanceSessionWithDetails,
  AttendanceEntryWithStudent,
  AttendanceReportFilters,
} from './attendance.types';

/**
 * Find attendance session by ID
 */
export async function findSessionById(
  db: D1Database,
  sessionId: string,
  schoolId: string
): Promise<AttendanceSession | null> {
  const result = await db
    .prepare(
      `SELECT id, school_id, academic_year_id, classroom_id, subject_id,
              session_date, period_no, taken_by, status, created_at, updated_at
       FROM attendance_sessions
       WHERE id = ? AND school_id = ?
       LIMIT 1`
    )
    .bind(sessionId, schoolId)
    .first<AttendanceSession>();

  return result || null;
}

/**
 * Find attendance sessions with filters
 */
export async function findSessions(
  db: D1Database,
  schoolId: string,
  filters: {
    academic_year_id?: string;
    classroom_id?: string;
    subject_id?: string;
    from_date?: string;
    to_date?: string;
    status?: string;
  } = {}
): Promise<AttendanceSession[]> {
  let query = `SELECT id, school_id, academic_year_id, classroom_id, subject_id,
                      session_date, period_no, taken_by, status, created_at, updated_at
               FROM attendance_sessions
               WHERE school_id = ?`;
  
  const params: any[] = [schoolId];

  if (filters.academic_year_id) {
    query += ` AND academic_year_id = ?`;
    params.push(filters.academic_year_id);
  }

  if (filters.classroom_id) {
    query += ` AND classroom_id = ?`;
    params.push(filters.classroom_id);
  }

  if (filters.subject_id) {
    query += ` AND subject_id = ?`;
    params.push(filters.subject_id);
  }

  if (filters.from_date) {
    query += ` AND session_date >= ?`;
    params.push(filters.from_date);
  }

  if (filters.to_date) {
    query += ` AND session_date <= ?`;
    params.push(filters.to_date);
  }

  if (filters.status) {
    query += ` AND status = ?`;
    params.push(filters.status);
  }

  query += ` ORDER BY session_date DESC, period_no DESC`;

  const result = await db.prepare(query).bind(...params).all<AttendanceSession>();
  return result.results || [];
}

/**
 * Find sessions with details (joins with classroom/subject names)
 */
export async function findSessionsWithDetails(
  db: D1Database,
  schoolId: string,
  filters: {
    academic_year_id?: string;
    classroom_id?: string;
    subject_id?: string;
    from_date?: string;
    to_date?: string;
  } = {}
): Promise<AttendanceSessionWithDetails[]> {
  let query = `SELECT 
                 a.id, a.school_id, a.academic_year_id, a.classroom_id, a.subject_id,
                 a.session_date, a.period_no, a.taken_by, a.status, a.created_at, a.updated_at,
                 c.grade_name || '-' || c.division_name as classroom_name,
                 s.name as subject_name,
                 COUNT(e.student_id) as entry_count
               FROM attendance_sessions a
               JOIN classrooms c ON a.classroom_id = c.id
               JOIN subjects s ON a.subject_id = s.id
               LEFT JOIN attendance_entries e ON a.id = e.session_id
               WHERE a.school_id = ?`;
  
  const params: any[] = [schoolId];

  if (filters.academic_year_id) {
    query += ` AND a.academic_year_id = ?`;
    params.push(filters.academic_year_id);
  }

  if (filters.classroom_id) {
    query += ` AND a.classroom_id = ?`;
    params.push(filters.classroom_id);
  }

  if (filters.subject_id) {
    query += ` AND a.subject_id = ?`;
    params.push(filters.subject_id);
  }

  if (filters.from_date) {
    query += ` AND a.session_date >= ?`;
    params.push(filters.from_date);
  }

  if (filters.to_date) {
    query += ` AND a.session_date <= ?`;
    params.push(filters.to_date);
  }

  query += ` GROUP BY a.id, a.school_id, a.academic_year_id, a.classroom_id, a.subject_id,
                      a.session_date, a.period_no, a.taken_by, a.status, a.created_at, a.updated_at,
                      c.grade_name, c.division_name, s.name
             ORDER BY a.session_date DESC, a.period_no DESC`;

  const result = await db.prepare(query).bind(...params).all<AttendanceSessionWithDetails>();
  return result.results || [];
}

/**
 * Check if session exists (for duplicate detection)
 */
export async function sessionExists(
  db: D1Database,
  schoolId: string,
  classroomId: string,
  subjectId: string,
  sessionDate: string,
  periodNo: number
): Promise<boolean> {
  const result = await db
    .prepare(
      `SELECT 1 FROM attendance_sessions
       WHERE school_id = ? AND classroom_id = ? AND subject_id = ? 
         AND session_date = ? AND period_no = ?
       LIMIT 1`
    )
    .bind(schoolId, classroomId, subjectId, sessionDate, periodNo)
    .first();

  return result !== null;
}

/**
 * Create attendance session
 */
export async function createSession(
  db: D1Database,
  session: AttendanceSession
): Promise<AttendanceSession> {
  await db
    .prepare(
      `INSERT INTO attendance_sessions (
        id, school_id, academic_year_id, classroom_id, subject_id,
        session_date, period_no, taken_by, status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      session.id,
      session.school_id,
      session.academic_year_id,
      session.classroom_id,
      session.subject_id,
      session.session_date,
      session.period_no,
      session.taken_by,
      session.status,
      session.created_at,
      session.updated_at
    )
    .run();

  return session;
}

/**
 * Update session status (for locking/unlocking)
 */
export async function updateSessionStatus(
  db: D1Database,
  sessionId: string,
  schoolId: string,
  status: 'open' | 'locked'
): Promise<void> {
  await db
    .prepare(
      `UPDATE attendance_sessions
       SET status = ?, updated_at = ?
       WHERE id = ? AND school_id = ?`
    )
    .bind(status, Date.now(), sessionId, schoolId)
    .run();
}

/**
 * Find attendance entries for a session
 */
export async function findEntriesBySession(
  db: D1Database,
  sessionId: string
): Promise<AttendanceEntry[]> {
  const result = await db
    .prepare(
      `SELECT session_id, student_id, enrollment_id, status, updated_by, updated_at
       FROM attendance_entries
       WHERE session_id = ?
       ORDER BY student_id`
    )
    .bind(sessionId)
    .all<AttendanceEntry>();

  return result.results || [];
}

/**
 * Find attendance entries for a session with student details
 */
export async function findEntriesBySessionWithDetails(
  db: D1Database,
  sessionId: string
): Promise<AttendanceEntryWithStudent[]> {
  const result = await db
    .prepare(
      `SELECT 
         e.session_id, e.student_id, e.enrollment_id, e.status, e.updated_by, e.updated_at,
         sp.student_code,
         sp.first_name || ' ' || sp.last_name as student_name
       FROM attendance_entries e
       JOIN student_profiles sp ON e.student_id = sp.user_id
       WHERE e.session_id = ?
       ORDER BY sp.student_code`
    )
    .bind(sessionId)
    .all<AttendanceEntryWithStudent>();

  return result.results || [];
}

/**
 * Upsert attendance entry (insert or update)
 */
export async function upsertEntry(
  db: D1Database,
  entry: AttendanceEntry
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO attendance_entries (session_id, student_id, enrollment_id, status, updated_by, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(session_id, student_id) DO UPDATE SET
         status = excluded.status,
         updated_by = excluded.updated_by,
         updated_at = excluded.updated_at`
    )
    .bind(
      entry.session_id,
      entry.student_id,
      entry.enrollment_id,
      entry.status,
      entry.updated_by,
      entry.updated_at
    )
    .run();
}

/**
 * Get attendance summary for a student
 */
export async function getStudentAttendanceSummary(
  db: D1Database,
  studentId: string,
  schoolId: string,
  filters: {
    academic_year_id?: string;
    classroom_id?: string;
    subject_id?: string;
    from_date?: string;
    to_date?: string;
  } = {}
): Promise<{ total_sessions: number; present: number; absent: number }> {
  let query = `SELECT 
                 COUNT(*) as total_sessions,
                 SUM(CASE WHEN e.status = 'present' THEN 1 ELSE 0 END) as present,
                 SUM(CASE WHEN e.status = 'absent' THEN 1 ELSE 0 END) as absent
               FROM attendance_entries e
               JOIN attendance_sessions s ON e.session_id = s.id
               WHERE e.student_id = ? AND s.school_id = ?`;
  
  const params: any[] = [studentId, schoolId];

  if (filters.academic_year_id) {
    query += ` AND s.academic_year_id = ?`;
    params.push(filters.academic_year_id);
  }

  if (filters.classroom_id) {
    query += ` AND s.classroom_id = ?`;
    params.push(filters.classroom_id);
  }

  if (filters.subject_id) {
    query += ` AND s.subject_id = ?`;
    params.push(filters.subject_id);
  }

  if (filters.from_date) {
    query += ` AND s.session_date >= ?`;
    params.push(filters.from_date);
  }

  if (filters.to_date) {
    query += ` AND s.session_date <= ?`;
    params.push(filters.to_date);
  }

  const result = await db
    .prepare(query)
    .bind(...params)
    .first<{ total_sessions: number; present: number; absent: number }>();

  return result || { total_sessions: 0, present: 0, absent: 0 };
}

/**
 * Get subject-wise attendance for a student
 */
export async function getStudentSubjectWiseAttendance(
  db: D1Database,
  studentId: string,
  schoolId: string,
  filters: {
    academic_year_id?: string;
    classroom_id?: string;
  } = {}
): Promise<Array<{
  subject_id: string;
  subject_name: string;
  total_sessions: number;
  present: number;
  absent: number;
}>> {
  let query = `SELECT 
                 s.subject_id,
                 subj.name as subject_name,
                 COUNT(*) as total_sessions,
                 SUM(CASE WHEN e.status = 'present' THEN 1 ELSE 0 END) as present,
                 SUM(CASE WHEN e.status = 'absent' THEN 1 ELSE 0 END) as absent
               FROM attendance_entries e
               JOIN attendance_sessions s ON e.session_id = s.id
               JOIN subjects subj ON s.subject_id = subj.id
               WHERE e.student_id = ? AND s.school_id = ?`;
  
  const params: any[] = [studentId, schoolId];

  if (filters.academic_year_id) {
    query += ` AND s.academic_year_id = ?`;
    params.push(filters.academic_year_id);
  }

  if (filters.classroom_id) {
    query += ` AND s.classroom_id = ?`;
    params.push(filters.classroom_id);
  }

  query += ` GROUP BY s.subject_id, subj.name ORDER BY subj.name`;

  const result = await db
    .prepare(query)
    .bind(...params)
    .all<{
      subject_id: string;
      subject_name: string;
      total_sessions: number;
      present: number;
      absent: number;
    }>();

  return result.results || [];
}

/**
 * Get classroom attendance summary (all students)
 */
export async function getClassroomAttendanceSummary(
  db: D1Database,
  classroomId: string,
  schoolId: string,
  filters: {
    academic_year_id?: string;
    subject_id?: string;
    from_date?: string;
    to_date?: string;
  } = {}
): Promise<Array<{
  student_id: string;
  student_code: string;
  student_name: string;
  total_sessions: number;
  present: number;
  absent: number;
}>> {
  let query = `SELECT 
                 e.student_id,
                 sp.student_code,
                 sp.first_name || ' ' || sp.last_name as student_name,
                 COUNT(*) as total_sessions,
                 SUM(CASE WHEN e.status = 'present' THEN 1 ELSE 0 END) as present,
                 SUM(CASE WHEN e.status = 'absent' THEN 1 ELSE 0 END) as absent
               FROM attendance_entries e
               JOIN attendance_sessions s ON e.session_id = s.id
               JOIN student_profiles sp ON e.student_id = sp.user_id
               WHERE s.classroom_id = ? AND s.school_id = ?`;
  
  const params: any[] = [classroomId, schoolId];

  if (filters.academic_year_id) {
    query += ` AND s.academic_year_id = ?`;
    params.push(filters.academic_year_id);
  }

  if (filters.subject_id) {
    query += ` AND s.subject_id = ?`;
    params.push(filters.subject_id);
  }

  if (filters.from_date) {
    query += ` AND s.session_date >= ?`;
    params.push(filters.from_date);
  }

  if (filters.to_date) {
    query += ` AND s.session_date <= ?`;
    params.push(filters.to_date);
  }

  query += ` GROUP BY e.student_id, sp.student_code, sp.first_name, sp.last_name
             ORDER BY sp.student_code`;

  const result = await db
    .prepare(query)
    .bind(...params)
    .all<{
      student_id: string;
      student_code: string;
      student_name: string;
      total_sessions: number;
      present: number;
      absent: number;
    }>();

  return result.results || [];
}
