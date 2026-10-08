/**
 * R2 Helper Utilities
 * 
 * Common R2 operations for file storage
 */

import type { R2Bucket, R2Object } from '@cloudflare/workers-types';

/**
 * R2 Upload Options
 */
export interface R2UploadOptions {
  contentType?: string;
  contentDisposition?: string;
  cacheControl?: string;
  customMetadata?: Record<string, string>;
}

/**
 * Upload a file to R2
 */
export async function uploadToR2(
  bucket: R2Bucket,
  key: string,
  data: ArrayBuffer | string | ReadableStream,
  options?: R2UploadOptions
): Promise<void> {
  await bucket.put(key, data, {
    httpMetadata: {
      contentType: options?.contentType,
      contentDisposition: options?.contentDisposition,
      cacheControl: options?.cacheControl,
    },
    customMetadata: options?.customMetadata,
  });
}

/**
 * Download a file from R2
 */
export async function downloadFromR2(
  bucket: R2Bucket,
  key: string
): Promise<R2Object | null> {
  return await bucket.get(key);
}

/**
 * Delete a file from R2
 */
export async function deleteFromR2(
  bucket: R2Bucket,
  key: string
): Promise<void> {
  await bucket.delete(key);
}

/**
 * Check if a file exists in R2
 */
export async function existsInR2(
  bucket: R2Bucket,
  key: string
): Promise<boolean> {
  const object = await bucket.head(key);
  return object !== null;
}

/**
 * List files in R2 with prefix
 */
export async function listR2Objects(
  bucket: R2Bucket,
  prefix: string,
  limit = 1000
): Promise<Array<{ key: string; size: number; uploaded: Date }>> {
  const list = await bucket.list({ prefix, limit });
  
  return list.objects.map(obj => ({
    key: obj.key,
    size: obj.size,
    uploaded: obj.uploaded,
  }));
}

/**
 * Get file metadata from R2
 */
export async function getR2Metadata(
  bucket: R2Bucket,
  key: string
): Promise<{
  size: number;
  uploaded: Date;
  contentType?: string;
  customMetadata?: Record<string, string>;
} | null> {
  const object = await bucket.head(key);
  
  if (!object) return null;
  
  return {
    size: object.size,
    uploaded: object.uploaded,
    contentType: object.httpMetadata.contentType,
    customMetadata: object.customMetadata,
  };
}

/**
 * Copy a file within R2
 */
export async function copyInR2(
  bucket: R2Bucket,
  sourceKey: string,
  destinationKey: string
): Promise<void> {
  // Download source
  const object = await bucket.get(sourceKey);
  if (!object) {
    throw new Error(`Source file not found: ${sourceKey}`);
  }
  
  // Upload to destination
  await bucket.put(destinationKey, object.body, {
    httpMetadata: object.httpMetadata,
    customMetadata: object.customMetadata,
  });
}

/**
 * Move a file within R2 (copy + delete)
 */
export async function moveInR2(
  bucket: R2Bucket,
  sourceKey: string,
  destinationKey: string
): Promise<void> {
  await copyInR2(bucket, sourceKey, destinationKey);
  await bucket.delete(sourceKey);
}

/**
 * Bulk delete files from R2
 */
export async function bulkDeleteFromR2(
  bucket: R2Bucket,
  keys: string[]
): Promise<{ success: number; failed: number }> {
  let success = 0;
  let failed = 0;
  
  // R2 doesn't have native bulk delete, so delete one by one
  for (const key of keys) {
    try {
      await bucket.delete(key);
      success++;
    } catch (error) {
      console.error(`Failed to delete ${key}:`, error);
      failed++;
    }
  }
  
  return { success, failed };
}

/**
 * Stream R2 object to HTTP response
 * Use this for efficient file downloads
 */
export async function streamR2ToResponse(
  bucket: R2Bucket,
  key: string,
  filename?: string
): Promise<Response | null> {
  const object = await bucket.get(key);
  
  if (!object) return null;
  
  const headers = new Headers();
  
  // Set content type
  if (object.httpMetadata.contentType) {
    headers.set('Content-Type', object.httpMetadata.contentType);
  }
  
  // Set content disposition with filename
  if (filename) {
    headers.set('Content-Disposition', `attachment; filename="${filename}"`);
  } else if (object.httpMetadata.contentDisposition) {
    headers.set('Content-Disposition', object.httpMetadata.contentDisposition);
  }
  
  // Set cache control
  if (object.httpMetadata.cacheControl) {
    headers.set('Cache-Control', object.httpMetadata.cacheControl);
  }
  
  // Set content length
  headers.set('Content-Length', object.size.toString());
  
  return new Response(object.body, { headers });
}

/**
 * Get total storage used under a prefix
 */
export async function getStorageUsage(
  bucket: R2Bucket,
  prefix: string
): Promise<{ count: number; totalBytes: number }> {
  const list = await bucket.list({ prefix, limit: 10000 });
  
  const totalBytes = list.objects.reduce((sum, obj) => sum + obj.size, 0);
  
  return {
    count: list.objects.length,
    totalBytes,
  };
}

/**
 * Generate a secure, collision-resistant R2 key
 */
export function generateSecureKey(
  basePath: string,
  filename: string,
  randomId?: string
): string {
  // Sanitize filename
  const sanitized = filename
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/_{2,}/g, '_')
    .slice(0, 200); // Limit length
  
  // Use provided ID or generate random UUID
  const id = randomId || crypto.randomUUID();
  
  return `${basePath}/${id}-${sanitized}`;
}

/**
 * Clean up orphaned files (files in R2 but not in database)
 * Use with caution!
 */
export async function cleanupOrphanedFiles(
  bucket: R2Bucket,
  db: any, // D1Database
  prefix: string,
  tableName: string,
  keyColumn: string
): Promise<{ deleted: number; kept: number }> {
  // List all files in R2
  const r2Objects = await bucket.list({ prefix, limit: 10000 });
  
  // Get all keys from database
  const dbKeys = await db
    .prepare(`SELECT ${keyColumn} FROM ${tableName}`)
    .all();
  
  const dbKeySet = new Set(dbKeys.results.map((row: any) => row[keyColumn]));
  
  let deleted = 0;
  let kept = 0;
  
  // Delete files not in database
  for (const obj of r2Objects.objects) {
    if (!dbKeySet.has(obj.key)) {
      await bucket.delete(obj.key);
      deleted++;
      console.log(`Deleted orphaned file: ${obj.key}`);
    } else {
      kept++;
    }
  }
  
  return { deleted, kept };
}

