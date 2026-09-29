/**
 * Marks & Assessments Service
 * 
 * Business logic for assessments and marks management
 */

import type { D1Database } from '@cloudflare/workers-types';
import type { TenantContext } from '../auth/auth.types';
import type {
  Assessment,
  AssessmentWithDetails,
  CreateAssessmentRequest,
  UpdateAssessmentRequest,
  BulkMarksRequest,
  MarkWithStudent,
  StudentAssessmentSummary,
  SubjectMarksSummary,
  ClassroomReportEntry,
  MyMarksResponse,
} from './marks.types';
import { MarksError } from './marks.errors';
import * as marksRepo from './marks.repository';
import * as marksAuthz from './marks.authorization';
import * as marksGrading from './marks.grading';
import { logAudit } from '../lib/audit/audit.service';
import { findActiveByStudent } from '../academic/enrollment.repository';

/**
 * Generate unique ID
 */
function generateId(): string {
  return crypto.randomUUID();
}

/**
 * Get classroom details
 */
async function getClassroom(
  db: D1Database,
  classroomId: string,
  schoolId: string
) {
  const result = await db
    .prepare(
      `SELECT id, school_id, academic_year_id, grade_name, division_name, class_teacher_id
       FROM classrooms
       WHERE id = ?
         AND school_id = ?
       LIMIT 1`
    )
    .bind(classroomId, schoolId)
    .first<{
      id: string;
      school_id: string;
      academic_year_id: string;
      grade_name: string;
      division_name: string;
      class_teacher_id: string | null;
    }>();

  return result;
}

/**
 * Get subject details
 */
async function getSubject(
  db: D1Database,
  subjectId: string,
  schoolId: string
) {
  const result = await db
    .prepare(
      `SELECT id, school_id, subject_code, name, status
       FROM subjects
       WHERE id = ?
         AND school_id = ?
       LIMIT 1`
    )
    .bind(subjectId, schoolId)
    .first<{
      id: string;
      school_id: string;
      code: string;
      name: string;
      status: string;
    }>();

  return result;
}

/**
 * Get academic year details
 */
async function getAcademicYear(
  db: D1Database,
  academicYearId: string,
  schoolId: string
) {
  const result = await db
    .prepare(
      `SELECT id, school_id, label, starts_on, ends_on, status
       FROM academic_years
       WHERE id = ?
         AND school_id = ?
       LIMIT 1`
    )
    .bind(academicYearId, schoolId)
    .first<{
      id: string;
      school_id: string;
      label: string;
      starts_on: string;
      ends_on: string;
      status: string;
    }>();

  return result;
}

/**
 * Create assessment
 */
export async function createAssessment(
  db: D1Database,
  tenant: TenantContext,
  request: CreateAssessmentRequest
): Promise<Assessment> {
  // Validate classroom
  const classroom = await getClassroom(db, request.classroom_id, tenant.schoolId);
  if (!classroom) {
    throw MarksError.invalidClassroom();
  }

  // Validate subject
  const subject = await getSubject(db, request.subject_id, tenant.schoolId);
  if (!subject) {
    throw MarksError.invalidSubject();
  }

  // Validate academic year
  const academicYear = await getAcademicYear(db, classroom.academic_year_id, tenant.schoolId);
  if (!academicYear) {
    throw new Error('Academic year not found');
  }

  // Check academic year status
  if (academicYear.status === 'closed' && tenant.role !== 'principal') {
    throw MarksError.academicYearClosed();
  }

  // Authorization check
  await marksAuthz.ensureCanCreateAssessment(
    db,
    tenant,
    request.classroom_id,
    request.subject_id
  );

  // Check for duplicate
  const exists = await marksRepo.assessmentExists(
    db,
    request.classroom_id,
    request.subject_id,
    request.name,
    tenant.schoolId
  );

  if (exists) {
    throw MarksError.assessmentDuplicate();
  }

  // Create assessment
  const assessment = await marksRepo.createAssessment(db, {
    id: generateId(),
    school_id: tenant.schoolId,
    academic_year_id: classroom.academic_year_id,
    classroom_id: request.classroom_id,
    subject_id: request.subject_id,
    name: request.name,
    max_marks: request.max_marks,
    weightage: request.weightage ?? null,
    held_on: request.held_on ?? null,
    created_by: tenant.userId,
  });

  // Audit log
  await logAudit(db, tenant, 'assessment_created', 'assessment', assessment.id, null, {
    classroom_id: assessment.classroom_id,
    subject_id: assessment.subject_id,
    name: assessment.name,
    max_marks: assessment.max_marks,
  });

  return assessment;
}

/**
 * Get assessment by ID
 */
