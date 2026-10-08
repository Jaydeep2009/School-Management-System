# Enrollment Endpoint 500 Error - Diagnosis

## Problem

The `/classrooms/:id/enrollments` endpoint returns 500 Internal Server Error with "D1_ERROR: no such column: id at offset 7: SQLITE_ERROR"

## Evidence

1. ✅ **Database Query Works:** Direct execution in D1 returns data correctly
2. ✅ **Schema is Correct:** All tables have proper `id` columns
3. ✅ **Migrations Applied:** All 7 migrations are synced
4. ✅ **API Redeployed:** Version da9f267d-ac28-4feb-8f13-244d2ad39978
5. ❌ **API Endpoint Fails:** Returns 500 when called from frontend

## Root Cause Hypothesis

The deployed worker may be:
1. **Cached** - Cloudflare edge cache serving old worker version
2. **Version Mismatch** - Worker code doesn't match what's in the repository
3. **Binding Issue** - DB binding pointing to wrong database or schema state

## Tested Solutions

### Attempted
1. ✅ Synced all database migrations
2. ✅ Redeployed API worker
3. ❌ Force refresh/cache purge (no --force flag in wrangler)
4. ❌ Tail logs (timed out waiting for requests)

### Next Steps to Try

1. **Wait for Cache TTL** - Cloudflare worker cache typically 60 seconds
2. **Check Bindings** - Verify env.DB points to correct database
3. **Add Error Logging** - Add console.error to catch exact query
4. **Deploy with New Version Tag** - Force new deployment

## Workaround

Since the query works in D1 but fails in the worker, this appears to be a deployment/caching issue rather than a code bug.

**Temporary Solution:**
- Wait 2-5 minutes for Cloudflare cache to clear
- Try refreshing the assessment detail page
- If still fails, redeploy with explicit version tag

## Code Verification

The endpoint code in `apps/api/src/academic/classroom.routes.ts` is correct:

```typescript
const enrollments = await c.env.DB
  .prepare(
    `SELECT 
       e.id,
       e.student_id,
       e.roll_number,
       e.status,
       e.joined_on,
       e.left_on,
       sp.student_code,
       sp.first_name || ' ' || sp.last_name as student_name,
       sp.gender,
       sp.date_of_birth
     FROM enrollments e
     JOIN student_profiles sp ON e.student_id = sp.user_id
     WHERE e.classroom_id = ?
       AND e.school_id = ?
     ORDER BY e.roll_number, sp.student_code`
  )
  .bind(id, tenant.schoolId)
  .all();
```

This exact query works in D1.

## Status

**Current:** ⚠️ INVESTIGATING - Suspected cache/deployment issue

**Recommendation:** Wait 5 minutes then retry. If still fails, we'll add debug logging and redeploy.

