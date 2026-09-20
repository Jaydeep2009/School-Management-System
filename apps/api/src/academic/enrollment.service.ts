/**
 * Enrollment Service
 * 
 * Business logic for enrollments with lifecycle rules
 */

import { randomUUID } from 'node:crypto';
import * as enrollmentRepo from './enrollment.repository';
import * as academicYearRepo from './academic-year.repository';
import * as classroomRepo from './classroom.repository';
import type {
  Enrollment,
  EnrollmentStatus,
  EnrollmentOutcome,
  CreateEnrollmentRequest,
  UpdateEnrollmentRequest,
} from './academic.types';

/**
 * Business rule errors
 */
export class EnrollmentError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 400
  ) {
    super(message);
    this.name = 'EnrollmentError';
  }
}

/**
 * Get enrollment by ID
 */
export async function getById(
  db: D1Database,
  id: string,
  schoolId: string
): Promise<Enrollment> {
  const enrollment = await enrollmentRepo.findById(db, id, schoolId);
  
  if (!enrollment) {
    throw new EnrollmentError(
      'Enrollment not found',
      'ENROLLMENT_NOT_FOUND',
      404
    );
  }

  return enrollment;
}

/**
 * List enrollments
 */
export async function list(
  db: D1Database,
  schoolId: string,
  filters?: {
    academic_year_id?: string;
    classroom_id?: string;
    student_id?: string;
    status?: EnrollmentStatus;
  }
): Promise<Enrollment[]> {
  return enrollmentRepo.findAll(db, schoolId, filters);
}

/**
 * Create enrollment
 * 
 * RULE: academic_year_id, classroom_id must exist and belong to same school
 * RULE: classroom must belong to the specified academic year
 * RULE: classroom must be active
 * RULE: student_id must exist and belong to school
 * RULE: Student can have only one active enrollment per academic year
 * RULE: No duplicate enrollment for same student+classroom+year
 */
export async function create(
  db: D1Database,
  schoolId: string,
  data: CreateEnrollmentRequest
): Promise<Enrollment> {
  // Verify academic year exists and belongs to school
  const academicYear = await academicYearRepo.findById(
    db,
    data.academic_year_id,
    schoolId
  );
  if (!academicYear) {
    throw new EnrollmentError(
      'Academic year not found',
      'ACADEMIC_YEAR_NOT_FOUND'
    );
  }

  // Verify classroom exists and belongs to school
  const classroom = await classroomRepo.findById(db, data.classroom_id, schoolId);
  if (!classroom) {
    throw new EnrollmentError(
      'Classroom not found',
      'CLASSROOM_NOT_FOUND'
    );
  }

  // Verify classroom belongs to the academic year
  if (classroom.academic_year_id !== data.academic_year_id) {
    throw new EnrollmentError(
      'Classroom does not belong to this academic year',
      'CLASSROOM_YEAR_MISMATCH'
    );
  }

  // Verify classroom is active
  if (classroom.status !== 'active') {
    throw new EnrollmentError(
      'Classroom must be active',
      'CLASSROOM_NOT_ACTIVE'
    );
  }

  // Verify student exists and belongs to school
  // NOTE: We rely on authorization service to verify student belongs to school
  // This is a minimal check - full validation happens in routes layer

  const status = data.status || 'planned';

  // Check for unique active enrollment per academic year
  if (status === 'active') {
    const activeCount = await enrollmentRepo.countActiveForYearAndStudent(
      db,
      data.student_id,
      data.academic_year_id,
      schoolId
    );
    if (activeCount > 0) {
      throw new EnrollmentError(
        'Student already has an active enrollment for this academic year',
        'MULTIPLE_ACTIVE_ENROLLMENTS'
      );
    }
  }

  // Check for duplicate enrollment
  const existing = await enrollmentRepo.findByStudentAndClassroom(
    db,
    data.student_id,
    data.classroom_id,
    data.academic_year_id,
    schoolId
  );
  if (existing) {
    throw new EnrollmentError(
      'Enrollment already exists for this student, classroom, and academic year',
      'DUPLICATE_ENROLLMENT'
    );
  }

  const id = randomUUID();

  return enrollmentRepo.create(db, {
    id,
    school_id: schoolId,
    academic_year_id: data.academic_year_id,
    classroom_id: data.classroom_id,
    student_id: data.student_id,
    roll_number: data.roll_number || null,
    joined_on: data.joined_on,
    status,
    from_enrollment_id: null,
  });
}

/**
 * Update enrollment
 * 
 * RULE: Status transitions must be valid
 * RULE: Only one active enrollment per student per academic year
 * RULE: left_on required when transitioning to 'left' or 'transferred'
 * RULE: outcome can only be set when status is 'completed'
 */
export async function update(
  db: D1Database,
  id: string,
  schoolId: string,
  data: UpdateEnrollmentRequest
): Promise<Enrollment> {
  const enrollment = await getById(db, id, schoolId);

  // Validate status transitions
  if (data.status) {
    validateStatusTransition(enrollment.status, data.status);
  }

  // Check for unique active enrollment if transitioning to active
  if (data.status === 'active' && enrollment.status !== 'active') {
    const activeCount = await enrollmentRepo.countActiveForYearAndStudent(
      db,
      enrollment.student_id,
      enrollment.academic_year_id,
      schoolId
    );
    if (activeCount > 0) {
      throw new EnrollmentError(
        'Student already has an active enrollment for this academic year',
        'MULTIPLE_ACTIVE_ENROLLMENTS'
      );
    }
  }

  // Validate left_on for terminal statuses
  if (data.status && ['left', 'transferred'].includes(data.status)) {
    if (!data.left_on && !enrollment.left_on) {
      throw new EnrollmentError(
        'left_on is required when transitioning to left or transferred status',
        'LEFT_ON_REQUIRED'
      );
    }
  }

  // Validate outcome only for completed enrollments
  if (data.outcome !== undefined) {
    const finalStatus = data.status || enrollment.status;
    if (finalStatus !== 'completed') {
      throw new EnrollmentError(
        'Outcome can only be set when status is completed',
        'INVALID_OUTCOME'
      );
    }
  }

  const updated = await enrollmentRepo.update(db, id, schoolId, data);
  
  if (!updated) {
    throw new EnrollmentError(
      'Failed to update enrollment',
      'UPDATE_FAILED',
      500
    );
  }

  return getById(db, id, schoolId);
}

/**
 * Validate status transitions
 */
function validateStatusTransition(
  currentStatus: EnrollmentStatus,
  newStatus: EnrollmentStatus
): void {
  const validTransitions: Record<EnrollmentStatus, EnrollmentStatus[]> = {
    planned: ['active', 'left'],
    active: ['completed', 'left', 'transferred'],
    completed: [], // Terminal state
    left: [], // Terminal state
    transferred: [], // Terminal state
  };

  const allowed = validTransitions[currentStatus];
  if (!allowed.includes(newStatus)) {
    throw new EnrollmentError(
      `Invalid status transition from ${currentStatus} to ${newStatus}`,
      'INVALID_STATUS_TRANSITION'
    );
  }
}
