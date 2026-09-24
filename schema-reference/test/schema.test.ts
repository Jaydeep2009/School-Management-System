import { describe, it, expect } from 'vitest';
import Database from 'better-sqlite3';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  INTEGRITY_CHECKS,
  ACTIVATION_PRECHECKS,
  ACTIVATION_STATEMENTS,
  IMPORT_CLAIM_SQL,
} from '../src/integrity-checks';

/* -------------------------------------------------------------------------
 * Test harness
 * Runs the real migration against SQLite with foreign keys ON (D1 always
 * enforces foreign keys). Every test gets a fresh in-memory database.
 * ---------------------------------------------------------------------- */
const HERE = path.dirname(fileURLToPath(import.meta.url));
const MIGRATION = readFileSync(path.resolve(HERE, '../migrations/0001_init.sql'), 'utf8');

type DB = Database.Database;
const NOW = 1_800_000_000_000;
const ts = { created_at: NOW, updated_at: NOW };

function freshDb(): DB {
  const db = new Database(':memory:');
  db.pragma('foreign_keys = ON');
  db.exec(MIGRATION);
  return db;
}

function ins(db: DB, table: string, row: Record<string, unknown>) {
  const cols = Object.keys(row);
  db.prepare(
    `INSERT INTO ${table} (${cols.join(', ')}) VALUES (${cols.map((c) => '@' + c).join(', ')})`,
  ).run(row);
}

const CODES = {
  check: 'SQLITE_CONSTRAINT_CHECK',
  unique: 'SQLITE_CONSTRAINT_UNIQUE',
  pk: 'SQLITE_CONSTRAINT_PRIMARYKEY',
  fk: 'SQLITE_CONSTRAINT_FOREIGNKEY',
  trigger: 'SQLITE_CONSTRAINT_TRIGGER',
  notnull: 'SQLITE_CONSTRAINT_NOTNULL',
} as const;

/** Assert the database itself rejects the statement, and for the RIGHT reason. */
function rejects(kind: keyof typeof CODES, fn: () => unknown) {
  let err: any;
  try {
    fn();
  } catch (e) {
    err = e;
  }
  expect(err, 'expected the database to reject this').toBeDefined();
  expect(err.code, err?.message).toBe(CODES[kind]);
}

/** Bind only the named parameters a statement actually uses. */
function bindFor(sql: string, params: Record<string, unknown>) {
  const used = new Set([...sql.matchAll(/:(\w+)/g)].map((m) => m[1]));
  return Object.fromEntries(Object.entries(params).filter(([k]) => used.has(k)));
}
function rows(db: DB, sql: string, params: Record<string, unknown> = {}) {
  return db.prepare(sql).all(bindFor(sql, params));
}
function plan(db: DB, sql: string, params: unknown[] = []): string[] {
  return (db.prepare('EXPLAIN QUERY PLAN ' + sql).all(...params) as { detail: string }[]).map((r) => r.detail);
}
const isTableScan = (detail: string) => /^SCAN \S+$/.test(detail);

/* -------------------------------------------------------------------------
 * Fixture: one fully wired school ("tenant")
 * ---------------------------------------------------------------------- */
interface Tenant {
  school: string; code: string; principal: string;
  t1: string; t2: string; s1: string; s2: string; s3: string; s4: string;
  yCur: string; yNext: string;
  c10A: string; c10B: string; c11A: string; c10An: string;
  math: string; eng: string;
  e1: string; e2: string; e3: string; e4: string;
}

function seedTenant(db: DB, k: string, code: string): Tenant {
  const t: Tenant = {
    school: `sch_${k}`, code, principal: `${k}_p1`,
    t1: `${k}_t1`, t2: `${k}_t2`,
    s1: `${k}_s1`, s2: `${k}_s2`, s3: `${k}_s3`, s4: `${k}_s4`,
    yCur: `${k}_y2627`, yNext: `${k}_y2728`,
    c10A: `${k}_c10A`, c10B: `${k}_c10B`, c11A: `${k}_c11A`, c10An: `${k}_c10An`,
    math: `${k}_math`, eng: `${k}_eng`,
    e1: `${k}_e1`, e2: `${k}_e2`, e3: `${k}_e3`, e4: `${k}_e4`,
  };
  ins(db, 'schools', { id: t.school, code, name: `School ${k}`, ...ts });

  const user = (id: string, login: string, role: string) =>
    ins(db, 'users', { id, school_id: t.school, login_id: login, role, password_hash: 'h', ...ts });
  user(t.principal, `${code}-P-000001`, 'principal');
  user(t.t1, `${code}-T-000001`, 'teacher');
  user(t.t2, `${code}-T-000002`, 'teacher');
  [t.s1, t.s2, t.s3, t.s4].forEach((id, i) => user(id, `${code}-S-00000${i + 1}`, 'student'));

  ins(db, 'teacher_profiles', { user_id: t.t1, school_id: t.school, first_name: 'Asha', last_name: 'Rao', date_of_birth: '1985-03-14', dob_md: '03-14', ...ts });
  ins(db, 'teacher_profiles', { user_id: t.t2, school_id: t.school, first_name: 'Ravi', last_name: 'Kale', ...ts });
  [t.s1, t.s2, t.s3, t.s4].forEach((id, i) =>
    ins(db, 'student_profiles', {
      user_id: id, school_id: t.school, student_code: `S00000${i + 1}`, admission_number: `ADM${i + 1}`,
      first_name: `Student${i + 1}`, last_name: 'Patil', date_of_birth: '2011-06-15', dob_md: '06-15', ...ts,
    }));

  ins(db, 'academic_years', { id: t.yCur, school_id: t.school, label: '2026-27', starts_on: '2026-06-01', ends_on: '2027-03-31', status: 'current', ...ts });
  ins(db, 'academic_years', { id: t.yNext, school_id: t.school, label: '2027-28', starts_on: '2027-06-01', ends_on: '2028-03-31', status: 'upcoming', ...ts });

  const room = (id: string, year: string, yr: string, grade: string, div: string, level: number, teacher: string | null = null) =>
    ins(db, 'classrooms', {
      id, school_id: t.school, academic_year_id: year, classroom_code: `CLS-${yr}-${grade}-${div}`,
      grade_name: grade, division_name: div, grade_level: level, class_teacher_id: teacher, ...ts,
    });
  room(t.c10A, t.yCur, '2026', '10', 'A', 10, t.t1);
  room(t.c10B, t.yCur, '2026', '10', 'B', 10);
  room(t.c11A, t.yNext, '2027', '11', 'A', 11);
  room(t.c10An, t.yNext, '2027', '10', 'A', 10);

  ins(db, 'subjects', { id: t.math, school_id: t.school, subject_code: 'MATH', name: 'Mathematics', ...ts });
  ins(db, 'subjects', { id: t.eng, school_id: t.school, subject_code: 'ENG', name: 'English', ...ts });

  const offer = (id: string, room: string, subject: string, teacher: string | null) =>
    ins(db, 'teaching_assignments', { id, school_id: t.school, classroom_id: room, subject_id: subject, teacher_id: teacher, ...ts });
  offer(`${k}_ta1`, t.c10A, t.math, t.t1);
  offer(`${k}_ta2`, t.c10A, t.eng, t.t2);
  offer(`${k}_ta3`, t.c10B, t.math, t.t1);

  const enroll = (id: string, student: string, room: string, roll: number) =>
    ins(db, 'enrollments', {
      id, school_id: t.school, academic_year_id: t.yCur, classroom_id: room, student_id: student,
      roll_number: roll, joined_on: '2026-06-01', status: 'active', ...ts,
    });
  enroll(t.e1, t.s1, t.c10A, 1);
  enroll(t.e2, t.s2, t.c10A, 2);
  enroll(t.e3, t.s3, t.c10B, 1);
  enroll(t.e4, t.s4, t.c10B, 2);
  return t;
}

