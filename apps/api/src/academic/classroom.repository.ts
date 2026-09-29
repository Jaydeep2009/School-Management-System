/**
 * Classroom Repository
 * 
 * Database operations for classrooms
 * SECURITY: All queries are school-scoped
 */

import type { Classroom, ClassroomStatus, ClassroomWithRelations } from './academic.types';

/**
 * Find classroom by ID with related data (teacher name, academic year)
 * SECURITY: Filters by school_id
 */
export async function findByIdWithRelations(
  db: D1Database,
  id: string,
  schoolId: string
): Promise<ClassroomWithRelations | null> {
  const result = await db
    .prepare(
      `SELECT 
        c.id, c.school_id, c.academic_year_id, c.classroom_code, c.grade_name, c.division_name,
        c.grade_level, c.class_teacher_id, c.status, c.created_at, c.updated_at,
        ay.label as academic_year_label,
        t.first_name || ' ' || t.last_name as class_teacher_name
       FROM classrooms c
       LEFT JOIN academic_years ay ON c.academic_year_id = ay.id
       LEFT JOIN teacher_profiles t ON c.class_teacher_id = t.user_id
       WHERE c.id = ?
         AND c.school_id = ?
       LIMIT 1`
    )
    .bind(id, schoolId)
    .first<ClassroomWithRelations>();

  return result || null;
}

/**
 * Find classroom by ID
 * SECURITY: Filters by school_id
 */
export async function findById(
  db: D1Database,
  id: string,
  schoolId: string
): Promise<Classroom | null> {
  const result = await db
    .prepare(
      `SELECT id, school_id, academic_year_id, classroom_code, grade_name, division_name,
              grade_level, class_teacher_id, status, created_at, updated_at
       FROM classrooms
       WHERE id = ?
         AND school_id = ?
       LIMIT 1`
    )
    .bind(id, schoolId)
    .first<Classroom>();

  return result || null;
}

/**
 * Find all classrooms for a school with related data
 * SECURITY: Filters by school_id
 */
export async function findAllWithRelations(
  db: D1Database,
  schoolId: string,
  filters?: {
    academic_year_id?: string;
    status?: ClassroomStatus;
  }
): Promise<ClassroomWithRelations[]> {
  let query = `SELECT 
                c.id, c.school_id, c.academic_year_id, c.classroom_code, c.grade_name, c.division_name,
                c.grade_level, c.class_teacher_id, c.status, c.created_at, c.updated_at,
                ay.label as academic_year_label,
                t.first_name || ' ' || t.last_name as class_teacher_name
               FROM classrooms c
               LEFT JOIN academic_years ay ON c.academic_year_id = ay.id
               LEFT JOIN teacher_profiles t ON c.class_teacher_id = t.user_id
               WHERE c.school_id = ?`;
  
  const bindings: unknown[] = [schoolId];

  if (filters?.academic_year_id) {
    query += ' AND c.academic_year_id = ?';
    bindings.push(filters.academic_year_id);
  }

  if (filters?.status) {
    query += ' AND c.status = ?';
    bindings.push(filters.status);
  }

  query += ' ORDER BY c.grade_level ASC, c.division_name ASC';

  const result = await db
    .prepare(query)
    .bind(...bindings)
    .all<ClassroomWithRelations>();

  return result.results || [];
}

/**
 * Find all classrooms for a school
 * SECURITY: Filters by school_id
 */
export async function findAll(
  db: D1Database,
  schoolId: string,
  filters?: {
    academic_year_id?: string;
    status?: ClassroomStatus;
  }
): Promise<Classroom[]> {
  let query = `SELECT id, school_id, academic_year_id, classroom_code, grade_name, division_name,
                      grade_level, class_teacher_id, status, created_at, updated_at
               FROM classrooms
               WHERE school_id = ?`;
  
  const bindings: unknown[] = [schoolId];

  if (filters?.academic_year_id) {
    query += ' AND academic_year_id = ?';
    bindings.push(filters.academic_year_id);
  }

  if (filters?.status) {
    query += ' AND status = ?';
    bindings.push(filters.status);
  }

  query += ' ORDER BY grade_level ASC, division_name ASC';

  const result = await db
    .prepare(query)
    .bind(...bindings)
    .all<Classroom>();

  return result.results || [];
}

/**
 * Find classroom by code
 * SECURITY: Filters by school_id and academic_year_id
 */
export async function findByCode(
  db: D1Database,
  classroomCode: string,
  academicYearId: string,
  schoolId: string
): Promise<Classroom | null> {
  const result = await db
    .prepare(
      `SELECT id, school_id, academic_year_id, classroom_code, grade_name, division_name,
              grade_level, class_teacher_id, status, created_at, updated_at
       FROM classrooms
       WHERE classroom_code = ?
         AND academic_year_id = ?
         AND school_id = ?
       LIMIT 1`
    )
    .bind(classroomCode, academicYearId, schoolId)
    .first<Classroom>();

  return result || null;
}