export async function getAssessmentById(
  db: D1Database,
  id: string,
  tenant: TenantContext
): Promise<AssessmentWithDetails> {
  const assessment = await marksRepo.findAssessmentWithDetails(db, id, tenant.schoolId);

  if (!assessment) {
    throw MarksError.assessmentNotFound(id);
  }

  // Authorization check
  await marksAuthz.ensureCanViewAssessment(db, tenant, assessment);

  return assessment;
}

/**
 * List assessments
 */
export async function listAssessments(
  db: D1Database,
  tenant: TenantContext,
  filters: {
    academic_year_id?: string;
    classroom_id?: string;
    subject_id?: string;
    is_published?: boolean;
  } = {}
): Promise<AssessmentWithDetails[]> {
  // For students, only show published assessments
  if (tenant.role === 'student') {
    filters.is_published = true;
  }

  const assessments = await marksRepo.findAssessments(db, tenant.schoolId, filters);

  // Filter by authorization
  const authorized: AssessmentWithDetails[] = [];

  for (const assessment of assessments) {
    // Allow creator to always see their own assessments
    if (assessment.created_by === tenant.userId) {
      authorized.push(assessment);
      continue;
    }
    
    const canView = await marksAuthz.canViewAssessment(db, tenant, assessment);
    if (canView) {
      authorized.push(assessment);
    }
  }

  return authorized;
}

/**
 * Update assessment
 */
export async function updateAssessment(
  db: D1Database,
  id: string,
  tenant: TenantContext,
  request: UpdateAssessmentRequest
): Promise<void> {
  const assessment = await marksRepo.findAssessmentById(db, id, tenant.schoolId);

  if (!assessment) {
    throw MarksError.assessmentNotFound(id);
  }

  // Authorization check
  const { isPrincipalOverride } = await marksAuthz.ensureCanModifyAssessment(
    db,
    tenant,
    assessment
  );

  // Check for duplicate name if name is being updated
  if (request.name && request.name !== assessment.name) {
    const exists = await marksRepo.assessmentExists(
      db,
      assessment.classroom_id,
      assessment.subject_id,
      request.name,
      tenant.schoolId,
      id
    );

    if (exists) {
      throw MarksError.assessmentDuplicate();
    }
  }

  // Update assessment
  await marksRepo.updateAssessment(db, id, tenant.schoolId, request);

  // Audit log
  await logAudit(db, tenant, isPrincipalOverride ? 'assessment_updated_override' : 'assessment_updated', 'assessment', id, null, request);
}

/**
 * Publish assessment
 */
export async function publishAssessment(
  db: D1Database,
  id: string,
  tenant: TenantContext
): Promise<void> {
  const assessment = await marksRepo.findAssessmentById(db, id, tenant.schoolId);

  if (!assessment) {
    throw MarksError.assessmentNotFound(id);
  }

  // Check if already published
  if (assessment.is_published) {
    throw MarksError.assessmentAlreadyPublished();
  }

  // Authorization check
  const canPublish = await marksAuthz.canPublishAssessment(db, tenant, assessment);
  if (!canPublish) {
    throw MarksError.notAuthorized('Cannot publish this assessment');
  }

  // Publish
  await marksRepo.publishAssessment(db, id, tenant.schoolId);

  // Audit log
  await logAudit(db, tenant, 'assessment_published', 'assessment', id, null, { assessment_name: assessment.name });
}

/**
 * Lock assessment
 */
export async function lockAssessment(
  db: D1Database,
  id: string,
  tenant: TenantContext
): Promise<void> {
  const assessment = await marksRepo.findAssessmentById(db, id, tenant.schoolId);

  if (!assessment) {
    throw MarksError.assessmentNotFound(id);
  }

  // Check if already locked
  if (assessment.is_locked) {
    return; // Idempotent
  }

  // Authorization check
  const canLock = await marksAuthz.canLockAssessment(db, tenant, assessment);
  if (!canLock) {
    throw MarksError.notAuthorized('Cannot lock this assessment');
  }

  // Lock
  await marksRepo.lockAssessment(db, id, tenant.schoolId);

  // Audit log
  await logAudit(db, tenant, 'assessment_locked', 'assessment', id, null, { assessment_name: assessment.name });
}

/**
 * Unlock assessment
 */
export async function unlockAssessment(
  db: D1Database,
  id: string,
  tenant: TenantContext
): Promise<void> {
  const assessment = await marksRepo.findAssessmentById(db, id, tenant.schoolId);

  if (!assessment) {
    throw MarksError.assessmentNotFound(id);
  }

  // Authorization check (Principal only)
  const canUnlock = await marksAuthz.canUnlockAssessment(db, tenant, assessment);
  if (!canUnlock) {
    throw MarksError.notAuthorized('Only principal can unlock assessments');
  }

  // Unlock
  await marksRepo.unlockAssessment(db, id, tenant.schoolId);

  // Audit log
  await logAudit(db, tenant, 'assessment_unlocked', 'assessment', id, null, { assessment_name: assessment.name });
}

