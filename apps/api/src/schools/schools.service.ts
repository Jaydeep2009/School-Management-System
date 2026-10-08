/**
 * School Management Service
 * 
 * Business logic for Super Admin school management and Principal provisioning
 */

import type { SuperAdminContext } from '../auth/auth.types';
import type {
  School,
  SchoolWithSettings,
  SchoolWithDetails,
  CreateSchoolRequest,
  UpdateSchoolRequest,
  CreatePrincipalRequest,
  PrincipalCreationResponse,
  SchoolFilters,
} from './schools.types';
import * as schoolsRepo from './schools.repository';
import * as schoolsAuthz from './schools.authorization';
import * as codeGen from '../accounts/code-generator.service';
import { SchoolError } from './schools.errors';
import { logAudit } from '../lib/audit/audit.service';
import { hashPassword } from '../auth/password.service';

/**
 * Generate a random ID
 */
function generateId(): string {
  return crypto.randomUUID();
}

/**
 * Parse school settings JSON
 */
function parseSchoolSettings(school: School): SchoolWithSettings {
  let settings: Record<string, unknown> = {};
  
  try {
    settings = JSON.parse(school.settings);
  } catch {
    settings = {};
  }

  return {
    ...school,
    settings,
  };
}

/**
 * =====================================================================
 * SCHOOL CRUD
 * =====================================================================
 */

/**
 * Create school
 * SECURITY: Super Admin only
 */
export async function createSchool(
  db: D1Database,
  data: CreateSchoolRequest,
  tenant: SuperAdminContext
): Promise<SchoolWithSettings> {
  schoolsAuthz.ensureSuperAdmin(tenant);

  // Normalize code to uppercase
  const code = data.code.toUpperCase();

  // Check if school code already exists
  const existing = await schoolsRepo.findByCode(db, code);
  if (existing) {
    throw SchoolError.duplicateSchoolCode(code);
  }

  const schoolId = generateId();
  const settings = JSON.stringify(data.settings || {});

  const school = await schoolsRepo.create(db, {
    id: schoolId,
    code,
    name: data.name,
    timezone: data.timezone || 'Asia/Kolkata',
    phone: data.phone || null,
    email: data.email || null,
    address: data.address || null,
    status: 'active',
    settings,
  });

  await logAudit(db, tenant as any, 'school_created', 'school', schoolId, null, school);

  return parseSchoolSettings(school);
}

/**
 * List schools
 * SECURITY: Super Admin only
 */
export async function listSchools(
  db: D1Database,
  filters: SchoolFilters,
  tenant: SuperAdminContext
): Promise<SchoolWithSettings[]> {
  schoolsAuthz.ensureSuperAdmin(tenant);

  const schools = await schoolsRepo.findAll(db, filters);
  return schools.map(parseSchoolSettings);
}

/**
 * Get school by ID
 * SECURITY: Super Admin only
 * Includes principal details if available
 */
export async function getSchool(
  db: D1Database,
  schoolId: string,
  tenant: SuperAdminContext
): Promise<SchoolWithDetails> {
  schoolsAuthz.ensureSuperAdmin(tenant);

  const school = await schoolsRepo.findById(db, schoolId);
  if (!school) {
    throw SchoolError.schoolNotFound(schoolId);
  }

  // Get principal details
  const principal = await schoolsRepo.findPrincipalBySchoolId(db, schoolId);

  return {
    ...parseSchoolSettings(school),
    principal,
  };
}

/**
 * Update school
 * SECURITY: Super Admin only
 */
