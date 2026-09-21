/**
 * Timetable Service
 * 
 * Business logic for timetable management with versioning
 */

import type { TenantContext } from '../auth/auth.types';
import type {
  Timetable,
  TimetableEntry,
  TimetableWithDetails,
  TimetableEntryWithDetails,
  CreateTimetableRequest,
  UpdateTimetableRequest,
  UpsertTimetableEntryRequest,
  TimetableStatus,
  DayOfWeek,
} from './timetable.types';
import * as timetableRepo from './timetable.repository';
import * as timetableAuthz from './timetable.authorization';
import { TimetableError } from './timetable.errors';
import { logAudit } from '../lib/audit/audit.service';

/**
 * =====================================================================
 * TIMETABLE CRUD
 * =====================================================================
 */

export async function createTimetable(
  db: D1Database,
  data: CreateTimetableRequest,
  tenant: TenantContext
): Promise<Timetable> {
  timetableAuthz.ensureCanManageTimetables(tenant);

  // Get next version
  const version = await timetableRepo.getNextVersion(
    db,
    tenant.schoolId,
    data.academic_year_id,
    data.classroom_id
  );

  const timetable = await timetableRepo.createTimetable(
    db,
    tenant.schoolId,
    data,
    version,
    tenant.userId
  );

  await logAudit(db, tenant, 'timetable_created', 'timetable', timetable.id, null, timetable);

  return timetable;
}

export async function getTimetable(
  db: D1Database,
  timetableId: string,
  tenant: TenantContext
): Promise<Timetable> {
  timetableAuthz.ensureCanViewTimetable(tenant);

  const timetable = await timetableRepo.findTimetableById(db, timetableId, tenant.schoolId);

  if (!timetable) {
    throw TimetableError.timetableNotFound(timetableId);
  }

  return timetable;
}

export async function listTimetables(
  db: D1Database,
  academicYearId?: string,
  classroomId?: string,
  status?: TimetableStatus,
  tenant?: TenantContext
): Promise<TimetableWithDetails[]> {
  if (tenant) {
    timetableAuthz.ensureCanViewTimetable(tenant);
    return await timetableRepo.listTimetables(db, tenant.schoolId, academicYearId, classroomId, status);
  }
  return [];
}

export async function updateTimetable(
  db: D1Database,
  timetableId: string,
  data: UpdateTimetableRequest,
  tenant: TenantContext
): Promise<Timetable> {
  timetableAuthz.ensureCanManageTimetables(tenant);

  const before = await timetableRepo.findTimetableById(db, timetableId, tenant.schoolId);

  if (!before) {
    throw TimetableError.timetableNotFound(timetableId);
  }

  if (before.status !== 'draft') {
    throw TimetableError.publishedTimetableImmutable();
  }

  if (data.name) {
    await timetableRepo.updateTimetable(db, timetableId, tenant.schoolId, data.name);
  }

  const after = await timetableRepo.findTimetableById(db, timetableId, tenant.schoolId);

  await logAudit(db, tenant, 'timetable_updated', 'timetable', timetableId, before, after);

  return after!;
}

export async function deleteTimetable(
  db: D1Database,
  timetableId: string,
  tenant: TenantContext
): Promise<void> {
  timetableAuthz.ensureCanManageTimetables(tenant);

  const timetable = await timetableRepo.findTimetableById(db, timetableId, tenant.schoolId);

  if (!timetable) {
    throw TimetableError.timetableNotFound(timetableId);
  }

  if (timetable.status !== 'draft') {
    throw TimetableError.publishedTimetableImmutable();
  }

  await timetableRepo.deleteDraftTimetable(db, timetableId, tenant.schoolId);

  await logAudit(db, tenant, 'timetable_deleted', 'timetable', timetableId, timetable, null);
}

/**
 * =====================================================================
 * VERSION MANAGEMENT
 * =====================================================================
 */

export async function createNewVersion(
  db: D1Database,
  sourceTimetableId: string,
  tenant: TenantContext
): Promise<Timetable> {
  timetableAuthz.ensureCanManageTimetables(tenant);

  const source = await timetableRepo.findTimetableById(db, sourceTimetableId, tenant.schoolId);

  if (!source) {
    throw TimetableError.timetableNotFound(sourceTimetableId);
  }

  const nextVersion = await timetableRepo.getNextVersion(
    db,
    tenant.schoolId,
    source.academic_year_id,
    source.classroom_id
  );

  const newTimetable = await timetableRepo.createTimetable(
    db,
    tenant.schoolId,
    {
      academic_year_id: source.academic_year_id,
      classroom_id: source.classroom_id,
      name: `${source.name} (v${nextVersion})`,
    },
    nextVersion,
    tenant.userId
  );

  const entriesCopied = await timetableRepo.copyTimetableEntries(db, sourceTimetableId, newTimetable.id);

  await logAudit(db, tenant, 'timetable_version_created', 'timetable', newTimetable.id, { source_id: sourceTimetableId }, { ...newTimetable, entries_copied: entriesCopied });

  return newTimetable;
}

