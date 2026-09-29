/**
 * Marks & Assessments Routes
 * 
 * POST /assessments - Create assessment
 * GET /assessments - List assessments
 * GET /assessments/:id - Get assessment details
 * PUT /assessments/:id - Update assessment
 * POST /assessments/:id/publish - Publish assessment
 * POST /assessments/:id/lock - Lock assessment
 * POST /assessments/:id/unlock - Unlock assessment
 * PUT /assessments/:id/marks - Enter/update marks (bulk)
 * GET /assessments/:id/marks - Get assessment marks
 * GET /students/:studentId/summary - Get student marks summary
 * GET /students/:studentId/subject-wise - Get student subject-wise marks
 * GET /classrooms/:classroomId/report - Get classroom marks report
 * 
 * Note: Student self-service endpoint is at /me/marks (in me.routes.ts)
 */

import { Hono } from 'hono';
import { requireAuth, requireSchoolTenant, type AuthContext } from '../auth/auth.middleware';
import * as marksService from './marks.service';
import { MarksError } from './marks.errors';
import {
  createAssessmentSchema,
  updateAssessmentSchema,
  bulkMarksSchema,
  listAssessmentsQuerySchema,
  studentMarksQuerySchema,
  classroomReportQuerySchema,
} from './marks.validation';
import { z } from 'zod';

const marks = new Hono<AuthContext>();

/**
 * POST /assessments
 * Create new assessment
 * Authorization: Principal or assigned teacher
 */
marks.post('/assessments', requireAuth, async (c) => {
  try {
    const tenant = requireSchoolTenant(c);
    const body = await c.req.json();

    // Validate request
    const validated = createAssessmentSchema.parse(body);

    const assessment = await marksService.createAssessment(
      c.env.DB,
      tenant,
      validated
    );

    return c.json({ data: assessment }, 201);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json({ error: 'Validation error', details: error.errors }, 400);
    }
    if (error instanceof MarksError) {
      return c.json({ error: error.message }, error.statusCode as any);
    }
    const message = error instanceof Error ? error.message : 'Failed to create assessment';
    return c.json({ error: message }, 500);
  }
});

/**
 * GET /assessments
 * List assessments
 * Authorization: Principal, authorized teacher, student (published only)
 */
marks.get('/assessments', requireAuth, async (c) => {
  try {
    const tenant = requireSchoolTenant(c);
    const query = c.req.query();

    // Validate query
    const validated = listAssessmentsQuerySchema.parse(query);

    const assessments = await marksService.listAssessments(
      c.env.DB,
      tenant,
      validated
    );

    return c.json({ data: assessments }, 200);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json({ error: 'Validation error', details: error.errors }, 400);
    }
    if (error instanceof MarksError) {
      return c.json({ error: error.message }, error.statusCode as any);
    }
    const message = error instanceof Error ? error.message : 'Failed to list assessments';
    console.error('[GET /assessments] Error:', message, error);
    return c.json({ error: message }, 500);
  }
});

/**
 * GET /assessments/:id
 * Get assessment details
 * Authorization: Principal, authorized teacher
 */
marks.get('/assessments/:id', requireAuth, async (c) => {
  try {
    const tenant = requireSchoolTenant(c);
    const id = c.req.param('id');

    if (!id) {
      return c.json({ error: 'Assessment ID is required' }, 400);
    }

    const assessment = await marksService.getAssessmentById(
      c.env.DB,
      id,
      tenant
    );

    return c.json({ data: assessment }, 200);
  } catch (error) {
    if (error instanceof MarksError) {
      return c.json({ error: error.message }, error.statusCode as any);
    }
    const message = error instanceof Error ? error.message : 'Failed to get assessment';
    return c.json({ error: message }, 500);
  }
});

/**
 * PUT /assessments/:id
 * Update assessment
 * Authorization: Principal or assigned teacher (if not locked)
 */
