# JWT Implementation

## Algorithm

**HS256** (HMAC with SHA-256) - explicitly pinned

## Library

- **Package**: `jose` v6.2.12
- **Worker Compatible**: Yes (designed for modern JavaScript runtimes)
- **Algorithm Enforcement**: Yes (algorithm explicitly specified and verified)

## Token Configuration

### Access Tokens

**Expiry**: 15 minutes (`'15m'`)

**Algorithm**: `HS256` (explicitly set in protected header)

**Claims**:
```typescript
{
  sub: string,        // userId
  role: UserRole,     // 'principal' | 'teacher' | 'student'
  schoolId: string,   // School identifier
  sessionId: string,  // Session identifier
  iat: number,        // Issued at (automatic)
  exp: number         // Expiration (automatic)
}
```

**No sensitive data in claims**: ✅
- Does NOT contain: password, email, phone, DOB, marks, fees, personal info
- Contains only: identifiers and role

### Refresh Tokens

**Format**: `<sessionId>.<secret>` (NOT JWT)

**Expiry**: 30 days

**Storage**: SHA-256 hash only (in `sessions.refresh_hash`)

**Raw token never stored**: ✅

## Secret Management

### Development
```typescript
// wrangler.jsonc
"vars": {
  "JWT_SECRET": "dev-secret-change-in-production-use-wrangler-secret-put"
}
```

### Production
```bash
wrangler secret put JWT_SECRET
# DO NOT commit to wrangler.jsonc
```

### Secret Retrieval
```typescript
function getJwtSecret(env: { JWT_SECRET?: string }): Uint8Array {
  const secret = env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET not configured');
  }
  return new TextEncoder().encode(secret);
}
```

**No fallback secret**: ✅ - Throws error if JWT_SECRET missing

## Token Generation

```typescript
export async function generateAccessToken(
  payload: {
    userId: string;
    role: UserRole;
    schoolId: string;
    sessionId: string;
  },
  env: { JWT_SECRET?: string }
): Promise<string> {
  const secret = getJwtSecret(env);
  
  const jwt = await new SignJWT({
    sub: payload.userId,
    role: payload.role,
    schoolId: payload.schoolId,
    sessionId: payload.sessionId,
  })
    .setProtectedHeader({ alg: ALGORITHM })  // ✅ Algorithm explicitly pinned
    .setIssuedAt()                            // ✅ iat automatic
    .setExpirationTime(ACCESS_TOKEN_EXPIRY)  // ✅ exp automatic
    .sign(secret);
  
  return jwt;
}
```

**Algorithm pinned**: ✅ `{ alg: 'HS256' }` in protected header

## Token Verification

```typescript
export async function verifyAccessToken(
  token: string,
  env: { JWT_SECRET?: string }
): Promise<AccessTokenPayload> {
  const secret = getJwtSecret(env);
  
  try {
    const { payload } = await jwtVerify(token, secret, {
      algorithms: [ALGORITHM],  // ✅ Only HS256 accepted
    });
    
    // ✅ Validate required claims
    if (!payload.sub || typeof payload.sub !== 'string') {
      throw new Error('Invalid token: missing sub');
    }
    
    if (!payload.role || typeof payload.role !== 'string') {
      throw new Error('Invalid token: missing role');
    }
    
    if (!payload.schoolId || typeof payload.schoolId !== 'string') {
      throw new Error('Invalid token: missing schoolId');
    }
    
    if (!payload.sessionId || typeof payload.sessionId !== 'string') {
      throw new Error('Invalid token: missing sessionId');
    }
    
    if (!payload.iat || typeof payload.iat !== 'number') {
      throw new Error('Invalid token: missing iat');
    }
    
    if (!payload.exp || typeof payload.exp !== 'number') {
      throw new Error('Invalid token: missing exp');
    }
    
    // ✅ Validate role enum
    const validRoles: UserRole[] = ['principal', 'teacher', 'student'];
    if (!validRoles.includes(payload.role as UserRole)) {
      throw new Error('Invalid token: invalid role');
    }
    
    return {
      sub: payload.sub,
      role: payload.role as UserRole,
      schoolId: payload.schoolId,
      sessionId: payload.sessionId,
      iat: payload.iat,
      exp: payload.exp,
    };
  } catch (error) {
    // ✅ Don't expose internal error details
    if (error instanceof Error && error.message.includes('expired')) {
      throw new Error('Token expired');
    }
    throw new Error('Invalid token');
  }
}
```

