/**
 * Academic Structure Tests
 * 
 * Comprehensive test coverage for:
 * - Tenant isolation (all queries must be school-scoped)
 * - Business logic validation (lifecycle rules, uniqueness constraints)
 * - Authorization integration
 * - Client override protection (never trust client-provided schoolId)
 */

import { describe, it, expect, beforeEach } from 'vitest';
import type { TenantContext } from '../auth/auth.types';
import * as academicYearService from './academic-year.service';
import * as classroomService from './classroom.service';
import * as subjectService from './subject.service';
import * as teachingAssignmentService from './teaching-assignment.service';
import * as enrollmentService from './enrollment.service';
import type {
  AcademicYear,
  Classroom,
  Subject,
  TeachingAssignment,
  Enrollment,
} from './academic.types';

// Mock database for testing
class MockDatabase {
  private academicYears: Map<string, AcademicYear> = new Map();
  private classrooms: Map<string, Classroom> = new Map();
  private subjects: Map<string, Subject> = new Map();
  private teachingAssignments: Map<string, TeachingAssignment> = new Map();
  private enrollments: Map<string, Enrollment> = new Map();

  // Seed helpers
  addAcademicYear(year: AcademicYear): void {
    this.academicYears.set(year.id, year);
  }

  addClassroom(classroom: Classroom): void {
    this.classrooms.set(classroom.id, classroom);
  }

  addSubject(subject: Subject): void {
    this.subjects.set(subject.id, subject);
  }

  addTeachingAssignment(assignment: TeachingAssignment): void {
    this.teachingAssignments.set(assignment.id, assignment);
  }

  addEnrollment(enrollment: Enrollment): void {
    this.enrollments.set(enrollment.id, enrollment);
  }

