/**
 * Student Repository
 * 
 * Database operations for student profiles
 * SECURITY: All queries are school-scoped
 */

import type { StudentProfile, StudentStatus } from './accounts.types';

/**
 * Find student profile by ID
 * SECURITY: Filters by school_id
 */
export async function findById(
  db: D1Database,
  id: string,
  schoolId: string
): Promise<StudentProfile | null> {
  const result = await db
    .prepare(
      `SELECT user_id as id, user_id, school_id, student_code, admission_number, 
              first_name, middle_name, last_name,
              (first_name || COALESCE(' ' || middle_name, '') || ' ' || last_name) as full_name,
              gender, date_of_birth, dob_md, phone, email, address, parent_name, parent_phone, parent_email,
              status, created_at, updated_at
       FROM student_profiles
       WHERE user_id = ?
         AND school_id = ?
       LIMIT 1`
    )
    .bind(id, schoolId)
    .first<StudentProfile>();

  return result || null;
}

/**
 * Find student profile by user_id
 * SECURITY: Filters by school_id
 */
export async function findByUserId(
  db: D1Database,
  userId: string,
  schoolId: string
): Promise<StudentProfile | null> {
  const result = await db
    .prepare(
      `SELECT 
         sp.user_id as id,
         sp.user_id,
         sp.school_id,
         sp.student_code,
         sp.admission_number,
         sp.first_name,
         sp.middle_name,
         sp.last_name,
         (sp.first_name || COALESCE(' ' || sp.middle_name, '') || ' ' || sp.last_name) as full_name,
         sp.gender,
         sp.date_of_birth,
         sp.dob_md,
         sp.phone,
         sp.email,
         sp.address,
         sp.parent_name,
         sp.parent_phone,
         sp.parent_email,
         sp.status,
         sp.created_at,
         sp.updated_at,
         e.id as enrollment_id,
         e.classroom_id,
         e.academic_year_id,
         e.roll_number,
         c.classroom_code,
         c.grade_name,
         c.division_name,
         ay.label as academic_year,
         sch.name as school_name
       FROM student_profiles sp
       LEFT JOIN schools sch ON sp.school_id = sch.id
       LEFT JOIN enrollments e ON sp.user_id = e.student_id AND e.status = 'active'
       LEFT JOIN classrooms c ON e.classroom_id = c.id
       LEFT JOIN academic_years ay ON e.academic_year_id = ay.id
       WHERE sp.user_id = ?
         AND sp.school_id = ?
       LIMIT 1`
    )
    .bind(userId, schoolId)
    .first<StudentProfile>();

  return result || null;
}

/**
 * Find student profile by student code
 * SECURITY: Filters by school_id
 */
export async function findByStudentCode(
  db: D1Database,
  studentCode: string,
  schoolId: string
): Promise<StudentProfile | null> {
  const result = await db
    .prepare(
      `SELECT user_id as id, user_id, school_id, student_code, admission_number,
              first_name, middle_name, last_name,
              (first_name || COALESCE(' ' || middle_name, '') || ' ' || last_name) as full_name,
              gender, date_of_birth, dob_md, phone, email, address, parent_name, parent_phone, parent_email,
              status, created_at, updated_at
       FROM student_profiles
       WHERE student_code = ?
         AND school_id = ?
       LIMIT 1`
    )
    .bind(studentCode, schoolId)
    .first<StudentProfile>();

  return result || null;
}

/**
 * Find student profile by admission number
 * SECURITY: Filters by school_id
 */
export async function findByAdmissionNumber(
  db: D1Database,
  admissionNumber: string,
  schoolId: string
): Promise<StudentProfile | null> {
  const result = await db
    .prepare(
      `SELECT user_id as id, user_id, school_id, student_code, admission_number,
              first_name, middle_name, last_name,
              (first_name || COALESCE(' ' || middle_name, '') || ' ' || last_name) as full_name,
              gender, date_of_birth, dob_md, phone, email, address, parent_name, parent_phone, parent_email,
              status, created_at, updated_at
       FROM student_profiles
       WHERE admission_number = ?
         AND school_id = ?
       LIMIT 1`
    )
    .bind(admissionNumber, schoolId)
    .first<StudentProfile>();

  return result || null;
}

