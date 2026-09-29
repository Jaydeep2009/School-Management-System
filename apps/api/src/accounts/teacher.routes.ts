/**
 * Teacher Routes
 * 
 * GET /teachers - List teachers
 * GET /teachers/:id - Get teacher by ID
 * POST /teachers - Create teacher (principal only)
 * PATCH /teachers/:id - Update teacher (principal only)
 * POST /teachers/:id/disable - Disable teacher (principal only)
 * POST /teachers/:id/reactivate - Reactivate teacher (principal only)
 * POST /teachers/:id/reset-password - Reset teacher password (principal only)
 * GET /teachers/:id/assignments - Get teaching assignments (future)
 */

import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import * as teacherService from './teacher.service';
import * as teacherSchemas from './accounts.schemas';
import { requireAuth, requireSchoolTenant, getRequestIdFromContext, type AuthContext } from '../auth/auth.middleware';
import { requirePrincipal } from '../auth/role.middleware';
import { logAudit } from '../lib/audit/audit.service';
import type {
  CreateTeacherRequest,
  UpdateTeacherRequest,
} from './accounts.types';

const teachers = new Hono<AuthContext>();

/**
 * GET /teachers
 * List teachers
 * Authorization: Principal only
 * Optional filters: status, search
 */
teachers.get('/', requireAuth, requirePrincipal(), async (c) => {
  try {
    const tenant = requireSchoolTenant(c);
    
    const filters = {
      status: c.req.query('status') as 'active' | 'inactive' | undefined,
      search: c.req.query('search'),
    };
    
    const teacherList = await teacherService.list(c.env.DB, tenant.schoolId, filters);
    return c.json({ data: teacherList }, 200);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to list teachers';
    return c.json({ error: message }, 500);
  }
});

/**
 * GET /teachers/:id
 * Get teacher by ID
 * Authorization: Principal can view all, teacher can view own profile
 */
teachers.get('/:id', requireAuth, async (c) => {
  try {
    const tenant = requireSchoolTenant(c);
    const id = c.req.param('id')!; // Route guarantees id exists
    
    // Fetch teacher with user info (tenant-scoped)
    const result = await teacherService.getByIdWithUser(c.env.DB, id, tenant.schoolId);
    
    // Authorization check: Principal can view all, teacher can view own
    if (tenant.role === 'principal') {
      // Principal can view all
    } else if (tenant.role === 'teacher') {
      // Teacher can only view their own profile
      if (result.user.id !== tenant.userId) {
        return c.json({ error: 'Forbidden' }, 403);
      }
    } else {
      // Students and others cannot view teacher profiles
      return c.json({ error: 'Forbidden' }, 403);
    }
    
    return c.json({ data: result }, 200);
  } catch (error) {
    if (error instanceof teacherService.TeacherError) {
      return c.json({ error: error.message }, error.statusCode as 400 | 404 | 500);
    }
    const message = error instanceof Error ? error.message : 'Failed to get teacher';
    return c.json({ error: message }, 500);
  }
});

/**
 * POST /teachers
 * Create teacher
 * Authorization: Principal only
 * 
 * SECURITY:
 * - Returns temporary password ONCE
 * - Client must save and display to user
 * - Password will not be retrievable after this response
 */
teachers.post(
  '/',
  requireAuth,
  requirePrincipal(),
  zValidator('json', teacherSchemas.createTeacherSchema),
  async (c) => {
    try {
      const tenant = requireSchoolTenant(c);
      const requestId = getRequestIdFromContext(c);
      
      const body = c.req.valid('json') as CreateTeacherRequest;
      const result = await teacherService.create(c.env.DB, tenant.schoolId, body);
      
      // Audit log (NEVER log temporary password)
      await logAudit(c.env.DB, tenant, 'created', 'teacher', result.profile_id, null, {
        profile_id: result.profile_id,
        user_id: result.user_id,
        login_id: result.login_id,
        employee_code: result.employee_code,
      });
      
      // SECURITY: Temporary password is returned in response
      // Client MUST save and display this to the user
      return c.json({ data: result }, 201);
    } catch (error) {
      if (error instanceof teacherService.TeacherError) {
        return c.json({ error: error.message }, error.statusCode as 400 | 404 | 500);
      }
      const message = error instanceof Error ? error.message : 'Failed to create teacher';
      return c.json({ error: message }, 500);
    }
  }
);

