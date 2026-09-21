/**
 * Imports Service
 * 
 * Generic import infrastructure with preview/commit workflow
 */

import type { TenantContext } from '../auth/auth.types';
import type {
  ImportKind,
  ImportPreviewResult,
  ImportCommitResult,
  PreviewImportRequest,
  ImportRowError,
  ImportRowWarning,
} from './imports.types';
import type { TimetableImportRow } from '../timetable/timetable.types';
import * as importsRepo from './imports.repository';
import * as importsAuthz from './imports.authorization';
import * as timetableRepo from '../timetable/timetable.repository';
import { ImportError } from './imports.errors';
import { timetableImportRowSchema } from '../timetable/timetable.schemas';
import { logAudit } from '../lib/audit/audit.service';
import { z } from 'zod';

const PREVIEW_EXPIRY_HOURS = 2;

/**
 * =====================================================================
 * PREVIEW IMPORT
 * =====================================================================
 */

export async function previewImport(
  db: D1Database,
  kind: ImportKind,
  data: PreviewImportRequest,
  tenant: TenantContext
): Promise<ImportPreviewResult> {
  importsAuthz.ensureCanImport(tenant, kind);

  const errors: ImportRowError[] = [];
  const warnings: ImportRowWarning[] = [];

  // Validate based on kind
  if (kind === 'timetable') {
    await validateTimetableImport(db, data.rows, tenant, errors, warnings);
  } else {
    throw ImportError.unsupportedKind(kind);
  }

  const validRows = data.rows.length - errors.filter(e => e.row >= 0).length;
  const errorRows = new Set(errors.filter(e => e.row >= 0).map(e => e.row)).size;
  const warningRows = new Set(warnings.filter(w => w.row >= 0).map(w => w.row)).size;

  // Create import job
  const expiresAt = Date.now() + (PREVIEW_EXPIRY_HOURS * 60 * 60 * 1000);
  const payload = JSON.stringify({ rows: data.rows, options: data.options });
  const payloadHash = await hashPayload(payload);

  const summary = JSON.stringify({
    total_rows: data.rows.length,
    valid_rows: validRows,
    error_rows: errorRows,
    warning_rows: warningRows,
  });

  const importJob = await importsRepo.createImportJob(
    db,
    tenant.schoolId,
    kind,
    tenant.userId,
    payloadHash,
    payload,
    summary,
    expiresAt
  );

  await logAudit(db, tenant, 'import_previewed', kind, importJob.id, null, { kind, rows: data.rows.length });

  return {
    import_id: importJob.id,
    total_rows: data.rows.length,
    valid_rows: validRows,
    error_rows: errorRows,
    warning_rows: warningRows,
    errors,
    warnings,
    summary: { kind },
    expires_at: expiresAt,
  };
}

/**
 * =====================================================================
 * COMMIT IMPORT
 * =====================================================================
 */

export async function commitImport(
  db: D1Database,
  importId: string,
  tenant: TenantContext
): Promise<ImportCommitResult> {
  const importJob = await importsRepo.findImportJobById(db, importId);

  if (!importJob) {
    throw ImportError.importNotFound(importId);
  }

  importsAuthz.ensureCanCommitImport(tenant, importJob);

  if (importJob.status !== 'previewed') {
    throw ImportError.invalidStatus(importJob.status, 'previewed');
  }

  if (importJob.expires_at < Date.now()) {
    await importsRepo.updateImportJobStatus(db, importId, 'expired');
    throw ImportError.expired(importId);
  }

  await importsRepo.updateImportJobStatus(db, importId, 'committing');

  try {
    const payload = JSON.parse(importJob.payload || '{}');
    let result: ImportCommitResult;

    if (importJob.kind === 'timetable') {
      result = await commitTimetableImport(db, payload.rows, tenant);
    } else {
      throw ImportError.unsupportedKind(importJob.kind);
    }

    await importsRepo.updateImportJobStatus(db, importId, 'committed', Date.now());
    await importsRepo.clearImportJobPayload(db, importId);

    await logAudit(db, tenant, 'import_committed', importJob.kind, importId, null, result);

    return result;
  } catch (error) {
    await importsRepo.updateImportJobStatus(db, importId, 'failed');
    throw ImportError.commitFailed(error instanceof Error ? error.message : 'Unknown error');
  }
}

/**
 * =====================================================================
 * GET IMPORT
 * =====================================================================
 */

export async function getImport(
  db: D1Database,
  importId: string,
  tenant: TenantContext
) {
  const importJob = await importsRepo.findImportJobById(db, importId);

  if (!importJob) {
    throw ImportError.importNotFound(importId);
  }

  importsAuthz.ensureCanViewImport(tenant, importJob);

  return importJob;
}

/**
 * =====================================================================
 * CANCEL IMPORT
 * =====================================================================
 */

