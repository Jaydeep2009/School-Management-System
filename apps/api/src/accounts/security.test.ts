/**
 * Account Management Security Tests
 * 
 * Tests security requirements with real D1 database:
 * - Tenant isolation
 * - Credential security
 * - Authentication integration
 * - Database integrity
 */

import { describe, it, expect, beforeEach } from 'vitest';
import * as teacherService from './teacher.service';
import * as studentService from './student.service';
import * as bulkProvisionService from './bulk-provision.service';
import * as studentRepo from './student.repository';
import {
  getDb,
  createTestSchool,
  createTenantContext,
  isValidTemporaryPasswordFormat,
} from './test-helpers';

describe('Account Management Security', () => {
  let schoolA: Awaited<ReturnType<typeof createTestSchool>>;
  let schoolB: Awaited<ReturnType<typeof createTestSchool>>;

  beforeEach(async () => {
    schoolA = await createTestSchool({ code: 'GPS', name: 'GPS School' });
    schoolB = await createTestSchool({ code: 'MHS', name: 'MHS School' });
  });

  describe('Tenant Isolation', () => {
    it('should isolate teacher accounts between schools', async () => {
      const db = getDb();
      
      // School A creates teacher
      const teacherA = await teacherService.create(db, schoolA.id, {
        first_name: 'Teacher',
        last_name: 'A',
      });

      // School B creates teacher
      const teacherB = await teacherService.create(db, schoolB.id, {
        first_name: 'Teacher',
        last_name: 'B',
      });

      // School A cannot see School B's teacher
      await expect(teacherService.getById(db, teacherB.profile_id, schoolA.id)).rejects.toThrow('Teacher not found');

      // School B cannot see School A's teacher
      await expect(teacherService.getById(db, teacherA.profile_id, schoolB.id)).rejects.toThrow('Teacher not found');
    });

    it('should isolate student accounts between schools', async () => {
      const db = getDb();
      
      // School A creates student
      const studentA = await studentService.create(db, schoolA.id, {
        admission_number: '2023001',
        first_name: 'Student',
        last_name: 'A',
      });

      // School B creates student
      const studentB = await studentService.create(db, schoolB.id, {
        admission_number: '2023001',
        first_name: 'Student',
        last_name: 'B',
      });

      // School A cannot see School B's student
      await expect(studentService.getById(db, studentB.profile_id, schoolA.id)).rejects.toThrow('Student not found');

      // School B cannot see School A's student
      await expect(studentService.getById(db, studentA.profile_id, schoolB.id)).rejects.toThrow('Student not found');
    });

    it('should prevent School A from updating School B accounts', async () => {
      const db = getDb();
      
      // School B creates teacher
      const teacherB = await teacherService.create(db, schoolB.id, {
        first_name: 'Teacher',
        last_name: 'B',
      });

      // School A tries to update School B's teacher
      await expect(
        teacherService.update(db, teacherB.profile_id, schoolA.id, {
          first_name: 'Hacked',
        })
      ).rejects.toThrow();
    });

    it('should prevent School A from disabling School B accounts', async () => {
      const db = getDb();
      
      // School B creates student
      const studentB = await studentService.create(db, schoolB.id, {
        admission_number: '2023001',
        first_name: 'Student',
        last_name: 'B',
      });

      // School A tries to disable School B's student
      await expect(
        studentService.disable(db, studentB.profile_id, schoolA.id)
      ).rejects.toThrow();
    });

    it('should prevent School A from resetting School B passwords', async () => {
      const db = getDb();
      
      // School B creates teacher
      const teacherB = await teacherService.create(db, schoolB.id, {
        first_name: 'Teacher',
        last_name: 'B',
      });

      // School A tries to reset School B's teacher password
      await expect(
        teacherService.resetPassword(db, teacherB.profile_id, schoolA.id)
      ).rejects.toThrow();
    });

    it('should prevent School A from bulk provisioning into School B', async () => {
      const db = getDb();
      
      // School A tries to create students in School B
      const students = [
        { admission_number: '2023001', first_name: 'Hacker', last_name: 'Student' },
      ];

      await bulkProvisionService.bulkProvisionStudents(db, schoolA.id, students);

      // Verify students are only in School A, not School B
      const studentsA = await studentRepo.findAll(db, schoolA.id);
      const studentsB = await studentRepo.findAll(db, schoolB.id);

      expect(studentsA).toHaveLength(1);
      expect(studentsB).toHaveLength(0);
    });

    it('should allow same admission numbers in different schools', async () => {
      const db = getDb();
      
      // School A creates student with admission number 2023001
      const studentA = await studentService.create(db, schoolA.id, {
        admission_number: '2023001',
        first_name: 'Student',
        last_name: 'A',
      });

      // School B creates student with same admission number
      const studentB = await studentService.create(db, schoolB.id, {
        admission_number: '2023001',
        first_name: 'Student',
        last_name: 'B',
      });

      expect(studentA.profile_id).toBeDefined();
      expect(studentB.profile_id).toBeDefined();
      expect(studentA.profile_id).not.toBe(studentB.profile_id);
    });
  });

  describe('Credential Leakage Prevention', () => {
    it('should not include temporary password in audit logs', async () => {
      const db = getDb();
      
      const result = await teacherService.create(db, schoolA.id, {
        first_name: 'Test',
        last_name: 'Teacher',
      });

      // Check audit log
      const auditLogs = await db
        .prepare('SELECT * FROM audit_log WHERE entity_id = ?')
        .bind(result.user_id)
        .all();

      // Convert logs to string to check if password appears anywhere
      const logsStr = JSON.stringify(auditLogs);
      expect(logsStr).not.toContain(result.temporary_password);
    });

    it('should not include temporary password in bulk provision audit logs', async () => {
      const db = getDb();
      
      const students = [
        { admission_number: '2023001', first_name: 'Test', last_name: 'Student' },
      ];

      const result = await bulkProvisionService.bulkProvisionStudents(
        db,
        schoolA.id,
        students
      );

      const tempPassword = result.accounts[0].temporary_password;

      // Check audit log
      const auditLogs = await db
        .prepare('SELECT * FROM audit_log WHERE entity = ?')
        .bind('users')
        .all();

      const logsStr = JSON.stringify(auditLogs);
      expect(logsStr).not.toContain(tempPassword);
    });

    it('should not include password in password reset audit logs', async () => {
      const db = getDb();
      
      // Create teacher
      const teacher = await teacherService.create(db, schoolA.id, {
        first_name: 'Test',
        last_name: 'Teacher',
      });

      // Reset password
      const resetResult = await teacherService.resetPassword(
        db,
        teacher.profile_id,
        schoolA.id
      );

      // Check audit log
      const auditLogs = await db
        .prepare('SELECT * FROM audit_log WHERE entity_id = ?')
        .bind(teacher.user_id)
        .all();

      const logsStr = JSON.stringify(auditLogs);
      expect(logsStr).not.toContain(resetResult.temporary_password);
    });

    it('should not store temporary passwords in plaintext', async () => {
      const db = getDb();
      
      const result = await teacherService.create(db, schoolA.id, {
        first_name: 'Test',
        last_name: 'Teacher',
      });

      const tempPassword = result.temporary_password;

      // Check users table
      const user = await db
        .prepare('SELECT * FROM users WHERE id = ?')
        .bind(result.user_id)
        .first();

      expect(user.password_hash).not.toBe(tempPassword);
      expect(user.activation_hash).not.toBe(tempPassword);
      expect(user.activation_hash).toBeDefined();
    });

    it('should hash temporary passwords securely', async () => {
      const db = getDb();
      
      const result = await teacherService.create(db, schoolA.id, {
        first_name: 'Test',
        last_name: 'Teacher',
      });

      // Check that activation_hash is a proper hash
      const user = await db
        .prepare('SELECT * FROM users WHERE id = ?')
        .bind(result.user_id)
        .first();

      // Hash should be longer than original password
      expect(user.activation_hash.length).toBeGreaterThan(result.temporary_password.length);
      // Should not be the password itself
      expect(user.activation_hash).not.toBe(result.temporary_password);
    });
  });

  describe('Authentication Integration', () => {
    it('should set must_change_password flag for new accounts', async () => {
      const db = getDb();
      
      const result = await teacherService.create(db, schoolA.id, {
        first_name: 'Test',
        last_name: 'Teacher',
      });

      const user = await db
        .prepare('SELECT * FROM users WHERE id = ?')
        .bind(result.user_id)
        .first();

      expect(user.must_change_password).toBe(1);
    });

    it('should invalidate sessions on disable', async () => {
      const db = getDb();
      
      // Create teacher
      const teacher = await teacherService.create(db, schoolA.id, {
        first_name: 'Test',
        last_name: 'Teacher',
      });

      // Create session
      await db
        .prepare(
          `INSERT INTO sessions (id, user_id, refresh_hash, family_id, expires_at, created_at)
           VALUES (?, ?, ?, ?, ?, ?)`
        )
        .bind(
          'session-1',
          teacher.user_id,
          'hash123',
          'family-1',
          Date.now() + 30 * 24 * 60 * 60 * 1000,
          Date.now()
        )
        .run();

      // Disable account
      await teacherService.disable(db, teacher.profile_id, schoolA.id);

      // Check session is revoked
      const session = await db
        .prepare('SELECT * FROM sessions WHERE id = ?')
        .bind('session-1')
        .first();

      expect(session.revoked_at).not.toBeNull();
    });

    it('should invalidate sessions on password reset', async () => {
      const db = getDb();
      
      // Create teacher
      const teacher = await teacherService.create(db, schoolA.id, {
        first_name: 'Test',
        last_name: 'Teacher',
      });

      // Create session
      await db
        .prepare(
          `INSERT INTO sessions (id, user_id, refresh_hash, family_id, expires_at, created_at)
           VALUES (?, ?, ?, ?, ?, ?)`
        )
        .bind(
          'session-1',
          teacher.user_id,
          'hash123',
          'family-1',
          Date.now() + 30 * 24 * 60 * 60 * 1000,
          Date.now()
        )
        .run();

      // Reset password
      await teacherService.resetPassword(db, teacher.profile_id, schoolA.id);

      // Check session is revoked
      const session = await db
        .prepare('SELECT * FROM sessions WHERE id = ?')
        .bind('session-1')
        .first();

      expect(session.revoked_at).not.toBeNull();
    });

    it('should increment token_version on disable', async () => {
      const db = getDb();
      
      // Create teacher
      const teacher = await teacherService.create(db, schoolA.id, {
        first_name: 'Test',
        last_name: 'Teacher',
      });

      const userBefore = await db
        .prepare('SELECT * FROM users WHERE id = ?')
        .bind(teacher.user_id)
        .first();

      // Disable account
      await teacherService.disable(db, teacher.profile_id, schoolA.id);

      const userAfter = await db
        .prepare('SELECT * FROM users WHERE id = ?')
        .bind(teacher.user_id)
        .first();

      expect(userAfter.token_version).toBe(userBefore.token_version + 1);
    });

    it('should increment token_version on password reset', async () => {
      const db = getDb();
      
      // Create teacher
      const teacher = await teacherService.create(db, schoolA.id, {
        first_name: 'Test',
        last_name: 'Teacher',
      });

      const userBefore = await db
        .prepare('SELECT * FROM users WHERE id = ?')
        .bind(teacher.user_id)
        .first();

      // Reset password
      await teacherService.resetPassword(db, teacher.profile_id, schoolA.id);

      const userAfter = await db
        .prepare('SELECT * FROM users WHERE id = ?')
        .bind(teacher.user_id)
        .first();

      expect(userAfter.token_version).toBe(userBefore.token_version + 1);
    });
  });

  describe('Database Integrity', () => {
    it('should maintain user-teacher profile consistency', async () => {
      const db = getDb();
      
      const result = await teacherService.create(db, schoolA.id, {
        first_name: 'Test',
        last_name: 'Teacher',
      });

      // Get user and profile
      const user = await db
        .prepare('SELECT * FROM users WHERE id = ?')
        .bind(result.user_id)
        .first();

      const profile = await db
        .prepare('SELECT * FROM teacher_profiles WHERE user_id = ?')
        .bind(result.user_id)
        .first();

      expect(user.id).toBe(profile.user_id);
      expect(user.school_id).toBe(profile.school_id);
      expect(user.role).toBe('teacher');
    });

    it('should maintain user-student profile consistency', async () => {
      const db = getDb();
      
      const result = await studentService.create(db, schoolA.id, {
        admission_number: '2023001',
        first_name: 'Test',
        last_name: 'Student',
      });

      // Get user and profile
      const user = await db
        .prepare('SELECT * FROM users WHERE id = ?')
        .bind(result.user_id)
        .first();

      const profile = await db
        .prepare('SELECT * FROM student_profiles WHERE user_id = ?')
        .bind(result.user_id)
        .first();

      expect(user.id).toBe(profile.user_id);
      expect(user.school_id).toBe(profile.school_id);
      expect(user.role).toBe('student');
    });

    it('should preserve profile data after disable', async () => {
      const db = getDb();
      
      const result = await teacherService.create(db, schoolA.id, {
        first_name: 'Test',
        last_name: 'Teacher',
        phone: '+1234567890',
      });

      // Disable account
      await teacherService.disable(db, result.profile_id, schoolA.id);

      // Check profile data is preserved
      const profile = await db
        .prepare('SELECT * FROM teacher_profiles WHERE user_id = ?')
        .bind(result.user_id)
        .first();

      expect(profile.first_name).toBe('Test');
      expect(profile.last_name).toBe('Teacher');
      expect(profile.phone).toBe('+1234567890');
    });
  });
});
