/**
 * Promotion Routes
 * API endpoints for student promotion
 */

import { Hono } from 'hono';
import { requireAuth, requireSchoolTenant } from '../auth/auth.middleware';
import { requirePrincipal } from '../auth/role.middleware';
import * as promotionService from './promotion.service';
import { PromotionError } from './promotion.errors';
import type { Env } from '../index';
import type { PromoteStudentRequest, BulkPromotionRequest } from './promotion.types';

const promotions = new Hono<{ Bindings: Env }>();

/**
 * GET /promotions/preview/:classroomId
 * Get promotion preview for a classroom
 * Authorization: Principal only
 */
promotions.get('/preview/:classroomId', requireAuth, requirePrincipal(), async (c) => {
  try {
    const tenant = requireSchoolTenant(c);
    const classroomId = c.req.param('classroomId')!;
    const academicYearId = c.req.query('academic_year_id');

    if (!academicYearId) {
      return c.json({ error: 'academic_year_id is required' }, 400);
    }

    const preview = await promotionService.getPromotionPreview(
      c.env.DB,
      classroomId,
      academicYearId,
      tenant
    );

    return c.json({ data: preview }, 200);
  } catch (error) {
    if (error instanceof PromotionError) {
      return c.json({ error: error.message }, error.statusCode);
    }
    const message = error instanceof Error ? error.message : 'Failed to get promotion preview';
    return c.json({ error: message }, 500);
  }
});

/**
 * POST /promotions/single
 * Promote a single student
 * Authorization: Principal only
 */
promotions.post('/single', requireAuth, requirePrincipal(), async (c) => {
  try {
    const tenant = requireSchoolTenant(c);
    const request = await c.req.json<PromoteStudentRequest>();

    await promotionService.promoteStudent(c.env.DB, request, tenant);

    return c.json({ success: true, message: 'Student promoted successfully' }, 200);
  } catch (error) {
    if (error instanceof PromotionError) {
      return c.json({ error: error.message }, error.statusCode);
    }
    const message = error instanceof Error ? error.message : 'Failed to promote student';
    return c.json({ error: message }, 500);
  }
});

/**
 * POST /promotions/bulk
 * Bulk promote students from a classroom
 * Authorization: Principal only
 */
promotions.post('/bulk', requireAuth, requirePrincipal(), async (c) => {
  try {
    const tenant = requireSchoolTenant(c);
    const request = await c.req.json<BulkPromotionRequest>();

    const result = await promotionService.bulkPromoteStudents(c.env.DB, request, tenant);

    return c.json({ 
      success: true, 
      data: result,
      message: `Successfully promoted ${result.success_count} students${result.failed_count > 0 ? `, ${result.failed_count} failed` : ''}`
    }, 200);
  } catch (error) {
    if (error instanceof PromotionError) {
      return c.json({ error: error.message }, error.statusCode);
    }
    const message = error instanceof Error ? error.message : 'Failed to bulk promote students';
    return c.json({ error: message }, 500);
  }
});

export default promotions;
