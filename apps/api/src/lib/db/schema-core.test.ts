/**
 * Core Schema Tests
 * 
 * These tests verify critical schema constraints and tenant isolation.
 * Uses D1 database (not better-sqlite3) to match production environment.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { env } from 'cloudflare:test';

const NOW = Date.now();

/**
 * Helper to insert a row
 */
async function ins(table: string, row: Record<string, unknown>) {
  const cols = Object.keys(row);
  const placeholders = cols.map(() => '?').join(', ');
  const values = cols.map((c) => row[c]);
  return await env.DB
    .prepare(`INSERT INTO ${table} (${cols.join(', ')}) VALUES (${placeholders})`)
    .bind(...values)
    .run();
}

/**
 * Helper to assert database rejects with constraint error
 */
async function expectConstraintError(fn: () => Promise<unknown>, expectedType?: string) {
  let error: any;
  try {
    await fn();
  } catch (e) {
    error = e;
  }
  expect(error, 'Expected database to reject this operation').toBeDefined();
  if (expectedType) {
    const msg = (error.message || error.cause?.message || '').toLowerCase();
    expect(msg).toMatch(new RegExp(expectedType, 'i'));
  }
}

describe('Schema: Migration and Table Count', () => {
  it('should have at least 25 core tables', async () => {
    const result = await env.DB
      .prepare("SELECT count(*) as c FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE 'd1_%' AND name NOT LIKE '_cf_%'")
      .first<{ c: number }>();
    // Repo has 27 tables (25 from spec + timetable_entries + timetables)
    expect(result?.c).toBeGreaterThanOrEqual(25);
  });

  it('should have all expected core tables', async () => {
    const tables = await env.DB
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE 'd1_%' AND name NOT LIKE '_cf_%' ORDER BY name")
      .all<{ name: string }>();
    
    const coreExpectedTables = [
      'academic_years',
      'assessments',
      'assignments',
      'assignment_attachments',
      'attendance_entries',
      'attendance_sessions',
      'audit_log',
      'classrooms',
      'code_counters',
      'enrollments',
      'fee_categories',
      'fee_charges',
      'fee_payments',
      'import_jobs',
      'marks',
      'promotion_batches',
      'promotion_items',
      'receipt_counters',
      'schools',
      'sessions',
      'student_profiles',
      'subjects',
      'teacher_profiles',
      'teaching_assignments',
      'users',
    ];
    
    const actualTables = tables.results.map(t => t.name);
    // Check that all core tables exist (repo may have additional tables)
    for (const expectedTable of coreExpectedTables) {
      expect(actualTables).toContain(expectedTable);
    }
  });
});

