/**
 * Student /me Routes
 * 
 * All routes read student ID from JWT only - never from URL params
 * Students have read-only access to their own data
 * 
 * GET /students/me - Get current student's profile
 * GET /students/me/attendance - Get attendance summary
 * GET /students/me/marks - Get published marks
 * GET /students/me/assignments - Get assignments for student's class
 * GET /students/me/fees - Get fee summary and receipts
 * POST /students/me/change-password - Change password
 */

import { Hono } from 'hono';
import { requireAuth, requireSchoolTenant, type AuthContext } from '../auth/auth.middleware';
import { hashPassword, verifyPassword } from '../auth/password.service';
import { z } from 'zod';

const studentMe = new Hono<AuthContext>();

/**
 * GET /students/me
 * Get current student's profile
 * Authorization: Student only (reads from JWT)
 */
studentMe.get('/', requireAuth, async (c) => {
  try {
    const tenant = requireSchoolTenant(c);
    
    // Only students can access this endpoint
    if (tenant.role !== 'student') {
      return c.json({ error: 'Forbidden' }, 403);
    }

    const db = c.env.DB;
    
    // Get student profile with enrollment info
    const student = await db
      .prepare(`
        SELECT 
          sp.user_id,
          sp.student_code,
          sp.admission_number,
          sp.first_name,
          sp.middle_name,
          sp.last_name,
          (sp.first_name || ' ' || COALESCE(sp.middle_name || ' ', '') || sp.last_name) as full_name,
          sp.gender,
          sp.date_of_birth,
          sp.phone,
          sp.email,
          sp.address,
          sp.parent_name,
          sp.parent_phone,
          sp.parent_email,
          sp.status,
          e.id as enrollment_id,
          e.classroom_id,
          e.academic_year_id,
          e.roll_number,
          c.classroom_code,
          c.grade_name,
          c.division_name,
          ay.label as academic_year,
          sch.name as school_name
        FROM student_profiles sp
        LEFT JOIN schools sch ON sp.school_id = sch.id
        LEFT JOIN enrollments e ON sp.user_id = e.student_id AND e.status = 'active'
        LEFT JOIN classrooms c ON e.classroom_id = c.id
        LEFT JOIN academic_years ay ON e.academic_year_id = ay.id
        WHERE sp.user_id = ? AND sp.school_id = ?
        LIMIT 1
      `)
      .bind(tenant.userId, tenant.schoolId)
      .first();

    if (!student) {
      return c.json({ error: 'Student profile not found' }, 404);
    }

    return c.json({ data: student }, 200);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get student profile';
    return c.json({ error: message }, 500);
  }
});

/**
 * GET /students/me/attendance
 * Get attendance summary for current student
 * Authorization: Student only
 */
