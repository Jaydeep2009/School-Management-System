import { defineConfig } from 'vitest/config';
import { cloudflareTest, readD1Migrations } from '@cloudflare/vitest-plugin';
import path from 'path';

export default defineConfig({
  plugins: [
    cloudflareTest(async () => {
      const migrationsPath = path.join(__dirname, 'migrations');
      const migrations = await readD1Migrations(migrationsPath);

      return {
        wrangler: {
          configPath: './wrangler.jsonc',
        },
        miniflare: {
          // Add a test-only binding for migrations so we can apply them
          bindings: { TEST_MIGRATIONS: migrations },
        },
      };
    }),
  ],
  test: {
    globals: true,
    include: ['src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts}'],
    setupFiles: ['./src/test-setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.test.ts', 'src/**/*.spec.ts'],
    },
  },
  resolve: {
    alias: {
      '@noble/hashes/scrypt': path.resolve(__dirname, 'node_modules/@noble/hashes/scrypt.js'),
      '@noble/hashes/scrypt.js': path.resolve(__dirname, 'node_modules/@noble/hashes/scrypt.js'),
      '@noble/hashes/sha2': path.resolve(__dirname, 'node_modules/@noble/hashes/sha2.js'),
      '@noble/hashes/sha2.js': path.resolve(__dirname, 'node_modules/@noble/hashes/sha2.js'),
      '@noble/hashes/utils': path.resolve(__dirname, 'node_modules/@noble/hashes/utils.js'),
      '@noble/hashes/utils.js': path.resolve(__dirname, 'node_modules/@noble/hashes/utils.js'),
    },
  },
});
