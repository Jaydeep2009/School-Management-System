/**
 * School Management Service
 * 
 * Business logic for Super Admin school management and Principal provisioning
 */

import type { TenantContext } from '../authz/authz.types';
import type {
  School,
  SchoolWithSettings,
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
  tenant: TenantContext
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
  tenant: TenantContext
): Promise<SchoolWithSettings[]> {
  schoolsAuthz.ensureSuperAdmin(tenant);

  const schools = await schoolsRepo.findAll(db, filters);
  return schools.map(parseSchoolSettings);
}

/**
 * Get school by ID
 * SECURITY: Super Admin only
 */
export async function getSchool(
  db: D1Database,
  schoolId: string,
  tenant: TenantContext
): Promise<SchoolWithSettings> {
  schoolsAuthz.ensureSuperAdmin(tenant);

  const school = await schoolsRepo.findById(db, schoolId);
  if (!school) {
    throw SchoolError.schoolNotFound(schoolId);
  }

  return parseSchoolSettings(school);
}

/**
 * Update school
 * SECURITY: Super Admin only
 */
export async function updateSchool(
  db: D1Database,
  schoolId: string,
  data: UpdateSchoolRequest,
  tenant: TenantContext
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
  tenant: TenantContext
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
  tenant: TenantContext
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
  tenant: TenantContext
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
  tenant: TenantContext
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
