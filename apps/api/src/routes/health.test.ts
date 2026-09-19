import { describe, it, expect, vi } from 'vitest';
import app from '../index';

describe('Health Route', () => {
  it('should return health status when database is available', async () => {
    const mockDB = {
      prepare: vi.fn().mockReturnValue({
        first: vi.fn().mockResolvedValue({ health: 1 }),
      }),
    };

    const req = new Request('http://localhost/health');
    const res = await app.fetch(req, { DB: mockDB as any });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toHaveProperty('status', 'ok');
    expect(data).toHaveProperty('database', 'connected');
    expect(data).toHaveProperty('timestamp');
  });

  it('should return error status when database fails', async () => {
    const mockDB = {
      prepare: vi.fn().mockReturnValue({
        first: vi.fn().mockRejectedValue(new Error('Database error')),
      }),
    };

    const req = new Request('http://localhost/health');
    const res = await app.fetch(req, { DB: mockDB as any });
    const data = await res.json();

    expect(res.status).toBe(503);
    expect(data).toHaveProperty('status', 'error');
    expect(data).toHaveProperty('database', 'disconnected');
  });
});