/**
 * PATCH /teachers/:id
 * Update teacher
 * Authorization: Principal only
 */
teachers.patch(
  '/:id',
  requireAuth,
  requirePrincipal(),
  zValidator('json', teacherSchemas.updateTeacherSchema),
  async (c) => {
    try {
      const tenant = requireSchoolTenant(c);
      const requestId = getRequestIdFromContext(c);
      
      
      const id = c.req.param('id')!; // Route guarantees id exists
      
      // Get before state for audit
      const before = await teacherService.getById(c.env.DB, id, tenant.schoolId);
      
      const body = c.req.valid('json') as UpdateTeacherRequest;
      const after = await teacherService.update(c.env.DB, id, tenant.schoolId, body);
      
      // Audit log
      await logAudit(c.env.DB, tenant, 'updated', 'teacher', id, before, after);
      
      return c.json({ data: after }, 200);
    } catch (error) {
      if (error instanceof Error && error.message.includes('Insufficient role')) {
        return c.json({ error: 'Forbidden' }, 403);
      }
      if (error instanceof teacherService.TeacherError) {
        return c.json({ error: error.message }, error.statusCode as 400 | 404 | 500);
      }
      const message = error instanceof Error ? error.message : 'Failed to update teacher';
      return c.json({ error: message }, 500);
    }
  }
);

/**
 * POST /teachers/:id/disable
 * Disable teacher account
 * Authorization: Principal only
 * 
 * SECURITY:
 * - Sets user status to disabled
 * - Revokes all sessions
 * - Increments token_version
 */
teachers.post('/:id/disable', requireAuth, requirePrincipal(), async (c) => {
  try {
    const tenant = requireSchoolTenant(c);
    const requestId = getRequestIdFromContext(c);
    
    const id = c.req.param('id')!; // Route guarantees id exists
    
    // Get before state for audit
    const before = await teacherService.getById(c.env.DB, id, tenant.schoolId);
    
    const after = await teacherService.disable(c.env.DB, id, tenant.schoolId);
    
    // Audit log
    await logAudit(c.env.DB, tenant, 'disabled', 'teacher', id, before, after);
    
    return c.json({ data: after }, 200);
  } catch (error) {
    if (error instanceof Error && error.message.includes('Insufficient role')) {
      return c.json({ error: 'Forbidden' }, 403);
    }
    if (error instanceof teacherService.TeacherError) {
      return c.json({ error: error.message }, error.statusCode as 400 | 404 | 500);
    }
    const message = error instanceof Error ? error.message : 'Failed to disable teacher';
    return c.json({ error: message }, 500);
  }
});

/**
 * POST /teachers/:id/reactivate
 * Reactivate teacher account
 * Authorization: Principal only
 * 
 * SECURITY:
 * - Sets user status to active
 * - Sets must_change_password = true
 */
teachers.post('/:id/reactivate', requireAuth, requirePrincipal(), async (c) => {
  try {
    const tenant = requireSchoolTenant(c);
    const requestId = getRequestIdFromContext(c);
    
    const id = c.req.param('id')!; // Route guarantees id exists
    
    // Get before state for audit
    const before = await teacherService.getById(c.env.DB, id, tenant.schoolId);
    
    const after = await teacherService.reactivate(c.env.DB, id, tenant.schoolId);
    
    // Audit log
    await logAudit(c.env.DB, tenant, 'reactivated', 'teacher', id, before, after);
    
    return c.json({ data: after }, 200);
  } catch (error) {
    if (error instanceof Error && error.message.includes('Insufficient role')) {
      return c.json({ error: 'Forbidden' }, 403);
    }
    if (error instanceof teacherService.TeacherError) {
      return c.json({ error: error.message }, error.statusCode as 400 | 404 | 500);
    }
    const message = error instanceof Error ? error.message : 'Failed to reactivate teacher';
    return c.json({ error: message }, 500);
  }
});

/**
 * POST /teachers/:id/reset-password
 * Reset teacher password
 * Authorization: Principal only
 * 
 * SECURITY:
 * - Generates new temporary password
 * - Returns password ONCE
 * - Revokes all sessions
 * - Increments token_version
 * - Sets must_change_password = true
 */
