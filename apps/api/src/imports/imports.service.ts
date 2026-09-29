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
import type { StudentImportRow } from './students-import.types';
import type { AttendanceImportRow } from './attendance-import.types';
import type { MarksImportRow } from './marks-import.types';
import type { FeeChargesImportRow } from './fee-charges-import.types';
import type { FeePaymentsImportRow } from './fee-payments-import.types';
import type { PromotionImportRow } from './promotion-import.types';
import * as importsRepo from './imports.repository';
import * as importsAuthz from './imports.authorization';
import * as timetableRepo from '../timetable/timetable.repository';
import * as studentService from '../accounts/student.service';
import { ImportError } from './imports.errors';
import { timetableImportRowSchema } from '../timetable/timetable.schemas';
import { studentImportRowSchema } from './students-import.schemas';
import { attendanceImportRowSchema } from './attendance-import.schemas';
import { marksImportRowSchema } from './marks-import.schemas';
import { feeChargesImportRowSchema } from './fee-charges-import.schemas';
import { feePaymentsImportRowSchema } from './fee-payments-import.schemas';
import { promotionImportRowSchema } from './promotion-import.schemas';
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
  } else if (kind === 'students') {
    await validateStudentsImport(db, data.rows, tenant, errors, warnings, data.options);
  } else if (kind === 'attendance') {
    await validateAttendanceImport(db, data.rows, tenant, errors, warnings);
  } else if (kind === 'marks') {
    await validateMarksImport(db, data.rows, tenant, errors, warnings);
  } else if (kind === 'fee-charges') {
    await validateFeeChargesImport(db, data.rows, tenant, errors, warnings);
  } else if (kind === 'fee-payments') {
    await validateFeePaymentsImport(db, data.rows, tenant, errors, warnings);
  } else if (kind === 'promotion') {
    await validatePromotionImport(db, data.rows, tenant, errors, warnings, data.options);
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
    } else if (importJob.kind === 'students') {
      console.log('[commitImport] Processing students import');
      console.log('[commitImport] Payload:', payload);
      console.log('[commitImport] Options from payload:', payload.options);
      result = await commitStudentsImport(db, payload.rows, tenant, payload.options);
    } else if (importJob.kind === 'attendance') {
      result = await commitAttendanceImport(db, payload.rows, tenant);
    } else if (importJob.kind === 'marks') {
      result = await commitMarksImport(db, payload.rows, tenant);
    } else if (importJob.kind === 'fee-charges') {
      result = await commitFeeChargesImport(db, payload.rows, tenant);
    } else if (importJob.kind === 'fee-payments') {
      result = await commitFeePaymentsImport(db, payload.rows, tenant);
    } else if (importJob.kind === 'promotion') {
      result = await commitPromotionImport(db, payload.rows, tenant, payload.options);
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
        .prepare(`SELECT id FROM classrooms WHERE school_id = ? AND classroom_code = ? AND academic_year_id = ?`)
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
      .prepare(`SELECT id FROM classrooms WHERE school_id = ? AND classroom_code = ?`)
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

/**
 * =====================================================================
 * STUDENTS ROSTER IMPORT VALIDATION
 * =====================================================================
 */

async function validateStudentsImport(
  db: D1Database,
  rows: unknown[],
  tenant: TenantContext,
  errors: ImportRowError[],
  warnings: ImportRowWarning[],
  options?: Record<string, unknown>
): Promise<void> {
  const seenAdmissionNumbers = new Set<string>();
  
  // Extract options
  const academicYearLabel = options?.academic_year as string | undefined;
  const classroomCode = options?.classroom_code as string | undefined;

  // Validate academic year if provided
  let academicYearId: string | undefined;
  if (academicYearLabel) {
    const academicYear = await db
      .prepare(`SELECT id FROM academic_years WHERE school_id = ? AND label = ?`)
      .bind(tenant.schoolId, academicYearLabel)
      .first<{ id: string }>();

    if (!academicYear) {
      errors.push({
        row: -1,
        code: 'YEAR_NOT_FOUND',
        message: `Academic year '${academicYearLabel}' not found`,
      });
      return;
    }
    academicYearId = academicYear.id;
  }

  // Validate classroom if provided
  let classroomId: string | undefined;
  if (classroomCode && academicYearId) {
    const classroom = await db
      .prepare(`SELECT id FROM classrooms WHERE school_id = ? AND code = ? AND academic_year_id = ?`)
      .bind(tenant.schoolId, classroomCode, academicYearId)
      .first<{ id: string }>();

    if (!classroom) {
      errors.push({
        row: -1,
        code: 'CLASSROOM_NOT_FOUND',
        message: `Classroom '${classroomCode}' not found in year '${academicYearLabel}'`,
      });
      return;
    }
    classroomId = classroom.id;
  }

  for (let i = 0; i < rows.length; i++) {
    const rowNum = i + 1;

    try {
      const row = studentImportRowSchema.parse(rows[i]) as StudentImportRow;

      // Check for duplicate admission number within import
      if (seenAdmissionNumbers.has(row.admission_number)) {
        errors.push({
          row: rowNum,
          field: 'admission_number',
          code: 'DUPLICATE_ADMISSION_NUMBER',
          message: `Admission number '${row.admission_number}' appears multiple times in this import`,
        });
        continue;
      }
      seenAdmissionNumbers.add(row.admission_number);

      // Check for existing admission number in database
      const existing = await db
        .prepare(`SELECT user_id FROM student_profiles WHERE school_id = ? AND admission_number = ?`)
        .bind(tenant.schoolId, row.admission_number)
        .first<{ user_id: string }>();

      if (existing) {
        errors.push({
          row: rowNum,
          field: 'admission_number',
          code: 'ADMISSION_NUMBER_EXISTS',
          message: `Student with admission number '${row.admission_number}' already exists`,
        });
        continue;
      }

      // Validate date format if provided
      if (row.date_of_birth) {
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(row.date_of_birth)) {
          errors.push({
            row: rowNum,
            field: 'date_of_birth',
            code: 'INVALID_DATE_FORMAT',
            message: `Date of birth must be in YYYY-MM-DD format, got '${row.date_of_birth}'`,
          });
          continue;
        }

        // Validate date is not in future
        const dob = new Date(row.date_of_birth);
        if (dob > new Date()) {
          errors.push({
            row: rowNum,
            field: 'date_of_birth',
            code: 'FUTURE_DATE',
            message: `Date of birth cannot be in the future`,
          });
          continue;
        }

        // Validate reasonable age range (3-25 years old)
        const age = Math.floor((Date.now() - dob.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
        if (age < 3 || age > 25) {
          warnings.push({
            row: rowNum,
            field: 'date_of_birth',
            code: 'UNUSUAL_AGE',
            message: `Student age (${age}) is outside typical range (3-25 years)`,
          });
        }
      }

      // Validate gender if provided
      if (row.gender && !['male', 'female', 'other'].includes(row.gender.toLowerCase())) {
        warnings.push({
          row: rowNum,
          field: 'gender',
          code: 'INVALID_GENDER',
          message: `Gender should be 'male', 'female', or 'other', got '${row.gender}'`,
        });
      }

      // Validate email format if provided
      if (row.email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(row.email)) {
          warnings.push({
            row: rowNum,
            field: 'email',
            code: 'INVALID_EMAIL',
            message: `Invalid email format: '${row.email}'`,
          });
        }
      }

      // Validate parent email format if provided
      if (row.parent_email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(row.parent_email)) {
          warnings.push({
            row: rowNum,
            field: 'parent_email',
            code: 'INVALID_EMAIL',
            message: `Invalid parent email format: '${row.parent_email}'`,
          });
        }
      }

      // Validate phone number formats if provided (basic check)
      if (row.phone && row.phone.replace(/[\s\-\(\)]/g, '').length < 10) {
        warnings.push({
          row: rowNum,
          field: 'phone',
          code: 'SHORT_PHONE',
          message: `Phone number appears too short: '${row.phone}'`,
        });
      }

      if (row.parent_phone && row.parent_phone.replace(/[\s\-\(\)]/g, '').length < 10) {
        warnings.push({
          row: rowNum,
          field: 'parent_phone',
          code: 'SHORT_PHONE',
          message: `Parent phone number appears too short: '${row.parent_phone}'`,
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
 * STUDENTS ROSTER IMPORT COMMIT
 * =====================================================================
 */

async function commitStudentsImport(
  db: D1Database,
  rows: unknown[],
  tenant: TenantContext,
  options?: Record<string, unknown>
): Promise<ImportCommitResult> {
  let rowsCreated = 0;
  let rowsSkipped = 0;

  // Extract options - support both ID-based and code-based enrollment
  const academicYearId = options?.academic_year_id as string | undefined;
  const classroomId = options?.classroom_id as string | undefined;
  const academicYearLabel = options?.academic_year as string | undefined;
  const classroomCode = options?.classroom_code as string | undefined;

  console.log('[commitStudentsImport] Options:', JSON.stringify(options));
  console.log('[commitStudentsImport] academicYearId:', academicYearId);
  console.log('[commitStudentsImport] classroomId:', classroomId);
  console.log('[commitStudentsImport] Processing', rows.length, 'students');

  // Resolve IDs if using label/code approach (fallback for compatibility)
  let resolvedAcademicYearId = academicYearId;
  let resolvedClassroomId = classroomId;

  if (!resolvedAcademicYearId && academicYearLabel) {
    const academicYear = await db
      .prepare(`SELECT id FROM academic_years WHERE school_id = ? AND label = ?`)
      .bind(tenant.schoolId, academicYearLabel)
      .first<{ id: string }>();
    
    if (academicYear) {
      resolvedAcademicYearId = academicYear.id;
    }
  }

  if (!resolvedClassroomId && classroomCode && resolvedAcademicYearId) {
    const classroom = await db
      .prepare(`SELECT id FROM classrooms WHERE school_id = ? AND code = ? AND academic_year_id = ?`)
      .bind(tenant.schoolId, classroomCode, resolvedAcademicYearId)
      .first<{ id: string }>();
    
    if (classroom) {
      resolvedClassroomId = classroom.id;
    }
  }

  // Process students one by one
  for (const rowData of rows) {
    try {
      const row = rowData as StudentImportRow;

      // Create student (user + profile)
      const result = await studentService.create(db, tenant.schoolId, {
        admission_number: row.admission_number,
        first_name: row.first_name,
        middle_name: row.middle_name,
        last_name: row.last_name,
        gender: row.gender,
        date_of_birth: row.date_of_birth,
        phone: row.phone,
        email: row.email,
        address: row.address,
        parent_name: row.parent_name,
        parent_phone: row.parent_phone,
        parent_email: row.parent_email,
      });

      rowsCreated++;

      // Create enrollment if classroom is specified
      if (resolvedClassroomId && resolvedAcademicYearId) {
        console.log('[commitStudentsImport] Creating enrollment for student:', result.user_id);
        console.log('[commitStudentsImport] Classroom:', resolvedClassroomId, 'Academic Year:', resolvedAcademicYearId);
        
        await db
          .prepare(`
            INSERT INTO enrollments (id, school_id, student_id, academic_year_id, classroom_id, joined_on, status, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          `)
          .bind(
            crypto.randomUUID(),
            tenant.schoolId,
            result.user_id,
            resolvedAcademicYearId,
            resolvedClassroomId,
            new Date().toISOString().split('T')[0],
            'active',
            Date.now(),
            Date.now()
          )
          .run();
        
        console.log('[commitStudentsImport] Enrollment created successfully');
      } else {
        console.log('[commitStudentsImport] Skipping enrollment - missing classroom or academic year');
        console.log('[commitStudentsImport] resolvedClassroomId:', resolvedClassroomId);
        console.log('[commitStudentsImport] resolvedAcademicYearId:', resolvedAcademicYearId);
      }

    } catch (error) {
      // Skip rows that fail (already validated, should be rare)
      rowsSkipped++;
      console.error('Failed to import student row:', error);
    }
  }

  // Get classroom code for message
  let classroomDisplayName = 'classroom';
  if (resolvedClassroomId) {
    const classroom = await db
      .prepare(`SELECT classroom_code FROM classrooms WHERE id = ?`)
      .bind(resolvedClassroomId)
      .first<{ classroom_code: string }>();
    if (classroom) {
      classroomDisplayName = classroom.classroom_code;
    }
  }

  const enrollmentMsg = resolvedClassroomId 
    ? ` and enrolled in ${classroomDisplayName}`
    : '';

  return {
    import_id: '',
    success: true,
    rows_created: rowsCreated,
    rows_updated: 0,
    rows_skipped: rowsSkipped,
    message: `Created ${rowsCreated} student(s)${enrollmentMsg}. Skipped ${rowsSkipped} row(s).`,
  };
}

/**
 * =====================================================================
 * ATTENDANCE BULK IMPORT VALIDATION
 * =====================================================================
 */

async function validateAttendanceImport(
  db: D1Database,
  rows: unknown[],
  tenant: TenantContext,
  errors: ImportRowError[],
  warnings: ImportRowWarning[]
): Promise<void> {
  const seenSessions = new Map<string, { sessionDate: string; periodNo: number; classroomCode: string; subjectCode: string }>();
  const seenEntries = new Set<string>();

  for (let i = 0; i < rows.length; i++) {
    const rowNum = i + 1;

    try {
      const row = attendanceImportRowSchema.parse(rows[i]) as AttendanceImportRow;

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
        .prepare(`SELECT id FROM classrooms WHERE school_id = ? AND classroom_code = ? AND academic_year_id = ?`)
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

      // Validate student
      const student = await db
        .prepare(`SELECT user_id FROM student_profiles WHERE school_id = ? AND admission_number = ?`)
        .bind(tenant.schoolId, row.student_admission_number)
        .first<{ user_id: string }>();

      if (!student) {
        errors.push({
          row: rowNum,
          field: 'student_admission_number',
          code: 'STUDENT_NOT_FOUND',
          message: `Student '${row.student_admission_number}' not found`,
        });
        continue;
      }

      // Validate enrollment exists
      const enrollment = await db
        .prepare(`
          SELECT id FROM enrollments 
          WHERE school_id = ? 
            AND student_id = ? 
            AND classroom_id = ? 
            AND academic_year_id = ?
        `)
        .bind(tenant.schoolId, student.user_id, classroom.id, academicYear.id)
        .first<{ id: string }>();

      if (!enrollment) {
        errors.push({
          row: rowNum,
          code: 'ENROLLMENT_NOT_FOUND',
          message: `Student '${row.student_admission_number}' is not enrolled in classroom '${row.classroom_code}'`,
        });
        continue;
      }

      // Validate date format
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(row.session_date)) {
        errors.push({
          row: rowNum,
          field: 'session_date',
          code: 'INVALID_DATE_FORMAT',
          message: `Session date must be in YYYY-MM-DD format, got '${row.session_date}'`,
        });
        continue;
      }

      // Validate date is not in future
      const sessionDate = new Date(row.session_date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (sessionDate > today) {
        errors.push({
          row: rowNum,
          field: 'session_date',
          code: 'FUTURE_DATE',
          message: `Session date cannot be in the future`,
        });
        continue;
      }

      // Validate period number
      if (row.period_no < 1 || row.period_no > 10) {
        errors.push({
          row: rowNum,
          field: 'period_no',
          code: 'INVALID_PERIOD',
          message: `Period number must be between 1 and 10, got ${row.period_no}`,
        });
        continue;
      }

      // Validate status
      const statusLower = row.status.toLowerCase();
      if (statusLower !== 'present' && statusLower !== 'absent') {
        errors.push({
          row: rowNum,
          field: 'status',
          code: 'INVALID_STATUS',
          message: `Status must be 'present' or 'absent', got '${row.status}'`,
        });
        continue;
      }

      // Track sessions (will need to create)
      const sessionKey = `${academicYear.id}-${classroom.id}-${subject.id}-${row.session_date}-${row.period_no}`;
      if (!seenSessions.has(sessionKey)) {
        seenSessions.set(sessionKey, {
          sessionDate: row.session_date,
          periodNo: row.period_no,
          classroomCode: row.classroom_code,
          subjectCode: row.subject_code,
        });
      }

      // Check for duplicate entries within import
      const entryKey = `${sessionKey}-${student.user_id}`;
      if (seenEntries.has(entryKey)) {
        errors.push({
          row: rowNum,
          code: 'DUPLICATE_ENTRY',
          message: `Duplicate attendance entry for student '${row.student_admission_number}' in session ${row.classroom_code} ${row.subject_code} ${row.session_date} P${row.period_no}`,
        });
        continue;
      }
      seenEntries.add(entryKey);

      // Check if session already exists in database
      const existingSession = await db
        .prepare(`
          SELECT id, status FROM attendance_sessions 
          WHERE school_id = ? 
            AND academic_year_id = ? 
            AND classroom_id = ? 
            AND subject_id = ? 
            AND session_date = ? 
            AND period_no = ?
        `)
        .bind(tenant.schoolId, academicYear.id, classroom.id, subject.id, row.session_date, row.period_no)
        .first<{ id: string; status: string }>();

      if (existingSession) {
        if (existingSession.status === 'locked') {
          errors.push({
            row: rowNum,
            code: 'SESSION_LOCKED',
            message: `Session ${row.classroom_code} ${row.subject_code} ${row.session_date} P${row.period_no} is locked and cannot be modified`,
          });
          continue;
        }

        warnings.push({
          row: rowNum,
          code: 'SESSION_EXISTS',
          message: `Session already exists - attendance will be updated`,
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
 * ATTENDANCE BULK IMPORT COMMIT
 * =====================================================================
 */

async function commitAttendanceImport(
  db: D1Database,
  rows: unknown[],
  tenant: TenantContext
): Promise<ImportCommitResult> {
  let rowsCreated = 0;
  let rowsUpdated = 0;
  let rowsSkipped = 0;

  // Group rows by session
  const sessionGroups = new Map<string, {
    academicYearId: string;
    classroomId: string;
    subjectId: string;
    sessionDate: string;
    periodNo: number;
    entries: Array<{ studentId: string; enrollmentId: string; status: string }>;
  }>();

  // First pass: resolve all IDs and group by session
  for (const rowData of rows) {
    try {
      const row = rowData as AttendanceImportRow;

      const academicYear = await db
        .prepare(`SELECT id FROM academic_years WHERE school_id = ? AND label = ?`)
        .bind(tenant.schoolId, row.academic_year)
        .first<{ id: string }>();

      const classroom = await db
        .prepare(`SELECT id FROM classrooms WHERE school_id = ? AND classroom_code = ?`)
        .bind(tenant.schoolId, row.classroom_code)
        .first<{ id: string }>();

      const subject = await db
        .prepare(`SELECT id FROM subjects WHERE school_id = ? AND code = ?`)
        .bind(tenant.schoolId, row.subject_code)
        .first<{ id: string }>();

      const student = await db
        .prepare(`SELECT user_id FROM student_profiles WHERE school_id = ? AND admission_number = ?`)
        .bind(tenant.schoolId, row.student_admission_number)
        .first<{ user_id: string }>();

      if (!academicYear || !classroom || !subject || !student) {
        rowsSkipped++;
        continue;
      }

      const enrollment = await db
        .prepare(`
          SELECT id FROM enrollments 
          WHERE school_id = ? 
            AND student_id = ? 
            AND classroom_id = ? 
            AND academic_year_id = ?
        `)
        .bind(tenant.schoolId, student.user_id, classroom.id, academicYear.id)
        .first<{ id: string }>();

      if (!enrollment) {
        rowsSkipped++;
        continue;
      }

      const sessionKey = `${academicYear.id}-${classroom.id}-${subject.id}-${row.session_date}-${row.period_no}`;
      
      if (!sessionGroups.has(sessionKey)) {
        sessionGroups.set(sessionKey, {
          academicYearId: academicYear.id,
          classroomId: classroom.id,
          subjectId: subject.id,
          sessionDate: row.session_date,
          periodNo: row.period_no,
          entries: [],
        });
      }

      sessionGroups.get(sessionKey)!.entries.push({
        studentId: student.user_id,
        enrollmentId: enrollment.id,
        status: row.status.toLowerCase(),
      });

    } catch (error) {
      rowsSkipped++;
      console.error('Failed to process attendance row:', error);
    }
  }

  // Second pass: create/update sessions and entries
  for (const [, sessionData] of sessionGroups) {
    try {
      // Check if session exists
      let sessionId: string | undefined;
      const existingSession = await db
        .prepare(`
          SELECT id FROM attendance_sessions 
          WHERE school_id = ? 
            AND academic_year_id = ? 
            AND classroom_id = ? 
            AND subject_id = ? 
            AND session_date = ? 
            AND period_no = ?
        `)
        .bind(
          tenant.schoolId,
          sessionData.academicYearId,
          sessionData.classroomId,
          sessionData.subjectId,
          sessionData.sessionDate,
          sessionData.periodNo
        )
        .first<{ id: string }>();

      if (existingSession) {
        sessionId = existingSession.id;
      } else {
        // Create new session
        sessionId = crypto.randomUUID();
        await db
          .prepare(`
            INSERT INTO attendance_sessions (
              id, school_id, academic_year_id, classroom_id, subject_id,
              session_date, period_no, taken_by, status, created_at, updated_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `)
          .bind(
            sessionId,
            tenant.schoolId,
            sessionData.academicYearId,
            sessionData.classroomId,
            sessionData.subjectId,
            sessionData.sessionDate,
            sessionData.periodNo,
            tenant.userId,
            'open',
            Date.now(),
            Date.now()
          )
          .run();
      }

      // Create/update entries
      for (const entry of sessionData.entries) {
        const existingEntry = await db
          .prepare(`SELECT 1 FROM attendance_entries WHERE session_id = ? AND student_id = ?`)
          .bind(sessionId, entry.studentId)
          .first();

        if (existingEntry) {
          // Update existing entry
          await db
            .prepare(`
              UPDATE attendance_entries 
              SET status = ?, updated_by = ?, updated_at = ?
              WHERE session_id = ? AND student_id = ?
            `)
            .bind(entry.status, tenant.userId, Date.now(), sessionId, entry.studentId)
            .run();
          rowsUpdated++;
        } else {
          // Insert new entry
          await db
            .prepare(`
              INSERT INTO attendance_entries (
                session_id, student_id, enrollment_id, status, updated_by, updated_at
              )
              VALUES (?, ?, ?, ?, ?, ?)
            `)
            .bind(sessionId, entry.studentId, entry.enrollmentId, entry.status, tenant.userId, Date.now())
            .run();
          rowsCreated++;
        }
      }

    } catch (error) {
      console.error('Failed to commit attendance session:', error);
      // Continue with other sessions
    }
  }

  return {
    import_id: '',
    success: true,
    rows_created: rowsCreated,
    rows_updated: rowsUpdated,
    rows_skipped: rowsSkipped,
    message: `Created ${rowsCreated} attendance entry(ies), updated ${rowsUpdated}, skipped ${rowsSkipped}. Processed ${sessionGroups.size} session(s).`,
  };
}

/**
 * =====================================================================
 * MARKS BULK IMPORT VALIDATION
 * =====================================================================
 */

async function validateMarksImport(
  db: D1Database,
  rows: unknown[],
  tenant: TenantContext,
  errors: ImportRowError[],
  warnings: ImportRowWarning[]
): Promise<void> {
  const seenAssessments = new Map<string, string>(); // key -> assessmentId
  const seenEntries = new Set<string>();

  for (let i = 0; i < rows.length; i++) {
    const rowNum = i + 1;

    try {
      const row = marksImportRowSchema.parse(rows[i]) as MarksImportRow;

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
        .prepare(`SELECT id FROM classrooms WHERE school_id = ? AND classroom_code = ? AND academic_year_id = ?`)
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

      // Find or track assessment
      const assessmentKey = `${academicYear.id}-${classroom.id}-${subject.id}-${row.assessment_name}`;
      let assessmentId: string | undefined;
      
      if (seenAssessments.has(assessmentKey)) {
        assessmentId = seenAssessments.get(assessmentKey);
      } else {
        const assessment = await db
          .prepare(`
            SELECT id, is_locked, max_marks FROM assessments 
            WHERE school_id = ? 
              AND academic_year_id = ? 
              AND classroom_id = ? 
              AND subject_id = ? 
              AND name = ?
          `)
          .bind(tenant.schoolId, academicYear.id, classroom.id, subject.id, row.assessment_name)
          .first<{ id: string; is_locked: number; max_marks: number }>();

        if (!assessment) {
          errors.push({
            row: rowNum,
            field: 'assessment_name',
            code: 'ASSESSMENT_NOT_FOUND',
            message: `Assessment '${row.assessment_name}' not found for ${row.classroom_code} ${row.subject_code}`,
          });
          continue;
        }

        if (assessment.is_locked) {
          errors.push({
            row: rowNum,
            code: 'ASSESSMENT_LOCKED',
            message: `Assessment '${row.assessment_name}' is locked and cannot be modified`,
          });
          continue;
        }

        assessmentId = assessment.id;
        seenAssessments.set(assessmentKey, assessmentId);

        // Validate marks against max_marks
        if (row.marks_obtained !== null && row.marks_obtained !== undefined && row.marks_obtained > assessment.max_marks) {
          warnings.push({
            row: rowNum,
            field: 'marks_obtained',
            code: 'MARKS_EXCEED_MAX',
            message: `Marks ${row.marks_obtained} exceed maximum ${assessment.max_marks}`,
          });
        }
      }

      // Validate student
      const student = await db
        .prepare(`SELECT user_id FROM student_profiles WHERE school_id = ? AND admission_number = ?`)
        .bind(tenant.schoolId, row.student_admission_number)
        .first<{ user_id: string }>();

      if (!student) {
        errors.push({
          row: rowNum,
          field: 'student_admission_number',
          code: 'STUDENT_NOT_FOUND',
          message: `Student '${row.student_admission_number}' not found`,
        });
        continue;
      }

      // Validate enrollment
      const enrollment = await db
        .prepare(`
          SELECT id FROM enrollments 
          WHERE school_id = ? 
            AND student_id = ? 
            AND classroom_id = ? 
            AND academic_year_id = ?
        `)
        .bind(tenant.schoolId, student.user_id, classroom.id, academicYear.id)
        .first<{ id: string }>();

      if (!enrollment) {
        errors.push({
          row: rowNum,
          code: 'ENROLLMENT_NOT_FOUND',
          message: `Student '${row.student_admission_number}' is not enrolled in classroom '${row.classroom_code}'`,
        });
        continue;
      }

      // Validate status
      const statusLower = row.status.toLowerCase();
      if (!['graded', 'absent', 'exempt'].includes(statusLower)) {
        errors.push({
          row: rowNum,
          field: 'status',
          code: 'INVALID_STATUS',
          message: `Status must be 'graded', 'absent', or 'exempt', got '${row.status}'`,
        });
        continue;
      }

      // Validate marks_obtained for graded status
      if (statusLower === 'graded' && (row.marks_obtained === null || row.marks_obtained === undefined)) {
        errors.push({
          row: rowNum,
          field: 'marks_obtained',
          code: 'MARKS_REQUIRED',
          message: `Marks obtained is required when status is 'graded'`,
        });
        continue;
      }

      // Check for negative marks
      if (row.marks_obtained !== null && row.marks_obtained !== undefined && row.marks_obtained < 0) {
        errors.push({
          row: rowNum,
          field: 'marks_obtained',
          code: 'NEGATIVE_MARKS',
          message: `Marks obtained cannot be negative`,
        });
        continue;
      }

      // Check for duplicate entries
      const entryKey = `${assessmentId}-${student.user_id}`;
      if (seenEntries.has(entryKey)) {
        errors.push({
          row: rowNum,
          code: 'DUPLICATE_ENTRY',
          message: `Duplicate mark entry for student '${row.student_admission_number}' in assessment '${row.assessment_name}'`,
        });
        continue;
      }
      seenEntries.add(entryKey);

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
 * MARKS BULK IMPORT COMMIT
 * =====================================================================
 */

async function commitMarksImport(
  db: D1Database,
  rows: unknown[],
  tenant: TenantContext
): Promise<ImportCommitResult> {
  let rowsCreated = 0;
  let rowsUpdated = 0;
  let rowsSkipped = 0;

  for (const rowData of rows) {
    try {
      const row = rowData as MarksImportRow;

      // Resolve IDs
      const academicYear = await db
        .prepare(`SELECT id FROM academic_years WHERE school_id = ? AND label = ?`)
        .bind(tenant.schoolId, row.academic_year)
        .first<{ id: string }>();

      const classroom = await db
        .prepare(`SELECT id FROM classrooms WHERE school_id = ? AND classroom_code = ?`)
        .bind(tenant.schoolId, row.classroom_code)
        .first<{ id: string }>();

      const subject = await db
        .prepare(`SELECT id FROM subjects WHERE school_id = ? AND code = ?`)
        .bind(tenant.schoolId, row.subject_code)
        .first<{ id: string }>();

      const student = await db
        .prepare(`SELECT user_id FROM student_profiles WHERE school_id = ? AND admission_number = ?`)
        .bind(tenant.schoolId, row.student_admission_number)
        .first<{ user_id: string }>();

      if (!academicYear || !classroom || !subject || !student) {
        rowsSkipped++;
        continue;
      }

      const assessment = await db
        .prepare(`
          SELECT id FROM assessments 
          WHERE school_id = ? 
            AND academic_year_id = ? 
            AND classroom_id = ? 
            AND subject_id = ? 
            AND name = ?
        `)
        .bind(tenant.schoolId, academicYear.id, classroom.id, subject.id, row.assessment_name)
        .first<{ id: string }>();

      if (!assessment) {
        rowsSkipped++;
        continue;
      }

      const enrollment = await db
        .prepare(`
          SELECT id FROM enrollments 
          WHERE school_id = ? 
            AND student_id = ? 
            AND classroom_id = ? 
            AND academic_year_id = ?
        `)
        .bind(tenant.schoolId, student.user_id, classroom.id, academicYear.id)
        .first<{ id: string }>();

      if (!enrollment) {
        rowsSkipped++;
        continue;
      }

      const status = row.status.toLowerCase();
      const marksObtained = status === 'graded' ? (row.marks_obtained || 0) : null;

      // Check if mark entry exists
      const existingMark = await db
        .prepare(`SELECT 1 FROM marks WHERE assessment_id = ? AND student_id = ?`)
        .bind(assessment.id, student.user_id)
        .first();

      if (existingMark) {
        // Update existing mark
        await db
          .prepare(`
            UPDATE marks 
            SET marks_obtained = ?, status = ?, updated_by = ?, updated_at = ?
            WHERE assessment_id = ? AND student_id = ?
          `)
          .bind(marksObtained, status, tenant.userId, Date.now(), assessment.id, student.user_id)
          .run();
        rowsUpdated++;
      } else {
        // Insert new mark
        await db
          .prepare(`
            INSERT INTO marks (
              assessment_id, student_id, enrollment_id, marks_obtained, status, updated_by, updated_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?)
          `)
          .bind(assessment.id, student.user_id, enrollment.id, marksObtained, status, tenant.userId, Date.now())
          .run();
        rowsCreated++;
      }

    } catch (error) {
      rowsSkipped++;
      console.error('Failed to import marks row:', error);
    }
  }

  return {
    import_id: '',
    success: true,
    rows_created: rowsCreated,
    rows_updated: rowsUpdated,
    rows_skipped: rowsSkipped,
    message: `Created ${rowsCreated} mark entry(ies), updated ${rowsUpdated}, skipped ${rowsSkipped}.`,
  };
}

/**
 * =====================================================================
 * FEE CHARGES IMPORT VALIDATION
 * =====================================================================
 */

async function validateFeeChargesImport(
  db: D1Database,
  rows: unknown[],
  tenant: TenantContext,
  errors: ImportRowError[],
  warnings: ImportRowWarning[]
): Promise<void> {
  for (let i = 0; i < rows.length; i++) {
    const rowNum = i + 1;
    try {
      const row = feeChargesImportRowSchema.parse(rows[i]) as FeeChargesImportRow;

      const academicYear = await db
        .prepare(`SELECT id FROM academic_years WHERE school_id = ? AND label = ?`)
        .bind(tenant.schoolId, row.academic_year)
        .first<{ id: string }>();

      if (!academicYear) {
        errors.push({ row: rowNum, field: 'academic_year', code: 'YEAR_NOT_FOUND', message: `Academic year '${row.academic_year}' not found` });
        continue;
      }

      const student = await db
        .prepare(`SELECT user_id FROM student_profiles WHERE school_id = ? AND admission_number = ?`)
        .bind(tenant.schoolId, row.student_admission_number)
        .first<{ user_id: string }>();

      if (!student) {
        errors.push({ row: rowNum, field: 'student_admission_number', code: 'STUDENT_NOT_FOUND', message: `Student '${row.student_admission_number}' not found` });
        continue;
      }

      if (!['fee', 'concession', 'carry_forward'].includes(row.kind.toLowerCase())) {
        errors.push({ row: rowNum, field: 'kind', code: 'INVALID_KIND', message: `Kind must be 'fee', 'concession', or 'carry_forward'` });
        continue;
      }

      if (row.amount <= 0) {
        errors.push({ row: rowNum, field: 'amount', code: 'INVALID_AMOUNT', message: `Amount must be positive` });
        continue;
      }

      if (row.fee_category_code) {
        const category = await db
          .prepare(`SELECT id FROM fee_categories WHERE school_id = ? AND code = ?`)
          .bind(tenant.schoolId, row.fee_category_code)
          .first<{ id: string }>();
        if (!category) {
          warnings.push({ row: rowNum, field: 'fee_category_code', code: 'CATEGORY_NOT_FOUND', message: `Fee category '${row.fee_category_code}' not found, will use NULL` });
        }
      }

      if (row.due_on) {
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(row.due_on)) {
          errors.push({ row: rowNum, field: 'due_on', code: 'INVALID_DATE', message: `Due date must be in YYYY-MM-DD format` });
        }
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        errors.push({ row: rowNum, code: 'VALIDATION_ERROR', message: error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ') });
      } else {
        errors.push({ row: rowNum, code: 'UNKNOWN_ERROR', message: error instanceof Error ? error.message : 'Unknown error' });
      }
    }
  }
}

async function commitFeeChargesImport(
  db: D1Database,
  rows: unknown[],
  tenant: TenantContext
): Promise<ImportCommitResult> {
  let rowsCreated = 0;
  let rowsSkipped = 0;

  for (const rowData of rows) {
    try {
      const row = rowData as FeeChargesImportRow;

      const academicYear = await db.prepare(`SELECT id FROM academic_years WHERE school_id = ? AND label = ?`).bind(tenant.schoolId, row.academic_year).first<{ id: string }>();
      const student = await db.prepare(`SELECT user_id FROM student_profiles WHERE school_id = ? AND admission_number = ?`).bind(tenant.schoolId, row.student_admission_number).first<{ user_id: string }>();

      if (!academicYear || !student) { rowsSkipped++; continue; }

      let feeCategoryId: string | null = null;
      if (row.fee_category_code) {
        const category = await db.prepare(`SELECT id FROM fee_categories WHERE school_id = ? AND code = ?`).bind(tenant.schoolId, row.fee_category_code).first<{ id: string }>();
        feeCategoryId = category?.id || null;
      }

      const enrollment = await db.prepare(`SELECT id FROM enrollments WHERE school_id = ? AND student_id = ? AND academic_year_id = ?`).bind(tenant.schoolId, student.user_id, academicYear.id).first<{ id: string }>();

      const amountPaise = Math.round(row.amount * 100);

      await db.prepare(`
        INSERT INTO fee_charges (id, school_id, student_id, academic_year_id, enrollment_id, fee_category_id, kind, title, amount_paise, due_on, created_by, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(crypto.randomUUID(), tenant.schoolId, student.user_id, academicYear.id, enrollment?.id || null, feeCategoryId, row.kind.toLowerCase(), row.title, amountPaise, row.due_on || null, tenant.userId, Date.now()).run();

      rowsCreated++;
    } catch (error) {
      rowsSkipped++;
      console.error('Failed to import fee charge:', error);
    }
  }

  return { import_id: '', success: true, rows_created: rowsCreated, rows_updated: 0, rows_skipped: rowsSkipped, message: `Created ${rowsCreated} fee charge(s), skipped ${rowsSkipped}.` };
}

/**
 * =====================================================================
 * FEE PAYMENTS IMPORT VALIDATION
 * =====================================================================
 */

async function validateFeePaymentsImport(
  db: D1Database,
  rows: unknown[],
  tenant: TenantContext,
  errors: ImportRowError[],
  warnings: ImportRowWarning[]
): Promise<void> {
  for (let i = 0; i < rows.length; i++) {
    const rowNum = i + 1;
    try {
      const row = feePaymentsImportRowSchema.parse(rows[i]) as FeePaymentsImportRow;

      const academicYear = await db.prepare(`SELECT id FROM academic_years WHERE school_id = ? AND label = ?`).bind(tenant.schoolId, row.academic_year).first<{ id: string }>();
      if (!academicYear) {
        errors.push({ row: rowNum, field: 'academic_year', code: 'YEAR_NOT_FOUND', message: `Academic year '${row.academic_year}' not found` });
        continue;
      }

      const student = await db.prepare(`SELECT user_id FROM student_profiles WHERE school_id = ? AND admission_number = ?`).bind(tenant.schoolId, row.student_admission_number).first<{ user_id: string }>();
      if (!student) {
        errors.push({ row: rowNum, field: 'student_admission_number', code: 'STUDENT_NOT_FOUND', message: `Student '${row.student_admission_number}' not found` });
        continue;
      }

      if (!['cash', 'upi', 'bank_transfer', 'other'].includes(row.method.toLowerCase())) {
        errors.push({ row: rowNum, field: 'method', code: 'INVALID_METHOD', message: `Method must be 'cash', 'upi', 'bank_transfer', or 'other'` });
        continue;
      }

      if (row.amount <= 0) {
        errors.push({ row: rowNum, field: 'amount', code: 'INVALID_AMOUNT', message: `Amount must be positive` });
        continue;
      }

      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(row.paid_on)) {
        errors.push({ row: rowNum, field: 'paid_on', code: 'INVALID_DATE', message: `Paid on must be in YYYY-MM-DD format` });
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        errors.push({ row: rowNum, code: 'VALIDATION_ERROR', message: error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ') });
      } else {
        errors.push({ row: rowNum, code: 'UNKNOWN_ERROR', message: error instanceof Error ? error.message : 'Unknown error' });
      }
    }
  }
}

async function commitFeePaymentsImport(
  db: D1Database,
  rows: unknown[],
  tenant: TenantContext
): Promise<ImportCommitResult> {
  let rowsCreated = 0;
  let rowsSkipped = 0;

  for (const rowData of rows) {
    try {
      const row = rowData as FeePaymentsImportRow;

      const academicYear = await db.prepare(`SELECT id FROM academic_years WHERE school_id = ? AND label = ?`).bind(tenant.schoolId, row.academic_year).first<{ id: string }>();
      const student = await db.prepare(`SELECT user_id FROM student_profiles WHERE school_id = ? AND admission_number = ?`).bind(tenant.schoolId, row.student_admission_number).first<{ user_id: string }>();

      if (!academicYear || !student) { rowsSkipped++; continue; }

      const amountPaise = Math.round(row.amount * 100);
      const financialYear = row.paid_on.substring(0, 4);

      // Get next receipt number
      const counter = await db.prepare(`SELECT last_number FROM receipt_counters WHERE school_id = ? AND financial_year = ?`).bind(tenant.schoolId, financialYear).first<{ last_number: number }>();
      const nextNumber = (counter?.last_number || 0) + 1;

      await db.prepare(`INSERT OR REPLACE INTO receipt_counters (school_id, financial_year, last_number) VALUES (?, ?, ?)`).bind(tenant.schoolId, financialYear, nextNumber).run();

      const receiptNo = `REC-${financialYear}-${String(nextNumber).padStart(6, '0')}`;

      await db.prepare(`
        INSERT INTO fee_payments (id, school_id, student_id, academic_year_id, receipt_no, amount_paise, paid_on, method, reference, recorded_by, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(crypto.randomUUID(), tenant.schoolId, student.user_id, academicYear.id, receiptNo, amountPaise, row.paid_on, row.method.toLowerCase(), row.reference || null, tenant.userId, Date.now()).run();

      rowsCreated++;
    } catch (error) {
      rowsSkipped++;
      console.error('Failed to import fee payment:', error);
    }
  }

  return { import_id: '', success: true, rows_created: rowsCreated, rows_updated: 0, rows_skipped: rowsSkipped, message: `Created ${rowsCreated} fee payment(s), skipped ${rowsSkipped}.` };
}

/**
 * =====================================================================
 * PROMOTION IMPORT VALIDATION
 * =====================================================================
 */

async function validatePromotionImport(
  db: D1Database,
  rows: unknown[],
  tenant: TenantContext,
  errors: ImportRowError[],
  warnings: ImportRowWarning[],
  options?: Record<string, unknown>
): Promise<void> {
  const promotionBatchId = options?.promotion_batch_id as string | undefined;

  if (!promotionBatchId) {
    errors.push({ row: -1, code: 'MISSING_BATCH_ID', message: 'promotion_batch_id is required in options' });
    return;
  }

  const batch = await db.prepare(`SELECT id FROM promotion_batches WHERE id = ? AND school_id = ?`).bind(promotionBatchId, tenant.schoolId).first<{ id: string }>();
  if (!batch) {
    errors.push({ row: -1, code: 'BATCH_NOT_FOUND', message: `Promotion batch '${promotionBatchId}' not found` });
    return;
  }

  for (let i = 0; i < rows.length; i++) {
    const rowNum = i + 1;
    try {
      const row = promotionImportRowSchema.parse(rows[i]) as PromotionImportRow;

      const student = await db.prepare(`SELECT user_id FROM student_profiles WHERE school_id = ? AND admission_number = ?`).bind(tenant.schoolId, row.student_admission_number).first<{ user_id: string }>();
      if (!student) {
        errors.push({ row: rowNum, field: 'student_admission_number', code: 'STUDENT_NOT_FOUND', message: `Student '${row.student_admission_number}' not found` });
        continue;
      }

      const fromClassroom = await db.prepare(`SELECT id FROM classrooms WHERE school_id = ? AND code = ?`).bind(tenant.schoolId, row.from_classroom_code).first<{ id: string }>();
      if (!fromClassroom) {
        errors.push({ row: rowNum, field: 'from_classroom_code', code: 'CLASSROOM_NOT_FOUND', message: `From classroom '${row.from_classroom_code}' not found` });
        continue;
      }

      const toClassroom = await db.prepare(`SELECT id FROM classrooms WHERE school_id = ? AND code = ?`).bind(tenant.schoolId, row.to_classroom_code).first<{ id: string }>();
      if (!toClassroom) {
        errors.push({ row: rowNum, field: 'to_classroom_code', code: 'CLASSROOM_NOT_FOUND', message: `To classroom '${row.to_classroom_code}' not found` });
        continue;
      }

      if (!['promoted', 'repeated', 'dropped'].includes(row.outcome.toLowerCase())) {
        errors.push({ row: rowNum, field: 'outcome', code: 'INVALID_OUTCOME', message: `Outcome must be 'promoted', 'repeated', or 'dropped'` });
        continue;
      }

      const existing = await db.prepare(`SELECT id FROM promotion_items WHERE promotion_batch_id = ? AND student_id = ?`).bind(promotionBatchId, student.user_id).first<{ id: string }>();
      if (existing) {
        warnings.push({ row: rowNum, code: 'DUPLICATE_STUDENT', message: `Student '${row.student_admission_number}' already exists in promotion batch` });
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        errors.push({ row: rowNum, code: 'VALIDATION_ERROR', message: error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ') });
      } else {
        errors.push({ row: rowNum, code: 'UNKNOWN_ERROR', message: error instanceof Error ? error.message : 'Unknown error' });
      }
    }
  }
}

async function commitPromotionImport(
  db: D1Database,
  rows: unknown[],
  tenant: TenantContext,
  options?: Record<string, unknown>
): Promise<ImportCommitResult> {
  let rowsCreated = 0;
  let rowsSkipped = 0;

  const promotionBatchId = options?.promotion_batch_id as string;

  for (const rowData of rows) {
    try {
      const row = rowData as PromotionImportRow;

      const student = await db.prepare(`SELECT user_id FROM student_profiles WHERE school_id = ? AND admission_number = ?`).bind(tenant.schoolId, row.student_admission_number).first<{ user_id: string }>();
      const fromClassroom = await db.prepare(`SELECT id FROM classrooms WHERE school_id = ? AND code = ?`).bind(tenant.schoolId, row.from_classroom_code).first<{ id: string }>();
      const toClassroom = await db.prepare(`SELECT id FROM classrooms WHERE school_id = ? AND code = ?`).bind(tenant.schoolId, row.to_classroom_code).first<{ id: string }>();

      if (!student || !fromClassroom || !toClassroom) { rowsSkipped++; continue; }

      const existing = await db.prepare(`SELECT id FROM promotion_items WHERE promotion_batch_id = ? AND student_id = ?`).bind(promotionBatchId, student.user_id).first<{ id: string }>();
      if (existing) { rowsSkipped++; continue; }

      await db.prepare(`
        INSERT INTO promotion_items (id, promotion_batch_id, student_id, from_classroom_id, to_classroom_id, outcome, remarks, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(crypto.randomUUID(), promotionBatchId, student.user_id, fromClassroom.id, toClassroom.id, row.outcome.toLowerCase(), row.remarks || null, Date.now()).run();

      rowsCreated++;
    } catch (error) {
      rowsSkipped++;
      console.error('Failed to import promotion item:', error);
    }
  }

  return { import_id: '', success: true, rows_created: rowsCreated, rows_updated: 0, rows_skipped: rowsSkipped, message: `Created ${rowsCreated} promotion item(s), skipped ${rowsSkipped}.` };
}
