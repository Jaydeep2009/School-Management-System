/**
 * Profiles Repository
 * 
 * Database operations for profile and birthday queries
 * SECURITY: All queries are school-scoped
 */

import type {
  TeacherProfile,
  StudentProfile,
  CurrentEnrollment,
  HistoricalEnrollment,
  UpdateTeacherProfileRequest,
  UpdateStudentProfileRequest,
  TeacherBirthday,
  StudentBirthday,
} from './profiles.types';

/**
 * =====================================================================
 * TEACHER PROFILES
 * =====================================================================
 */

export async function findTeacherProfile(
  db: D1Database,
  userId: string,
  schoolId: string
): Promise<TeacherProfile | null> {
  const result = await db
    .prepare(
      `SELECT user_id, school_id, employee_code, first_name, middle_name, last_name,
              phone, date_of_birth, dob_md, joining_date, status, created_at, updated_at
       FROM teacher_profiles
       WHERE user_id = ? AND school_id = ?`
    )
    .bind(userId, schoolId)
    .first<TeacherProfile>();

  return result || null;
}

export async function updateTeacherProfile(
  db: D1Database,
  userId: string,
  schoolId: string,
  data: UpdateTeacherProfileRequest
): Promise<void> {
  const now = Date.now();
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
    
    // Compute dob_md from date_of_birth
    if (data.date_of_birth) {
      const dob_md = data.date_of_birth.substring(5, 10); // Extract 'MM-DD'
      updates.push('dob_md = ?');
      bindings.push(dob_md);
    } else {
      updates.push('dob_md = NULL');
    }
  }

  if (data.joining_date !== undefined) {
    updates.push('joining_date = ?');
    bindings.push(data.joining_date);
  }

  if (updates.length === 0) {
    return; // Nothing to update
  }

  updates.push('updated_at = ?');
  bindings.push(now);

  bindings.push(userId, schoolId);

  await db
    .prepare(
      `UPDATE teacher_profiles
       SET ${updates.join(', ')}
       WHERE user_id = ? AND school_id = ?`
    )
    .bind(...bindings)
    .run();
}

/**
 * =====================================================================
 * STUDENT PROFILES
 * =====================================================================
 */

export async function findStudentProfile(
  db: D1Database,
  userId: string,
  schoolId: string
): Promise<StudentProfile | null> {
  const result = await db
    .prepare(
      `SELECT user_id, school_id, student_code, admission_number,
              first_name, middle_name, last_name, gender,
              date_of_birth, dob_md, phone, email, address,
              parent_name, parent_phone, parent_email,
              status, created_at, updated_at
       FROM student_profiles
       WHERE user_id = ? AND school_id = ?`
    )
    .bind(userId, schoolId)
    .first<StudentProfile>();

  return result || null;
}

