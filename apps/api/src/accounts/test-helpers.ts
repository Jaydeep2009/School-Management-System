/**
 * Test helpers for account management tests
 * Uses real D1 database from Cloudflare Workers test environment
 */
import { env } from 'cloudflare:workers';
import { ulid } from 'ulidx';
import { hashPassword } from '../auth/password.service';

// Type assertion for test environment
const testEnv = env as unknown as { DB: D1Database };

/**
 * Get the real D1 database binding from test environment
 */
export function getDb() {
  return testEnv.DB;
}

/**
 * Create a test school with code counters
 */
export async function createTestSchool(data?: {
  code?: string;
  name?: string;
}) {
  const db = getDb();
  const school = {
    id: ulid(),
    code: data?.code || 'TEST',
    name: data?.name || 'Test School',
    timezone: 'Asia/Kolkata',
    phone: '1234567890',
    email: 'test@school.com',
    address: 'Test Address',
    status: 'active',
    settings: '{}',
    created_at: Date.now(),
    updated_at: Date.now(),
  };

  await db
    .prepare(
      `INSERT INTO schools (id, code, name, timezone, phone, email, address, status, settings, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      school.id,
      school.code,
      school.name,
      school.timezone,
      school.phone,
      school.email,
      school.address,
      school.status,
      school.settings,
      school.created_at,
      school.updated_at
    )
    .run();

  // Initialize code counters for the school
  await db.batch([
    db
      .prepare(
        `INSERT INTO code_counters (school_id, kind, last_number) VALUES (?, ?, ?)`
      )
      .bind(school.id, 'principal', 0),
    db
      .prepare(
        `INSERT INTO code_counters (school_id, kind, last_number) VALUES (?, ?, ?)`
      )
      .bind(school.id, 'teacher', 0),
    db
      .prepare(
        `INSERT INTO code_counters (school_id, kind, last_number) VALUES (?, ?, ?)`
      )
      .bind(school.id, 'student', 0),
  ]);

  return school;
}

/**
 * Create a test user with hashed password
 */
export async function createTestUser(data: {
  school_id: string;
  role: 'principal' | 'teacher' | 'student';
  login_id: string;
  password?: string;
  status?: 'active' | 'disabled';
}) {
  const db = getDb();
  const password = data.password || 'Test123!@#';
  const passwordHash = await hashPassword(password);

  const user = {
    id: ulid(),
    school_id: data.school_id,
    login_id: data.login_id,
    role: data.role,
    password_hash: passwordHash,
    activation_hash: null,
    activation_expires_at: null,
    status: data.status || 'active',
    token_version: 0,
    must_change_password: 0,
    last_login_at: null,
    created_at: Date.now(),
    updated_at: Date.now(),
  };

  await db
    .prepare(
      `INSERT INTO users (id, school_id, login_id, role, password_hash, activation_hash, activation_expires_at, 
                          status, token_version, must_change_password, last_login_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      user.id,
      user.school_id,
      user.login_id,
      user.role,
      user.password_hash,
      user.activation_hash,
      user.activation_expires_at,
      user.status,
      user.token_version,
      user.must_change_password,
      user.last_login_at,
      user.created_at,
      user.updated_at
    )
    .run();

  return { user, password };
}

/**
 * Create a test teacher profile
 */
export async function createTestTeacherProfile(data: {
  user_id: string;
  school_id: string;
  employee_code: string;
  first_name: string;
  last_name: string;
}) {
  const db = getDb();

  const profile = {
    user_id: data.user_id,
    school_id: data.school_id,
    employee_code: data.employee_code,
    first_name: data.first_name,
    middle_name: null,
    last_name: data.last_name,
    phone: null,
    date_of_birth: null,
    dob_md: null,
    joining_date: null,
    status: 'active',
    created_at: Date.now(),
    updated_at: Date.now(),
  };

  await db
    .prepare(
      `INSERT INTO teacher_profiles (user_id, school_id, employee_code, first_name, middle_name, last_name,
                                      phone, date_of_birth, dob_md, joining_date, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      profile.user_id,
      profile.school_id,
      profile.employee_code,
      profile.first_name,
      profile.middle_name,
      profile.last_name,
      profile.phone,
      profile.date_of_birth,
      profile.dob_md,
      profile.joining_date,
      profile.status,
      profile.created_at,
      profile.updated_at
    )
    .run();

  return profile;
}

/**
 * Create a test student profile
 */
export async function createTestStudentProfile(data: {
  user_id: string;
  school_id: string;
  student_code: string;
  admission_number: string;
  first_name: string;
  last_name: string;
}) {
  const db = getDb();

  const profile = {
    user_id: data.user_id,
    school_id: data.school_id,
    student_code: data.student_code,
    admission_number: data.admission_number,
    first_name: data.first_name,
    middle_name: null,
    last_name: data.last_name,
    gender: null,
    date_of_birth: null,
    dob_md: null,
    phone: null,
    email: null,
    address: null,
    parent_name: null,
    parent_phone: null,
    parent_email: null,
    status: 'active',
    created_at: Date.now(),
    updated_at: Date.now(),
  };

  await db
    .prepare(
      `INSERT INTO student_profiles (user_id, school_id, student_code, admission_number, first_name, middle_name, last_name,
                                      gender, date_of_birth, dob_md, phone, email, address, parent_name, parent_phone, parent_email,
                                      status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      profile.user_id,
      profile.school_id,
      profile.student_code,
      profile.admission_number,
      profile.first_name,
      profile.middle_name,
      profile.last_name,
      profile.gender,
      profile.date_of_birth,
      profile.dob_md,
      profile.phone,
      profile.email,
      profile.address,
      profile.parent_name,
      profile.parent_phone,
      profile.parent_email,
      profile.status,
      profile.created_at,
      profile.updated_at
    )
    .run();

  return profile;
}

/**
 * Increment a code counter and return the new value
 */
export async function incrementCodeCounter(
  school_id: string,
  kind: 'principal' | 'teacher' | 'student'
): Promise<number> {
  const db = getDb();

  await db
    .prepare(
      `UPDATE code_counters SET last_number = last_number + 1 
       WHERE school_id = ? AND kind = ?`
    )
    .bind(school_id, kind)
    .run();

  const result = await db
    .prepare(
      `SELECT last_number FROM code_counters 
       WHERE school_id = ? AND kind = ?`
    )
    .bind(school_id, kind)
    .first<{ last_number: number }>();

  return result!.last_number;
}

/**
 * Create a tenant context for testing
 */
export function createTenantContext(
  role: 'principal' | 'teacher' | 'student',
  schoolId: string,
  userId: string
) {
  return {
    userId,
    schoolId,
    role,
  };
}

/**
 * Validate temporary password format (XXXX-XXXX-XXXX-XXXX format, 19 chars)
 */
export function isValidTemporaryPasswordFormat(password: string): boolean {
  if (!password) {
    return false;
  }

  // Format: XXXX-XXXX-XXXX-XXXX (4 groups of 4 uppercase alphanumeric chars)
  const pattern = /^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/;
  return pattern.test(password);
}
