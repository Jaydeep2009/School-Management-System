import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import healthRoutes from './routes/health';
import authRoutes from './auth/auth.routes';

export type Env = {
  DB: D1Database;
  JWT_SECRET: string;
};

const app = new Hono<{ Bindings: Env }>();

// Middleware
app.use('*', logger());
app.use('*', cors());

// Routes
app.route('/health', healthRoutes);
app.route('/auth', authRoutes);

// Default route
app.get('/', (c) => {
  return c.json({
    message: 'School Management System API',
    version: '1.0.0',
  });
});

// 404 handler
app.notFound((c) => {
  return c.json({ error: 'Not Found' }, 404);
});

// Error handler
app.onError((err, c) => {
  console.error(`Error: ${err.message}`);
  return c.json({ error: 'Internal Server Error' }, 500);
});

export default app;