export async function updateSchool(
  db: D1Database,
  schoolId: string,
  data: UpdateSchoolRequest,
  tenant: SuperAdminContext
): Promise<SchoolWithSettings> {
  schoolsAuthz.ensureSuperAdmin(tenant);

  const before = await schoolsRepo.findById(db, schoolId);
  if (!before) {
    throw SchoolError.schoolNotFound(schoolId);
  }

  const settings = data.settings ? JSON.stringify(data.settings) : undefined;

  await schoolsRepo.update(db, schoolId, {
    name: data.name,
    timezone: data.timezone,
    phone: data.phone || null,
    email: data.email || null,
    address: data.address || null,
    settings,
  });

  const after = await schoolsRepo.findById(db, schoolId);
  if (!after) {
    throw SchoolError.schoolNotFound(schoolId);
  }

  await logAudit(db, tenant as any, 'school_updated', 'school', schoolId, before, after);

  return parseSchoolSettings(after);
}

/**
 * =====================================================================
 * SCHOOL LIFECYCLE
 * =====================================================================
 */

/**
 * Suspend school
 * SECURITY: Super Admin only
 * 
 * Suspended schools prevent user authentication
 */
export async function suspendSchool(
  db: D1Database,
  schoolId: string,
  tenant: SuperAdminContext
): Promise<SchoolWithSettings> {
  schoolsAuthz.ensureSuperAdmin(tenant);

  const before = await schoolsRepo.findById(db, schoolId);
  if (!before) {
    throw SchoolError.schoolNotFound(schoolId);
  }

  if (before.status === 'archived') {
    throw SchoolError.invalidSchoolStatus(before.status, 'active');
  }

  await schoolsRepo.updateStatus(db, schoolId, 'suspended');

  const after = await schoolsRepo.findById(db, schoolId);
  if (!after) {
    throw SchoolError.schoolNotFound(schoolId);
  }

  await logAudit(db, tenant as any, 'school_suspended', 'school', schoolId, before, after);

  return parseSchoolSettings(after);
}

/**
 * Activate school (unsuspend)
 * SECURITY: Super Admin only
 */
export async function activateSchool(
  db: D1Database,
  schoolId: string,
  tenant: SuperAdminContext
): Promise<SchoolWithSettings> {
  schoolsAuthz.ensureSuperAdmin(tenant);

  const before = await schoolsRepo.findById(db, schoolId);
  if (!before) {
    throw SchoolError.schoolNotFound(schoolId);
  }

  if (before.status === 'archived') {
    throw SchoolError.invalidSchoolStatus(before.status, 'suspended');
  }

  await schoolsRepo.updateStatus(db, schoolId, 'active');

  const after = await schoolsRepo.findById(db, schoolId);
  if (!after) {
    throw SchoolError.schoolNotFound(schoolId);
  }

  await logAudit(db, tenant as any, 'school_activated', 'school', schoolId, before, after);

  return parseSchoolSettings(after);
}

/**
 * Archive school
 * SECURITY: Super Admin only
 * 
 * Archived schools are terminal - no restoration
 * Historical data is preserved
 */
export async function archiveSchool(
  db: D1Database,
  schoolId: string,
  tenant: SuperAdminContext
): Promise<SchoolWithSettings> {
  schoolsAuthz.ensureSuperAdmin(tenant);

  const before = await schoolsRepo.findById(db, schoolId);
  if (!before) {
    throw SchoolError.schoolNotFound(schoolId);
  }

  await schoolsRepo.updateStatus(db, schoolId, 'archived');

  const after = await schoolsRepo.findById(db, schoolId);
  if (!after) {
    throw SchoolError.schoolNotFound(schoolId);
  }

  await logAudit(db, tenant as any, 'school_archived', 'school', schoolId, before, after);

  return parseSchoolSettings(after);
}

/**
 * =====================================================================
 * PRINCIPAL PROVISIONING
 * =====================================================================
 */

/**
 * Create first Principal for school
 * SECURITY: Super Admin only
 * 
 * Creates Principal user + teacher_profile
 * Returns temporary password ONCE
 */
