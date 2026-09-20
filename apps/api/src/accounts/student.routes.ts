/**
 * Student Routes
 * 
 * GET /students - List students
 * GET /students/:id - Get student by ID
 * POST /students - Create student (principal only)
 * POST /students/bulk-provision - Bulk create students (principal only)
 * PATCH /students/:id - Update student (principal only)
 * POST /students/:id/disable - Disable student (principal only)
 * POST /students/:id/reactivate - Reactivate student (principal only)
 * POST /students/:id/reset-password - Reset student password (principal only)
 * GET /students/:id/enrollments - Get student enrollments (future)
 */

import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import * as studentService from './student.service';
import * as bulkProvisionService from './bulk-provision.service';
import * as studentSchemas from './accounts.schemas';
import { requireAuth, getTenant, getRequestIdFromContext, type AuthContext } from '../auth/auth.middleware';
import { requireRole } from '../authz/authz.service';
import { logAudit } from '../lib/audit/audit.service';
import type {
  CreateStudentRequest,
  UpdateStudentRequest,
  BulkStudentProvisionRequest,
  AccountCreationResponse,
} from './accounts.types';

const students = new Hono<AuthContext>();

/**
 * GET /students
 * List students
 * Authorization: Principal can view all
 * Optional filters: status, search
 */
students.get('/', requireAuth, async (c) => {
  try {
    const tenant = getTenant(c);
    
    // Authorization: Principal only
    requireRole(tenant, 'principal');
    
    const filters = {
      status: c.req.query('status') as 'active' | 'inactive' | undefined,
      search: c.req.query('search'),
    };
    
    const studentList = await studentService.list(c.env.DB, tenant.schoolId, filters);
    return c.json({ data: studentList }, 200);
  } catch (error) {
    if (error instanceof Error && error.message.includes('Insufficient role')) {
      return c.json({ error: 'Forbidden' }, 403);
    }
    const message = error instanceof Error ? error.message : 'Failed to list students';
    return c.json({ error: message }, 500);
  }
});

/**
 * GET /students/:id
 * Get student by ID
 * Authorization: Principal can view all, student can view own profile
 */
students.get('/:id', requireAuth, async (c) => {
  try {
    const tenant = getTenant(c);
    const id = c.req.param('id')!; // Route guarantees id exists
    
    // Fetch student with user info (tenant-scoped)
    const result = await studentService.getByIdWithUser(c.env.DB, id, tenant.schoolId);
    
    // Authorization check: Principal can view all, student can view own
    if (tenant.role === 'principal') {
      // Principal can view all
    } else if (tenant.role === 'student') {
      // Student can only view their own profile
      if (result.user.id !== tenant.userId) {
        return c.json({ error: 'Forbidden' }, 403);
      }
    } else {
      // Teachers and others cannot view student profiles directly
      // (Teachers can view through their classroom/teaching assignments)
      return c.json({ error: 'Forbidden' }, 403);
    }
    
    return c.json({ data: result }, 200);
  } catch (error) {
    if (error instanceof studentService.StudentError) {
      return c.json({ error: error.message }, error.statusCode as 400 | 404 | 500);
    }
    const message = error instanceof Error ? error.message : 'Failed to get student';
    return c.json({ error: message }, 500);
  }
});

/**
 * POST /students
 * Create student
 * Authorization: Principal only
 * 
 * SECURITY:
 * - Returns temporary password ONCE
 * - Client must save and display to user
 * - Password will not be retrievable after this response
 */
students.post(
  '/',
  requireAuth,
  zValidator('json', studentSchemas.createStudentSchema),
  async (c) => {
    try {
      const tenant = getTenant(c);
      const requestId = getRequestIdFromContext(c);
      
      // Authorization: Principal only
      requireRole(tenant, 'principal');
      
      const body = c.req.valid('json') as CreateStudentRequest;
      const result = await studentService.create(c.env.DB, tenant.schoolId, body);
      
      // Audit log (NEVER log temporary password)
      await logAudit(c.env.DB, tenant, 'created', 'student', result.profile_id, null, {
        profile_id: result.profile_id,
        user_id: result.user_id,
        login_id: result.login_id,
        student_code: result.employee_code, // employee_code field used for student_code
      });
      
      // SECURITY: Temporary password is returned in response
      // Client MUST save and display this to the user
      return c.json({ data: result }, 201);
    } catch (error) {
      if (error instanceof Error && error.message.includes('Insufficient role')) {
        return c.json({ error: 'Forbidden' }, 403);
      }
      if (error instanceof studentService.StudentError) {
        return c.json({ error: error.message }, error.statusCode as 400 | 404 | 500);
      }
      const message = error instanceof Error ? error.message : 'Failed to create student';
      return c.json({ error: message }, 500);
    }
  }
);

