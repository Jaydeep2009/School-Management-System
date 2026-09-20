/**
 * Subject Service
 * 
 * Business logic for subjects with validation rules
 */

import { randomUUID } from 'node:crypto';
import * as subjectRepo from './subject.repository';
import type {
  Subject,
  SubjectStatus,
  CreateSubjectRequest,
  UpdateSubjectRequest,
} from './academic.types';

/**
 * Business rule errors
 */
export class SubjectError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 400
  ) {
    super(message);
    this.name = 'SubjectError';
  }
}

/**
 * Get subject by ID
 */
export async function getById(
  db: D1Database,
  id: string,
  schoolId: string
): Promise<Subject> {
  const subject = await subjectRepo.findById(db, id, schoolId);
  
  if (!subject) {
    throw new SubjectError(
      'Subject not found',
      'SUBJECT_NOT_FOUND',
      404
    );
  }

  return subject;
}

/**
 * List subjects
 */
export async function list(
  db: D1Database,
  schoolId: string,
  filters?: {
    status?: SubjectStatus;
  }
): Promise<Subject[]> {
  return subjectRepo.findAll(db, schoolId, filters);
}

/**
 * Create subject
 * 
 * RULE: subject_code must be unique within school
 */
export async function create(
  db: D1Database,
  schoolId: string,
  data: CreateSubjectRequest
): Promise<Subject> {
  // Check subject_code uniqueness
  const existing = await subjectRepo.findByCode(db, data.subject_code, schoolId);
  if (existing) {
    throw new SubjectError(
      'Subject code already exists',
      'DUPLICATE_SUBJECT_CODE'
    );
  }

  const id = randomUUID();

  return subjectRepo.create(db, {
    id,
    school_id: schoolId,
    subject_code: data.subject_code,
    name: data.name,
    description: data.description || null,
    status: 'active',
  });
}

/**
 * Update subject
 * 
 * RULE: subject_code must be unique within school (if changed)
 */
export async function update(
  db: D1Database,
  id: string,
  schoolId: string,
  data: UpdateSubjectRequest
): Promise<Subject> {
  const subject = await getById(db, id, schoolId);

  // Check subject_code uniqueness if changing
  if (data.subject_code && data.subject_code !== subject.subject_code) {
    const existing = await subjectRepo.findByCode(db, data.subject_code, schoolId);
    if (existing) {
      throw new SubjectError(
        'Subject code already exists',
        'DUPLICATE_SUBJECT_CODE'
      );
    }
  }

  const updated = await subjectRepo.update(db, id, schoolId, data);
  
  if (!updated) {
    throw new SubjectError(
      'Failed to update subject',
      'UPDATE_FAILED',
      500
    );
  }

  return getById(db, id, schoolId);
}
