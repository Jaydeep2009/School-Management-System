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
    SELECT 
      u.id as user_id,
      tp.first_name || COALESCE(' ' || tp.middle_name, '') || ' ' || tp.last_name as full_name
    FROM users u
    INNER JOIN teacher_profiles tp ON u.id = tp.user_id
    WHERE u.school_id = ?
  `;
  const params: any[] = [schoolId];

  if (filters.status) {
    query += ` AND tp.status = ?`;
    params.push(filters.status);
  } else {
    // Default to active only
    query += ` AND tp.status = 'active'`;
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
    SELECT 
      u.id as user_id,
      sp.first_name || COALESCE(' ' || sp.middle_name, '') || ' ' || sp.last_name as full_name
    FROM users u
    INNER JOIN student_profiles sp ON u.id = sp.user_id
    WHERE u.school_id = ?
  `;
  const params: any[] = [schoolId];

  if (filters.status) {
    query += ` AND sp.status = ?`;
    params.push(filters.status);
  } else {
    // Default to active only
    query += ` AND sp.status = 'active'`;
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
  // Principals don't have a profile table with names yet, so we'll just return login_id as name
  // TODO: Add principal_profiles table in future migration
  const result = await db
    .prepare(`
      SELECT 
        u.id as user_id,
        u.login_id as full_name
      FROM users u
      WHERE u.school_id = ? AND u.role = 'principal' AND u.status = 'active'
    `)
    .bind(schoolId)
    .all<{ user_id: string; full_name: string }>();

  return result.results || [];
}
