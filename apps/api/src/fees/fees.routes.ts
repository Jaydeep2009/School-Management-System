/**
 * Fees Management Routes
 * 
 * POST   /fees/categories - Create fee category
 * GET    /fees/categories - List fee categories
 * PUT    /fees/categories/:id - Update fee category
 * 
 * POST   /fees/charges - Create fee charge
 * GET    /fees/students/:studentId/charges - List student charges
 * POST   /fees/charges/:id/void - Void charge
 * 
 * POST   /fees/payments - Record payment
 * GET    /fees/students/:studentId/payments - List student payments
 * POST   /fees/payments/:id/void - Void payment
 * 
 * GET    /fees/students/:studentId/summary - Get student fee summary
 * 
 * Student self-service endpoints are at /me/fees (in me.routes.ts)
 */

import { Hono } from 'hono';
import { requireAuth, requireSchoolTenant, type AuthContext } from '../auth/auth.middleware';
import * as feesService from './fees.service';
import { FeesError } from './fees.errors';
import {
  createFeeCategorySchema,
  updateFeeCategorySchema,
  createFeeChargeSchema,
  voidChargeSchema,
  createFeePaymentSchema,
  voidPaymentSchema,
} from './fees.schemas';
import { z } from 'zod';

const fees = new Hono<AuthContext>();

/**
 * =====================================================================
 * FEE CATEGORIES
 * =====================================================================
 */

/**
 * POST /fees/categories
 * Create fee category
 * Authorization: Principal only
 */
fees.post('/categories', requireAuth, async (c) => {
  try {
    const tenant = requireSchoolTenant(c);
    const body = await c.req.json();

    const validated = createFeeCategorySchema.parse(body);

    const category = await feesService.createFeeCategory(c.env.DB, tenant, validated);

    return c.json({ data: category }, 201);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json({ error: 'Validation error', details: error.errors }, 400);
    }
    if (error instanceof FeesError) {
      return c.json({ error: error.message }, error.statusCode as any);
    }
    const message = error instanceof Error ? error.message : 'Failed to create fee category';
    return c.json({ error: message }, 500);
  }
});

/**
 * GET /fees/categories
 * List fee categories
 * Authorization: Principal only
 */
fees.get('/categories', requireAuth, async (c) => {
  try {
    const tenant = requireSchoolTenant(c);
    const status = c.req.query('status') as 'active' | 'inactive' | undefined;

    const categories = await feesService.listFeeCategories(c.env.DB, tenant, status);

    return c.json({ data: categories }, 200);
  } catch (error) {
    if (error instanceof FeesError) {
      return c.json({ error: error.message }, error.statusCode as any);
    }
    const message = error instanceof Error ? error.message : 'Failed to list fee categories';
    return c.json({ error: message }, 500);
  }
});

/**
 * PUT /fees/categories/:id
 * Update fee category
 * Authorization: Principal only
 */
fees.put('/categories/:id', requireAuth, async (c) => {
  try {
    const tenant = requireSchoolTenant(c);
    const id = c.req.param('id');
    const body = await c.req.json();

    if (!id) {
      return c.json({ error: 'Category ID is required' }, 400);
    }

    const validated = updateFeeCategorySchema.parse(body);

    await feesService.updateFeeCategory(c.env.DB, id, tenant, validated);

    return c.json({ message: 'Fee category updated successfully' }, 200);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json({ error: 'Validation error', details: error.errors }, 400);
    }
    if (error instanceof FeesError) {
      return c.json({ error: error.message }, error.statusCode as any);
    }
    const message = error instanceof Error ? error.message : 'Failed to update fee category';
    return c.json({ error: message }, 500);
  }
});

/**
 * =====================================================================
 * FEE CHARGES
 * =====================================================================
 */

/**
 * POST /fees/charges
 * Create fee charge
 * Authorization: Principal only
 */
fees.post('/charges', requireAuth, async (c) => {
  try {
    const tenant = requireSchoolTenant(c);
    const body = await c.req.json();

    const validated = createFeeChargeSchema.parse(body);

    const charge = await feesService.createFeeCharge(c.env.DB, tenant, validated);

    return c.json({ data: charge }, 201);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json({ error: 'Validation error', details: error.errors }, 400);
    }
    if (error instanceof FeesError) {
      return c.json({ error: error.message }, error.statusCode as any);
    }
    const message = error instanceof Error ? error.message : 'Failed to create fee charge';
    return c.json({ error: message }, 500);
  }
});

/**
 * GET /fees/students/:studentId/charges
 * List student's fee charges
 * Authorization: Principal (all students), Student (own only)
 */
