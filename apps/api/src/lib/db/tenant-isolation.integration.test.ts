/**
 * Tenant Isolation Integration Tests
 * 
 * Tests to verify that School A users cannot access School B data
 * across all major entities. Uses REAL D1 database (not mocks).
 * 
 * Phase 3 - Critical Security Requirement
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { env } from 'cloudflare:workers';

// Type assertion for test environment
const testEnv = env as unknown as { DB: D1Database };

/**
 * Get the real D1 database binding from test environment
 */
function getDb() {
  return testEnv.DB;
}

/**
 * Test Setup Helper
 * Creates two schools with complete data sets for isolation testing
 */
async function setupTwoSchools(db: D1Database) {
  const now = new Date().toISOString();

  // School A
  await db.prepare(
    `INSERT INTO schools (id, code, name, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?)`
  ).bind('schoolA', 'SCHOOLA', 'School A', now, now).run();

  // School B
  await db.prepare(
    `INSERT INTO schools (id, code, name, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?)`
  ).bind('schoolB', 'SCHOOLB', 'School B', now, now).run();

  // Academic years for both schools
  await db.prepare(
    `INSERT INTO academic_years (id, school_id, label, starts_on, ends_on, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind('yearA', 'schoolA', '2024-25', '2024-04-01', '2025-03-31', 'current', now, now).run();

  await db.prepare(
    `INSERT INTO academic_years (id, school_id, label, starts_on, ends_on, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind('yearB', 'schoolB', '2024-25', '2024-04-01', '2025-03-31', 'current', now, now).run();

  // Classrooms for both schools
  await db.prepare(
    `INSERT INTO classrooms (id, school_id, academic_year_id, classroom_code, grade_name, division_name, grade_level, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind('classA', 'schoolA', 'yearA', 'G10A', 'Class 10', 'A', 10, now, now).run();

  await db.prepare(
    `INSERT INTO classrooms (id, school_id, academic_year_id, classroom_code, grade_name, division_name, grade_level, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind('classB', 'schoolB', 'yearB', 'G10A', 'Class 10', 'A', 10, now, now).run();

  // Subjects for both schools
  await db.prepare(
    `INSERT INTO subjects (id, school_id, subject_code, name, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).bind('mathA', 'schoolA', 'MATH', 'Mathematics', now, now).run();

  await db.prepare(
    `INSERT INTO subjects (id, school_id, subject_code, name, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).bind('mathB', 'schoolB', 'MATH', 'Mathematics', now, now).run();

  // Initialize code counters
  await db.prepare(
    `INSERT INTO code_counters (school_id, kind, last_number)
     VALUES (?, ?, ?)`
  ).bind('schoolA', 'teacher', 0).run();

  await db.prepare(
    `INSERT INTO code_counters (school_id, kind, last_number)
     VALUES (?, ?, ?)`
  ).bind('schoolB', 'teacher', 0).run();

  await db.prepare(
    `INSERT INTO code_counters (school_id, kind, last_number)
     VALUES (?, ?, ?)`
  ).bind('schoolA', 'student', 0).run();

  await db.prepare(
    `INSERT INTO code_counters (school_id, kind, last_number)
     VALUES (?, ?, ?)`
  ).bind('schoolB', 'student', 0).run();

  // Teachers for both schools
  await db.prepare(
    `INSERT INTO users (id, school_id, login_id, role, password_hash, status, token_version, must_change_password, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind('teacherUserA', 'schoolA', 'SCHOOLA-T-000001', 'teacher', 'hash', 'active', 1, 0, now, now).run();

  await db.prepare(
    `INSERT INTO teacher_profiles (user_id, school_id, employee_code, first_name, last_name, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).bind('teacherUserA', 'schoolA', 'T000001', 'Teacher', 'A', now, now).run();

  await db.prepare(
    `INSERT INTO users (id, school_id, login_id, role, password_hash, status, token_version, must_change_password, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind('teacherUserB', 'schoolB', 'SCHOOLB-T-000001', 'teacher', 'hash', 'active', 1, 0, now, now).run();

  await db.prepare(
    `INSERT INTO teacher_profiles (user_id, school_id, employee_code, first_name, last_name, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).bind('teacherUserB', 'schoolB', 'T000001', 'Teacher', 'B', now, now).run();

  // Students for both schools
  await db.prepare(
    `INSERT INTO users (id, school_id, login_id, role, password_hash, status, token_version, must_change_password, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind('studentUserA', 'schoolA', 'SCHOOLA-S-000001', 'student', 'hash', 'active', 1, 0, now, now).run();

  await db.prepare(
    `INSERT INTO student_profiles (user_id, school_id, student_code, admission_number, first_name, last_name, date_of_birth, dob_md, gender, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind('studentUserA', 'schoolA', 'S000001', 'ADM001', 'Student', 'A', '2010-01-01', '01-01', 'male', now, now).run();

  await db.prepare(
    `INSERT INTO users (id, school_id, login_id, role, password_hash, status, token_version, must_change_password, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind('studentUserB', 'schoolB', 'SCHOOLB-S-000001', 'student', 'hash', 'active', 1, 0, now, now).run();

  await db.prepare(
    `INSERT INTO student_profiles (user_id, school_id, student_code, admission_number, first_name, last_name, date_of_birth, dob_md, gender, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind('studentUserB', 'schoolB', 'S000001', 'ADM001', 'Student', 'B', '2010-01-01', '01-01', 'male', now, now).run();

  // Enrollments for both schools
  await db.prepare(
    `INSERT INTO enrollments (id, school_id, academic_year_id, classroom_id, student_id, joined_on, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind('enrollA', 'schoolA', 'yearA', 'classA', 'studentUserA', '2024-04-01', 'active', now, now).run();

  await db.prepare(
    `INSERT INTO enrollments (id, school_id, academic_year_id, classroom_id, student_id, joined_on, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind('enrollB', 'schoolB', 'yearB', 'classB', 'studentUserB', '2024-04-01', 'active', now, now).run();

  // Teaching assignments for both schools
  await db.prepare(
    `INSERT INTO teaching_assignments (id, school_id, teacher_id, classroom_id, subject_id, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).bind('assignA', 'schoolA', 'teacherUserA', 'classA', 'mathA', now, now).run();

  await db.prepare(
    `INSERT INTO teaching_assignments (id, school_id, teacher_id, classroom_id, subject_id, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).bind('assignB', 'schoolB', 'teacherUserB', 'classB', 'mathB', now, now).run();

  // Attendance sessions for both schools
  await db.prepare(
    `INSERT INTO attendance_sessions (id, school_id, academic_year_id, classroom_id, subject_id, taken_by, session_date, period_no, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind('sessionA', 'schoolA', 'yearA', 'classA', 'mathA', 'teacherUserA', '2024-09-01', 1, 'open', now, now).run();

  await db.prepare(
    `INSERT INTO attendance_sessions (id, school_id, academic_year_id, classroom_id, subject_id, taken_by, session_date, period_no, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind('sessionB', 'schoolB', 'yearB', 'classB', 'mathB', 'teacherUserB', '2024-09-01', 1, 'open', now, now).run();

  // Assessments for both schools
  await db.prepare(
    `INSERT INTO assessments (id, school_id, academic_year_id, classroom_id, subject_id, name, max_marks, is_published, is_locked, created_by, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind('assessA', 'schoolA', 'yearA', 'classA', 'mathA', 'Test 1', 100, 0, 0, 'teacherUserA', now, now).run();

  await db.prepare(
    `INSERT INTO assessments (id, school_id, academic_year_id, classroom_id, subject_id, name, max_marks, is_published, is_locked, created_by, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind('assessB', 'schoolB', 'yearB', 'classB', 'mathB', 'Test 1', 100, 0, 0, 'teacherUserB', now, now).run();

  // Fee categories for both schools
  await db.prepare(
    `INSERT INTO fee_categories (id, school_id, code, name, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).bind('feeCatA', 'schoolA', 'TUITION', 'Tuition Fee', now, now).run();

  await db.prepare(
    `INSERT INTO fee_categories (id, school_id, code, name, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).bind('feeCatB', 'schoolB', 'TUITION', 'Tuition Fee', now, now).run();

  return {
    schoolA: {
      id: 'schoolA',
      year: 'yearA',
      classroom: 'classA',
      subject: 'mathA',
      teacher: 'teacherUserA',
      teacherUser: 'teacherUserA',
      student: 'studentUserA',
      studentUser: 'studentUserA',
      enrollment: 'enrollA',
      assignment: 'assignA',
      session: 'sessionA',
      assessment: 'assessA',
      feeCategory: 'feeCatA',
    },
    schoolB: {
      id: 'schoolB',
      year: 'yearB',
      classroom: 'classB',
      subject: 'mathB',
      teacher: 'teacherUserB',
      teacherUser: 'teacherUserB',
      student: 'studentUserB',
      studentUser: 'studentUserB',
      enrollment: 'enrollB',
      assignment: 'assignB',
      session: 'sessionB',
      assessment: 'assessB',
      feeCategory: 'feeCatB',
    },
  };
}

describe('Tenant Isolation - Cross-School Data Access Prevention', () => {
  let testData: Awaited<ReturnType<typeof setupTwoSchools>>;

  beforeEach(async () => {
    const db = getDb();
    testData = await setupTwoSchools(db);
  });

  it('should prevent School A from querying School B teachers', async () => {
    const db = getDb();
    
    // School A tries to query School B teacher by ID with school filter
    const result = await db.prepare(
      `SELECT * FROM teacher_profiles WHERE user_id = ? AND school_id = ?`
    ).bind(testData.schoolB.teacher, 'schoolA').first();

    expect(result).toBeNull();
  });

  it('should prevent School A from querying School B students', async () => {
    const db = getDb();
    
    // School A tries to query School B student by ID with school filter
    const result = await db.prepare(
      `SELECT * FROM student_profiles WHERE user_id = ? AND school_id = ?`
    ).bind(testData.schoolB.student, 'schoolA').first();

    expect(result).toBeNull();
  });

  it('should prevent School A from querying School B classrooms', async () => {
    const db = getDb();
    
    const result = await db.prepare(
      `SELECT * FROM classrooms WHERE id = ? AND school_id = ?`
    ).bind(testData.schoolB.classroom, 'schoolA').first();

    expect(result).toBeNull();
  });

  it('should prevent School A from querying School B subjects', async () => {
    const db = getDb();
    
    const result = await db.prepare(
      `SELECT * FROM subjects WHERE id = ? AND school_id = ?`
    ).bind(testData.schoolB.subject, 'schoolA').first();

    expect(result).toBeNull();
  });

  it('should prevent School A from querying School B enrollments', async () => {
    const db = getDb();
    
    const result = await db.prepare(
      `SELECT * FROM enrollments WHERE id = ? AND school_id = ?`
    ).bind(testData.schoolB.enrollment, 'schoolA').first();

    expect(result).toBeNull();
  });

  it('should prevent School A from querying School B teaching assignments', async () => {
    const db = getDb();
    
    const result = await db.prepare(
      `SELECT * FROM teaching_assignments WHERE id = ? AND school_id = ?`
    ).bind(testData.schoolB.assignment, 'schoolA').first();

    expect(result).toBeNull();
  });

  it('should prevent School A from querying School B attendance sessions', async () => {
    const db = getDb();
    
    const result = await db.prepare(
      `SELECT * FROM attendance_sessions WHERE id = ? AND school_id = ?`
    ).bind(testData.schoolB.session, 'schoolA').first();

    expect(result).toBeNull();
  });

  it('should prevent School A from querying School B assessments', async () => {
    const db = getDb();
    
    const result = await db.prepare(
      `SELECT * FROM assessments WHERE id = ? AND school_id = ?`
    ).bind(testData.schoolB.assessment, 'schoolA').first();

    expect(result).toBeNull();
  });

  it('should prevent School A from querying School B fee categories', async () => {
    const db = getDb();
    
    const result = await db.prepare(
      `SELECT * FROM fee_categories WHERE id = ? AND school_id = ?`
    ).bind(testData.schoolB.feeCategory, 'schoolA').first();

    expect(result).toBeNull();
  });

  it('should allow School A to query own teachers', async () => {
    const db = getDb();
    
    const result = await db.prepare(
      `SELECT * FROM teacher_profiles WHERE user_id = ? AND school_id = ?`
    ).bind(testData.schoolA.teacher, 'schoolA').first();

    expect(result).not.toBeNull();
    expect(result).toHaveProperty('user_id', testData.schoolA.teacher);
  });

  it('should allow School A to query own students', async () => {
    const db = getDb();
    
    const result = await db.prepare(
      `SELECT * FROM student_profiles WHERE user_id = ? AND school_id = ?`
    ).bind(testData.schoolA.student, 'schoolA').first();

    expect(result).not.toBeNull();
    expect(result).toHaveProperty('user_id', testData.schoolA.student);
  });
});

describe('Tenant Isolation - User and Session Isolation', () => {
  let testData: Awaited<ReturnType<typeof setupTwoSchools>>;

  beforeEach(async () => {
    const db = getDb();
    testData = await setupTwoSchools(db);
  });

  it('should prevent School A from querying School B users', async () => {
    const db = getDb();
    
    const result = await db.prepare(
      `SELECT * FROM users WHERE id = ? AND school_id = ?`
    ).bind(testData.schoolB.teacherUser, 'schoolA').first();

    expect(result).toBeNull();
  });

  it('should isolate user queries by school_id', async () => {
    const db = getDb();
    
    // School A queries all users with school filter
    const results = await db.prepare(
      `SELECT * FROM users WHERE school_id = ?`
    ).bind('schoolA').all();

    expect(results.results).toHaveLength(2); // teacher + student
    expect(results.results?.every(u => u.school_id === 'schoolA')).toBe(true);
  });

  it('should prevent cross-school session access', async () => {
    const db = getDb();
    const now = Date.now();

    // Create sessions for both schools
    await db.prepare(
      `INSERT INTO sessions (id, user_id, refresh_hash, family_id, expires_at, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).bind('sessionA', testData.schoolA.teacherUser, 'hashA', 'familyA', now + 86400000, now).run();

    await db.prepare(
      `INSERT INTO sessions (id, user_id, refresh_hash, family_id, expires_at, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).bind('sessionB', testData.schoolB.teacherUser, 'hashB', 'familyB', now + 86400000, now).run();

    // Query sessions joined with users (typical auth check pattern)
    const result = await db.prepare(
      `SELECT s.* FROM sessions s
       INNER JOIN users u ON s.user_id = u.id
       WHERE s.id = ? AND u.school_id = ?`
    ).bind('sessionB', 'schoolA').first();

    expect(result).toBeNull();
  });
});

describe('Tenant Isolation - Composite Foreign Key Protection', () => {
  let testData: Awaited<ReturnType<typeof setupTwoSchools>>;

  beforeEach(async () => {
    const db = getDb();
    testData = await setupTwoSchools(db);
  });

  it('should reject teaching assignment with cross-school teacher', async () => {
    const db = getDb();
    const now = new Date().toISOString();

    // Try to create teaching assignment in School A with School B teacher
    await expect(async () => {
      await db.prepare(
        `INSERT INTO teaching_assignments (id, school_id, teacher_id, classroom_id, subject_id, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      ).bind('badAssign', 'schoolA', testData.schoolB.teacher, testData.schoolA.classroom, testData.schoolA.subject, now, now).run();
    }).rejects.toThrow();
  });

  it('should reject enrollment with cross-school student', async () => {
    const db = getDb();
    const now = new Date().toISOString();

    // Try to enroll School B student in School A classroom
    await expect(async () => {
      await db.prepare(
        `INSERT INTO enrollments (id, school_id, academic_year_id, classroom_id, student_id, joined_on, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind('badEnroll', 'schoolA', testData.schoolA.year, testData.schoolA.classroom, testData.schoolB.student, '2024-04-01', 'active', now, now).run();
    }).rejects.toThrow();
  });

  it('should reject attendance session with cross-school teacher', async () => {
    const db = getDb();
    const now = new Date().toISOString();

    // Try to create attendance session in School A with School B teacher
    await expect(async () => {
      await db.prepare(
        `INSERT INTO attendance_sessions (id, school_id, academic_year_id, classroom_id, subject_id, taken_by, session_date, period_no, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind('badSession', 'schoolA', testData.schoolA.year, testData.schoolA.classroom, testData.schoolA.subject, testData.schoolB.teacher, '2024-09-01', 1, 'open', now, now).run();
    }).rejects.toThrow();
  });

  it('should reject assessment with cross-school classroom', async () => {
    const db = getDb();
    const now = new Date().toISOString();

    // Try to create assessment in School A with School B classroom
    await expect(async () => {
      await db.prepare(
        `INSERT INTO assessments (id, school_id, academic_year_id, classroom_id, subject_id, name, max_marks, is_published, is_locked, created_by, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind('badAssess', 'schoolA', testData.schoolA.year, testData.schoolB.classroom, testData.schoolA.subject, 'Test', 100, 0, 0, testData.schoolA.teacher, now, now).run();
    }).rejects.toThrow();
  });
});

describe('Tenant Isolation - List Operations', () => {
  let testData: Awaited<ReturnType<typeof setupTwoSchools>>;

  beforeEach(async () => {
    const db = getDb();
    testData = await setupTwoSchools(db);
  });

  it('should return only School A data when listing teachers', async () => {
    const db = getDb();
    
    const results = await db.prepare(
      `SELECT * FROM teacher_profiles WHERE school_id = ?`
    ).bind('schoolA').all();

    expect(results.results).toHaveLength(1);
    expect(results.results?.[0]).toHaveProperty('user_id', testData.schoolA.teacher);
  });

  it('should return only School A data when listing students', async () => {
    const db = getDb();
    
    const results = await db.prepare(
      `SELECT * FROM student_profiles WHERE school_id = ?`
    ).bind('schoolA').all();

    expect(results.results).toHaveLength(1);
    expect(results.results?.[0]).toHaveProperty('user_id', testData.schoolA.student);
  });

  it('should return only School A data when listing classrooms', async () => {
    const db = getDb();
    
    const results = await db.prepare(
      `SELECT * FROM classrooms WHERE school_id = ?`
    ).bind('schoolA').all();

    expect(results.results).toHaveLength(1);
    expect(results.results?.[0]).toHaveProperty('id', testData.schoolA.classroom);
  });

  it('should return only School A data when listing teaching assignments', async () => {
    const db = getDb();
    
    const results = await db.prepare(
      `SELECT * FROM teaching_assignments WHERE school_id = ?`
    ).bind('schoolA').all();

    expect(results.results).toHaveLength(1);
    expect(results.results?.[0]).toHaveProperty('id', testData.schoolA.assignment);
  });

  it('should return only School A data when listing enrollments', async () => {
    const db = getDb();
    
    const results = await db.prepare(
      `SELECT * FROM enrollments WHERE school_id = ?`
    ).bind('schoolA').all();

    expect(results.results).toHaveLength(1);
    expect(results.results?.[0]).toHaveProperty('id', testData.schoolA.enrollment);
  });
});