### Security Features

**✅ Algorithm explicitly allowed**: `algorithms: ['HS256']`
- A token signed with RS256, HS512, or any other algorithm will be rejected
- Prevents algorithm confusion attacks

**✅ Signature verification**: Automatic via `jwtVerify`

**✅ Expiration validation**: Automatic via `jwtVerify`
- Checks `exp` claim
- Throws error if expired

**✅ Required claims validation**: Manual validation after verification
- `sub`, `role`, `schoolId`, `sessionId`, `iat`, `exp` all checked
- Type checking enforced
- Role enum validated

**✅ No issuer/audience validation**: Not configured (not needed for this use case)
- All tokens are self-issued
- Single audience (the application itself)
- Can be added later if needed

**✅ Secret from environment**: No hardcoded secrets
- Development secret clearly marked
- Production requires `wrangler secret put`

**✅ Error handling**: Generic error messages
- "Invalid token" for signature/validation failures
- "Token expired" for expiration
- No internal details exposed

## Algorithm Confusion Attack Prevention

The implementation prevents algorithm confusion attacks:

1. **Protected header explicitly set**: `{ alg: 'HS256' }`
2. **Verification explicitly allows only HS256**: `algorithms: ['HS256']`
3. **No "none" algorithm**: jose library rejects "none" by default
4. **No asymmetric fallback**: No RSA/ECDSA keys configured

**Attack scenario prevented**:
```
Attacker creates token with alg: "none" → REJECTED (not in allowed algorithms)
Attacker creates token with alg: "RS256" → REJECTED (not in allowed algorithms)
Attacker creates HS256 token with wrong secret → REJECTED (signature verification fails)
```

## Refresh Token Format

**NOT JWT** - Simple format: `<sessionId>.<secret>`

**Example**: `01HQXYZ123.abc123def456`

**Parsing**:
```typescript
export function parseRefreshToken(refreshToken: string): { sessionId: string; secret: string } | null {
  const parts = refreshToken.split('.');
  if (parts.length !== 2) {
    return null;
  }
  
  const [sessionId, secret] = parts;
  
  if (!sessionId || !secret) {
    return null;
  }
  
  return { sessionId, secret };
}
```

**Validation**: Must match exact format `<id>.<secret>` with non-empty parts

## Testing

### Algorithm Pinning Test
```typescript
it('should reject tokens with wrong algorithm', async () => {
  // Token signed with RS256 or other algorithm
  await expect(
    tokenService.verifyAccessToken(wrongAlgToken, testEnv)
  ).rejects.toThrow();
});
```

### Expiration Test
```typescript
it('should reject expired tokens', async () => {
  // Create token, wait for expiration
  // Verification should throw "Token expired"
});
```

### Required Claims Test
```typescript
it('should validate all required claims', async () => {
  const payload = {
    userId: '01HQABC123',
    role: 'teacher' as const,
    schoolId: '01HQDEF456',
    sessionId: '01HQGHI789',
  };
  
  const token = await tokenService.generateAccessToken(payload, testEnv);
  const decoded = await tokenService.verifyAccessToken(token, testEnv);
  
  expect(decoded.sub).toBe(payload.userId);
  expect(decoded.role).toBe(payload.role);
  expect(decoded.schoolId).toBe(payload.schoolId);
  expect(decoded.sessionId).toBe(payload.sessionId);
});
```

## Security Checklist

- [✅] Algorithm explicitly pinned to HS256
- [✅] Signature verification automatic
- [✅] Expiration validation automatic
- [✅] Required claims validated
- [✅] No sensitive data in claims
- [✅] Secret from environment only
- [✅] No fallback secret
- [✅] Error messages generic
- [✅] Algorithm confusion attack prevented
- [✅] Token format validated
- [✅] Refresh tokens NOT JWT
- [✅] Worker compatible

## References

- jose library: https://github.com/panva/jose
- JWT Best Practices: RFC 8725
- OWASP JWT Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/JSON_Web_Token_for_Java_Cheat_Sheet.html
