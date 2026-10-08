/**
 * Assignments Service
 * 
 * Business logic for assignments and attachments management
 */

import type { D1Database, R2Bucket } from '@cloudflare/workers-types';
import type { TenantContext } from '../auth/auth.types';
import type {
  Assignment,
  AssignmentWithDetails,
  CreateAssignmentRequest,
  UpdateAssignmentRequest,
  AssignmentListFilters,
  AssignmentAttachment,
  AssignmentAttachmentResponse,
  StudentAssignmentResponse,
} from './assignments.types';
import { AssignmentsError } from './assignments.errors';
import * as assignmentsRepo from './assignments.repository';
import * as assignmentsAuthz from './assignments.authorization';
import * as r2Utils from './assignments.r2';
import {
  isAllowedContentType,
  MAX_ATTACHMENT_SIZE_BYTES,
  sanitizeFilename,
} from './assignments.validation';
import { logAudit } from '../lib/audit/audit.service';

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
      name: string;
      section: string;
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
      subject_code: string;
      name: string;
      status: string;
    }>();

  return result;
}

/**
 * Create assignment
 */
export async function createAssignment(
  db: D1Database,
  tenant: TenantContext,
  request: CreateAssignmentRequest
): Promise<Assignment> {
  // Validate classroom
  const classroom = await getClassroom(db, request.classroom_id, tenant.schoolId);
  if (!classroom) {
    throw AssignmentsError.invalidClassroom();
  }

  // Validate subject
  const subject = await getSubject(db, request.subject_id, tenant.schoolId);
  if (!subject) {
    throw AssignmentsError.invalidSubject();
  }

  // Authorization check
  await assignmentsAuthz.ensureCanCreateAssignment(
    db,
    tenant,
    request.classroom_id,
    request.subject_id
  );

  // Create assignment
  const assignment = await assignmentsRepo.createAssignment(db, {
    id: generateId(),
    school_id: tenant.schoolId,
    academic_year_id: classroom.academic_year_id,
    classroom_id: request.classroom_id,
    subject_id: request.subject_id,
    created_by: tenant.userId,
    title: request.title,
    description: request.description || null,
    due_at: request.due_at || null,
  });

  // Audit log
  await logAudit(db, tenant, 'assignment_created', 'assignment', assignment.id, null, {
    classroom_id: assignment.classroom_id,
    subject_id: assignment.subject_id,
    title: assignment.title,
  });

  return assignment;
}

/**
 * Get assignment by ID
 */
export async function getAssignmentById(
  db: D1Database,
  id: string,
  tenant: TenantContext
): Promise<AssignmentWithDetails> {
  const assignment = await assignmentsRepo.findAssignmentWithDetails(db, id, tenant.schoolId);

  if (!assignment) {
    throw AssignmentsError.assignmentNotFound(id);
  }

  // Authorization check
  await assignmentsAuthz.ensureCanViewAssignment(db, tenant, assignment);

  return assignment;
}

/**
 * List assignments
 */
export async function listAssignments(
  db: D1Database,
  tenant: TenantContext,
  filters: AssignmentListFilters = {}
): Promise<AssignmentWithDetails[]> {
  // For students, only show published assignments for their classroom
  if (tenant.role === 'student') {
    // Get student's current enrollment
    const enrollment = await db
      .prepare(
        `SELECT classroom_id, academic_year_id
         FROM enrollments
         WHERE student_id = ?
           AND school_id = ?
           AND status = 'active'
         LIMIT 1`
      )
      .bind(tenant.userId, tenant.schoolId)
      .first<{ classroom_id: string; academic_year_id: string }>();

    if (!enrollment) {
      return [];
    }

    filters.classroom_id = enrollment.classroom_id;
    filters.academic_year_id = enrollment.academic_year_id;
    filters.status = 'published';
  }

  const assignments = await assignmentsRepo.findAssignments(db, tenant.schoolId, filters);

  // Filter by authorization for teachers
  if (tenant.role === 'teacher') {
    const authorized: AssignmentWithDetails[] = [];

    for (const assignment of assignments) {
      const canView = await assignmentsAuthz.canViewAssignment(db, tenant, assignment);
      if (canView) {
        authorized.push(assignment);
      }
    }

    return authorized;
  }

  return assignments;
}

/**
 * Update assignment
 */
export async function updateAssignment(
  db: D1Database,
  id: string,
  tenant: TenantContext,
  request: UpdateAssignmentRequest
): Promise<void> {
  const assignment = await assignmentsRepo.findAssignmentById(db, id, tenant.schoolId);

  if (!assignment) {
    throw AssignmentsError.assignmentNotFound(id);
  }

  // Authorization check
  await assignmentsAuthz.ensureCanModifyAssignment(db, tenant, assignment);

  // Update assignment
  await assignmentsRepo.updateAssignment(db, id, tenant.schoolId, request);

  // Audit log
  await logAudit(db, tenant, 'assignment_updated', 'assignment', id, null, request);
}

/**
 * Publish assignment
 */
