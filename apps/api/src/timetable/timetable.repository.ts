/**
 * Timetable Repository
 * 
 * Database operations for timetables and entries
 */

import type {
  Timetable,
  TimetableEntry,
  TimetableWithDetails,
  TimetableEntryWithDetails,
  TimetableStatus,
  DayOfWeek,
  CreateTimetableRequest,
  UpsertTimetableEntryRequest,
} from './timetable.types';

/**
 * =====================================================================
 * TIMETABLES
 * =====================================================================
 */

/**
 * Get next version number for classroom/year
 */
export async function getNextVersion(
  db: D1Database,
  schoolId: string,
  academicYearId: string,
  classroomId: string
): Promise<number> {
  const result = await db
    .prepare(
      `SELECT MAX(version) as max_version
       FROM timetables
       WHERE school_id = ? AND academic_year_id = ? AND classroom_id = ?`
    )
    .bind(schoolId, academicYearId, classroomId)
    .first<{ max_version: number | null }>();

  return (result?.max_version || 0) + 1;
}

/**
 * Create timetable
 */
export async function createTimetable(
  db: D1Database,
  schoolId: string,
  data: CreateTimetableRequest,
  version: number,
  createdBy: string
): Promise<Timetable> {
  const id = crypto.randomUUID();
  const now = Date.now();

  await db
    .prepare(
      `INSERT INTO timetables (
         id, school_id, academic_year_id, classroom_id, version, name,
         status, created_by, created_at, updated_at
       )
       VALUES (?, ?, ?, ?, ?, ?, 'draft', ?, ?, ?)`
    )
    .bind(id, schoolId, data.academic_year_id, data.classroom_id, version, data.name, createdBy, now, now)
    .run();

  return {
    id,
    school_id: schoolId,
    academic_year_id: data.academic_year_id,
    classroom_id: data.classroom_id,
    version,
    name: data.name,
    status: 'draft',
    image_url: null,
    created_by: createdBy,
    published_at: null,
    archived_at: null,
    created_at: now,
    updated_at: now,
  };
}

/**
 * Find timetable by ID
 */
export async function findTimetableById(
  db: D1Database,
  timetableId: string,
  schoolId: string
): Promise<Timetable | null> {
  const result = await db
    .prepare(
      `SELECT id, school_id, academic_year_id, classroom_id, version, name,
              status, created_by, published_at, archived_at, created_at, updated_at
       FROM timetables
       WHERE id = ? AND school_id = ?`
    )
    .bind(timetableId, schoolId)
    .first<Timetable>();

  return result || null;
}

/**
 * Find published timetable for classroom/year
 */
export async function findPublishedTimetable(
  db: D1Database,
  schoolId: string,
  academicYearId: string,
  classroomId: string
): Promise<Timetable | null> {
  const result = await db
    .prepare(
      `SELECT id, school_id, academic_year_id, classroom_id, version, name,
              status, created_by, published_at, archived_at, created_at, updated_at
       FROM timetables
       WHERE school_id = ? AND academic_year_id = ? AND classroom_id = ?
         AND status = 'published'
       LIMIT 1`
    )
    .bind(schoolId, academicYearId, classroomId)
    .first<Timetable>();

  return result || null;
}

/**
 * List timetables for classroom/year
 */
