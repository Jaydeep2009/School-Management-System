/**
 * Request ID utilities for correlation tracking
 */

import { ulid } from 'ulidx';

/**
 * Generate a unique request ID for correlation tracking
 */
export function generateRequestId(): string {
  return ulid();
}

/**
 * Extract request ID from Cloudflare request context or generate new one
 */
export function getRequestId(request: Request): string {
  // Try to get CF request ID first
  const cfRay = request.headers.get('cf-ray');
  if (cfRay) {
    return `cf-${cfRay}`;
  }

  // Try custom header
  const customId = request.headers.get('x-request-id');
  if (customId) {
    return customId;
  }

  // Generate new ID
  return generateRequestId();
}