studentMe.get('/attendance', requireAuth, async (c) => {
  try {
    const tenant = requireSchoolTenant(c);
    
    if (tenant.role !== 'student') {
      return c.json({ error: 'Forbidden' }, 403);
    }

    const db = c.env.DB;
    
    // Get current enrollment
    const enrollment = await db
      .prepare(`
        SELECT e.id, e.academic_year_id, e.classroom_id
        FROM enrollments e
        WHERE e.student_id = ? AND e.school_id = ? AND e.status = 'active'
        LIMIT 1
      `)
      .bind(tenant.userId, tenant.schoolId)
      .first<{ id: string; academic_year_id: string; classroom_id: string }>();

    if (!enrollment) {
      return c.json({ error: 'No active enrollment found' }, 404);
    }

    // Get overall attendance (total present / total sessions)
    const overall = await db
      .prepare(`
        SELECT 
          COUNT(*) as total_sessions,
          SUM(CASE WHEN ae.status = 'present' THEN 1 ELSE 0 END) as present_count,
          SUM(CASE WHEN ae.status = 'absent' THEN 1 ELSE 0 END) as absent_count,
          SUM(CASE WHEN ae.status = 'late' THEN 1 ELSE 0 END) as late_count,
          SUM(CASE WHEN ae.status = 'excused' THEN 1 ELSE 0 END) as excused_count
        FROM attendance_sessions asess
        INNER JOIN attendance_entries ae ON asess.id = ae.session_id
        WHERE ae.student_id = ?
          AND asess.school_id = ?
          AND asess.academic_year_id = ?
      `)
      .bind(tenant.userId, tenant.schoolId, enrollment.academic_year_id)
      .first<{
        total_sessions: number;
        present_count: number;
        absent_count: number;
        late_count: number;
        excused_count: number;
      }>();

    // Get per-subject breakdown
    const subjects = await db
      .prepare(`
        SELECT 
          s.id as subject_id,
          s.name as subject_name,
          s.code as subject_code,
          COUNT(*) as total_sessions,
          SUM(CASE WHEN ae.status = 'present' THEN 1 ELSE 0 END) as present_count,
          SUM(CASE WHEN ae.status = 'absent' THEN 1 ELSE 0 END) as absent_count,
          SUM(CASE WHEN ae.status = 'late' THEN 1 ELSE 0 END) as late_count,
          SUM(CASE WHEN ae.status = 'excused' THEN 1 ELSE 0 END) as excused_count
        FROM attendance_sessions asess
        INNER JOIN attendance_entries ae ON asess.id = ae.session_id
        INNER JOIN subjects s ON asess.subject_id = s.id
        WHERE ae.student_id = ?
          AND asess.school_id = ?
          AND asess.academic_year_id = ?
        GROUP BY s.id, s.name, s.code
        ORDER BY s.name
      `)
      .bind(tenant.userId, tenant.schoolId, enrollment.academic_year_id)
      .all();

    const percentage = overall && overall.total_sessions > 0
      ? Math.round((overall.present_count / overall.total_sessions) * 100)
      : 0;

    const subjectsWithPercentage = (subjects.results || []).map((sub: any) => ({
      ...sub,
      percentage: sub.total_sessions > 0
        ? Math.round((sub.present_count / sub.total_sessions) * 100)
        : 0
    }));

    return c.json({
      data: {
        overall: {
          ...overall,
          percentage
        },
        subjects: subjectsWithPercentage
      }
    }, 200);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get attendance';
    return c.json({ error: message }, 500);
  }
});

/**
 * GET /students/me/marks
 * Get published marks for current student
 * Authorization: Student only
 */