function twoTenants() {
  const db = freshDb();
  const A = seedTenant(db, 'a', 'GPS');
  const B = seedTenant(db, 'b', 'ABC');
  return { db, A, B };
}

const addSession = (db: DB, t: Tenant, id: string, date: string, o: Partial<{ classroom: string; subject: string; period: number; year: string; school: string }> = {}) =>
  ins(db, 'attendance_sessions', {
    id, school_id: o.school ?? t.school, academic_year_id: o.year ?? t.yCur, classroom_id: o.classroom ?? t.c10A,
    subject_id: o.subject ?? t.math, session_date: date, period_no: o.period ?? 1, taken_by: t.t1, ...ts,
  });
const addEntry = (db: DB, t: Tenant, session: string, student: string, enrollment: string, status = 'present') =>
  ins(db, 'attendance_entries', { session_id: session, student_id: student, enrollment_id: enrollment, status, updated_by: t.t1, updated_at: NOW });
const addAssessment = (db: DB, t: Tenant, id: string, name = 'Unit Test 1', max = 25, o: Partial<{ classroom: string; subject: string }> = {}) =>
  ins(db, 'assessments', {
    id, school_id: t.school, academic_year_id: t.yCur, classroom_id: o.classroom ?? t.c10A, subject_id: o.subject ?? t.math,
    name, max_marks: max, created_by: t.t1, ...ts,
  });
const addMark = (db: DB, t: Tenant, assessment: string, student: string, enrollment: string, marks: number | null, status = 'graded') =>
  ins(db, 'marks', { assessment_id: assessment, student_id: student, enrollment_id: enrollment, marks_obtained: marks, status, updated_by: t.t1, updated_at: NOW });

const addCategory = (db: DB, t: Tenant, id = `${t.school}_cat_tuition`) =>
  ins(db, 'fee_categories', { id, school_id: t.school, code: id.slice(-8), name: 'Tuition', ...ts });
const addCharge = (db: DB, t: Tenant, id: string, amount: number, o: Record<string, unknown> = {}) =>
  ins(db, 'fee_charges', {
    id, school_id: t.school, student_id: t.s1, academic_year_id: t.yCur, kind: 'fee', title: 'Tuition Term 1',
    amount_paise: amount, fee_category_id: `${t.school}_cat_tuition`, created_by: t.principal, created_at: NOW, ...o,
  });
const addPayment = (db: DB, t: Tenant, id: string, amount: number, receipt: string, o: Record<string, unknown> = {}) =>
  ins(db, 'fee_payments', {
    id, school_id: t.school, student_id: t.s1, academic_year_id: t.yCur, receipt_no: receipt, amount_paise: amount,
    paid_on: '2026-07-01', method: 'cash', recorded_by: t.principal, created_at: NOW, ...o,
  });

/* ======================================================================== */

describe('migration', () => {
  it('applies cleanly with foreign keys on, and a seeded tenant is fully consistent', () => {
    const { db } = twoTenants();
    expect(db.pragma('foreign_key_check')).toEqual([]);
    expect((db.prepare("SELECT count(*) c FROM sqlite_master WHERE type='table'").get() as any).c).toBe(25);
    for (const [name, sql] of Object.entries(INTEGRITY_CHECKS)) {
      expect(rows(db, sql), `integrity check ${name} should be clean`).toEqual([]);
    }
  });

  it('does not carry the redundant indexes the review removed', () => {
    const db = freshDb();
    const names = (db.prepare("SELECT name FROM sqlite_master WHERE type='index'").all() as { name: string }[]).map((r) => r.name);
    for (const gone of [
      'idx_teaching_assignments_class', 'idx_assessments_class_subject',
      'idx_attendance_sessions_subject_date', 'idx_promotion_items_batch',
    ]) expect(names).not.toContain(gone);
  });
});

describe('schools', () => {
  it('code must be 2-8 upper-case letters/digits', () => {
    const db = freshDb();
    const base = { name: 'X', ...ts };
    rejects('check', () => ins(db, 'schools', { id: 's1', code: 'gps', ...base }));
    rejects('check', () => ins(db, 'schools', { id: 's2', code: 'G', ...base }));
    rejects('check', () => ins(db, 'schools', { id: 's3', code: 'GPS-1', ...base }));
    rejects('check', () => ins(db, 'schools', { id: 's4', code: 'ABCDEFGHI', ...base }));
    ins(db, 'schools', { id: 's5', code: 'GPS26', ...base });
  });
  it('code is unique and immutable once issued', () => {
    const { db, A } = twoTenants();
    rejects('unique', () => ins(db, 'schools', { id: 'dup', code: 'GPS', name: 'Dup', ...ts }));
    rejects('trigger', () => db.prepare('UPDATE schools SET code = ? WHERE id = ?').run('NEW', A.school));
    db.prepare('UPDATE schools SET name = ? WHERE id = ?').run('Renamed', A.school); // other edits fine
  });
  it('settings must be valid JSON', () => {
    const db = freshDb();
    rejects('check', () => ins(db, 'schools', { id: 's1', code: 'GPS', name: 'X', settings: '{oops', ...ts }));
  });
});

describe('users and sessions', () => {
  it('login id must be upper-case and its role letter must match the role', () => {
    const { db, A } = twoTenants();
    const u = (id: string, login: string, role: string) =>
      () => ins(db, 'users', { id, school_id: A.school, login_id: login, role, password_hash: 'h', ...ts });
    rejects('check', u('x1', 'gps-s-000009', 'student'));
    rejects('check', u('x2', 'GPS-T-000009', 'student'));
    rejects('check', u('x3', 'GPS-S-000009', 'teacher'));
    u('x4', 'GPS-S-000009', 'student')();
  });
  it('login id is globally unique across schools', () => {
    const { db, B } = twoTenants();
    rejects('unique', () => ins(db, 'users', { id: 'clash', school_id: B.school, login_id: 'GPS-S-000001', role: 'student', password_hash: 'h', ...ts }));
  });
  it('an account must have a password or a pending activation (with expiry)', () => {
    const { db, A } = twoTenants();
    const base = { school_id: A.school, role: 'student', ...ts };
    rejects('check', () => ins(db, 'users', { id: 'n1', login_id: 'GPS-S-000010', ...base }));
    rejects('check', () => ins(db, 'users', { id: 'n2', login_id: 'GPS-S-000011', activation_hash: 'h', ...base }));
    ins(db, 'users', { id: 'n3', login_id: 'GPS-S-000012', activation_hash: 'h', activation_expires_at: NOW + 1000, ...base });
  });
  it('refresh lookup by session id is an index search, and family revocation too', () => {
    const db = freshDb();
    expect(plan(db, 'SELECT * FROM sessions WHERE id = ?', ['x']).some(isTableScan)).toBe(false);
    expect(plan(db, 'SELECT * FROM sessions WHERE family_id = ?', ['x']).some(isTableScan)).toBe(false);
    // and the reason the spec changed: looking up by hash alone is a full scan
    expect(plan(db, 'SELECT * FROM sessions WHERE refresh_hash = ?', ['x']).some(isTableScan)).toBe(true);
  });
});

