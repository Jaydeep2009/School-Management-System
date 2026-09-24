/**
 * Promotion & Academic-Year Lifecycle Routes
 * 
 * GET    /promotions/candidates - List promotion candidates
 * POST   /promotions/batches - Create promotion batch
 * GET    /promotions/batches - List promotion batches
 * GET    /promotions/batches/:id - Get promotion batch
 * POST   /promotions/batches/:id/plan - Plan batch (validate)
 * POST   /promotions/batches/:id/apply - Apply batch (execute)
 * POST   /promotions/batches/:id/cancel - Cancel batch
 * GET    /promotions/batches/:id/items - List promotion items
 * PUT    /promotions/batches/:id/items - Bulk upsert promotion items
 * 
 * GET    /academic-years/:id/activation-check - Check if year can be activated
 * POST   /academic-years/:id/activate - Activate academic year
 */

import { Hono } from 'hono';
import { requireAuth, requireSchoolTenant, type AuthContext } from '../auth/auth.middleware';
import * as promotionService from './promotion.service';
import { PromotionError } from './promotion.errors';
import {
  createPromotionBatchSchema,
  upsertPromotionItemSchema,
  bulkUpsertPromotionItemsSchema,
  cancelBatchSchema,
} from './promotion.schemas';
import { z } from 'zod';

const promotion = new Hono<AuthContext>();

/**
 * =====================================================================
 * PROMOTION CANDIDATES
 * =====================================================================
 */

/**
 * GET /promotions/candidates?academic_year_id=...&classroom_id=...
 * List students eligible for promotion from a specific classroom
 * Authorization: Principal only
 */
promotion.get('/candidates', requireAuth, async (c) => {
  try {
    const tenant = requireSchoolTenant(c);
    const academicYearId = c.req.query('academic_year_id');
    const classroomId = c.req.query('classroom_id');

    if (!academicYearId || !classroomId) {
      return c.json({ error: 'academic_year_id and classroom_id query parameters required' }, 400);
    }

    const candidates = await promotionService.getPromotionCandidates(
      c.env.DB,
      academicYearId,
      classroomId,
      tenant
    );

    return c.json({ data: candidates }, 200);
  } catch (error) {
    if (error instanceof PromotionError) {
      return c.json({ error: error.message }, error.statusCode as any);
    }
    const message = error instanceof Error ? error.message : 'Failed to get promotion candidates';
    return c.json({ error: message }, 500);
  }
});

/**
 * =====================================================================
 * PROMOTION BATCHES
 * =====================================================================
 */

/**
 * POST /promotions/batches
 * Create a new promotion batch
 * Authorization: Principal only
 */
promotion.post('/batches', requireAuth, async (c) => {
  try {
    const tenant = requireSchoolTenant(c);
    const body = await c.req.json();

    const validated = createPromotionBatchSchema.parse(body);

    const batch = await promotionService.createPromotionBatch(c.env.DB, tenant, validated);

    return c.json({ data: batch }, 201);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json({ error: 'Validation error', details: error.errors }, 400);
    }
    if (error instanceof PromotionError) {
      return c.json({ error: error.message }, error.statusCode as any);
    }
    const message = error instanceof Error ? error.message : 'Failed to create promotion batch';
    return c.json({ error: message }, 500);
  }
});

/**
 * GET /promotions/batches?status=...
 * List promotion batches
 * Authorization: Principal only
 */
promotion.get('/batches', requireAuth, async (c) => {
  try {
    const tenant = requireSchoolTenant(c);
    const status = c.req.query('status') as 'draft' | 'planned' | 'applied' | 'cancelled' | undefined;

    const batches = await promotionService.listPromotionBatches(c.env.DB, tenant, status);

    return c.json({ data: batches }, 200);
  } catch (error) {
    if (error instanceof PromotionError) {
      return c.json({ error: error.message }, error.statusCode as any);
    }
    const message = error instanceof Error ? error.message : 'Failed to list promotion batches';
    return c.json({ error: message }, 500);
  }
});

/**
 * GET /promotions/batches/:id
 * Get promotion batch by ID
 * Authorization: Principal only
 */
promotion.get('/batches/:id', requireAuth, async (c) => {
  try {
    const tenant = requireSchoolTenant(c);
    const id = c.req.param('id');
    if (!id) {
      return c.json({ error: 'Batch ID is required' }, 400);
    }

    const batch = await promotionService.getPromotionBatch(c.env.DB, id, tenant);

    return c.json({ data: batch }, 200);
  } catch (error) {
    if (error instanceof PromotionError) {
      return c.json({ error: error.message }, error.statusCode as any);
    }
    const message = error instanceof Error ? error.message : 'Failed to get promotion batch';
    return c.json({ error: message }, 500);
  }
});

/**
 * POST /promotions/batches/:id/plan
 * Plan batch (validate all items, check conflicts)
 * Authorization: Principal only
 */
promotion.post('/batches/:id/plan', requireAuth, async (c) => {
  try {
    const tenant = requireSchoolTenant(c);
    const id = c.req.param('id');
    if (!id) {
      return c.json({ error: 'Batch ID is required' }, 400);
    }

    await promotionService.planBatch(c.env.DB, id, tenant);

    return c.json({ message: 'Batch planned successfully' }, 200);
  } catch (error) {
    if (error instanceof PromotionError) {
      return c.json({ error: error.message }, error.statusCode as any);
    }
    const message = error instanceof Error ? error.message : 'Failed to plan batch';
    return c.json({ error: message }, 500);
  }
});

