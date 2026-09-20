/**
 * Attendance Routes
 * 
 * POST /sessions - Create attendance session
 * GET /sessions - List attendance sessions
 * GET /sessions/:id - Get session details
 * GET /sessions/:id/entries - Get session attendance entries
 * PUT /sessions/:id/entries - Mark attendance (bulk)
 * POST /sessions/:id/lock - Lock session
 * POST /sessions/:id/unlock - Unlock session
 * GET /students/:studentId/summary - Get student attendance summary
 * GET /students/:studentId/subject-wise - Get student subject-wise attendance
 * GET /classrooms/:classroomId/report - Get classroom attendance report
 * 
 * Note: Student self-service endpoint is at /me/attendance (in me.routes.ts)
 */

import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import * as attendanceService from './attendance.service';
import * as attendanceSchemas from './attendance.schemas';
import { requireAuth, getTenant, type AuthContext } from '../auth/auth.middleware';
import { logAudit } from '../lib/audit/audit.service';
import { AttendanceError } from './attendance.errors';
import type {
  CreateAttendanceSessionRequest,
  MarkAttendanceRequest,
} from './attendance.types';

const attendance = new Hono<AuthContext>();

/**
 * POST /sessions
 * Create attendance session
 * Authorization: Principal or assigned teacher
 */
attendance.post(
  '/sessions',
  requireAuth,
  zValidator('json', attendanceSchemas.createAttendanceSessionSchema),
  async (c) => {
    try {
      const tenant = getTenant(c);
      const body = c.req.valid('json') as CreateAttendanceSessionRequest;
      
      const session = await attendanceService.createSession(c.env.DB, tenant, body);
      
      // Audit log
      await logAudit(c.env.DB, tenant, 'created', 'attendance_session', session.id, null, session);
      
      return c.json({ data: session }, 201);
    } catch (error) {
      if (error instanceof AttendanceError) {
        return c.json({ error: error.message }, error.statusCode as any);
      }
      const message = error instanceof Error ? error.message : 'Failed to create attendance session';
      return c.json({ error: message }, 500);
    }
  }
);

/**
 * GET /sessions
 * List attendance sessions
 * Authorization: Principal (all), Teacher (assigned or class teacher)
 */
attendance.get('/sessions', requireAuth, async (c) => {
  try {
    const tenant = getTenant(c);
    
    const filters = {
      academic_year_id: c.req.query('academic_year_id'),
      classroom_id: c.req.query('classroom_id'),
      subject_id: c.req.query('subject_id'),
      from_date: c.req.query('from_date'),
      to_date: c.req.query('to_date'),
    };
    
    const sessions = await attendanceService.listSessions(c.env.DB, tenant, filters);
    
    return c.json({ data: sessions }, 200);
  } catch (error) {
    if (error instanceof AttendanceError) {
      return c.json({ error: error.message }, error.statusCode as any);
    }
    const message = error instanceof Error ? error.message : 'Failed to list sessions';
    return c.json({ error: message }, 500);
  }
});

/**
 * GET /sessions/:id
 * Get attendance session details
 * Authorization: Principal or authorized teacher
 */
attendance.get('/sessions/:id', requireAuth, async (c) => {
  try {
    const tenant = getTenant(c);
    const sessionId = c.req.param('id')!;
    
    const session = await attendanceService.getSessionById(c.env.DB, sessionId, tenant);
    
    return c.json({ data: session }, 200);
  } catch (error) {
    if (error instanceof AttendanceError) {
      return c.json({ error: error.message }, error.statusCode as any);
    }
    const message = error instanceof Error ? error.message : 'Failed to get session';
    return c.json({ error: message }, 500);
  }
});

/**
 * GET /sessions/:id/entries
 * Get attendance entries for a session
 * Authorization: Principal or authorized teacher
 */
attendance.get('/sessions/:id/entries', requireAuth, async (c) => {
  try {
    const tenant = getTenant(c);
    const sessionId = c.req.param('id')!;
    
    const entries = await attendanceService.getSessionEntries(c.env.DB, sessionId, tenant);
    
    return c.json({ data: entries }, 200);
  } catch (error) {
    if (error instanceof AttendanceError) {
      return c.json({ error: error.message }, error.statusCode as any);
    }
    const message = error instanceof Error ? error.message : 'Failed to get entries';
    return c.json({ error: message }, 500);
  }
});

/**
 * PUT /sessions/:id/entries
 * Mark attendance (bulk update)
 * Authorization: Principal or assigned teacher (within edit window)
 */
attendance.put(
  '/sessions/:id/entries',
  requireAuth,
  zValidator('json', attendanceSchemas.markAttendanceSchema),
  async (c) => {
    try {
      const tenant = getTenant(c);
      const sessionId = c.req.param('id')!;
      const body = c.req.valid('json') as MarkAttendanceRequest;
      
      const result = await attendanceService.markAttendance(c.env.DB, sessionId, tenant, body);
      
      // Audit log
      await logAudit(
        c.env.DB,
        tenant,
        'marked_attendance',
        'attendance_session',
        sessionId,
        null,
        { updated_count: result.updated }
      );
      
      return c.json({ data: result }, 200);
    } catch (error) {
      if (error instanceof AttendanceError) {
        return c.json({ error: error.message }, error.statusCode as any);
      }
      const message = error instanceof Error ? error.message : 'Failed to mark attendance';
      return c.json({ error: message }, 500);
    }
  }
);