export async function createPrincipal(
  db: D1Database,
  schoolId: string,
  data: CreatePrincipalRequest,
  tenant: SuperAdminContext
): Promise<PrincipalCreationResponse> {
  schoolsAuthz.ensureSuperAdmin(tenant);

  // Verify school exists and is active
  const school = await schoolsRepo.findById(db, schoolId);
  if (!school) {
    throw SchoolError.schoolNotFound(schoolId);
  }

  if (school.status !== 'active') {
    throw SchoolError.schoolNotActive(schoolId);
  }

  // Check if active Principal already exists
  const hasActivePrincipal = await schoolsRepo.hasActivePrincipal(db, schoolId);
  if (hasActivePrincipal) {
    throw SchoolError.principalAlreadyExists(schoolId);
  }

  // Generate login ID sequence
  const sequence = await getNextPrincipalSequence(db, schoolId);
  
  // Get school code for login ID
  const schoolRecord = await db
    .prepare('SELECT code FROM schools WHERE id = ? LIMIT 1')
    .bind(schoolId)
    .first<{ code: string }>();
  
  if (!schoolRecord) {
    throw SchoolError.schoolNotFound(schoolId);
  }
  
  const loginId = `${schoolRecord.code}-P-${sequence.toString().padStart(6, '0')}`;

  // Generate temporary password
  const temporaryPassword = codeGen.generateTemporaryPassword();
  const activationHash = await hashPassword(temporaryPassword);

  // Calculate activation expiry (7 days)
  const activationExpiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000;

  const userId = generateId();
  const now = Date.now();

  try {
    // Create user record ONLY (Principal does NOT have a profile table)
    await db
      .prepare(
        `INSERT INTO users (
          id, school_id, login_id, role, status,
          password_hash, activation_hash, activation_expires_at,
          must_change_password, token_version, created_at, updated_at
        )
        VALUES (?, ?, ?, 'principal', 'active', NULL, ?, ?, 1, 0, ?, ?)`
      )
      .bind(
        userId,
        schoolId,
        loginId,
        activationHash,
        activationExpiresAt,
        now,
        now
      )
      .run();

    await logAudit(db, tenant as any, 'principal_created', 'user', userId, null, {
      user_id: userId,
      login_id: loginId,
      role: 'principal',
      school_id: schoolId,
      full_name: data.full_name,
      date_of_birth: data.date_of_birth,
      gender: data.gender,
    });

    // SECURITY: Temporary password returned ONCE, never logged
    return {
      user_id: userId,
      login_id: loginId,
      temporary_password: temporaryPassword,
    };
  } catch (error) {
    throw new SchoolError(
      'Failed to create Principal account',
      'PRINCIPAL_CREATION_FAILED',
      500
    );
  }
}

/**
 * Get next sequence for Principal code generation
 * Similar to teacher/student sequence generation
 */
async function getNextPrincipalSequence(
  db: D1Database,
  schoolId: string
): Promise<number> {
  // Try to increment existing counter
  const result = await db
    .prepare(
      `UPDATE code_counters
       SET last_number = last_number + 1
       WHERE school_id = ?
         AND kind = 'principal'
       RETURNING last_number`
    )
    .bind(schoolId)
    .first<{ last_number: number }>();

  if (result) {
    return result.last_number;
  }

  // Counter doesn't exist, create it
  try {
    await db
      .prepare(
        `INSERT INTO code_counters (school_id, kind, last_number)
         VALUES (?, 'principal', ?)`
      )
      .bind(schoolId, 1)
      .run();

    return 1;
  } catch (error) {
    // Race condition: another request created it, try update again
    const retryResult = await db
      .prepare(
        `UPDATE code_counters
         SET last_number = last_number + 1
         WHERE school_id = ?
           AND kind = 'principal'
         RETURNING last_number`
      )
      .bind(schoolId)
      .first<{ last_number: number }>();

    if (retryResult) {
      return retryResult.last_number;
    }

    throw new Error('Failed to generate sequence number');
  }
}


