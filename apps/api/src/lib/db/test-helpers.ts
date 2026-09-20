/**
 * Database test helpers
 */

import { ulid } from 'ulidx';

export function createTestSchool() {
  const now = Date.now();
  return {
    id: ulid(),
    code: 'TEST',
    name: 'Test School',
    timezone: 'Asia/Kolkata',
    status: 'active',
    settings: '{}',
    created_at: now,
    updated_at: now,
  };
}

export function createTestUser(schoolId: string, role: 'principal' | 'teacher' | 'student', sequence = 1) {
  const now = Date.now();
  const rolePrefix = role === 'principal' ? 'P' : role === 'teacher' ? 'T' : 'S';
  const loginId = `TEST-${rolePrefix}-${String(sequence).padStart(6, '0')}`;

  return {
    id: ulid(),
    school_id: schoolId,
    login_id: loginId,
    role,
    password_hash: 'hash',
    status: 'active',
    token_version: 0,
    must_change_password: 0,
    created_at: now,
    updated_at: now,
  };
}

export function createTestAcademicYear(schoolId: string, status: 'upcoming' | 'current' | 'closed' = 'current') {
  const now = Date.now();
  return {
    id: ulid(),
    school_id: schoolId,
    label: status === 'current' ? '2024-25' : status === 'upcoming' ? '2025-26' : '2023-24',
    starts_on: status === 'current' ? '2024-04-01' : status === 'upcoming' ? '2025-04-01' : '2023-04-01',
    ends_on: status === 'current' ? '2025-03-31' : status === 'upcoming' ? '2026-03-31' : '2024-03-31',
    status,
    created_at: now,
    updated_at: now,
  };
}

export function createTestClassroom(schoolId: string, academicYearId: string, gradeLevel = 1) {
  const now = Date.now();
  return {
    id: ulid(),
    school_id: schoolId,
    academic_year_id: academicYearId,
    classroom_code: `G${gradeLevel}A`,
    grade_name: `Grade ${gradeLevel}`,
    division_name: 'A',
    grade_level: gradeLevel,
    status: 'active',
    created_at: now,
    updated_at: now,
  };
}

export function createTestStudent(schoolId: string, sequence = 1) {
  const userId = ulid();
  const now = Date.now();
  
  const user = {
    id: userId,
    school_id: schoolId,
    login_id: `TEST-S-${String(sequence).padStart(6, '0')}`,
    role: 'student' as const,
    password_hash: 'hash',
    status: 'active',
    token_version: 0,
    must_change_password: 0,
    created_at: now,
    updated_at: now,
  };

  const profile = {
    user_id: userId,
    school_id: schoolId,
    student_code: `S${String(sequence).padStart(6, '0')}`,
    admission_number: `ADM${String(sequence).padStart(6, '0')}`,
    first_name: `Student${sequence}`,
    last_name: 'Test',
    status: 'active',
    created_at: now,
    updated_at: now,
  };

  return { user, profile };
}

export function createTestEnrollment(
  schoolId: string,
  academicYearId: string,
  classroomId: string,
  studentId: string,
  status: 'planned' | 'active' | 'completed' | 'left' | 'transferred' = 'active'
) {
  const now = Date.now();
  return {
    id: ulid(),
    school_id: schoolId,
    academic_year_id: academicYearId,
    classroom_id: classroomId,
    student_id: studentId,
    roll_number: 1,
    joined_on: '2024-04-01',
    left_on: status === 'active' || status === 'planned' ? null : '2025-03-31',
    status,
    created_at: now,
    updated_at: now,
  };
}

export function createTestSubject(schoolId: string, code: string, name: string) {
  const now = Date.now();
  return {
    id: ulid(),
    school_id: schoolId,
    subject_code: code,
    name,
    status: 'active',
    created_at: now,
    updated_at: now,
  };
}

export function createTestTeachingAssignment(schoolId: string, classroomId: string, subjectId: string) {
  const now = Date.now();
  return {
    id: ulid(),
    school_id: schoolId,
    classroom_id: classroomId,
    subject_id: subjectId,
    created_at: now,
    updated_at: now,
  };
}
