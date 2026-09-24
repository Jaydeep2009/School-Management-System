/**
 * Timetable Routes
 * 
 * POST   /timetables - Create timetable
 * GET    /timetables - List timetables
 * GET    /timetables/:id - Get timetable
 * PUT    /timetables/:id - Update timetable
 * DELETE /timetables/:id - Delete draft timetable
 * POST   /timetables/:id/new-version - Create new version
 * POST   /timetables/:id/publish - Publish timetable
 * POST   /timetables/:id/archive - Archive timetable
 * GET    /timetables/:id/entries - List entries
 * POST   /timetables/:id/entries - Create entry
 * PUT    /timetables/:id/entries/:entryId - Update entry
 * DELETE /timetables/:id/entries/:entryId - Delete entry
 * GET    /classrooms/:classroomId/timetable - Get classroom timetable
 * GET    /me/timetable - Get my timetable
 */

import { Hono } from 'hono';
import { requireAuth, requireSchoolTenant, type AuthContext } from '../auth/auth.middleware';
import * as timetableService from './timetable.service';
import { TimetableError } from './timetable.errors';
import {
  createTimetableSchema,
  updateTimetableSchema,
  upsertTimetableEntrySchema,
} from './timetable.schemas';
import { z } from 'zod';

const timetable = new Hono<AuthContext>();

/**
 * POST /timetables
 * Create timetable
 * Authorization: Principal only
 */
timetable.post('/', requireAuth, async (c) => {
  try {
    const tenant = requireSchoolTenant(c);
    const body = await c.req.json();
    const validated = createTimetableSchema.parse(body);

    const result = await timetableService.createTimetable(c.env.DB, validated, tenant);

    return c.json({ data: result }, 201);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json({ error: 'Validation error', details: error.errors }, 400);
    }
    if (error instanceof TimetableError) {
      return c.json({ error: error.message }, error.statusCode as any);
    }
    const message = error instanceof Error ? error.message : 'Failed to create timetable';
    return c.json({ error: message }, 500);
  }
});

/**
 * GET /timetables
 * List timetables
 * Authorization: Principal, Teacher (limited), Student (limited)
 */
timetable.get('/', requireAuth, async (c) => {
  try {
    const tenant = requireSchoolTenant(c);
    const academicYearId = c.req.query('academic_year_id');
    const classroomId = c.req.query('classroom_id');
    const status = c.req.query('status') as 'draft' | 'published' | 'archived' | undefined;

    const results = await timetableService.listTimetables(
      c.env.DB,
      academicYearId,
      classroomId,
      status,
      tenant
    );

    return c.json({ data: results }, 200);
  } catch (error) {
    if (error instanceof TimetableError) {
      return c.json({ error: error.message }, error.statusCode as any);
    }
    const message = error instanceof Error ? error.message : 'Failed to list timetables';
    return c.json({ error: message }, 500);
  }
});

/**
 * GET /timetables/:id
 * Get timetable
 * Authorization: Principal, Teacher (limited), Student (limited)
 */
timetable.get('/:id', requireAuth, async (c) => {
  try {
    const tenant = requireSchoolTenant(c);
    const id = c.req.param('id');
    if (!id) return c.json({ error: 'Timetable ID required' }, 400);

    const result = await timetableService.getTimetable(c.env.DB, id, tenant);

    return c.json({ data: result }, 200);
  } catch (error) {
    if (error instanceof TimetableError) {
      return c.json({ error: error.message }, error.statusCode as any);
    }
    const message = error instanceof Error ? error.message : 'Failed to get timetable';
    return c.json({ error: message }, 500);
  }
});

/**
 * PUT /timetables/:id
 * Update timetable
 * Authorization: Principal only
 */
