/**
 * Enrollment Routes
 * 
 * GET /enrollments - List enrollments
 * GET /enrollments/:id - Get enrollment by ID
 * POST /enrollments - Create enrollment (principal only)
 * PATCH /enrollments/:id - Update enrollment (principal only)
 */

import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import * as enrollmentService from './enrollment.service';
import * as enrollmentSchemas from './academic.schemas';
import { requireAuth, requireSchoolTenant, getRequestIdFromContext, type AuthContext } from '../auth/auth.middleware';
import { requirePrincipal } from '../auth/role.middleware';
import { ensureCanViewStudent } from '../authz/authz.service';
import { logAudit } from '../lib/audit/audit.service';
import type {
  CreateEnrollmentRequest,
  UpdateEnrollmentRequest,
} from './academic.types';

const enrollments = new Hono<AuthContext>();

/**
 * GET /enrollments
 * List enrollments
 * Authorization: Principal can view all, teachers can view their classroom enrollments, students can view their own
 * Optional filters: academic_year_id, classroom_id, student_id, status
 */
enrollments.get('/', requireAuth, async (c) => {
  try {
    const tenant = requireSchoolTenant(c);
    
    const filters = {
      academic_year_id: c.req.query('academic_year_id'),
      classroom_id: c.req.query('classroom_id'),
      student_id: c.req.query('student_id'),
      status: c.req.query('status') as 'planned' | 'active' | 'completed' | 'left' | 'transferred' | undefined,
    };
    
    // Authorization: If filtering by student_id and not principal, verify access
    if (filters.student_id && tenant.role !== 'principal') {
      await ensureCanViewStudent(c.env.DB, tenant, {
        studentId: filters.student_id,
        schoolId: tenant.schoolId,
      });
    }
    
    const enrollmentList = await enrollmentService.list(c.env.DB, tenant.schoolId, filters);
    return c.json({ data: enrollmentList }, 200);
  } catch (error) {
    if (error instanceof Error && error.message.includes('Forbidden')) {
      return c.json({ error: 'Forbidden' }, 403);
    }
    const message = error instanceof Error ? error.message : 'Failed to list enrollments';
    return c.json({ error: message }, 500);
  }
});

/**
 * GET /enrollments/:id
 * Get enrollment by ID
 * Authorization: Principal can view all, teachers can view their classroom enrollments, students can view their own
 */
enrollments.get('/:id', requireAuth, async (c) => {
  try {
    const tenant = requireSchoolTenant(c);
    const id = c.req.param('id')!; // Route guarantees id exists
    
    // Fetch enrollment (tenant-scoped)
    const enrollment = await enrollmentService.getById(c.env.DB, id, tenant.schoolId);
    
    // Authorization: Verify access to student
    if (tenant.role !== 'principal') {
      await ensureCanViewStudent(c.env.DB, tenant, {
        studentId: enrollment.student_id,
        schoolId: tenant.schoolId,
      });
    }
    
    return c.json({ data: enrollment }, 200);
  } catch (error) {
    if (error instanceof enrollmentService.EnrollmentError) {
      return c.json({ error: error.message }, error.statusCode as 400 | 404 | 500);
    }
    if (error instanceof Error && error.message.includes('Forbidden')) {
      return c.json({ error: 'Forbidden' }, 403);
    }
    const message = error instanceof Error ? error.message : 'Failed to get enrollment';
    return c.json({ error: message }, 500);
  }
});

/**
 * POST /enrollments
 * Create enrollment
 * Authorization: Principal only
 */
enrollments.post(
  '/',
  requireAuth,
  requirePrincipal(),
  zValidator('json', enrollmentSchemas.createEnrollmentSchema),
  async (c) => {
    try {
      const tenant = requireSchoolTenant(c);
      
      const body = c.req.valid('json') as CreateEnrollmentRequest;
      const enrollment = await enrollmentService.create(c.env.DB, tenant.schoolId, body);
      
      // Audit log
      await logAudit(c.env.DB, tenant, 'enrollment_created', 'enrollment', enrollment.id, null, enrollment);
      
      return c.json({ data: enrollment }, 201);
    } catch (error) {
      if (error instanceof enrollmentService.EnrollmentError) {
        return c.json({ error: error.message }, error.statusCode as 400 | 404 | 500);
      }
      if (error instanceof Error && error.message.includes('Forbidden')) {
        return c.json({ error: 'Forbidden' }, 403);
      }
      const message = error instanceof Error ? error.message : 'Failed to create enrollment';
      return c.json({ error: message }, 500);
    }
  }
);

/**
 * PATCH /enrollments/:id
 * Update enrollment
 * Authorization: Principal only
 */
enrollments.patch(
  '/:id',
  requireAuth,
  requirePrincipal(),
  zValidator('json', enrollmentSchemas.updateEnrollmentSchema),
  async (c) => {
    try {
      const tenant = requireSchoolTenant(c);
      
      const id = c.req.param('id')!; // Route guarantees id exists
      const body = c.req.valid('json') as UpdateEnrollmentRequest;
      
      // Get current state for audit
      const before = await enrollmentService.getById(c.env.DB, id, tenant.schoolId);
      
      const enrollment = await enrollmentService.update(c.env.DB, id, tenant.schoolId, body);
      
      // Audit log - special handling for status changes
      const action = body.status !== undefined && before.status !== body.status
        ? (body.status === 'completed' ? 'enrollment_completed' : 'enrollment_status_changed')
        : 'updated';
      
      await logAudit(c.env.DB, tenant, action, 'enrollment', id, before, enrollment);
      
      return c.json({ data: enrollment }, 200);
    } catch (error) {
      if (error instanceof enrollmentService.EnrollmentError) {
        return c.json({ error: error.message }, error.statusCode as 400 | 404 | 500);
      }
      if (error instanceof Error && error.message.includes('Forbidden')) {
        return c.json({ error: 'Forbidden' }, 403);
      }
      const message = error instanceof Error ? error.message : 'Failed to update enrollment';
      return c.json({ error: message }, 500);
    }
  }
);

export default enrollments;