/**
 * Find classroom by grade and division
 * SECURITY: Filters by school_id and academic_year_id
 */
export async function findByGradeAndDivision(
  db: D1Database,
  gradeName: string,
  divisionName: string,
  academicYearId: string,
  schoolId: string
): Promise<Classroom | null> {
  const result = await db
    .prepare(
      `SELECT id, school_id, academic_year_id, classroom_code, grade_name, division_name,
              grade_level, class_teacher_id, status, created_at, updated_at
       FROM classrooms
       WHERE grade_name = ?
         AND division_name = ?
         AND academic_year_id = ?
         AND school_id = ?
       LIMIT 1`
    )
    .bind(gradeName, divisionName, academicYearId, schoolId)
    .first<Classroom>();

  return result || null;
}

/**
 * Find classrooms by teacher (class teacher assignments)
 * SECURITY: Filters by school_id
 */
export async function findByClassTeacher(
  db: D1Database,
  teacherId: string,
  schoolId: string
): Promise<Classroom[]> {
  const result = await db
    .prepare(
      `SELECT id, school_id, academic_year_id, classroom_code, grade_name, division_name,
              grade_level, class_teacher_id, status, created_at, updated_at
       FROM classrooms
       WHERE class_teacher_id = ?
         AND school_id = ?
         AND status = 'active'
       ORDER BY grade_level ASC`
    )
    .bind(teacherId, schoolId)
    .all<Classroom>();

  return result.results || [];
}

/**
 * Create classroom
 * SECURITY: Sets school_id from authenticated context
 */
export async function create(
  db: D1Database,
  data: {
    id: string;
    school_id: string;
    academic_year_id: string;
    classroom_code: string;
    grade_name: string;
    division_name: string;
    grade_level: number;
    class_teacher_id: string | null;
    status: ClassroomStatus;
  }
): Promise<Classroom> {
  const now = new Date().toISOString();

  await db
    .prepare(
      `INSERT INTO classrooms (id, school_id, academic_year_id, classroom_code, grade_name, division_name,
                              grade_level, class_teacher_id, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      data.id,
      data.school_id,
      data.academic_year_id,
      data.classroom_code,
      data.grade_name,
      data.division_name,
      data.grade_level,
      data.class_teacher_id,
      data.status,
      now,
      now
    )
    .run();

  return {
    id: data.id,
    school_id: data.school_id,
    academic_year_id: data.academic_year_id,
    classroom_code: data.classroom_code,
    grade_name: data.grade_name,
    division_name: data.division_name,
    grade_level: data.grade_level,
    class_teacher_id: data.class_teacher_id,
    status: data.status,
    created_at: now,
    updated_at: now,
  };
}

/**
 * Update classroom
 * SECURITY: Filters by school_id
 */
export async function update(
  db: D1Database,
  id: string,
  schoolId: string,
  data: {
    classroom_code?: string;
    grade_name?: string;
    division_name?: string;
    grade_level?: number;
    class_teacher_id?: string | null;
    status?: ClassroomStatus;
  }
): Promise<boolean> {
  const updates: string[] = [];
  const bindings: unknown[] = [];

  if (data.classroom_code !== undefined) {
    updates.push('classroom_code = ?');
    bindings.push(data.classroom_code);
  }

  if (data.grade_name !== undefined) {
    updates.push('grade_name = ?');
    bindings.push(data.grade_name);
  }

  if (data.division_name !== undefined) {
    updates.push('division_name = ?');
    bindings.push(data.division_name);
  }

  if (data.grade_level !== undefined) {
    updates.push('grade_level = ?');
    bindings.push(data.grade_level);
  }

  if (data.class_teacher_id !== undefined) {
    updates.push('class_teacher_id = ?');
    bindings.push(data.class_teacher_id);
  }

  if (data.status !== undefined) {
    updates.push('status = ?');
    bindings.push(data.status);
  }

  if (updates.length === 0) {
    return false;
  }

  updates.push('updated_at = ?');
  bindings.push(new Date().toISOString());

  bindings.push(id, schoolId);

  const result = await db
    .prepare(
      `UPDATE classrooms
       SET ${updates.join(', ')}
       WHERE id = ?
         AND school_id = ?`
    )
    .bind(...bindings)
    .run();

  return result.meta.changes > 0;
}

/**
 * Delete classroom
 * SECURITY: Filters by school_id
 */
export async function deleteClassroom(
  db: D1Database,
  id: string,
  schoolId: string
): Promise<boolean> {
  const result = await db
    .prepare('DELETE FROM classrooms WHERE id = ? AND school_id = ?')
    .bind(id, schoolId)
    .run();
  
  return result.meta.changes > 0;
}