studentMe.get('/marks', requireAuth, async (c) => {
  try {
    const tenant = requireSchoolTenant(c);
    
    if (tenant.role !== 'student') {
      return c.json({ error: 'Forbidden' }, 403);
    }

    const db = c.env.DB;
    
    // Get current enrollment
    const enrollment = await db
      .prepare(`
        SELECT e.id, e.academic_year_id, e.classroom_id
        FROM enrollments e
        WHERE e.student_id = ? AND e.school_id = ? AND e.status = 'active'
        LIMIT 1
      `)
      .bind(tenant.userId, tenant.schoolId)
      .first<{ id: string; academic_year_id: string; classroom_id: string }>();

    if (!enrollment) {
      return c.json({ error: 'No active enrollment found' }, 404);
    }

    // Get published marks grouped by subject
    const marks = await db
      .prepare(`
        SELECT 
          s.id as subject_id,
          s.name as subject_name,
          s.code as subject_code,
          a.id as assessment_id,
          a.name as assessment_name,
          a.assessment_type,
          a.max_marks,
          a.conducted_on,
          m.marks_obtained,
          m.remarks
        FROM assessments a
        INNER JOIN subjects s ON a.subject_id = s.id
        LEFT JOIN marks m ON a.id = m.assessment_id AND m.student_id = ?
        WHERE a.school_id = ?
          AND a.academic_year_id = ?
          AND a.classroom_id = ?
          AND a.is_published = 1
        ORDER BY s.name, a.conducted_on DESC
      `)
      .bind(tenant.userId, tenant.schoolId, enrollment.academic_year_id, enrollment.classroom_id)
      .all();

    // Group by subject and calculate aggregates
    const bySubject: Record<string, any> = {};
    
    (marks.results || []).forEach((mark: any) => {
      if (!bySubject[mark.subject_id]) {
        bySubject[mark.subject_id] = {
          subject_id: mark.subject_id,
          subject_name: mark.subject_name,
          subject_code: mark.subject_code,
          assessments: [],
          total_obtained: 0,
          total_max: 0
        };
      }
      
      bySubject[mark.subject_id].assessments.push({
        assessment_id: mark.assessment_id,
        assessment_name: mark.assessment_name,
        assessment_type: mark.assessment_type,
        max_marks: mark.max_marks,
        conducted_on: mark.conducted_on,
        marks_obtained: mark.marks_obtained,
        remarks: mark.remarks
      });

      if (mark.marks_obtained !== null) {
        bySubject[mark.subject_id].total_obtained += mark.marks_obtained;
        bySubject[mark.subject_id].total_max += mark.max_marks;
      }
    });

    const subjects = Object.values(bySubject).map((sub: any) => ({
      ...sub,
      percentage: sub.total_max > 0
        ? Math.round((sub.total_obtained / sub.total_max) * 100)
        : 0
    }));

    return c.json({ data: subjects }, 200);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get marks';
    return c.json({ error: message }, 500);
  }
});

/**
 * GET /students/me/assignments
 * Get assignments for current student's classroom
 * Authorization: Student only
 */
studentMe.get('/assignments', requireAuth, async (c) => {
  try {
    const tenant = requireSchoolTenant(c);
    
    if (tenant.role !== 'student') {
      return c.json({ error: 'Forbidden' }, 403);
    }

    const db = c.env.DB;
    const subjectId = c.req.query('subject_id');
    
    // Get current enrollment
    const enrollment = await db
      .prepare(`
        SELECT e.id, e.academic_year_id, e.classroom_id
        FROM enrollments e
        WHERE e.student_id = ? AND e.school_id = ? AND e.status = 'active'
        LIMIT 1
      `)
      .bind(tenant.userId, tenant.schoolId)
      .first<{ id: string; academic_year_id: string; classroom_id: string }>();

    if (!enrollment) {
      return c.json({ error: 'No active enrollment found' }, 404);
    }

    // Build query
    let query = `
      SELECT 
        a.id,
        a.title,
        a.description,
        a.subject_id,
        s.name as subject_name,
        s.code as subject_code,
        a.assigned_on,
        a.due_date,
        a.attachment_url,
        a.attachment_name
      FROM assignments a
      INNER JOIN subjects s ON a.subject_id = s.id
      WHERE a.school_id = ?
        AND a.academic_year_id = ?
        AND a.classroom_id = ?
    `;

    const bindings: any[] = [tenant.schoolId, enrollment.academic_year_id, enrollment.classroom_id];

    if (subjectId) {
      query += ' AND a.subject_id = ?';
      bindings.push(subjectId);
    }

    query += ' ORDER BY a.due_date ASC, a.assigned_on DESC';

    const assignments = await db
      .prepare(query)
      .bind(...bindings)
      .all();

    return c.json({ data: assignments.results || [] }, 200);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get assignments';
    return c.json({ error: message }, 500);
  }
});

/**
 * GET /students/me/fees
 * Get fee summary and receipts for current student
 * Authorization: Student only
 */