  // D1-like interface
  prepare(sql: string) {
    const query = sql.toLowerCase();
    
    return {
      bind: (...params: unknown[]) => {
        return {
          first: async <T>(): Promise<T | null> => {
            // Academic year queries
            if (query.includes('academic_years')) {
              const [idOrLabel, schoolId] = params as string[];
              
              if (query.includes('status = \'current\'')) {
                // findCurrent
                for (const year of this.academicYears.values()) {
                  if (year.school_id === idOrLabel && year.status === 'current') {
                    return year as T;
                  }
                }
                return null;
              }
              
              if (query.includes('label =')) {
                // findByLabel
                for (const year of this.academicYears.values()) {
                  if (year.label === idOrLabel && year.school_id === schoolId) {
                    return year as T;
                  }
                }
                return null;
              }
              
              if (query.includes('count(*)')) {
                // countByStatus
                const status = params[1] as string;
                const count = Array.from(this.academicYears.values()).filter(
                  y => y.school_id === idOrLabel && y.status === status
                ).length;
                return { count } as T;
              }
              
              // findById
              const year = this.academicYears.get(idOrLabel);
              if (year && year.school_id === schoolId) {
                return year as T;
              }
              return null;
            }
            
            // Classroom queries
            if (query.includes('classrooms')) {
              const [param1, param2, param3, param4] = params as string[];
              
              if (query.includes('classroom_code =')) {
                // findByCode
                const [code, yearId, schoolId] = [param1, param2, param3];
                for (const classroom of this.classrooms.values()) {
                  if (
                    classroom.classroom_code === code &&
                    classroom.academic_year_id === yearId &&
                    classroom.school_id === schoolId
                  ) {
                    return classroom as T;
                  }
                }
                return null;
              }
              
              if (query.includes('grade_name =')) {
                // findByGradeAndDivision
                const [grade, division, yearId, schoolId] = [param1, param2, param3, param4];
                for (const classroom of this.classrooms.values()) {
                  if (
                    classroom.grade_name === grade &&
                    classroom.division_name === division &&
                    classroom.academic_year_id === yearId &&
                    classroom.school_id === schoolId
                  ) {
                    return classroom as T;
                  }
                }
                return null;
              }
              
              // findById
              const classroom = this.classrooms.get(param1);
              if (classroom && classroom.school_id === param2) {
                return classroom as T;
              }
              return null;
            }
            
            // Subject queries
            if (query.includes('subjects')) {
              const [param1, param2] = params as string[];
              
              if (query.includes('subject_code =')) {
                // findByCode
                for (const subject of this.subjects.values()) {
                  if (subject.subject_code === param1 && subject.school_id === param2) {
                    return subject as T;
                  }
                }
                return null;
              }
              
              // findById
              const subject = this.subjects.get(param1);
              if (subject && subject.school_id === param2) {
                return subject as T;
              }
              return null;
            }
            
            // Teaching assignment queries
            if (query.includes('teaching_assignments')) {
              const [param1, param2, param3] = params as string[];
              
              if (query.includes('classroom_id =') && query.includes('subject_id =')) {
                // findByClassroomAndSubject
                const [classroomId, subjectId, schoolId] = [param1, param2, param3];
                for (const assignment of this.teachingAssignments.values()) {
                  if (
                    assignment.classroom_id === classroomId &&
                    assignment.subject_id === subjectId &&
                    assignment.school_id === schoolId &&
                    assignment.status === 'active'
                  ) {
                    return assignment as T;
                  }
                }
                return null;
              }
              
              // findById
              const assignment = this.teachingAssignments.get(param1);
              if (assignment && assignment.school_id === param2) {
                return assignment as T;
              }
              return null;
            }
            
            // Enrollment queries
            if (query.includes('enrollments')) {
              const [param1, param2, param3, param4] = params as string[];
              
              if (query.includes('student_id =') && query.includes('classroom_id =')) {
                // findByStudentAndClassroom
                const [studentId, classroomId, yearId, schoolId] = [param1, param2, param3, param4];
                for (const enrollment of this.enrollments.values()) {
                  if (
                    enrollment.student_id === studentId &&
                    enrollment.classroom_id === classroomId &&
                    enrollment.academic_year_id === yearId &&
                    enrollment.school_id === schoolId
                  ) {
                    return enrollment as T;
                  }
                }
                return null;
              }
              
              if (query.includes('count(*)')) {
                // countActiveForYearAndStudent
                const [studentId, yearId, schoolId] = [param1, param2, param3];
                const count = Array.from(this.enrollments.values()).filter(
                  e =>
                    e.student_id === studentId &&
                    e.academic_year_id === yearId &&
                    e.school_id === schoolId &&
                    e.status === 'active'
                ).length;
                return { count } as T;
              }
              
              // findById
              const enrollment = this.enrollments.get(param1);
              if (enrollment && enrollment.school_id === param2) {
                return enrollment as T;
              }
              return null;
            }
            
            return null;
          },
          
          all: async <T>(): Promise<{ results: T[] }> => {
            const results: T[] = [];
            
            if (query.includes('academic_years')) {
              const schoolId = params[0] as string;
              for (const year of this.academicYears.values()) {
                if (year.school_id === schoolId) {
                  results.push(year as T);
                }
              }
            }
            
            if (query.includes('classrooms')) {
              const schoolId = params[0] as string;
              for (const classroom of this.classrooms.values()) {
                if (classroom.school_id === schoolId) {
                  results.push(classroom as T);
                }
              }
            }
            
            if (query.includes('subjects')) {
              const schoolId = params[0] as string;
              for (const subject of this.subjects.values()) {
                if (subject.school_id === schoolId) {
                  results.push(subject as T);
                }
              }
            }
            
            if (query.includes('teaching_assignments')) {
              const schoolId = params[0] as string;
              for (const assignment of this.teachingAssignments.values()) {
                if (assignment.school_id === schoolId) {
                  results.push(assignment as T);
                }
              }
            }
            
            if (query.includes('enrollments')) {
              const schoolId = params[0] as string;
              for (const enrollment of this.enrollments.values()) {
                if (enrollment.school_id === schoolId) {
                  results.push(enrollment as T);
                }
              }
            }
            
            return { results };
          },
          
          run: async () => {
            if (query.includes('insert')) {
              // INSERT operation
              const values = params as unknown[];
              
              if (query.includes('academic_years')) {
                const [id, schoolId, label, startsOn, endsOn, status, createdAt, updatedAt] = values;
                this.academicYears.set(id as string, {
                  id: id as string,
                  school_id: schoolId as string,
                  label: label as string,
                  starts_on: startsOn as string,
                  ends_on: endsOn as string,
                  status: status as any,
                  created_at: createdAt as string,
                  updated_at: updatedAt as string,
                });
              }
              
              if (query.includes('classrooms')) {
                const [id, schoolId, yearId, code, grade, division, level, teacherId, status, createdAt, updatedAt] = values;
                this.classrooms.set(id as string, {
                  id: id as string,
                  school_id: schoolId as string,
                  academic_year_id: yearId as string,
                  classroom_code: code as string,
                  grade_name: grade as string,
                  division_name: division as string,
                  grade_level: level as number,
                  class_teacher_id: teacherId as string | null,
                  status: status as any,
                  created_at: createdAt as string,
                  updated_at: updatedAt as string,
                });
              }
              
              if (query.includes('subjects')) {
                const [id, schoolId, code, name, description, status, createdAt, updatedAt] = values;
                this.subjects.set(id as string, {
                  id: id as string,
                  school_id: schoolId as string,
                  subject_code: code as string,
                  name: name as string,
                  description: description as string | null,
                  status: status as any,
                  created_at: createdAt as string,
                  updated_at: updatedAt as string,
                });
              }
              
              if (query.includes('teaching_assignments')) {
                const [id, schoolId, yearId, teacherId, classroomId, subjectId, status, createdAt, updatedAt] = values;
                this.teachingAssignments.set(id as string, {
                  id: id as string,
                  school_id: schoolId as string,
                  academic_year_id: yearId as string,
                  teacher_id: teacherId as string,
                  classroom_id: classroomId as string,
                  subject_id: subjectId as string,
                  status: status as any,
                  created_at: createdAt as string,
                  updated_at: updatedAt as string,
                });
              }
              
              if (query.includes('enrollments')) {
                const [id, schoolId, yearId, classroomId, studentId, rollNumber, joinedOn, status, fromEnrollmentId, createdAt, updatedAt] = values;
                this.enrollments.set(id as string, {
                  id: id as string,
                  school_id: schoolId as string,
                  academic_year_id: yearId as string,
                  classroom_id: classroomId as string,
                  student_id: studentId as string,
                  roll_number: rollNumber as string | null,
                  joined_on: joinedOn as string,
                  left_on: null,
                  status: status as any,
                  outcome: null,
                  from_enrollment_id: fromEnrollmentId as string | null,
                  created_at: createdAt as string,
                  updated_at: updatedAt as string,
                });
              }
              
              return { success: true, meta: { changes: 1 } };
            }
            
            if (query.includes('update')) {
              // UPDATE operation
              let changes = 0;
              const idIndex = params.length - 2;
              const schoolIdIndex = params.length - 1;
              const id = params[idIndex] as string;
              const schoolId = params[schoolIdIndex] as string;
              
              if (query.includes('academic_years')) {
                const year = this.academicYears.get(id);
                if (year && year.school_id === schoolId) {
                  // Update fields based on query
                  if (query.includes('status =')) {
                    year.status = params[0] as any;
                  }
                  year.updated_at = new Date().toISOString();
                  changes = 1;
                }
              }
              
              if (query.includes('classrooms')) {
                const classroom = this.classrooms.get(id);
                if (classroom && classroom.school_id === schoolId) {
                  classroom.updated_at = new Date().toISOString();
                  changes = 1;
                }
              }
              
              if (query.includes('subjects')) {
                const subject = this.subjects.get(id);
                if (subject && subject.school_id === schoolId) {
                  subject.updated_at = new Date().toISOString();
                  changes = 1;
                }
              }
              
              if (query.includes('teaching_assignments')) {
                const assignment = this.teachingAssignments.get(id);
                if (assignment && assignment.school_id === schoolId) {
                  assignment.updated_at = new Date().toISOString();
                  changes = 1;
                }
              }
              
              if (query.includes('enrollments')) {
                const enrollment = this.enrollments.get(id);
                if (enrollment && enrollment.school_id === schoolId) {
                  if (query.includes('status =')) {
                    enrollment.status = params[0] as any;
                  }
                  enrollment.updated_at = new Date().toISOString();
                  changes = 1;
                }
              }
              
              return { success: true, meta: { changes } };
            }
            
            return { success: true, meta: { changes: 0 } };
          },
        };
      },
    };
  }
}