export async function publishTimetable(
  db: D1Database,
  timetableId: string,
  tenant: TenantContext
): Promise<Timetable> {
  timetableAuthz.ensureCanPublishTimetable(tenant);

  const timetable = await timetableRepo.findTimetableById(db, timetableId, tenant.schoolId);

  if (!timetable) {
    throw TimetableError.timetableNotFound(timetableId);
  }

  if (timetable.status !== 'draft') {
    throw TimetableError.invalidStatus(timetable.status, 'draft');
  }

  // VALIDATE FIRST - before archiving anything
  await validateTimetableForPublish(
    db,
    timetableId,
    tenant.schoolId,
    timetable.classroom_id,
    timetable.academic_year_id
  );

  // Only after validation succeeds, archive the old published version
  const currentPublished = await timetableRepo.findPublishedTimetable(
    db,
    tenant.schoolId,
    timetable.academic_year_id,
    timetable.classroom_id
  );

  if (currentPublished) {
    await timetableRepo.archiveTimetable(db, currentPublished.id, tenant.schoolId);
    await logAudit(db, tenant, 'timetable_archived', 'timetable', currentPublished.id, currentPublished, { ...currentPublished, status: 'archived' });
  }

  await timetableRepo.publishTimetable(db, timetableId, tenant.schoolId);

  const published = await timetableRepo.findTimetableById(db, timetableId, tenant.schoolId);

  await logAudit(db, tenant, 'timetable_published', 'timetable', timetableId, timetable, published);

  return published!;
}

export async function archiveTimetable(
  db: D1Database,
  timetableId: string,
  tenant: TenantContext
): Promise<Timetable> {
  timetableAuthz.ensureCanArchiveTimetable(tenant);

  const before = await timetableRepo.findTimetableById(db, timetableId, tenant.schoolId);

  if (!before) {
    throw TimetableError.timetableNotFound(timetableId);
  }

  await timetableRepo.archiveTimetable(db, timetableId, tenant.schoolId);

  const after = await timetableRepo.findTimetableById(db, timetableId, tenant.schoolId);

  await logAudit(db, tenant, 'timetable_archived', 'timetable', timetableId, before, after);

  return after!;
}

async function validateTimetableForPublish(
  db: D1Database,
  timetableId: string,
  schoolId: string,
  classroomId: string,
  academicYearId: string
): Promise<void> {
  const entries = await timetableRepo.listTimetableEntries(db, timetableId);

  if (entries.length === 0) {
    throw TimetableError.validationFailed('entries', 'Timetable must have at least one entry');
  }

  for (const entry of entries) {
    // Exclude conflicts from the same classroom/year being replaced
    const conflicts = await timetableRepo.findTeacherConflicts(
      db,
      entry.teacher_id,
      entry.day_of_week,
      entry.period_no,
      classroomId,
      academicYearId
    );

    if (conflicts.length > 0) {
      throw TimetableError.teacherConflict(entry.teacher_code, entry.day_name, entry.period_no);
    }
  }
}

/**
 * =====================================================================
 * TIMETABLE ENTRIES
 * =====================================================================
 */

export async function createTimetableEntry(
  db: D1Database,
  timetableId: string,
  data: UpsertTimetableEntryRequest,
  tenant: TenantContext
): Promise<TimetableEntry> {
  timetableAuthz.ensureCanManageTimetables(tenant);

  const timetable = await timetableRepo.findTimetableById(db, timetableId, tenant.schoolId);

  if (!timetable) {
    throw TimetableError.timetableNotFound(timetableId);
  }

  if (timetable.status !== 'draft') {
    throw TimetableError.publishedTimetableImmutable();
  }

  const existing = await timetableRepo.findEntryBySlot(db, timetableId, data.day_of_week, data.period_no);

  if (existing) {
    throw TimetableError.classConflict(getDayName(data.day_of_week), data.period_no);
  }

  const hasAssignment = await timetableRepo.checkTeachingAssignment(
    db,
    data.teacher_id,
    data.subject_id,
    timetable.classroom_id,
    tenant.schoolId
  );

  if (!hasAssignment) {
    throw TimetableError.invalidTeachingAssignment('teacher', 'subject');
  }

  const entry = await timetableRepo.createTimetableEntry(db, timetableId, data);

  await logAudit(db, tenant, 'timetable_entry_created', 'timetable_entry', entry.id, null, entry);

  return entry;
}