marks.put('/assessments/:id', requireAuth, async (c) => {
  try {
    const tenant = requireSchoolTenant(c);
    const id = c.req.param('id');
    const body = await c.req.json();

    if (!id) {
      return c.json({ error: 'Assessment ID is required' }, 400);
    }

    // Validate request
    const validated = updateAssessmentSchema.parse(body);

    await marksService.updateAssessment(
      c.env.DB,
      id,
      tenant,
      validated
    );

    return c.json({ message: 'Assessment updated successfully' }, 200);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json({ error: 'Validation error', details: error.errors }, 400);
    }
    if (error instanceof MarksError) {
      return c.json({ error: error.message }, error.statusCode as any);
    }
    const message = error instanceof Error ? error.message : 'Failed to update assessment';
    return c.json({ error: message }, 500);
  }
});

/**
 * POST /assessments/:id/publish
 * Publish assessment
 * Authorization: Principal or assigned teacher
 */
marks.post('/assessments/:id/publish', requireAuth, async (c) => {
  try {
    const tenant = requireSchoolTenant(c);
    const id = c.req.param('id');

    if (!id) {
      return c.json({ error: 'Assessment ID is required' }, 400);
    }

    await marksService.publishAssessment(c.env.DB, id, tenant);

    return c.json({ message: 'Assessment published successfully' }, 200);
  } catch (error) {
    if (error instanceof MarksError) {
      return c.json({ error: error.message }, error.statusCode as any);
    }
    const message = error instanceof Error ? error.message : 'Failed to publish assessment';
    return c.json({ error: message }, 500);
  }
});

/**
 * POST /assessments/:id/lock
 * Lock assessment
 * Authorization: Principal or assigned teacher
 */
marks.post('/assessments/:id/lock', requireAuth, async (c) => {
  try {
    const tenant = requireSchoolTenant(c);
    const id = c.req.param('id');

    if (!id) {
      return c.json({ error: 'Assessment ID is required' }, 400);
    }

    await marksService.lockAssessment(c.env.DB, id, tenant);

    return c.json({ message: 'Assessment locked successfully' }, 200);
  } catch (error) {
    if (error instanceof MarksError) {
      return c.json({ error: error.message }, error.statusCode as any);
    }
    const message = error instanceof Error ? error.message : 'Failed to lock assessment';
    return c.json({ error: message }, 500);
  }
});

/**
 * POST /assessments/:id/unlock
 * Unlock assessment
 * Authorization: Principal only
 */
marks.post('/assessments/:id/unlock', requireAuth, async (c) => {
  try {
    const tenant = requireSchoolTenant(c);
    const id = c.req.param('id');

    if (!id) {
      return c.json({ error: 'Assessment ID is required' }, 400);
    }

    await marksService.unlockAssessment(c.env.DB, id, tenant);

    return c.json({ message: 'Assessment unlocked successfully' }, 200);
  } catch (error) {
    if (error instanceof MarksError) {
      return c.json({ error: error.message }, error.statusCode as any);
    }
    const message = error instanceof Error ? error.message : 'Failed to unlock assessment';
    return c.json({ error: message }, 500);
  }
});

/**
 * PUT /assessments/:id/marks
 * Enter/update marks (bulk)
 * Authorization: Principal or assigned teacher (if not locked)
 */
marks.put('/assessments/:id/marks', requireAuth, async (c) => {
  try {
    const tenant = requireSchoolTenant(c);
    const id = c.req.param('id');
    const body = await c.req.json();

    if (!id) {
      return c.json({ error: 'Assessment ID is required' }, 400);
    }

    // Validate request
    const validated = bulkMarksSchema.parse(body);

    const result = await marksService.enterMarks(
      c.env.DB,
      id,
      tenant,
      validated
    );

    return c.json({ data: result }, 200);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json({ error: 'Validation error', details: error.errors }, 400);
    }
    if (error instanceof MarksError) {
      return c.json({ error: error.message }, error.statusCode as any);
    }
    const message = error instanceof Error ? error.message : 'Failed to enter marks';
    return c.json({ error: message }, 500);
  }
});