fees.get('/students/:studentId/charges', requireAuth, async (c) => {
  try {
    const tenant = requireSchoolTenant(c);
    const studentId = c.req.param('studentId');
    const academicYearId = c.req.query('academic_year_id');

    if (!studentId) {
      return c.json({ error: 'Student ID is required' }, 400);
    }

    const charges = await feesService.listChargesForStudent(
      c.env.DB,
      studentId,
      tenant,
      academicYearId
    );

    return c.json({ data: charges }, 200);
  } catch (error) {
    if (error instanceof FeesError) {
      return c.json({ error: error.message }, error.statusCode as any);
    }
    const message = error instanceof Error ? error.message : 'Failed to list fee charges';
    return c.json({ error: message }, 500);
  }
});

/**
 * POST /fees/charges/:id/void
 * Void fee charge
 * Authorization: Principal only
 */
fees.post('/charges/:id/void', requireAuth, async (c) => {
  try {
    const tenant = requireSchoolTenant(c);
    const id = c.req.param('id');
    const body = await c.req.json();

    if (!id) {
      return c.json({ error: 'Charge ID is required' }, 400);
    }

    const validated = voidChargeSchema.parse(body);

    await feesService.voidFeeCharge(c.env.DB, id, tenant, validated.reason);

    return c.json({ message: 'Fee charge voided successfully' }, 200);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json({ error: 'Validation error', details: error.errors }, 400);
    }
    if (error instanceof FeesError) {
      return c.json({ error: error.message }, error.statusCode as any);
    }
    const message = error instanceof Error ? error.message : 'Failed to void fee charge';
    return c.json({ error: message }, 500);
  }
});

/**
 * =====================================================================
 * FEE PAYMENTS
 * =====================================================================
 */

/**
 * POST /fees/payments
 * Record fee payment
 * Authorization: Principal only
 */
fees.post('/payments', requireAuth, async (c) => {
  try {
    const tenant = requireSchoolTenant(c);
    const body = await c.req.json();

    const validated = createFeePaymentSchema.parse(body);

    const payment = await feesService.recordFeePayment(c.env.DB, tenant, validated);

    return c.json({ data: payment }, 201);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json({ error: 'Validation error', details: error.errors }, 400);
    }
    if (error instanceof FeesError) {
      return c.json({ error: error.message }, error.statusCode as any);
    }
    const message = error instanceof Error ? error.message : 'Failed to record fee payment';
    return c.json({ error: message }, 500);
  }
});

/**
 * GET /fees/students/:studentId/payments
 * List student's fee payments
 * Authorization: Principal (all students), Student (own only)
 */
fees.get('/students/:studentId/payments', requireAuth, async (c) => {
  try {
    const tenant = requireSchoolTenant(c);
    const studentId = c.req.param('studentId');
    const academicYearId = c.req.query('academic_year_id');

    if (!studentId) {
      return c.json({ error: 'Student ID is required' }, 400);
    }

    const payments = await feesService.listPaymentsForStudent(
      c.env.DB,
      studentId,
      tenant,
      academicYearId
    );

    return c.json({ data: payments }, 200);
  } catch (error) {
    if (error instanceof FeesError) {
      return c.json({ error: error.message }, error.statusCode as any);
    }
    const message = error instanceof Error ? error.message : 'Failed to list fee payments';
    return c.json({ error: message }, 500);
  }
});

/**
 * POST /fees/payments/:id/void
 * Void fee payment
 * Authorization: Principal only
 */
fees.post('/payments/:id/void', requireAuth, async (c) => {
  try {
    const tenant = requireSchoolTenant(c);
    const id = c.req.param('id');
    const body = await c.req.json();

    if (!id) {
      return c.json({ error: 'Payment ID is required' }, 400);
    }

    const validated = voidPaymentSchema.parse(body);

    await feesService.voidFeePayment(c.env.DB, id, tenant, validated.reason);

    return c.json({ message: 'Fee payment voided successfully' }, 200);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json({ error: 'Validation error', details: error.errors }, 400);
    }
    if (error instanceof FeesError) {
      return c.json({ error: error.message }, error.statusCode as any);
    }
    const message = error instanceof Error ? error.message : 'Failed to void fee payment';
    return c.json({ error: message }, 500);
  }
});

/**
 * =====================================================================
 * FEE SUMMARY
 * =====================================================================
 */

/**
 * GET /fees/students/:studentId/summary
 * Get student fee summary
 * Authorization: Principal (all students), Student (own only)
 */
fees.get('/students/:studentId/summary', requireAuth, async (c) => {
  try {
    const tenant = requireSchoolTenant(c);
    const studentId = c.req.param('studentId');
    const academicYearId = c.req.query('academic_year_id');

    if (!studentId) {
      return c.json({ error: 'Student ID is required' }, 400);
    }

    if (!academicYearId) {
      return c.json({ error: 'Academic year ID is required' }, 400);
    }

    const summary = await feesService.getFeeSummary(c.env.DB, studentId, academicYearId, tenant);

    return c.json({ data: summary }, 200);
  } catch (error) {
    if (error instanceof FeesError) {
      return c.json({ error: error.message }, error.statusCode as any);
    }
    const message = error instanceof Error ? error.message : 'Failed to get fee summary';
    return c.json({ error: message }, 500);
  }
});

export default fees;