describe('academic years', () => {
  it('a school cannot have two current years', () => {
    const { db, A } = twoTenants();
    rejects('unique', () => db.prepare("UPDATE academic_years SET status = 'current' WHERE id = ?").run(A.yNext));
  });
  it('several upcoming/closed years are fine, and each school has its own current year', () => {
    const { db, A } = twoTenants(); // A and B each already have a current year
    ins(db, 'academic_years', { id: 'y_old1', school_id: A.school, label: '2024-25', starts_on: '2024-06-01', ends_on: '2025-03-31', status: 'closed', ...ts });
    ins(db, 'academic_years', { id: 'y_old2', school_id: A.school, label: '2025-26', starts_on: '2025-06-01', ends_on: '2026-03-31', status: 'closed', ...ts });
  });
  it('dates must be real, padded and ordered', () => {
    const { db, A } = twoTenants();
    const y = (label: string, s: string, e: string) => () =>
      ins(db, 'academic_years', { id: `y_${label}`, school_id: A.school, label, starts_on: s, ends_on: e, ...ts });
    rejects('check', y('a', '2030-02-30', '2031-03-31'));
    rejects('check', y('b', '2030-6-1', '2031-03-31'));
    rejects('check', y('c', '2031-03-31', '2030-06-01'));
    rejects('check', y('d', '2030-06-01', '2030-06-01'));
    y('ok', '2030-06-01', '2031-03-31')();
  });
});

describe('classrooms and teaching assignments', () => {
  it('class teacher must be a teacher of the same school', () => {
    const { db, A, B } = twoTenants();
    const set = (teacher: string) => () => db.prepare('UPDATE classrooms SET class_teacher_id = ? WHERE id = ?').run(teacher, A.c10B);
    rejects('fk', set(A.s1));        // a student
    rejects('fk', set(A.principal)); // a principal
    rejects('fk', set(B.t1));        // a teacher of another school
    set(A.t2)();
  });
  it('grade_level is sane and codes are unique per year', () => {
    const { db, A } = twoTenants();
    const room = (id: string, code: string, div: string, level: number) => () =>
      ins(db, 'classrooms', { id, school_id: A.school, academic_year_id: A.yCur, classroom_code: code, grade_name: '9', division_name: div, grade_level: level, ...ts });
    rejects('check', room('r1', 'CLS-9-A', 'A', 99));
    room('r2', 'CLS-9-A', 'A', 9)();
    rejects('unique', room('r3', 'CLS-9-A', 'B', 9));  // same code
    rejects('unique', room('r4', 'CLS-9-A2', 'A', 9)); // same grade+division
  });
  it('a subject can be offered before a teacher is assigned; one row per class+subject', () => {
    const { db, A } = twoTenants();
    ins(db, 'teaching_assignments', { id: 'ta_new', school_id: A.school, classroom_id: A.c10B, subject_id: A.eng, teacher_id: null, ...ts });
    rejects('unique', () => ins(db, 'teaching_assignments', { id: 'ta_dup', school_id: A.school, classroom_id: A.c10B, subject_id: A.eng, teacher_id: A.t1, ...ts }));
  });
  it('teacher, subject and classroom must all belong to the same school', () => {
    const { db, A, B } = twoTenants();
    const ta = (over: Record<string, unknown>) => () =>
      ins(db, 'teaching_assignments', { id: `x${Math.random()}`, school_id: A.school, classroom_id: A.c11A, subject_id: A.math, teacher_id: A.t1, ...ts, ...over });
    rejects('fk', ta({ teacher_id: B.t1 }));
    rejects('fk', ta({ subject_id: B.math }));
    rejects('fk', ta({ classroom_id: B.c11A }));
    rejects('fk', ta({ teacher_id: A.s1 })); // a student cannot teach
    ta({})();
  });
});

describe('enrollments', () => {
  it('cannot have two live (active or planned) enrollments for a student in one year', () => {
    const { db, A } = twoTenants();
    const again = (status: string) => () =>
      ins(db, 'enrollments', { id: `dup_${status}`, school_id: A.school, academic_year_id: A.yCur, classroom_id: A.c10B, student_id: A.s1, joined_on: '2026-06-01', status, ...ts });
    rejects('unique', again('active'));
    rejects('unique', again('planned'));
  });
  it('a student can be planned for NEXT year while active in this one', () => {
    const { db, A } = twoTenants();
    ins(db, 'enrollments', { id: 'n1', school_id: A.school, academic_year_id: A.yNext, classroom_id: A.c11A, student_id: A.s1, joined_on: '2027-06-01', status: 'planned', from_enrollment_id: A.e1, ...ts });
  });
  it('mid-year section change keeps the old row as history', () => {
    const { db, A } = twoTenants();
    db.prepare("UPDATE enrollments SET status='transferred', left_on='2026-08-15' WHERE id=?").run(A.e1);
    ins(db, 'enrollments', { id: 'e1b', school_id: A.school, academic_year_id: A.yCur, classroom_id: A.c10B, student_id: A.s1, joined_on: '2026-08-15', status: 'active', ...ts });
    const hist = db.prepare('SELECT status, classroom_id FROM enrollments WHERE student_id=? ORDER BY joined_on, id').all(A.s1);
    expect(hist).toHaveLength(2);
    expect(rows(db, INTEGRITY_CHECKS.active_enrollment_in_non_current_year)).toEqual([]);
  });
  it('classroom must belong to the stated year and school; student to the same school', () => {
    const { db, A, B } = twoTenants();
    const e = (over: Record<string, unknown>) => () =>
      ins(db, 'enrollments', { id: `x${Math.random()}`, school_id: A.school, academic_year_id: A.yNext, classroom_id: A.c11A, student_id: A.s1, joined_on: '2027-06-01', left_on: '2027-07-01', status: 'completed', ...ts, ...over });
    rejects('fk', e({ academic_year_id: A.yCur }));  // 11-A is a next-year class
    rejects('fk', e({ classroom_id: B.c11A }));      // another school's class
    rejects('fk', e({ student_id: B.s1 }));          // another school's student
    rejects('fk', e({ student_id: A.t1 }));          // a teacher is not a student
    e({})();
  });
  it('status, left_on and outcome must agree', () => {
    const { db, A } = twoTenants();
    const upd = (sql: string) => () => db.prepare(sql).run();
    rejects('check', upd(`UPDATE enrollments SET left_on='2026-08-01' WHERE id='${A.e1}'`));                       // active + left_on
    rejects('check', upd(`UPDATE enrollments SET status='completed' WHERE id='${A.e1}'`));                          // ended, no left_on
    rejects('check', upd(`UPDATE enrollments SET status='left', left_on='2026-05-01' WHERE id='${A.e1}'`));        // before joined_on
    rejects('check', () => ins(db, 'enrollments', { id: 'p', school_id: A.school, academic_year_id: A.yNext, classroom_id: A.c11A, student_id: A.s1, joined_on: '2027-06-01', status: 'planned', outcome: 'promoted', ...ts }));
    rejects('notnull', () => ins(db, 'enrollments', { id: 'q', school_id: A.school, academic_year_id: A.yNext, classroom_id: A.c11A, student_id: A.s1, joined_on: '2027-06-01', ...ts })); // no status given: no default
    db.prepare("UPDATE enrollments SET outcome='promoted' WHERE id=?").run(A.e1); // outcome lives on the active source row
  });
});

