import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts}'],
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
