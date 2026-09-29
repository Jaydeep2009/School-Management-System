/**
 * Password hashing and verification service
 * 
 * Uses scrypt via @noble/hashes for Worker-compatible password hashing
 * SECURITY: Never log passwords or hashes
 */

import { scrypt } from '@noble/hashes/scrypt.js';
import { randomBytes } from '@noble/hashes/utils.js';

const SCRYPT_PARAMS = {
  N: 8192,  // CPU/memory cost (2^13) - reduced for better performance in Workers
  r: 8,     // block size
  p: 1,     // parallelization
  dkLen: 32 // derived key length
};

const SALT_LENGTH = 16; // 16 bytes = 128 bits

/**
 * Hash a password using scrypt
 * Format: <algorithm>$<params>$<salt>$<hash>
 */
export async function hashPassword(password: string): Promise<string> {
  // Generate random salt
  const salt = randomBytes(SALT_LENGTH);
  
  // Derive key using scrypt
  const hash = scrypt(password, salt, SCRYPT_PARAMS);
  
  // Encode salt and hash as base64
  const saltB64 = bufferToBase64(salt);
  const hashB64 = bufferToBase64(hash);
  
  // Format: scrypt$16384:8:1$<salt>$<hash>
  const params = `${SCRYPT_PARAMS.N}:${SCRYPT_PARAMS.r}:${SCRYPT_PARAMS.p}`;
  return `scrypt$${params}$${saltB64}$${hashB64}`;
}

/**
 * Verify a password against a stored hash
 * Implements constant-time comparison
 */
export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  try {
    // Parse stored hash
    const parts = storedHash.split('$');
    if (parts.length !== 4 || parts[0] !== 'scrypt') {
      return false;
    }
    
    const [algorithm, paramsStr, saltB64, hashB64] = parts;
    
    // Parse parameters
    const paramParts = paramsStr.split(':');
    if (paramParts.length !== 3) {
      return false;
    }
    
    const N = parseInt(paramParts[0], 10);
    const r = parseInt(paramParts[1], 10);
    const p = parseInt(paramParts[2], 10);
    
    if (isNaN(N) || isNaN(r) || isNaN(p)) {
      return false;
    }
    
    // Decode salt and hash
    const salt = base64ToBuffer(saltB64);
    const expectedHash = base64ToBuffer(hashB64);
    
    // Derive key using same parameters
    const actualHash = scrypt(password, salt, { N, r, p, dkLen: expectedHash.length });
    
    // Constant-time comparison
    return timingSafeEqual(actualHash, expectedHash);
  } catch (error) {
    // Never expose error details that could leak information
    return false;
  }
}

/**
 * Timing-safe comparison of two Uint8Arrays
 */
function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) {
    return false;
  }
  
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a[i] ^ b[i];
  }
  
  return result === 0;
}

/**
 * Convert Uint8Array to base64 (URL-safe)
 */
function bufferToBase64(buffer: Uint8Array): string {
  // Convert to regular base64 first
  const bytes = Array.from(buffer);
  const binary = String.fromCharCode(...bytes);
  const b64 = btoa(binary);
  
  // Make URL-safe
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

/**
 * Convert base64 (URL-safe) to Uint8Array
 */
function base64ToBuffer(base64: string): Uint8Array {
  // Convert from URL-safe to regular base64
  let b64 = base64.replace(/-/g, '+').replace(/_/g, '/');
  
  // Add padding if needed
  while (b64.length % 4) {
    b64 += '=';
  }
  
  // Decode
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  
  return bytes;
}

/**
 * Generate a random activation code
 * Returns both the raw code (to send to user) and the hash (to store in DB)
 */
export async function generateActivationCode(): Promise<{ code: string; hash: string }> {
  // Generate 32 random bytes (256 bits of entropy)
  const bytes = randomBytes(32);
  
  // Convert to base64 for display
  const code = bufferToBase64(bytes);
  
  // Hash it for storage
  const hash = await hashPassword(code);
  
  return { code, hash };
}

/**
 * Validate password strength
 * Returns array of validation errors, empty if valid
 */
export function validatePasswordStrength(password: string): string[] {
  const errors: string[] = [];
  
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters');
  }
  
  if (password.length > 128) {
    errors.push('Password must not exceed 128 characters');
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  
  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  
  if (!/[^A-Za-z0-9]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }
  
  return errors;
}