/**
 * POST /promotions/batches/:id/apply
 * Apply batch (execute all decisions)
 * Authorization: Principal only
 */
promotion.post('/batches/:id/apply', requireAuth, async (c) => {
  try {
    const tenant = requireSchoolTenant(c);
    const id = c.req.param('id');
    if (!id) {
      return c.json({ error: 'Batch ID is required' }, 400);
    }

    await promotionService.applyBatch(c.env.DB, id, tenant);

    return c.json({ message: 'Batch applied successfully' }, 200);
  } catch (error) {
    if (error instanceof PromotionError) {
      return c.json({ error: error.message }, error.statusCode as any);
    }
    const message = error instanceof Error ? error.message : 'Failed to apply batch';
    return c.json({ error: message }, 500);
  }
});

/**
 * POST /promotions/batches/:id/cancel
 * Cancel batch (draft or planned only)
 * Authorization: Principal only
 */
promotion.post('/batches/:id/cancel', requireAuth, async (c) => {
  try {
    const tenant = requireSchoolTenant(c);
    const id = c.req.param('id');
    if (!id) {
      return c.json({ error: 'Batch ID is required' }, 400);
    }
    const body = await c.req.json();

    const validated = cancelBatchSchema.parse(body);

    await promotionService.cancelBatch(c.env.DB, id, validated.reason, tenant);

    return c.json({ message: 'Batch cancelled successfully' }, 200);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json({ error: 'Validation error', details: error.errors }, 400);
    }
    if (error instanceof PromotionError) {
      return c.json({ error: error.message }, error.statusCode as any);
    }
    const message = error instanceof Error ? error.message : 'Failed to cancel batch';
    return c.json({ error: message }, 500);
  }
});

/**
 * =====================================================================
 * PROMOTION ITEMS
 * =====================================================================
 */

/**
 * GET /promotions/batches/:id/items
 * List promotion items for a batch
 * Authorization: Principal only
 */
promotion.get('/batches/:id/items', requireAuth, async (c) => {
  try {
    const tenant = requireSchoolTenant(c);
    const id = c.req.param('id');
    if (!id) {
      return c.json({ error: 'Batch ID is required' }, 400);
    }

    const items = await promotionService.listPromotionItems(c.env.DB, id, tenant);

    return c.json({ data: items }, 200);
  } catch (error) {
    if (error instanceof PromotionError) {
      return c.json({ error: error.message }, error.statusCode as any);
    }
    const message = error instanceof Error ? error.message : 'Failed to list promotion items';
    return c.json({ error: message }, 500);
  }
});

/**
 * PUT /promotions/batches/:id/items
 * Bulk upsert promotion items
 * Authorization: Principal only
 */
promotion.put('/batches/:id/items', requireAuth, async (c) => {
  try {
    const tenant = requireSchoolTenant(c);
    const batchId = c.req.param('id');
    if (!batchId) {
      return c.json({ error: 'Batch ID is required' }, 400);
    }
    const body = await c.req.json();

    const validated = bulkUpsertPromotionItemsSchema.parse(body);

    // Upsert each item
    const results = [];
    for (const itemData of validated.items) {
      const item = await promotionService.upsertPromotionItem(c.env.DB, batchId, tenant, itemData);
      results.push(item);
    }

    return c.json({ data: results }, 200);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json({ error: 'Validation error', details: error.errors }, 400);
    }
    if (error instanceof PromotionError) {
      return c.json({ error: error.message }, error.statusCode as any);
    }
    const message = error instanceof Error ? error.message : 'Failed to upsert promotion items';
    return c.json({ error: message }, 500);
  }
});

/**
 * =====================================================================
 * ACADEMIC YEAR ACTIVATION
 * =====================================================================
 */

/**
 * GET /academic-years/:id/activation-check
 * Check if academic year can be activated
 * Authorization: Principal only
 */
promotion.get('/academic-years/:id/activation-check', requireAuth, async (c) => {
  try {
    const tenant = requireSchoolTenant(c);
    const id = c.req.param('id');
    if (!id) {
      return c.json({ error: 'Academic year ID is required' }, 400);
    }

    const result = await promotionService.checkYearActivation(c.env.DB, id, tenant);

    return c.json({ data: result }, 200);
  } catch (error) {
    if (error instanceof PromotionError) {
      return c.json({ error: error.message }, error.statusCode as any);
    }
    const message = error instanceof Error ? error.message : 'Failed to check year activation';
    return c.json({ error: message }, 500);
  }
});

/**
 * POST /academic-years/:id/activate
 * Activate academic year (activate planned enrollments, close previous year)
 * Authorization: Principal only
 */
promotion.post('/academic-years/:id/activate', requireAuth, async (c) => {
  try {
    const tenant = requireSchoolTenant(c);
    const id = c.req.param('id');
    if (!id) {
      return c.json({ error: 'Academic year ID is required' }, 400);
    }

    const result = await promotionService.activateYear(c.env.DB, id, tenant);

    return c.json({ data: result }, 200);
  } catch (error) {
    if (error instanceof PromotionError) {
      return c.json({ error: error.message }, error.statusCode as any);
    }
    const message = error instanceof Error ? error.message : 'Failed to activate year';
    return c.json({ error: message }, 500);
  }
});

export default promotion;
