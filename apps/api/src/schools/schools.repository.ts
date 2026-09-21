/**
 * School Repository
 * 
 * Database operations for school management
 * SECURITY: Platform-level operations - Super Admin only
 */

import type { School, SchoolStatus, SchoolFilters } from './schools.types';

/**
 * Find school by ID
 */
export async function findById(
  db: D1Database,
  id: string
): Promise<School | null> {
  const result = await db
    .prepare(
      `SELECT id, code, name, timezone, phone, email, address, status, settings,
              created_at, updated_at
       FROM schools
       WHERE id = ?
       LIMIT 1`
    )
    .bind(id)
    .first<School>();

  return result || null;
}

/**
 * Find school by code
 */
export async function findByCode(
  db: D1Database,
  code: string
): Promise<School | null> {
  const result = await db
    .prepare(
      `SELECT id, code, name, timezone, phone, email, address, status, settings,
              created_at, updated_at
       FROM schools
       WHERE code = ?
       LIMIT 1`
    )
    .bind(code.toUpperCase())
    .first<School>();

  return result || null;
}

/**
 * List all schools with optional filters
 * Platform-wide view for Super Admin
 */
export async function findAll(
  db: D1Database,
  filters?: SchoolFilters
): Promise<School[]> {
  let query = `SELECT id, code, name, timezone, phone, email, address, status, settings,
                      created_at, updated_at
               FROM schools
               WHERE 1=1`;
  
  const bindings: unknown[] = [];

  if (filters?.status) {
    query += ' AND status = ?';
    bindings.push(filters.status);
  }

  if (filters?.search) {
    query += ` AND (
      code LIKE ? OR
      name LIKE ?
    )`;
    const searchPattern = `%${filters.search}%`;
    bindings.push(searchPattern, searchPattern);
  }

  query += ' ORDER BY created_at DESC';

  const result = await db
    .prepare(query)
    .bind(...bindings)
    .all<School>();

  return result.results || [];
}

/**
 * Create school
 */
export async function create(
  db: D1Database,
  data: {
    id: string;
    code: string;
    name: string;
    timezone: string;
    phone: string | null;
    email: string | null;
    address: string | null;
    status: SchoolStatus;
    settings: string;
  }
): Promise<School> {
  const now = Date.now();

  await db
    .prepare(
      `INSERT INTO schools (
        id, code, name, timezone, phone, email, address, status, settings,
        created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      data.id,
      data.code,
      data.name,
      data.timezone,
      data.phone,
      data.email,
      data.address,
      data.status,
      data.settings,
      now,
      now
    )
    .run();

  return {
    id: data.id,
    code: data.code,
    name: data.name,
    timezone: data.timezone,
    phone: data.phone,
    email: data.email,
    address: data.address,
    status: data.status,
    settings: data.settings,
    created_at: now,
    updated_at: now,
  };
}

/**
 * Update school
 */
export async function update(
  db: D1Database,
  id: string,
  data: {
    name?: string;
    timezone?: string;
    phone?: string | null;
    email?: string | null;
    address?: string | null;
    settings?: string;
  }
): Promise<boolean> {
  const updates: string[] = [];
  const bindings: unknown[] = [];

  if (data.name !== undefined) {
    updates.push('name = ?');
    bindings.push(data.name);
  }

  if (data.timezone !== undefined) {
    updates.push('timezone = ?');
    bindings.push(data.timezone);
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

  if (data.settings !== undefined) {
    updates.push('settings = ?');
    bindings.push(data.settings);
  }

  if (updates.length === 0) {
    return false;
  }

  updates.push('updated_at = ?');
  bindings.push(Date.now());

  bindings.push(id);

  const result = await db
    .prepare(
      `UPDATE schools
       SET ${updates.join(', ')}
       WHERE id = ?`
    )
    .bind(...bindings)
    .run();

  return result.meta.changes > 0;
}

/**
 * Update school status
 */
export async function updateStatus(
  db: D1Database,
  id: string,
  status: SchoolStatus
): Promise<boolean> {
  const result = await db
    .prepare(
      `UPDATE schools
       SET status = ?, updated_at = ?
       WHERE id = ?`
    )
    .bind(status, Date.now(), id)
    .run();

  return result.meta.changes > 0;
}

/**
 * Check if active Principal exists for school
 */
export async function hasActivePrincipal(
  db: D1Database,
  schoolId: string
): Promise<boolean> {
  const result = await db
    .prepare(
      `SELECT COUNT(*) as count
       FROM users
       WHERE school_id = ?
         AND role = 'principal'
         AND status = 'active'`
    )
    .bind(schoolId)
    .first<{ count: number }>();

  return (result?.count || 0) > 0;
}
