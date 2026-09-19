import { z } from 'zod';

/**
 * Pagination query parameters schema
 */
export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
});

export type PaginationInput = z.infer<typeof paginationSchema>;

/**
 * ID parameter schema
 */
export const idSchema = z.object({
  id: z.string().uuid(),
});

export type IdParam = z.infer<typeof idSchema>;

/**
 * Common date range filter
 */
export const dateRangeSchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

export type DateRangeFilter = z.infer<typeof dateRangeSchema>;

/**
 * Search query schema
 */
export const searchSchema = z.object({
  q: z.string().min(1).max(100),
});

export type SearchQuery = z.infer<typeof searchSchema>;