studentMe.get('/fees', requireAuth, async (c) => {
  try {
    const tenant = requireSchoolTenant(c);
    
    if (tenant.role !== 'student') {
      return c.json({ error: 'Forbidden' }, 403);
    }

    const db = c.env.DB;
    
    // Get current enrollment
    const enrollment = await db
      .prepare(`
        SELECT e.id, e.academic_year_id
        FROM enrollments e
        WHERE e.student_id = ? AND e.school_id = ? AND e.status = 'active'
        LIMIT 1
      `)
      .bind(tenant.userId, tenant.schoolId)
      .first<{ id: string; academic_year_id: string }>();

    if (!enrollment) {
      return c.json({ error: 'No active enrollment found' }, 404);
    }

    // Get total charged (sum of all fee charges for this academic year)
    const charges = await db
      .prepare(`
        SELECT COALESCE(SUM(amount), 0) as total_charged
        FROM fee_charges
        WHERE student_id = ?
          AND school_id = ?
          AND academic_year_id = ?
      `)
      .bind(tenant.userId, tenant.schoolId, enrollment.academic_year_id)
      .first<{ total_charged: number }>();

    // Get total paid (sum of all non-voided payments)
    const payments = await db
      .prepare(`
        SELECT COALESCE(SUM(amount), 0) as total_paid
        FROM fee_payments
        WHERE student_id = ?
          AND school_id = ?
          AND academic_year_id = ?
          AND status != 'voided'
      `)
      .bind(tenant.userId, tenant.schoolId, enrollment.academic_year_id)
      .first<{ total_paid: number }>();

    // Get receipts (payment records)
    const receipts = await db
      .prepare(`
        SELECT 
          id,
          receipt_number,
          amount,
          payment_date,
          payment_method,
          transaction_id,
          remarks,
          status,
          created_at
        FROM fee_payments
        WHERE student_id = ?
          AND school_id = ?
          AND academic_year_id = ?
        ORDER BY payment_date DESC, created_at DESC
      `)
      .bind(tenant.userId, tenant.schoolId, enrollment.academic_year_id)
      .all();

    const totalCharged = charges?.total_charged || 0;
    const totalPaid = payments?.total_paid || 0;
    const balance = totalCharged - totalPaid;

    return c.json({
      data: {
        total_charged: totalCharged,
        total_paid: totalPaid,
        balance: balance,
        receipts: receipts.results || []
      }
    }, 200);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get fees';
    return c.json({ error: message }, 500);
  }
});

/**
 * POST /students/me/change-password
 * Change password for current student
 * Authorization: Student only
 */
studentMe.post('/change-password', requireAuth, async (c) => {
  try {
    const tenant = requireSchoolTenant(c);
    
    if (tenant.role !== 'student') {
      return c.json({ error: 'Forbidden' }, 403);
    }

    const body = await c.req.json();
    const schema = z.object({
      current_password: z.string().min(1),
      new_password: z.string().min(8)
    });

    const validated = schema.parse(body);
    const db = c.env.DB;

    // Get current user
    const user = await db
      .prepare('SELECT id, password_hash FROM users WHERE id = ? AND school_id = ?')
      .bind(tenant.userId, tenant.schoolId)
      .first<{ id: string; password_hash: string | null }>();

    if (!user) {
      return c.json({ error: 'User not found' }, 404);
    }

    // Verify current password
    if (!user.password_hash) {
      return c.json({ error: 'Password not set' }, 400);
    }

    const isValid = await verifyPassword(validated.current_password, user.password_hash);
    if (!isValid) {
      return c.json({ error: 'Current password is incorrect' }, 401);
    }

    // Hash new password
    const newHash = await hashPassword(validated.new_password);

    // Update password and clear must_change_password flag
    await db
      .prepare(`
        UPDATE users 
        SET password_hash = ?, must_change_password = 0, updated_at = ?
        WHERE id = ? AND school_id = ?
      `)
      .bind(newHash, new Date().toISOString(), tenant.userId, tenant.schoolId)
      .run();

    return c.json({ message: 'Password changed successfully' }, 200);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json({ error: 'Validation error', details: error.errors }, 400);
    }
    const message = error instanceof Error ? error.message : 'Failed to change password';
    return c.json({ error: message }, 500);
  }
});

export default studentMe;
