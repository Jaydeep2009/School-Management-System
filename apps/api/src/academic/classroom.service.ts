/**
 * Classroom Service
 * 
 * Business logic for classrooms with validation rules
 */

import { randomUUID } from 'node:crypto';
import * as classroomRepo from './classroom.repository';
import * as academicYearRepo from './academic-year.repository';
import type {
  Classroom,
  ClassroomStatus,
  CreateClassroomRequest,
  UpdateClassroomRequest,
} from './academic.types';

/**
 * Business rule errors
 */
export class ClassroomError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 400
  ) {
    super(message);
    this.name = 'ClassroomError';
  }
}

/**
 * Get classroom by ID with related data
 */
export async function getByIdWithRelations(
  db: D1Database,
  id: string,
  schoolId: string
): Promise<any> {
  const classroom = await classroomRepo.findByIdWithRelations(db, id, schoolId);
  
  if (!classroom) {
    throw new ClassroomError(
      'Classroom not found',
      'CLASSROOM_NOT_FOUND',
      404
    );
  }

  return classroom;
}

/**
 * Get classroom by ID
 */
export async function getById(
  db: D1Database,
  id: string,
  schoolId: string
): Promise<Classroom> {
  const classroom = await classroomRepo.findById(db, id, schoolId);
  
  if (!classroom) {
    throw new ClassroomError(
      'Classroom not found',
      'CLASSROOM_NOT_FOUND',
      404
    );
  }

  return classroom;
}

/**
 * List classrooms with related data
 */
export async function listWithRelations(
  db: D1Database,
  schoolId: string,
  filters?: {
    academic_year_id?: string;
    status?: ClassroomStatus;
  }
): Promise<any[]> {
  return classroomRepo.findAllWithRelations(db, schoolId, filters);
}

/**
 * List classrooms
 */
export async function list(
  db: D1Database,
  schoolId: string,
  filters?: {
    academic_year_id?: string;
    status?: ClassroomStatus;
  }
): Promise<Classroom[]> {
  return classroomRepo.findAll(db, schoolId, filters);
}

/**
 * Create classroom
 * 
 * RULE: classroom_code must be unique within academic year
 * RULE: grade_name + division_name must be unique within academic year
 * RULE: academic_year_id must exist and belong to school
 * RULE: class_teacher_id must exist and belong to school (if provided)
 */
export async function create(
  db: D1Database,
  schoolId: string,
  data: CreateClassroomRequest
): Promise<Classroom> {
  // Verify academic year exists and belongs to school
  const academicYear = await academicYearRepo.findById(
    db,
    data.academic_year_id,
    schoolId
  );
  if (!academicYear) {
    throw new ClassroomError(
      'Academic year not found',
      'ACADEMIC_YEAR_NOT_FOUND'
    );
  }

  // Check classroom_code uniqueness
  const existingByCode = await classroomRepo.findByCode(
    db,
    data.classroom_code,
    data.academic_year_id,
    schoolId
  );
  if (existingByCode) {
    throw new ClassroomError(
      'Classroom code already exists for this academic year',
      'DUPLICATE_CLASSROOM_CODE'
    );
  }

  // Check grade+division uniqueness
  const existingByGradeDivision = await classroomRepo.findByGradeAndDivision(
    db,
    data.grade_name,
    data.division_name,
    data.academic_year_id,
    schoolId
  );
  if (existingByGradeDivision) {
    throw new ClassroomError(
      'Classroom with this grade and division already exists for this academic year',
      'DUPLICATE_GRADE_DIVISION'
    );
  }

  // Verify class teacher exists (if provided)
  // NOTE: We rely on authorization service to verify teacher belongs to school
  // This is a minimal check - full validation happens in routes layer

  const id = randomUUID();

  return classroomRepo.create(db, {
    id,
    school_id: schoolId,
    academic_year_id: data.academic_year_id,
    classroom_code: data.classroom_code,
    grade_name: data.grade_name,
    division_name: data.division_name,
    grade_level: data.grade_level,
    class_teacher_id: data.class_teacher_id || null,
    status: 'active',
  });
}

/**
 * Update classroom
 * 
 * RULE: classroom_code must be unique within academic year (if changed)
 * RULE: grade_name + division_name must be unique within academic year (if changed)
 * RULE: class_teacher_id must exist and belong to school (if provided)
 */
export async function update(
  db: D1Database,
  id: string,
  schoolId: string,
  data: UpdateClassroomRequest
): Promise<Classroom> {
  const classroom = await getById(db, id, schoolId);

  // Check classroom_code uniqueness if changing
  if (data.classroom_code && data.classroom_code !== classroom.classroom_code) {
    const existing = await classroomRepo.findByCode(
      db,
      data.classroom_code,
      classroom.academic_year_id,
      schoolId
    );
    if (existing) {
      throw new ClassroomError(
        'Classroom code already exists for this academic year',
        'DUPLICATE_CLASSROOM_CODE'
      );
    }
  }

  // Check grade+division uniqueness if changing
  const gradeName = data.grade_name || classroom.grade_name;
  const divisionName = data.division_name || classroom.division_name;
  
  if (
    (data.grade_name && data.grade_name !== classroom.grade_name) ||
    (data.division_name && data.division_name !== classroom.division_name)
  ) {
    const existing = await classroomRepo.findByGradeAndDivision(
      db,
      gradeName,
      divisionName,
      classroom.academic_year_id,
      schoolId
    );
    if (existing && existing.id !== id) {
      throw new ClassroomError(
        'Classroom with this grade and division already exists for this academic year',
        'DUPLICATE_GRADE_DIVISION'
      );
    }
  }

  // Verify class teacher exists (if provided)
  // NOTE: We rely on authorization service to verify teacher belongs to school

  const updated = await classroomRepo.update(db, id, schoolId, data);
  
  if (!updated) {
    throw new ClassroomError(
      'Failed to update classroom',
      'UPDATE_FAILED',
      500
    );
  }

  return getById(db, id, schoolId);
}

/**
 * Delete classroom
 * SECURITY: School-scoped
 * RULE: Cannot delete if enrollments exist
 */
export async function deleteClassroom(
  db: D1Database,
  id: string,
  schoolId: string
): Promise<void> {
  // Verify classroom exists and belongs to school
  await getById(db, id, schoolId);
  
  // Check for enrollments
  const enrollmentCheck = await db
    .prepare('SELECT COUNT(*) as count FROM enrollments WHERE classroom_id = ?')
    .bind(id)
    .first<{ count: number }>();
    
  if (enrollmentCheck && enrollmentCheck.count > 0) {
    throw new ClassroomError(
      'Cannot delete classroom with enrolled students. Remove enrollments first.',
      'HAS_ENROLLMENTS',
      400
    );
  }
  
  // Delete classroom
  const result = await classroomRepo.deleteClassroom(db, id, schoolId);
  
  if (!result) {
    throw new ClassroomError(
      'Failed to delete classroom',
      'DELETE_FAILED',
      500
    );
  }
}
