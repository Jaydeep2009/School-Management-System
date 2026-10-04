/**
 * Period Timing Repository
 * Database operations for period timings
 */

import type { PeriodTiming } from './period-timing.types';

/**
 * Find all period timings for an academic year
 */
export async function findByAcademicYear(
  db: D1Database,
  schoolId: string,
  academicYearId: string
): Promise<PeriodTiming[]> {
  const results = await db
    .prepare(
      `SELECT * FROM period_timings
       WHERE school_id = ? AND academic_year_id = ?
       ORDER BY period_no ASC`
    )
    .bind(schoolId, academicYearId)
    .all<PeriodTiming>();

  return results.results || [];
}

/**
 * Find period timing by ID
 */
export async function findById(
  db: D1Database,
  id: string,
  schoolId: string
): Promise<PeriodTiming | null> {
  const result = await db
    .prepare(
      `SELECT * FROM period_timings
       WHERE id = ? AND school_id = ?
       LIMIT 1`
    )
    .bind(id, schoolId)
    .first<PeriodTiming>();

  return result || null;
}

/**
 * Create period timing
 */
export async function create(
  db: D1Database,
  data: {
    id: string;
    school_id: string;
    academic_year_id: string;
    period_no: number;
    start_time: string;
    end_time: string;
    label: string;
    is_break: boolean;
    created_at: number;
    updated_at: number;
  }
): Promise<PeriodTiming> {
  await db
    .prepare(
      `INSERT INTO period_timings (
        id, school_id, academic_year_id, period_no,
        start_time, end_time, label, is_break,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      data.id,
      data.school_id,
      data.academic_year_id,
      data.period_no,
      data.start_time,
      data.end_time,
      data.label,
      data.is_break ? 1 : 0,
      data.created_at,
      data.updated_at
    )
    .run();

  const created = await findById(db, data.id, data.school_id);
  if (!created) {
    throw new Error('Failed to create period timing');
  }

  return created;
}

/**
 * Update period timing
 */
export async function update(
  db: D1Database,
  id: string,
  schoolId: string,
  data: {
    start_time?: string;
    end_time?: string;
    label?: string;
    is_break?: boolean;
    updated_at: number;
  }
): Promise<PeriodTiming> {
  const updates: string[] = [];
  const values: any[] = [];

  if (data.start_time !== undefined) {
    updates.push('start_time = ?');
    values.push(data.start_time);
  }
  if (data.end_time !== undefined) {
    updates.push('end_time = ?');
    values.push(data.end_time);
  }
  if (data.label !== undefined) {
    updates.push('label = ?');
    values.push(data.label);
  }
  if (data.is_break !== undefined) {
    updates.push('is_break = ?');
    values.push(data.is_break ? 1 : 0);
  }

  updates.push('updated_at = ?');
  values.push(data.updated_at);

  values.push(id, schoolId);

  await db
    .prepare(
      `UPDATE period_timings
       SET ${updates.join(', ')}
       WHERE id = ? AND school_id = ?`
    )
    .bind(...values)
    .run();

  const updated = await findById(db, id, schoolId);
  if (!updated) {
    throw new Error('Failed to update period timing');
  }

  return updated;
}

/**
 * Delete period timing
 */
export async function remove(
  db: D1Database,
  id: string,
  schoolId: string
): Promise<void> {
  await db
    .prepare(
      `DELETE FROM period_timings
       WHERE id = ? AND school_id = ?`
    )
    .bind(id, schoolId)
    .run();
}

/**
 * Check if period number already exists for academic year
 */
export async function existsByPeriodNo(
  db: D1Database,
  schoolId: string,
  academicYearId: string,
  periodNo: number,
  excludeId?: string
): Promise<boolean> {
  const query = excludeId
    ? `SELECT COUNT(*) as count FROM period_timings
       WHERE school_id = ? AND academic_year_id = ? AND period_no = ? AND id != ?`
    : `SELECT COUNT(*) as count FROM period_timings
       WHERE school_id = ? AND academic_year_id = ? AND period_no = ?`;

  const bindings = excludeId
    ? [schoolId, academicYearId, periodNo, excludeId]
    : [schoolId, academicYearId, periodNo];

  const result = await db
    .prepare(query)
    .bind(...bindings)
    .first<{ count: number }>();

  return (result?.count || 0) > 0;
}

/**
 * Create default period timings for a new academic year
 */
export async function createDefaults(
  db: D1Database,
  schoolId: string,
  academicYearId: string
): Promise<PeriodTiming[]> {
  const defaults = [
    { period_no: 1, start_time: '08:00', end_time: '08:45', label: 'Period 1', is_break: false },
    { period_no: 2, start_time: '08:45', end_time: '09:30', label: 'Period 2', is_break: false },
    { period_no: 3, start_time: '09:30', end_time: '09:45', label: 'Break', is_break: true },
    { period_no: 4, start_time: '09:45', end_time: '10:30', label: 'Period 3', is_break: false },
    { period_no: 5, start_time: '10:30', end_time: '11:15', label: 'Period 4', is_break: false },
    { period_no: 6, start_time: '11:15', end_time: '12:00', label: 'Period 5', is_break: false },
    { period_no: 7, start_time: '12:00', end_time: '12:45', label: 'Lunch', is_break: true },
    { period_no: 8, start_time: '12:45', end_time: '13:30', label: 'Period 6', is_break: false },
    { period_no: 9, start_time: '13:30', end_time: '14:15', label: 'Period 7', is_break: false },
    { period_no: 10, start_time: '14:15', end_time: '15:00', label: 'Period 8', is_break: false },
  ];

  const now = Date.now();
  const created: PeriodTiming[] = [];

  for (const def of defaults) {
    const id = crypto.randomUUID();
    const timing = await create(db, {
      id,
      school_id: schoolId,
      academic_year_id: academicYearId,
      period_no: def.period_no,
      start_time: def.start_time,
      end_time: def.end_time,
      label: def.label,
      is_break: def.is_break,
      created_at: now,
      updated_at: now,
    });
    created.push(timing);
  }

  return created;
}
