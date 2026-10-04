/**
 * Academic Year Export Service
 * Export academic year data to Excel for backup
 */

import type { D1Database } from '@cloudflare/workers-types';
import type { TenantContext } from '../auth/tenant.context';

/**
 * Export academic year data to Excel format
 * Returns data structure that can be converted to Excel by frontend
 */
export async function exportAcademicYearData(
  db: D1Database,
  academicYearId: string,
  tenant: TenantContext
) {
  // Get students with enrollment info
  const students = await db
    .prepare(
      `SELECT 
         s.id as student_id,
         sp.first_name,
         sp.last_name,
         sp.date_of_birth,
         sp.gender,
         sp.email,
         sp.phone,
         sp.address,
         sp.city,
         sp.state,
         sp.postal_code,
         sp.guardian_name,
         sp.guardian_phone,
         sp.guardian_email,
         sp.guardian_relation,
         e.id as enrollment_id,
         e.roll_number,
         e.status as enrollment_status,
         e.enrollment_date,
         c.grade,
         c.division,
         c.stream,
         ay.year_label as academic_year
       FROM enrollments e
       JOIN student_profiles sp ON e.student_id = sp.user_id
       JOIN classrooms c ON e.classroom_id = c.id
       JOIN academic_years ay ON e.academic_year_id = ay.id
       WHERE e.academic_year_id = ? 
         AND e.school_id = ?
       ORDER BY c.grade, c.division, e.roll_number`
    )
    .bind(academicYearId, tenant.schoolId)
    .all();

  // Get marks for all students
  const marks = await db
    .prepare(
      `SELECT 
         e.student_id,
         sp.first_name || ' ' || sp.last_name as student_name,
         e.roll_number,
         c.grade,
         c.division,
         s.name as subject,
         a.name as assessment,
         a.assessment_type,
         m.marks_obtained,
         m.total_marks,
         m.grade as mark_grade,
         m.remarks
       FROM marks m
       JOIN enrollments e ON m.enrollment_id = e.id
       JOIN student_profiles sp ON e.student_id = sp.user_id
       JOIN classrooms c ON e.classroom_id = c.id
       JOIN subjects s ON m.subject_id = s.id
       JOIN assessments a ON m.assessment_id = a.id
       WHERE e.academic_year_id = ? 
         AND e.school_id = ?
       ORDER BY c.grade, c.division, e.roll_number, s.name, a.name`
    )
    .bind(academicYearId, tenant.schoolId)
    .all();

  // Get attendance summary
  const attendance = await db
    .prepare(
      `SELECT 
         e.student_id,
         sp.first_name || ' ' || sp.last_name as student_name,
         e.roll_number,
         c.grade,
         c.division,
         COUNT(CASE WHEN ar.status = 'present' THEN 1 END) as present_count,
         COUNT(CASE WHEN ar.status = 'absent' THEN 1 END) as absent_count,
         COUNT(CASE WHEN ar.status = 'late' THEN 1 END) as late_count,
         COUNT(*) as total_days,
         ROUND(COUNT(CASE WHEN ar.status = 'present' THEN 1 END) * 100.0 / COUNT(*), 2) as attendance_percentage
       FROM attendance_records ar
       JOIN attendance_sessions ase ON ar.session_id = ase.id
       JOIN enrollments e ON ar.enrollment_id = e.id
       JOIN student_profiles sp ON e.student_id = sp.user_id
       JOIN classrooms c ON e.classroom_id = c.id
       WHERE ase.academic_year_id = ? 
         AND e.school_id = ?
       GROUP BY e.student_id, sp.first_name, sp.last_name, e.roll_number, c.grade, c.division
       ORDER BY c.grade, c.division, e.roll_number`
    )
    .bind(academicYearId, tenant.schoolId)
    .all();

  // Get fee summary
  const fees = await db
    .prepare(
      `SELECT 
         e.student_id,
         sp.first_name || ' ' || sp.last_name as student_name,
         e.roll_number,
         c.grade,
         c.division,
         fc.category_name,
         fch.amount as charged_amount,
         COALESCE(SUM(fp.amount), 0) as paid_amount,
         fch.amount - COALESCE(SUM(fp.amount), 0) as balance,
         fch.due_date
       FROM fee_charges fch
       JOIN enrollments e ON fch.enrollment_id = e.id
       JOIN student_profiles sp ON e.student_id = sp.user_id
       JOIN classrooms c ON e.classroom_id = c.id
       JOIN fee_categories fc ON fch.category_id = fc.id
       LEFT JOIN fee_payments fp ON fch.id = fp.charge_id
       WHERE fch.academic_year_id = ? 
         AND e.school_id = ?
       GROUP BY e.student_id, sp.first_name, sp.last_name, e.roll_number, 
                c.grade, c.division, fc.category_name, fch.amount, fch.due_date
       ORDER BY c.grade, c.division, e.roll_number, fc.category_name`
    )
    .bind(academicYearId, tenant.schoolId)
    .all();

  return {
    students: students.results || [],
    marks: marks.results || [],
    attendance: attendance.results || [],
    fees: fees.results || [],
  };
}