describe('attendance', () => {
  it('cannot duplicate a session (class + subject + date + period), other periods are fine', () => {
    const { db, A } = twoTenants();
    addSession(db, A, 's1', '2026-09-01');
    rejects('unique', () => addSession(db, A, 's1b', '2026-09-01'));
    addSession(db, A, 's1c', '2026-09-01', { period: 2 });
  });
  it('sessions only exist for subjects the class offers, in its own year and school', () => {
    const { db, A, B } = twoTenants();
    rejects('fk', () => addSession(db, A, 'x1', '2026-09-01', { classroom: A.c10B, subject: A.eng })); // 10-B has no English
    rejects('fk', () => addSession(db, A, 'x2', '2026-09-01', { year: A.yNext }));                      // wrong year for 10-A
    rejects('fk', () => addSession(db, A, 'x3', '2026-09-01', { school: B.school }));                   // wrong school
  });
  it('period and date are validated', () => {
    const { db, A } = twoTenants();
    rejects('check', () => addSession(db, A, 'x1', '2026-09-01', { period: 0 }));
    rejects('check', () => addSession(db, A, 'x2', '2026-02-30'));
    rejects('check', () => addSession(db, A, 'x3', '2026-9-1'));
  });
  it('cannot duplicate a student in a session, and only present/absent are valid', () => {
    const { db, A } = twoTenants();
    addSession(db, A, 's1', '2026-09-01');
    addEntry(db, A, 's1', A.s1, A.e1);
    rejects('pk', () => addEntry(db, A, 's1', A.s1, A.e1, 'absent'));
    rejects('check', () => addEntry(db, A, 's1', A.s2, A.e2, 'late'));
    rejects('check', () => addEntry(db, A, 's1', A.s2, A.e2, 'excused'));
  });
  it("an entry's student must be the enrollment's student", () => {
    const { db, A } = twoTenants();
    addSession(db, A, 's1', '2026-09-01');
    rejects('fk', () => addEntry(db, A, 's1', A.s2, A.e1)); // s2 marked against s1's enrollment
  });
  it('recording a student outside their enrollment is caught by the integrity checks', () => {
    const { db, A } = twoTenants();
    addSession(db, A, 'early', '2026-05-15'); // before everyone joined on 2026-06-01
    addEntry(db, A, 'early', A.s1, A.e1);
    expect(rows(db, INTEGRITY_CHECKS.attendance_entry_outside_enrollment)).toHaveLength(1);

    addSession(db, A, 'ok', '2026-09-02');
    addEntry(db, A, 'ok', A.s3, A.e3); // s3 is in 10-B but the session is 10-A
    expect(rows(db, INTEGRITY_CHECKS.attendance_entry_wrong_classroom)).toHaveLength(1);
  });
  it('overall attendance is total present / total sessions, not an average of subject percentages', () => {
    const { db, A } = twoTenants();
    ['2026-09-01', '2026-09-02', '2026-09-03', '2026-09-04'].forEach((d, i) => {
      addSession(db, A, `m${i}`, d);
      addEntry(db, A, `m${i}`, A.s1, A.e1, 'present');
    });
    addSession(db, A, 'en0', '2026-09-01', { subject: A.eng });
    addEntry(db, A, 'en0', A.s1, A.e1, 'absent');

    const perSubject = db.prepare(`
      SELECT s.subject_id AS subject, COUNT(*) AS total, SUM(e.status = 'present') AS present
        FROM attendance_entries e JOIN attendance_sessions s ON s.id = e.session_id
       WHERE e.student_id = ? AND s.academic_year_id = ? GROUP BY s.subject_id ORDER BY s.subject_id`).all(A.s1, A.yCur) as any[];
    expect(perSubject.map((r) => [r.total, r.present])).toEqual([[1, 0], [4, 4]]); // English 0/1, Maths 4/4

    const overall = db.prepare(`
      SELECT 100.0 * SUM(e.status = 'present') / COUNT(*) AS pct
        FROM attendance_entries e JOIN attendance_sessions s ON s.id = e.session_id
       WHERE e.student_id = ? AND s.academic_year_id = ?`).get(A.s1, A.yCur) as any;
    expect(overall.pct).toBe(80); // 4 of 5, NOT (100% + 0%) / 2 = 50%
  });
});

describe('assessments and marks', () => {
  it('assessment names are unique per class+subject; max marks must be positive; subject must be offered', () => {
    const { db, A } = twoTenants();
    addAssessment(db, A, 'as1', 'Unit Test 1');
    rejects('unique', () => addAssessment(db, A, 'as2', 'Unit Test 1'));
    addAssessment(db, A, 'as3', 'Unit Test 1', 25, { subject: A.eng }); // different subject: fine
    rejects('check', () => addAssessment(db, A, 'as4', 'Zero', 0));
    rejects('fk', () => addAssessment(db, A, 'as5', 'No English in 10-B', 25, { classroom: A.c10B, subject: A.eng }));
  });
  it('cannot duplicate a student result for an assessment', () => {
    const { db, A } = twoTenants();
    addAssessment(db, A, 'as1');
    addMark(db, A, 'as1', A.s1, A.e1, 20);
    rejects('pk', () => addMark(db, A, 'as1', A.s1, A.e1, 21));
  });
  it('graded needs marks >= 0; absent and exempt must not carry marks', () => {
    const { db, A } = twoTenants();
    addAssessment(db, A, 'as1');
    rejects('check', () => addMark(db, A, 'as1', A.s1, A.e1, 55, 'absent'));
    rejects('check', () => addMark(db, A, 'as1', A.s1, A.e1, 3, 'exempt'));
    rejects('check', () => addMark(db, A, 'as1', A.s1, A.e1, null, 'graded'));
    rejects('check', () => addMark(db, A, 'as1', A.s1, A.e1, -5, 'graded'));
    addMark(db, A, 'as1', A.s1, A.e1, 17.5);
    addMark(db, A, 'as1', A.s2, A.e2, null, 'absent');
    addMark(db, A, 'as1', A.s3, A.e3, null, 'exempt'); // (s3 is in 10-B: flagged below, not by the DB)
  });
  it('exceeding max_marks is caught by the integrity check (service must reject up front)', () => {
    const { db, A } = twoTenants();
    addAssessment(db, A, 'as1', 'UT1', 25);
    addMark(db, A, 'as1', A.s1, A.e1, 26);
    expect(rows(db, INTEGRITY_CHECKS.marks_over_max)).toHaveLength(1);
  });
  it("a mark's student must be the enrollment's student; wrong-class enrollments are flagged", () => {
    const { db, A } = twoTenants();
    addAssessment(db, A, 'as1');
    rejects('fk', () => addMark(db, A, 'as1', A.s2, A.e1, 10));
    addMark(db, A, 'as1', A.s3, A.e3, 10); // s3 belongs to 10-B, assessment is 10-A
    expect(rows(db, INTEGRITY_CHECKS.marks_wrong_classroom)).toHaveLength(1);
  });
});

