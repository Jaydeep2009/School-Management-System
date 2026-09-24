/**
 * Teaching Assignment Routes
 * 
 * GET /teaching-assignments - List teaching assignments
 * GET /teaching-assignments/:id - Get teaching assignment by ID
 * POST /teaching-assignments - Create teaching assignment (principal only)
 * PATCH /teaching-assignments/:id - Update teaching assignment (principal only)
 */

import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import * as teachingAssignmentService from './teaching-assignment.service';
import * as teachingAssignmentSchemas from './academic.schemas';
import { requireAuth, requireSchoolTenant, getRequestIdFromContext, type AuthContext } from '../auth/auth.middleware';
import { requireRole } from '../authz/authz.service';
import { logAudit } from '../lib/audit/audit.service';
import type {
  CreateTeachingAssignmentRequest,
  UpdateTeachingAssignmentRequest,
} from './academic.types';

const teachingAssignments = new Hono<AuthContext>();

/**
 * GET /teaching-assignments
 * List teaching assignments
 * Authorization: Any authenticated user in the school
 * Optional filters: academic_year_id, teacher_id, classroom_id, subject_id, status
 */
teachingAssignments.get('/', requireAuth, async (c) => {
  try {
    const tenant = requireSchoolTenant(c);
    
    const filters = {
      academic_year_id: c.req.query('academic_year_id'),
      teacher_id: c.req.query('teacher_id'),
      classroom_id: c.req.query('classroom_id'),
      subject_id: c.req.query('subject_id'),
      status: c.req.query('status') as 'active' | 'completed' | undefined,
    };
    
    const assignments = await teachingAssignmentService.list(c.env.DB, tenant.schoolId, filters);
    return c.json({ data: assignments }, 200);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to list teaching assignments';
    return c.json({ error: message }, 500);
  }
});

/**
 * GET /teaching-assignments/:id
 * Get teaching assignment by ID
 * Authorization: Any authenticated user in the school
 */
teachingAssignments.get('/:id', requireAuth, async (c) => {
  try {
    const tenant = requireSchoolTenant(c);
    const id = c.req.param('id')!; // Route guarantees id exists
    
    const assignment = await teachingAssignmentService.getById(c.env.DB, id, tenant.schoolId);
    return c.json({ data: assignment }, 200);
  } catch (error) {
    if (error instanceof teachingAssignmentService.TeachingAssignmentError) {
      return c.json({ error: error.message }, error.statusCode as 400 | 404 | 500);
    }
    const message = error instanceof Error ? error.message : 'Failed to get teaching assignment';
    return c.json({ error: message }, 500);
  }
});

/**
 * POST /teaching-assignments
 * Create teaching assignment
 * Authorization: Principal only
 */
teachingAssignments.post(
  '/',
  requireAuth,
  zValidator('json', teachingAssignmentSchemas.createTeachingAssignmentSchema),
  async (c) => {
    try {
      const tenant = requireSchoolTenant(c);
      
      // Authorization: Principal only
      requireRole(tenant, 'principal');
      
      const body = c.req.valid('json') as CreateTeachingAssignmentRequest;
      const assignment = await teachingAssignmentService.create(c.env.DB, tenant.schoolId, body);
      
      // Audit log
      await logAudit(c.env.DB, tenant, 'teacher_assigned', 'teaching_assignment', assignment.id, null, assignment);
      
      return c.json({ data: assignment }, 201);
    } catch (error) {
      if (error instanceof teachingAssignmentService.TeachingAssignmentError) {
        return c.json({ error: error.message }, error.statusCode as 400 | 404 | 500);
      }
      if (error instanceof Error && error.message.includes('Forbidden')) {
        return c.json({ error: 'Forbidden' }, 403);
      }
      const message = error instanceof Error ? error.message : 'Failed to create teaching assignment';
      return c.json({ error: message }, 500);
    }
  }
);

/**
 * PATCH /teaching-assignments/:id
 * Update teaching assignment
 * Authorization: Principal only
 */
teachingAssignments.patch(
  '/:id',
  requireAuth,
  zValidator('json', teachingAssignmentSchemas.updateTeachingAssignmentSchema),
  async (c) => {
    try {
      const tenant = requireSchoolTenant(c);
      
      // Authorization: Principal only
      requireRole(tenant, 'principal');
      
      const id = c.req.param('id')!; // Route guarantees id exists
      const body = c.req.valid('json') as UpdateTeachingAssignmentRequest;
      
      // Get current state for audit
      const before = await teachingAssignmentService.getById(c.env.DB, id, tenant.schoolId);
      
      const assignment = await teachingAssignmentService.update(c.env.DB, id, tenant.schoolId, body);
      
      // Audit log - special handling for teacher changes
      const action = body.teacher_id !== undefined && before.teacher_id !== body.teacher_id
        ? 'teacher_changed'
        : 'updated';
      
      await logAudit(c.env.DB, tenant, action, 'teaching_assignment', id, before, assignment);
      
      return c.json({ data: assignment }, 200);
    } catch (error) {
      if (error instanceof teachingAssignmentService.TeachingAssignmentError) {
        return c.json({ error: error.message }, error.statusCode as 400 | 404 | 500);
      }
      if (error instanceof Error && error.message.includes('Forbidden')) {
        return c.json({ error: 'Forbidden' }, 403);
      }
      const message = error instanceof Error ? error.message : 'Failed to update teaching assignment';
      return c.json({ error: message }, 500);
    }
  }
);

export default teachingAssignments;
