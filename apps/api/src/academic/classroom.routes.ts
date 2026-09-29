/**
 * Classroom Routes
 * 
 * GET /classrooms - List classrooms
 * GET /classrooms/:id - Get classroom by ID
 * POST /classrooms - Create classroom (principal only)
 * PATCH /classrooms/:id - Update classroom (principal only)
 */

import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import * as classroomService from './classroom.service';
import * as classroomSchemas from './academic.schemas';
import { requireAuth, requireSchoolTenant, getRequestIdFromContext, type AuthContext } from '../auth/auth.middleware';
import { requirePrincipal } from '../auth/role.middleware';
import { ensureCanViewClassroom } from '../authz/authz.service';
import { logAudit } from '../lib/audit/audit.service';
import type {
  CreateClassroomRequest,
  UpdateClassroomRequest,
} from './academic.types';

const classrooms = new Hono<AuthContext>();

/**
 * GET /classrooms
 * List classrooms
 * Authorization: Any authenticated user in the school
 * Optional filters: academic_year_id, status
 */
classrooms.get('/', requireAuth, async (c) => {
  try {
    const tenant = requireSchoolTenant(c);
    
    const filters = {
      academic_year_id: c.req.query('academic_year_id'),
      status: c.req.query('status') as 'active' | 'inactive' | 'archived' | undefined,
    };
    
    const classroomList = await classroomService.listWithRelations(c.env.DB, tenant.schoolId, filters);
    return c.json({ data: classroomList }, 200);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to list classrooms';
    return c.json({ error: message }, 500);
  }
});

/**
 * GET /classrooms/:id
 * Get classroom by ID
 * Authorization: Principal can view all, teachers can view their classrooms, students can view their classroom
 */
classrooms.get('/:id', requireAuth, async (c) => {
  try {
    const tenant = requireSchoolTenant(c);
    const id = c.req.param('id')!; // Route guarantees id exists
    
    // Fetch classroom (tenant-scoped)
    const classroom = await classroomService.getByIdWithRelations(c.env.DB, id, tenant.schoolId);
    
    // Authorization check
    await ensureCanViewClassroom(c.env.DB, tenant, {
      classroomId: id,
      schoolId: tenant.schoolId,
    });
    
    return c.json({ data: classroom }, 200);
  } catch (error) {
    if (error instanceof classroomService.ClassroomError) {
      return c.json({ error: error.message }, error.statusCode as 400 | 404 | 500);
    }
    if (error instanceof Error && error.message.includes('Forbidden')) {
      return c.json({ error: 'Forbidden' }, 403);
    }
    const message = error instanceof Error ? error.message : 'Failed to get classroom';
    return c.json({ error: message }, 500);
  }
});

/**
 * POST /classrooms
 * Create classroom
 * Authorization: Principal only
 */
classrooms.post(
  '/',
  requireAuth,
  requirePrincipal(),
  zValidator('json', classroomSchemas.createClassroomSchema),
  async (c) => {
    try {
      const tenant = requireSchoolTenant(c);
      
      const body = c.req.valid('json') as CreateClassroomRequest;
      const classroom = await classroomService.create(c.env.DB, tenant.schoolId, body);
      
      // Audit log
      await logAudit(c.env.DB, tenant, 'created', 'classroom', classroom.id, null, classroom);
      
      return c.json({ data: classroom }, 201);
    } catch (error) {
      if (error instanceof classroomService.ClassroomError) {
        return c.json({ error: error.message }, error.statusCode as 400 | 404 | 500);
      }
      if (error instanceof Error && error.message.includes('Forbidden')) {
        return c.json({ error: 'Forbidden' }, 403);
      }
      const message = error instanceof Error ? error.message : 'Failed to create classroom';
      return c.json({ error: message }, 500);
    }
  }
);

/**
 * PATCH /classrooms/:id
 * Update classroom
 * Authorization: Principal only
 */
classrooms.patch(
  '/:id',
  requireAuth,
  requirePrincipal(),
  zValidator('json', classroomSchemas.updateClassroomSchema),
  async (c) => {
    try {
      const tenant = requireSchoolTenant(c);
      
      const id = c.req.param('id')!; // Route guarantees id exists
      const body = c.req.valid('json') as UpdateClassroomRequest;
      
      // Get current state for audit
      const before = await classroomService.getById(c.env.DB, id, tenant.schoolId);
      
      const classroom = await classroomService.update(c.env.DB, id, tenant.schoolId, body);
      
      // Audit log - special handling for class teacher changes
      const action = body.class_teacher_id !== undefined && before.class_teacher_id !== body.class_teacher_id
        ? (body.class_teacher_id === null ? 'class_teacher_removed' : 'class_teacher_assigned')
        : 'updated';
      
      await logAudit(c.env.DB, tenant, action, 'classroom', id, before, classroom);
      
      return c.json({ data: classroom }, 200);
    } catch (error) {
      if (error instanceof classroomService.ClassroomError) {
        return c.json({ error: error.message }, error.statusCode as 400 | 404 | 500);
      }
      if (error instanceof Error && error.message.includes('Forbidden')) {
        return c.json({ error: 'Forbidden' }, 403);
      }
      const message = error instanceof Error ? error.message : 'Failed to update classroom';
      return c.json({ error: message }, 500);
    }
  }
);

/**
 * DELETE /classrooms/:id
 * Delete classroom
 * Authorization: Principal only
 * Note: Only allows deletion if no enrollments exist
 */
classrooms.delete(
  '/:id',
  requireAuth,
  requirePrincipal(),
  async (c) => {
    try {
      const tenant = requireSchoolTenant(c);
      const id = c.req.param('id')!;
      
      // Get classroom data for audit before deletion
      const before = await classroomService.getById(c.env.DB, id, tenant.schoolId);
      
      // Delete classroom
      await classroomService.deleteClassroom(c.env.DB, id, tenant.schoolId);
      
      // Audit log
      await logAudit(c.env.DB, tenant, 'deleted', 'classroom', id, before, null);
      
      return c.json({ message: 'Classroom deleted successfully' }, 200);
    } catch (error) {
      if (error instanceof classroomService.ClassroomError) {
        return c.json({ error: error.message }, error.statusCode as 400 | 404 | 500);
      }
      if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string' && error.message.includes('Forbidden')) {
        return c.json({ error: 'Forbidden' }, 403);
      }
      const message = error instanceof Error ? error.message : 'Failed to delete classroom';
      return c.json({ error: message }, 500);
    }
  }
);

export default classrooms;