/**
 * POST /students/bulk-provision
 * Bulk create students
 * Authorization: Principal only
 * 
 * VALIDATION:
 * - Max 100 students per batch
 * - All-or-nothing validation
 * - Returns row-level errors if validation fails
 * 
 * SECURITY:
 * - Returns temporary passwords ONCE for all created accounts
 * - Client must save and display to users
 * - Passwords will not be retrievable after this response
 */
students.post(
  '/bulk-provision',
  requireAuth,
  zValidator('json', studentSchemas.bulkProvisionStudentsSchema),
  async (c) => {
    try {
      const tenant = getTenant(c);
      const requestId = getRequestIdFromContext(c);
      
      // Authorization: Principal only
      requireRole(tenant, 'principal');
      
      const body = c.req.valid('json') as { students: BulkStudentProvisionRequest[] };
      const result = await bulkProvisionService.bulkProvisionStudents(
        c.env.DB,
        tenant.schoolId,
        body.students
      );
      
      // Audit log (NEVER log temporary passwords)
      await logAudit(c.env.DB, tenant, 'bulk_created', 'student', null, null, {
        created_count: result.created_count,
        student_ids: result.accounts.map((a: AccountCreationResponse) => a.profile_id),
      });
      
      // SECURITY: Temporary passwords are returned in response
      // Client MUST save and display these to the users
      return c.json({ data: result }, 201);
    } catch (error) {
      if (error instanceof Error && error.message.includes('Insufficient role')) {
        return c.json({ error: 'Forbidden' }, 403);
      }
      if (error instanceof bulkProvisionService.BulkProvisionError) {
        return c.json(
          { 
            error: error.message,
            errors: error.rowErrors || [],
          },
          error.statusCode as 400 | 404 | 500
        );
      }
      const message = error instanceof Error ? error.message : 'Failed to bulk provision students';
      return c.json({ error: message }, 500);
    }
  }
);

/**
 * PATCH /students/:id
 * Update student
 * Authorization: Principal only
 */
students.patch(
  '/:id',
  requireAuth,
  zValidator('json', studentSchemas.updateStudentSchema),
  async (c) => {
    try {
      const tenant = getTenant(c);
      const requestId = getRequestIdFromContext(c);
      
      // Authorization: Principal only
      requireRole(tenant, 'principal');
      
      const id = c.req.param('id')!; // Route guarantees id exists
      
      // Get before state for audit
      const before = await studentService.getById(c.env.DB, id, tenant.schoolId);
      
      const body = c.req.valid('json') as UpdateStudentRequest;
      const after = await studentService.update(c.env.DB, id, tenant.schoolId, body);
      
      // Audit log
      await logAudit(c.env.DB, tenant, 'updated', 'student', id, before, after);
      
      return c.json({ data: after }, 200);
    } catch (error) {
      if (error instanceof Error && error.message.includes('Insufficient role')) {
        return c.json({ error: 'Forbidden' }, 403);
      }
      if (error instanceof studentService.StudentError) {
        return c.json({ error: error.message }, error.statusCode as 400 | 404 | 500);
      }
      const message = error instanceof Error ? error.message : 'Failed to update student';
      return c.json({ error: message }, 500);
    }
  }
);

/**
 * POST /students/:id/disable
 * Disable student account
 * Authorization: Principal only
 * 
 * SECURITY:
 * - Sets user status to disabled
 * - Revokes all sessions
 * - Increments token_version
 */
