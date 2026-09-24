/**
 * Student Account Management Tests
 * 
 * Comprehensive tests for student account lifecycle using real D1 database:
 * - Creation
 * - Retrieval
 * - Update
 * - Disable
 * - Reactivation
 */

import { describe, it, expect, beforeEach } from 'vitest';
import * as studentService from './student.service';
import * as studentRepo from './student.repository';
import {
  getDb,
  createTestSchool,
  createTenantContext,
  isValidTemporaryPasswordFormat,
} from './test-helpers';

describe('Student Account Management', () => {
  let schoolA: Awaited<ReturnType<typeof createTestSchool>>;
  let schoolB: Awaited<ReturnType<typeof createTestSchool>>;

  beforeEach(async () => {
    schoolA = await createTestSchool({ code: 'GPS', name: 'GPS School' });
    schoolB = await createTestSchool({ code: 'MHS', name: 'MHS School' });
  });

  describe('Student Creation', () => {
    it('should create student with generated codes', async () => {
      const db = getDb();
      const principal = createTenantContext('principal', schoolA.id, 'principal-1');
      
      const result = await studentService.create(
        db,
        principal.schoolId,
        {
          admission_number: '2023001',
          first_name: 'Jane',
          last_name: 'Smith',
          gender: 'female',
          date_of_birth: '2010-03-20',
        }
      );

      expect(result).toBeDefined();
      expect(result.profile_id).toBeDefined();
      expect(result.user_id).toBeDefined();
      expect(result.login_id).toBe('GPS-S-000001');
      expect(result.student_code).toBe('S000001');
      expect(result.temporary_password).toBeDefined();
      expect(isValidTemporaryPasswordFormat(result.temporary_password)).toBe(true);
    });

    it('should generate sequential student codes', async () => {
      const db = getDb();
      const principal = createTenantContext('principal', schoolA.id, 'principal-1');
      
      const student1 = await studentService.create(
        db,
        principal.schoolId,
        {
          admission_number: '2023001',
          first_name: 'Jane',
          last_name: 'Smith',
        }
      );

      const student2 = await studentService.create(
        db,
        principal.schoolId,
        {
          admission_number: '2023002',
          first_name: 'Bob',
          last_name: 'Johnson',
        }
      );

      expect(student1.student_code).toBe('S000001');
      expect(student2.student_code).toBe('S000002');
      expect(student1.login_id).toBe('GPS-S-000001');
      expect(student2.login_id).toBe('GPS-S-000002');
    });

    it('should enforce admission number uniqueness', async () => {
      const db = getDb();
      const principal = createTenantContext('principal', schoolA.id, 'principal-1');
      
      // Create first student
      await studentService.create(
        db,
        principal.schoolId,
        {
          admission_number: '2023001',
          first_name: 'Jane',
          last_name: 'Smith',
        }
      );

      // Try to create student with same admission number
      await expect(
        studentService.create(
          db,
          principal.schoolId,
          {
            admission_number: '2023001',
            first_name: 'Bob',
            last_name: 'Johnson',
          }
        )
      ).rejects.toThrow();
    });

    it('should create user and profile consistently', async () => {
      const db = getDb();
      const principal = createTenantContext('principal', schoolA.id, 'principal-1');
      
      const result = await studentService.create(
        db,
        principal.schoolId,
        {
          admission_number: '2023001',
          first_name: 'Jane',
          middle_name: 'Marie',
          last_name: 'Smith',
          gender: 'female',
          date_of_birth: '2010-03-20',
          phone: '+1234567890',
          email: 'jane@example.com',
          address: '123 Main St',
          parent_name: 'Robert Smith',
          parent_phone: '+1987654321',
        }
      );

      // Verify user was created
      const user = await db
        .prepare('SELECT * FROM users WHERE id = ?')
        .bind(result.user_id)
        .first();

      expect(user).toBeDefined();
      expect(user.school_id).toBe(principal.schoolId);
      expect(user.login_id).toBe(result.login_id);
      expect(user.role).toBe('student');
      expect(user.status).toBe('active');
      expect(user.must_change_password).toBe(1);

      // Verify profile was created
      const profile = await studentRepo.findById(
        db,
        result.profile_id,
        principal.schoolId
      );

      expect(profile).toBeDefined();
      expect(profile!.user_id).toBe(result.user_id);
      expect(profile!.school_id).toBe(principal.schoolId);
      expect(profile!.student_code).toBe(result.student_code);
      expect(profile!.admission_number).toBe('2023001');
      expect(profile!.first_name).toBe('Jane');
      expect(profile!.middle_name).toBe('Marie');
      expect(profile!.last_name).toBe('Smith');
    });

    it('should use school_id from tenant context', async () => {
      const db = getDb();
      const principal = createTenantContext('principal', schoolA.id, 'principal-1');
      
      const result = await studentService.create(
        db,
        principal.schoolId,
        {
          admission_number: '2023001',
          first_name: 'Jane',
          last_name: 'Smith',
        }
      );

      const profile = await studentRepo.findById(
        db,
        result.profile_id,
        principal.schoolId
      );

      expect(profile!.school_id).toBe(schoolA.id);
      expect(profile!.school_id).toBe(principal.schoolId);
    });
  });

  describe('Student Retrieval', () => {
    let student1Id: string;
    let student2Id: string;
    let studentBId: string;

    beforeEach(async () => {
      const db = getDb();

      // Create students in School A
      const s1 = await studentService.create(db, schoolA.id, {
        admission_number: '2023001',
        first_name: 'Jane',
        last_name: 'Smith',
      });
      student1Id = s1.profile_id;

      const s2 = await studentService.create(db, schoolA.id, {
        admission_number: '2023002',
        first_name: 'Bob',
        last_name: 'Johnson',
      });
      student2Id = s2.profile_id;

      // Create student in School B
      const sB = await studentService.create(db, schoolB.id, {
        admission_number: '2023001',
        first_name: 'Alice',
        last_name: 'Williams',
      });
      studentBId = sB.profile_id;
    });

    it('should allow principal to list students in own school', async () => {
      const db = getDb();
      const students = await studentRepo.findAll(db, schoolA.id);

      expect(students).toHaveLength(2);
      expect(students[0].school_id).toBe(schoolA.id);
      expect(students[1].school_id).toBe(schoolA.id);
    });

    it('should allow principal to retrieve student by id', async () => {
      const db = getDb();
      const student = await studentService.getById(db, student1Id, schoolA.id);

      expect(student).toBeDefined();
      expect(student.id).toBe(student1Id);
      expect(student.student_code).toBe('S000001');
    });

    it('should allow student to retrieve own profile', async () => {
      const db = getDb();
      const student = await studentService.getById(db, student1Id, schoolA.id);
      
      const profile = await studentRepo.findByUserId(
        db,
        student.user_id,
        schoolA.id
      );

      expect(profile).toBeDefined();
      expect(profile!.user_id).toBe(student.user_id);
    });

    it('should prevent cross-school student retrieval', async () => {
      const db = getDb();
      
      // Principal from School A trying to access School B student
      const student = await studentRepo.findById(
        db,
        studentBId,
        schoolA.id // Wrong school
      );

      expect(student).toBeNull();
    });

    it('should retrieve student with user information', async () => {
      const db = getDb();
      const result = await studentService.getByIdWithUser(
        db,
        student1Id,
        schoolA.id
      );

      expect(result).toBeDefined();
      expect(result.profile).toBeDefined();
      expect(result.user).toBeDefined();
      expect(result.user.id).toBe(result.profile.user_id);
      expect(result.user.login_id).toBe('GPS-S-000001');
      expect(result.user.role).toBe('student');
    });
  });

  describe('Student Update', () => {
    let studentId: string;

    beforeEach(async () => {
      const db = getDb();
      const result = await studentService.create(db, schoolA.id, {
        admission_number: '2023001',
        first_name: 'Jane',
        last_name: 'Smith',
      });
      studentId = result.profile_id;
    });

    it('should allow principal to update student', async () => {
      const db = getDb();
      
      await studentService.update(
        db,
        studentId,
        schoolA.id,
        {
          first_name: 'Updated',
          phone: '+9876543210',
        }
      );

      const updated = await studentService.getById(db, studentId, schoolA.id);

      expect(updated.first_name).toBe('Updated');
      expect(updated.phone).toBe('+9876543210');
    });

    it('should not allow changing school_id', async () => {
      const db = getDb();
      
      const before = await studentService.getById(db, studentId, schoolA.id);

      await studentService.update(
        db,
        studentId,
        schoolA.id,
        {
          first_name: 'Updated',
        }
      );

      const after = await studentService.getById(db, studentId, schoolA.id);

      expect(after.school_id).toBe(before.school_id);
      expect(after.school_id).toBe(schoolA.id);
    });

    it('should not allow changing student_code', async () => {
      const db = getDb();
      
      const before = await studentService.getById(db, studentId, schoolA.id);

      await studentService.update(
        db,
        studentId,
        schoolA.id,
        {
          first_name: 'Updated',
        }
      );

      const after = await studentService.getById(db, studentId, schoolA.id);

      expect(after.student_code).toBe(before.student_code);
      expect(after.student_code).toBe('S000001');
    });

    it('should allow updating admission number if unique', async () => {
      const db = getDb();
      
      await studentService.update(
        db,
        studentId,
        schoolA.id,
        {
          admission_number: '2023999',
        }
      );

      const updated = await studentService.getById(db, studentId, schoolA.id);

      expect(updated.admission_number).toBe('2023999');
    });
  });

  describe('Student Disable', () => {
    let studentId: string;
    let userId: string;

    beforeEach(async () => {
      const db = getDb();
      const result = await studentService.create(db, schoolA.id, {
        admission_number: '2023001',
        first_name: 'Jane',
        last_name: 'Smith',
      });
      studentId = result.profile_id;
      userId = result.user_id;

      // Create a session
      await db
        .prepare(
          `INSERT INTO sessions (id, user_id, refresh_hash, family_id, expires_at, created_at)
           VALUES (?, ?, ?, ?, ?, ?)`
        )
        .bind(
          'session-1',
          userId,
          'hash123',
          'family-1',
          Date.now() + 30 * 24 * 60 * 60 * 1000,
          Date.now()
        )
        .run();
    });

    it('should disable student account', async () => {
      const db = getDb();
      
      await studentService.disable(db, studentId, schoolA.id);

      const student = await studentService.getById(db, studentId, schoolA.id);

      expect(student.status).toBe('inactive');
    });

    it('should set user status to disabled', async () => {
      const db = getDb();
      
      await studentService.disable(db, studentId, schoolA.id);

      const user = await db
        .prepare('SELECT * FROM users WHERE id = ?')
        .bind(userId)
        .first();

      expect(user.status).toBe('disabled');
    });

    it('should increment token_version', async () => {
      const db = getDb();
      
      const userBefore = await db
        .prepare('SELECT * FROM users WHERE id = ?')
        .bind(userId)
        .first();
      const tokenVersionBefore = userBefore.token_version;

      await studentService.disable(db, studentId, schoolA.id);

      const userAfter = await db
        .prepare('SELECT * FROM users WHERE id = ?')
        .bind(userId)
        .first();

      expect(userAfter.token_version).toBe(tokenVersionBefore + 1);
    });

    it('should invalidate existing sessions', async () => {
      const db = getDb();
      
      await studentService.disable(db, studentId, schoolA.id);

      const session = await db
        .prepare('SELECT * FROM sessions WHERE id = ?')
        .bind('session-1')
        .first();

      expect(session.revoked_at).not.toBeNull();
    });

    it('should preserve student data after disable', async () => {
      const db = getDb();
      
      const before = await studentService.getById(db, studentId, schoolA.id);

      await studentService.disable(db, studentId, schoolA.id);

      const after = await studentService.getById(db, studentId, schoolA.id);

      expect(after.admission_number).toBe(before.admission_number);
      expect(after.student_code).toBe(before.student_code);
      expect(after.first_name).toBe(before.first_name);
    });
  });

  describe('Student Reactivation', () => {
    let studentId: string;
    let userId: string;

    beforeEach(async () => {
      const db = getDb();
      
      // Create and disable student
      const result = await studentService.create(db, schoolA.id, {
        admission_number: '2023001',
        first_name: 'Jane',
        last_name: 'Smith',
      });
      studentId = result.profile_id;
      userId = result.user_id;

      await studentService.disable(db, studentId, schoolA.id);
    });

    it('should reactivate student account', async () => {
      const db = getDb();
      
      await studentService.reactivate(db, studentId, schoolA.id);

      const student = await studentService.getById(db, studentId, schoolA.id);

      expect(student.status).toBe('active');
    });

    it('should set user status to active', async () => {
      const db = getDb();
      
      await studentService.reactivate(db, studentId, schoolA.id);

      const user = await db
        .prepare('SELECT * FROM users WHERE id = ?')
        .bind(userId)
        .first();

      expect(user.status).toBe('active');
    });

    it('should require password change after reactivation', async () => {
      const db = getDb();
      
      await studentService.reactivate(db, studentId, schoolA.id);

      const user = await db
        .prepare('SELECT * FROM users WHERE id = ?')
        .bind(userId)
        .first();

      expect(user.must_change_password).toBe(1);
    });

    it('should preserve student_code after reactivation', async () => {
      const db = getDb();
      
      const before = await studentService.getById(db, studentId, schoolA.id);

      await studentService.reactivate(db, studentId, schoolA.id);

      const after = await studentService.getById(db, studentId, schoolA.id);

      expect(after.student_code).toBe(before.student_code);
      expect(after.student_code).toBe('S000001');
    });

    it('should generate new temporary password', async () => {
      const db = getDb();
      
      const result = await studentService.reactivate(db, studentId, schoolA.id);

      expect(result.temporary_password).toBeDefined();
      expect(isValidTemporaryPasswordFormat(result.temporary_password)).toBe(true);
    });

    it('should return password reset information', async () => {
      const db = getDb();
      
      const result = await studentService.reactivate(db, studentId, schoolA.id);

      expect(result.user_id).toBe(userId);
      expect(result.login_id).toMatch(/^GPS-S-\d{6}$/);
      expect(result.temporary_password).toBeDefined();
    });

    it('should increment token_version', async () => {
      const db = getDb();
      
      const userBefore = await db
        .prepare('SELECT * FROM users WHERE id = ?')
        .bind(userId)
        .first();
      const tokenVersionBefore = userBefore.token_version;

      await studentService.reactivate(db, studentId, schoolA.id);

      const userAfter = await db
        .prepare('SELECT * FROM users WHERE id = ?')
        .bind(userId)
        .first();

      expect(userAfter.token_version).toBe(tokenVersionBefore + 1);
    });

    it('should invalidate existing sessions', async () => {
      const db = getDb();
      
      // Create a session before reactivation
      await db
        .prepare(
          `INSERT INTO sessions (id, user_id, refresh_hash, family_id, expires_at, created_at)
           VALUES (?, ?, ?, ?, ?, ?)`
        )
        .bind(
          'session-1',
          userId,
          'hash123',
          'family-1',
          Date.now() + 30 * 24 * 60 * 60 * 1000,
          Date.now()
        )
        .run();

      await studentService.reactivate(db, studentId, schoolA.id);

      const session = await db
        .prepare('SELECT * FROM sessions WHERE id = ?')
        .bind('session-1')
        .first();

      expect(session.revoked_at).not.toBeNull();
    });

    it('should set must_change_password flag', async () => {
      const db = getDb();
      
      await studentService.reactivate(db, studentId, schoolA.id);

      const user = await db
        .prepare('SELECT * FROM users WHERE id = ?')
        .bind(userId)
        .first();

      expect(user.must_change_password).toBe(1);
    });
  });
});