/**
 * Bulk marks entry
 */
export async function enterMarks(
  db: D1Database,
  assessmentId: string,
  tenant: TenantContext,
  request: BulkMarksRequest
): Promise<{ updated: number }> {
  // Get assessment
  const assessment = await marksRepo.findAssessmentById(db, assessmentId, tenant.schoolId);

  if (!assessment) {
    throw MarksError.assessmentNotFound(assessmentId);
  }

  // Authorization check
  const { isPrincipalOverride } = await marksAuthz.ensureCanModifyAssessment(
    db,
    tenant,
    assessment
  );

  // Validate all entries before any database writes
  const validatedEntries: Array<{
    student_id: string;
    enrollment_id: string;
    status: string;
    marks_obtained: number | null;
  }> = [];

  for (const entry of request.entries) {
    // Validate marks bounds for graded status
    if (entry.status === 'graded') {
      if (entry.marks_obtained === null) {
        throw MarksError.marksRequiredForGraded();
      }

      if (entry.marks_obtained < 0) {
        throw new Error('Marks cannot be negative');
      }

      if (entry.marks_obtained > assessment.max_marks) {
        throw MarksError.marksOverMax(assessment.max_marks);
      }
    }

    // Validate marks are null for absent/exempt
    if (entry.status === 'absent' && entry.marks_obtained !== null) {
      throw MarksError.marksMustBeNullForAbsent();
    }

    if (entry.status === 'exempt' && entry.marks_obtained !== null) {
      throw MarksError.marksMustBeNullForExempt();
    }

    // Find active enrollment for student
    const enrollments = await findActiveByStudent(
      db,
      entry.student_id,
      tenant.schoolId
    );

    const validEnrollment = enrollments.find(
      (e: any) =>
        e.classroom_id === assessment.classroom_id &&
        e.academic_year_id === assessment.academic_year_id
    );

    if (!validEnrollment) {
      throw MarksError.invalidEnrollment();
    }

    validatedEntries.push({
      student_id: entry.student_id,
      enrollment_id: validEnrollment.id,
      status: entry.status,
      marks_obtained: entry.marks_obtained,
    });
  }

  // Prepare batch statements for D1
  const now = Date.now();
  const statements = validatedEntries.map(entry =>
    db
      .prepare(
        `INSERT INTO marks (assessment_id, student_id, enrollment_id, marks_obtained, status, updated_by, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(assessment_id, student_id) DO UPDATE SET
           marks_obtained = excluded.marks_obtained,
           status = excluded.status,
           updated_by = excluded.updated_by,
           updated_at = excluded.updated_at`
      )
      .bind(
        assessmentId,
        entry.student_id,
        entry.enrollment_id,
        entry.marks_obtained,
        entry.status,
        tenant.userId,
        now
      )
  );

  // Execute batch
  await db.batch(statements);

  // Audit log
  await logAudit(db, tenant, isPrincipalOverride ? 'marks_entered_override' : 'marks_entered', 'marks', assessmentId, null, {
    assessment_id: assessmentId,
    entries_count: validatedEntries.length,
  });

  return { updated: validatedEntries.length };
}

/**
 * Get marks for assessment
 */
export async function getAssessmentMarks(
  db: D1Database,
  assessmentId: string,
  tenant: TenantContext
): Promise<MarkWithStudent[]> {
  const assessment = await marksRepo.findAssessmentById(db, assessmentId, tenant.schoolId);

  if (!assessment) {
    throw MarksError.assessmentNotFound(assessmentId);
  }

  // Authorization check
  await marksAuthz.ensureCanViewAssessment(db, tenant, assessment);

  const marks = await marksRepo.findMarksByAssessment(db, assessmentId, tenant.schoolId);

  return marks;
}

/**
 * Get student marks summary
 */
export async function getStudentSummary(
  db: D1Database,
  studentId: string,
  tenant: TenantContext,
  filters: {
    academic_year_id?: string;
    classroom_id?: string;
    subject_id?: string;
  } = {}
): Promise<StudentAssessmentSummary[]> {
  // Authorization check
  const canView = await marksAuthz.canViewStudentMarks(
    db,
    tenant,
    studentId,
    filters.classroom_id
  );

  if (!canView) {
    throw MarksError.notAuthorized('Cannot view this student\'s marks');
  }

  // Students can only see published assessments
  const publishedOnly = tenant.role === 'student';

  const marks = await marksRepo.findStudentMarks(db, studentId, tenant.schoolId, {
    ...filters,
    published_only: publishedOnly,
  });

  return marks;
}

/**
 * Get student subject-wise marks
 */
