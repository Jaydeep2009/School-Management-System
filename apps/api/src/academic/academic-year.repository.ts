/**
 * Academic Year Repository
 * 
 * Database operations for academic years
 * SECURITY: All queries are school-scoped
 */

import type { AcademicYear, AcademicYearStatus } from './academic.types';

/**
 * Find academic year by ID
 * SECURITY: Filters by school_id
 */
export async function findById(
  db: D1Database,
  id: string,
  schoolId: string
): Promise<AcademicYear | null> {
  const result = await db
    .prepare(
      `SELECT id, school_id, label, starts_on, ends_on, status, created_at, updated_at
       FROM academic_years
       WHERE id = ?
         AND school_id = ?
       LIMIT 1`
    )
    .bind(id, schoolId)
    .first<AcademicYear>();

  return result || null;
}

/**
 * Find all academic years for a school
 * SECURITY: Filters by school_id
 */
export async function findAll(
  db: D1Database,
  schoolId: string
): Promise<AcademicYear[]> {
  const result = await db
    .prepare(
      `SELECT id, school_id, label, starts_on, ends_on, status, created_at, updated_at
       FROM academic_years
       WHERE school_id = ?
       ORDER BY starts_on DESC`
    )
    .bind(schoolId)
    .all<AcademicYear>();

  return result.results || [];
}

/**
 * Find academic year by label
 * SECURITY: Filters by school_id
 */
export async function findByLabel(
  db: D1Database,
  label: string,
  schoolId: string
): Promise<AcademicYear | null> {
  const result = await db
    .prepare(
      `SELECT id, school_id, label, starts_on, ends_on, status, created_at, updated_at
       FROM academic_years
       WHERE label = ?
         AND school_id = ?
       LIMIT 1`
    )
    .bind(label, schoolId)
    .first<AcademicYear>();

  return result || null;
}

/**
 * Find current academic year
 * SECURITY: Filters by school_id
 */
export async function findCurrent(
  db: D1Database,
  schoolId: string
): Promise<AcademicYear | null> {
  const result = await db
    .prepare(
      `SELECT id, school_id, label, starts_on, ends_on, status, created_at, updated_at
       FROM academic_years
       WHERE school_id = ?
         AND status = 'current'
       LIMIT 1`
    )
    .bind(schoolId)
    .first<AcademicYear>();

  return result || null;
}

/**
 * Create academic year
 * SECURITY: Sets school_id from authenticated context
 */
export async function create(
  db: D1Database,
  data: {
    id: string;
    school_id: string;
    label: string;
    starts_on: string;
    ends_on: string;
    status: AcademicYearStatus;
  }
): Promise<AcademicYear> {
  const now = new Date().toISOString();

  await db
    .prepare(
      `INSERT INTO academic_years (id, school_id, label, starts_on, ends_on, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      data.id,
      data.school_id,
      data.label,
      data.starts_on,
      data.ends_on,
      data.status,
      now,
      now
    )
    .run();

  return {
    id: data.id,
    school_id: data.school_id,
    label: data.label,
    starts_on: data.starts_on,
    ends_on: data.ends_on,
    status: data.status,
    created_at: now,
    updated_at: now,
  };
}

/**
 * Update academic year
 * SECURITY: Filters by school_id
 */
export async function update(
  db: D1Database,
  id: string,
  schoolId: string,
  data: {
    label?: string;
    starts_on?: string;
    ends_on?: string;
  }
): Promise<boolean> {
  const updates: string[] = [];
  const bindings: unknown[] = [];

  if (data.label !== undefined) {
    updates.push('label = ?');
    bindings.push(data.label);
  }

  if (data.starts_on !== undefined) {
    updates.push('starts_on = ?');
    bindings.push(data.starts_on);
  }

  if (data.ends_on !== undefined) {
    updates.push('ends_on = ?');
    bindings.push(data.ends_on);
  }

  if (updates.length === 0) {
    return false;
  }

  updates.push('updated_at = ?');
  bindings.push(new Date().toISOString());

  bindings.push(id, schoolId);

  const result = await db
    .prepare(
      `UPDATE academic_years
       SET ${updates.join(', ')}
       WHERE id = ?
         AND school_id = ?`
    )
    .bind(...bindings)
    .run();

  return result.meta.changes > 0;
}

/**
 * Update academic year status
 * SECURITY: Filters by school_id
 */
export async function updateStatus(
  db: D1Database,
  id: string,
  schoolId: string,
  status: AcademicYearStatus
): Promise<boolean> {
  const result = await db
    .prepare(
      `UPDATE academic_years
       SET status = ?,
           updated_at = ?
       WHERE id = ?
         AND school_id = ?`
    )
    .bind(status, new Date().toISOString(), id, schoolId)
    .run();

  return result.meta.changes > 0;
}

/**
 * Count academic years by status
 * SECURITY: Filters by school_id
 */
export async function countByStatus(
  db: D1Database,
  schoolId: string,
  status: AcademicYearStatus
): Promise<number> {
  const result = await db
    .prepare(
      `SELECT COUNT(*) as count
       FROM academic_years
       WHERE school_id = ?
         AND status = ?`
    )
    .bind(schoolId, status)
    .first<{ count: number }>();

  return result?.count || 0;
}