students.post('/:id/disable', requireAuth, async (c) => {
  try {
    const tenant = getTenant(c);
    const requestId = getRequestIdFromContext(c);
    
    // Authorization: Principal only
    requireRole(tenant, 'principal');
    
    const id = c.req.param('id')!; // Route guarantees id exists
    
    // Get before state for audit
    const before = await studentService.getById(c.env.DB, id, tenant.schoolId);
    
    const after = await studentService.disable(c.env.DB, id, tenant.schoolId);
    
    // Audit log
    await logAudit(c.env.DB, tenant, 'disabled', 'student', id, before, after);
    
    return c.json({ data: after }, 200);
  } catch (error) {
    if (error instanceof Error && error.message.includes('Insufficient role')) {
      return c.json({ error: 'Forbidden' }, 403);
    }
    if (error instanceof studentService.StudentError) {
      return c.json({ error: error.message }, error.statusCode as 400 | 404 | 500);
    }
    const message = error instanceof Error ? error.message : 'Failed to disable student';
    return c.json({ error: message }, 500);
  }
});

/**
 * POST /students/:id/reactivate
 * Reactivate student account
 * Authorization: Principal only
 * 
 * SECURITY:
 * - Sets user status to active
 * - Sets must_change_password = true
 */
students.post('/:id/reactivate', requireAuth, async (c) => {
  try {
    const tenant = getTenant(c);
    const requestId = getRequestIdFromContext(c);
    
    // Authorization: Principal only
    requireRole(tenant, 'principal');
    
    const id = c.req.param('id')!; // Route guarantees id exists
    
    // Get before state for audit
    const before = await studentService.getById(c.env.DB, id, tenant.schoolId);
    
    const after = await studentService.reactivate(c.env.DB, id, tenant.schoolId);
    
    // Audit log
    await logAudit(c.env.DB, tenant, 'reactivated', 'student', id, before, after);
    
    return c.json({ data: after }, 200);
  } catch (error) {
    if (error instanceof Error && error.message.includes('Insufficient role')) {
      return c.json({ error: 'Forbidden' }, 403);
    }
    if (error instanceof studentService.StudentError) {
      return c.json({ error: error.message }, error.statusCode as 400 | 404 | 500);
    }
    const message = error instanceof Error ? error.message : 'Failed to reactivate student';
    return c.json({ error: message }, 500);
  }
});

/**
 * POST /students/:id/reset-password
 * Reset student password
 * Authorization: Principal only
 * 
 * SECURITY:
 * - Generates new temporary password
 * - Returns password ONCE
 * - Revokes all sessions
 * - Increments token_version
 * - Sets must_change_password = true
 */
students.post('/:id/reset-password', requireAuth, async (c) => {
  try {
    const tenant = getTenant(c);
    const requestId = getRequestIdFromContext(c);
    
    // Authorization: Principal only
    requireRole(tenant, 'principal');
    
    const id = c.req.param('id')!; // Route guarantees id exists
    
    const result = await studentService.resetPassword(c.env.DB, id, tenant.schoolId);
    
    // Audit log (NEVER log temporary password)
    await logAudit(c.env.DB, tenant, 'reset_password', 'student', id, null, {
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
    if (error instanceof studentService.StudentError) {
      return c.json({ error: error.message }, error.statusCode as 400 | 404 | 500);
    }
    const message = error instanceof Error ? error.message : 'Failed to reset password';
    return c.json({ error: message }, 500);
  }
});

/**
 * GET /students/:id/enrollments
 * Get enrollments for a student
 * Authorization: Principal can view all, student can view own
 * 
 * NOTE: This is a placeholder for future implementation
 * Requires enrollments to be implemented first
 */
students.get('/:id/enrollments', requireAuth, async (c) => {
  try {
    const tenant = getTenant(c);
    const id = c.req.param('id')!; // Route guarantees id exists
    
    // Fetch student to verify existence (tenant-scoped)
    const result = await studentService.getByIdWithUser(c.env.DB, id, tenant.schoolId);
    
    // Authorization check: Principal can view all, student can view own
    if (tenant.role === 'principal') {
      // Principal can view all
    } else if (tenant.role === 'student') {
      // Student can only view their own enrollments
      if (result.user.id !== tenant.userId) {
        return c.json({ error: 'Forbidden' }, 403);
      }
    } else {
      // Teachers and others cannot view student enrollments directly
      // (Teachers can view through their classroom/teaching assignments)
      return c.json({ error: 'Forbidden' }, 403);
    }
    
    // TODO: Implement enrollments query
    return c.json({ data: [] }, 200);
  } catch (error) {
    if (error instanceof studentService.StudentError) {
      return c.json({ error: error.message }, error.statusCode as 400 | 404 | 500);
    }
    const message = error instanceof Error ? error.message : 'Failed to get enrollments';
    return c.json({ error: message }, 500);
  }
});

export default students;