/**
 * Delete school and ALL associated data (DANGEROUS OPERATION)
 * 
 * This permanently deletes:
 * - The school record
 * - All users (students, teachers, principal)
 * - All academic data (academic years, classrooms, subjects, enrollments)
 * - All attendance records
 * - All marks and assessments
 * - All assignments
 * - All fee records
 * - All timetables
 * - All teaching assignments
 * - All audit logs
 * 
 * SECURITY: Super Admin only
 * Requires school name confirmation to prevent accidental deletion
 * 
 * @param db - Database connection
 * @param schoolId - ID of school to delete
 * @param confirmSchoolName - Exact school name for confirmation
 * @param tenant - Super Admin context
 * @returns Deletion summary with counts
 */
export async function deleteSchool(
  db: D1Database,
  schoolId: string,
  confirmSchoolName: string,
  tenant: { role: string; userId: string }
): Promise<{
  schoolId: string;
  schoolName: string;
  deletedCounts: {
    users: number;
    students: number;
    teachers: number;
    academicYears: number;
    classrooms: number;
    subjects: number;
    enrollments: number;
    attendance: number;
    marks: number;
    assessments: number;
    assignments: number;
    fees: number;
    timetables: number;
    teachingAssignments: number;
    auditLogs: number;
  };
}> {
  console.log(`[deleteSchool] Starting deletion for school ID: ${schoolId}`);
  
  // Verify school exists
  let school;
  try {
    school = await schoolsRepo.findById(db, schoolId);
    console.log(`[deleteSchool] School found:`, school?.name);
  } catch (error) {
    console.error('[deleteSchool] Error finding school:', error);
    throw SchoolError.schoolNotFound();
  }
  
  if (!school) {
    console.error('[deleteSchool] School not found');
    throw SchoolError.schoolNotFound();
  }

  // Verify school name matches (case-insensitive)
  console.log(`[deleteSchool] Comparing names: "${school.name}" vs "${confirmSchoolName}"`);
  if (school.name.toLowerCase() !== confirmSchoolName.toLowerCase()) {
    console.error('[deleteSchool] School name mismatch');
    throw new SchoolError(
      'School name confirmation does not match. Please provide the exact school name.',
      'SCHOOL_NAME_MISMATCH',
      400
    );
  }

  // Prevent deletion of active schools without suspension first
  if (school.status === 'active') {
    console.error('[deleteSchool] Attempting to delete active school');
    throw new SchoolError(
      'Cannot delete an active school. Please suspend the school first.',
      'SCHOOL_STILL_ACTIVE',
      400
    );
  }

  console.log(`[DANGER] Starting deletion of school: ${school.name} (${schoolId})`);
  console.log(`[DANGER] Initiated by Super Admin: ${tenant.userId}`);

  // Count records before deletion for audit
  const counts = {
    users: 0,
    students: 0,
    teachers: 0,
    academicYears: 0,
    classrooms: 0,
    subjects: 0,
    enrollments: 0,
    attendance: 0,
    marks: 0,
    assessments: 0,
    assignments: 0,
    fees: 0,
    timetables: 0,
    teachingAssignments: 0,
    auditLogs: 0,
  };

  try {
    // Count users
    const usersCount = await db
      .prepare('SELECT COUNT(*) as count FROM users WHERE school_id = ?')
      .bind(schoolId)
      .first<{ count: number }>();
    counts.users = usersCount?.count || 0;

    const studentsCount = await db
      .prepare('SELECT COUNT(*) as count FROM student_profiles WHERE school_id = ?')
      .bind(schoolId)
      .first<{ count: number }>();
    counts.students = studentsCount?.count || 0;

    const teachersCount = await db
      .prepare('SELECT COUNT(*) as count FROM teacher_profiles WHERE school_id = ?')
      .bind(schoolId)
      .first<{ count: number }>();
    counts.teachers = teachersCount?.count || 0;
  } catch (error) {
    console.error('[DANGER] Error counting records:', error);
    // Continue anyway
  }

  // D1 doesn't allow PRAGMA foreign_keys = OFF, so we must delete in correct order
  // We'll use batch() to execute all deletions atomically
  console.log('[DANGER] Starting batch deletion');

  try {
    // First, drop the delete triggers for append-only tables
    // (fee_charges and fee_payments are append-only, but we're deleting the whole school)
    await db.prepare('DROP TRIGGER IF EXISTS trg_fee_charges_no_delete').run();
    await db.prepare('DROP TRIGGER IF EXISTS trg_fee_payments_no_delete').run();
    console.log('[DANGER] Dropped append-only triggers');

    // Create a batch of all deletion statements IN CORRECT ORDER
    // Delete children before parents to avoid FK violations
    const deletionBatch = [
      // 1. Delete promotion items (references promotion_batches, enrollments, students)
      db.prepare('DELETE FROM promotion_items WHERE promotion_batch_id IN (SELECT id FROM promotion_batches WHERE school_id = ?)').bind(schoolId),
      
      // 2. Delete promotion batches (references users, academic_years, classrooms)
      db.prepare('DELETE FROM promotion_batches WHERE school_id = ?').bind(schoolId),
      
      // 3. Delete fee charges (references students, academic_years, enrollments, fee_categories)
      db.prepare('DELETE FROM fee_charges WHERE school_id = ?').bind(schoolId),
      
      // 4. Delete fee payments (references students, academic_years)
      db.prepare('DELETE FROM fee_payments WHERE school_id = ?').bind(schoolId),
      
      // 5. Delete assignment attachments (references assignments, users)
      db.prepare('DELETE FROM assignment_attachments WHERE assignment_id IN (SELECT id FROM assignments WHERE school_id = ?)').bind(schoolId),
      
      // 6. Delete assignments (references classrooms, subjects, users)
      db.prepare('DELETE FROM assignments WHERE school_id = ?').bind(schoolId),
      
      // 7. Delete timetable entries (references timetables, subjects, users)
      db.prepare('DELETE FROM timetable_entries WHERE timetable_id IN (SELECT id FROM timetables WHERE school_id = ?)').bind(schoolId),
      
      // 8. Delete timetables (references classrooms, academic_years)
      db.prepare('DELETE FROM timetables WHERE school_id = ?').bind(schoolId),
      
      // 9. Delete marks (references assessments, students, enrollments)
      db.prepare('DELETE FROM marks WHERE assessment_id IN (SELECT id FROM assessments WHERE school_id = ?)').bind(schoolId),
      
      // 10. Delete assessments (references classrooms, subjects, academic_years)
      db.prepare('DELETE FROM assessments WHERE school_id = ?').bind(schoolId),
      
      // 11. Delete attendance entries (references attendance_sessions, students, enrollments)
      db.prepare('DELETE FROM attendance_entries WHERE session_id IN (SELECT id FROM attendance_sessions WHERE school_id = ?)').bind(schoolId),
      
      // 12. Delete attendance sessions (references classrooms, academic_years)
      db.prepare('DELETE FROM attendance_sessions WHERE school_id = ?').bind(schoolId),
      
      // 13. Delete teaching assignments (references users, classrooms, subjects, academic_years)
      db.prepare('DELETE FROM teaching_assignments WHERE school_id = ?').bind(schoolId),
      
      // 14. Delete enrollments (references students, classrooms, academic_years)
      db.prepare('DELETE FROM enrollments WHERE school_id = ?').bind(schoolId),
      
      // 15. Delete fee categories (references academic_years)
      db.prepare('DELETE FROM fee_categories WHERE school_id = ?').bind(schoolId),
      
      // 16. Delete period timings (references academic_years)
      db.prepare('DELETE FROM period_timings WHERE school_id = ?').bind(schoolId),
      
      // 17. Delete classrooms (references academic_years)
      db.prepare('DELETE FROM classrooms WHERE school_id = ?').bind(schoolId),
      
      // 18. Delete subjects (references academic_years)
      db.prepare('DELETE FROM subjects WHERE school_id = ?').bind(schoolId),
      
      // 19. Delete academic years (references schools)
      db.prepare('DELETE FROM academic_years WHERE school_id = ?').bind(schoolId),
      
      // 20. Delete student profiles (references users)
      db.prepare('DELETE FROM student_profiles WHERE school_id = ?').bind(schoolId),
      
      // 21. Delete teacher profiles (references users)
      db.prepare('DELETE FROM teacher_profiles WHERE school_id = ?').bind(schoolId),
      
      // 22. Delete audit log
      db.prepare('DELETE FROM audit_log WHERE school_id = ?').bind(schoolId),
      
      // 23. Delete code counters
      db.prepare('DELETE FROM code_counters WHERE school_id = ?').bind(schoolId),
      
      // 24. Delete receipt counters
      db.prepare('DELETE FROM receipt_counters WHERE school_id = ?').bind(schoolId),
      
      // 25. Delete import jobs
      db.prepare('DELETE FROM import_jobs WHERE school_id = ?').bind(schoolId),
      
      // 26. Delete sessions (references users)
      db.prepare('DELETE FROM sessions WHERE user_id IN (SELECT id FROM users WHERE school_id = ?)').bind(schoolId),
      
      // 27. Delete users (references schools)
      db.prepare('DELETE FROM users WHERE school_id = ?').bind(schoolId),
      
      // 28. Finally, delete the school itself
      db.prepare('DELETE FROM schools WHERE id = ?').bind(schoolId),
    ];

    // Execute deletions one by one for better error messages
    console.log('[DANGER] Executing deletions individually');
    
    for (let i = 0; i < deletionBatch.length; i++) {
      try {
        const result = await deletionBatch[i].run();
        console.log(`[DANGER] Statement ${i + 1}/${deletionBatch.length} succeeded: ${result.meta?.changes || 0} rows`);
      } catch (error) {
        console.error(`[DANGER] Statement ${i + 1}/${deletionBatch.length} failed:`, error);
        throw error;
      }
    }
    
    console.log('[DANGER] All deletions completed');

    // Recreate the append-only triggers
    await db.prepare(`
      CREATE TRIGGER trg_fee_charges_no_delete BEFORE DELETE ON fee_charges
      BEGIN SELECT RAISE(ABORT, 'fee_charges are append-only: void instead of deleting'); END
    `).run();
    await db.prepare(`
      CREATE TRIGGER trg_fee_payments_no_delete BEFORE DELETE ON fee_payments
      BEGIN SELECT RAISE(ABORT, 'fee_payments are append-only: void instead of deleting'); END
    `).run();
    console.log('[DANGER] Recreated append-only triggers');

    // Check if school was actually deleted
    const schoolCheck = await db
      .prepare('SELECT id FROM schools WHERE id = ?')
      .bind(schoolId)
      .first();
    
    if (schoolCheck) {
      throw new Error('School record still exists after deletion');
    }

    console.log(`[DANGER] School successfully deleted: ${school.name} (${schoolId})`);
    console.log(`[DANGER] Deletion summary:`, counts);

    return {
      schoolId,
      schoolName: school.name,
      deletedCounts: counts,
    };
  } catch (error) {
    console.error('[DANGER] Error during batch deletion:', error);
    console.error('[DANGER] Error details:', JSON.stringify(error));
    
    // Try to recreate the append-only triggers
    try {
      await db.prepare(`
        CREATE TRIGGER IF NOT EXISTS trg_fee_charges_no_delete BEFORE DELETE ON fee_charges
        BEGIN SELECT RAISE(ABORT, 'fee_charges are append-only: void instead of deleting'); END
      `).run();
      await db.prepare(`
        CREATE TRIGGER IF NOT EXISTS trg_fee_payments_no_delete BEFORE DELETE ON fee_payments
        BEGIN SELECT RAISE(ABORT, 'fee_payments are append-only: void instead of deleting'); END
      `).run();
      console.log('[DANGER] Recreated append-only triggers after error');
    } catch (triggerError) {
      console.error('[DANGER] Failed to recreate triggers:', triggerError);
    }
    
    throw new SchoolError(
      `Failed to delete school: ${error instanceof Error ? error.message : 'Unknown error'}`,
      'SCHOOL_DELETE_FAILED',
      500
    );
  }
}

