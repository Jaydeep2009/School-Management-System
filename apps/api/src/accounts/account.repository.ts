/**
 * Account Repository
 * 
 * Shared functions for accessing user accounts across roles
 */

import type { D1Database } from '@cloudflare/workers-types';

/**
 * Find all teachers in a school
 */
export async function findTeachersBySchool(
  db: D1Database,
  schoolId: string,
  filters: { status?: 'active' | 'inactive' } = {}
): Promise<Array<{ user_id: string; full_name: string }>> {
  let query = `
    SELECT u.id as user_id, u.full_name
    FROM users u
    INNER JOIN teachers t ON u.id = t.user_id
    WHERE t.school_id = ?
  `;
  const params: any[] = [schoolId];

  if (filters.status) {
    query += ` AND u.status = ?`;
    params.push(filters.status);
  } else {
    // Default to active only
    query += ` AND u.status = 'active'`;
  }

  const result = await db.prepare(query).bind(...params).all<{ user_id: string; full_name: string }>();
  return result.results || [];
}

/**
 * Find all students in a school
 */
export async function findStudentsBySchool(
  db: D1Database,
  schoolId: string,
  filters: { status?: 'active' | 'inactive' } = {}
): Promise<Array<{ user_id: string; full_name: string }>> {
  let query = `
    SELECT u.id as user_id, u.full_name
    FROM users u
    INNER JOIN students s ON u.id = s.user_id
    WHERE s.school_id = ?
  `;
  const params: any[] = [schoolId];

  if (filters.status) {
    query += ` AND u.status = ?`;
    params.push(filters.status);
  } else {
    // Default to active only
    query += ` AND u.status = 'active'`;
  }

  const result = await db.prepare(query).bind(...params).all<{ user_id: string; full_name: string }>();
  return result.results || [];
}

/**
 * Find all principals in a school
 */
export async function findPrincipalsBySchool(
  db: D1Database,
  schoolId: string
): Promise<Array<{ user_id: string; full_name: string }>> {
  const result = await db
    .prepare(`
      SELECT u.id as user_id, u.full_name
      FROM users u
      WHERE u.school_id = ? AND u.role = 'principal' AND u.status = 'active'
    `)
    .bind(schoolId)
    .all<{ user_id: string; full_name: string }>();

  return result.results || [];
}