export async function listTimetables(
  db: D1Database,
  schoolId: string,
  academicYearId?: string,
  classroomId?: string,
  status?: TimetableStatus
): Promise<TimetableWithDetails[]> {
  let query = `
    SELECT 
      t.id, t.school_id, t.academic_year_id, t.classroom_id, t.version, t.name,
      t.status, t.created_by, t.published_at, t.archived_at, t.created_at, t.updated_at,
      ay.label as academic_year_label,
      c.classroom_code as classroom_code,
      c.grade_name as classroom_grade,
      c.division_name as classroom_division
    FROM timetables t
    JOIN academic_years ay ON t.academic_year_id = ay.id
    JOIN classrooms c ON t.classroom_id = c.id
    WHERE t.school_id = ?
  `;
  
  const bindings: unknown[] = [schoolId];

  if (academicYearId) {
    query += ` AND t.academic_year_id = ?`;
    bindings.push(academicYearId);
  }

  if (classroomId) {
    query += ` AND t.classroom_id = ?`;
    bindings.push(classroomId);
  }

  if (status) {
    query += ` AND t.status = ?`;
    bindings.push(status);
  }

  query += ` ORDER BY t.created_at DESC`;

  const result = await db
    .prepare(query)
    .bind(...bindings)
    .all<TimetableWithDetails>();

  return result.results || [];
}

/**
 * Update timetable
 */
export async function updateTimetable(
  db: D1Database,
  timetableId: string,
  schoolId: string,
  name: string
): Promise<void> {
  const now = Date.now();

  await db
    .prepare(
      `UPDATE timetables
       SET name = ?, updated_at = ?
       WHERE id = ? AND school_id = ?`
    )
    .bind(name, now, timetableId, schoolId)
    .run();
}

/**
 * Update timetable image URL
 */
export async function updateTimetableImage(
  db: D1Database,
  timetableId: string,
  schoolId: string,
  imageUrl: string
): Promise<void> {
  const now = Date.now();

  await db
    .prepare(
      `UPDATE timetables
       SET image_url = ?, updated_at = ?
       WHERE id = ? AND school_id = ?`
    )
    .bind(imageUrl, now, timetableId, schoolId)
    .run();
}

/**
 * Publish timetable
 */
export async function publishTimetable(
  db: D1Database,
  timetableId: string,
  schoolId: string
): Promise<void> {
  const now = Date.now();

  await db
    .prepare(
      `UPDATE timetables
       SET status = 'published', published_at = ?, updated_at = ?
       WHERE id = ? AND school_id = ?`
    )
    .bind(now, now, timetableId, schoolId)
    .run();
}

/**
 * Atomically archive existing published timetable and publish new one
 * Prevents race condition where two concurrent publishes could both succeed
 */
export async function atomicArchiveAndPublish(
  db: D1Database,
  timetableId: string,
  schoolId: string,
  academicYearId: string,
  classroomId: string
): Promise<void> {
  const now = Date.now();

  // Atomic operation: archive any existing published, then publish new
  await db.batch([
    // Archive any existing published timetable for this classroom/year
    db.prepare(
      `UPDATE timetables
       SET status = 'archived', archived_at = ?, updated_at = ?
       WHERE school_id = ? 
         AND academic_year_id = ? 
         AND classroom_id = ? 
         AND status = 'published'`
    ).bind(now, now, schoolId, academicYearId, classroomId),

    // Publish the new timetable
    db.prepare(
      `UPDATE timetables
       SET status = 'published', published_at = ?, updated_at = ?
       WHERE id = ? 
         AND school_id = ? 
         AND status = 'draft'`
    ).bind(now, now, timetableId, schoolId)
  ]);
}

/**
 * Archive timetable
 */
export async function archiveTimetable(
  db: D1Database,
  timetableId: string,
  schoolId: string
): Promise<void> {
  const now = Date.now();

  await db
    .prepare(
      `UPDATE timetables
       SET status = 'archived', archived_at = ?, updated_at = ?
       WHERE id = ? AND school_id = ?`
    )
    .bind(now, now, timetableId, schoolId)
    .run();
}

/**
 * Delete draft timetable
 */
export async function deleteDraftTimetable(
  db: D1Database,
  timetableId: string,
  schoolId: string
): Promise<void> {
  // Entries will be deleted via CASCADE
  await db
    .prepare(
      `DELETE FROM timetables
       WHERE id = ? AND school_id = ? AND status = 'draft'`
    )
    .bind(timetableId, schoolId)
    .run();
}