describe('promotion', () => {
  const batch = (db: DB, A: Tenant, id = 'pb1', over: Record<string, unknown> = {}) =>
    ins(db, 'promotion_batches', {
      id, school_id: A.school, from_academic_year_id: A.yCur, to_academic_year_id: A.yNext, from_classroom_id: A.c10A,
      created_by: A.principal, created_at: NOW, ...over,
    });
  const item = (db: DB, id: string, student: string, enrollment: string, decision: string, target: string | null, batchId = 'pb1') =>
    ins(db, 'promotion_items', {
      id, promotion_batch_id: batchId, student_id: student, source_enrollment_id: enrollment,
      target_classroom_id: target, decision, created_at: NOW,
    });

  it('each decision needs (or forbids) a target class', () => {
    const { db, A } = twoTenants();
    batch(db, A);
    rejects('check', () => item(db, 'i1', A.s1, A.e1, 'promote', null));
    rejects('check', () => item(db, 'i2', A.s1, A.e1, 'retain', null));
    rejects('check', () => item(db, 'i3', A.s1, A.e1, 'graduate', A.c11A));
    rejects('check', () => item(db, 'i4', A.s1, A.e1, 'leave', A.c11A));
    item(db, 'i5', A.s1, A.e1, 'promote', A.c11A);
    item(db, 'i6', A.s2, A.e2, 'leave', null);
  });
  it('a student appears once per batch, and the source enrollment must be theirs', () => {
    const { db, A } = twoTenants();
    batch(db, A);
    item(db, 'i1', A.s1, A.e1, 'promote', A.c11A);
    rejects('unique', () => item(db, 'i2', A.s1, A.e1, 'retain', A.c10An));
    rejects('fk', () => item(db, 'i3', A.s2, A.e1, 'promote', A.c11A)); // s2 pointing at s1's enrollment
  });
  it('a class has one non-cancelled batch per target year; cancelling frees it', () => {
    const { db, A } = twoTenants();
    batch(db, A, 'pb1');
    rejects('unique', () => batch(db, A, 'pb2'));
    db.prepare("UPDATE promotion_batches SET status='cancelled' WHERE id='pb1'").run();
    batch(db, A, 'pb2');
  });
  it('batch status/timestamps and years are consistent', () => {
    const { db, A, B } = twoTenants();
    rejects('check', () => batch(db, A, 'p1', { status: 'applied' }));                       // applied needs applied_at
    rejects('check', () => batch(db, A, 'p2', { status: 'planned' }));                       // planned needs planned_at
    rejects('check', () => batch(db, A, 'p3', { to_academic_year_id: A.yCur }));             // from == to
    rejects('fk', () => batch(db, A, 'p4', { from_academic_year_id: A.yNext, to_academic_year_id: A.yCur })); // 10-A is not a next-year class
    rejects('fk', () => batch(db, A, 'p5', { from_classroom_id: B.c10A }));                  // another school's class
  });
  it('a target class in the wrong year is caught by the integrity check', () => {
    const { db, A } = twoTenants();
    batch(db, A);
    item(db, 'i1', A.s1, A.e1, 'promote', A.c11A);   // correct: next-year class
    expect(rows(db, INTEGRITY_CHECKS.promotion_target_wrong_year)).toEqual([]);
    item(db, 'i2', A.s2, A.e2, 'promote', A.c10B);   // 10-B is a CURRENT-year class
    expect(rows(db, INTEGRITY_CHECKS.promotion_target_wrong_year)).toHaveLength(1);
  });
  it('source enrollment from a different class than the batch is flagged', () => {
    const { db, A } = twoTenants();
    batch(db, A); // batch is for 10-A
    item(db, 'i1', A.s3, A.e3, 'promote', A.c11A); // s3 is in 10-B
    expect(rows(db, INTEGRITY_CHECKS.promotion_source_wrong_class)).toHaveLength(1);
  });

  it('full lifecycle: plan -> checklist -> activate. History kept, live class switches, checks stay clean', () => {
    const { db, A } = twoTenants();

    // history that must survive the rollover
    addSession(db, A, 'hist', '2026-09-01');
    addEntry(db, A, 'hist', A.s1, A.e1, 'present');
    ins(db, 'sessions', { id: 'sess_s3', user_id: A.s3, refresh_hash: 'x', family_id: 'f', expires_at: NOW + 1e9, created_at: NOW });

    // plan: 10-A -> s1 promoted to 11-A, s2 retained in 10-A;  10-B -> s3 leaves, s4 graduates
    batch(db, A, 'pbA', { status: 'planned', planned_at: NOW });
    batch(db, A, 'pbB', { status: 'planned', planned_at: NOW, from_classroom_id: A.c10B });
    const planned = (id: string, student: string, room: string, from: string) =>
      ins(db, 'enrollments', { id, school_id: A.school, academic_year_id: A.yNext, classroom_id: room, student_id: student, joined_on: '2027-06-01', status: 'planned', from_enrollment_id: from, ...ts });
    planned('n1', A.s1, A.c11A, A.e1);
    planned('n2', A.s2, A.c10An, A.e2);
    item(db, 'i1', A.s1, A.e1, 'promote', A.c11A, 'pbA');
    item(db, 'i2', A.s2, A.e2, 'retain', A.c10An, 'pbA');
    item(db, 'i3', A.s3, A.e3, 'leave', null, 'pbB');
    item(db, 'i4', A.s4, A.e4, 'graduate', null, 'pbB');
    const outcome = db.prepare('UPDATE enrollments SET outcome = ? WHERE id = ?');
    outcome.run('promoted', A.e1); outcome.run('retained', A.e2); outcome.run('left', A.e3); outcome.run('graduated', A.e4);

    // the plan must not disturb the current year
    expect(db.prepare("SELECT count(*) c FROM enrollments WHERE academic_year_id=? AND status='active'").get(A.yCur)).toEqual({ c: 4 });
    for (const [n, sql] of Object.entries(ACTIVATION_PRECHECKS)) expect(rows(db, sql, { old_year: A.yCur }), n).toEqual([]);

    // checklist catches a student with no decision
    db.prepare('UPDATE enrollments SET outcome = NULL WHERE id = ?').run(A.e2);
    expect(rows(db, ACTIVATION_PRECHECKS.active_without_outcome, { old_year: A.yCur })).toHaveLength(1);
    outcome.run('retained', A.e2);

    // activate: one transaction of set-based statements
    const params = { school: A.school, old_year: A.yCur, new_year: A.yNext, now: NOW + 5, today: '2027-04-01', audit_id: 'aud1', actor: A.principal };
    db.transaction(() => { for (const s of ACTIVATION_STATEMENTS) db.prepare(s).run(bindFor(s, params)); })();

    const enr = Object.fromEntries((db.prepare('SELECT id, status, left_on FROM enrollments').all() as any[]).map((r) => [r.id, r]));
    expect(enr[A.e1]).toMatchObject({ status: 'completed', left_on: '2027-03-31' });
    expect(enr[A.e2]).toMatchObject({ status: 'completed', left_on: '2027-03-31' });
    expect(enr[A.e3]).toMatchObject({ status: 'left', left_on: '2027-04-01' });
    expect(enr[A.e4]).toMatchObject({ status: 'completed' });
    expect(enr.n1.status).toBe('active');
    expect(enr.n2.status).toBe('active');

    const years = Object.fromEntries((db.prepare('SELECT id, status FROM academic_years WHERE school_id=?').all(A.school) as any[]).map((r) => [r.id, r.status]));
    expect(years).toEqual({ [A.yCur]: 'closed', [A.yNext]: 'current' });
    expect(db.prepare("SELECT status FROM promotion_batches WHERE id='pbA'").get()).toEqual({ status: 'applied' });

    // leaver: profile withdrawn, login disabled, tokens invalidated, session revoked. Graduate: profile inactive.
    expect(db.prepare('SELECT status FROM student_profiles WHERE user_id=?').get(A.s3)).toEqual({ status: 'withdrawn' });
    expect(db.prepare('SELECT status FROM student_profiles WHERE user_id=?').get(A.s4)).toEqual({ status: 'inactive' });
    expect(db.prepare('SELECT status, token_version FROM users WHERE id=?').get(A.s3)).toEqual({ status: 'disabled', token_version: 1 });
    expect((db.prepare("SELECT revoked_at FROM sessions WHERE id='sess_s3'").get() as any).revoked_at).toBe(NOW + 5);
    expect(db.prepare('SELECT status FROM users WHERE id=?').get(A.s1)).toEqual({ status: 'active' });

    // history untouched: last year's attendance still points at last year's enrollment and class
    expect(db.prepare("SELECT enrollment_id FROM attendance_entries WHERE session_id='hist'").get()).toEqual({ enrollment_id: A.e1 });
    // each student has exactly one live enrollment, in the new year
    const live = db.prepare("SELECT student_id, academic_year_id FROM enrollments WHERE status='active' AND school_id=? ORDER BY student_id").all(A.school);
    expect(live).toEqual([{ student_id: A.s1, academic_year_id: A.yNext }, { student_id: A.s2, academic_year_id: A.yNext }]);

    expect((db.prepare("SELECT action FROM audit_log WHERE id='aud1'").get() as any).action).toBe('ACADEMIC_YEAR_ACTIVATED');
    for (const [n, sql] of Object.entries(INTEGRITY_CHECKS)) expect(rows(db, sql), `after activation: ${n}`).toEqual([]);
    expect(db.pragma('foreign_key_check')).toEqual([]);
  });

  it('activation is all-or-nothing: if any statement fails nothing changes', () => {
    const { db, A } = twoTenants();
    db.prepare("UPDATE enrollments SET outcome='graduated' WHERE academic_year_id=?").run(A.yCur);
    const params = { school: A.school, old_year: A.yCur, new_year: A.yNext, now: NOW, today: '2027-04-01', audit_id: 'aud1', actor: 'nobody' };
    ins(db, 'audit_log', { id: 'aud1', actor_id: 'x', actor_role: 'system', action: 'X', entity: 'x', at: NOW }); // makes the last INSERT collide
    expect(() => db.transaction(() => { for (const s of ACTIVATION_STATEMENTS) db.prepare(s).run(bindFor(s, params)); })()).toThrow();
    expect(db.prepare("SELECT count(*) c FROM enrollments WHERE status='active'").get()).toEqual({ c: 8 }); // both tenants untouched
    expect(db.prepare("SELECT status FROM academic_years WHERE id=?").get(A.yCur)).toEqual({ status: 'current' });
  });
});