teachers.post('/:id/reset-password', requireAuth, requirePrincipal(), async (c) => {
  try {
    const tenant = requireSchoolTenant(c);
    const requestId = getRequestIdFromContext(c);
    
    const id = c.req.param('id')!; // Route guarantees id exists
    
    const result = await teacherService.resetPassword(c.env.DB, id, tenant.schoolId);
    
    // Audit log (NEVER log temporary password)
    await logAudit(c.env.DB, tenant, 'reset_password', 'teacher', id, null, {
      user_id: result.user_id,
      login_id: result.login_id,
    });
    
    // SECURITY: Temporary password is returned in response
    // Client MUST save and display this to the user
    return c.json({ data: result }, 200);
  } catch (error) {
    if (error instanceof Error && error.message.includes('Insufficient role')) {
      return c.json({ error: 'Forbidden' }, 403);
    }
    if (error instanceof teacherService.TeacherError) {
      return c.json({ error: error.message }, error.statusCode as 400 | 404 | 500);
    }
    const message = error instanceof Error ? error.message : 'Failed to reset password';
    return c.json({ error: message }, 500);
  }
});

/**
 * GET /teachers/:id/assignments
 * Get teaching assignments for a teacher
 * Authorization: Principal can view all, teacher can view own
 * 
 * NOTE: This is a placeholder for future implementation
 * Requires teaching assignments to be implemented first
 */
teachers.get('/:id/assignments', requireAuth, async (c) => {
  try {
    const tenant = requireSchoolTenant(c);
    const id = c.req.param('id')!; // Route guarantees id exists
    
    // Fetch teacher to verify existence (tenant-scoped)
    const result = await teacherService.getByIdWithUser(c.env.DB, id, tenant.schoolId);
    
    // Authorization check: Principal can view all, teacher can view own
    if (tenant.role === 'principal') {
      // Principal can view all
    } else if (tenant.role === 'teacher') {
      // Teacher can only view their own assignments
      if (result.user.id !== tenant.userId) {
        return c.json({ error: 'Forbidden' }, 403);
      }
    } else {
      // Students and others cannot view teacher assignments
      return c.json({ error: 'Forbidden' }, 403);
    }
    
    // Get teaching assignments for the teacher
    const assignments = await c.env.DB
      .prepare(`
        SELECT 
          ta.id as assignment_id,
          ta.subject_id,
          s.subject_name,
          s.subject_code,
          ta.classroom_id,
          c.classroom_code,
          c.grade_name,
          c.division_name,
          (c.grade_name || ' ' || c.division_name) as classroom_name,
          ta.academic_year_id,
          ay.label as academic_year
        FROM teaching_assignments ta
        INNER JOIN subjects s ON ta.subject_id = s.id
        INNER JOIN classrooms c ON ta.classroom_id = c.id
        INNER JOIN academic_years ay ON ta.academic_year_id = ay.id
        WHERE ta.teacher_id = ?
          AND ta.school_id = ?
        ORDER BY ay.start_date DESC, c.grade_level, c.division_name, s.subject_name
      `)
      .bind(id, tenant.schoolId)
      .all();

    // Get classrooms where teacher is class teacher
    const classTeacherOf = await c.env.DB
      .prepare(`
        SELECT 
          c.id as classroom_id,
          c.classroom_code,
          c.grade_name,
          c.division_name,
          (c.grade_name || ' ' || c.division_name) as classroom_name,
          c.academic_year_id,
          ay.label as academic_year,
          COUNT(e.id) as student_count
        FROM classrooms c
        INNER JOIN academic_years ay ON c.academic_year_id = ay.id
        LEFT JOIN enrollments e ON c.id = e.classroom_id
        WHERE c.class_teacher_id = ?
          AND c.school_id = ?
        GROUP BY c.id, c.classroom_code, c.grade_name, c.division_name, c.academic_year_id, ay.label
        ORDER BY ay.start_date DESC, c.grade_level, c.division_name
      `)
      .bind(id, tenant.schoolId)
      .all();

    return c.json({ 
      data: {
        teaching_assignments: assignments.results || [],
        class_teacher_of: classTeacherOf.results || [],
      }
    }, 200);
  } catch (error) {
    if (error instanceof teacherService.TeacherError) {
      return c.json({ error: error.message }, error.statusCode as 400 | 404 | 500);
    }
    const message = error instanceof Error ? error.message : 'Failed to get assignments';
    return c.json({ error: message }, 500);
  }
});

export default teachers;
