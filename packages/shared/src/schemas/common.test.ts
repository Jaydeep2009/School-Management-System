import { describe, it, expect } from 'vitest';
import { paginationSchema, idSchema, dateRangeSchema, searchSchema } from './common';

describe('Common Schemas', () => {
  describe('paginationSchema', () => {
    it('should validate correct pagination parameters', () => {
      const result = paginationSchema.parse({ page: 2, pageSize: 10 });
      expect(result.page).toBe(2);
      expect(result.pageSize).toBe(10);
    });

    it('should use default values', () => {
      const result = paginationSchema.parse({});
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(20);
    });

    it('should coerce string to number', () => {
      const result = paginationSchema.parse({ page: '3', pageSize: '15' });
      expect(result.page).toBe(3);
      expect(result.pageSize).toBe(15);
    });

    it('should reject invalid page numbers', () => {
      expect(() => paginationSchema.parse({ page: 0 })).toThrow();
      expect(() => paginationSchema.parse({ page: -1 })).toThrow();
    });

    it('should reject pageSize over 100', () => {
      expect(() => paginationSchema.parse({ pageSize: 101 })).toThrow();
    });
  });

  describe('idSchema', () => {
    it('should validate correct UUID', () => {
      const uuid = '123e4567-e89b-12d3-a456-426614174000';
      const result = idSchema.parse({ id: uuid });
      expect(result.id).toBe(uuid);
    });

    it('should reject invalid UUID', () => {
      expect(() => idSchema.parse({ id: 'not-a-uuid' })).toThrow();
    });
  });

  describe('dateRangeSchema', () => {
    it('should validate correct date range', () => {
      const result = dateRangeSchema.parse({
        startDate: '2024-01-01T00:00:00Z',
        endDate: '2024-12-31T23:59:59Z',
      });
      expect(result.startDate).toBeDefined();
      expect(result.endDate).toBeDefined();
    });

    it('should allow optional dates', () => {
      const result = dateRangeSchema.parse({});
      expect(result.startDate).toBeUndefined();
      expect(result.endDate).toBeUndefined();
    });
  });

  describe('searchSchema', () => {
    it('should validate search query', () => {
      const result = searchSchema.parse({ q: 'test query' });
      expect(result.q).toBe('test query');
    });

    it('should reject empty query', () => {
      expect(() => searchSchema.parse({ q: '' })).toThrow();
    });

    it('should reject query over 100 characters', () => {
      const longQuery = 'a'.repeat(101);
      expect(() => searchSchema.parse({ q: longQuery })).toThrow();
    });
  });
});
