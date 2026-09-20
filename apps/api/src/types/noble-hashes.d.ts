/**
 * Type declarations for @noble/hashes
 * The package uses subpath exports which TypeScript needs help resolving
 */

declare module '@noble/hashes/scrypt.js' {
  export function scrypt(
    password: string | Uint8Array,
    salt: Uint8Array,
    opts: { N: number; r: number; p: number; dkLen?: number }
  ): Uint8Array;
}

declare module '@noble/hashes/sha2.js' {
  export function sha256(data: Uint8Array | string): Uint8Array;
  export function sha512(data: Uint8Array | string): Uint8Array;
}

declare module '@noble/hashes/utils.js' {
  export function randomBytes(length: number): Uint8Array;
  export function utf8ToBytes(str: string): Uint8Array;
  export function bytesToHex(bytes: Uint8Array): string;
  export function hexToBytes(hex: string): Uint8Array;
}
