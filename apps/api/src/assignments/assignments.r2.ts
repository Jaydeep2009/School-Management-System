/**
 * Assignments R2 Storage Utilities
 * 
 * Secure R2 object key generation and management
 */

import { sanitizeFilename } from './assignments.validation';

/**
 * Generate unique ID
 */
function generateId(): string {
  return crypto.randomUUID();
}

/**
 * Generate secure R2 key for assignment attachment
 * Format: schools/{schoolId}/assignments/{assignmentId}/{randomId}-{safeFileName}
 */
export function generateAttachmentKey(
  schoolId: string,
  assignmentId: string,
  fileName: string
): string {
  const randomId = generateId();
  const safeFileName = sanitizeFilename(fileName);
  
  return `schools/${schoolId}/assignments/${assignmentId}/${randomId}-${safeFileName}`;
}

/**
 * Upload file to R2
 */
export async function uploadToR2(
  bucket: R2Bucket,
  key: string,
  file: ArrayBuffer,
  metadata?: {
    contentType?: string;
    customMetadata?: Record<string, string>;
  }
): Promise<void> {
  await bucket.put(key, file, {
    httpMetadata: metadata?.contentType ? {
      contentType: metadata.contentType,
    } : undefined,
    customMetadata: metadata?.customMetadata,
  });
}

/**
 * Download file from R2
 */
export async function downloadFromR2(
  bucket: R2Bucket,
  key: string
): Promise<R2ObjectBody | null> {
  return await bucket.get(key);
}

/**
 * Delete file from R2
 */
export async function deleteFromR2(
  bucket: R2Bucket,
  key: string
): Promise<void> {
  await bucket.delete(key);
}

/**
 * Check if object exists in R2
 */
export async function existsInR2(
  bucket: R2Bucket,
  key: string
): Promise<boolean> {
  const object = await bucket.head(key);
  return object !== null;
}
