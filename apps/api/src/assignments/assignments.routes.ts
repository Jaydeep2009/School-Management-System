/**
 * Assignments Routes
 * 
 * POST /assignments - Create assignment
 * GET /assignments - List assignments
 * GET /assignments/:id - Get assignment details
 * PUT /assignments/:id - Update assignment
 * POST /assignments/:id/publish - Publish assignment
 * POST /assignments/:id/close - Close assignment
 * POST /assignments/:id/attachments - Upload attachment
 * GET /assignments/:id/attachments - List attachments
 * GET /assignments/:id/attachments/:attachmentId - Download attachment
 * DELETE /assignments/:id/attachments/:attachmentId - Delete attachment
 * 
 * Note: Student self-service endpoint is at /me/assignments (in me.routes.ts)
 */

import { Hono } from 'hono';
import { requireAuth, requireSchoolTenant, type AuthContext } from '../auth/auth.middleware';
import * as assignmentsService from './assignments.service';
import { AssignmentsError } from './assignments.errors';
import {
  createAssignmentSchema,
  updateAssignmentSchema,
  listAssignmentsQuerySchema,
} from './assignments.validation';
import { z } from 'zod';

const assignments = new Hono<AuthContext>();

/**
 * POST /
 * Create new assignment
 * Authorization: Principal or assigned teacher
 */
assignments.post('/', requireAuth, async (c) => {
  try {
    const tenant = requireSchoolTenant(c);
    const body = await c.req.json();

    // Validate request
    const validated = createAssignmentSchema.parse(body);

    const assignment = await assignmentsService.createAssignment(
      c.env.DB,
      tenant,
      validated
    );

    return c.json({ data: assignment }, 201);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json({ error: 'Validation error', details: error.errors }, 400);
    }
    if (error instanceof AssignmentsError) {
      return c.json({ error: error.message }, error.statusCode as any);
    }
    const message = error instanceof Error ? error.message : 'Failed to create assignment';
    return c.json({ error: message }, 500);
  }
});

/**
 * GET /
 * List assignments
 * Authorization: Principal, authorized teacher, student (published only in their classroom)
 */
assignments.get('/', requireAuth, async (c) => {
  try {
    const tenant = requireSchoolTenant(c);
    const query = c.req.query();

    // Validate query
    const validated = listAssignmentsQuerySchema.parse(query);

    const assignmentsList = await assignmentsService.listAssignments(
      c.env.DB,
      tenant,
      validated
    );

    return c.json({ data: assignmentsList }, 200);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json({ error: 'Validation error', details: error.errors }, 400);
    }
    if (error instanceof AssignmentsError) {
      return c.json({ error: error.message }, error.statusCode as any);
    }
    const message = error instanceof Error ? error.message : 'Failed to list assignments';
    return c.json({ error: message }, 500);
  }
});

/**
 * GET /:id
 * Get assignment details
 * Authorization: Principal, authorized teacher, or student (if published)
 */
assignments.get('/:id', requireAuth, async (c) => {
  try {
    const tenant = requireSchoolTenant(c);
    const id = c.req.param('id');

    if (!id) {
      return c.json({ error: 'Assignment ID is required' }, 400);
    }

    const assignment = await assignmentsService.getAssignmentById(
      c.env.DB,
      id,
      tenant
    );

    return c.json({ data: assignment }, 200);
  } catch (error) {
    if (error instanceof AssignmentsError) {
      return c.json({ error: error.message }, error.statusCode as any);
    }
    const message = error instanceof Error ? error.message : 'Failed to get assignment';
    return c.json({ error: message }, 500);
  }
});

/**
 * PUT /:id
 * Update assignment
 * Authorization: Principal or assigned teacher (draft only)
 */
assignments.put('/:id', requireAuth, async (c) => {
  try {
    const tenant = requireSchoolTenant(c);
    const id = c.req.param('id');
    const body = await c.req.json();

    if (!id) {
      return c.json({ error: 'Assignment ID is required' }, 400);
    }

    // Validate request
    const validated = updateAssignmentSchema.parse(body);

    // Convert null to undefined for optional fields
    const payload = {
      title: validated.title,
      description: validated.description === null ? undefined : validated.description,
      due_at: validated.due_at,
    };

    await assignmentsService.updateAssignment(
      c.env.DB,
      id,
      tenant,
      payload
    );

    return c.json({ message: 'Assignment updated successfully' }, 200);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json({ error: 'Validation error', details: error.errors }, 400);
    }
    if (error instanceof AssignmentsError) {
      return c.json({ error: error.message }, error.statusCode as any);
    }
    const message = error instanceof Error ? error.message : 'Failed to update assignment';
    return c.json({ error: message }, 500);
  }
});

/**
 * POST /:id/publish
 * Publish assignment
 * Authorization: Principal or assigned teacher
 */
assignments.post('/:id/publish', requireAuth, async (c) => {
  try {
    const tenant = requireSchoolTenant(c);
    const id = c.req.param('id');

    if (!id) {
      return c.json({ error: 'Assignment ID is required' }, 400);
    }

    await assignmentsService.publishAssignment(c.env.DB, id, tenant);

    return c.json({ message: 'Assignment published successfully' }, 200);
  } catch (error) {
    if (error instanceof AssignmentsError) {
      return c.json({ error: error.message }, error.statusCode as any);
    }
    const message = error instanceof Error ? error.message : 'Failed to publish assignment';
    return c.json({ error: message }, 500);
  }
});