timetable.put('/:id', requireAuth, async (c) => {
  try {
    const tenant = requireSchoolTenant(c);
    const id = c.req.param('id');
    if (!id) return c.json({ error: 'Timetable ID required' }, 400);

    const body = await c.req.json();
    const validated = updateTimetableSchema.parse(body);

    const result = await timetableService.updateTimetable(c.env.DB, id, validated, tenant);

    return c.json({ data: result }, 200);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json({ error: 'Validation error', details: error.errors }, 400);
    }
    if (error instanceof TimetableError) {
      return c.json({ error: error.message }, error.statusCode as any);
    }
    const message = error instanceof Error ? error.message : 'Failed to update timetable';
    return c.json({ error: message }, 500);
  }
});

/**
 * DELETE /timetables/:id
 * Delete draft timetable
 * Authorization: Principal only
 */
timetable.delete('/:id', requireAuth, async (c) => {
  try {
    const tenant = requireSchoolTenant(c);
    const id = c.req.param('id');
    if (!id) return c.json({ error: 'Timetable ID required' }, 400);

    await timetableService.deleteTimetable(c.env.DB, id, tenant);

    return c.json({ message: 'Timetable deleted' }, 200);
  } catch (error) {
    if (error instanceof TimetableError) {
      return c.json({ error: error.message }, error.statusCode as any);
    }
    const message = error instanceof Error ? error.message : 'Failed to delete timetable';
    return c.json({ error: message }, 500);
  }
});

/**
 * POST /timetables/:id/new-version
 * Create new version from existing
 * Authorization: Principal only
 */
timetable.post('/:id/new-version', requireAuth, async (c) => {
  try {
    const tenant = requireSchoolTenant(c);
    const id = c.req.param('id');
    if (!id) return c.json({ error: 'Timetable ID required' }, 400);

    const result = await timetableService.createNewVersion(c.env.DB, id, tenant);

    return c.json({ data: result }, 201);
  } catch (error) {
    if (error instanceof TimetableError) {
      return c.json({ error: error.message }, error.statusCode as any);
    }
    const message = error instanceof Error ? error.message : 'Failed to create new version';
    return c.json({ error: message }, 500);
  }
});

/**
 * POST /timetables/:id/publish
 * Publish timetable
 * Authorization: Principal only
 */
timetable.post('/:id/publish', requireAuth, async (c) => {
  try {
    const tenant = requireSchoolTenant(c);
    const id = c.req.param('id');
    if (!id) return c.json({ error: 'Timetable ID required' }, 400);

    const result = await timetableService.publishTimetable(c.env.DB, id, tenant);

    return c.json({ data: result }, 200);
  } catch (error) {
    if (error instanceof TimetableError) {
      return c.json({ error: error.message }, error.statusCode as any);
    }
    const message = error instanceof Error ? error.message : 'Failed to publish timetable';
    return c.json({ error: message }, 500);
  }
});

/**
 * POST /timetables/:id/archive
 * Archive timetable
 * Authorization: Principal only
 */
timetable.post('/:id/archive', requireAuth, async (c) => {
  try {
    const tenant = requireSchoolTenant(c);
    const id = c.req.param('id');
    if (!id) return c.json({ error: 'Timetable ID required' }, 400);

    const result = await timetableService.archiveTimetable(c.env.DB, id, tenant);

    return c.json({ data: result }, 200);
  } catch (error) {
    if (error instanceof TimetableError) {
      return c.json({ error: error.message }, error.statusCode as any);
    }
    const message = error instanceof Error ? error.message : 'Failed to archive timetable';
    return c.json({ error: message }, 500);
  }
});

/**
 * GET /timetables/:id/entries
 * List timetable entries
 * Authorization: Principal, Teacher (limited), Student (limited)
 */
timetable.get('/:id/entries', requireAuth, async (c) => {
  try {
    const tenant = requireSchoolTenant(c);
    const id = c.req.param('id');
    if (!id) return c.json({ error: 'Timetable ID required' }, 400);

    const results = await timetableService.listTimetableEntries(c.env.DB, id, tenant);

    return c.json({ data: results }, 200);
  } catch (error) {
    if (error instanceof TimetableError) {
      return c.json({ error: error.message }, error.statusCode as any);
    }
    const message = error instanceof Error ? error.message : 'Failed to list entries';
    return c.json({ error: message }, 500);
  }
});

