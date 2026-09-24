/**
 * Subject Routes
 * 
 * GET /subjects - List subjects
 * GET /subjects/:id - Get subject by ID
 * POST /subjects - Create subject (principal only)
 * PATCH /subjects/:id - Update subject (principal only)
 */

import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import * as subjectService from './subject.service';
import * as subjectSchemas from './academic.schemas';
import { requireAuth, requireSchoolTenant, getRequestIdFromContext, type AuthContext } from '../auth/auth.middleware';
import { requireRole } from '../authz/authz.service';
import { logAudit } from '../lib/audit/audit.service';
import type {
  CreateSubjectRequest,
  UpdateSubjectRequest,
} from './academic.types';

const subjects = new Hono<AuthContext>();

/**
 * GET /subjects
 * List subjects
 * Authorization: Any authenticated user in the school
 * Optional filters: status
 */
subjects.get('/', requireAuth, async (c) => {
  try {
    const tenant = requireSchoolTenant(c);
    
    const filters = {
      status: c.req.query('status') as 'active' | 'inactive' | undefined,
    };
    
    const subjectList = await subjectService.list(c.env.DB, tenant.schoolId, filters);
    return c.json({ data: subjectList }, 200);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to list subjects';
    return c.json({ error: message }, 500);
  }
});

/**
 * GET /subjects/:id
 * Get subject by ID
 * Authorization: Any authenticated user in the school
 */
subjects.get('/:id', requireAuth, async (c) => {
  try {
    const tenant = requireSchoolTenant(c);
    const id = c.req.param('id')!; // Route guarantees id exists
    
    const subject = await subjectService.getById(c.env.DB, id, tenant.schoolId);
    return c.json({ data: subject }, 200);
  } catch (error) {
    if (error instanceof subjectService.SubjectError) {
      return c.json({ error: error.message }, error.statusCode as 400 | 404 | 500);
    }
    const message = error instanceof Error ? error.message : 'Failed to get subject';
    return c.json({ error: message }, 500);
  }
});

/**
 * POST /subjects
 * Create subject
 * Authorization: Principal only
 */
subjects.post(
  '/',
  requireAuth,
  zValidator('json', subjectSchemas.createSubjectSchema),
  async (c) => {
    try {
      const tenant = requireSchoolTenant(c);
      
      // Authorization: Principal only
      requireRole(tenant, 'principal');
      
      const body = c.req.valid('json') as CreateSubjectRequest;
      const subject = await subjectService.create(c.env.DB, tenant.schoolId, body);
      
      // Audit log
      await logAudit(c.env.DB, tenant, 'created', 'subject', subject.id, null, subject);
      
      return c.json({ data: subject }, 201);
    } catch (error) {
      if (error instanceof subjectService.SubjectError) {
        return c.json({ error: error.message }, error.statusCode as 400 | 404 | 500);
      }
      if (error instanceof Error && error.message.includes('Forbidden')) {
        return c.json({ error: 'Forbidden' }, 403);
      }
      const message = error instanceof Error ? error.message : 'Failed to create subject';
      return c.json({ error: message }, 500);
    }
  }
);

/**
 * PATCH /subjects/:id
 * Update subject
 * Authorization: Principal only
 */
subjects.patch(
  '/:id',
  requireAuth,
  zValidator('json', subjectSchemas.updateSubjectSchema),
  async (c) => {
    try {
      const tenant = requireSchoolTenant(c);
      
      // Authorization: Principal only
      requireRole(tenant, 'principal');
      
      const id = c.req.param('id')!; // Route guarantees id exists
      const body = c.req.valid('json') as UpdateSubjectRequest;
      
      // Get current state for audit
      const before = await subjectService.getById(c.env.DB, id, tenant.schoolId);
      
      const subject = await subjectService.update(c.env.DB, id, tenant.schoolId, body);
      
      // Audit log
      await logAudit(c.env.DB, tenant, 'updated', 'subject', id, before, subject);
      
      return c.json({ data: subject }, 200);
    } catch (error) {
      if (error instanceof subjectService.SubjectError) {
        return c.json({ error: error.message }, error.statusCode as 400 | 404 | 500);
      }
      if (error instanceof Error && error.message.includes('Forbidden')) {
        return c.json({ error: 'Forbidden' }, 403);
      }
      const message = error instanceof Error ? error.message : 'Failed to update subject';
      return c.json({ error: message }, 500);
    }
  }
);

export default subjects;
