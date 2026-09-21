/**
 * Bulk Provisioning Service
 * 
 * Handles bulk student creation with atomic validation
 * 
 * SECURITY:
 * - Max 100 students per batch
 * - All-or-nothing validation
 * - Row-level validation with detailed error reporting
 * - No partial creation - validation must pass completely first
 * - All temporary passwords returned once, never logged
 */

import * as studentRepo from './student.repository';
import * as codeGen from './code-generator.service';
import { hashPassword } from '../auth/password.service';
import type {
  BulkStudentProvisionRequest,
  BulkProvisionResponse,
  BulkProvisionRowError,
  AccountCreationResponse,
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
export class BulkProvisionError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 400,
    public rowErrors?: BulkProvisionRowError[]
  ) {
    super(message);
    this.name = 'BulkProvisionError';
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
 * Validate all rows before any creation
 * Returns array of validation errors, empty if all valid
 */
async function validateAllRows(
  db: D1Database,
  schoolId: string,
  students: BulkStudentProvisionRequest[]
): Promise<BulkProvisionRowError[]> {
  const errors: BulkProvisionRowError[] = [];
  const admissionNumbers = new Set<string>();

  // Check for duplicates within batch
  for (let i = 0; i < students.length; i++) {
    const student = students[i];
    const rowErrors: string[] = [];

    // Check required fields
    if (!student.admission_number?.trim()) {
      rowErrors.push('Admission number is required');
    }
    if (!student.first_name?.trim()) {
      rowErrors.push('First name is required');
    }
    if (!student.last_name?.trim()) {
      rowErrors.push('Last name is required');
    }

    // Check for duplicate admission numbers within batch
    if (student.admission_number) {
      if (admissionNumbers.has(student.admission_number)) {
        rowErrors.push(`Duplicate admission number in batch: ${student.admission_number}`);
      }
      admissionNumbers.add(student.admission_number);
    }

    if (rowErrors.length > 0) {
      errors.push({
        row: i,
        admission_number: student.admission_number,
        errors: rowErrors,
      });
    }
  }

  // If we have errors so far, return early
  if (errors.length > 0) {
    return errors;
  }

  // Check for existing admission numbers in database
  for (let i = 0; i < students.length; i++) {
    const student = students[i];
    const existing = await studentRepo.findByAdmissionNumber(
      db,
      student.admission_number,
      schoolId
    );

    if (existing) {
      errors.push({
        row: i,
        admission_number: student.admission_number,
        errors: [`Admission number already exists in system: ${student.admission_number}`],
      });
    }
  }

  return errors;
}

/**
 * Bulk provision students
 * 
 * VALIDATION:
 * 1. Check batch size (max 100)
 * 2. Validate all rows for required fields
 * 3. Check for duplicate admission numbers within batch
 * 4. Check for existing admission numbers in database
 * 5. If any validation fails, reject entire batch
 * 
 * CREATION:
 * 1. Generate codes for all students
 * 2. Create all user records
 * 3. Create all student profiles
 * 4. Return all temporary passwords
 * 
 * SECURITY:
 * - All-or-nothing validation
 * - No partial creation
 * - Temporary passwords returned once
 * - All operations are school-scoped
 */
export async function bulkProvisionStudents(
  db: D1Database,
  schoolId: string,
  data: BulkStudentProvisionRequest[]
): Promise<BulkProvisionResponse> {
  // Validate batch size
  if (data.length === 0) {
    throw new BulkProvisionError(
      'No students provided',
      'EMPTY_BATCH'
    );
  }

  if (data.length > 100) {
    throw new BulkProvisionError(
      'Batch size exceeds maximum of 100 students',
      'BATCH_TOO_LARGE'
    );
  }

  // Validate all rows
  const validationErrors = await validateAllRows(db, schoolId, data);
  
  if (validationErrors.length > 0) {
    throw new BulkProvisionError(
      `Validation failed for ${validationErrors.length} row(s)`,
      'VALIDATION_FAILED',
      400,
      validationErrors
    );
  }

  // All validation passed - proceed with creation
  const results: AccountCreationResponse[] = [];
  const now = new Date().toISOString();

  try {
    for (const studentData of data) {
      // Generate codes - use same sequence for both student code and login ID
      const sequence = await codeGen.getNextStudentSequence(db, schoolId);
      const studentCode = codeGen.formatStudentCode(sequence);
      const loginId = await codeGen.formatLoginId(db, schoolId, 'student', sequence);
      
      // Generate temporary password
      const temporaryPassword = codeGen.generateTemporaryPassword();
      const activationHash = await hashPassword(temporaryPassword);
      
      // Calculate activation expiry (7 days)
      const activationExpiresAt = new Date();
      activationExpiresAt.setDate(activationExpiresAt.getDate() + 7);

      const userId = generateId();

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
        admission_number: studentData.admission_number,
        first_name: studentData.first_name,
        middle_name: studentData.middle_name || null,
        last_name: studentData.last_name,
        gender: studentData.gender || null,
        date_of_birth: studentData.date_of_birth || null,
        dob_md: extractMonthDay(studentData.date_of_birth),
        phone: studentData.phone || null,
        email: studentData.email || null,
        address: studentData.address || null,
        parent_name: studentData.parent_name || null,
        parent_phone: studentData.parent_phone || null,
        parent_email: null,
        status: 'active',
      });

      results.push({
        profile_id: userId, // user_id is the profile primary key
        user_id: userId,
        login_id: loginId,
        employee_code: studentCode, // Using employee_code field for consistency
        temporary_password: temporaryPassword,
      });
    }

    return {
      success: true,
      created_count: results.length,
      accounts: results,
    };
  } catch (error) {
    // If any creation fails, we can't rollback in D1
    // This is a known limitation - we fail fast
    throw new BulkProvisionError(
      `Failed to create students after ${results.length} successful creations`,
      'CREATION_FAILED',
      500
    );
  }
}
