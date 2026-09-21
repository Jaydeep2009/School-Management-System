/**
 * Teacher Repository
 * 
 * Database operations for teacher profiles
 * SECURITY: All queries are school-scoped
 */

import type { TeacherProfile, TeacherStatus } from './accounts.types';

/**
 * Find teacher profile by ID
 * SECURITY: Filters by school_id
 */
export async function findById(
  db: D1Database,
  id: string,
  schoolId: string
): Promise<TeacherProfile | null> {
  const result = await db
    .prepare(
      `SELECT user_id as id, user_id, school_id, employee_code, first_name, middle_name, last_name,
              phone, date_of_birth, dob_md, joining_date, status, created_at, updated_at
       FROM teacher_profiles
       WHERE user_id = ?
         AND school_id = ?
       LIMIT 1`
    )
    .bind(id, schoolId)
    .first<TeacherProfile>();

  return result || null;
}

/**
 * Find teacher profile by user_id
 * SECURITY: Filters by school_id
 */
export async function findByUserId(
  db: D1Database,
  userId: string,
  schoolId: string
): Promise<TeacherProfile | null> {
  const result = await db
    .prepare(
      `SELECT user_id as id, user_id, school_id, employee_code, first_name, middle_name, last_name,
              phone, date_of_birth, dob_md, joining_date, status, created_at, updated_at
       FROM teacher_profiles
       WHERE user_id = ?
         AND school_id = ?
       LIMIT 1`
    )
    .bind(userId, schoolId)
    .first<TeacherProfile>();

  return result || null;
}

/**
 * Find teacher profile by employee code
 * SECURITY: Filters by school_id
 */
export async function findByEmployeeCode(
  db: D1Database,
  employeeCode: string,
  schoolId: string
): Promise<TeacherProfile | null> {
  const result = await db
    .prepare(
      `SELECT user_id as id, user_id, school_id, employee_code, first_name, middle_name, last_name,
              phone, date_of_birth, dob_md, joining_date, status, created_at, updated_at
       FROM teacher_profiles
       WHERE employee_code = ?
         AND school_id = ?
       LIMIT 1`
    )
    .bind(employeeCode, schoolId)
    .first<TeacherProfile>();

  return result || null;
}

/**
 * List all teacher profiles in a school
 * SECURITY: Filters by school_id
 */
export async function findAll(
  db: D1Database,
  schoolId: string,
  filters?: {
    status?: TeacherStatus;
    search?: string;
  }
): Promise<TeacherProfile[]> {
  let query = `SELECT user_id as id, user_id, school_id, employee_code, first_name, middle_name, last_name,
                      phone, date_of_birth, dob_md, joining_date, status, created_at, updated_at
               FROM teacher_profiles
               WHERE school_id = ?`;
  
  const bindings: unknown[] = [schoolId];

  if (filters?.status) {
    query += ' AND status = ?';
    bindings.push(filters.status);
  }

  if (filters?.search) {
    query += ` AND (
      first_name LIKE ? OR
      last_name LIKE ? OR
      employee_code LIKE ?
    )`;
    const searchPattern = `%${filters.search}%`;
    bindings.push(searchPattern, searchPattern, searchPattern);
  }

  query += ' ORDER BY created_at DESC';

  const result = await db
    .prepare(query)
    .bind(...bindings)
    .all<TeacherProfile>();

  return result.results || [];
}

/**
 * Create teacher profile
 * SECURITY: Sets school_id from authenticated context
 */
export async function create(
  db: D1Database,
  data: {
    id: string;
    user_id: string;
    school_id: string;
    employee_code: string;
    first_name: string;
    middle_name: string | null;
    last_name: string;
    phone: string | null;
    date_of_birth: string | null;
    dob_md: string | null;
    joining_date: string | null;
    status: TeacherStatus;
  }
): Promise<TeacherProfile> {
  const now = new Date().toISOString();

  await db
    .prepare(
      `INSERT INTO teacher_profiles (
        user_id, school_id, employee_code, first_name, middle_name, last_name,
        phone, date_of_birth, dob_md, joining_date, status, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      data.user_id,
      data.school_id,
      data.employee_code,
      data.first_name,
      data.middle_name,
      data.last_name,
      data.phone,
      data.date_of_birth,
      data.dob_md,
      data.joining_date,
      data.status,
      now,
      now
    )
    .run();

  return {
    id: data.id,
    user_id: data.user_id,
    school_id: data.school_id,
    employee_code: data.employee_code,
    first_name: data.first_name,
    middle_name: data.middle_name,
    last_name: data.last_name,
    phone: data.phone,
    date_of_birth: data.date_of_birth,
    dob_md: data.dob_md,
    joining_date: data.joining_date,
    status: data.status,
    created_at: now,
    updated_at: now,
  };
}

/**
 * Update teacher profile
 * SECURITY: Filters by school_id
 */
export async function update(
  db: D1Database,
  id: string,
  schoolId: string,
  data: {
    first_name?: string;
    middle_name?: string | null;
    last_name?: string;
    phone?: string | null;
    date_of_birth?: string | null;
    dob_md?: string | null;
    joining_date?: string | null;
    status?: TeacherStatus;
  }
): Promise<boolean> {
  const updates: string[] = [];
  const bindings: unknown[] = [];

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

  if (data.phone !== undefined) {
    updates.push('phone = ?');
    bindings.push(data.phone);
  }

  if (data.date_of_birth !== undefined) {
    updates.push('date_of_birth = ?');
    bindings.push(data.date_of_birth);
  }

  if (data.dob_md !== undefined) {
    updates.push('dob_md = ?');
    bindings.push(data.dob_md);
  }

  if (data.joining_date !== undefined) {
    updates.push('joining_date = ?');
    bindings.push(data.joining_date);
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
      `UPDATE teacher_profiles
       SET ${updates.join(', ')}
       WHERE user_id = ?
         AND school_id = ?`
    )
    .bind(...bindings)
    .run();

  return result.meta.changes > 0;
}

/**
 * Count teachers by status
 * SECURITY: Filters by school_id
 */
export async function countByStatus(
  db: D1Database,
  schoolId: string,
  status: TeacherStatus
): Promise<number> {
  const result = await db
    .prepare(
      `SELECT COUNT(*) as count
       FROM teacher_profiles
       WHERE school_id = ?
         AND status = ?`
    )
    .bind(schoolId, status)
    .first<{ count: number }>();

  return result?.count || 0;
}

/**
 * Get teacher with user information
 * SECURITY: Filters by school_id
 */
export async function findByIdWithUser(
  db: D1Database,
  id: string,
  schoolId: string
): Promise<{
  profile: TeacherProfile;
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
        tp.user_id as profile_id,
        tp.user_id,
        tp.school_id,
        tp.employee_code,
        tp.first_name,
        tp.middle_name,
        tp.last_name,
        tp.phone,
        tp.date_of_birth,
        tp.dob_md,
        tp.joining_date,
        tp.status as profile_status,
        tp.created_at as profile_created_at,
        tp.updated_at as profile_updated_at,
        u.id as user_id,
        u.login_id,
        u.role,
        u.status as user_status,
        u.must_change_password
       FROM teacher_profiles tp
       INNER JOIN users u ON tp.user_id = u.id
       WHERE tp.user_id = ?
         AND tp.school_id = ?
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
      employee_code: result.employee_code,
      first_name: result.first_name,
      middle_name: result.middle_name,
      last_name: result.last_name,
      phone: result.phone,
      date_of_birth: result.date_of_birth,
      dob_md: result.dob_md,
      joining_date: result.joining_date,
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
