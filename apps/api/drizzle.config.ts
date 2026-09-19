import type { Config } from 'drizzle-kit';

export default {
  schema: './src/lib/db/schema.ts',
  out: './migrations',
  driver: 'd1',
  dbCredentials: {
    wranglerConfigPath: './wrangler.jsonc',
    dbName: 'DB',
  },
} satisfies Config;