describe('Schema: teaching_assignments', () => {
  let schoolA: string, schoolB: string;
  let teacherA: string, teacherB: string;
  let classA: string, classB: string;
  let subjectA: string, subjectB: string;
  let yearA: string, yearB: string;

  beforeEach(async () => {
    // School A
    schoolA = 'sch_a';
    await ins('schools', { id: schoolA, code: 'TESTA', name: 'Test School A', created_at: NOW, updated_at: NOW });
    
    teacherA = 'teacher_a';
    await ins('users', { id: teacherA, school_id: schoolA, login_id: 'TESTA-T-000001', role: 'teacher', password_hash: 'hash', created_at: NOW, updated_at: NOW });
    await ins('teacher_profiles', { user_id: teacherA, school_id: schoolA, employee_code: 'TESTA-T-EMP-001', first_name: 'Teacher', last_name: 'A', created_at: NOW, updated_at: NOW });
    
    yearA = 'year_a';
    await ins('academic_years', { id: yearA, school_id: schoolA, label: '2026-27', starts_on: '2026-06-01', ends_on: '2027-03-31', status: 'current', created_at: NOW, updated_at: NOW });
    
    classA = 'class_a';
    await ins('classrooms', { 
      id: classA, school_id: schoolA, academic_year_id: yearA, classroom_code: 'CLS-10-A', 
      grade_name: '10', division_name: 'A', grade_level: 10, created_at: NOW, updated_at: NOW 
    });
    
    subjectA = 'subject_a';
    await ins('subjects', { id: subjectA, school_id: schoolA, subject_code: 'MATH', name: 'Mathematics', created_at: NOW, updated_at: NOW });

    // School B
    schoolB = 'sch_b';
    await ins('schools', { id: schoolB, code: 'TESTB', name: 'Test School B', created_at: NOW, updated_at: NOW });
    
    teacherB = 'teacher_b';
    await ins('users', { id: teacherB, school_id: schoolB, login_id: 'TESTB-T-000001', role: 'teacher', password_hash: 'hash', created_at: NOW, updated_at: NOW });
    await ins('teacher_profiles', { user_id: teacherB, school_id: schoolB, employee_code: 'TESTB-T-EMP-001', first_name: 'Teacher', last_name: 'B', created_at: NOW, updated_at: NOW });
    
    yearB = 'year_b';
    await ins('academic_years', { id: yearB, school_id: schoolB, label: '2026-27', starts_on: '2026-06-01', ends_on: '2027-03-31', status: 'current', created_at: NOW, updated_at: NOW });
    
    classB = 'class_b';
    await ins('classrooms', { 
      id: classB, school_id: schoolB, academic_year_id: yearB, classroom_code: 'CLS-10-A', 
      grade_name: '10', division_name: 'A', grade_level: 10, created_at: NOW, updated_at: NOW 
    });
    
    subjectB = 'subject_b';
    await ins('subjects', { id: subjectB, school_id: schoolB, subject_code: 'MATH', name: 'Mathematics', created_at: NOW, updated_at: NOW });
  });

  it('should allow creating teaching assignment within same school', async () => {
    await ins('teaching_assignments', {
      id: 'ta_1',
      school_id: schoolA,
      classroom_id: classA,
      subject_id: subjectA,
      teacher_id: teacherA,
      created_at: NOW,
      updated_at: NOW,
    });

    const result = await env.DB
      .prepare('SELECT * FROM teaching_assignments WHERE id = ?')
      .bind('ta_1')
      .first();
    
    expect(result).toBeDefined();
    expect(result?.school_id).toBe(schoolA);
  });

  it('should enforce unique constraint on (classroom_id, subject_id)', async () => {
    await ins('teaching_assignments', {
      id: 'ta_1',
      school_id: schoolA,
      classroom_id: classA,
      subject_id: subjectA,
      teacher_id: teacherA,
      created_at: NOW,
      updated_at: NOW,
    });

    // Try to create duplicate
    await expectConstraintError(
      () => ins('teaching_assignments', {
        id: 'ta_2',
        school_id: schoolA,
        classroom_id: classA,
        subject_id: subjectA,
        teacher_id: null, // different teacher, same classroom+subject
        created_at: NOW,
        updated_at: NOW,
      }),
      'UNIQUE'
    );
  });

  it('should allow NULL teacher_id (subject offered but not yet assigned)', async () => {
    await ins('teaching_assignments', {
      id: 'ta_unassigned',
      school_id: schoolA,
      classroom_id: classA,
      subject_id: subjectA,
      teacher_id: null,
      created_at: NOW,
      updated_at: NOW,
    });

    const result = await env.DB
      .prepare('SELECT * FROM teaching_assignments WHERE id = ?')
      .bind('ta_unassigned')
      .first();
    
    expect(result).toBeDefined();
    expect(result?.teacher_id).toBeNull();
  });

  it('should reject teaching assignment with teacher from different school (composite FK)', async () => {
    await expectConstraintError(
      () => ins('teaching_assignments', {
        id: 'ta_cross',
        school_id: schoolA,
        classroom_id: classA,
        subject_id: subjectA,
        teacher_id: teacherB, // Teacher from school B!
        created_at: NOW,
        updated_at: NOW,
      }),
      'FOREIGN'
    );
  });

  it('should reject teaching assignment with classroom from different school', async () => {
    await expectConstraintError(
      () => ins('teaching_assignments', {
        id: 'ta_cross2',
        school_id: schoolA,
        classroom_id: classB, // Classroom from school B!
        subject_id: subjectA,
        teacher_id: teacherA,
        created_at: NOW,
        updated_at: NOW,
      }),
      'FOREIGN'
    );
  });

  it('should reject teaching assignment with subject from different school', async () => {
    await expectConstraintError(
      () => ins('teaching_assignments', {
        id: 'ta_cross3',
        school_id: schoolA,
        classroom_id: classA,
        subject_id: subjectB, // Subject from school B!
        teacher_id: teacherA,
        created_at: NOW,
        updated_at: NOW,
      }),
      'FOREIGN'
    );
  });
});

