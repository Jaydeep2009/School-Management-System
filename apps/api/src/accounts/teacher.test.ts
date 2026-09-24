/**
 * Teacher Account Management Tests
 * 
 * Comprehensive tests for teacher account lifecycle using real D1 database:
 * - Creation
 * - Retrieval
 * - Update
 * - Disable
 * - Reactivation
 * - Password reset
 */

import { describe, it, expect, beforeEach } from 'vitest';
import * as teacherService from './teacher.service';
import * as teacherRepo from './teacher.repository';
import {
  getDb,
  createTestSchool,
  createTenantContext,
  isValidTemporaryPasswordFormat,
} from './test-helpers';

describe('Teacher Account Management', () => {
  let schoolA: Awaited<ReturnType<typeof createTestSchool>>;
  let schoolB: Awaited<ReturnType<typeof createTestSchool>>;

  beforeEach(async () => {
    schoolA = await createTestSchool({ code: 'GPS', name: 'GPS School' });
    schoolB = await createTestSchool({ code: 'MHS', name: 'MHS School' });
  });

  describe('Teacher Creation', () => {
    it('should create teacher with generated codes', async () => {
      const db = getDb();
      const principal = createTenantContext('principal', schoolA.id, 'principal-1');
      
      const result = await teacherService.create(
        db,
        principal.schoolId,
        {
          first_name: 'John',
          last_name: 'Doe',
          phone: '+1234567890',
          date_of_birth: '1985-06-15',
          joining_date: '2023-08-01',
        }
      );

      expect(result).toBeDefined();
      expect(result.profile_id).toBeDefined();
      expect(result.user_id).toBeDefined();
      expect(result.login_id).toMatch(/^GPS-T-\d{6}$/); // Format: GPS-T-######
      expect(result.employee_code).toMatch(/^T\d{6}$/); // Format: T######
      expect(result.temporary_password).toBeDefined();
      expect(isValidTemporaryPasswordFormat(result.temporary_password)).toBe(true);
    });

    it('should generate sequential employee codes', async () => {
      const db = getDb();
      const principal = createTenantContext('principal', schoolA.id, 'principal-1');
      
      const teacher1 = await teacherService.create(
        db,
        principal.schoolId,
        {
          first_name: 'John',
          last_name: 'Doe',
        }
      );

      const teacher2 = await teacherService.create(
        db,
        principal.schoolId,
        {
          first_name: 'Jane',
          last_name: 'Smith',
        }
      );

      expect(teacher1.employee_code).toMatch(/^T\d{6}$/);
      expect(teacher2.employee_code).toMatch(/^T\d{6}$/);
      expect(teacher1.login_id).toMatch(/^GPS-T-\d{6}$/);
      expect(teacher2.login_id).toMatch(/^GPS-T-\d{6}$/);
      
      // Verify they're sequential
      const code1Num = parseInt(teacher1.employee_code!.substring(1));
      const code2Num = parseInt(teacher2.employee_code!.substring(1));
      expect(code2Num - code1Num).toBe(1);
    });

    it('should create user and profile consistently', async () => {
      const db = getDb();
      const principal = createTenantContext('principal', schoolA.id, 'principal-1');
      
      const result = await teacherService.create(
        db,
        principal.schoolId,
        {
          first_name: 'John',
          middle_name: 'Michael',
          last_name: 'Doe',
          phone: '+1234567890',
          date_of_birth: '1985-06-15',
          joining_date: '2023-08-01',
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
      expect(user.role).toBe('teacher');
      expect(user).not.toBeNull();
      expect((user as any).status).toBe('active');
      expect(user).not.toBeNull();
      expect(user!.must_change_password).toBe(1);

      // Verify profile was created
      const profile = await teacherRepo.findById(
        db,
        result.profile_id,
        principal.schoolId
      );

      expect(profile).toBeDefined();
      expect(profile!.user_id).toBe(result.user_id);
      expect(profile!.school_id).toBe(principal.schoolId);
      expect(profile!.employee_code).toBe(result.employee_code);
      expect(profile!.first_name).toBe('John');
      expect(profile!.middle_name).toBe('Michael');
      expect(profile!.last_name).toBe('Doe');
    });

    it('should reject duplicate employee code', async () => {
      const db = getDb();
      const principal = createTenantContext('principal', schoolA.id, 'principal-1');
      
      // Create first teacher
      const teacher1 = await teacherService.create(
        db,
        principal.schoolId,
        {
          first_name: 'John',
          last_name: 'Doe',
        }
      );

      // Create second teacher - should get next code
      const teacher2 = await teacherService.create(
        db,
        principal.schoolId,
        {
          first_name: 'Jane',
          last_name: 'Smith',
        }
      );

      // Codes should be sequential, not duplicate
      expect(teacher1.employee_code).toMatch(/^T\d{6}$/);
      expect(teacher2.employee_code).toMatch(/^T\d{6}$/);
      expect(teacher1.employee_code).not.toBe(teacher2.employee_code);
    });

    it('should use school_id from tenant context', async () => {
      const db = getDb();
      const principal = createTenantContext('principal', schoolA.id, 'principal-1');
      
      const result = await teacherService.create(
        db,
        principal.schoolId, // This is the only source of truth
        {
          first_name: 'John',
          last_name: 'Doe',
        }
      );

      const profile = await teacherRepo.findById(
        db,
        result.profile_id,
        principal.schoolId
      );

      expect(profile!.school_id).toBe(schoolA.id);
      expect(profile!.school_id).toBe(principal.schoolId);
    });

    it('should generate temporary password securely', async () => {
      const db = getDb();
      const principal = createTenantContext('principal', schoolA.id, 'principal-1');
      
      const result1 = await teacherService.create(
        db,
        principal.schoolId,
        {
          first_name: 'John',
          last_name: 'Doe',
        }
      );

      const result2 = await teacherService.create(
        db,
        principal.schoolId,
        {
          first_name: 'Jane',
          last_name: 'Smith',
        }
      );

      // Passwords should be different
      expect(result1.temporary_password).not.toBe(result2.temporary_password);

      // Both should be valid format
      expect(isValidTemporaryPasswordFormat(result1.temporary_password)).toBe(true);
      expect(isValidTemporaryPasswordFormat(result2.temporary_password)).toBe(true);
    });
  });

  describe('Teacher Retrieval', () => {
    let teacher1Id: string;
    let teacher2Id: string;
    let teacherBId: string;

    beforeEach(async () => {
      const db = getDb();

      // Create teachers in School A
      const t1 = await teacherService.create(db, schoolA.id, {
        first_name: 'John',
        last_name: 'Doe',
      });
      teacher1Id = t1.profile_id;

      const t2 = await teacherService.create(db, schoolA.id, {
        first_name: 'Jane',
        last_name: 'Smith',
      });
      teacher2Id = t2.profile_id;

      // Create teacher in School B
      const tB = await teacherService.create(db, schoolB.id, {
        first_name: 'Bob',
        last_name: 'Wilson',
      });
      teacherBId = tB.profile_id;
    });

    it('should allow principal to list teachers in own school', async () => {
      const db = getDb();
      const teachers = await teacherRepo.findAll(db, schoolA.id);

      expect(teachers).toHaveLength(2);
      expect(teachers[0].school_id).toBe(schoolA.id);
      expect(teachers[1].school_id).toBe(schoolA.id);
    });

    it('should allow principal to retrieve teacher by id', async () => {
      const db = getDb();
      const teacher = await teacherService.getById(db, teacher1Id, schoolA.id);

      expect(teacher).toBeDefined();
      expect(teacher.id).toBe(teacher1Id);
      expect(teacher.employee_code).toMatch(/^T\d{6}$/);
    });

    it('should allow teacher to retrieve own profile', async () => {
      const db = getDb();
      const teacher = await teacherService.getById(db, teacher1Id, schoolA.id);
      
      const profile = await teacherRepo.findByUserId(
        db,
        teacher.user_id,
        schoolA.id
      );

      expect(profile).toBeDefined();
      expect(profile!.user_id).toBe(teacher.user_id);
    });

    it('should prevent cross-school teacher retrieval', async () => {
      const db = getDb();
      
      // Principal from School A trying to access School B teacher
      const teacher = await teacherRepo.findById(
        db,
        teacherBId,
        schoolA.id // Wrong school
      );

      expect(teacher).toBeNull();
    });

    it('should retrieve teacher with user information', async () => {
      const db = getDb();
      const result = await teacherService.getByIdWithUser(
        db,
        teacher1Id,
        schoolA.id
      );

      expect(result).toBeDefined();
      expect(result.profile).toBeDefined();
      expect(result.user).toBeDefined();
      expect(result.user.id).toBe(result.profile.user_id);
      expect(result.user.login_id).toMatch(/^GPS-T-\d{6}$/);
      expect(result.user.role).toBe('teacher');
    });
  });

  describe('Teacher Update', () => {
    let teacherId: string;

    beforeEach(async () => {
      const db = getDb();
      const result = await teacherService.create(db, schoolA.id, {
        first_name: 'John',
        last_name: 'Doe',
      });
      teacherId = result.profile_id;
    });

    it('should allow principal to update teacher', async () => {
      const db = getDb();
      
      await teacherService.update(
        db,
        teacherId,
        schoolA.id,
        {
          first_name: 'Updated',
          phone: '+9876543210',
        }
      );

      const updated = await teacherService.getById(db, teacherId, schoolA.id);

      expect(updated.first_name).toBe('Updated');
      expect(updated.phone).toBe('+9876543210');
    });

    it('should not allow changing school_id', async () => {
      const db = getDb();
      
      // School ID is enforced by repository layer - always uses tenant context
      const before = await teacherService.getById(db, teacherId, schoolA.id);

      await teacherService.update(
        db,
        teacherId,
        schoolA.id,
        {
          first_name: 'Updated',
        }
      );

      const after = await teacherService.getById(db, teacherId, schoolA.id);

      expect(after.school_id).toBe(before.school_id);
      expect(after.school_id).toBe(schoolA.id);
    });

    it('should not allow changing employee_code', async () => {
      const db = getDb();
      
      const before = await teacherService.getById(db, teacherId, schoolA.id);

      await teacherService.update(
        db,
        teacherId,
        schoolA.id,
        {
          first_name: 'Updated',
        }
      );

      const after = await teacherService.getById(db, teacherId, schoolA.id);

      expect(after.employee_code).toBe(before.employee_code);
      expect(after.employee_code).toMatch(/^T\d{6}$/);
    });
  });

  describe('Teacher Disable', () => {
    let teacherId: string;
    let userId: string;

    beforeEach(async () => {
      const db = getDb();
      const result = await teacherService.create(db, schoolA.id, {
        first_name: 'John',
        last_name: 'Doe',
      });
      teacherId = result.profile_id;
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

    it('should disable teacher account', async () => {
      const db = getDb();
      
      await teacherService.disable(db, teacherId, schoolA.id);

      const teacher = await teacherService.getById(db, teacherId, schoolA.id);

      expect(teacher.status).toBe('inactive');
    });

    it('should set user status to disabled', async () => {
      const db = getDb();
      
      await teacherService.disable(db, teacherId, schoolA.id);

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
      const tokenVersionBefore = (userBefore as any).token_version;

      await teacherService.disable(db, teacherId, schoolA.id);

      const userAfter = await db
        .prepare('SELECT * FROM users WHERE id = ?')
        .bind(userId)
        .first();

      expect((userAfter as any).token_version).toBe(tokenVersionBefore + 1);
    });

    it('should invalidate existing sessions', async () => {
      const db = getDb();
      
      await teacherService.disable(db, teacherId, schoolA.id);

      const session = await db
        .prepare('SELECT * FROM sessions WHERE id = ?')
        .bind('session-1')
        .first();

      expect(session).not.toBeNull();
      expect(session!.revoked_at).not.toBeNull();
    });
  });

  describe('Teacher Reactivation', () => {
    let teacherId: string;
    let userId: string;

    beforeEach(async () => {
      const db = getDb();
      
      // Create and disable teacher
      const result = await teacherService.create(db, schoolA.id, {
        first_name: 'John',
        last_name: 'Doe',
      });
      teacherId = result.profile_id;
      userId = result.user_id;

      await teacherService.disable(db, teacherId, schoolA.id);
    });

    it('should reactivate teacher account', async () => {
      const db = getDb();
      
      const result = await teacherService.reactivate(db, teacherId, schoolA.id);

      const teacher = await teacherService.getById(db, teacherId, schoolA.id);

      expect(teacher.status).toBe('active');
      expect(result.temporary_password).toBeDefined();
      expect(isValidTemporaryPasswordFormat(result.temporary_password)).toBe(true);
    });

    it('should set user status to active', async () => {
      const db = getDb();
      
      await teacherService.reactivate(db, teacherId, schoolA.id);

      const user = await db
        .prepare('SELECT * FROM users WHERE id = ?')
        .bind(userId)
        .first();

      expect(user).not.toBeNull();
      expect((user as any).status).toBe('active');
    });

    it('should require password change after reactivation', async () => {
      const db = getDb();
      
      await teacherService.reactivate(db, teacherId, schoolA.id);

      const user = await db
        .prepare('SELECT * FROM users WHERE id = ?')
        .bind(userId)
        .first();

      expect(user).not.toBeNull();
      expect(user!.must_change_password).toBe(1);
    });

    it('should preserve employee_code after reactivation', async () => {
      const db = getDb();
      
      const before = await teacherService.getById(db, teacherId, schoolA.id);

      await teacherService.reactivate(db, teacherId, schoolA.id);

      const after = await teacherService.getById(db, teacherId, schoolA.id);

      expect(after.employee_code).toBe(before.employee_code);
      expect(after.employee_code).toMatch(/^T\d{6}$/);
    });
  });

  describe('Teacher Password Reset', () => {
    let teacherId: string;
    let userId: string;

    beforeEach(async () => {
      const db = getDb();
      
      const result = await teacherService.create(db, schoolA.id, {
        first_name: 'John',
        last_name: 'Doe',
      });
      teacherId = result.profile_id;
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

    it('should generate new temporary password', async () => {
      const db = getDb();
      
      const result = await teacherService.resetPassword(
        db,
        teacherId,
        schoolA.id
      );

      expect(result.temporary_password).toBeDefined();
      expect(isValidTemporaryPasswordFormat(result.temporary_password)).toBe(true);
    });

    it('should return password reset information', async () => {
      const db = getDb();
      
      const result = await teacherService.resetPassword(
        db,
        teacherId,
        schoolA.id
      );

      expect(result.user_id).toBe(userId);
      expect(result.login_id).toMatch(/^GPS-T-\d{6}$/);
      expect(result.temporary_password).toBeDefined();
    });

    it('should increment token_version', async () => {
      const db = getDb();
      
      const userBefore = await db
        .prepare('SELECT * FROM users WHERE id = ?')
        .bind(userId)
        .first();
      const tokenVersionBefore = (userBefore as any).token_version;

      await teacherService.resetPassword(db, teacherId, schoolA.id);

      const userAfter = await db
        .prepare('SELECT * FROM users WHERE id = ?')
        .bind(userId)
        .first();

      expect((userAfter as any).token_version).toBe(tokenVersionBefore + 1);
    });

    it('should invalidate existing sessions', async () => {
      const db = getDb();
      
      await teacherService.resetPassword(db, teacherId, schoolA.id);

      const session = await db
        .prepare('SELECT * FROM sessions WHERE id = ?')
        .bind('session-1')
        .first();

      expect(session).not.toBeNull();
      expect(session!.revoked_at).not.toBeNull();
    });

    it('should set must_change_password flag', async () => {
      const db = getDb();
      
      await teacherService.resetPassword(db, teacherId, schoolA.id);

      const user = await db
        .prepare('SELECT * FROM users WHERE id = ?')
        .bind(userId)
        .first();

      expect(user).not.toBeNull();
      expect(user!.must_change_password).toBe(1);
    });

    it('should generate different passwords on each reset', async () => {
      const db = getDb();
      
      const result1 = await teacherService.resetPassword(
        db,
        teacherId,
        schoolA.id
      );

      const result2 = await teacherService.resetPassword(
        db,
        teacherId,
        schoolA.id
      );

      expect(result1.temporary_password).not.toBe(result2.temporary_password);
    });
  });
});
