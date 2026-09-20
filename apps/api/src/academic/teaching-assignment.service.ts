/**
 * Teaching Assignment Service
 * 
 * Business logic for teaching assignments with cross-resource validation
 */

import { randomUUID } from 'node:crypto';
import * as teachingAssignmentRepo from './teaching-assignment.repository';
import * as academicYearRepo from './academic-year.repository';
import * as classroomRepo from './classroom.repository';
import * as subjectRepo from './subject.repository';
import type {
  TeachingAssignment,
  TeachingAssignmentStatus,
  CreateTeachingAssignmentRequest,
  UpdateTeachingAssignmentRequest,
} from './academic.types';

/**
 * Business rule errors
 */
export class TeachingAssignmentError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 400
  ) {
    super(message);
    this.name = 'TeachingAssignmentError';
  }
}

/**
 * Get teaching assignment by ID
 */
export async function getById(
  db: D1Database,
  id: string,
  schoolId: string
): Promise<TeachingAssignment> {
  const assignment = await teachingAssignmentRepo.findById(db, id, schoolId);
  
  if (!assignment) {
    throw new TeachingAssignmentError(
      'Teaching assignment not found',
      'TEACHING_ASSIGNMENT_NOT_FOUND',
      404
    );
  }

  return assignment;
}

/**
 * List teaching assignments
 */
export async function list(
  db: D1Database,
  schoolId: string,
  filters?: {
    academic_year_id?: string;
    teacher_id?: string;
    classroom_id?: string;
    subject_id?: string;
    status?: TeachingAssignmentStatus;
  }
): Promise<TeachingAssignment[]> {
  return teachingAssignmentRepo.findAll(db, schoolId, filters);
}

/**
 * Create teaching assignment
 * 
 * RULE: academic_year_id, classroom_id, subject_id must exist and belong to same school
 * RULE: classroom must belong to the specified academic year
 * RULE: classroom and subject must be active
 * RULE: teacher_id must exist and belong to school
 * RULE: No duplicate active assignment for same classroom+subject
 */
export async function create(
  db: D1Database,
  schoolId: string,
  data: CreateTeachingAssignmentRequest
): Promise<TeachingAssignment> {
  // Verify academic year exists and belongs to school
  const academicYear = await academicYearRepo.findById(
    db,
    data.academic_year_id,
    schoolId
  );
  if (!academicYear) {
    throw new TeachingAssignmentError(
      'Academic year not found',
      'ACADEMIC_YEAR_NOT_FOUND'
    );
  }

  // Verify classroom exists and belongs to school
  const classroom = await classroomRepo.findById(db, data.classroom_id, schoolId);
  if (!classroom) {
    throw new TeachingAssignmentError(
      'Classroom not found',
      'CLASSROOM_NOT_FOUND'
    );
  }

  // Verify classroom belongs to the academic year
  if (classroom.academic_year_id !== data.academic_year_id) {
    throw new TeachingAssignmentError(
      'Classroom does not belong to this academic year',
      'CLASSROOM_YEAR_MISMATCH'
    );
  }

  // Verify classroom is active
  if (classroom.status !== 'active') {
    throw new TeachingAssignmentError(
      'Classroom must be active',
      'CLASSROOM_NOT_ACTIVE'
    );
  }

  // Verify subject exists and belongs to school
  const subject = await subjectRepo.findById(db, data.subject_id, schoolId);
  if (!subject) {
    throw new TeachingAssignmentError(
      'Subject not found',
      'SUBJECT_NOT_FOUND'
    );
  }

  // Verify subject is active
  if (subject.status !== 'active') {
    throw new TeachingAssignmentError(
      'Subject must be active',
      'SUBJECT_NOT_ACTIVE'
    );
  }

  // Verify teacher exists and belongs to school
  // NOTE: We rely on authorization service to verify teacher belongs to school
  // This is a minimal check - full validation happens in routes layer

  // Check for existing active assignment for this classroom+subject
  const existing = await teachingAssignmentRepo.findByClassroomAndSubject(
    db,
    data.classroom_id,
    data.subject_id,
    schoolId,
    'active'
  );
  if (existing) {
    throw new TeachingAssignmentError(
      'An active teaching assignment already exists for this classroom and subject',
      'DUPLICATE_ASSIGNMENT'
    );
  }

  const id = randomUUID();

  return teachingAssignmentRepo.create(db, {
    id,
    school_id: schoolId,
    academic_year_id: data.academic_year_id,
    teacher_id: data.teacher_id,
    classroom_id: data.classroom_id,
    subject_id: data.subject_id,
    status: 'active',
  });
}

/**
 * Update teaching assignment
 * 
 * RULE: teacher_id must exist and belong to school (if changed)
 * RULE: Cannot change teacher_id if status is 'completed'
 */
export async function update(
  db: D1Database,
  id: string,
  schoolId: string,
  data: UpdateTeachingAssignmentRequest
): Promise<TeachingAssignment> {
  const assignment = await getById(db, id, schoolId);

  // Prevent changing teacher for completed assignments
  if (assignment.status === 'completed' && data.teacher_id) {
    throw new TeachingAssignmentError(
      'Cannot change teacher for completed assignments',
      'ASSIGNMENT_COMPLETED'
    );
  }

  // Verify new teacher exists (if provided)
  // NOTE: We rely on authorization service to verify teacher belongs to school

  const updated = await teachingAssignmentRepo.update(db, id, schoolId, data);
  
  if (!updated) {
    throw new TeachingAssignmentError(
      'Failed to update teaching assignment',
      'UPDATE_FAILED',
      500
    );
  }

  return getById(db, id, schoolId);
}