export async function updateStudentProfile(
  db: D1Database,
  userId: string,
  schoolId: string,
  data: UpdateStudentProfileRequest
): Promise<void> {
  const now = Date.now();
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

  if (data.gender !== undefined) {
    updates.push('gender = ?');
    bindings.push(data.gender);
  }

  if (data.date_of_birth !== undefined) {
    updates.push('date_of_birth = ?');
    bindings.push(data.date_of_birth);
    
    // Compute dob_md from date_of_birth
    if (data.date_of_birth) {
      const dob_md = data.date_of_birth.substring(5, 10); // Extract 'MM-DD'
      updates.push('dob_md = ?');
      bindings.push(dob_md);
    } else {
      updates.push('dob_md = NULL');
    }
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

  if (data.parent_email !== undefined) {
    updates.push('parent_email = ?');
    bindings.push(data.parent_email);
  }

  if (updates.length === 0) {
    return; // Nothing to update
  }

  updates.push('updated_at = ?');
  bindings.push(now);

  bindings.push(userId, schoolId);

  await db
    .prepare(
      `UPDATE student_profiles
       SET ${updates.join(', ')}
       WHERE user_id = ? AND school_id = ?`
    )
    .bind(...bindings)
    .run();
}

/**
 * =====================================================================
 * CURRENT ENROLLMENT
 * =====================================================================
 */

export async function findCurrentEnrollment(
  db: D1Database,
  studentUserId: string,
  schoolId: string
): Promise<CurrentEnrollment | null> {
  const result = await db
    .prepare(
      `SELECT 
         e.id as enrollment_id,
         e.academic_year_id,
         ay.label as academic_year_label,
         ay.status as academic_year_status,
         e.classroom_id,
         c.classroom_code as classroom_code,
         c.grade_name,
         c.division_name,
         c.grade_level,
         e.roll_number,
         e.status as enrollment_status,
         e.joined_on,
         c.class_teacher_id,
         COALESCE(tp.first_name || ' ' || tp.last_name, NULL) as class_teacher_name
       FROM enrollments e
       JOIN academic_years ay ON e.academic_year_id = ay.id
       JOIN classrooms c ON e.classroom_id = c.id
       LEFT JOIN teacher_profiles tp ON c.class_teacher_id = tp.user_id
       WHERE e.student_id = ?
         AND e.school_id = ?
         AND ay.status = 'current'
         AND e.status = 'active'
       LIMIT 1`
    )
    .bind(studentUserId, schoolId)
    .first<CurrentEnrollment>();

  return result || null;
}

/**
 * =====================================================================
 * HISTORICAL ENROLLMENTS
 * =====================================================================
 */

export async function findHistoricalEnrollments(
  db: D1Database,
  studentUserId: string,
  schoolId: string
): Promise<HistoricalEnrollment[]> {
  const result = await db
    .prepare(
      `SELECT 
         e.id as enrollment_id,
         ay.label as academic_year_label,
         c.classroom_code as classroom_code,
         c.grade_name,
         c.division_name,
         e.roll_number,
         e.status,
         e.outcome,
         e.joined_on,
         e.left_on
       FROM enrollments e
       JOIN academic_years ay ON e.academic_year_id = ay.id
       JOIN classrooms c ON e.classroom_id = c.id
       WHERE e.student_id = ?
         AND e.school_id = ?
       ORDER BY ay.starts_on DESC, e.created_at DESC`
    )
    .bind(studentUserId, schoolId)
    .all<HistoricalEnrollment>();

  return result.results || [];
}

/**
 * =====================================================================
 * TEACHER BIRTHDAYS
 * =====================================================================
 */

export async function findTeacherBirthdays(
  db: D1Database,
  schoolId: string,
  dobMdFilter?: string
): Promise<TeacherBirthday[]> {
  let query = `
    SELECT user_id, employee_code, first_name, middle_name, last_name, dob_md, date_of_birth as full_dob
    FROM teacher_profiles
    WHERE school_id = ? AND dob_md IS NOT NULL AND status = 'active'
  `;
  
  const bindings: unknown[] = [schoolId];

  if (dobMdFilter) {
    query += ` AND dob_md = ?`;
    bindings.push(dobMdFilter);
  }

  query += ` ORDER BY dob_md`;

  const result = await db
    .prepare(query)
    .bind(...bindings)
    .all<TeacherBirthday>();

  return result.results || [];
}

export async function findTeacherBirthdaysInMonth(
  db: D1Database,
  schoolId: string,
  month: number
): Promise<TeacherBirthday[]> {
  // Format month as MM (e.g., 09 for September)
  const monthStr = month.toString().padStart(2, '0');
  
  const result = await db
    .prepare(
      `SELECT user_id, employee_code, first_name, middle_name, last_name, dob_md, date_of_birth as full_dob
       FROM teacher_profiles
       WHERE school_id = ?
         AND dob_md IS NOT NULL
         AND status = 'active'
         AND substr(dob_md, 1, 2) = ?
       ORDER BY dob_md`
    )
    .bind(schoolId, monthStr)
    .all<TeacherBirthday>();

  return result.results || [];
}

/**
 * =====================================================================
 * STUDENT BIRTHDAYS
 * =====================================================================
 */

export async function findStudentBirthdays(
  db: D1Database,
  schoolId: string,
  dobMdFilter?: string,
  classroomId?: string
): Promise<StudentBirthday[]> {
  let query = `
    SELECT 
      sp.user_id,
      sp.student_code,
      sp.first_name,
      sp.middle_name,
      sp.last_name,
      sp.dob_md,
      sp.date_of_birth as full_dob,
      c.classroom_code as classroom_code,
      c.grade_name,
      c.division_name
    FROM student_profiles sp
    JOIN enrollments e ON sp.user_id = e.student_id
    JOIN academic_years ay ON e.academic_year_id = ay.id
    JOIN classrooms c ON e.classroom_id = c.id
    WHERE sp.school_id = ?
      AND sp.dob_md IS NOT NULL
      AND sp.status = 'active'
      AND ay.status = 'current'
      AND e.status = 'active'
  `;
  
  const bindings: unknown[] = [schoolId];

  if (dobMdFilter) {
    query += ` AND sp.dob_md = ?`;
    bindings.push(dobMdFilter);
  }

  if (classroomId) {
    query += ` AND e.classroom_id = ?`;
    bindings.push(classroomId);
  }

  query += ` ORDER BY sp.dob_md, sp.first_name, sp.last_name`;

  const result = await db
    .prepare(query)
    .bind(...bindings)
    .all<StudentBirthday>();

  return result.results || [];
}

/**
 * Find student birthdays with flexible filtering
 * Supports multiple classrooms with IN clause
 */
export async function findStudentBirthdaysWithFilters(
  db: D1Database,
  params: {
    schoolId: string;
    classroomIds?: string[];
    dobMd?: string;
    month?: number;
  }
): Promise<StudentBirthday[]> {
  let query = `
    SELECT 
      sp.user_id,
      sp.student_code,
      sp.first_name,
      sp.middle_name,
      sp.last_name,
      sp.dob_md,
      sp.date_of_birth as full_dob,
      c.classroom_code as classroom_code,
      c.grade_name,
      c.division_name
    FROM student_profiles sp
    JOIN enrollments e ON sp.user_id = e.student_id
    JOIN academic_years ay ON e.academic_year_id = ay.id
    JOIN classrooms c ON e.classroom_id = c.id
    WHERE sp.school_id = ?
      AND sp.dob_md IS NOT NULL
      AND sp.status = 'active'
      AND ay.status = 'current'
      AND e.status = 'active'
  `;
  
  const bindings: unknown[] = [params.schoolId];

  // Filter by classroom IDs (using IN clause for multiple)
  if (params.classroomIds && params.classroomIds.length > 0) {
    const placeholders = params.classroomIds.map(() => '?').join(',');
    query += ` AND e.classroom_id IN (${placeholders})`;
    bindings.push(...params.classroomIds);
  }

  // Filter by exact date (MM-DD)
  if (params.dobMd) {
    query += ` AND sp.dob_md = ?`;
    bindings.push(params.dobMd);
  }

  // Filter by month
  if (params.month !== undefined) {
    const monthStr = params.month.toString().padStart(2, '0');
    query += ` AND substr(sp.dob_md, 1, 2) = ?`;
    bindings.push(monthStr);
  }

  query += ` ORDER BY sp.dob_md, sp.first_name, sp.last_name`;

  const result = await db
    .prepare(query)
    .bind(...bindings)
    .all<StudentBirthday>();

  return result.results || [];
}

export async function findStudentBirthdaysInMonth(
  db: D1Database,
  schoolId: string,
  month: number,
  classroomId?: string
): Promise<StudentBirthday[]> {
  // Format month as MM (e.g., 09 for September)
  const monthStr = month.toString().padStart(2, '0');
  
  let query = `
    SELECT 
      sp.user_id,
      sp.student_code,
      sp.first_name,
      sp.middle_name,
      sp.last_name,
      sp.dob_md,
      sp.date_of_birth as full_dob,
      c.classroom_code as classroom_code,
      c.grade_name,
      c.division_name
    FROM student_profiles sp
    JOIN enrollments e ON sp.user_id = e.student_id
    JOIN academic_years ay ON e.academic_year_id = ay.id
    JOIN classrooms c ON e.classroom_id = c.id
    WHERE sp.school_id = ?
      AND sp.dob_md IS NOT NULL
      AND sp.status = 'active'
      AND ay.status = 'current'
      AND e.status = 'active'
      AND substr(sp.dob_md, 1, 2) = ?
  `;
  
  const bindings: unknown[] = [schoolId, monthStr];

  if (classroomId) {
    query += ` AND e.classroom_id = ?`;
    bindings.push(classroomId);
  }

  query += ` ORDER BY sp.dob_md, sp.first_name, sp.last_name`;

  const result = await db
    .prepare(query)
    .bind(...bindings)
    .all<StudentBirthday>();

  return result.results || [];
}

/**
 * Find classrooms where a teacher is the class teacher
 */
export async function findClassTeacherClassrooms(
  db: D1Database,
  teacherUserId: string,
  schoolId: string
): Promise<string[]> {
  const result = await db
    .prepare(
      `SELECT id
       FROM classrooms
       WHERE school_id = ? AND class_teacher_id = ?`
    )
    .bind(schoolId, teacherUserId)
    .all<{ id: string }>();

  return (result.results || []).map(r => r.id);
}

/**
 * Find all classrooms for a teacher (from teaching assignments)
 * 
 * Used for: Birthday listings, student access
 * Returns: Unique classroom IDs where teacher has any teaching assignment
 */
export async function findTeacherClassrooms(
  db: D1Database,
  teacherUserId: string,
  schoolId: string
): Promise<string[]> {
  const result = await db
    .prepare(
      `SELECT DISTINCT classroom_id
       FROM teaching_assignments
       WHERE school_id = ? AND teacher_id = ?`
    )
    .bind(schoolId, teacherUserId)
    .all<{ classroom_id: string }>();

  return (result.results || []).map(r => r.classroom_id);
}