/**
 * Change Principal for a school
 * SECURITY: Super Admin only
 * 
 * Disables the old principal and creates a new one
 * Returns new principal credentials
 */
export async function changePrincipal(
  db: D1Database,
  schoolId: string,
  data: CreatePrincipalRequest,
  tenant: SuperAdminContext
): Promise<PrincipalCreationResponse> {
  schoolsAuthz.ensureSuperAdmin(tenant);

  // Verify school exists
  const school = await schoolsRepo.findById(db, schoolId);
  if (!school) {
    throw SchoolError.schoolNotFound(schoolId);
  }

  // Find the current principal
  const currentPrincipal = await db
    .prepare(
      `SELECT id, login_id, status FROM users 
       WHERE school_id = ? AND role = 'principal' AND status = 'active'
       LIMIT 1`
    )
    .bind(schoolId)
    .first<{ id: string; login_id: string; status: string }>();

  if (!currentPrincipal) {
    throw new SchoolError(
      'No active principal found for this school',
      'NO_ACTIVE_PRINCIPAL',
      404
    );
  }

  const now = Date.now();

  try {
    // Step 1: Disable the old principal
    await db
      .prepare(
        `UPDATE users 
         SET status = 'disabled', 
             token_version = token_version + 1,
             updated_at = ?
         WHERE id = ?`
      )
      .bind(now, currentPrincipal.id)
      .run();

    // Step 2: Revoke all sessions for old principal
    await db
      .prepare(
        `UPDATE sessions 
         SET revoked_at = ? 
         WHERE user_id = ? AND revoked_at IS NULL`
      )
      .bind(now, currentPrincipal.id)
      .run();

    await logAudit(db, tenant as any, 'principal_disabled', 'user', currentPrincipal.id, 
      { status: 'active' }, 
      { status: 'disabled' }
    );

    // Step 3: Create new principal (using existing createPrincipal logic)
    // Generate login ID sequence
    const sequence = await getNextPrincipalSequence(db, schoolId);
    
    // Get school code for login ID
    const schoolRecord = await db
      .prepare('SELECT code FROM schools WHERE id = ? LIMIT 1')
      .bind(schoolId)
      .first<{ code: string }>();
    
    if (!schoolRecord) {
      throw SchoolError.schoolNotFound(schoolId);
    }
    
    const loginId = `${schoolRecord.code}-P-${sequence.toString().padStart(6, '0')}`;

    // Generate temporary password
    const temporaryPassword = codeGen.generateTemporaryPassword();
    const activationHash = await hashPassword(temporaryPassword);

    // Calculate activation expiry (7 days)
    const activationExpiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000;

    const userId = generateId();

    // Create new principal user record
    await db
      .prepare(
        `INSERT INTO users (
          id, school_id, login_id, role, status,
          password_hash, activation_hash, activation_expires_at,
          must_change_password, token_version, created_at, updated_at
        )
        VALUES (?, ?, ?, 'principal', 'active', NULL, ?, ?, 1, 0, ?, ?)`
      )
      .bind(
        userId,
        schoolId,
        loginId,
        activationHash,
        activationExpiresAt,
        now,
        now
      )
      .run();

    await logAudit(db, tenant as any, 'principal_changed', 'user', userId, null, {
      user_id: userId,
      login_id: loginId,
      role: 'principal',
      school_id: schoolId,
      old_principal_id: currentPrincipal.id,
      old_principal_login: currentPrincipal.login_id,
      full_name: data.full_name,
      date_of_birth: data.date_of_birth,
      gender: data.gender,
    });

    // SECURITY: Temporary password returned ONCE, never logged
    return {
      user_id: userId,
      login_id: loginId,
      temporary_password: temporaryPassword,
    };
  } catch (error) {
    throw new SchoolError(
      `Failed to change principal: ${error instanceof Error ? error.message : 'Unknown error'}`,
      'PRINCIPAL_CHANGE_FAILED',
      500
    );
  }
}