describe('Schema: Tenant Isolation (teaching_assignments)', () => {
  let schoolA: string, schoolB: string;
  let teacherA: string, teacherB: string;
  let classA: string, classB: string;
  let subjectA: string, subjectB: string;
  let yearA: string, yearB: string;

  beforeEach(async () => {
    // School A
    schoolA = 'sch_a';
    await ins('schools', { id: schoolA, code: 'TESTA', name: 'Test School A', created_at: NOW, updated_at: NOW });
    
    teacherA = 'teacher_a';
    await ins('users', { id: teacherA, school_id: schoolA, login_id: 'TESTA-T-000001', role: 'teacher', password_hash: 'hash', created_at: NOW, updated_at: NOW });
    await ins('teacher_profiles', { user_id: teacherA, school_id: schoolA, employee_code: 'TESTA-T-EMP-001', first_name: 'Teacher', last_name: 'A', created_at: NOW, updated_at: NOW });
    
    yearA = 'year_a';
    await ins('academic_years', { id: yearA, school_id: schoolA, label: '2026-27', starts_on: '2026-06-01', ends_on: '2027-03-31', status: 'current', created_at: NOW, updated_at: NOW });
    
    classA = 'class_a';
    await ins('classrooms', { 
      id: classA, school_id: schoolA, academic_year_id: yearA, classroom_code: 'CLS-10-A', 
      grade_name: '10', division_name: 'A', grade_level: 10, created_at: NOW, updated_at: NOW 
    });
    
    subjectA = 'subject_a';
    await ins('subjects', { id: subjectA, school_id: schoolA, subject_code: 'MATH', name: 'Mathematics', created_at: NOW, updated_at: NOW });

    // School B
    schoolB = 'sch_b';
    await ins('schools', { id: schoolB, code: 'TESTB', name: 'Test School B', created_at: NOW, updated_at: NOW });
    
    teacherB = 'teacher_b';
    await ins('users', { id: teacherB, school_id: schoolB, login_id: 'TESTB-T-000001', role: 'teacher', password_hash: 'hash', created_at: NOW, updated_at: NOW });
    await ins('teacher_profiles', { user_id: teacherB, school_id: schoolB, employee_code: 'TESTB-T-EMP-001', first_name: 'Teacher', last_name: 'B', created_at: NOW, updated_at: NOW });
    
    yearB = 'year_b';
    await ins('academic_years', { id: yearB, school_id: schoolB, label: '2026-27', starts_on: '2026-06-01', ends_on: '2027-03-31', status: 'current', created_at: NOW, updated_at: NOW });
    
    classB = 'class_b';
    await ins('classrooms', { 
      id: classB, school_id: schoolB, academic_year_id: yearB, classroom_code: 'CLS-10-A', 
      grade_name: '10', division_name: 'A', grade_level: 10, created_at: NOW, updated_at: NOW 
    });
    
    subjectB = 'subject_b';
    await ins('subjects', { id: subjectB, school_id: schoolB, subject_code: 'MATH', name: 'Mathematics', created_at: NOW, updated_at: NOW });

    // Create teaching assignments for both schools
    await ins('teaching_assignments', {
      id: 'ta_a',
      school_id: schoolA,
      classroom_id: classA,
      subject_id: subjectA,
      teacher_id: teacherA,
      created_at: NOW,
      updated_at: NOW,
    });

    await ins('teaching_assignments', {
      id: 'ta_b',
      school_id: schoolB,
      classroom_id: classB,
      subject_id: subjectB,
      teacher_id: teacherB,
      created_at: NOW,
      updated_at: NOW,
    });
  });

  it('should isolate teaching assignments by school_id filter', async () => {
    // Query School A's assignments with school_id filter
    const resultA = await env.DB
      .prepare('SELECT * FROM teaching_assignments WHERE classroom_id = ? AND subject_id = ? AND school_id = ?')
      .bind(classA, subjectA, schoolA)
      .all();
    
    expect(resultA.results).toHaveLength(1);
    expect(resultA.results[0].id).toBe('ta_a');
    expect(resultA.results[0].school_id).toBe(schoolA);

    // Query School A's classroom but filter by School B's school_id - should return nothing
    const resultCross = await env.DB
      .prepare('SELECT * FROM teaching_assignments WHERE classroom_id = ? AND subject_id = ? AND school_id = ?')
      .bind(classA, subjectA, schoolB) // Wrong school_id!
      .all();
    
    expect(resultCross.results).toHaveLength(0);
  });

  it('should prevent School A teacher from accessing School B assignments via query', async () => {
    // Simulate authorization query: findTeachingAssignment
    const result = await env.DB
      .prepare(`
        SELECT id, teacher_id, classroom_id, subject_id, school_id
        FROM teaching_assignments
        WHERE teacher_id = ?
          AND classroom_id = ?
          AND subject_id = ?
          AND school_id = ?
        LIMIT 1
      `)
      .bind(teacherA, classB, subjectB, schoolA) // Teacher A trying to access class B with school A filter
      .first();
    
    // Should return nothing because classroom B doesn't belong to school A
    expect(result).toBeNull();
  });

  it('should allow teacher to access only their own school assignments', async () => {
    // Teacher A accessing School A assignment
    const resultA = await env.DB
      .prepare(`
        SELECT id, teacher_id, classroom_id, subject_id, school_id
        FROM teaching_assignments
        WHERE teacher_id = ?
          AND classroom_id = ?
          AND subject_id = ?
          AND school_id = ?
        LIMIT 1
      `)
      .bind(teacherA, classA, subjectA, schoolA)
      .first();
    
    expect(resultA).toBeDefined();
    expect(resultA?.id).toBe('ta_a');
    expect(resultA?.school_id).toBe(schoolA);

    // Teacher B accessing School B assignment
    const resultB = await env.DB
      .prepare(`
        SELECT id, teacher_id, classroom_id, subject_id, school_id
        FROM teaching_assignments
        WHERE teacher_id = ?
          AND classroom_id = ?
          AND subject_id = ?
          AND school_id = ?
        LIMIT 1
      `)
      .bind(teacherB, classB, subjectB, schoolB)
      .first();
    
    expect(resultB).toBeDefined();
    expect(resultB?.id).toBe('ta_b');
    expect(resultB?.school_id).toBe(schoolB);
  });

  it('should verify findByClassroomAndSubject query respects school_id', async () => {
    // This is the actual query from teaching-assignment.repository.ts
    const query = `
      SELECT id, school_id, teacher_id, classroom_id, subject_id, created_at, updated_at
      FROM teaching_assignments
      WHERE classroom_id = ?
        AND subject_id = ?
        AND school_id = ?
      LIMIT 1
    `;

    // Correct usage: School A classroom with School A filter
    const correctResult = await env.DB
      .prepare(query)
      .bind(classA, subjectA, schoolA)
      .first();
    
    expect(correctResult).toBeDefined();
    expect(correctResult?.id).toBe('ta_a');

    // Incorrect/malicious usage: School A classroom with School B filter
    const wrongResult = await env.DB
      .prepare(query)
      .bind(classA, subjectA, schoolB) // Wrong school_id!
      .first();
    
    expect(wrongResult).toBeNull();
  });
});

