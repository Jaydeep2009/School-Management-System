/**
 * School Management Routes
 * 
 * Super Admin platform-level school management and Principal provisioning
 * 
 * POST   /schools - Create school
 * GET    /schools - List schools
 * GET    /schools/:id - Get school details
 * PUT    /schools/:id - Update school
 * POST   /schools/:id/suspend - Suspend school
 * POST   /schools/:id/activate - Activate school
 * POST   /schools/:id/archive - Archive school
 * POST   /schools/:id/principal - Create Principal for school
 */

import { Hono } from 'hono';
import { requireAuth, requireSuperAdmin, type AuthContext } from '../auth/auth.middleware';
import * as schoolsService from './schools.service';
import * as schoolsSchemas from './schools.schemas';
import { SchoolError } from './schools.errors';

const app = new Hono<AuthContext>();

/**
 * Create school
 * SECURITY: Super Admin only
 */
app.post('/', requireAuth, async (c) => {
  try {
    const tenant = requireSuperAdmin(c);
    const body = await c.req.json();
    const validated = schoolsSchemas.createSchoolSchema.parse(body);

    const school = await schoolsService.createSchool(c.env.DB, validated, tenant);

    return c.json({ data: school }, 201);
  } catch (error) {
    if (error instanceof SchoolError) {
      return c.json({ error: error.message }, error.statusCode as any);
    }
    if (error instanceof Error && error.message.includes('Forbidden')) {
      return c.json({ error: 'Forbidden' }, 403);
    }
    console.error('Create school error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

/**
 * List schools
 * SECURITY: Super Admin only
 */
app.get('/', requireAuth, async (c) => {
  try {
    const tenant = requireSuperAdmin(c);
    const query = c.req.query();
    const filters = schoolsSchemas.schoolFiltersSchema.parse(query);

    const schools = await schoolsService.listSchools(c.env.DB, filters, tenant);

    return c.json({ data: schools });
  } catch (error) {
    if (error instanceof Error && error.message.includes('Forbidden')) {
      return c.json({ error: 'Forbidden' }, 403);
    }
    console.error('List schools error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

/**
 * Get school details
 * SECURITY: Super Admin only
 */
app.get('/:id', requireAuth, async (c) => {
  try {
    const tenant = requireSuperAdmin(c);
    const schoolId = c.req.param('id');

    if (!schoolId) {
      return c.json({ error: 'School ID is required' }, 400);
    }

    const school = await schoolsService.getSchool(c.env.DB, schoolId, tenant);

    return c.json({ data: school });
  } catch (error) {
    if (error instanceof SchoolError) {
      return c.json({ error: error.message }, error.statusCode as 400 | 403 | 404 | 409 | 500);
    }
    if (error instanceof Error && error.message.includes('Forbidden')) {
      return c.json({ error: 'Forbidden' }, 403);
    }
    console.error('Get school error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

/**
 * Update school
 * SECURITY: Super Admin only
 */
app.put('/:id', requireAuth, async (c) => {
  try {
    const tenant = requireSuperAdmin(c);
    const schoolId = c.req.param('id');
    
    if (!schoolId) {
      return c.json({ error: 'School ID is required' }, 400);
    }
    
    const body = await c.req.json();
    const validated = schoolsSchemas.updateSchoolSchema.parse(body);

    const school = await schoolsService.updateSchool(c.env.DB, schoolId, validated, tenant);

    return c.json({ data: school });
  } catch (error) {
    if (error instanceof SchoolError) {
      return c.json({ error: error.message }, error.statusCode as 400 | 403 | 404 | 409 | 500);
    }
    if (error instanceof Error && error.message.includes('Forbidden')) {
      return c.json({ error: 'Forbidden' }, 403);
    }
    console.error('Update school error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

/**
 * Suspend school
 * SECURITY: Super Admin only
 * 
 * Prevents all school users from authenticating
 */
app.post('/:id/suspend', requireAuth, async (c) => {
  try {
    const tenant = requireSuperAdmin(c);
    const schoolId = c.req.param('id');

    if (!schoolId) {
      return c.json({ error: 'School ID is required' }, 400);
    }

    const school = await schoolsService.suspendSchool(c.env.DB, schoolId, tenant);

    return c.json({ data: school });
  } catch (error) {
    if (error instanceof SchoolError) {
      return c.json({ error: error.message }, error.statusCode as 400 | 403 | 404 | 409 | 500);
    }
    if (error instanceof Error && error.message.includes('Forbidden')) {
      return c.json({ error: 'Forbidden' }, 403);
    }
    console.error('Suspend school error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

/**
 * Activate school (unsuspend)
 * SECURITY: Super Admin only
 */
app.post('/:id/activate', requireAuth, async (c) => {
  try {
    const tenant = requireSuperAdmin(c);
    const schoolId = c.req.param('id');

    if (!schoolId) {
      return c.json({ error: 'School ID is required' }, 400);
    }

    const school = await schoolsService.activateSchool(c.env.DB, schoolId, tenant);

    return c.json({ data: school });
  } catch (error) {
    if (error instanceof SchoolError) {
      return c.json({ error: error.message }, error.statusCode as 400 | 403 | 404 | 409 | 500);
    }
    if (error instanceof Error && error.message.includes('Forbidden')) {
      return c.json({ error: 'Forbidden' }, 403);
    }
    console.error('Activate school error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

/**
 * Archive school
 * SECURITY: Super Admin only
 * 
 * Terminal state - no restoration
 * Historical data preserved
 */
app.post('/:id/archive', requireAuth, async (c) => {
  try {
    const tenant = requireSuperAdmin(c);
    const schoolId = c.req.param('id');

    if (!schoolId) {
      return c.json({ error: 'School ID is required' }, 400);
    }

    const school = await schoolsService.archiveSchool(c.env.DB, schoolId, tenant);

    return c.json({ data: school });
  } catch (error) {
    if (error instanceof SchoolError) {
      return c.json({ error: error.message }, error.statusCode as 400 | 403 | 404 | 409 | 500);
    }
    if (error instanceof Error && error.message.includes('Forbidden')) {
      return c.json({ error: 'Forbidden' }, 403);
    }
    console.error('Archive school error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

/**
 * Create Principal for school
 * SECURITY: Super Admin only
 * 
 * Creates first Principal account with temporary password
 */
app.post('/:id/principal', requireAuth, async (c) => {
  try {
    const tenant = requireSuperAdmin(c);
    const schoolId = c.req.param('id');
    
    if (!schoolId) {
      return c.json({ error: 'School ID is required' }, 400);
    }
    
    const body = await c.req.json();
    const validated = schoolsSchemas.createPrincipalSchema.parse(body);

    const result = await schoolsService.createPrincipal(c.env.DB, schoolId, validated, tenant);

    return c.json({ data: result }, 201);
  } catch (error) {
    if (error instanceof SchoolError) {
      return c.json({ error: error.message }, error.statusCode as 400 | 403 | 404 | 409 | 500);
    }
    if (error instanceof Error && error.message.includes('Forbidden')) {
      return c.json({ error: 'Forbidden' }, 403);
    }
    console.error('Create principal error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

/**
 * Change Principal for school
 * SECURITY: Super Admin only
 * 
 * Disables old principal and creates new one
 * Returns new principal credentials
 */
app.post('/:id/principal/change', requireAuth, async (c) => {
  try {
    const tenant = requireSuperAdmin(c);
    const schoolId = c.req.param('id');
    
    if (!schoolId) {
      return c.json({ error: 'School ID is required' }, 400);
    }
    
    const body = await c.req.json();
    const validated = schoolsSchemas.createPrincipalSchema.parse(body);

    const result = await schoolsService.changePrincipal(c.env.DB, schoolId, validated, tenant);

    return c.json({ data: result }, 200);
  } catch (error) {
    if (error instanceof SchoolError) {
      return c.json({ error: error.message }, error.statusCode as 400 | 403 | 404 | 409 | 500);
    }
    if (error instanceof Error && error.message.includes('Forbidden')) {
      return c.json({ error: 'Forbidden' }, 403);
    }
    console.error('Change principal error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

/**
 * Delete school (DANGEROUS OPERATION)
 * SECURITY: Super Admin only
 * 
 * Permanently deletes a school and ALL associated data:
 * - All users (students, teachers, principal)
 * - All academic data (grades, attendance, marks)
 * - All operational data (fees, timetables, etc.)
 * 
 * This operation is IRREVERSIBLE and requires:
 * 1. School name confirmation
 * 2. Understanding of data loss
 * 3. Final confirmation code
 */
app.delete('/:id', requireAuth, async (c) => {
  try {
    console.log('[DELETE SCHOOL] Request received');
    const tenant = requireSuperAdmin(c);
    console.log('[DELETE SCHOOL] Super admin verified:', tenant.userId);
    
    const schoolId = c.req.param('id');

    if (!schoolId) {
      return c.json({ error: 'School ID is required' }, 400);
    }

    console.log('[DELETE SCHOOL] School ID:', schoolId);

    const body = await c.req.json();
    console.log('[DELETE SCHOOL] Request body:', body);
    
    // Require school name confirmation
    if (!body.confirmSchoolName) {
      return c.json({ 
        error: 'School name confirmation is required',
        message: 'Please provide the exact school name in confirmSchoolName field'
      }, 400);
    }

    // Require confirmation code
    if (body.confirmationCode !== 'DELETE') {
      return c.json({ 
        error: 'Invalid confirmation code',
        message: 'Please type DELETE (all caps) to confirm'
      }, 400);
    }

    console.log('[DELETE SCHOOL] Starting deletion process...');

    const result = await schoolsService.deleteSchool(
      c.env.DB, 
      schoolId, 
      body.confirmSchoolName,
      tenant
    );

    console.log('[DELETE SCHOOL] Deletion completed successfully');

    return c.json({ 
      message: 'School and all associated data permanently deleted',
      data: result 
    }, 200);
  } catch (error) {
    console.error('[DELETE SCHOOL] Error caught in route:', error);
    console.error('[DELETE SCHOOL] Error stack:', error instanceof Error ? error.stack : 'No stack');
    
    if (error instanceof SchoolError) {
      return c.json({ error: error.message }, error.statusCode as 400 | 403 | 404 | 409 | 500);
    }
    if (error instanceof Error && error.message.includes('Forbidden')) {
      return c.json({ error: 'Forbidden' }, 403);
    }
    console.error('Delete school error:', error);
    return c.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

export default app;