/**
 * POST /timetables/:id/entries
 * Create timetable entry
 * Authorization: Principal only
 */
timetable.post('/:id/entries', requireAuth, async (c) => {
  try {
    const tenant = requireSchoolTenant(c);
    const id = c.req.param('id');
    if (!id) return c.json({ error: 'Timetable ID required' }, 400);

    const body = await c.req.json();
    const validated = upsertTimetableEntrySchema.parse(body);

    const result = await timetableService.createTimetableEntry(c.env.DB, id, validated, tenant);

    return c.json({ data: result }, 201);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json({ error: 'Validation error', details: error.errors }, 400);
    }
    if (error instanceof TimetableError) {
      return c.json({ error: error.message }, error.statusCode as any);
    }
    const message = error instanceof Error ? error.message : 'Failed to create entry';
    return c.json({ error: message }, 500);
  }
});

/**
 * PUT /timetables/:id/entries/:entryId
 * Update timetable entry
 * Authorization: Principal only
 */
timetable.put('/:id/entries/:entryId', requireAuth, async (c) => {
  try {
    const tenant = requireSchoolTenant(c);
    const entryId = c.req.param('entryId');
    if (!entryId) return c.json({ error: 'Entry ID required' }, 400);

    const body = await c.req.json();
    const validated = upsertTimetableEntrySchema.parse(body);

    const result = await timetableService.updateTimetableEntry(c.env.DB, entryId, validated, tenant);

    return c.json({ data: result }, 200);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json({ error: 'Validation error', details: error.errors }, 400);
    }
    if (error instanceof TimetableError) {
      return c.json({ error: error.message }, error.statusCode as any);
    }
    const message = error instanceof Error ? error.message : 'Failed to update entry';
    return c.json({ error: message }, 500);
  }
});

/**
 * DELETE /timetables/:id/entries/:entryId
 * Delete timetable entry
 * Authorization: Principal only
 */
timetable.delete('/:id/entries/:entryId', requireAuth, async (c) => {
  try {
    const tenant = requireSchoolTenant(c);
    const entryId = c.req.param('entryId');
    if (!entryId) return c.json({ error: 'Entry ID required' }, 400);

    await timetableService.deleteTimetableEntry(c.env.DB, entryId, tenant);

    return c.json({ message: 'Entry deleted' }, 200);
  } catch (error) {
    if (error instanceof TimetableError) {
      return c.json({ error: error.message }, error.statusCode as any);
    }
    const message = error instanceof Error ? error.message : 'Failed to delete entry';
    return c.json({ error: message }, 500);
  }
});

/**
 * GET /classrooms/:classroomId/timetable
 * Get classroom timetable (published)
 * Authorization: All authenticated users
 */
timetable.get('/classrooms/:classroomId/timetable', requireAuth, async (c) => {
  try {
    const tenant = requireSchoolTenant(c);
    const classroomId = c.req.param('classroomId');
    if (!classroomId) return c.json({ error: 'Classroom ID required' }, 400);

    const result = await timetableService.getClassroomTimetable(c.env.DB, classroomId, tenant);

    return c.json({ data: result }, 200);
  } catch (error) {
    if (error instanceof TimetableError) {
      return c.json({ error: error.message }, error.statusCode as any);
    }
    const message = error instanceof Error ? error.message : 'Failed to get classroom timetable';
    return c.json({ error: message }, 500);
  }
});

/**
 * GET /me/timetable
 * Get my timetable
 * Authorization: Student (own class), Teacher (own schedule)
 */
timetable.get('/me/timetable', requireAuth, async (c) => {
  try {
    const tenant = requireSchoolTenant(c);

    const result = await timetableService.getMyTimetable(c.env.DB, tenant);

    return c.json({ data: result }, 200);
  } catch (error) {
    if (error instanceof TimetableError) {
      return c.json({ error: error.message }, error.statusCode as any);
    }
    const message = error instanceof Error ? error.message : 'Failed to get my timetable';
    return c.json({ error: message }, 500);
  }
});

export default timetable;