describe('Schema: teacher_profiles employee_code constraint', () => {
  let schoolA: string, teacherA: string;

  beforeEach(async () => {
    schoolA = 'sch_a';
    await ins('schools', { id: schoolA, code: 'TESTA', name: 'Test School A', created_at: NOW, updated_at: NOW });
    
    teacherA = 'teacher_a';
    await ins('users', { id: teacherA, school_id: schoolA, login_id: 'TESTA-T-000001', role: 'teacher', password_hash: 'hash', created_at: NOW, updated_at: NOW });
  });

  it('should require employee_code (NOT NULL constraint)', async () => {
    await expectConstraintError(
      () => ins('teacher_profiles', { 
        user_id: teacherA, 
        school_id: schoolA, 
        // employee_code missing!
        first_name: 'Teacher', 
        last_name: 'A', 
        created_at: NOW, 
        updated_at: NOW 
      }),
      'NOT NULL'
    );
  });

  it('should enforce unique employee_code within school', async () => {
    await ins('teacher_profiles', { 
      user_id: teacherA, 
      school_id: schoolA, 
      employee_code: 'TESTA-T-EMP-001',
      first_name: 'Teacher', 
      last_name: 'A', 
      created_at: NOW, 
      updated_at: NOW 
    });

    // Create another user in same school
    const teacherA2 = 'teacher_a2';
    await ins('users', { id: teacherA2, school_id: schoolA, login_id: 'TESTA-T-000002', role: 'teacher', password_hash: 'hash', created_at: NOW, updated_at: NOW });

    // Try to use same employee_code
    await expectConstraintError(
      () => ins('teacher_profiles', { 
        user_id: teacherA2, 
        school_id: schoolA, 
        employee_code: 'TESTA-T-EMP-001', // Duplicate!
        first_name: 'Teacher', 
        last_name: 'B', 
        created_at: NOW, 
        updated_at: NOW 
      }),
      'UNIQUE'
    );
  });

  it('should allow same employee_code in different schools', async () => {
    await ins('teacher_profiles', { 
      user_id: teacherA, 
      school_id: schoolA, 
      employee_code: 'EMP-001',
      first_name: 'Teacher', 
      last_name: 'A', 
      created_at: NOW, 
      updated_at: NOW 
    });

    // Create School B
    const schoolB = 'sch_b';
    await ins('schools', { id: schoolB, code: 'TESTB', name: 'Test School B', created_at: NOW, updated_at: NOW });
    
    const teacherB = 'teacher_b';
    await ins('users', { id: teacherB, school_id: schoolB, login_id: 'TESTB-T-000001', role: 'teacher', password_hash: 'hash', created_at: NOW, updated_at: NOW });

    // Same employee_code in different school - should work
    await ins('teacher_profiles', { 
      user_id: teacherB, 
      school_id: schoolB, 
      employee_code: 'EMP-001', // Same code, different school
      first_name: 'Teacher', 
      last_name: 'B', 
      created_at: NOW, 
      updated_at: NOW 
    });

    const result = await env.DB
      .prepare('SELECT * FROM teacher_profiles WHERE employee_code = ? ORDER BY school_id')
      .bind('EMP-001')
      .all();
    
    expect(result.results).toHaveLength(2);
  });
});
