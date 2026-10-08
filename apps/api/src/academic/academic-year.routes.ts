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
import { requireAuth, requireSchoolTenant, getRequestIdFromContext, type AuthContext } from '../auth/auth.middleware';
import { requirePrincipal } from '../auth/role.middleware';
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
 * Caching: 1 hour (data changes infrequently)
 */
academicYears.get('/', requireAuth, async (c) => {
  try {
    const tenant = requireSchoolTenant(c);
    const years = await academicYearService.list(c.env.DB, tenant.schoolId);
    
    // Add cache headers - academic years don't change frequently
    c.header('Cache-Control', 'public, max-age=3600'); // 1 hour
    c.header('Vary', 'Authorization'); // Cache per user (school-scoped)
    
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
 * Caching: 30 minutes (checked frequently but changes rarely)
 */
academicYears.get('/current', requireAuth, async (c) => {
  try {
    const tenant = requireSchoolTenant(c);
    const current = await academicYearService.getCurrent(c.env.DB, tenant.schoolId);
    
    if (!current) {
      return c.json({ error: 'No current academic year found' }, 404);
    }
    
    // Cache for shorter time as this is checked frequently
    c.header('Cache-Control', 'public, max-age=1800'); // 30 minutes
    c.header('Vary', 'Authorization');
    
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
    const tenant = requireSchoolTenant(c);
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
  requirePrincipal(),
  zValidator('json', academicYearSchemas.createAcademicYearSchema),
  async (c) => {
    try {
      const tenant = requireSchoolTenant(c);
      
      const body = c.req.valid('json') as CreateAcademicYearRequest;
      const year = await academicYearService.create(c.env.DB, tenant.schoolId, body);
      
      // Audit log
      await logAudit(c.env.DB, tenant, 'created', 'academic_year', year.id, null, year);
      
      return c.json({ data: year }, 201);
    } catch (error) {
      if (error instanceof academicYearService.AcademicYearError) {
        return c.json({ error: error.message }, error.statusCode as 400 | 404 | 500);
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
  requirePrincipal(),
  zValidator('json', academicYearSchemas.updateAcademicYearSchema),
  async (c) => {
    try {
      const tenant = requireSchoolTenant(c);
      
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
academicYears.post('/:id/activate', requireAuth, requirePrincipal(), async (c) => {
  try {
    const tenant = requireSchoolTenant(c);
    
    const id = c.req.param('id')!; // Route guarantees id exists
    const year = await academicYearService.activate(c.env.DB, id, tenant.schoolId);
    
    // Audit log
    await logAudit(c.env.DB, tenant, 'activated', 'academic_year', id, null, year);
    
    return c.json({ data: year }, 200);
  } catch (error) {
    if (error instanceof academicYearService.AcademicYearError) {
      return c.json({ error: error.message }, error.statusCode as 400 | 404 | 500);
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
academicYears.post('/:id/close', requireAuth, requirePrincipal(), async (c) => {
  try {
    const tenant = requireSchoolTenant(c);
    
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

/**
 * POST /academic-years/:id/set-current
 * Set academic year as current (manual override)
 * Authorization: Principal only
 * 
 * This allows principal to manually control which academic year's data is displayed
 * Automatically closes any existing current year
 */
academicYears.post('/:id/set-current', requireAuth, requirePrincipal(), async (c) => {
  try {
    const tenant = requireSchoolTenant(c);
    
    const id = c.req.param('id')!;
    const year = await academicYearService.setAsCurrent(c.env.DB, id, tenant.schoolId);
    
    // Audit log
    await logAudit(c.env.DB, tenant, 'set_as_current', 'academic_year', id, null, year);
    
    return c.json({ 
      data: year, 
      message: 'Academic year set as current. All users will now see this year\'s data.' 
    }, 200);
  } catch (error) {
    if (error instanceof academicYearService.AcademicYearError) {
      return c.json({ error: error.message }, error.statusCode as 400 | 404 | 500);
    }
    const message = error instanceof Error ? error.message : 'Failed to set academic year as current';
    return c.json({ error: message }, 500);
  }
});

/**
 * GET /academic-years/:id/export
 * Export academic year data to Excel
 * Authorization: Principal only
 */
academicYears.get('/:id/export', requireAuth, requirePrincipal(), async (c) => {
  try {
    const tenant = requireSchoolTenant(c);
    const academicYearId = c.req.param('id')!;

    // Import the export service
    const exportService = await import('./academic-year-export.service');
    const data = await exportService.exportAcademicYearData(
      c.env.DB,
      academicYearId,
      tenant
    );

    await logAudit(
      c.env.DB,
      tenant,
      'academic_year_exported',
      'academic_year',
      academicYearId,
      null,
      null
    );

    return c.json({ data }, 200);
  } catch (error) {
    if (error instanceof academicYearService.AcademicYearError) {
      return c.json({ error: error.message }, error.statusCode);
    }
    const message =
      error instanceof Error ? error.message : 'Failed to export academic year data';
    return c.json({ error: message }, 500);
  }
});

export default academicYears;