/**
 * POST /:id/close
 * Close assignment
 * Authorization: Principal or assigned teacher
 */
assignments.post('/:id/close', requireAuth, async (c) => {
  try {
    const tenant = requireSchoolTenant(c);
    const id = c.req.param('id');

    if (!id) {
      return c.json({ error: 'Assignment ID is required' }, 400);
    }

    await assignmentsService.closeAssignment(c.env.DB, id, tenant);

    return c.json({ message: 'Assignment closed successfully' }, 200);
  } catch (error) {
    if (error instanceof AssignmentsError) {
      return c.json({ error: error.message }, error.statusCode as any);
    }
    const message = error instanceof Error ? error.message : 'Failed to close assignment';
    return c.json({ error: message }, 500);
  }
});

/**
 * POST /:id/attachments
 * Upload attachment
 * Authorization: Principal or assigned teacher (draft only)
 */
assignments.post('/:id/attachments', requireAuth, async (c) => {
  try {
    // Check if R2 bucket is configured
    if (!c.env.STORAGE) {
      return c.json({ 
        error: 'File storage is not configured. Please enable R2 storage in Cloudflare dashboard to upload files.' 
      }, 503);
    }

    const tenant = requireSchoolTenant(c);
    const id = c.req.param('id');

    if (!id) {
      return c.json({ error: 'Assignment ID is required' }, 400);
    }

    // Parse form data
    const formData = await c.req.formData();
    const file = formData.get('file');

    if (!file || !(file instanceof File)) {
      return c.json({ error: 'File is required' }, 400);
    }

    // Read file as ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();

    const attachment = await assignmentsService.uploadAttachment(
      c.env.DB,
      c.env.STORAGE,
      id,
      tenant,
      arrayBuffer,
      file.name,
      file.type || null
    );

    return c.json({ data: attachment }, 201);
  } catch (error) {
    if (error instanceof AssignmentsError) {
      return c.json({ error: error.message }, error.statusCode as any);
    }
    const message = error instanceof Error ? error.message : 'Failed to upload attachment';
    return c.json({ error: message }, 500);
  }
});

/**
 * GET /:id/attachments
 * List attachments
 * Authorization: Principal, authorized teacher, or student (if published)
 */
assignments.get('/:id/attachments', requireAuth, async (c) => {
  try {
    const tenant = requireSchoolTenant(c);
    const id = c.req.param('id');

    if (!id) {
      return c.json({ error: 'Assignment ID is required' }, 400);
    }

    const attachmentsList = await assignmentsService.getAttachments(
      c.env.DB,
      id,
      tenant
    );

    return c.json({ data: attachmentsList }, 200);
  } catch (error) {
    if (error instanceof AssignmentsError) {
      return c.json({ error: error.message }, error.statusCode as any);
    }
    const message = error instanceof Error ? error.message : 'Failed to list attachments';
    return c.json({ error: message }, 500);
  }
});

/**
 * GET /:id/attachments/:attachmentId
 * Download attachment
 * Authorization: Principal, authorized teacher, or student (if published)
 */
assignments.get('/:id/attachments/:attachmentId', requireAuth, async (c) => {
  try {
    const tenant = requireSchoolTenant(c);
    const id = c.req.param('id');
    const attachmentId = c.req.param('attachmentId');

    if (!id) {
      return c.json({ error: 'Assignment ID is required' }, 400);
    }

    if (!attachmentId) {
      return c.json({ error: 'Attachment ID is required' }, 400);
    }

    const { object, fileName, contentType } = await assignmentsService.downloadAttachment(
      c.env.DB,
      c.env.STORAGE,
      id,
      attachmentId,
      tenant
    );

    // Stream the file
    const headers = new Headers();
    if (contentType) {
      headers.set('Content-Type', contentType);
    }
    headers.set('Content-Disposition', `attachment; filename="${fileName}"`);

    return new Response(object.body, {
      headers,
      status: 200,
    });
  } catch (error) {
    if (error instanceof AssignmentsError) {
      return c.json({ error: error.message }, error.statusCode as any);
    }
    const message = error instanceof Error ? error.message : 'Failed to download attachment';
    return c.json({ error: message }, 500);
  }
});

/**
 * DELETE /:id/attachments/:attachmentId
 * Delete attachment
 * Authorization: Principal or assigned teacher (draft only)
 */
assignments.delete('/:id/attachments/:attachmentId', requireAuth, async (c) => {
  try {
    const tenant = requireSchoolTenant(c);
    const id = c.req.param('id');
    const attachmentId = c.req.param('attachmentId');

    if (!id) {
      return c.json({ error: 'Assignment ID is required' }, 400);
    }

    if (!attachmentId) {
      return c.json({ error: 'Attachment ID is required' }, 400);
    }

    await assignmentsService.deleteAttachment(
      c.env.DB,
      c.env.STORAGE,
      id,
      attachmentId,
      tenant
    );

    return c.json({ message: 'Attachment deleted successfully' }, 200);
  } catch (error) {
    if (error instanceof AssignmentsError) {
      return c.json({ error: error.message }, error.statusCode as any);
    }
    const message = error instanceof Error ? error.message : 'Failed to delete attachment';
    return c.json({ error: message }, 500);
  }
});

export default assignments;