describe('fees', () => {
  it('payment amount must be > 0, method valid, dates real', () => {
    const { db, A } = twoTenants();
    rejects('check', () => addPayment(db, A, 'p1', 0, 'R1'));
    rejects('check', () => addPayment(db, A, 'p2', -100, 'R2'));
    rejects('check', () => addPayment(db, A, 'p3', 100, 'R3', { method: 'crypto' }));
    rejects('check', () => addPayment(db, A, 'p4', 100, 'R4', { paid_on: '2026-02-30' }));
    addPayment(db, A, 'p5', 100, 'R5');
  });
  it('receipt numbers are unique per school (the same number may exist in another school)', () => {
    const { db, A, B } = twoTenants();
    addPayment(db, A, 'p1', 100, 'GPS/26-27/000001');
    rejects('unique', () => addPayment(db, A, 'p2', 100, 'GPS/26-27/000001'));
    addPayment(db, B, 'p3', 100, 'GPS/26-27/000001', { student_id: B.s1, academic_year_id: B.yCur, recorded_by: B.principal });
  });
  it('a void needs voided_by and a reason, all together', () => {
    const { db, A } = twoTenants();
    addPayment(db, A, 'p1', 100, 'R1');
    const v = (sql: string) => () => db.prepare(sql).run();
    rejects('check', v(`UPDATE fee_payments SET voided_at=${NOW} WHERE id='p1'`));
    rejects('check', v(`UPDATE fee_payments SET voided_at=${NOW}, voided_by='${A.principal}' WHERE id='p1'`));
    v(`UPDATE fee_payments SET voided_at=${NOW}, voided_by='${A.principal}', void_reason='typo' WHERE id='p1'`)();
  });
  it('charge kinds and signs: fee/carry_forward > 0, concession < 0, a fee needs a category', () => {
    const { db, A } = twoTenants();
    addCategory(db, A);
    rejects('check', () => addCharge(db, A, 'c1', 0));
    rejects('check', () => addCharge(db, A, 'c2', -500));
    rejects('check', () => addCharge(db, A, 'c3', 500, { kind: 'concession', title: 'Sibling' }));
    rejects('check', () => addCharge(db, A, 'c4', 500, { fee_category_id: null }));
    addCharge(db, A, 'c5', -500, { kind: 'concession', title: 'Sibling', fee_category_id: null });
    addCharge(db, A, 'c6', 700, { kind: 'carry_forward', title: 'Dues 2025-26', fee_category_id: null });
    addCharge(db, A, 'c7', 5000);
  });
  it('total, paid and balance ignore voided rows and include concessions/carry-forward', () => {
    const { db, A } = twoTenants();
    addCategory(db, A);
    addCharge(db, A, 'c1', 10_000);                                                    // tuition
    addCharge(db, A, 'c2', 2_000, { title: 'Transport' });                             // transport
    addCharge(db, A, 'c3', -1_500, { kind: 'concession', title: 'Sibling', fee_category_id: null });
    addCharge(db, A, 'c4', 900, { kind: 'carry_forward', title: 'Old dues', fee_category_id: null });
    addCharge(db, A, 'c5', 4_000, { title: 'Entered by mistake' });
    db.prepare("UPDATE fee_charges SET voided_at=?, voided_by=?, void_reason='mistake' WHERE id='c5'").run(NOW, A.principal);
    addPayment(db, A, 'p1', 6_000, 'R1');
    addPayment(db, A, 'p2', 3_000, 'R2');
    addPayment(db, A, 'p3', 9_999, 'R3');
    db.prepare("UPDATE fee_payments SET voided_at=?, voided_by=?, void_reason='cheque bounced' WHERE id='p3'").run(NOW, A.principal);

    const q = (sql: string) => (db.prepare(sql).get(A.s1, A.yCur) as any).v;
    const total = q('SELECT COALESCE(SUM(amount_paise),0) v FROM fee_charges WHERE student_id=? AND academic_year_id=? AND voided_at IS NULL');
    const paid = q('SELECT COALESCE(SUM(amount_paise),0) v FROM fee_payments WHERE student_id=? AND academic_year_id=? AND voided_at IS NULL');
    expect(total).toBe(11_400); // 10000 + 2000 - 1500 + 900
    expect(paid).toBe(9_000);
    expect(total - paid).toBe(2_400);
  });
  it('a charge cannot mix schools, categories or another student’s enrollment', () => {
    const { db, A, B } = twoTenants();
    addCategory(db, A);
    addCategory(db, B);
    rejects('fk', () => addCharge(db, A, 'x1', 100, { student_id: B.s1 }));
    rejects('fk', () => addCharge(db, A, 'x2', 100, { fee_category_id: `${B.school}_cat_tuition` }));
    rejects('fk', () => addCharge(db, A, 'x3', 100, { enrollment_id: A.e2 })); // s1's charge, s2's enrollment
    rejects('fk', () => addPayment(db, A, 'x4', 100, 'RX', { student_id: B.s1 }));
    addCharge(db, A, 'ok', 100, { enrollment_id: A.e1 });
  });
  it('the ledger is append-only: no deletes, no edits (only a first-time void)', () => {
    const { db, A } = twoTenants();
    addCategory(db, A);
    addCharge(db, A, 'c1', 5_000);
    addPayment(db, A, 'p1', 1_000, 'R1');
    rejects('trigger', () => db.prepare("DELETE FROM fee_charges WHERE id='c1'").run());
    rejects('trigger', () => db.prepare("DELETE FROM fee_payments WHERE id='p1'").run());
    rejects('trigger', () => db.prepare("UPDATE fee_charges SET amount_paise=1 WHERE id='c1'").run());
    rejects('trigger', () => db.prepare("UPDATE fee_payments SET amount_paise=1 WHERE id='p1'").run());
    rejects('trigger', () => db.prepare("UPDATE fee_payments SET receipt_no='HACK' WHERE id='p1'").run());
    rejects('trigger', () => db.prepare("UPDATE fee_payments SET reference='edited' WHERE id='p1'").run());
    db.prepare("UPDATE fee_payments SET voided_at=?, voided_by=?, void_reason='dup' WHERE id='p1'").run(NOW, A.principal); // allowed once
    rejects('trigger', () => db.prepare("UPDATE fee_payments SET voided_at=NULL, voided_by=NULL, void_reason=NULL WHERE id='p1'").run()); // cannot un-void
    rejects('trigger', () => db.prepare("UPDATE fee_payments SET void_reason='changed' WHERE id='p1'").run());
  });
  it('receipt numbers are sequential and gapless: a failed payment rolls its number back', () => {
    const { db, A } = twoTenants();
    const issue = (id: string, amount: number) =>
      db.transaction(() => {
        db.prepare("INSERT INTO receipt_counters (school_id, financial_year) VALUES (?, '26-27') ON CONFLICT DO NOTHING").run(A.school);
        db.prepare("UPDATE receipt_counters SET last_number = last_number + 1 WHERE school_id = ? AND financial_year = '26-27'").run(A.school);
        db.prepare(`INSERT INTO fee_payments (id, school_id, student_id, academic_year_id, receipt_no, amount_paise, paid_on, method, recorded_by, created_at)
                    SELECT ?, ?, ?, ?, ? || '/26-27/' || printf('%06d', last_number), ?, '2026-07-01', 'cash', ?, ?
                      FROM receipt_counters WHERE school_id = ? AND financial_year = '26-27'`)
          .run(id, A.school, A.s1, A.yCur, A.code, amount, A.principal, NOW, A.school);
      })();
    issue('p1', 100); issue('p2', 100); issue('p3', 100);
    expect(() => issue('bad', 0)).toThrow();                 // amount check fails -> whole transaction rolls back
    issue('p4', 100);
    const nos = (db.prepare('SELECT receipt_no FROM fee_payments WHERE school_id=? ORDER BY receipt_no').all(A.school) as any[]).map((r) => r.receipt_no);
    expect(nos).toEqual(['GPS/26-27/000001', 'GPS/26-27/000002', 'GPS/26-27/000003', 'GPS/26-27/000004']);
  });
});

