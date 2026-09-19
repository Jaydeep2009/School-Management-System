import { Hono } from 'hono';
import type { Env } from '../index';

const health = new Hono<{ Bindings: Env }>();

health.get('/', async (c) => {
  try {
    // Test database connection
    const result = await c.env.DB.prepare('SELECT 1 as health').first();
    
    return c.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      database: result ? 'connected' : 'disconnected',
    });
  } catch (error) {
    return c.json(
      {
        status: 'error',
        timestamp: new Date().toISOString(),
        database: 'disconnected',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      503
    );
  }
});

export default health;