export async function cancelImport(
  db: D1Database,
  importId: string,
  tenant: TenantContext
): Promise<void> {
  const importJob = await importsRepo.findImportJobById(db, importId);

  if (!importJob) {
    throw ImportError.importNotFound(importId);
  }

  importsAuthz.ensureCanViewImport(tenant, importJob);

  if (importJob.status === 'committed') {
    throw ImportError.invalidStatus(importJob.status, 'previewed or committing');
  }

  await importsRepo.updateImportJobStatus(db, importId, 'expired');
  await importsRepo.clearImportJobPayload(db, importId);

  await logAudit(db, tenant, 'import_cancelled', importJob.kind, importId, importJob, null);
}

/**
 * =====================================================================
 * TIMETABLE IMPORT VALIDATION
 * =====================================================================
 */

async function validateTimetableImport(
  db: D1Database,
  rows: unknown[],
  tenant: TenantContext,
  errors: ImportRowError[],
  warnings: ImportRowWarning[]
): Promise<void> {
  const dayMap: Record<string, number> = {
    'MON': 1, 'MONDAY': 1,
    'TUE': 2, 'TUESDAY': 2,
    'WED': 3, 'WEDNESDAY': 3,
    'THU': 4, 'THURSDAY': 4,
    'FRI': 5, 'FRIDAY': 5,
    'SAT': 6, 'SATURDAY': 6,
    'SUN': 7, 'SUNDAY': 7,
  };

  // Track conflicts within import
  const slotMap = new Map<string, number>();
  const teacherSlots = new Map<string, number>();

  for (let i = 0; i < rows.length; i++) {
    const rowNum = i + 1;

    try {
      const row = timetableImportRowSchema.parse(rows[i]) as TimetableImportRow;

      // Validate academic year
      const academicYear = await db
        .prepare(`SELECT id FROM academic_years WHERE school_id = ? AND label = ?`)
        .bind(tenant.schoolId, row.academic_year)
        .first<{ id: string }>();

      if (!academicYear) {
        errors.push({
          row: rowNum,
          field: 'academic_year',
          code: 'YEAR_NOT_FOUND',
          message: `Academic year '${row.academic_year}' not found`,
        });
        continue;
      }

      // Validate classroom
      const classroom = await db
        .prepare(`SELECT id FROM classrooms WHERE school_id = ? AND code = ? AND academic_year_id = ?`)
        .bind(tenant.schoolId, row.classroom_code, academicYear.id)
        .first<{ id: string }>();

      if (!classroom) {
        errors.push({
          row: rowNum,
          field: 'classroom_code',
          code: 'CLASSROOM_NOT_FOUND',
          message: `Classroom '${row.classroom_code}' not found in year '${row.academic_year}'`,
        });
        continue;
      }

      // Validate day
      const dayUpper = row.day.toUpperCase();
      const dayOfWeek = dayMap[dayUpper];

      if (!dayOfWeek) {
        errors.push({
          row: rowNum,
          field: 'day',
          code: 'INVALID_DAY',
          message: `Invalid day '${row.day}'. Use MON, TUE, WED, THU, FRI, SAT, or SUN`,
        });
        continue;
      }

      // Validate subject
      const subject = await db
        .prepare(`SELECT id FROM subjects WHERE school_id = ? AND code = ?`)
        .bind(tenant.schoolId, row.subject_code)
        .first<{ id: string }>();

      if (!subject) {
        errors.push({
          row: rowNum,
          field: 'subject_code',
          code: 'SUBJECT_NOT_FOUND',
          message: `Subject '${row.subject_code}' not found`,
        });
        continue;
      }

      // Validate teacher
      const teacher = await db
        .prepare(`SELECT user_id FROM teacher_profiles WHERE school_id = ? AND employee_code = ?`)
        .bind(tenant.schoolId, row.teacher_code)
        .first<{ user_id: string }>();

      if (!teacher) {
        errors.push({
          row: rowNum,
          field: 'teacher_code',
          code: 'TEACHER_NOT_FOUND',
          message: `Teacher '${row.teacher_code}' not found`,
        });
        continue;
      }

      // Check teaching assignment
      const hasAssignment = await timetableRepo.checkTeachingAssignment(
        db,
        teacher.user_id,
        subject.id,
        classroom.id,
        tenant.schoolId
      );

      if (!hasAssignment) {
        errors.push({
          row: rowNum,
          field: 'teacher_code',
          code: 'INVALID_ASSIGNMENT',
          message: `Teacher '${row.teacher_code}' does not have a teaching assignment for subject '${row.subject_code}' in classroom '${row.classroom_code}'`,
        });
        continue;
      }

      // Check class slot conflict within import
      const slotKey = `${classroom.id}-${dayOfWeek}-${row.period_no}`;
      if (slotMap.has(slotKey)) {
        errors.push({
          row: rowNum,
          code: 'CLASS_CONFLICT',
          message: `Duplicate slot: ${row.classroom_code} ${row.day} period ${row.period_no} (also on row ${slotMap.get(slotKey)})`,
        });
        continue;
      }
      slotMap.set(slotKey, rowNum);

      // Check teacher conflict within import
      const teacherKey = `${teacher.user_id}-${dayOfWeek}-${row.period_no}`;
      if (teacherSlots.has(teacherKey)) {
        errors.push({
          row: rowNum,
          code: 'TEACHER_CONFLICT',
          message: `Teacher ${row.teacher_code} already assigned on ${row.day} period ${row.period_no} (row ${teacherSlots.get(teacherKey)})`,
        });
        continue;
      }
      teacherSlots.set(teacherKey, rowNum);

      // Check teacher conflict with published timetables
      const conflicts = await timetableRepo.findTeacherConflicts(
        db,
        teacher.user_id,
        dayOfWeek as 1 | 2 | 3 | 4 | 5 | 6 | 7,
        row.period_no
      );

      if (conflicts.length > 0) {
        warnings.push({
          row: rowNum,
          code: 'TEACHER_CONFLICT_PUBLISHED',
          message: `Teacher ${row.teacher_code} is already teaching on ${row.day} period ${row.period_no} in another published timetable`,
        });
      }

    } catch (error) {
      if (error instanceof z.ZodError) {
        errors.push({
          row: rowNum,
          code: 'VALIDATION_ERROR',
          message: error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', '),
        });
      } else {
        errors.push({
          row: rowNum,
          code: 'UNKNOWN_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  }
}

/**
 * =====================================================================
 * TIMETABLE IMPORT COMMIT
 * =====================================================================
 */

async function commitTimetableImport(
  db: D1Database,
  rows: unknown[],
  tenant: TenantContext
): Promise<ImportCommitResult> {
  const dayMap: Record<string, number> = {
    'MON': 1, 'MONDAY': 1,
    'TUE': 2, 'TUESDAY': 2,
    'WED': 3, 'WEDNESDAY': 3,
    'THU': 4, 'THURSDAY': 4,
    'FRI': 5, 'FRIDAY': 5,
    'SAT': 6, 'SATURDAY': 6,
    'SUN': 7, 'SUNDAY': 7,
  };

  let rowsCreated = 0;

  // Group by classroom/year
  const timetables = new Map<string, { academicYearId: string; classroomId: string; entries: any[] }>();

  for (const rowData of rows) {
    const row = rowData as TimetableImportRow;

    const academicYear = await db
      .prepare(`SELECT id FROM academic_years WHERE school_id = ? AND label = ?`)
      .bind(tenant.schoolId, row.academic_year)
      .first<{ id: string }>();

    const classroom = await db
      .prepare(`SELECT id FROM classrooms WHERE school_id = ? AND code = ?`)
      .bind(tenant.schoolId, row.classroom_code)
      .first<{ id: string }>();

    const subject = await db
      .prepare(`SELECT id FROM subjects WHERE school_id = ? AND code = ?`)
      .bind(tenant.schoolId, row.subject_code)
      .first<{ id: string }>();

    const teacher = await db
      .prepare(`SELECT user_id FROM teacher_profiles WHERE school_id = ? AND employee_code = ?`)
      .bind(tenant.schoolId, row.teacher_code)
      .first<{ user_id: string }>();

    if (!academicYear || !classroom || !subject || !teacher) continue;

    const key = `${academicYear.id}-${classroom.id}`;
    if (!timetables.has(key)) {
      timetables.set(key, {
        academicYearId: academicYear.id,
        classroomId: classroom.id,
        entries: [],
      });
    }

    const dayOfWeek = dayMap[row.day.toUpperCase()];

    timetables.get(key)!.entries.push({
      day_of_week: dayOfWeek,
      period_no: row.period_no,
      subject_id: subject.id,
      teacher_id: teacher.user_id,
      start_time: row.start_time || null,
      end_time: row.end_time || null,
      room: row.room || null,
    });
  }

  // Create timetables
  for (const [, data] of timetables) {
    const version = await timetableRepo.getNextVersion(
      db,
      tenant.schoolId,
      data.academicYearId,
      data.classroomId
    );

    const timetable = await timetableRepo.createTimetable(
      db,
      tenant.schoolId,
      {
        academic_year_id: data.academicYearId,
        classroom_id: data.classroomId,
        name: `Imported v${version}`,
      },
      version,
      tenant.userId
    );

    for (const entry of data.entries) {
      await timetableRepo.createTimetableEntry(db, timetable.id, entry);
      rowsCreated++;
    }
  }

  return {
    import_id: '',
    success: true,
    rows_created: rowsCreated,
    rows_updated: 0,
    rows_skipped: 0,
    message: `Created ${timetables.size} timetable(s) with ${rowsCreated} entries`,
  };
}

/**
 * =====================================================================
 * HELPERS
 * =====================================================================
 */

async function hashPayload(payload: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(payload);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