/**
 * Find all students with current enrollment (classroom info)
 * SECURITY: Filters by school_id
 */
export async function findAllWithEnrollment(
  db: D1Database,
  schoolId: string,
  academicYearId?: string,
  filters?: {
    status?: StudentStatus;
    search?: string;
    admission_batch?: string;
  }
): Promise<any[]> {
  let query = `SELECT s.user_id as id, s.user_id, s.school_id, s.student_code, s.admission_number,
                      s.first_name, s.middle_name, s.last_name,
                      (s.first_name || COALESCE(' ' || s.middle_name, '') || ' ' || s.last_name) as full_name,
                      s.gender, s.date_of_birth, s.dob_md, s.phone, s.email, s.address,
                      s.parent_name, s.parent_phone, s.parent_email, s.admission_batch,
                      s.status, s.created_at, s.updated_at,
                      u.login_id,
                      c.classroom_code, c.grade_name, c.division_name,
                      e.roll_number, e.status as enrollment_status
               FROM student_profiles s
               JOIN users u ON s.user_id = u.id
               LEFT JOIN enrollments e ON s.user_id = e.student_id AND e.status = 'active'
               LEFT JOIN classrooms c ON e.classroom_id = c.id`;
  
  const bindings: unknown[] = [];
  const conditions: string[] = ['s.school_id = ?'];
  bindings.push(schoolId);

  // Filter by academic year if provided
  if (academicYearId) {
    conditions.push('(c.academic_year_id = ? OR c.academic_year_id IS NULL)');
    bindings.push(academicYearId);
  }

  if (filters?.status) {
    conditions.push('s.status = ?');
    bindings.push(filters.status);
  }

  if (filters?.admission_batch) {
    conditions.push('s.admission_batch = ?');
    bindings.push(filters.admission_batch);
  }

  if (filters?.search) {
    conditions.push(`(
      s.first_name LIKE ? OR
      s.last_name LIKE ? OR
      s.student_code LIKE ? OR
      s.admission_number LIKE ? OR
      u.login_id LIKE ?
    )`);
    const searchPattern = `%${filters.search}%`;
    bindings.push(searchPattern, searchPattern, searchPattern, searchPattern, searchPattern);
  }

  query += ' WHERE ' + conditions.join(' AND ');
  query += ' ORDER BY s.created_at DESC';

  const result = await db
    .prepare(query)
    .bind(...bindings)
    .all<any>();

  return result.results || [];
}

/**
 * List all student profiles in a school
 * SECURITY: Filters by school_id
 */
export async function findAll(
  db: D1Database,
  schoolId: string,
  filters?: {
    status?: StudentStatus;
    search?: string;
    admission_batch?: string;
  }
): Promise<StudentProfile[]> {
  let query = `SELECT s.user_id as id, s.user_id, s.school_id, s.student_code, s.admission_number,
                      s.first_name, s.middle_name, s.last_name,
                      (s.first_name || COALESCE(' ' || s.middle_name, '') || ' ' || s.last_name) as full_name,
                      s.gender, s.date_of_birth, s.dob_md, s.phone, s.email, s.address,
                      s.parent_name, s.parent_phone, s.parent_email, s.admission_batch,
                      s.status, s.created_at, s.updated_at,
                      u.login_id
               FROM student_profiles s
               JOIN users u ON s.user_id = u.id
               WHERE s.school_id = ?`;
  
  const bindings: unknown[] = [schoolId];

  if (filters?.status) {
    query += ' AND s.status = ?';
    bindings.push(filters.status);
  }

  if (filters?.admission_batch) {
    query += ' AND s.admission_batch = ?';
    bindings.push(filters.admission_batch);
  }

  if (filters?.search) {
    query += ` AND (
      s.first_name LIKE ? OR
      s.last_name LIKE ? OR
      s.student_code LIKE ? OR
      s.admission_number LIKE ? OR
      u.login_id LIKE ?
    )`;
    const searchPattern = `%${filters.search}%`;
    bindings.push(searchPattern, searchPattern, searchPattern, searchPattern, searchPattern);
  }

  query += ' ORDER BY s.created_at DESC';

  const result = await db
    .prepare(query)
    .bind(...bindings)
    .all<StudentProfile>();

  return result.results || [];
}

