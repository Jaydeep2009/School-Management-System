/**
 * Me Routes
 * 
 * GET /me/profile - Get current user's profile
 * GET /me/attendance - Get student's own attendance
 * GET /me/marks - Get student's own marks
 * GET /me/assignments - Get student's own assignments
 * 
 * Authorization: Any authenticated user
 * Returns the profile based on the user's role (teacher or student)
 */

import { Hono } from 'hono';
import * as teacherRepo from './teacher.repository';
import * as studentRepo from './student.repository';
import * as attendanceService from '../attendance/attendance.service';
import * as marksService from '../marks/marks.service';
import * as assignmentsService from '../assignments/assignments.service';
import * as feesService from '../fees/fees.service';
import { requireAuth, getTenant, type AuthContext } from '../auth/auth.middleware';
import { AttendanceError } from '../attendance/attendance.errors';
import { MarksError } from '../marks/marks.errors';
import { AssignmentsError } from '../assignments/assignments.errors';
import { FeesError } from '../fees/fees.errors';

const me = new Hono<AuthContext>();

/**
 * GET /me/profile
 * Get current user's profile
 * 
 * Authorization: Any authenticated user
 * Returns teacher or student profile based on role
 * 
 * SECURITY:
 * - Uses tenant.userId from authenticated token
 * - Role-based profile lookup
 * - School-scoped queries
 */
me.get('/profile', requireAuth, async (c) => {
  try {
    const tenant = getTenant(c);
    
    // Based on role, fetch appropriate profile
    if (tenant.role === 'teacher') {
      const profile = await teacherRepo.findByUserId(c.env.DB, tenant.userId, tenant.schoolId);
      
      if (!profile) {
        return c.json({ error: 'Teacher profile not found' }, 404);
      }
      
      return c.json({
        data: {
          type: 'teacher',
          profile,
        },
      }, 200);
    }
    
    if (tenant.role === 'student') {
      const profile = await studentRepo.findByUserId(c.env.DB, tenant.userId, tenant.schoolId);
      
      if (!profile) {
        return c.json({ error: 'Student profile not found' }, 404);
      }
      
      return c.json({
        data: {
          type: 'student',
          profile,
        },
      }, 200);
    }
    
    if (tenant.role === 'principal') {
      // Principal doesn't have a separate profile
      // They can access their user information from the auth context
      return c.json({
        data: {
          type: 'principal',
          user_id: tenant.userId,
          school_id: tenant.schoolId,
        },
      }, 200);
    }
    
    // Unknown role
    return c.json({ error: 'Profile not available for this role' }, 404);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get profile';
    return c.json({ error: message }, 500);
  }
});

/**
 * GET /me/attendance
 * Get student's own attendance
 * Authorization: Student only
 * 
 * SECURITY:
 * - Student ID derived from authenticated token
 * - Cannot access another student's attendance
 */
me.get('/attendance', requireAuth, async (c) => {
  try {
    const tenant = getTenant(c);
    
    const data = await attendanceService.getMyAttendance(c.env.DB, tenant);
    
    return c.json({ data }, 200);
  } catch (error) {
    if (error instanceof AttendanceError) {
      return c.json({ error: error.message }, error.statusCode as any);
    }
    const message = error instanceof Error ? error.message : 'Failed to get attendance';
    return c.json({ error: message }, 500);
  }
});

/**
 * GET /me/marks
 * Get student's own marks
 * Authorization: Student only
 * 
 * SECURITY:
 * - Student ID derived from authenticated token
 * - Cannot access another student's marks
 * - Only published assessments are shown
 */
me.get('/marks', requireAuth, async (c) => {
  try {
    const tenant = getTenant(c);
    
    const data = await marksService.getMyMarks(c.env.DB, tenant);
    
    return c.json({ data }, 200);
  } catch (error) {
    if (error instanceof MarksError) {
      return c.json({ error: error.message }, error.statusCode as any);
    }
    const message = error instanceof Error ? error.message : 'Failed to get marks';
    return c.json({ error: message }, 500);
  }
});

/**
 * GET /me/assignments
 * Get student's own assignments
 * Authorization: Student only
 * 
 * SECURITY:
 * - Student ID derived from authenticated token
 * - Cannot access another student's assignments
 * - Only published assignments are shown
 */
me.get('/assignments', requireAuth, async (c) => {
  try {
    const tenant = getTenant(c);
    
    const data = await assignmentsService.getMyAssignments(c.env.DB, tenant);
    
    return c.json({ data }, 200);
  } catch (error) {
    if (error instanceof AssignmentsError) {
      return c.json({ error: error.message }, error.statusCode as any);
    }
    const message = error instanceof Error ? error.message : 'Failed to get assignments';
    return c.json({ error: message }, 500);
  }
});

/**
 * GET /me/fees/:academicYearId
 * Get student's own fee details for an academic year
 * Authorization: Student only
 * 
 * SECURITY:
 * - Student ID derived from authenticated token
 * - Cannot access another student's fees
 */
me.get('/fees/:academicYearId', requireAuth, async (c) => {
  try {
    const tenant = getTenant(c);
    const academicYearId = c.req.param('academicYearId');
    
    if (!academicYearId) {
      return c.json({ error: 'Academic year ID is required' }, 400);
    }
    
    const data = await feesService.getStudentFeeDetails(c.env.DB, academicYearId, tenant);
    
    return c.json({ data }, 200);
  } catch (error) {
    if (error instanceof FeesError) {
      return c.json({ error: error.message }, error.statusCode as any);
    }
    const message = error instanceof Error ? error.message : 'Failed to get fees';
    return c.json({ error: message }, 500);
  }
});

export default me;
