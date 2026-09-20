/**
 * Academic Year Service
 * 
 * Business logic for academic years with lifecycle rules
 */

import { randomUUID } from 'node:crypto';
import * as academicYearRepo from './academic-year.repository';
import type {
  AcademicYear,
  AcademicYearStatus,
  CreateAcademicYearRequest,
  UpdateAcademicYearRequest,
} from './academic.types';

/**
 * Business rule errors
 */
export class AcademicYearError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 400
  ) {
    super(message);
    this.name = 'AcademicYearError';
  }
}

/**
 * Get academic year by ID
 */
export async function getById(
  db: D1Database,
  id: string,
  schoolId: string
): Promise<AcademicYear> {
  const academicYear = await academicYearRepo.findById(db, id, schoolId);
  
  if (!academicYear) {
    throw new AcademicYearError(
      'Academic year not found',
      'ACADEMIC_YEAR_NOT_FOUND',
      404
    );
  }

  return academicYear;
}

/**
 * List all academic years
 */
export async function list(
  db: D1Database,
  schoolId: string
): Promise<AcademicYear[]> {
  return academicYearRepo.findAll(db, schoolId);
}

/**
 * Get current academic year
 */
export async function getCurrent(
  db: D1Database,
  schoolId: string
): Promise<AcademicYear | null> {
  return academicYearRepo.findCurrent(db, schoolId);
}

/**
 * Create academic year
 * 
 * RULE: Only one current academic year allowed per school
 * RULE: Label must be unique within school
 */
export async function create(
  db: D1Database,
  schoolId: string,
  data: CreateAcademicYearRequest
): Promise<AcademicYear> {
  // Validate label uniqueness
  const existing = await academicYearRepo.findByLabel(db, data.label, schoolId);
  if (existing) {
    throw new AcademicYearError(
      'Academic year with this label already exists',
      'DUPLICATE_LABEL'
    );
  }

  const status = data.status || 'upcoming';

  // Enforce one current academic year per school
  if (status === 'current') {
    const currentCount = await academicYearRepo.countByStatus(db, schoolId, 'current');
    if (currentCount > 0) {
      throw new AcademicYearError(
        'A current academic year already exists. Close or archive the existing one first.',
        'MULTIPLE_CURRENT_YEARS'
      );
    }
  }

  // Validate date range
  if (new Date(data.starts_on) >= new Date(data.ends_on)) {
    throw new AcademicYearError(
      'start_on must be before ends_on',
      'INVALID_DATE_RANGE'
    );
  }

  const id = randomUUID();

  return academicYearRepo.create(db, {
    id,
    school_id: schoolId,
    label: data.label,
    starts_on: data.starts_on,
    ends_on: data.ends_on,
    status,
  });
}

/**
 * Update academic year
 * 
 * RULE: Cannot update dates or label after status is 'current' or 'closed'
 */
export async function update(
  db: D1Database,
  id: string,
  schoolId: string,
  data: UpdateAcademicYearRequest
): Promise<AcademicYear> {
  const academicYear = await getById(db, id, schoolId);

  // Check if attempting to update protected fields
  if (academicYear.status === 'current' || academicYear.status === 'closed') {
    if (data.label || data.starts_on || data.ends_on) {
      throw new AcademicYearError(
        'Cannot modify label or dates for current or closed academic years',
        'YEAR_LOCKED'
      );
    }
  }

  // Validate label uniqueness if changing
  if (data.label && data.label !== academicYear.label) {
    const existing = await academicYearRepo.findByLabel(db, data.label, schoolId);
    if (existing) {
      throw new AcademicYearError(
        'Academic year with this label already exists',
        'DUPLICATE_LABEL'
      );
    }
  }

  // Validate date range if updating dates
  const starts_on = data.starts_on || academicYear.starts_on;
  const ends_on = data.ends_on || academicYear.ends_on;
  if (new Date(starts_on) >= new Date(ends_on)) {
    throw new AcademicYearError(
      'starts_on must be before ends_on',
      'INVALID_DATE_RANGE'
    );
  }

  const updated = await academicYearRepo.update(db, id, schoolId, data);
  
  if (!updated) {
    throw new AcademicYearError(
      'Failed to update academic year',
      'UPDATE_FAILED',
      500
    );
  }

  return getById(db, id, schoolId);
}

/**
 * Activate academic year (set to current)
 * 
 * RULE: Only one current academic year per school
 * RULE: Can only activate from 'upcoming' status
 */
export async function activate(
  db: D1Database,
  id: string,
  schoolId: string
): Promise<AcademicYear> {
  const academicYear = await getById(db, id, schoolId);

  if (academicYear.status !== 'upcoming') {
    throw new AcademicYearError(
      'Can only activate academic years with status "upcoming"',
      'INVALID_STATUS_TRANSITION'
    );
  }

  // Check for existing current year
  const currentCount = await academicYearRepo.countByStatus(db, schoolId, 'current');
  if (currentCount > 0) {
    throw new AcademicYearError(
      'A current academic year already exists. Close it first.',
      'MULTIPLE_CURRENT_YEARS'
    );
  }

  const updated = await academicYearRepo.updateStatus(db, id, schoolId, 'current');
  
  if (!updated) {
    throw new AcademicYearError(
      'Failed to activate academic year',
      'UPDATE_FAILED',
      500
    );
  }

  return getById(db, id, schoolId);
}

/**
 * Close academic year
 * 
 * RULE: Can only close from 'current' status
 */
export async function close(
  db: D1Database,
  id: string,
  schoolId: string
): Promise<AcademicYear> {
  const academicYear = await getById(db, id, schoolId);

  if (academicYear.status !== 'current') {
    throw new AcademicYearError(
      'Can only close academic years with status "current"',
      'INVALID_STATUS_TRANSITION'
    );
  }

  const updated = await academicYearRepo.updateStatus(db, id, schoolId, 'closed');
  
  if (!updated) {
    throw new AcademicYearError(
      'Failed to close academic year',
      'UPDATE_FAILED',
      500
    );
  }

  return getById(db, id, schoolId);
}
