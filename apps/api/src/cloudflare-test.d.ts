/**
 * Type declarations for Cloudflare Workers test environment
 */
declare module 'cloudflare:workers' {
  export interface Env {
    DB: D1Database;
    TEST_MIGRATIONS?: any;
    JWT_SECRET?: string;
  }

  export const env: Env;
  export const exports: any;
}

declare module 'cloudflare:test' {
  export function createExecutionContext(): ExecutionContext;
  export function waitOnExecutionContext(ctx: ExecutionContext): Promise<void>;
  export function reset(): Promise<void>;
  export function applyD1Migrations(
    db: D1Database,
    migrations: any[],
    migrationTableName?: string
  ): Promise<void>;
}