/**
 * Create student profile
 * SECURITY: Sets school_id from authenticated context
 */
export async function create(
  db: D1Database,
  data: {
    id: string;
    user_id: string;
    school_id: string;
    student_code: string;
    admission_number: string;
    first_name: string;
    middle_name: string | null;
    last_name: string;
    gender: string | null;
    date_of_birth: string | null;
    dob_md: string | null;
    phone: string | null;
    email: string | null;
    address: string | null;
    parent_name: string | null;
    parent_phone: string | null;
    parent_email: string | null;
    admission_batch: string | null;
    status: StudentStatus;
  }
): Promise<StudentProfile> {
  const now = new Date().toISOString();

  await db
    .prepare(
      `INSERT INTO student_profiles (
        user_id, school_id, student_code, admission_number,
        first_name, middle_name, last_name, gender, date_of_birth, dob_md,
        phone, email, address, parent_name, parent_phone, parent_email,
        admission_batch, status, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      data.user_id,
      data.school_id,
      data.student_code,
      data.admission_number,
      data.first_name,
      data.middle_name,
      data.last_name,
      data.gender,
      data.date_of_birth,
      data.dob_md,
      data.phone,
      data.email,
      data.address,
      data.parent_name,
      data.parent_phone,
      data.parent_email,
      data.admission_batch,
      data.status,
      now,
      now
    )
    .run();

  return {
    id: data.user_id, // user_id is the PK
    user_id: data.user_id,
    school_id: data.school_id,
    student_code: data.student_code,
    admission_number: data.admission_number,
    first_name: data.first_name,
    middle_name: data.middle_name,
    last_name: data.last_name,
    gender: data.gender,
    date_of_birth: data.date_of_birth,
    dob_md: data.dob_md,
    phone: data.phone,
    email: data.email,
    address: data.address,
    parent_name: data.parent_name,
    parent_phone: data.parent_phone,
    parent_email: data.parent_email,
    admission_batch: data.admission_batch,
    status: data.status,
    created_at: now,
    updated_at: now,
  };
}

/**
 * Update student profile
 * SECURITY: Filters by school_id
 */
export async function update(
  db: D1Database,
  id: string,
  schoolId: string,
  data: {
    admission_number?: string;
    first_name?: string;
    middle_name?: string | null;
    last_name?: string;
    gender?: string | null;
    date_of_birth?: string | null;
    dob_md?: string | null;
    phone?: string | null;
    email?: string | null;
    address?: string | null;
    parent_name?: string | null;
    parent_phone?: string | null;
    admission_batch?: string | null;
    status?: StudentStatus;
  }
): Promise<boolean> {
  const updates: string[] = [];
  const bindings: unknown[] = [];

  if (data.admission_number !== undefined) {
    updates.push('admission_number = ?');
    bindings.push(data.admission_number);
  }

  if (data.first_name !== undefined) {
    updates.push('first_name = ?');
    bindings.push(data.first_name);
  }

  if (data.middle_name !== undefined) {
    updates.push('middle_name = ?');
    bindings.push(data.middle_name);
  }

  if (data.last_name !== undefined) {
    updates.push('last_name = ?');
    bindings.push(data.last_name);
  }

  if (data.gender !== undefined) {
    updates.push('gender = ?');
    bindings.push(data.gender);
  }

  if (data.date_of_birth !== undefined) {
    updates.push('date_of_birth = ?');
    bindings.push(data.date_of_birth);
  }

  if (data.dob_md !== undefined) {
    updates.push('dob_md = ?');
    bindings.push(data.dob_md);
  }

  if (data.phone !== undefined) {
    updates.push('phone = ?');
    bindings.push(data.phone);
  }

  if (data.email !== undefined) {
    updates.push('email = ?');
    bindings.push(data.email);
  }

  if (data.address !== undefined) {
    updates.push('address = ?');
    bindings.push(data.address);
  }

  if (data.parent_name !== undefined) {
    updates.push('parent_name = ?');
    bindings.push(data.parent_name);
  }

  if (data.parent_phone !== undefined) {
    updates.push('parent_phone = ?');
    bindings.push(data.parent_phone);
  }

  if (data.admission_batch !== undefined) {
    updates.push('admission_batch = ?');
    bindings.push(data.admission_batch);
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
      `UPDATE student_profiles
       SET ${updates.join(', ')}
       WHERE user_id = ?
         AND school_id = ?`
    )
    .bind(...bindings)
    .run();

  return result.meta.changes > 0;
}

/**
 * Count students by status
 * SECURITY: Filters by school_id
 */
export async function countByStatus(
  db: D1Database,
  schoolId: string,
  status: StudentStatus
): Promise<number> {
  const result = await db
    .prepare(
      `SELECT COUNT(*) as count
       FROM student_profiles
       WHERE school_id = ?
         AND status = ?`
    )
    .bind(schoolId, status)
    .first<{ count: number }>();

  return result?.count || 0;
}

/**
 * Get student with user information
 * SECURITY: Filters by school_id
 */
export async function findByIdWithUser(
  db: D1Database,
  id: string,
  schoolId: string
): Promise<{
  profile: StudentProfile;
  user: {
    id: string;
    login_id: string;
    role: string;
    status: string;
    must_change_password: boolean;
  };
} | null> {
  const result = await db
    .prepare(
      `SELECT 
        sp.user_id as profile_id,
        sp.user_id,
        sp.school_id,
        sp.student_code,
        sp.admission_number,
        sp.first_name,
        sp.middle_name,
        sp.last_name,
        sp.gender,
        sp.date_of_birth,
        sp.dob_md,
        sp.phone,
        sp.email,
        sp.address,
        sp.parent_name,
        sp.parent_phone,
        sp.parent_email,
        sp.admission_batch,
        sp.status as profile_status,
        sp.created_at as profile_created_at,
        sp.updated_at as profile_updated_at,
        u.id as user_id,
        u.login_id,
        u.role,
        u.status as user_status,
        u.must_change_password
       FROM student_profiles sp
       INNER JOIN users u ON sp.user_id = u.id
       WHERE sp.user_id = ?
         AND sp.school_id = ?
       LIMIT 1`
    )
    .bind(id, schoolId)
    .first<any>();

  if (!result) {
    return null;
  }

  return {
    profile: {
      id: result.profile_id,
      user_id: result.user_id,
      school_id: result.school_id,
      student_code: result.student_code,
      admission_number: result.admission_number,
      first_name: result.first_name,
      middle_name: result.middle_name,
      last_name: result.last_name,
      gender: result.gender,
      date_of_birth: result.date_of_birth,
      dob_md: result.dob_md,
      phone: result.phone,
      email: result.email,
      address: result.address,
      parent_name: result.parent_name,
      parent_phone: result.parent_phone,
      parent_email: result.parent_email,
      admission_batch: result.admission_batch,
      status: result.profile_status,
      created_at: result.profile_created_at,
      updated_at: result.profile_updated_at,
    },
    user: {
      id: result.user_id,
      login_id: result.login_id,
      role: result.role,
      status: result.user_status,
      must_change_password: result.must_change_password === 1,
    },
  };
}
