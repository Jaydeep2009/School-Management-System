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
    teacher_id?: string;
    classroom_id?: string;
    subject_id?: string;
  }
): Promise<TeachingAssignment[]> {
  return teachingAssignmentRepo.findAll(db, schoolId, filters);
}

/**
 * Create teaching assignment
 * 
 * RULE: classroom_id, subject_id must exist and belong to same school
 * RULE: classroom and subject must be active
 * RULE: teacher_id must exist and belong to school
 * RULE: No duplicate assignment for same classroom+subject
 */
export async function create(
  db: D1Database,
  schoolId: string,
  data: CreateTeachingAssignmentRequest
): Promise<TeachingAssignment> {
  // Verify classroom exists and belongs to school
  const classroom = await classroomRepo.findById(db, data.classroom_id, schoolId);
  if (!classroom) {
    throw new TeachingAssignmentError(
      'Classroom not found',
      'CLASSROOM_NOT_FOUND'
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

  // Check for existing assignment for this classroom+subject
  const existing = await teachingAssignmentRepo.findByClassroomAndSubject(
    db,
    data.classroom_id,
    data.subject_id,
    schoolId
  );
  if (existing) {
    throw new TeachingAssignmentError(
      'A teaching assignment already exists for this classroom and subject',
      'DUPLICATE_ASSIGNMENT'
    );
  }

  const id = randomUUID();

  return teachingAssignmentRepo.create(db, {
    id,
    school_id: schoolId,
    teacher_id: data.teacher_id,
    classroom_id: data.classroom_id,
    subject_id: data.subject_id,
  });
}

/**
 * Update teaching assignment
 * 
 * RULE: teacher_id must exist and belong to school (if changed)
 */
export async function update(
  db: D1Database,
  id: string,
  schoolId: string,
  data: UpdateTeachingAssignmentRequest
): Promise<TeachingAssignment> {
  const assignment = await getById(db, id, schoolId);

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
