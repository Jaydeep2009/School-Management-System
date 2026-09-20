/**
 * Academic Year Routes
 * 
 * GET /academic-years - List all academic years
 * GET /academic-years/current - Get current academic year
 * GET /academic-years/:id - Get academic year by ID
 * POST /academic-years - Create academic year (principal only)
 * PATCH /academic-years/:id - Update academic year (principal only)
 * POST /academic-years/:id/activate - Activate academic year (principal only)
 * POST /academic-years/:id/close - Close academic year (principal only)
 */

import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import * as academicYearService from './academic-year.service';
import * as academicYearSchemas from './academic.schemas';
import { requireAuth, getTenant, getRequestIdFromContext, type AuthContext } from '../auth/auth.middleware';
import { requireRole } from '../authz/authz.service';
import { logAudit } from '../lib/audit/audit.service';
import type {
  CreateAcademicYearRequest,
  UpdateAcademicYearRequest,
} from './academic.types';

const academicYears = new Hono<AuthContext>();

/**
 * GET /academic-years
 * List all academic years
 * Authorization: Any authenticated user in the school
 */
academicYears.get('/', requireAuth, async (c) => {
  try {
    const tenant = getTenant(c);
    const years = await academicYearService.list(c.env.DB, tenant.schoolId);
    return c.json({ data: years }, 200);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to list academic years';
    return c.json({ error: message }, 500);
  }
});

/**
 * GET /academic-years/current
 * Get current academic year
 * Authorization: Any authenticated user in the school
 */
academicYears.get('/current', requireAuth, async (c) => {
  try {
    const tenant = getTenant(c);
    const current = await academicYearService.getCurrent(c.env.DB, tenant.schoolId);
    
    if (!current) {
      return c.json({ error: 'No current academic year found' }, 404);
    }
    
    return c.json({ data: current }, 200);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get current academic year';
    return c.json({ error: message }, 500);
  }
});

/**
 * GET /academic-years/:id
 * Get academic year by ID
 * Authorization: Any authenticated user in the school
 */
academicYears.get('/:id', requireAuth, async (c) => {
  try {
    const tenant = getTenant(c);
    const id = c.req.param('id')!; // Route guarantees id exists
    
    const year = await academicYearService.getById(c.env.DB, id, tenant.schoolId);
    return c.json({ data: year }, 200);
  } catch (error) {
    if (error instanceof academicYearService.AcademicYearError) {
      return c.json({ error: error.message }, error.statusCode as 400 | 404 | 500);
    }
    const message = error instanceof Error ? error.message : 'Failed to get academic year';
    return c.json({ error: message }, 500);
  }
});

/**
 * POST /academic-years
 * Create academic year
 * Authorization: Principal only
 */
academicYears.post(
  '/',
  requireAuth,
  zValidator('json', academicYearSchemas.createAcademicYearSchema),
  async (c) => {
    try {
      const tenant = getTenant(c);
      
      // Authorization: Principal only
      requireRole(tenant, 'principal');
      
      const body = c.req.valid('json') as CreateAcademicYearRequest;
      const year = await academicYearService.create(c.env.DB, tenant.schoolId, body);
      
      // Audit log
      await logAudit(c.env.DB, tenant, 'created', 'academic_year', year.id, null, year);
      
      return c.json({ data: year }, 201);
    } catch (error) {
      if (error instanceof academicYearService.AcademicYearError) {
        return c.json({ error: error.message }, error.statusCode as 400 | 404 | 500);
      }
      if (error instanceof Error && error.message.includes('Forbidden')) {
        return c.json({ error: 'Forbidden' }, 403);
      }
      const message = error instanceof Error ? error.message : 'Failed to create academic year';
      return c.json({ error: message }, 500);
    }
  }
);

/**
 * PATCH /academic-years/:id
 * Update academic year
 * Authorization: Principal only
 */
academicYears.patch(
  '/:id',
  requireAuth,
  zValidator('json', academicYearSchemas.updateAcademicYearSchema),
  async (c) => {
    try {
      const tenant = getTenant(c);
      
      // Authorization: Principal only
      requireRole(tenant, 'principal');
      
      const id = c.req.param('id')!; // Route guarantees id exists
      const body = c.req.valid('json') as UpdateAcademicYearRequest;
      
      // Get current state for audit
      const before = await academicYearService.getById(c.env.DB, id, tenant.schoolId);
      
      const year = await academicYearService.update(c.env.DB, id, tenant.schoolId, body);
      
      // Audit log
      await logAudit(c.env.DB, tenant, 'updated', 'academic_year', id, before, year);
      
      return c.json({ data: year }, 200);
    } catch (error) {
      if (error instanceof academicYearService.AcademicYearError) {
        return c.json({ error: error.message }, error.statusCode as 400 | 404 | 500);
      }
      if (error instanceof Error && error.message.includes('Forbidden')) {
        return c.json({ error: 'Forbidden' }, 403);
      }
      const message = error instanceof Error ? error.message : 'Failed to update academic year';
      return c.json({ error: message }, 500);
    }
  }
);

/**
 * POST /academic-years/:id/activate
 * Activate academic year (set to current)
 * Authorization: Principal only
 */
academicYears.post('/:id/activate', requireAuth, async (c) => {
  try {
    const tenant = getTenant(c);
    
    // Authorization: Principal only
    requireRole(tenant, 'principal');
    
    const id = c.req.param('id')!; // Route guarantees id exists
    const year = await academicYearService.activate(c.env.DB, id, tenant.schoolId);
    
    // Audit log
    await logAudit(c.env.DB, tenant, 'activated', 'academic_year', id, null, year);
    
    return c.json({ data: year }, 200);
  } catch (error) {
    if (error instanceof academicYearService.AcademicYearError) {
      return c.json({ error: error.message }, error.statusCode as 400 | 404 | 500);
    }
    if (error instanceof Error && error.message.includes('Forbidden')) {
      return c.json({ error: 'Forbidden' }, 403);
    }
    const message = error instanceof Error ? error.message : 'Failed to activate academic year';
    return c.json({ error: message }, 500);
  }
});

/**
 * POST /academic-years/:id/close
 * Close academic year
 * Authorization: Principal only
 */
academicYears.post('/:id/close', requireAuth, async (c) => {
  try {
    const tenant = getTenant(c);
    
    // Authorization: Principal only
    requireRole(tenant, 'principal');
    
    const id = c.req.param('id')!; // Route guarantees id exists
    const year = await academicYearService.close(c.env.DB, id, tenant.schoolId);
    
    // Audit log
    await logAudit(c.env.DB, tenant, 'closed', 'academic_year', id, null, year);
    
    return c.json({ data: year }, 200);
  } catch (error) {
    if (error instanceof academicYearService.AcademicYearError) {
      return c.json({ error: error.message }, error.statusCode as 400 | 404 | 500);
    }
    if (error instanceof Error && error.message.includes('Forbidden')) {
      return c.json({ error: 'Forbidden' }, 403);
    }
    const message = error instanceof Error ? error.message : 'Failed to close academic year';
    return c.json({ error: message }, 500);
  }
});

export default academicYears;