/**
 * =====================================================================
 * TIMETABLE ENTRIES
 * =====================================================================
 */

/**
 * Create timetable entry
 */
export async function createTimetableEntry(
  db: D1Database,
  timetableId: string,
  data: UpsertTimetableEntryRequest
): Promise<TimetableEntry> {
  const id = crypto.randomUUID();
  const now = Date.now();

  await db
    .prepare(
      `INSERT INTO timetable_entries (
         id, timetable_id, day_of_week, period_no, subject_id, teacher_id, teacher_name,
         start_time, end_time, room, created_at, updated_at
       )
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      id,
      timetableId,
      data.day_of_week,
      data.period_no,
      data.subject_id,
      data.teacher_id || null,
      data.teacher_name || null,
      data.start_time || null,
      data.end_time || null,
      data.room || null,
      now,
      now
    )
    .run();

  return {
    id,
    timetable_id: timetableId,
    day_of_week: data.day_of_week,
    period_no: data.period_no,
    subject_id: data.subject_id,
    teacher_id: data.teacher_id,
    start_time: data.start_time || null,
    end_time: data.end_time || null,
    room: data.room || null,
    created_at: now,
    updated_at: now,
  };
}

/**
 * Update timetable entry
 */
export async function updateTimetableEntry(
  db: D1Database,
  entryId: string,
  data: UpsertTimetableEntryRequest
): Promise<void> {
  const now = Date.now();

  await db
    .prepare(
      `UPDATE timetable_entries
       SET subject_id = ?, teacher_id = ?, start_time = ?, end_time = ?, room = ?, updated_at = ?
       WHERE id = ?`
    )
    .bind(
      data.subject_id,
      data.teacher_id,
      data.start_time || null,
      data.end_time || null,
      data.room || null,
      now,
      entryId
    )
    .run();
}

/**
 * Find timetable entry by ID
 */
export async function findTimetableEntryById(
  db: D1Database,
  entryId: string
): Promise<TimetableEntry | null> {
  const result = await db
    .prepare(
      `SELECT id, timetable_id, day_of_week, period_no, subject_id, teacher_id,
              start_time, end_time, room, created_at, updated_at
       FROM timetable_entries
       WHERE id = ?`
    )
    .bind(entryId)
    .first<TimetableEntry>();

  return result || null;
}

/**
 * Find timetable entry by slot
 */
export async function findEntryBySlot(
  db: D1Database,
  timetableId: string,
  dayOfWeek: DayOfWeek,
  periodNo: number
): Promise<TimetableEntry | null> {
  const result = await db
    .prepare(
      `SELECT id, timetable_id, day_of_week, period_no, subject_id, teacher_id,
              start_time, end_time, room, created_at, updated_at
       FROM timetable_entries
       WHERE timetable_id = ? AND day_of_week = ? AND period_no = ?`
    )
    .bind(timetableId, dayOfWeek, periodNo)
    .first<TimetableEntry>();

  return result || null;
}

/**
 * List timetable entries
 */
export async function listTimetableEntries(
  db: D1Database,
  timetableId: string
): Promise<TimetableEntryWithDetails[]> {
  const result = await db
    .prepare(
      `SELECT 
         te.id, te.timetable_id, te.day_of_week, te.period_no,
         te.subject_id, te.teacher_id, te.start_time, te.end_time, te.room,
         te.created_at, te.updated_at,
         CASE te.day_of_week
           WHEN 1 THEN 'MON'
           WHEN 2 THEN 'TUE'
           WHEN 3 THEN 'WED'
           WHEN 4 THEN 'THU'
           WHEN 5 THEN 'FRI'
           WHEN 6 THEN 'SAT'
           WHEN 7 THEN 'SUN'
         END as day_name,
         s.subject_code as subject_code,
         s.name as subject_name,
         tp.employee_code as teacher_code,
         COALESCE(te.teacher_name, tp.first_name || ' ' || tp.last_name) as teacher_name
       FROM timetable_entries te
       JOIN subjects s ON te.subject_id = s.id
       LEFT JOIN teacher_profiles tp ON te.teacher_id = tp.user_id
       WHERE te.timetable_id = ?
       ORDER BY te.day_of_week, te.period_no`
    )
    .bind(timetableId)
    .all<TimetableEntryWithDetails>();

  return result.results || [];
}

/**
 * Delete timetable entry
 */
export async function deleteTimetableEntry(
  db: D1Database,
  entryId: string
): Promise<void> {
  await db
    .prepare(`DELETE FROM timetable_entries WHERE id = ?`)
    .bind(entryId)
    .run();
}

/**
 * Find teacher conflicts for a time slot
 * Excludes conflicts from the same classroom+academic_year (same timetable being replaced)
 */
export async function findTeacherConflicts(
  db: D1Database,
  teacherId: string,
  dayOfWeek: DayOfWeek,
  periodNo: number,
  excludeClassroomId?: string,
  excludeAcademicYearId?: string
): Promise<TimetableEntryWithDetails[]> {
  let query = `
    SELECT 
      te.id, te.timetable_id, te.day_of_week, te.period_no,
      te.subject_id, te.teacher_id, te.start_time, te.end_time, te.room,
      te.created_at, te.updated_at,
      CASE te.day_of_week
        WHEN 1 THEN 'MON'
        WHEN 2 THEN 'TUE'
        WHEN 3 THEN 'WED'
        WHEN 4 THEN 'THU'
        WHEN 5 THEN 'FRI'
        WHEN 6 THEN 'SAT'
        WHEN 7 THEN 'SUN'
      END as day_name,
      s.subject_code as subject_code,
      s.name as subject_name,
      tp.employee_code as teacher_code,
      COALESCE(te.teacher_name, tp.first_name || ' ' || tp.last_name) as teacher_name
    FROM timetable_entries te
    JOIN timetables t ON te.timetable_id = t.id
    JOIN subjects s ON te.subject_id = s.id
    LEFT JOIN teacher_profiles tp ON te.teacher_id = tp.user_id
    WHERE te.teacher_id = ?
      AND te.day_of_week = ?
      AND te.period_no = ?
      AND t.status = 'published'
  `;

  const bindings: unknown[] = [teacherId, dayOfWeek, periodNo];

  // Exclude conflicts from the same classroom/year (version being replaced)
  if (excludeClassroomId && excludeAcademicYearId) {
    query += ` AND NOT (t.classroom_id = ? AND t.academic_year_id = ?)`;
    bindings.push(excludeClassroomId, excludeAcademicYearId);
  }

  const result = await db
    .prepare(query)
    .bind(...bindings)
    .all<TimetableEntryWithDetails>();

  return result.results || [];
}

/**
 * Check teaching assignment
 */
export async function checkTeachingAssignment(
  db: D1Database,
  teacherId: string,
  subjectId: string,
  classroomId: string,
  schoolId: string
): Promise<boolean> {
  const result = await db
    .prepare(
      `SELECT COUNT(*) as count
       FROM teaching_assignments
       WHERE teacher_id = ?
         AND subject_id = ?
         AND classroom_id = ?
         AND school_id = ?`
    )
    .bind(teacherId, subjectId, classroomId, schoolId)
    .first<{ count: number }>();

  return (result?.count || 0) > 0;
}

/**
 * Check for teacher clash (teacher already assigned at same day/period in another timetable)
 * Returns the conflicting classroom if found, null otherwise
 */
export async function checkTeacherClash(
  db: D1Database,
  teacherId: string,
  dayOfWeek: number,
  periodNo: number,
  academicYearId: string,
  schoolId: string,
  excludeTimetableId?: string
): Promise<{ classroom_code: string; subject_name: string } | null> {
  const query = excludeTimetableId
    ? `SELECT c.classroom_code, s.name as subject_name
       FROM timetable_entries te
       INNER JOIN timetables t ON te.timetable_id = t.id
       INNER JOIN classrooms c ON t.classroom_id = c.id
       INNER JOIN subjects s ON te.subject_id = s.id
       WHERE te.teacher_id = ?
         AND te.day_of_week = ?
         AND te.period_no = ?
         AND t.academic_year_id = ?
         AND t.school_id = ?
         AND t.status = 'published'
         AND t.id != ?
       LIMIT 1`
    : `SELECT c.classroom_code, s.name as subject_name
       FROM timetable_entries te
       INNER JOIN timetables t ON te.timetable_id = t.id
       INNER JOIN classrooms c ON t.classroom_id = c.id
       INNER JOIN subjects s ON te.subject_id = s.id
       WHERE te.teacher_id = ?
         AND te.day_of_week = ?
         AND te.period_no = ?
         AND t.academic_year_id = ?
         AND t.school_id = ?
         AND t.status = 'published'
       LIMIT 1`;

  const bindings = excludeTimetableId
    ? [teacherId, dayOfWeek, periodNo, academicYearId, schoolId, excludeTimetableId]
    : [teacherId, dayOfWeek, periodNo, academicYearId, schoolId];

  const result = await db
    .prepare(query)
    .bind(...bindings)
    .first<{ classroom_code: string; subject_name: string }>();

  return result || null;
}

/**
 * Check for classroom double-booking (classroom already has an entry at same day/period)
 */
export async function checkClassroomClash(
  db: D1Database,
  timetableId: string,
  dayOfWeek: number,
  periodNo: number,
  excludeEntryId?: string
): Promise<boolean> {
  const query = excludeEntryId
    ? `SELECT COUNT(*) as count
       FROM timetable_entries
       WHERE timetable_id = ?
         AND day_of_week = ?
         AND period_no = ?
         AND id != ?`
    : `SELECT COUNT(*) as count
       FROM timetable_entries
       WHERE timetable_id = ?
         AND day_of_week = ?
         AND period_no = ?`;

  const bindings = excludeEntryId
    ? [timetableId, dayOfWeek, periodNo, excludeEntryId]
    : [timetableId, dayOfWeek, periodNo];

  const result = await db
    .prepare(query)
    .bind(...bindings)
    .first<{ count: number }>();

  return (result?.count || 0) > 0;
}

/**
 * Copy timetable entries to new timetable
 */
export async function copyTimetableEntries(
  db: D1Database,
  sourceTimetableId: string,
  targetTimetableId: string
): Promise<number> {
  const now = Date.now();

  const result = await db
    .prepare(
      `INSERT INTO timetable_entries (
         id, timetable_id, day_of_week, period_no, subject_id, teacher_id,
         start_time, end_time, room, created_at, updated_at
       )
       SELECT 
         lower(hex(randomblob(16))),
         ?,
         day_of_week,
         period_no,
         subject_id,
         teacher_id,
         start_time,
         end_time,
         room,
         ?,
         ?
       FROM timetable_entries
       WHERE timetable_id = ?`
    )
    .bind(targetTimetableId, now, now, sourceTimetableId)
    .run();

  return result.meta?.changes || 0;
}

/**
 * Find classrooms where teacher has teaching assignments
 */
export async function findTeacherClassrooms(
  db: D1Database,
  teacherId: string,
  schoolId: string,
  academicYearId: string
): Promise<string[]> {
  const result = await db
    .prepare(
      `SELECT DISTINCT c.id
       FROM teaching_assignments ta
       JOIN classrooms c ON ta.classroom_id = c.id
       WHERE ta.teacher_id = ?
         AND ta.school_id = ?
         AND c.academic_year_id = ?`
    )
    .bind(teacherId, schoolId, academicYearId)
    .all<{ id: string }>();

  return (result.results || []).map(r => r.id);
}
