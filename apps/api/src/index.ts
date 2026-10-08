import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import healthRoutes from './routes/health';
import authRoutes from './auth/auth.routes';
import academicYearRoutes from './academic/academic-year.routes';
import classroomRoutes from './academic/classroom.routes';
import subjectRoutes from './academic/subject.routes';
import teachingAssignmentRoutes from './academic/teaching-assignment.routes';
import enrollmentRoutes from './academic/enrollment.routes';
import teacherRoutes from './accounts/teacher.routes';
import studentRoutes from './accounts/student.routes';
import studentMeRoutes from './students/student-me.routes';
import meRoutes from './accounts/me.routes';
import attendanceRoutes from './attendance/attendance.routes';
import marksRoutes from './marks/marks.routes';
import assignmentsRoutes from './assignments/assignments.routes';
import feesRoutes from './fees/fees.routes';
import promotionRoutes from './promotion/promotion.routes';
import profilesRoutes from './profiles/profiles.routes';
import timetableRoutes from './timetable/timetable.routes';
import periodTimingRoutes from './timetable/period-timing.routes';
import importsRoutes from './imports/imports.routes';
import schoolsRoutes from './schools/schools.routes';
import notificationRoutes from './notifications/notifications.routes';
import * as cronHandlers from './cron/handlers';

export type Env = {
  DB: D1Database;
  JWT_SECRET: string;
  BUCKET: R2Bucket;
};

const app = new Hono<{ Bindings: Env }>();

// Middleware
app.use('*', logger());
app.use('*', cors());

// Routes
app.route('/health', healthRoutes);
app.route('/auth', authRoutes);
app.route('/schools', schoolsRoutes);
app.route('/academic-years', academicYearRoutes);
app.route('/classrooms', classroomRoutes);
app.route('/subjects', subjectRoutes);
app.route('/teaching-assignments', teachingAssignmentRoutes);
app.route('/enrollments', enrollmentRoutes);
app.route('/teachers', teacherRoutes);
app.route('/teachers', profilesRoutes); // Profile operations (GET /teachers/:userId)
app.route('/students', studentRoutes);
app.route('/students/me', studentMeRoutes); // Student self-service routes
app.route('/students', profilesRoutes); // Profile operations (GET /students/:userId)
app.route('/profiles', profilesRoutes); // Birthday operations (GET /profiles/birthdays/*)
app.route('/attendance', attendanceRoutes);
app.route('/marks', marksRoutes);
app.route('/assignments', assignmentsRoutes);
app.route('/fees', feesRoutes);
app.route('/promotions', promotionRoutes);
app.route('/timetables', timetableRoutes);
app.route('/period-timings', periodTimingRoutes);
app.route('/imports', importsRoutes);
app.route('/notifications', notificationRoutes);
app.route('/me', meRoutes);

// Default route
app.get('/', (c) => {
  return c.json({
    message: 'School Management System API',
    version: '1.0.0',
  });
});

// 404 handler
app.notFound((c) => {
  return c.json({ error: 'Not Found' }, 404);
});

// Error handler
app.onError((err, c) => {
  console.error(`Error: ${err.message}`);
  return c.json({ error: 'Internal Server Error' }, 500);
});

/**
 * Scheduled handler for cron jobs
 * Cloudflare Workers cron triggers call this function
 */
export const scheduled: ExportedHandlerScheduledHandler<Env> = async (event, env, ctx) => {
  const { handleCron } = await import('./cron');
  
  try {
    // Cast event to any to avoid type mismatch - Cloudflare types are correct at runtime
    await handleCron(event as any, env, ctx);
  } catch (error) {
    console.error('[CRON] Job failed:', error);
    // Don't throw - let the cron continue on next schedule
  }
};

export default app;
