/**
 * Session management service
 * 
 * Handles refresh token rotation and reuse detection
 * SECURITY: Never log raw refresh tokens or secrets
 */

import { sha256 } from '@noble/hashes/sha2.js';
import { randomBytes } from '@noble/hashes/utils.js';
import { ulid } from 'ulidx';
import type { Session } from './auth.types';

/**
 * Generate a random refresh secret (256 bits)
 */
export function generateRefreshSecret(): string {
  const bytes = randomBytes(32);
  return bufferToBase64(bytes);
}

/**
 * Hash a refresh secret using SHA-256
 * Store only the hash, never the raw secret
 */
export function hashRefreshSecret(secret: string): string {
  const bytes = new TextEncoder().encode(secret);
  const hash = sha256(bytes);
  return bufferToBase64(hash);
}

/**
 * Verify refresh secret against stored hash
 * Implements constant-time comparison
 */
export function verifyRefreshSecret(secret: string, storedHash: string): boolean {
  try {
    const actualHash = hashRefreshSecret(secret);
    return timingSafeEqual(actualHash, storedHash);
  } catch {
    return false;
  }
}

/**
 * Generate a new session ID
 */
export function generateSessionId(): string {
  return ulid();
}

/**
 * Generate a new family ID for session families
 */
export function generateFamilyId(): string {
  return ulid();
}

/**
 * Timing-safe string comparison
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }
  
  const aBytes = new TextEncoder().encode(a);
  const bBytes = new TextEncoder().encode(b);
  
  let result = 0;
  for (let i = 0; i < aBytes.length; i++) {
    result |= aBytes[i] ^ bBytes[i];
  }
  
  return result === 0;
}

/**
 * Convert Uint8Array to base64 (URL-safe)
 */
function bufferToBase64(buffer: Uint8Array): string {
  const bytes = Array.from(buffer);
  const binary = String.fromCharCode(...bytes);
  const b64 = btoa(binary);
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

/**
 * Session data for creation
 */
export interface CreateSessionData {
  userId: string;
  userAgent: string | null;
  expiresAt: string;
  familyId?: string; // Optional, will generate if not provided
}

/**
 * Prepare session data for database insertion
 */
export function prepareSessionData(data: CreateSessionData): {
  id: string;
  userId: string;
  refreshSecret: string;
  refreshHash: string;
  familyId: string;
  expiresAt: string;
  userAgent: string | null;
} {
  const sessionId = generateSessionId();
  const refreshSecret = generateRefreshSecret();
  const refreshHash = hashRefreshSecret(refreshSecret);
  const familyId = data.familyId || generateFamilyId();
  
  return {
    id: sessionId,
    userId: data.userId,
    refreshSecret, // Return this to client, don't store it
    refreshHash,   // Store this in database
    familyId,
    expiresAt: data.expiresAt,
    userAgent: data.userAgent,
  };
}

/**
 * Validate session
 * Returns validation result with reason code
 */
export function validateSession(session: Session | null): {
  valid: boolean;
  reason?: 'SESSION_NOT_FOUND' | 'SESSION_EXPIRED' | 'SESSION_REVOKED';
} {
  if (!session) {
    return { valid: false, reason: 'SESSION_NOT_FOUND' };
  }
  
  // Check if revoked
  if (session.revoked_at !== null) {
    return { valid: false, reason: 'SESSION_REVOKED' };
  }
  
  // Check if expired
  const now = new Date();
  const expiresAt = new Date(session.expires_at);
  if (expiresAt <= now) {
    return { valid: false, reason: 'SESSION_EXPIRED' };
  }
  
  return { valid: true };
}

/**
 * Check if session is part of a revoked family
 * This detects refresh token reuse attacks
 */
export function isSessionFamilyCompromised(
  session: Session,
  allFamilySessions: Session[]
): boolean {
  // If any session in the family is revoked, the entire family is compromised
  return allFamilySessions.some(s => s.revoked_at !== null);
}
