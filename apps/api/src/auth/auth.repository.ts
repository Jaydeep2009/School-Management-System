/**
 * Authentication repository - Database operations for auth
 * 
 * SECURITY: Never expose password_hash, activation_hash, or refresh_hash
 */

import type { User, Session } from './auth.types';

/**
 * Find user by login_id
 */
export async function findUserByLoginId(
  db: D1Database,
  loginId: string
): Promise<User | null> {
  const result = await db
    .prepare(
      `SELECT id, school_id, login_id, role, status, password_hash, activation_hash, 
              activation_expires_at, must_change_password, token_version, created_at, updated_at
       FROM users
       WHERE login_id = ? COLLATE NOCASE`
    )
    .bind(loginId)
    .first<User>();
  
  return result || null;
}

/**
 * Find user by ID
 */
export async function findUserById(
  db: D1Database,
  userId: string
): Promise<User | null> {
  const result = await db
    .prepare(
      `SELECT id, school_id, login_id, role, status, password_hash, activation_hash,
              activation_expires_at, must_change_password, token_version, created_at, updated_at
       FROM users
       WHERE id = ?`
    )
    .bind(userId)
    .first<User>();
  
  return result || null;
}

/**
 * Update user password and increment token version
 */
export async function updateUserPassword(
  db: D1Database,
  userId: string,
  passwordHash: string
): Promise<void> {
  await db
    .prepare(
      `UPDATE users
       SET password_hash = ?,
           token_version = token_version + 1,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`
    )
    .bind(passwordHash, userId)
    .run();
}

/**
 * Activate user account - set password, clear activation fields
 */
export async function activateUser(
  db: D1Database,
  userId: string,
  passwordHash: string
): Promise<void> {
  await db
    .prepare(
      `UPDATE users
       SET password_hash = ?,
           activation_hash = NULL,
           activation_expires_at = NULL,
           must_change_password = 0,
           token_version = token_version + 1,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`
    )
    .bind(passwordHash, userId)
    .run();
}

/**
 * Create a new session
 */
export async function createSession(
  db: D1Database,
  sessionData: {
    id: string;
    userId: string;
    refreshHash: string;
    familyId: string;
    expiresAt: string;
    userAgent: string | null;
  }
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO sessions (id, user_id, refresh_hash, family_id, expires_at, user_agent, created_at)
       VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`
    )
    .bind(
      sessionData.id,
      sessionData.userId,
      sessionData.refreshHash,
      sessionData.familyId,
      sessionData.expiresAt,
      sessionData.userAgent
    )
    .run();
}

/**
 * Find session by ID
 */
export async function findSessionById(
  db: D1Database,
  sessionId: string
): Promise<Session | null> {
  const result = await db
    .prepare(
      `SELECT id, user_id, refresh_hash, family_id, expires_at, revoked_at, user_agent, created_at
       FROM sessions
       WHERE id = ?`
    )
    .bind(sessionId)
    .first<Session>();
  
  return result || null;
}

/**
 * Find all sessions in a family
 */
export async function findSessionsByFamily(
  db: D1Database,
  familyId: string
): Promise<Session[]> {
  const result = await db
    .prepare(
      `SELECT id, user_id, refresh_hash, family_id, expires_at, revoked_at, user_agent, created_at
       FROM sessions
       WHERE family_id = ?
       ORDER BY created_at DESC`
    )
    .bind(familyId)
    .all<Session>();
  
  return result.results || [];
}

/**
 * Update session refresh hash (for rotation)
 */
export async function updateSessionRefreshHash(
  db: D1Database,
  sessionId: string,
  newRefreshHash: string
): Promise<void> {
  await db
    .prepare(
      `UPDATE sessions
       SET refresh_hash = ?
       WHERE id = ?`
    )
    .bind(newRefreshHash, sessionId)
    .run();
}

/**
 * Revoke a single session
 */
export async function revokeSession(
  db: D1Database,
  sessionId: string
): Promise<void> {
  await db
    .prepare(
      `UPDATE sessions
       SET revoked_at = CURRENT_TIMESTAMP
       WHERE id = ?`
    )
    .bind(sessionId)
    .run();
}

/**
 * Revoke all sessions for a user
 */
export async function revokeAllUserSessions(
  db: D1Database,
  userId: string
): Promise<void> {
  await db
    .prepare(
      `UPDATE sessions
       SET revoked_at = CURRENT_TIMESTAMP
       WHERE user_id = ? AND revoked_at IS NULL`
    )
    .bind(userId)
    .run();
}

/**
 * Revoke entire session family
 */
export async function revokeSessionFamily(
  db: D1Database,
  familyId: string
): Promise<void> {
  await db
    .prepare(
      `UPDATE sessions
       SET revoked_at = CURRENT_TIMESTAMP
       WHERE family_id = ? AND revoked_at IS NULL`
    )
    .bind(familyId)
    .run();
}

/**
 * Create audit log entry
 */
export async function createAuditLog(
  db: D1Database,
  entry: {
    userId: string | null;
    schoolId: string | null;
    entityType: string;
    entityId: string | null;
    action: string;
    before: string | null;
    after: string | null;
  }
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO audit_log (user_id, school_id, entity_type, entity_id, action, before_state, after_state, timestamp)
       VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`
    )
    .bind(
      entry.userId,
      entry.schoolId,
      entry.entityType,
      entry.entityId,
      entry.action,
      entry.before,
      entry.after
    )
    .run();
}