export async function updateTimetableEntry(
  db: D1Database,
  entryId: string,
  data: UpsertTimetableEntryRequest,
  tenant: TenantContext
): Promise<TimetableEntry> {
  timetableAuthz.ensureCanManageTimetables(tenant);

  const before = await timetableRepo.findTimetableEntryById(db, entryId);

  if (!before) {
    throw TimetableError.entryNotFound(entryId);
  }

  const timetable = await timetableRepo.findTimetableById(db, before.timetable_id, tenant.schoolId);

  if (!timetable) {
    throw TimetableError.timetableNotFound(before.timetable_id);
  }

  if (timetable.status !== 'draft') {
    throw TimetableError.publishedTimetableImmutable();
  }

  const hasAssignment = await timetableRepo.checkTeachingAssignment(
    db,
    data.teacher_id,
    data.subject_id,
    timetable.classroom_id,
    tenant.schoolId
  );

  if (!hasAssignment) {
    throw TimetableError.invalidTeachingAssignment('teacher', 'subject');
  }

  await timetableRepo.updateTimetableEntry(db, entryId, data);

  const after = await timetableRepo.findTimetableEntryById(db, entryId);

  await logAudit(db, tenant, 'timetable_entry_updated', 'timetable_entry', entryId, before, after);

  return after!;
}

export async function deleteTimetableEntry(
  db: D1Database,
  entryId: string,
  tenant: TenantContext
): Promise<void> {
  timetableAuthz.ensureCanManageTimetables(tenant);

  const entry = await timetableRepo.findTimetableEntryById(db, entryId);

  if (!entry) {
    throw TimetableError.entryNotFound(entryId);
  }

  const timetable = await timetableRepo.findTimetableById(db, entry.timetable_id, tenant.schoolId);

  if (!timetable) {
    throw TimetableError.timetableNotFound(entry.timetable_id);
  }

  if (timetable.status !== 'draft') {
    throw TimetableError.publishedTimetableImmutable();
  }

  await timetableRepo.deleteTimetableEntry(db, entryId);

  await logAudit(db, tenant, 'timetable_entry_deleted', 'timetable_entry', entryId, entry, null);
}

export async function listTimetableEntries(
  db: D1Database,
  timetableId: string,
  tenant: TenantContext
): Promise<TimetableEntryWithDetails[]> {
  timetableAuthz.ensureCanViewTimetable(tenant);

  const timetable = await timetableRepo.findTimetableById(db, timetableId, tenant.schoolId);

  if (!timetable) {
    throw TimetableError.timetableNotFound(timetableId);
  }

  return await timetableRepo.listTimetableEntries(db, timetableId);
}

/**
 * =====================================================================
 * READ OPERATIONS
 * =====================================================================
 */

export async function getClassroomTimetable(
  db: D1Database,
  classroomId: string,
  tenant: TenantContext
): Promise<{ timetable: Timetable | null; entries: TimetableEntryWithDetails[] }> {
  timetableAuthz.ensureCanViewTimetable(tenant);

  const timetables = await timetableRepo.listTimetables(
    db,
    tenant.schoolId,
    undefined,
    classroomId,
    'published'
  );

  if (timetables.length === 0) {
    return { timetable: null, entries: [] };
  }

  const timetable = timetables[0];
  const entries = await timetableRepo.listTimetableEntries(db, timetable.id);

  return { timetable, entries };
}

export async function getMyTimetable(
  db: D1Database,
  tenant: TenantContext
): Promise<{ timetable: Timetable | null; entries: TimetableEntryWithDetails[] }> {
  if (tenant.role === 'student') {
    const enrollment = await db
      .prepare(
        `SELECT e.classroom_id, ay.id as academic_year_id
         FROM enrollments e
         JOIN academic_years ay ON e.academic_year_id = ay.id
         WHERE e.student_id = ? AND e.school_id = ? AND ay.status = 'current' AND e.status = 'active'
         LIMIT 1`
      )
      .bind(tenant.userId, tenant.schoolId)
      .first<{ classroom_id: string; academic_year_id: string }>();

    if (!enrollment) {
      return { timetable: null, entries: [] };
    }

    return await getClassroomTimetable(db, enrollment.classroom_id, tenant);
  }

  if (tenant.role === 'teacher') {
    const classrooms = await timetableRepo.findTeacherClassrooms(
      db,
      tenant.userId,
      tenant.schoolId,
      '' // Need current academic year
    );

    const allEntries: TimetableEntryWithDetails[] = [];

    for (const classroomId of classrooms) {
      const { entries } = await getClassroomTimetable(db, classroomId, tenant);
      allEntries.push(...entries.filter(e => e.teacher_id === tenant.userId));
    }

    return { timetable: null, entries: allEntries };
  }

  return { timetable: null, entries: [] };
}

function getDayName(dayOfWeek: DayOfWeek): string {
  const days = ['', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
  return days[dayOfWeek] || 'UNKNOWN';
}