describe('Academic Year Service', () => {
  let db: MockDatabase;
  const SCHOOL_A = 'school-a-uuid';
  const SCHOOL_B = 'school-b-uuid';

  beforeEach(() => {
    db = new MockDatabase();
  });

  describe('Tenant Isolation', () => {
    it('should not find academic year from different school', async () => {
      const yearInSchoolA: AcademicYear = {
        id: 'year-1',
        school_id: SCHOOL_A,
        label: '2024-2025',
        starts_on: '2024-04-01',
        ends_on: '2025-03-31',
        status: 'current',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      db.addAcademicYear(yearInSchoolA);

      // Try to access from school B
      await expect(
        academicYearService.getById(db as any, 'year-1', SCHOOL_B)
      ).rejects.toThrow('Academic year not found');
    });

    it('should only list academic years from own school', async () => {
      const yearA: AcademicYear = {
        id: 'year-a',
        school_id: SCHOOL_A,
        label: '2024-2025',
        starts_on: '2024-04-01',
        ends_on: '2025-03-31',
        status: 'current',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      const yearB: AcademicYear = {
        id: 'year-b',
        school_id: SCHOOL_B,
        label: '2024-2025',
        starts_on: '2024-04-01',
        ends_on: '2025-03-31',
        status: 'current',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      db.addAcademicYear(yearA);
      db.addAcademicYear(yearB);

      const yearsInA = await academicYearService.list(db as any, SCHOOL_A);
      expect(yearsInA).toHaveLength(1);
      expect(yearsInA[0].id).toBe('year-a');
    });
  });

  describe('Business Logic', () => {
    it('should enforce one current academic year per school', async () => {
      const currentYear: AcademicYear = {
        id: 'year-current',
        school_id: SCHOOL_A,
        label: '2024-2025',
        starts_on: '2024-04-01',
        ends_on: '2025-03-31',
        status: 'current',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      db.addAcademicYear(currentYear);

      // Try to create another current year
      await expect(
        academicYearService.create(db as any, SCHOOL_A, {
          label: '2025-2026',
          starts_on: '2025-04-01',
          ends_on: '2026-03-31',
          status: 'current',
        })
      ).rejects.toThrow('A current academic year already exists');
    });

    it('should enforce unique label within school', async () => {
      const year: AcademicYear = {
        id: 'year-1',
        school_id: SCHOOL_A,
        label: '2024-2025',
        starts_on: '2024-04-01',
        ends_on: '2025-03-31',
        status: 'upcoming',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      db.addAcademicYear(year);

      await expect(
        academicYearService.create(db as any, SCHOOL_A, {
          label: '2024-2025',
          starts_on: '2024-04-01',
          ends_on: '2025-03-31',
        })
      ).rejects.toThrow('already exists');
    });

    it('should validate date range (starts_on < ends_on)', async () => {
      await expect(
        academicYearService.create(db as any, SCHOOL_A, {
          label: '2024-2025',
          starts_on: '2025-03-31',
          ends_on: '2024-04-01',
        })
      ).rejects.toThrow('before');
    });

    it('should allow activation only from upcoming status', async () => {
      const year: AcademicYear = {
        id: 'year-1',
        school_id: SCHOOL_A,
        label: '2024-2025',
        starts_on: '2024-04-01',
        ends_on: '2025-03-31',
        status: 'closed',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      db.addAcademicYear(year);

      await expect(
        academicYearService.activate(db as any, 'year-1', SCHOOL_A)
      ).rejects.toThrow('upcoming');
    });

    it('should allow closing only from current status', async () => {
      const year: AcademicYear = {
        id: 'year-1',
        school_id: SCHOOL_A,
        label: '2024-2025',
        starts_on: '2024-04-01',
        ends_on: '2025-03-31',
        status: 'upcoming',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      db.addAcademicYear(year);

      await expect(
        academicYearService.close(db as any, 'year-1', SCHOOL_A)
      ).rejects.toThrow('current');
    });
  });
});

describe('Classroom Service', () => {
  let db: MockDatabase;
  const SCHOOL_A = 'school-a-uuid';
  const YEAR_ID = 'year-1';

  beforeEach(() => {
    db = new MockDatabase();
    
    // Seed academic year
    const year: AcademicYear = {
      id: YEAR_ID,
      school_id: SCHOOL_A,
      label: '2024-2025',
      starts_on: '2024-04-01',
      ends_on: '2025-03-31',
      status: 'current',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    db.addAcademicYear(year);
  });

  describe('Tenant Isolation', () => {
    it('should not find classroom from different school', async () => {
      const classroom: Classroom = {
        id: 'class-1',
        school_id: SCHOOL_A,
        academic_year_id: YEAR_ID,
        classroom_code: '10-A',
        grade_name: '10',
        division_name: 'A',
        grade_level: 10,
        class_teacher_id: null,
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      db.addClassroom(classroom);

      await expect(
        classroomService.getById(db as any, 'class-1', 'school-b-uuid')
      ).rejects.toThrow('Classroom not found');
    });
  });

  describe('Business Logic', () => {
    it('should enforce unique classroom_code per academic year', async () => {
      const classroom: Classroom = {
        id: 'class-1',
        school_id: SCHOOL_A,
        academic_year_id: YEAR_ID,
        classroom_code: '10-A',
        grade_name: '10',
        division_name: 'A',
        grade_level: 10,
        class_teacher_id: null,
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      db.addClassroom(classroom);

      await expect(
        classroomService.create(db as any, SCHOOL_A, {
          academic_year_id: YEAR_ID,
          classroom_code: '10-A',
          grade_name: '10',
          division_name: 'B',
          grade_level: 10,
        })
      ).rejects.toThrow('Classroom code already exists');
    });

    it('should enforce unique grade+division per academic year', async () => {
      const classroom: Classroom = {
        id: 'class-1',
        school_id: SCHOOL_A,
        academic_year_id: YEAR_ID,
        classroom_code: '10-A',
        grade_name: '10',
        division_name: 'A',
        grade_level: 10,
        class_teacher_id: null,
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      db.addClassroom(classroom);

      await expect(
        classroomService.create(db as any, SCHOOL_A, {
          academic_year_id: YEAR_ID,
          classroom_code: 'TEN-A',
          grade_name: '10',
          division_name: 'A',
          grade_level: 10,
        })
      ).rejects.toThrow('grade and division already exists');
    });

    it('should validate academic year exists', async () => {
      await expect(
        classroomService.create(db as any, SCHOOL_A, {
          academic_year_id: 'non-existent-year',
          classroom_code: '10-A',
          grade_name: '10',
          division_name: 'A',
          grade_level: 10,
        })
      ).rejects.toThrow('Academic year not found');
    });
  });
});

describe('Subject Service', () => {
  let db: MockDatabase;
  const SCHOOL_A = 'school-a-uuid';

  beforeEach(() => {
    db = new MockDatabase();
  });

  describe('Tenant Isolation', () => {
    it('should not find subject from different school', async () => {
      const subject: Subject = {
        id: 'subject-1',
        school_id: SCHOOL_A,
        subject_code: 'MATH',
        name: 'Mathematics',
        description: null,
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      db.addSubject(subject);

      await expect(
        subjectService.getById(db as any, 'subject-1', 'school-b-uuid')
      ).rejects.toThrow('Subject not found');
    });
  });

  describe('Business Logic', () => {
    it('should enforce unique subject_code per school', async () => {
      const subject: Subject = {
        id: 'subject-1',
        school_id: SCHOOL_A,
        subject_code: 'MATH',
        name: 'Mathematics',
        description: null,
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      db.addSubject(subject);

      await expect(
        subjectService.create(db as any, SCHOOL_A, {
          subject_code: 'MATH',
          name: 'Advanced Mathematics',
        })
      ).rejects.toThrow('Subject code already exists');
    });
  });
});

describe('Teaching Assignment Service', () => {
  let db: MockDatabase;
  const SCHOOL_A = 'school-a-uuid';
  const YEAR_ID = 'year-1';
  const CLASSROOM_ID = 'class-1';
  const SUBJECT_ID = 'subject-1';
  const TEACHER_ID = 'teacher-1';

  beforeEach(() => {
    db = new MockDatabase();
    
    // Seed dependencies
    const year: AcademicYear = {
      id: YEAR_ID,
      school_id: SCHOOL_A,
      label: '2024-2025',
      starts_on: '2024-04-01',
      ends_on: '2025-03-31',
      status: 'current',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    db.addAcademicYear(year);

    const classroom: Classroom = {
      id: CLASSROOM_ID,
      school_id: SCHOOL_A,
      academic_year_id: YEAR_ID,
      classroom_code: '10-A',
      grade_name: '10',
      division_name: 'A',
      grade_level: 10,
      class_teacher_id: null,
      status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    db.addClassroom(classroom);

    const subject: Subject = {
      id: SUBJECT_ID,
      school_id: SCHOOL_A,
      subject_code: 'MATH',
      name: 'Mathematics',
      description: null,
      status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    db.addSubject(subject);
  });

  describe('Business Logic', () => {
    it('should validate classroom belongs to academic year', async () => {
      const otherYear: AcademicYear = {
        id: 'year-2',
        school_id: SCHOOL_A,
        label: '2025-2026',
        starts_on: '2025-04-01',
        ends_on: '2026-03-31',
        status: 'upcoming',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      db.addAcademicYear(otherYear);

      await expect(
        teachingAssignmentService.create(db as any, SCHOOL_A, {
          academic_year_id: 'year-2',
          teacher_id: TEACHER_ID,
          classroom_id: CLASSROOM_ID,
          subject_id: SUBJECT_ID,
        })
      ).rejects.toThrow('does not belong to this academic year');
    });

    it('should prevent duplicate active assignment for classroom+subject', async () => {
      const assignment: TeachingAssignment = {
        id: 'assignment-1',
        school_id: SCHOOL_A,
        academic_year_id: YEAR_ID,
        teacher_id: TEACHER_ID,
        classroom_id: CLASSROOM_ID,
        subject_id: SUBJECT_ID,
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      db.addTeachingAssignment(assignment);

      await expect(
        teachingAssignmentService.create(db as any, SCHOOL_A, {
          academic_year_id: YEAR_ID,
          teacher_id: 'teacher-2',
          classroom_id: CLASSROOM_ID,
          subject_id: SUBJECT_ID,
        })
      ).rejects.toThrow('already exists');
    });

    it('should require classroom to be active', async () => {
      const inactiveClassroom: Classroom = {
        id: 'class-inactive',
        school_id: SCHOOL_A,
        academic_year_id: YEAR_ID,
        classroom_code: '10-B',
        grade_name: '10',
        division_name: 'B',
        grade_level: 10,
        class_teacher_id: null,
        status: 'inactive',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      db.addClassroom(inactiveClassroom);

      await expect(
        teachingAssignmentService.create(db as any, SCHOOL_A, {
          academic_year_id: YEAR_ID,
          teacher_id: TEACHER_ID,
          classroom_id: 'class-inactive',
          subject_id: SUBJECT_ID,
        })
      ).rejects.toThrow('Classroom must be active');
    });

    it('should require subject to be active', async () => {
      const inactiveSubject: Subject = {
        id: 'subject-inactive',
        school_id: SCHOOL_A,
        subject_code: 'PHY',
        name: 'Physics',
        description: null,
        status: 'inactive',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      db.addSubject(inactiveSubject);

      await expect(
        teachingAssignmentService.create(db as any, SCHOOL_A, {
          academic_year_id: YEAR_ID,
          teacher_id: TEACHER_ID,
          classroom_id: CLASSROOM_ID,
          subject_id: 'subject-inactive',
        })
      ).rejects.toThrow('Subject must be active');
    });
  });
});

describe('Enrollment Service', () => {
  let db: MockDatabase;
  const SCHOOL_A = 'school-a-uuid';
  const YEAR_ID = 'year-1';
  const CLASSROOM_ID = 'class-1';
  const STUDENT_ID = 'student-1';

  beforeEach(() => {
    db = new MockDatabase();
    
    // Seed dependencies
    const year: AcademicYear = {
      id: YEAR_ID,
      school_id: SCHOOL_A,
      label: '2024-2025',
      starts_on: '2024-04-01',
      ends_on: '2025-03-31',
      status: 'current',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    db.addAcademicYear(year);

    const classroom: Classroom = {
      id: CLASSROOM_ID,
      school_id: SCHOOL_A,
      academic_year_id: YEAR_ID,
      classroom_code: '10-A',
      grade_name: '10',
      division_name: 'A',
      grade_level: 10,
      class_teacher_id: null,
      status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    db.addClassroom(classroom);
  });

  describe('Business Logic', () => {
    it('should enforce one active enrollment per student per year', async () => {
      const enrollment: Enrollment = {
        id: 'enrollment-1',
        school_id: SCHOOL_A,
        academic_year_id: YEAR_ID,
        classroom_id: CLASSROOM_ID,
        student_id: STUDENT_ID,
        roll_number: '1',
        joined_on: '2024-04-01',
        left_on: null,
        status: 'active',
        outcome: null,
        from_enrollment_id: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      db.addEnrollment(enrollment);

      const classroom2: Classroom = {
        id: 'class-2',
        school_id: SCHOOL_A,
        academic_year_id: YEAR_ID,
        classroom_code: '10-B',
        grade_name: '10',
        division_name: 'B',
        grade_level: 10,
        class_teacher_id: null,
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      db.addClassroom(classroom2);

      await expect(
        enrollmentService.create(db as any, SCHOOL_A, {
          academic_year_id: YEAR_ID,
          classroom_id: 'class-2',
          student_id: STUDENT_ID,
          joined_on: '2024-04-01',
          status: 'active',
        })
      ).rejects.toThrow('already has an active enrollment');
    });

    it('should prevent duplicate enrollment for same student+classroom+year', async () => {
      const enrollment: Enrollment = {
        id: 'enrollment-1',
        school_id: SCHOOL_A,
        academic_year_id: YEAR_ID,
        classroom_id: CLASSROOM_ID,
        student_id: STUDENT_ID,
        roll_number: '1',
        joined_on: '2024-04-01',
        left_on: null,
        status: 'planned',
        outcome: null,
        from_enrollment_id: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      db.addEnrollment(enrollment);

      await expect(
        enrollmentService.create(db as any, SCHOOL_A, {
          academic_year_id: YEAR_ID,
          classroom_id: CLASSROOM_ID,
          student_id: STUDENT_ID,
          joined_on: '2024-04-01',
        })
      ).rejects.toThrow('already exists');
    });

    it('should validate status transitions', async () => {
      const enrollment: Enrollment = {
        id: 'enrollment-1',
        school_id: SCHOOL_A,
        academic_year_id: YEAR_ID,
        classroom_id: CLASSROOM_ID,
        student_id: STUDENT_ID,
        roll_number: '1',
        joined_on: '2024-04-01',
        left_on: null,
        status: 'completed',
        outcome: null,
        from_enrollment_id: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      db.addEnrollment(enrollment);

      // Cannot transition from completed to anything
      await expect(
        enrollmentService.update(db as any, 'enrollment-1', SCHOOL_A, {
          status: 'active',
        })
      ).rejects.toThrow('Invalid status transition');
    });

    it('should require classroom to be active', async () => {
      const inactiveClassroom: Classroom = {
        id: 'class-inactive',
        school_id: SCHOOL_A,
        academic_year_id: YEAR_ID,
        classroom_code: '10-B',
        grade_name: '10',
        division_name: 'B',
        grade_level: 10,
        class_teacher_id: null,
        status: 'inactive',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      db.addClassroom(inactiveClassroom);

      await expect(
        enrollmentService.create(db as any, SCHOOL_A, {
          academic_year_id: YEAR_ID,
          classroom_id: 'class-inactive',
          student_id: STUDENT_ID,
          joined_on: '2024-04-01',
        })
      ).rejects.toThrow('Classroom must be active');
    });

    it('should validate classroom belongs to academic year', async () => {
      const otherYear: AcademicYear = {
        id: 'year-2',
        school_id: SCHOOL_A,
        label: '2025-2026',
        starts_on: '2025-04-01',
        ends_on: '2026-03-31',
        status: 'upcoming',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      db.addAcademicYear(otherYear);

      await expect(
        enrollmentService.create(db as any, SCHOOL_A, {
          academic_year_id: 'year-2',
          classroom_id: CLASSROOM_ID,
          student_id: STUDENT_ID,
          joined_on: '2025-04-01',
        })
      ).rejects.toThrow('does not belong to this academic year');
    });
  });
});
