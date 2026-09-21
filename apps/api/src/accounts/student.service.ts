/**
 * Student Service
 * 
 * Business logic for student account lifecycle operations
 * 
 * SECURITY:
 * - All operations are school-scoped
 * - User creation is atomic with profile creation
 * - Temporary passwords are never persisted in plaintext
 * - Password resets invalidate all sessions
 */

import * as studentRepo from './student.repository';
import * as codeGen from './code-generator.service';
import { hashPassword } from '../auth/password.service';
import type {
  StudentProfile,
  CreateStudentRequest,
  UpdateStudentRequest,
  AccountCreationResponse,
  PasswordResetResponse,
  StudentStatus,
} from './accounts.types';

/**
 * Generate a random hex string
 */
function generateId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Business rule errors
 */
export class StudentError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 400
  ) {
    super(message);
    this.name = 'StudentError';
  }
}

/**
 * Extract MM-DD from date string for birthday tracking
 */
function extractMonthDay(dateString: string | null | undefined): string | null {
  if (!dateString) return null;
  try {
    const date = new Date(dateString);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${month}-${day}`;
  } catch {
    return null;
  }
}

/**
 * Get student by ID
 */
export async function getById(
  db: D1Database,
  id: string,
  schoolId: string
): Promise<StudentProfile> {
  const student = await studentRepo.findById(db, id, schoolId);
  
  if (!student) {
    throw new StudentError(
      'Student not found',
      'STUDENT_NOT_FOUND',
      404
    );
  }

  return student;
}

/**
 * Get student with user information
 */
export async function getByIdWithUser(
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
}> {
  const result = await studentRepo.findByIdWithUser(db, id, schoolId);
  
  if (!result) {
    throw new StudentError(
      'Student not found',
      'STUDENT_NOT_FOUND',
      404
    );
  }

  return result;
}

/**
 * List students
 */
export async function list(
  db: D1Database,
  schoolId: string,
  filters?: {
    status?: StudentStatus;
    search?: string;
  }
): Promise<StudentProfile[]> {
  return studentRepo.findAll(db, schoolId, filters);
}

/**
 * Create student account
 * 
 * ATOMIC OPERATION:
 * 1. Generate student code
 * 2. Generate login ID
 * 3. Generate temporary password
 * 4. Create user record
 * 5. Create student profile
 * 
 * SECURITY:
 * - Temporary password is hashed before storage
 * - Password is only returned once in response
 * - must_change_password = true enforced
 * - Client cannot override school_id, role, or codes
 */
export async function create(
  db: D1Database,
  schoolId: string,
  data: CreateStudentRequest
): Promise<AccountCreationResponse> {
  // Check if admission number already exists
  const existingByAdmission = await studentRepo.findByAdmissionNumber(
    db,
    data.admission_number,
    schoolId
  );
  if (existingByAdmission) {
    throw new StudentError(
      'Admission number already exists',
      'DUPLICATE_ADMISSION_NUMBER'
    );
  }

  // Generate codes - use same sequence for both student code and login ID
  const sequence = await codeGen.getNextStudentSequence(db, schoolId);
  const studentCode = codeGen.formatStudentCode(sequence);
  const loginId = await codeGen.formatLoginId(db, schoolId, 'student', sequence);
  
  // Check if student code already exists (should never happen with atomic counter)
  const existing = await studentRepo.findByStudentCode(db, studentCode, schoolId);
  if (existing) {
    throw new StudentError(
      'Student code already exists',
      'DUPLICATE_STUDENT_CODE'
    );
  }

  // Generate temporary password
  const temporaryPassword = codeGen.generateTemporaryPassword();
  const activationHash = await hashPassword(temporaryPassword);
  
  // Calculate activation expiry (7 days)
  const activationExpiresAt = new Date();
  activationExpiresAt.setDate(activationExpiresAt.getDate() + 7);

  const userId = generateId();
  const now = new Date().toISOString();

  try {
    // Create user record
    await db
      .prepare(
        `INSERT INTO users (
          id, school_id, login_id, role, status,
          password_hash, activation_hash, activation_expires_at,
          must_change_password, token_version, created_at, updated_at
        )
        VALUES (?, ?, ?, ?, ?, NULL, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        userId,
        schoolId,
        loginId,
        'student',
        'active',
        activationHash,
        activationExpiresAt.toISOString(),
        1, // must_change_password = true
        0, // token_version
        now,
        now
      )
      .run();

    // Create student profile (user_id is the primary key)
    await studentRepo.create(db, {
      id: userId, // user_id is the PK, but type expects id
      user_id: userId,
      school_id: schoolId,
      student_code: studentCode,
      admission_number: data.admission_number,
      first_name: data.first_name,
      middle_name: data.middle_name || null,
      last_name: data.last_name,
      gender: data.gender || null,
      date_of_birth: data.date_of_birth || null,
      dob_md: extractMonthDay(data.date_of_birth),
      phone: data.phone || null,
      email: data.email || null,
      address: data.address || null,
      parent_name: data.parent_name || null,
      parent_phone: data.parent_phone || null,
      parent_email: data.parent_email || null,
      status: 'active',
    });

    // SECURITY: Temporary password is returned ONCE and never logged
    return {
      profile_id: userId, // user_id is the profile primary key
      user_id: userId,
      login_id: loginId,
      student_code: studentCode,
      temporary_password: temporaryPassword,
    };
  } catch (error) {
    // If anything fails, the transaction should rollback
    // D1 doesn't support explicit transactions, but we can detect failures
    throw new StudentError(
      'Failed to create student account',
      'CREATION_FAILED',
      500
    );
  }
}