/**
 * POST /sessions/:id/lock
 * Lock attendance session
 * Authorization: Principal or assigned teacher
 */
attendance.post('/sessions/:id/lock', requireAuth, async (c) => {
  try {
    const tenant = getTenant(c);
    const sessionId = c.req.param('id')!;
    
    await attendanceService.lockSession(c.env.DB, sessionId, tenant);
    
    // Audit log
    await logAudit(c.env.DB, tenant, 'locked', 'attendance_session', sessionId, null, null);
    
    return c.json({ message: 'Session locked successfully' }, 200);
  } catch (error) {
    if (error instanceof AttendanceError) {
      return c.json({ error: error.message }, error.statusCode as any);
    }
    const message = error instanceof Error ? error.message : 'Failed to lock session';
    return c.json({ error: message }, 500);
  }
});

/**
 * POST /sessions/:id/unlock
 * Unlock attendance session
 * Authorization: Principal only
 */
attendance.post('/sessions/:id/unlock', requireAuth, async (c) => {
  try {
    const tenant = getTenant(c);
    const sessionId = c.req.param('id')!;
    
    await attendanceService.unlockSession(c.env.DB, sessionId, tenant);
    
    // Audit log
    await logAudit(c.env.DB, tenant, 'unlocked', 'attendance_session', sessionId, null, null);
    
    return c.json({ message: 'Session unlocked successfully' }, 200);
  } catch (error) {
    if (error instanceof AttendanceError) {
      return c.json({ error: error.message }, error.statusCode as any);
    }
    const message = error instanceof Error ? error.message : 'Failed to unlock session';
    return c.json({ error: message }, 500);
  }
});

/**
 * GET /students/:studentId/summary
 * Get student attendance summary
 * Authorization: Principal, authorized teacher, or the student themselves
 */
attendance.get('/students/:studentId/summary', requireAuth, async (c) => {
  try {
    const tenant = getTenant(c);
    const studentId = c.req.param('studentId')!;
    
    const filters = {
      academic_year_id: c.req.query('academic_year_id'),
      classroom_id: c.req.query('classroom_id'),
      subject_id: c.req.query('subject_id'),
      from_date: c.req.query('from_date'),
      to_date: c.req.query('to_date'),
    };
    
    const summary = await attendanceService.getStudentSummary(
      c.env.DB,
      studentId,
      tenant,
      filters
    );
    
    return c.json({ data: summary }, 200);
  } catch (error) {
    if (error instanceof AttendanceError) {
      return c.json({ error: error.message }, error.statusCode as any);
    }
    const message = error instanceof Error ? error.message : 'Failed to get summary';
    return c.json({ error: message }, 500);
  }
});

/**
 * GET /students/:studentId/subject-wise
 * Get student subject-wise attendance
 * Authorization: Principal, authorized teacher, or the student themselves
 */
attendance.get('/students/:studentId/subject-wise', requireAuth, async (c) => {
  try {
    const tenant = getTenant(c);
    const studentId = c.req.param('studentId')!;
    
    const filters = {
      academic_year_id: c.req.query('academic_year_id'),
      classroom_id: c.req.query('classroom_id'),
    };
    
    const summary = await attendanceService.getStudentSubjectWise(
      c.env.DB,
      studentId,
      tenant,
      filters
    );
    
    return c.json({ data: summary }, 200);
  } catch (error) {
    if (error instanceof AttendanceError) {
      return c.json({ error: error.message }, error.statusCode as any);
    }
    const message = error instanceof Error ? error.message : 'Failed to get subject-wise attendance';
    return c.json({ error: message }, 500);
  }
});

/**
 * GET /classrooms/:classroomId/report
 * Get classroom attendance report (all students)
 * Authorization: Principal or authorized teacher
 */
attendance.get('/classrooms/:classroomId/report', requireAuth, async (c) => {
  try {
    const tenant = getTenant(c);
    const classroomId = c.req.param('classroomId')!;
    
    const filters = {
      academic_year_id: c.req.query('academic_year_id'),
      subject_id: c.req.query('subject_id'),
      from_date: c.req.query('from_date'),
      to_date: c.req.query('to_date'),
    };
    
    const report = await attendanceService.getClassroomReport(
      c.env.DB,
      classroomId,
      tenant,
      filters
    );
    
    return c.json({ data: report }, 200);
  } catch (error) {
    if (error instanceof AttendanceError) {
      return c.json({ error: error.message }, error.statusCode as any);
    }
    const message = error instanceof Error ? error.message : 'Failed to get classroom report';
    return c.json({ error: message }, 500);
  }
});

export default attendance;
