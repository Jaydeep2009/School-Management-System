/**
 * Code Generator Service
 * 
 * Generates stable, sequential codes for teachers and students using code_counters table
 * 
 * Format:
 * - Teacher: T000001, T000002, ...
 * - Student: S000001, S000002, ...
 * 
 * Login ID Format: <SCHOOLCODE>-<ROLELETTER>-<6-digit sequence>
 * - Teacher: GPS-T-000001
 * - Student: GPS-S-000123
 */

export type CodeType = 'teacher' | 'student';

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
 * Get next teacher sequence number (increments counter)
 */
export async function getNextTeacherSequence(
  db: D1Database,
  schoolId: string
): Promise<number> {
  return await getNextSequence(db, schoolId, 'teacher');
}

/**
 * Get next student sequence number (increments counter)
 */
export async function getNextStudentSequence(
  db: D1Database,
  schoolId: string
): Promise<number> {
  return await getNextSequence(db, schoolId, 'student');
}

/**
 * Format employee code from sequence number
 * Format: T000001
 */
export function formatEmployeeCode(sequence: number): string {
  return `T${sequence.toString().padStart(6, '0')}`;
}

/**
 * Format student code from sequence number
 * Format: S000001
 */
export function formatStudentCode(sequence: number): string {
  return `S${sequence.toString().padStart(6, '0')}`;
}

/**
 * Format login ID from sequence number
 * Format: <SCHOOLCODE>-<ROLELETTER>-<6-digit sequence>
 */
export async function formatLoginId(
  db: D1Database,
  schoolId: string,
  role: 'teacher' | 'student',
  sequence: number
): Promise<string> {
  // Get school code
  const school = await db
    .prepare('SELECT code FROM schools WHERE id = ? LIMIT 1')
    .bind(schoolId)
    .first<{ code: string }>();
  
  if (!school) {
    throw new Error('School not found');
  }

  const roleLetter = role === 'teacher' ? 'T' : 'S';
  return `${school.code}-${roleLetter}-${sequence.toString().padStart(6, '0')}`;
}

/**
 * Generate the next employee code for a teacher (DEPRECATED - use getNextTeacherSequence + formatEmployeeCode)
 * Format: T000001
 */
export async function generateEmployeeCode(
  db: D1Database,
  schoolId: string
): Promise<string> {
  const sequence = await getNextSequence(db, schoolId, 'teacher');
  return `T${sequence.toString().padStart(6, '0')}`;
}

/**
 * Generate the next student code for a student
 * Format: S000001
 */
export async function generateStudentCode(
  db: D1Database,
  schoolId: string
): Promise<string> {
  const sequence = await getNextSequence(db, schoolId, 'student');
  return `S${sequence.toString().padStart(6, '0')}`;
}

/**
 * Generate login ID for a user
 * Format: <SCHOOLCODE>-<ROLELETTER>-<6-digit sequence>
 * 
 * Examples:
 * - GPS-T-000001 (teacher)
 * - GPS-S-000123 (student)
 */
export async function generateLoginId(
  db: D1Database,
  schoolId: string,
  role: 'teacher' | 'student'
): Promise<string> {
  // Get school code
  const school = await db
    .prepare('SELECT code FROM schools WHERE id = ? LIMIT 1')
    .bind(schoolId)
    .first<{ code: string }>();
  
  if (!school) {
    throw new Error('School not found');
  }

  const sequence = await getNextSequence(db, schoolId, role);
  const roleLetter = role === 'teacher' ? 'T' : 'S';
  
  return `${school.code}-${roleLetter}-${sequence.toString().padStart(6, '0')}`;
}

/**
 * Get next sequence number from code_counters table
 * 
 * SECURITY: This operation is atomic and school-scoped
 */
async function getNextSequence(
  db: D1Database,
  schoolId: string,
  codeType: CodeType
): Promise<number> {
  // Try to increment existing counter
  const result = await db
    .prepare(
      `UPDATE code_counters
       SET last_number = last_number + 1
       WHERE school_id = ?
         AND kind = ?
       RETURNING last_number`
    )
    .bind(schoolId, codeType)
    .first<{ last_number: number }>();

  if (result) {
    return result.last_number;
  }

  // Counter doesn't exist, create it  
  try {
    await db
      .prepare(
        `INSERT INTO code_counters (school_id, kind, last_number)
         VALUES (?, ?, ?)`
      )
      .bind(schoolId, codeType, 1)
      .run();
    
    return 1;
  } catch (error) {
    // Race condition: another request created it, try update again
    const retryResult = await db
      .prepare(
        `UPDATE code_counters
         SET last_number = last_number + 1
         WHERE school_id = ?
           AND kind = ?
         RETURNING last_number`
      )
      .bind(schoolId, codeType)
      .first<{ last_number: number}>();
    
    if (retryResult) {
      return retryResult.last_number;
    }

    throw new Error('Failed to generate sequence number');
  }
}

/**
 * Generate a secure temporary password for activation
 * 
 * SECURITY: This is never persisted in plaintext
 * Returns a cryptographically random password
 */
export function generateTemporaryPassword(): string {
  // Generate a secure random password
  // Format: 4 groups of 4 characters (easier to communicate)
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Removed ambiguous chars
  const groups = 4;
  const groupSize = 4;
  
  const parts: string[] = [];
  for (let i = 0; i < groups; i++) {
    let group = '';
    for (let j = 0; j < groupSize; j++) {
      const randomBytes = crypto.getRandomValues(new Uint8Array(1));
      const randomIndex = randomBytes[0] % chars.length;
      group += chars[randomIndex];
    }
    parts.push(group);
  }
  
  return parts.join('-'); // e.g., "ABCD-EFGH-JKLM-NPQR"
}

/**
 * Generate a predictable temporary password based on student/teacher information
 * This makes it easy for principals to share credentials without manual communication
 * 
 * Formula: {ADMISSION_NUMBER}@{SCHOOL_CODE}
 * Example: ADM001@GPS or 12345@GPS
 * 
 * For teachers: {EMPLOYEE_CODE}@{SCHOOL_CODE}
 * Example: T000001@GPS
 * 
 * NOTE: Users MUST change password on first login (must_change_password = true)
 */
export function generatePredictablePassword(
  identifier: string, // admission_number or employee_code
  schoolCode: string
): string {
  return `${identifier}@${schoolCode}`;
}

/**
 * Verify a code format is valid
 * 
 * Teacher codes: T000001-T999999
 * Student codes: S000001-S999999
 */
export function isValidEmployeeCode(code: string): boolean {
  return /^T\d{6}$/.test(code);
}

export function isValidStudentCode(code: string): boolean {
  return /^S\d{6}$/.test(code);
}

/**
 * Verify a login ID format is valid
 * 
 * Format: <SCHOOLCODE>-<ROLELETTER>-<6-digit sequence>
 */
export function isValidLoginId(loginId: string): boolean {
  return /^[A-Z0-9]+-[TS]-\d{6}$/.test(loginId);
}
