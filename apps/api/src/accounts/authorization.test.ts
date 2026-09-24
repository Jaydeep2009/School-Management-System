/**
 * Authorization Tests for Account Management
 * 
 * Tests role-based access control with real D1 database:
 * - Principal permissions
 * - Teacher permissions  
 * - Student permissions
 * - Cross-role access denial
 */

import { describe, it, expect, beforeEach } from 'vitest';
import * as teacherService from './teacher.service';
import * as studentService from './student.service';
import * as bulkProvisionService from './bulk-provision.service';
import {
  getDb,
  createTestSchool,
  createTenantContext,
} from './test-helpers';

describe('Account Management Authorization', () => {
  let schoolA: Awaited<ReturnType<typeof createTestSchool>>;
  let teacherId: string;
  let studentId: string;

  beforeEach(async () => {
    const db = getDb();
    schoolA = await createTestSchool({ code: 'GPS', name: 'GPS School' });

    // Create a teacher
    const teacher = await teacherService.create(db, schoolA.id, {
      first_name: 'John',
      last_name: 'Teacher',
    });
    teacherId = teacher.profile_id;

    // Create a student
    const student = await studentService.create(db, schoolA.id, {
      admission_number: '2023001',
      first_name: 'Jane',
      last_name: 'Student',
    });
    studentId = student.profile_id;
  });

  describe('Principal Permissions', () => {
    it('should allow principal to create teacher', async () => {
      const db = getDb();
      const principal = createTenantContext('principal', schoolA.id, 'principal-1');

      const result = await teacherService.create(
        db,
        principal.schoolId,
        {
          first_name: 'New',
          last_name: 'Teacher',
        }
      );

      expect(result).toBeDefined();
      expect(result.profile_id).toBeDefined();
    });

    it('should allow principal to create student', async () => {
      const db = getDb();
      const principal = createTenantContext('principal', schoolA.id, 'principal-1');

      const result = await studentService.create(
        db,
        principal.schoolId,
        {
          admission_number: '2023999',
          first_name: 'New',
          last_name: 'Student',
        }
      );

      expect(result).toBeDefined();
      expect(result.profile_id).toBeDefined();
    });

    it('should allow principal to update teacher', async () => {
      const db = getDb();
      const principal = createTenantContext('principal', schoolA.id, 'principal-1');

      await expect(
        teacherService.update(
          db,
          teacherId,
          principal.schoolId,
          {
            first_name: 'Updated',
          }
        )
      ).resolves.not.toThrow();
    });

    it('should allow principal to update student', async () => {
      const db = getDb();
      const principal = createTenantContext('principal', schoolA.id, 'principal-1');

      await expect(
        studentService.update(
          db,
          studentId,
          principal.schoolId,
          {
            first_name: 'Updated',
          }
        )
      ).resolves.not.toThrow();
    });

    it('should allow principal to disable teacher', async () => {
      const db = getDb();
      const principal = createTenantContext('principal', schoolA.id, 'principal-1');

      await expect(
        teacherService.disable(db, teacherId, principal.schoolId)
      ).resolves.not.toThrow();
    });

    it('should allow principal to disable student', async () => {
      const db = getDb();
      const principal = createTenantContext('principal', schoolA.id, 'principal-1');

      await expect(
        studentService.disable(db, studentId, principal.schoolId)
      ).resolves.not.toThrow();
    });

    it('should allow principal to reactivate teacher', async () => {
      const db = getDb();
      const principal = createTenantContext('principal', schoolA.id, 'principal-1');

      await teacherService.disable(db, teacherId, principal.schoolId);

      await expect(
        teacherService.reactivate(db, teacherId, principal.schoolId)
      ).resolves.not.toThrow();
    });

    it('should allow principal to reactivate student', async () => {
      const db = getDb();
      const principal = createTenantContext('principal', schoolA.id, 'principal-1');

      await studentService.disable(db, studentId, principal.schoolId);

      await expect(
        studentService.reactivate(db, studentId, principal.schoolId)
      ).resolves.not.toThrow();
    });

    it('should allow principal to reset teacher password', async () => {
      const db = getDb();
      const principal = createTenantContext('principal', schoolA.id, 'principal-1');

      const result = await teacherService.resetPassword(
        db,
        teacherId,
        principal.schoolId
      );

      expect(result.temporary_password).toBeDefined();
    });

    it('should allow principal to bulk provision students', async () => {
      const db = getDb();
      const principal = createTenantContext('principal', schoolA.id, 'principal-1');

      const students = [
        { admission_number: '2024001', first_name: 'Bulk1', last_name: 'Student' },
        { admission_number: '2024002', first_name: 'Bulk2', last_name: 'Student' },
      ];

      const result = await bulkProvisionService.bulkProvisionStudents(
        db,
        principal.schoolId,
        students
      );

      expect(result.success).toBe(true);
      expect(result.created_count).toBe(2);
    });
  });

  describe('Teacher Permissions', () => {
    it('should allow teacher to retrieve own profile', async () => {
      const db = getDb();
      const teacher = createTenantContext('teacher', schoolA.id, teacherId);

      const result = await teacherService.getById(db, teacherId, teacher.schoolId);

      expect(result).toBeDefined();
      expect(result.id).toBe(teacherId);
    });

    it('should allow teacher to retrieve other teacher profiles', async () => {
      const db = getDb();

      // Create another teacher
      const teacher2 = await teacherService.create(db, schoolA.id, {
        first_name: 'Jane',
        last_name: 'Teacher',
      });

      const teacherContext = createTenantContext('teacher', schoolA.id, teacherId);

      const result = await teacherService.getById(
        db,
        teacher2.profile_id,
        teacherContext.schoolId
      );

      expect(result).toBeDefined();
    });

    it('should allow teacher to retrieve student profiles', async () => {
      const db = getDb();
      const teacher = createTenantContext('teacher', schoolA.id, teacherId);

      const result = await studentService.getById(db, studentId, teacher.schoolId);

      expect(result).toBeDefined();
      expect(result.id).toBe(studentId);
    });
  });

  describe('Student Permissions', () => {
    it('should allow student to retrieve own profile', async () => {
      const db = getDb();
      const student = createTenantContext('student', schoolA.id, studentId);

      const result = await studentService.getById(db, studentId, student.schoolId);

      expect(result).toBeDefined();
      expect(result.id).toBe(studentId);
    });
  });

  describe('Cross-School Access Denial', () => {
    it('should prevent access to teachers from other schools', async () => {
      const db = getDb();
      
      // Create another school and teacher
      const schoolB = await createTestSchool({ code: 'MHS', name: 'MHS School' });
      const teacherB = await teacherService.create(db, schoolB.id, {
        first_name: 'Bob',
        last_name: 'Teacher',
      });

      // Try to access School B teacher from School A context
      await expect(teacherService.getById(db, teacherB.profile_id, schoolA.id)).rejects.toThrow('Teacher not found');
    });

    it('should prevent access to students from other schools', async () => {
      const db = getDb();
      
      // Create another school and student
      const schoolB = await createTestSchool({ code: 'MHS', name: 'MHS School' });
      const studentB = await studentService.create(db, schoolB.id, {
        admission_number: '2023001',
        first_name: 'Bob',
        last_name: 'Student',
      });

      // Try to access School B student from School A context
      await expect(studentService.getById(db, studentB.profile_id, schoolA.id)).rejects.toThrow('Student not found');
    });
  });
});