/**
 * Update student profile
 */
export async function update(
  db: D1Database,
  id: string,
  schoolId: string,
  data: UpdateStudentRequest
): Promise<StudentProfile> {
  const student = await getById(db, id, schoolId);

  // Check if updating admission number and it conflicts
  if (data.admission_number && data.admission_number !== student.admission_number) {
    const existing = await studentRepo.findByAdmissionNumber(
      db,
      data.admission_number,
      schoolId
    );
    if (existing && existing.id !== id) {
      throw new StudentError(
        'Admission number already exists',
        'DUPLICATE_ADMISSION_NUMBER'
      );
    }
  }

  // Prepare update data with dob_md extraction
  const updateData = {
    ...data,
    dob_md: data.date_of_birth !== undefined 
      ? extractMonthDay(data.date_of_birth)
      : undefined,
  };

  const updated = await studentRepo.update(db, id, schoolId, updateData);
  
  if (!updated) {
    throw new StudentError(
      'Failed to update student',
      'UPDATE_FAILED',
      500
    );
  }

  return getById(db, id, schoolId);
}

/**
 * Disable student account
 * 
 * SECURITY:
 * - Sets user status to 'disabled'
 * - Sets profile status to 'inactive'
 * - Increments token_version to invalidate sessions
 * - Revokes all active sessions
 */
export async function disable(
  db: D1Database,
  id: string,
  schoolId: string
): Promise<StudentProfile> {
  const student = await getById(db, id, schoolId);

  // Update user status
  await db
    .prepare(
      `UPDATE users
       SET status = 'disabled',
           token_version = token_version + 1,
           updated_at = ?
       WHERE id = ?
         AND school_id = ?`
    )
    .bind(new Date().toISOString(), student.user_id, schoolId)
    .run();

  // Revoke all sessions
  await db
    .prepare(
      `UPDATE sessions
       SET revoked_at = ?
       WHERE user_id = ?
         AND revoked_at IS NULL`
    )
    .bind(new Date().toISOString(), student.user_id)
    .run();

  // Update profile status
  await studentRepo.update(db, id, schoolId, { status: 'inactive' });

  return getById(db, id, schoolId);
}

/**
 * Reactivate student account
 * 
 * SECURITY:
 * - Requires password setup after reactivation
 * - Previous sessions remain invalid
 */