export async function publishAssignment(
  db: D1Database,
  id: string,
  tenant: TenantContext
): Promise<void> {
  const assignment = await assignmentsRepo.findAssignmentById(db, id, tenant.schoolId);

  if (!assignment) {
    throw AssignmentsError.assignmentNotFound(id);
  }

  if (assignment.status === 'published') {
    throw AssignmentsError.alreadyPublished();
  }

  if (assignment.status === 'closed') {
    throw AssignmentsError.invalidStatusTransition(assignment.status, 'published');
  }

  // Authorization check
  const canPublish = await assignmentsAuthz.canPublishAssignment(db, tenant, assignment);
  if (!canPublish) {
    throw AssignmentsError.notAuthorized('Cannot publish this assignment');
  }

  // Publish
  await assignmentsRepo.updateAssignmentStatus(db, id, tenant.schoolId, 'published');

  // Audit log
  await logAudit(db, tenant, 'assignment_published', 'assignment', id, null, { title: assignment.title });
}

/**
 * Close assignment
 */
export async function closeAssignment(
  db: D1Database,
  id: string,
  tenant: TenantContext
): Promise<void> {
  const assignment = await assignmentsRepo.findAssignmentById(db, id, tenant.schoolId);

  if (!assignment) {
    throw AssignmentsError.assignmentNotFound(id);
  }

  if (assignment.status === 'closed') {
    throw AssignmentsError.alreadyClosed();
  }

  if (assignment.status === 'draft') {
    throw AssignmentsError.invalidStatusTransition(assignment.status, 'closed');
  }

  // Authorization check
  const canClose = await assignmentsAuthz.canCloseAssignment(db, tenant, assignment);
  if (!canClose) {
    throw AssignmentsError.notAuthorized('Cannot close this assignment');
  }

  // Close
  await assignmentsRepo.updateAssignmentStatus(db, id, tenant.schoolId, 'closed');

  // Audit log
  await logAudit(db, tenant, 'assignment_closed', 'assignment', id, null, { title: assignment.title });
}

/**
 * Upload attachment
 */
export async function uploadAttachment(
  db: D1Database,
  bucket: R2Bucket,
  assignmentId: string,
  tenant: TenantContext,
  file: ArrayBuffer,
  fileName: string,
  contentType: string | null
): Promise<AssignmentAttachmentResponse> {
  // Get assignment
  const assignment = await assignmentsRepo.findAssignmentById(db, assignmentId, tenant.schoolId);

  if (!assignment) {
    throw AssignmentsError.assignmentNotFound(assignmentId);
  }

  // Authorization check
  const canManage = await assignmentsAuthz.canManageAttachments(db, tenant, assignment);
  if (!canManage) {
    throw AssignmentsError.notAuthorized('Cannot manage attachments for this assignment');
  }

  // Validate file size
  if (file.byteLength > MAX_ATTACHMENT_SIZE_BYTES) {
    throw AssignmentsError.attachmentTooLarge(MAX_ATTACHMENT_SIZE_BYTES);
  }

  // Validate content type
  if (contentType && !isAllowedContentType(contentType)) {
    throw AssignmentsError.unsupportedAttachmentType(contentType);
  }

  // Generate R2 key
  const r2Key = r2Utils.generateAttachmentKey(tenant.schoolId, assignmentId, fileName);

  try {
    // Upload to R2
    await r2Utils.uploadToR2(bucket, r2Key, file, {
      contentType: contentType || undefined,
      customMetadata: {
        assignmentId,
        schoolId: tenant.schoolId,
        uploadedBy: tenant.userId,
      },
    });

    // Create metadata record
    const attachment = await assignmentsRepo.createAttachment(db, {
      id: generateId(),
      assignment_id: assignmentId,
      file_name: sanitizeFilename(fileName),
      r2_key: r2Key,
      content_type: contentType,
      size_bytes: file.byteLength,
      uploaded_by: tenant.userId,
    });

    // Audit log
    await logAudit(db, tenant, 'assignment_attachment_added', 'assignment', assignmentId, null, {
      attachment_id: attachment.id,
      file_name: attachment.file_name,
    });

    // Return response without r2_key
    return {
      id: attachment.id,
      file_name: attachment.file_name,
      content_type: attachment.content_type,
      size_bytes: attachment.size_bytes,
      created_at: attachment.created_at,
    };
  } catch (error) {
    // Attempt cleanup if metadata creation failed
    try {
      await r2Utils.deleteFromR2(bucket, r2Key);
    } catch (cleanupError) {
      console.error('Failed to cleanup R2 object after error:', cleanupError);
    }

    throw AssignmentsError.attachmentStorageError(
      error instanceof Error ? error.message : 'Upload failed'
    );
  }
}

/**
 * Get attachments for assignment
 */
export async function getAttachments(
  db: D1Database,
  assignmentId: string,
  tenant: TenantContext
): Promise<AssignmentAttachmentResponse[]> {
  const assignment = await assignmentsRepo.findAssignmentById(db, assignmentId, tenant.schoolId);

  if (!assignment) {
    throw AssignmentsError.assignmentNotFound(assignmentId);
  }

  // Authorization check
  await assignmentsAuthz.ensureCanViewAssignment(db, tenant, assignment);

  const attachments = await assignmentsRepo.findAttachmentsByAssignment(db, assignmentId);

  // Return without r2_key
  return attachments.map(a => ({
    id: a.id,
    file_name: a.file_name,
    content_type: a.content_type,
    size_bytes: a.size_bytes,
    created_at: a.created_at,
  }));
}

