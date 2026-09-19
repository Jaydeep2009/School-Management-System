import { z } from 'zod';

/**
 * Health check response schema
 */
export const healthCheckResponseSchema = z.object({
  status: z.enum(['ok', 'error']),
  timestamp: z.string().datetime(),
  database: z.enum(['connected', 'disconnected']),
  error: z.string().optional(),
});
