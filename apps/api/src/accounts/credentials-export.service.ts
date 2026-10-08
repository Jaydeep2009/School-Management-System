/**
 * Credentials Export Service
 * 
 * Exports student/teacher credentials for bulk distribution
 * NOTE: Temporary passwords can only be exported at creation time or after regeneration
 */

import type { PrincipalContext } from '../auth/auth.types';
import type { AccountCreationResponse } from './accounts.types';

/**
 * Convert account creation responses to CSV format
 * This should be called immediately after bulk creation
 * 
 * @param accounts - Array of account creation responses with temporary passwords
 * @param role - 'student' or 'teacher'
 * @returns CSV string with credentials
 */
export function convertAccountsToCSV(
  accounts: AccountCreationResponse[],
  role: 'student' | 'teacher'
): string {
  if (accounts.length === 0) {
    throw new Error('No accounts provided for export');
  }

  const headers = [
    'Login ID',
    'Temporary Password',
    role === 'student' ? 'Student Code' : 'Employee Code',
    'Status',
    'Note'
  ];

  const rows = accounts.map((account) => {
    return [
      account.login_id,
      account.temporary_password,
      account.employee_code || 'N/A',
      'Pending Activation',
      'Must change password on first login'
    ];
  });

  // Convert to CSV with proper escaping
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')),
  ].join('\n');

  return csvContent;
}

/**
 * Export student list WITHOUT passwords (for reference)
 * This is safe to export anytime and doesn't expose credentials
 */
export async function exportStudentList(
  db: D1Database,
  schoolId: string,
  tenant: PrincipalContext
): Promise<string> {
  // Security: Ensure principal is from the same school
  if (tenant.schoolId !== schoolId) {
    throw new Error('Unauthorized access to school data');
  }

  // Query all students
  const students = await db
    .prepare(
      `SELECT 
        u.login_id,
        sp.first_name,
        sp.middle_name,
        sp.last_name,
        sp.admission_number,
        sp.student_code,
        u.status,
        CASE 
          WHEN u.password_hash IS NOT NULL THEN 'Activated'
          WHEN u.activation_hash IS NOT NULL THEN 'Pending'
          ELSE 'Unknown'
        END as activation_status
      FROM users u
      INNER JOIN student_profiles sp ON u.id = sp.user_id
      WHERE u.school_id = ?
        AND u.role = 'student'
      ORDER BY sp.student_code`
    )
    .bind(schoolId)
    .all<{
      login_id: string;
      first_name: string;
      middle_name: string | null;
      last_name: string;
      admission_number: string;
      student_code: string;
      status: string;
      activation_status: string;
    }>();

  if (!students.results || students.results.length === 0) {
    throw new Error('No students found');
  }

  // Generate CSV
  const headers = ['Login ID', 'Student Name', 'Admission Number', 'Student Code', 'Account Status', 'Activation Status'];
  const rows = students.results.map((student) => {
    const fullName = [student.first_name, student.middle_name, student.last_name]
      .filter(Boolean)
      .join(' ');
    
    return [
      student.login_id,
      fullName,
      student.admission_number,
      student.student_code,
      student.status,
      student.activation_status,
    ];
  });

  // Convert to CSV
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')),
  ].join('\n');

  return csvContent;
}

/**
 * Export teacher list WITHOUT passwords (for reference)
 * This is safe to export anytime and doesn't expose credentials
 */
export async function exportTeacherList(
  db: D1Database,
  schoolId: string,
  tenant: PrincipalContext
): Promise<string> {
  // Security: Ensure principal is from the same school
  if (tenant.schoolId !== schoolId) {
    throw new Error('Unauthorized access to school data');
  }

  // Query all teachers
  const teachers = await db
    .prepare(
      `SELECT 
        u.login_id,
        tp.first_name,
        tp.middle_name,
        tp.last_name,
        tp.employee_code,
        u.status,
        CASE 
          WHEN u.password_hash IS NOT NULL THEN 'Activated'
          WHEN u.activation_hash IS NOT NULL THEN 'Pending'
          ELSE 'Unknown'
        END as activation_status
      FROM users u
      INNER JOIN teacher_profiles tp ON u.id = tp.user_id
      WHERE u.school_id = ?
        AND u.role = 'teacher'
      ORDER BY tp.employee_code`
    )
    .bind(schoolId)
    .all<{
      login_id: string;
      first_name: string;
      middle_name: string | null;
      last_name: string;
      employee_code: string | null;
      status: string;
      activation_status: string;
    }>();

  if (!teachers.results || teachers.results.length === 0) {
    throw new Error('No teachers found');
  }

  // Generate CSV
  const headers = ['Login ID', 'Teacher Name', 'Employee Code', 'Account Status', 'Activation Status'];
  const rows = teachers.results.map((teacher) => {
    const fullName = [teacher.first_name, teacher.middle_name, teacher.last_name]
      .filter(Boolean)
      .join(' ');
    
    return [
      teacher.login_id,
      fullName,
      teacher.employee_code || 'N/A',
      teacher.status,
      teacher.activation_status,
    ];
  });

  // Convert to CSV
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')),
  ].join('\n');

  return csvContent;
}
