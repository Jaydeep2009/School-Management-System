/**
 * Imports Repository
 * 
 * Database operations for import jobs
 */

import type { ImportJob, ImportKind, ImportStatus } from './imports.types';

/**
 * Create import job
 */
export async function createImportJob(
  db: D1Database,
  schoolId: string,
  kind: ImportKind,
  actorId: string,
  payloadHash: string,
  payload: string,
  summary: string,
  expiresAt: number
): Promise<ImportJob> {
  const id = crypto.randomUUID();
  const now = Date.now();

  await db
    .prepare(
      `INSERT INTO import_jobs (
         id, school_id, kind, actor_id, payload_hash, payload, summary,
         status, expires_at, created_at
       )
       VALUES (?, ?, ?, ?, ?, ?, ?, 'previewed', ?, ?)`
    )
    .bind(id, schoolId, kind, actorId, payloadHash, payload, summary, expiresAt, now)
    .run();

  return {
    id,
    school_id: schoolId,
    kind,
    actor_id: actorId,
    payload_hash: payloadHash,
    payload,
    summary,
    status: 'previewed',
    expires_at: expiresAt,
    created_at: now,
    committed_at: null,
  };
}

/**
 * Find import job by ID
 */
export async function findImportJobById(
  db: D1Database,
  importId: string
): Promise<ImportJob | null> {
  const result = await db
    .prepare(
      `SELECT id, school_id, kind, actor_id, payload_hash, payload, summary,
              status, expires_at, created_at, committed_at
       FROM import_jobs
       WHERE id = ?`
    )
    .bind(importId)
    .first<ImportJob>();

  return result || null;
}

/**
 * Update import job status
 */
export async function updateImportJobStatus(
  db: D1Database,
  importId: string,
  status: ImportStatus,
  committedAt?: number
): Promise<void> {
  const now = Date.now();

  if (committedAt !== undefined) {
    await db
      .prepare(
        `UPDATE import_jobs
         SET status = ?, committed_at = ?
         WHERE id = ?`
      )
      .bind(status, committedAt, importId)
      .run();
  } else {
    await db
      .prepare(
        `UPDATE import_jobs
         SET status = ?
         WHERE id = ?`
      )
      .bind(status, importId)
      .run();
  }
}

/**
 * Clear import job payload after commit
 */
export async function clearImportJobPayload(
  db: D1Database,
  importId: string
): Promise<void> {
  await db
    .prepare(
      `UPDATE import_jobs
       SET payload = NULL
       WHERE id = ?`
    )
    .bind(importId)
    .run();
}

/**
 * List import jobs for school
 */
export async function listImportJobs(
  db: D1Database,
  schoolId: string,
  kind?: ImportKind,
  status?: ImportStatus,
  limit: number = 50
): Promise<ImportJob[]> {
  let query = `
    SELECT id, school_id, kind, actor_id, payload_hash, payload, summary,
           status, expires_at, created_at, committed_at
    FROM import_jobs
    WHERE school_id = ?
  `;
  const bindings: unknown[] = [schoolId];

  if (kind) {
    query += ` AND kind = ?`;
    bindings.push(kind);
  }

  if (status) {
    query += ` AND status = ?`;
    bindings.push(status);
  }

  query += ` ORDER BY created_at DESC LIMIT ?`;
  bindings.push(limit);

  const result = await db
    .prepare(query)
    .bind(...bindings)
    .all<ImportJob>();

  return result.results || [];
}

/**
 * Mark expired import jobs
 */
export async function markExpiredImportJobs(
  db: D1Database
): Promise<number> {
  const now = Date.now();

  const result = await db
    .prepare(
      `UPDATE import_jobs
       SET status = 'expired'
       WHERE status = 'previewed'
         AND expires_at < ?`
    )
    .bind(now)
    .run();

  return result.meta?.changes || 0;
}
