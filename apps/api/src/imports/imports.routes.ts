/**
 * Imports Routes
 * 
 * POST /imports/:kind/preview - Preview import
 * GET  /imports/:id - Get import job
 * POST /imports/:id/commit - Commit import
 * POST /imports/:id/cancel - Cancel import
 */

import { Hono } from 'hono';
import { requireAuth, requireSchoolTenant, type AuthContext } from '../auth/auth.middleware';
import * as importsService from './imports.service';
import { ImportError } from './imports.errors';
import { previewImportSchema, commitImportSchema } from './imports.schemas';
import { z } from 'zod';
import * as XLSX from 'xlsx';
import type { ImportKind } from './imports.types';

const imports = new Hono<AuthContext>();

/**
 * POST /imports/:kind/preview
 * Preview import with validation
 * Authorization: Principal (kind-specific)
 */
imports.post('/:kind/preview', requireAuth, async (c) => {
  try {
    const tenant = requireSchoolTenant(c);
    const kind = c.req.param('kind') as ImportKind;
    
    if (!kind) {
      return c.json({ error: 'Import kind is required' }, 400);
    }

    // Parse multipart form data
    const formData = await c.req.formData();
    const file = formData.get('file');
    const optionsStr = formData.get('options');

    if (!file || !(file instanceof File)) {
      return c.json({ error: 'Excel file is required' }, 400);
    }

    // Read Excel file
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(firstSheet);

    // Parse options if provided
    let options: Record<string, unknown> = {};
    if (optionsStr && typeof optionsStr === 'string') {
      try {
        options = JSON.parse(optionsStr);
      } catch (e) {
        return c.json({ error: 'Invalid options JSON' }, 400);
      }
    }

    const result = await importsService.previewImport(c.env.DB, kind, { rows, options }, tenant);

    return c.json({ data: result }, 200);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json({ error: 'Validation error', details: error.errors }, 400);
    }
    if (error instanceof ImportError) {
      return c.json({ error: error.message }, error.statusCode as any);
    }
    const message = error instanceof Error ? error.message : 'Failed to preview import';
    return c.json({ error: message }, 500);
  }
});

/**
 * GET /imports/:id
 * Get import job details
 * Authorization: Owner or Principal
 */
imports.get('/:id', requireAuth, async (c) => {
  try {
    const tenant = requireSchoolTenant(c);
    const id = c.req.param('id');
    
    if (!id) {
      return c.json({ error: 'Import ID is required' }, 400);
    }

    const result = await importsService.getImport(c.env.DB, id, tenant);

    return c.json({ data: result }, 200);
  } catch (error) {
    if (error instanceof ImportError) {
      return c.json({ error: error.message }, error.statusCode as any);
    }
    const message = error instanceof Error ? error.message : 'Failed to get import';
    return c.json({ error: message }, 500);
  }
});

/**
 * POST /imports/:id/commit
 * Commit previewed import
 * Authorization: Owner or Principal
 */
imports.post('/:id/commit', requireAuth, async (c) => {
  try {
    const tenant = requireSchoolTenant(c);
    const id = c.req.param('id');
    
    if (!id) {
      return c.json({ error: 'Import ID is required' }, 400);
    }

    const body = await c.req.json();
    const validated = commitImportSchema.parse(body);

    const result = await importsService.commitImport(c.env.DB, id, tenant);

    return c.json({ data: result }, 200);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json({ error: 'Validation error', details: error.errors }, 400);
    }
    if (error instanceof ImportError) {
      return c.json({ error: error.message }, error.statusCode as any);
    }
    const message = error instanceof Error ? error.message : 'Failed to commit import';
    return c.json({ error: message }, 500);
  }
});

/**
 * POST /imports/:id/cancel
 * Cancel previewed import
 * Authorization: Owner or Principal
 */
imports.post('/:id/cancel', requireAuth, async (c) => {
  try {
    const tenant = requireSchoolTenant(c);
    const id = c.req.param('id');
    
    if (!id) {
      return c.json({ error: 'Import ID is required' }, 400);
    }

    await importsService.cancelImport(c.env.DB, id, tenant);

    return c.json({ message: 'Import cancelled' }, 200);
  } catch (error) {
    if (error instanceof ImportError) {
      return c.json({ error: error.message }, error.statusCode as any);
    }
    const message = error instanceof Error ? error.message : 'Failed to cancel import';
    return c.json({ error: message }, 500);
  }
});

export default imports;