export async function getStudentSubjectWise(
  db: D1Database,
  studentId: string,
  tenant: TenantContext,
  filters: {
    academic_year_id?: string;
    classroom_id?: string;
  } = {}
): Promise<SubjectMarksSummary[]> {
  // Authorization check
  const canView = await marksAuthz.canViewStudentMarks(
    db,
    tenant,
    studentId,
    filters.classroom_id
  );

  if (!canView) {
    throw MarksError.notAuthorized('Cannot view this student\'s marks');
  }

  // Students can only see published assessments
  const publishedOnly = tenant.role === 'student';

  const marks = await marksRepo.findStudentMarks(db, studentId, tenant.schoolId, {
    ...filters,
    published_only: publishedOnly,
  });

  // Group by subject
  const subjectMap = new Map<string, SubjectMarksSummary>();

  for (const mark of marks) {
    if (!subjectMap.has(mark.subject_id)) {
      subjectMap.set(mark.subject_id, {
        subject_id: mark.subject_id,
        subject_name: mark.subject_name,
        assessments: [],
        total_weighted: null,
        total_weightage: null,
      });
    }

    const subject = subjectMap.get(mark.subject_id)!;

    const weightedContribution = marksGrading.calculateWeightedContribution(
      mark.marks_obtained,
      mark.max_marks,
      mark.weightage,
      mark.status
    );

    subject.assessments.push({
      assessment_id: mark.assessment_id,
      assessment_name: mark.assessment_name,
      max_marks: mark.max_marks,
      weightage: mark.weightage,
      marks_obtained: mark.marks_obtained,
      status: mark.status,
      held_on: mark.held_on,
      weighted_contribution: weightedContribution,
    });
  }

  // Calculate aggregates for each subject
  const results: SubjectMarksSummary[] = [];

  for (const subject of subjectMap.values()) {
    const aggregate = marksGrading.calculateAggregateWeighted(
      subject.assessments.map(a => ({
        marks_obtained: a.marks_obtained,
        status: a.status,
        max_marks: a.max_marks,
        weightage: a.weightage,
      }))
    );

    subject.total_weighted = aggregate.total_weighted;
    subject.total_weightage = aggregate.total_weightage;

    results.push(subject);
  }

  return results;
}

/**
 * Get classroom marks report
 */
export async function getClassroomReport(
  db: D1Database,
  classroomId: string,
  tenant: TenantContext,
  filters: {
    subject_id?: string;
    assessment_id?: string;
  } = {}
): Promise<ClassroomReportEntry[]> {
  // Validate classroom
  const classroom = await getClassroom(db, classroomId, tenant.schoolId);
  if (!classroom) {
    throw MarksError.invalidClassroom();
  }

  // Authorization: Principal, class teacher, or teacher with assignment in this classroom
  if (tenant.role !== 'principal') {
    // Check if user can view this classroom's marks
    const canView = await marksAuthz.canViewStudentMarks(db, tenant, '', classroomId);
    if (!canView) {
      throw MarksError.notAuthorized('Cannot view marks for this classroom');
    }
  }

  const rawData = await marksRepo.getClassroomMarksReport(
    db,
    classroomId,
    tenant.schoolId,
    filters
  );

  // Group by student
  const studentMap = new Map<string, ClassroomReportEntry>();

  for (const row of rawData) {
    if (!studentMap.has(row.student_id)) {
      studentMap.set(row.student_id, {
        student_id: row.student_id,
        student_code: row.student_code,
        student_name: row.student_name,
        roll_number: row.roll_number,
        marks: [],
      });
    }

    const student = studentMap.get(row.student_id)!;

    student.marks.push({
      assessment_id: row.assessment_id,
      assessment_name: row.assessment_name,
      max_marks: row.max_marks,
      marks_obtained: row.marks_obtained,
      status: row.status || 'absent', // Default to absent if no mark entered
    });
  }

  return Array.from(studentMap.values());
}

/**
 * Get student's own marks (self-service)
 */
export async function getMyMarks(
  db: D1Database,
  tenant: TenantContext
): Promise<MyMarksResponse> {
  // Only students can use this endpoint
  if (tenant.role !== 'student') {
    throw MarksError.notAuthorized('This endpoint is only for students');
  }

  // Get current academic year
  const currentYear = await db
    .prepare(
      `SELECT id
       FROM academic_years
       WHERE school_id = ?
         AND status = 'active'
       ORDER BY starts_on DESC
       LIMIT 1`
    )
    .bind(tenant.schoolId)
    .first<{ id: string }>();

  const filters = currentYear ? { academic_year_id: currentYear.id } : {};

  const summary = await getStudentSummary(db, tenant.userId, tenant, filters);
  const subject_wise = await getStudentSubjectWise(db, tenant.userId, tenant, filters);

  return {
    summary,
    subject_wise,
  };
}