/**
 * Download attachment
 */
export async function downloadAttachment(
  db: D1Database,
  bucket: R2Bucket,
  assignmentId: string,
  attachmentId: string,
  tenant: TenantContext
): Promise<{ object: R2ObjectBody; fileName: string; contentType: string | null }> {
  // Get assignment
  const assignment = await assignmentsRepo.findAssignmentById(db, assignmentId, tenant.schoolId);

  if (!assignment) {
    throw AssignmentsError.assignmentNotFound(assignmentId);
  }

  // Authorization check
  await assignmentsAuthz.ensureCanViewAssignment(db, tenant, assignment);

  // Get attachment metadata
  const attachment = await assignmentsRepo.findAttachmentById(db, attachmentId, assignmentId);

  if (!attachment) {
    throw AssignmentsError.attachmentNotFound(attachmentId);
  }

  // Download from R2 using trusted r2_key
  const object = await r2Utils.downloadFromR2(bucket, attachment.r2_key);

  if (!object) {
    throw AssignmentsError.attachmentStorageError('File not found in storage');
  }

  return {
    object,
    fileName: attachment.file_name,
    contentType: attachment.content_type,
  };
}

/**
 * Delete attachment
 */
export async function deleteAttachment(
  db: D1Database,
  bucket: R2Bucket,
  assignmentId: string,
  attachmentId: string,
  tenant: TenantContext
): Promise<void> {
  // Get assignment
  const assignment = await assignmentsRepo.findAssignmentById(db, assignmentId, tenant.schoolId);

  if (!assignment) {
    throw AssignmentsError.assignmentNotFound(assignmentId);
  }

  // Authorization check
  const canManage = await assignmentsAuthz.canManageAttachments(db, tenant, assignment);
  if (!canManage) {
    throw AssignmentsError.notAuthorized('Cannot manage attachments for this assignment');
  }

  // Get attachment metadata
  const attachment = await assignmentsRepo.findAttachmentById(db, attachmentId, assignmentId);

  if (!attachment) {
    throw AssignmentsError.attachmentNotFound(attachmentId);
  }

  try {
    // Delete from R2
    await r2Utils.deleteFromR2(bucket, attachment.r2_key);

    // Delete metadata
    await assignmentsRepo.deleteAttachment(db, attachmentId, assignmentId);

    // Audit log
    await logAudit(db, tenant, 'assignment_attachment_deleted', 'assignment', assignmentId, null, {
      attachment_id: attachmentId,
      file_name: attachment.file_name,
    });
  } catch (error) {
    throw AssignmentsError.attachmentStorageError(
      error instanceof Error ? error.message : 'Deletion failed'
    );
  }
}

/**
 * Get student's assignments (self-service)
 */
export async function getMyAssignments(
  db: D1Database,
  tenant: TenantContext
): Promise<StudentAssignmentResponse[]> {
  // Only students can use this endpoint
  if (tenant.role !== 'student') {
    throw AssignmentsError.notAuthorized('This endpoint is only for students');
  }

  // Get student's current enrollment
  const enrollment = await db
    .prepare(
      `SELECT classroom_id, academic_year_id
       FROM enrollments
       WHERE student_id = ?
         AND school_id = ?
         AND status = 'active'
       LIMIT 1`
    )
    .bind(tenant.userId, tenant.schoolId)
    .first<{ classroom_id: string; academic_year_id: string }>();

  if (!enrollment) {
    return [];
  }

  // Get published assignments for classroom
  const assignments = await db
    .prepare(
      `SELECT 
        a.id,
        s.name as subject_name,
        a.title,
        a.description,
        a.due_at,
        a.created_at
       FROM assignments a
       INNER JOIN subjects s ON a.subject_id = s.id
       WHERE a.school_id = ?
         AND a.classroom_id = ?
         AND a.academic_year_id = ?
         AND a.status = 'published'
       ORDER BY a.due_at ASC NULLS LAST, a.created_at DESC`
    )
    .bind(tenant.schoolId, enrollment.classroom_id, enrollment.academic_year_id)
    .all<any>();

  const result: StudentAssignmentResponse[] = [];

  for (const assignment of assignments.results || []) {
    // Get attachments
    const attachments = await assignmentsRepo.findAttachmentsByAssignment(db, assignment.id);

    result.push({
      id: assignment.id,
      subject_name: assignment.subject_name,
      title: assignment.title,
      description: assignment.description,
      due_at: assignment.due_at,
      created_at: assignment.created_at,
      attachments: attachments.map(a => ({
        id: a.id,
        file_name: a.file_name,
        content_type: a.content_type,
        size_bytes: a.size_bytes,
        created_at: a.created_at,
      })),
    });
  }

  return result;
}
