import { describe, it, expect } from 'vitest';
import type { HealthCheckResponse, ApiResponse, PaginatedResponse } from './index';

describe('Shared Types', () => {
  it('should have correct HealthCheckResponse structure', () => {
    const response: HealthCheckResponse = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      database: 'connected',
    };

    expect(response.status).toBe('ok');
    expect(response.database).toBe('connected');
    expect(response.timestamp).toBeDefined();
  });

  it('should have correct ApiResponse structure', () => {
    const response: ApiResponse<string> = {
      data: 'test data',
      message: 'success',
    };

    expect(response.data).toBe('test data');
    expect(response.message).toBe('success');
  });

  it('should have correct PaginatedResponse structure', () => {
    const response: PaginatedResponse<string> = {
      data: ['item1', 'item2'],
      meta: {
        page: 1,
        pageSize: 20,
        totalPages: 1,
        totalCount: 2,
      },
    };

    expect(response.data).toHaveLength(2);
    expect(response.meta.page).toBe(1);
  });
});