describe('code counters (login ids, student and employee codes)', () => {
  it('allocates 1, 2, 3 per school and kind, independently', () => {
    const { db, A, B } = twoTenants();
    const next = (school: string, kind: string) =>
      (db.prepare(`INSERT INTO code_counters (school_id, kind, last_number) VALUES (?, ?, 1)
                   ON CONFLICT(school_id, kind) DO UPDATE SET last_number = last_number + 1 RETURNING last_number`).get(school, kind) as any).last_number;
    expect([next(A.school, 'student'), next(A.school, 'student'), next(A.school, 'student')]).toEqual([1, 2, 3]);
    expect(next(A.school, 'teacher')).toBe(1);
    expect(next(B.school, 'student')).toBe(1);
  });
  it('only known kinds are allowed', () => {
    const { db, A } = twoTenants();
    rejects('check', () => ins(db, 'code_counters', { school_id: A.school, kind: 'admin' }));
  });
});

describe('import jobs', () => {
  const job = (db: DB, A: Tenant, over: Record<string, unknown> = {}) =>
    ins(db, 'import_jobs', {
      id: 'job1', school_id: A.school, kind: 'attendance', actor_id: A.t1, payload_hash: 'h',
      payload: '[{"student":"x"}]', status: 'previewed', expires_at: NOW + 60_000, created_at: NOW, ...over,
    });
  const claim = (db: DB, A: Tenant, over: Record<string, unknown> = {}) =>
    db.prepare(IMPORT_CLAIM_SQL).run({ id: 'job1', school: A.school, actor: A.t1, now: NOW, ...over }).changes;

  it('a valid preview can be claimed exactly once', () => {
    const { db, A } = twoTenants();
    job(db, A);
    expect(claim(db, A)).toBe(1);
    expect(claim(db, A)).toBe(0); // second commit attempt (double click / replay)
  });
  it('an expired preview cannot be committed', () => {
    const { db, A } = twoTenants();
    job(db, A, { expires_at: NOW - 1 });
    expect(claim(db, A)).toBe(0);
  });
  it('a committed preview cannot be committed again', () => {
    const { db, A } = twoTenants();
    job(db, A, { status: 'committed', committed_at: NOW, payload: null });
    expect(claim(db, A)).toBe(0);
  });
  it('school B cannot commit school A’s import, and neither can another user', () => {
    const { db, A, B } = twoTenants();
    job(db, A);
    expect(claim(db, A, { school: B.school })).toBe(0);
    expect(claim(db, A, { actor: A.t2 })).toBe(0);
    expect(claim(db, A)).toBe(1); // the rightful owner still can
  });
  it('shape rules: previewed needs a payload, committed needs a timestamp, kind and JSON valid', () => {
    const { db, A } = twoTenants();
    rejects('check', () => job(db, A, { id: 'j2', payload: null }));
    rejects('check', () => job(db, A, { id: 'j3', status: 'committed' }));
    rejects('check', () => job(db, A, { id: 'j4', kind: 'wizardry' }));
    rejects('check', () => job(db, A, { id: 'j5', payload: 'not json' }));
    job(db, A, { id: 'j6', status: 'committed', committed_at: NOW, payload: null }); // payload cleared after commit
  });
  it('the actor must be a real user of the database', () => {
    const { db, A } = twoTenants();
    rejects('fk', () => job(db, A, { actor_id: 'ghost' }));
  });
});

describe('profiles and birthdays', () => {
  it('dob must be a real padded date and dob_md must be derived from it', () => {
    const { db, A } = twoTenants();
    const set = (col: string, dob: string | null, md: string | null) => () =>
      db.prepare(`UPDATE ${col} SET date_of_birth = ?, dob_md = ? WHERE user_id = ?`).run(dob, md, col === 'teacher_profiles' ? A.t1 : A.s1);
    for (const table of ['teacher_profiles', 'student_profiles']) {
      rejects('check', set(table, '2010-02-30', '02-30'));
      rejects('check', set(table, '2010-2-8', '02-08'));
      rejects('check', set(table, '2010-05-14', '12-25')); // md disagrees
      rejects('check', set(table, '2010-05-14', null));    // md missing
      rejects('check', set(table, null, '05-14'));         // md without a dob
      set(table, '2010-05-14', '05-14')();
      set(table, null, null)();
    }
  });
  it('a profile’s school must match its account’s school', () => {
    const { db, A, B } = twoTenants();
    ins(db, 'users', { id: 'newT', school_id: A.school, login_id: 'GPS-T-000050', role: 'teacher', password_hash: 'h', ...ts });
    rejects('fk', () => ins(db, 'teacher_profiles', { user_id: 'newT', school_id: B.school, first_name: 'X', last_name: 'Y', ...ts }));
  });
  it('student code and admission number are unique within a school only', () => {
    const { db, A, B } = twoTenants();
    ins(db, 'users', { id: 'newS', school_id: A.school, login_id: 'GPS-S-000050', role: 'student', password_hash: 'h', ...ts });
    const p = (over: Record<string, unknown>) => () =>
      ins(db, 'student_profiles', { user_id: 'newS', school_id: A.school, student_code: 'S900', admission_number: 'ADM900', first_name: 'N', last_name: 'P', ...ts, ...over });
    rejects('unique', p({ student_code: 'S000001' }));
    rejects('unique', p({ admission_number: 'ADM1' }));
    p({})();
    expect(B.school).not.toBe(A.school); // B already uses the same codes without conflict
  });
});