/**
 * GET /assessments/:id/marks
 * Get assessment marks
 * Authorization: Principal or authorized teacher
 */
marks.get('/assessments/:id/marks', requireAuth, async (c) => {
  try {
    const tenant = requireSchoolTenant(c);
    const id = c.req.param('id');

    if (!id) {
      return c.json({ error: 'Assessment ID is required' }, 400);
    }

    const marksData = await marksService.getAssessmentMarks(
      c.env.DB,
      id,
      tenant
    );

    return c.json({ data: marksData }, 200);
  } catch (error) {
    if (error instanceof MarksError) {
      return c.json({ error: error.message }, error.statusCode as any);
    }
    const message = error instanceof Error ? error.message : 'Failed to get marks';
    return c.json({ error: message }, 500);
  }
});

/**
 * GET /students/:studentId/summary
 * Get student marks summary
 * Authorization: Principal, authorized teacher, or the student themselves
 */
marks.get('/students/:studentId/summary', requireAuth, async (c) => {
  try {
    const tenant = requireSchoolTenant(c);
    const studentId = c.req.param('studentId');
    const query = c.req.query();

    if (!studentId) {
      return c.json({ error: 'Student ID is required' }, 400);
    }

    // Validate query
    const validated = studentMarksQuerySchema.parse(query);

    const summary = await marksService.getStudentSummary(
      c.env.DB,
      studentId,
      tenant,
      validated
    );

    return c.json({ data: summary }, 200);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json({ error: 'Validation error', details: error.errors }, 400);
    }
    if (error instanceof MarksError) {
      return c.json({ error: error.message }, error.statusCode as any);
    }
    const message = error instanceof Error ? error.message : 'Failed to get student summary';
    return c.json({ error: message }, 500);
  }
});

/**
 * GET /students/:studentId/subject-wise
 * Get student subject-wise marks
 * Authorization: Principal, authorized teacher, or the student themselves
 */
marks.get('/students/:studentId/subject-wise', requireAuth, async (c) => {
  try {
    const tenant = requireSchoolTenant(c);
    const studentId = c.req.param('studentId');
    const query = c.req.query();

    if (!studentId) {
      return c.json({ error: 'Student ID is required' }, 400);
    }

    // Validate query
    const validated = studentMarksQuerySchema.parse(query);

    const subjectWise = await marksService.getStudentSubjectWise(
      c.env.DB,
      studentId,
      tenant,
      validated
    );

    return c.json({ data: subjectWise }, 200);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json({ error: 'Validation error', details: error.errors }, 400);
    }
    if (error instanceof MarksError) {
      return c.json({ error: error.message }, error.statusCode as any);
    }
    const message = error instanceof Error ? error.message : 'Failed to get subject-wise marks';
    return c.json({ error: message }, 500);
  }
});

/**
 * GET /classrooms/:classroomId/report
 * Get classroom marks report
 * Authorization: Principal or authorized teacher
 */
marks.get('/classrooms/:classroomId/report', requireAuth, async (c) => {
  try {
    const tenant = requireSchoolTenant(c);
    const classroomId = c.req.param('classroomId');
    const query = c.req.query();

    if (!classroomId) {
      return c.json({ error: 'Classroom ID is required' }, 400);
    }

    // Validate query
    const validated = classroomReportQuerySchema.parse(query);

    const report = await marksService.getClassroomReport(
      c.env.DB,
      classroomId,
      tenant,
      validated
    );

    return c.json({ data: report }, 200);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json({ error: 'Validation error', details: error.errors }, 400);
    }
    if (error instanceof MarksError) {
      return c.json({ error: error.message }, error.statusCode as any);
    }
    const message = error instanceof Error ? error.message : 'Failed to get classroom report';
    return c.json({ error: message }, 500);
  }
});

export default marks;
