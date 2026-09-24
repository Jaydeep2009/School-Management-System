/**
 * Bulk Student Provisioning Tests
 * 
 * Tests bulk student provisioning using real D1 database:
 * - Batch validation
 * - Duplicate detection
 * - All-or-nothing behavior
 * - Security requirements
 */

import { describe, it, expect, beforeEach } from 'vitest';
import * as bulkProvisionService from './bulk-provision.service';
import * as studentRepo from './student.repository';
import {
  getDb,
  createTestSchool,
  isValidTemporaryPasswordFormat,
} from './test-helpers';

describe('Bulk Student Provisioning', () => {
  let schoolA: Awaited<ReturnType<typeof createTestSchool>>;
  let schoolB: Awaited<ReturnType<typeof createTestSchool>>;

  beforeEach(async () => {
    schoolA = await createTestSchool({ code: 'GPS', name: 'GPS School' });
    schoolB = await createTestSchool({ code: 'MHS', name: 'MHS School' });
  });

  describe('Valid Batch', () => {
    it('should successfully provision small batch', async () => {
      const db = getDb();
      
      const students = [
        { admission_number: '2023001', first_name: 'Jane', last_name: 'Smith' },
        { admission_number: '2023002', first_name: 'Bob', last_name: 'Johnson' },
        { admission_number: '2023003', first_name: 'Alice', last_name: 'Williams' },
      ];

      const result = await bulkProvisionService.bulkProvisionStudents(
        db,
        schoolA.id,
        students
      );

      expect(result.success).toBe(true);
      expect(result.created_count).toBe(3);
      expect(result.accounts).toHaveLength(3);

      // Verify all were created
      const allStudents = await studentRepo.findAll(db, schoolA.id);
      expect(allStudents).toHaveLength(3);
    });

    it('should generate unique student codes', async () => {
      const db = getDb();
      
      const students = [
        { admission_number: '2023001', first_name: 'Jane', last_name: 'Smith' },
        { admission_number: '2023002', first_name: 'Bob', last_name: 'Johnson' },
      ];

      const result = await bulkProvisionService.bulkProvisionStudents(
        db,
        schoolA.id,
        students
      );

      const codes = result.accounts.map(a => a.employee_code);
      const uniqueCodes = new Set(codes);

      expect(uniqueCodes.size).toBe(codes.length);
    });

    it('should generate unique login IDs', async () => {
      const db = getDb();
      
      const students = [
        { admission_number: '2023001', first_name: 'Jane', last_name: 'Smith' },
        { admission_number: '2023002', first_name: 'Bob', last_name: 'Johnson' },
      ];

      const result = await bulkProvisionService.bulkProvisionStudents(
        db,
        schoolA.id,
        students
      );

      const loginIds = result.accounts.map(a => a.login_id);
      const uniqueIds = new Set(loginIds);

      expect(uniqueIds.size).toBe(loginIds.length);
    });

    it('should generate unique temporary passwords', async () => {
      const db = getDb();
      
      const students = [
        { admission_number: '2023001', first_name: 'Jane', last_name: 'Smith' },
        { admission_number: '2023002', first_name: 'Bob', last_name: 'Johnson' },
      ];

      const result = await bulkProvisionService.bulkProvisionStudents(
        db,
        schoolA.id,
        students
      );

      const passwords = result.accounts.map(a => a.temporary_password);
      const uniquePasswords = new Set(passwords);

      expect(uniquePasswords.size).toBe(passwords.length);
      passwords.forEach(pwd => {
        expect(isValidTemporaryPasswordFormat(pwd)).toBe(true);
      });
    });

    it('should provision larger batch successfully', async () => {
      const db = getDb();
      
      const students = Array.from({ length: 50 }, (_, i) => ({
        admission_number: `2023${String(i + 1).padStart(3, '0')}`,
        first_name: `Student`,
        last_name: `${i + 1}`,
      }));

      const result = await bulkProvisionService.bulkProvisionStudents(
        db,
        schoolA.id,
        students
      );

      expect(result.success).toBe(true);
      expect(result.created_count).toBe(50);
    });
  });

  describe('Batch Size Validation', () => {
    it('should reject empty batch', async () => {
      const db = getDb();
      
      await expect(
        bulkProvisionService.bulkProvisionStudents(db, schoolA.id, [])
      ).rejects.toThrow('No students provided');
    });

    it('should enforce maximum batch size of 100', async () => {
      const db = getDb();
      
      const students = Array.from({ length: 101 }, (_, i) => ({
        admission_number: `2023${String(i + 1).padStart(3, '0')}`,
        first_name: `Student`,
        last_name: `${i + 1}`,
      }));

      await expect(
        bulkProvisionService.bulkProvisionStudents(db, schoolA.id, students)
      ).rejects.toThrow('Batch size exceeds maximum of 100 students');
    });

    it('should allow exactly 100 students', async () => {
      const db = getDb();
      
      const students = Array.from({ length: 100 }, (_, i) => ({
        admission_number: `2023${String(i + 1).padStart(3, '0')}`,
        first_name: `Student`,
        last_name: `${i + 1}`,
      }));

      const result = await bulkProvisionService.bulkProvisionStudents(
        db,
        schoolA.id,
        students
      );

      expect(result.success).toBe(true);
      expect(result.created_count).toBe(100);
    });
  });

  describe('Duplicate Detection - Within Batch', () => {
    it('should reject batch with duplicate admission numbers', async () => {
      const db = getDb();
      
      const students = [
        { admission_number: '2023001', first_name: 'Jane', last_name: 'Smith' },
        { admission_number: '2023001', first_name: 'Bob', last_name: 'Johnson' },
      ];

      await expect(
        bulkProvisionService.bulkProvisionStudents(db, schoolA.id, students)
      ).rejects.toThrow();
    });

    it('should detect multiple duplicates in batch', async () => {
      const db = getDb();
      
      const students = [
        { admission_number: '2023001', first_name: 'Jane', last_name: 'Smith' },
        { admission_number: '2023001', first_name: 'Bob', last_name: 'Johnson' },
        { admission_number: '2023002', first_name: 'Alice', last_name: 'Williams' },
        { admission_number: '2023002', first_name: 'Charlie', last_name: 'Brown' },
      ];

      await expect(
        bulkProvisionService.bulkProvisionStudents(db, schoolA.id, students)
      ).rejects.toThrow();
    });
  });

  describe('Duplicate Detection - Against Database', () => {
    it('should reject batch if admission number exists in database', async () => {
      const db = getDb();
      
      // Create existing student
      await bulkProvisionService.bulkProvisionStudents(db, schoolA.id, [
        { admission_number: '2023001', first_name: 'Existing', last_name: 'Student' },
      ]);

      // Try to create batch with same admission number
      const students = [
        { admission_number: '2023001', first_name: 'Jane', last_name: 'Smith' },
        { admission_number: '2023002', first_name: 'Bob', last_name: 'Johnson' },
      ];

      await expect(
        bulkProvisionService.bulkProvisionStudents(db, schoolA.id, students)
      ).rejects.toThrow();
    });
  });

  describe('Row-Level Validation', () => {
    it('should reject rows with missing required fields', async () => {
      const db = getDb();
      
      const students = [
        { admission_number: '', first_name: 'Jane', last_name: 'Smith' },
        { admission_number: '2023002', first_name: '', last_name: 'Johnson' },
        { admission_number: '2023003', first_name: 'Alice', last_name: '' },
      ];

      await expect(
        bulkProvisionService.bulkProvisionStudents(db, schoolA.id, students as any)
      ).rejects.toThrow('Validation failed');
    });

    it('should provide detailed row-level error messages', async () => {
      const db = getDb();
      
      const students = [
        { admission_number: '2023001', first_name: 'Jane', last_name: 'Smith' },
        { admission_number: '', first_name: '', last_name: 'Johnson' },
      ];

      try {
        await bulkProvisionService.bulkProvisionStudents(db, schoolA.id, students as any);
        throw new Error('Should have thrown');
      } catch (error: any) {
        expect(error.message).toContain('Validation failed');
        expect(error.rowErrors).toBeDefined();
      }
    });
  });

  describe('All-or-Nothing Behavior', () => {
    it('should not create any students if validation fails', async () => {
      const db = getDb();
      
      const students = [
        { admission_number: '2023001', first_name: 'Jane', last_name: 'Smith' },
        { admission_number: '', first_name: 'Bob', last_name: 'Johnson' }, // Invalid
      ];

      try {
        await bulkProvisionService.bulkProvisionStudents(db, schoolA.id, students as any);
      } catch {
        // Expected to fail
      }

      // Verify nothing was created
      const allStudents = await studentRepo.findAll(db, schoolA.id);
      expect(allStudents).toHaveLength(0);
    });

    it('should validate all rows before creating any accounts', async () => {
      const db = getDb();
      
      const students = [
        { admission_number: '2023001', first_name: 'Jane', last_name: 'Smith' },
        { admission_number: '2023002', first_name: 'Bob', last_name: 'Johnson' },
        { admission_number: '', first_name: 'Alice', last_name: 'Williams' }, // Invalid at end
      ];

      try {
        await bulkProvisionService.bulkProvisionStudents(db, schoolA.id, students as any);
      } catch {
        // Expected to fail
      }

      // Verify nothing was created (not even the first two valid rows)
      const allStudents = await studentRepo.findAll(db, schoolA.id);
      expect(allStudents).toHaveLength(0);
    });
  });

  describe('Security - School ID Injection', () => {
    it('should use school_id from function parameter only', async () => {
      const db = getDb();
      
      const students = [
        { admission_number: '2023001', first_name: 'Jane', last_name: 'Smith' },
      ];

      await bulkProvisionService.bulkProvisionStudents(
        db,
        schoolA.id, // This is the authoritative school_id
        students
      );

      // Verify student was created in School A
      const studentsA = await studentRepo.findAll(db, schoolA.id);
      expect(studentsA).toHaveLength(1);

      // Verify NOT in School B
      const studentsB = await studentRepo.findAll(db, schoolB.id);
      expect(studentsB).toHaveLength(0);
    });
  });

  describe('Security - Role Injection', () => {
    it('should always create students with student role', async () => {
      const db = getDb();
      
      const students = [
        { admission_number: '2023001', first_name: 'Jane', last_name: 'Smith' },
      ];

      const result = await bulkProvisionService.bulkProvisionStudents(
        db,
        schoolA.id,
        students
      );

      // Verify user has student role
      const user = await db
        .prepare('SELECT * FROM users WHERE id = ?')
        .bind(result.accounts[0].user_id)
        .first();

      expect(user.role).toBe('student');
    });
  });

  describe('Credential Security', () => {
    it('should return temporary passwords in response', async () => {
      const db = getDb();
      
      const students = [
        { admission_number: '2023001', first_name: 'Jane', last_name: 'Smith' },
      ];

      const result = await bulkProvisionService.bulkProvisionStudents(
        db,
        schoolA.id,
        students
      );

      expect(result.accounts[0].temporary_password).toBeDefined();
      expect(isValidTemporaryPasswordFormat(result.accounts[0].temporary_password)).toBe(true);
    });

    it('should not store temporary passwords in plaintext', async () => {
      const db = getDb();
      
      const students = [
        { admission_number: '2023001', first_name: 'Jane', last_name: 'Smith' },
      ];

      const result = await bulkProvisionService.bulkProvisionStudents(
        db,
        schoolA.id,
        students
      );

      const tempPassword = result.accounts[0].temporary_password;

      // Check users table
      const user = await db
        .prepare('SELECT * FROM users WHERE id = ?')
        .bind(result.accounts[0].user_id)
        .first();

      expect(user.password_hash).not.toBe(tempPassword);
      expect(user.activation_hash).not.toBe(tempPassword);
      expect(user.activation_hash).toBeDefined();
    });
  });
});