describe('tenant isolation at the database level', () => {
  it('rows cannot reference another school’s classrooms, subjects, teachers, students or years', () => {
    const { db, A, B } = twoTenants();
    const attempts: [string, () => unknown][] = [
      ['enrollment into B’s class', () => ins(db, 'enrollments', { id: 'z1', school_id: A.school, academic_year_id: B.yNext, classroom_id: B.c11A, student_id: A.s1, joined_on: '2027-06-01', status: 'planned', ...ts })],
      ['teaching assignment with B’s teacher', () => ins(db, 'teaching_assignments', { id: 'z2', school_id: A.school, classroom_id: A.c11A, subject_id: A.math, teacher_id: B.t1, ...ts })],
      ['class teacher from B', () => db.prepare('UPDATE classrooms SET class_teacher_id=? WHERE id=?').run(B.t1, A.c10B)],
      ['attendance session in B’s class', () => addSession(db, A, 'z3', '2026-09-01', { classroom: B.c10A, year: B.yCur })],
      ['assessment in B’s class', () => addAssessment(db, A, 'z4', 'X', 25, { classroom: B.c10A })],
      ['assignment in B’s class', () => ins(db, 'assignments', { id: 'z5', school_id: A.school, academic_year_id: B.yCur, classroom_id: B.c10A, subject_id: B.math, created_by: A.t1, title: 'HW', ...ts })],
      ['fee payment for B’s student', () => addPayment(db, A, 'z6', 100, 'RZ', { student_id: B.s1 })],
      ['fee payment in B’s year', () => addPayment(db, A, 'z7', 100, 'RY', { academic_year_id: B.yCur })],
      ['promotion batch from B’s class', () => ins(db, 'promotion_batches', { id: 'z8', school_id: A.school, from_academic_year_id: A.yCur, to_academic_year_id: A.yNext, from_classroom_id: B.c10A, created_by: A.principal, created_at: NOW })],
      ['promotion batch into B’s year', () => ins(db, 'promotion_batches', { id: 'z9', school_id: A.school, from_academic_year_id: A.yCur, to_academic_year_id: B.yNext, from_classroom_id: A.c10A, created_by: A.principal, created_at: NOW })],
      ['classroom in B’s academic year', () => ins(db, 'classrooms', { id: 'z10', school_id: A.school, academic_year_id: B.yCur, classroom_code: 'X', grade_name: '1', division_name: 'A', grade_level: 1, ...ts })],
    ];
    for (const [label, fn] of attempts) {
      let err: any;
      try { fn(); } catch (e) { err = e; }
      expect(err?.code, `should reject: ${label}`).toBe(CODES.fk);
    }
  });
});

describe('query plans: hot queries never scan a whole table', () => {
  const queries: [string, string, unknown[]][] = [
    ['teacher: class+subject attendance over a date range', 'SELECT * FROM attendance_sessions WHERE classroom_id=? AND subject_id=? AND session_date BETWEEN ? AND ?', ['c', 's', '2026-09-01', '2026-09-30']],
    ['class: all sessions in a date range', 'SELECT * FROM attendance_sessions WHERE classroom_id=? AND session_date >= ?', ['c', '2026-09-01']],
    ['student: own attendance entries', 'SELECT * FROM attendance_entries WHERE student_id=?', ['s']],
    ['student: own marks', 'SELECT * FROM marks WHERE student_id=?', ['s']],
    ['assessments for a class+subject', 'SELECT * FROM assessments WHERE classroom_id=? AND subject_id=?', ['c', 's']],
    ['class roster', "SELECT * FROM enrollments WHERE classroom_id=? AND status='active'", ['c']],
    ['student enrollment history', 'SELECT * FROM enrollments WHERE student_id=? AND academic_year_id=?', ['s', 'y']],
    ['principal: upcoming teacher birthdays', 'SELECT * FROM teacher_profiles WHERE school_id=? AND dob_md IN (?,?,?)', ['sch', '09-20', '09-21', '09-22']],
    ['class teacher: student birthdays in own class', "SELECT sp.* FROM enrollments e JOIN student_profiles sp ON sp.user_id = e.student_id WHERE e.classroom_id=? AND e.status='active' AND sp.dob_md IN (?,?)", ['c', '09-20', '09-21']],
    ['fee charges for a student-year', 'SELECT * FROM fee_charges WHERE student_id=? AND academic_year_id=? AND voided_at IS NULL', ['s', 'y']],
    ['fee payments for a student-year', 'SELECT * FROM fee_payments WHERE student_id=? AND academic_year_id=? AND voided_at IS NULL', ['s', 'y']],
    ['teacher: my teaching assignments', 'SELECT * FROM teaching_assignments WHERE teacher_id=?', ['t']],
    ['class subject list', 'SELECT * FROM teaching_assignments WHERE classroom_id=?', ['c']],
    ['login by login_id', 'SELECT * FROM users WHERE login_id=?', ['GPS-S-000001']],
    ['audit trail for a school in a time window', 'SELECT * FROM audit_log WHERE school_id=? AND at BETWEEN ? AND ?', ['sch', 0, 1]],
    ['audit trail for one record', 'SELECT * FROM audit_log WHERE entity=? AND entity_id=?', ['fee_payments', 'p']],
    ['cron: expire stale import previews', "SELECT id FROM import_jobs WHERE expires_at < ? AND status='previewed'", [1]],
    ['cron: purge expired sessions', 'SELECT id FROM sessions WHERE expires_at < ?', [1]],
    ['promotion items of a batch', 'SELECT * FROM promotion_items WHERE promotion_batch_id=?', ['b']],
  ];
  const db = freshDb();
  for (const [label, sql, params] of queries) {
    it(label, () => {
      const steps = plan(db, sql, params);
      expect(steps.filter(isTableScan), steps.join(' | ')).toEqual([]);
    });
  }
});

/* -------------------------------------------------------------------------
 * Rules that live in the SERVICE layer. They cannot be checked here because
 * they need the Worker code. Write them as vitest-pool-workers tests against
 * the Hono app when each service exists. (The integrity checks above are the
 * safety net that proves the service did its job.)
 * ---------------------------------------------------------------------- */
describe('service-level tests to implement with the Worker', () => {
  it.todo('marks: a value above the assessment max_marks is rejected before insert');
  it.todo('marks: locked assessments reject teacher edits; principal correction is audited with before/after');
  it.todo('attendance: entries are only created for students enrolled in that classroom on the session date');
  it.todo('attendance: teacher edit window is enforced; principal override is audited');
  it.todo('attendance: closed-year sessions are read-only for teachers');
  it.todo('authz: subject teacher can write only their own class+subject; class teacher can READ every subject of their class but WRITE only their own');
  it.todo('authz: student endpoints read the student id from the token and never from parameters');
  it.todo('promotion: target class must belong to the batch target academic year (mirror of promotion_target_wrong_year)');
  it.todo('promotion: re-planning a class replaces planned enrollments idempotently and rewrites outcomes');
  it.todo('promotion: activation is refused while ACTIVATION_PRECHECKS return rows');
  it.todo('imports: commit executes the claim statement first and aborts unless exactly one row changed');
  it.todo('imports: a stale committing job is marked failed by the cron; finished job payloads are cleared');
  it.todo('fees: receipt financial year comes from server creation time, not paid_on');
  it.todo('tenant isolation: for every route, a School A user requesting a School B id gets 404');
  it.todo('withdrawal: profile status, enrollment end, login disable and session revocation happen in one transaction');
});
