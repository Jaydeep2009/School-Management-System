# SMS D1 schema, spec v1.1

```
migrations/0001_init.sql      the schema (source of truth, apply with wrangler d1 migrations apply)
src/integrity-checks.ts       integrity queries, year-activation script, import-claim SQL
test/schema.test.ts           80 runnable tests + 15 service-level todos
docs/spec-v1.1-patch.md       what changed vs the V1 spec, and the rules to lock
```

## Run the tests

```bash
npm install
npm test
```

The suite applies the real migration to an in-memory SQLite database with foreign keys ON
(D1 always enforces them) and checks every rule in the spec's "Required Database Tests" section,
plus the review fixes, an end-to-end promotion -> activation run, and query plans for the hot queries.

## Apply to D1

```bash
wrangler d1 migrations apply <DB_NAME> --local     # first
wrangler d1 migrations apply <DB_NAME> --remote    # staging, then production
```

Tested on SQLite 3.49. Confirm triggers and composite foreign keys on D1 (local, then staging) before locking.

## For Kiro

- Treat `migrations/0001_init.sql` as the source of truth. Do not regenerate it from an ORM schema.
- Do not translate types to PostgreSQL. See the conventions at the top of the migration.
- Wire `INTEGRITY_CHECKS` into a nightly Cron Trigger and `ACTIVATION_PRECHECKS` into the year-activation step.
- The `it.todo` entries in `test/schema.test.ts` are the service-level tests to write next
  (with `@cloudflare/vitest-pool-workers`, against the Hono app).
