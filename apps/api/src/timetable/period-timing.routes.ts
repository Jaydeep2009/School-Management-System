/**
 * Period Timing Routes
 * API endpoints for managing period timings
 */

import { Hono } from 'hono';
import { requireAuth, requireSchoolTenant } from '../auth/auth.middleware';
import { requirePrincipal } from '../auth/role.middleware';
import * as periodTimingService from './period-timing.service';
import type { CreatePeriodTimingInput, UpdatePeriodTimingInput } from './period-timing.types';
import type { Env } from '../index';

const periodTimings = new Hono<{ Bindings: Env }>();

/**
 * GET /period-timings
 * List period timings for an academic year
 * Authorization: All authenticated users (students, teachers, principals need to see breaks in timetable)
 */
periodTimings.get('/', requireAuth, async (c) => {
  try {
    const tenant = requireSchoolTenant(c);
    const academicYearId = c.req.query('academic_year_id');

    if (!academicYearId) {
      return c.json({ error: 'academic_year_id is required' }, 400);
    }

    const timings = await periodTimingService.list(
      c.env.DB,
      tenant.schoolId,
      academicYearId
    );

    return c.json({ data: timings }, 200);
  } catch (error) {
    if (error instanceof periodTimingService.PeriodTimingError) {
      return c.json({ error: error.message }, error.statusCode as any);
    }
    const message = error instanceof Error ? error.message : 'Failed to list period timings';
    return c.json({ error: message }, 500);
  }
});

/**
 * POST /period-timings
 * Create a period timing
 * Authorization: Principal only
 */
periodTimings.post('/', requireAuth, requirePrincipal(), async (c) => {
  try {
    const tenant = requireSchoolTenant(c);
    const input = await c.req.json<CreatePeriodTimingInput>();

    const timing = await periodTimingService.create(
      c.env.DB,
      tenant.schoolId,
      input
    );

    return c.json({ data: timing }, 201);
  } catch (error) {
    if (error instanceof periodTimingService.PeriodTimingError) {
      return c.json({ error: error.message }, error.statusCode as any);
    }
    const message = error instanceof Error ? error.message : 'Failed to create period timing';
    return c.json({ error: message }, 500);
  }
});

/**
 * POST /period-timings/initialize
 * Initialize default period timings for academic year
 * Authorization: Principal only
 */
periodTimings.post('/initialize', requireAuth, requirePrincipal(), async (c) => {
  try {
    const tenant = requireSchoolTenant(c);
    const { academic_year_id } = await c.req.json<{ academic_year_id: string }>();

    if (!academic_year_id) {
      return c.json({ error: 'academic_year_id is required' }, 400);
    }

    const timings = await periodTimingService.initializeDefaults(
      c.env.DB,
      tenant.schoolId,
      academic_year_id
    );

    return c.json({ data: timings }, 201);
  } catch (error) {
    if (error instanceof periodTimingService.PeriodTimingError) {
      return c.json({ error: error.message }, error.statusCode as any);
    }
    const message = error instanceof Error ? error.message : 'Failed to initialize period timings';
    return c.json({ error: message }, 500);
  }
});

/**
 * GET /period-timings/:id
 * Get period timing by ID
 * Authorization: Principal only
 */
periodTimings.get('/:id', requireAuth, requirePrincipal(), async (c) => {
  try {
    const tenant = requireSchoolTenant(c);
    const id = c.req.param('id')!;

    const timing = await periodTimingService.getById(
      c.env.DB,
      id,
      tenant.schoolId
    );

    return c.json({ data: timing }, 200);
  } catch (error) {
    if (error instanceof periodTimingService.PeriodTimingError) {
      return c.json({ error: error.message }, error.statusCode as any);
    }
    const message = error instanceof Error ? error.message : 'Failed to get period timing';
    return c.json({ error: message }, 500);
  }
});

/**
 * PATCH /period-timings/:id
 * Update period timing
 * Authorization: Principal only
 */
periodTimings.patch('/:id', requireAuth, requirePrincipal(), async (c) => {
  try {
    const tenant = requireSchoolTenant(c);
    const id = c.req.param('id')!;
    const input = await c.req.json<UpdatePeriodTimingInput>();

    const timing = await periodTimingService.update(
      c.env.DB,
      id,
      tenant.schoolId,
      input
    );

    return c.json({ data: timing }, 200);
  } catch (error) {
    if (error instanceof periodTimingService.PeriodTimingError) {
      return c.json({ error: error.message }, error.statusCode as any);
    }
    const message = error instanceof Error ? error.message : 'Failed to update period timing';
    return c.json({ error: message }, 500);
  }
});

/**
 * DELETE /period-timings/:id
 * Delete period timing
 * Authorization: Principal only
 */
periodTimings.delete('/:id', requireAuth, requirePrincipal(), async (c) => {
  try {
    const tenant = requireSchoolTenant(c);
    const id = c.req.param('id')!;

    await periodTimingService.remove(c.env.DB, id, tenant.schoolId);

    return c.json({ success: true }, 200);
  } catch (error) {
    if (error instanceof periodTimingService.PeriodTimingError) {
      return c.json({ error: error.message }, error.statusCode as any);
    }
    const message = error instanceof Error ? error.message : 'Failed to delete period timing';
    return c.json({ error: message }, 500);
  }
});

export default periodTimings;