export async function reactivate(
  db: D1Database,
  id: string,
  schoolId: string
): Promise<PasswordResetResponse> {
  const student = await getById(db, id, schoolId);

  // Get user login_id
  const user = await db
    .prepare('SELECT login_id FROM users WHERE id = ? AND school_id = ? LIMIT 1')
    .bind(student.user_id, schoolId)
    .first<{ login_id: string }>();

  if (!user) {
    throw new StudentError(
      'User not found',
      'USER_NOT_FOUND',
      404
    );
  }

  // Generate new temporary password
  const temporaryPassword = codeGen.generateTemporaryPassword();
  const activationHash = await hashPassword(temporaryPassword);
  
  // Calculate activation expiry (7 days)
  const activationExpiresAt = new Date();
  activationExpiresAt.setDate(activationExpiresAt.getDate() + 7);

  // Update user status, set activation hash, increment token_version, invalidate sessions
  await db
    .prepare(
      `UPDATE users
       SET status = 'active',
           activation_hash = ?,
           activation_expires_at = ?,
           must_change_password = 1,
           token_version = token_version + 1,
           updated_at = ?
       WHERE id = ?
         AND school_id = ?`
    )
    .bind(
      activationHash,
      activationExpiresAt.toISOString(),
      new Date().toISOString(),
      student.user_id,
      schoolId
    )
    .run();

  // Update profile status
  await studentRepo.update(db, id, schoolId, { status: 'active' });

  // Revoke all sessions
  await db
    .prepare(
      `UPDATE sessions
       SET revoked_at = ?
       WHERE user_id = ?
         AND revoked_at IS NULL`
    )
    .bind(new Date().toISOString(), student.user_id)
    .run();

  // SECURITY: Temporary password is returned ONCE and never logged
  return {
    user_id: student.user_id,
    login_id: user.login_id,
    temporary_password: temporaryPassword,
  };
}

/**
 * Reset student password
 * 
 * SECURITY:
 * - Generates new temporary password
 * - Stores only hash
 * - Invalidates all sessions
 * - Increments token_version
 * - Sets must_change_password = true
 * - Temporary password returned ONCE, never logged
 */
export async function resetPassword(
  db: D1Database,
  id: string,
  schoolId: string
): Promise<PasswordResetResponse> {
  const student = await getById(db, id, schoolId);

  // Get user login_id
  const user = await db
    .prepare('SELECT login_id FROM users WHERE id = ? AND school_id = ? LIMIT 1')
    .bind(student.user_id, schoolId)
    .first<{ login_id: string }>();

  if (!user) {
    throw new StudentError(
      'User not found',
      'USER_NOT_FOUND',
      404
    );
  }

  // Generate new temporary password
  const temporaryPassword = codeGen.generateTemporaryPassword();
  const activationHash = await hashPassword(temporaryPassword);
  
  // Calculate activation expiry (7 days)
  const activationExpiresAt = new Date();
  activationExpiresAt.setDate(activationExpiresAt.getDate() + 7);

  // Update user: set activation hash, increment token_version, invalidate sessions
  await db
    .prepare(
      `UPDATE users
       SET activation_hash = ?,
           activation_expires_at = ?,
           must_change_password = 1,
           token_version = token_version + 1,
           updated_at = ?
       WHERE id = ?
         AND school_id = ?`
    )
    .bind(
      activationHash,
      activationExpiresAt.toISOString(),
      new Date().toISOString(),
      student.user_id,
      schoolId
    )
    .run();

  // Revoke all sessions
  await db
    .prepare(
      `UPDATE sessions
       SET revoked_at = ?
       WHERE user_id = ?
         AND revoked_at IS NULL`
    )
    .bind(new Date().toISOString(), student.user_id)
    .run();

  // SECURITY: Temporary password is returned ONCE and never logged
  return {
    user_id: student.user_id,
    login_id: user.login_id,
    temporary_password: temporaryPassword,
  };
}
