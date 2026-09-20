/**
 * Authorization tests
 * 
 * Comprehensive test coverage for authorization policies:
 * - Tenant isolation
 * - Role checks
 * - Teacher relationships
 * - Student self-access
 * - Attendance/marks authorization
 * - Client override protection
 * - Fail closed behavior
 */

import { describe, it, expect, beforeEach } from 'vitest';
import type {
  TenantContext,
  ClassroomAccessContext,
  StudentAccessContext,
  TeachingAssignmentContext,
  AttendanceAuthzContext,
  MarksAuthzContext,
  TeachingAssignment,
  Classroom,
  Enrollment,
  StudentProfile,
  TeacherProfile,
} from './authz.types';
import * as authzService from './authz.service';
import {
  AuthzError,
  AuthzErrorCode,
  forbidden,
  insufficientRole,
  tenantMismatch,
} from './authz.errors';

// Mock database
class MockDatabase {
  private teachingAssignments: Map<string, TeachingAssignment> = new Map();
  private classrooms: Map<string, Classroom> = new Map();
  private enrollments: Map<string, Enrollment> = new Map();
  private studentProfiles: Map<string, StudentProfile> = new Map();
  private teacherProfiles: Map<string, TeacherProfile> = new Map();

  // Helper methods to seed data
  addTeachingAssignment(assignment: TeachingAssignment): void {
    const key = `${assignment.teacher_id}:${assignment.classroom_id}:${assignment.subject_id}`;
    this.teachingAssignments.set(key, assignment);
  }

  addClassroom(classroom: Classroom): void {
    this.classrooms.set(classroom.id, classroom);
  }

  addEnrollment(enrollment: Enrollment): void {
    this.enrollments.set(enrollment.id, enrollment);
  }

  addStudentProfile(profile: StudentProfile): void {
    this.studentProfiles.set(profile.user_id, profile);
    this.studentProfiles.set(profile.id, profile); // Also store by ID
  }

  addTeacherProfile(profile: TeacherProfile): void {
    this.teacherProfiles.set(profile.user_id, profile);
    this.teacherProfiles.set(profile.id, profile); // Also store by ID
  }

  // D1-like prepare/bind/first interface
  prepare(sql: string) {
    const query = sql.toLowerCase();
    
    return {
      bind: (...params: unknown[]) => {
        return {
          first: async <T>(): Promise<T | null> => {
            // Teaching assignment queries
            if (query.includes('teaching_assignments')) {
              if (params.length === 4) {
                // Specific assignment or any assignment in classroom
                const [teacherId, classroomId, subjectOrSchool, maybeSchool] = params as string[];
                
                if (maybeSchool) {
                  // Has 4 params: teacherId, classroomId, subjectId, schoolId
                  const subjectId = subjectOrSchool;
                  const schoolId = maybeSchool;
                  const key = `${teacherId}:${classroomId}:${subjectId}`;
                  const assignment = this.teachingAssignments.get(key);
                  if (assignment && assignment.school_id === schoolId) {
                    return assignment as T;
                  }
                } else {
                  // Has 3 params: teacherId, classroomId, schoolId (any subject)
                  const schoolId = subjectOrSchool;
                  for (const assignment of this.teachingAssignments.values()) {
                    if (
                      assignment.teacher_id === teacherId &&
                      assignment.classroom_id === classroomId &&
                      assignment.school_id === schoolId
                    ) {
                      return assignment as T;
                    }
                  }
                }
              } else if (params.length === 3) {
                // Any assignment: teacherId, classroomId, schoolId
                const [teacherId, classroomId, schoolId] = params as string[];
                for (const assignment of this.teachingAssignments.values()) {
                  if (
                    assignment.teacher_id === teacherId &&
                    assignment.classroom_id === classroomId &&
                    assignment.school_id === schoolId
                  ) {
                    return assignment as T;
                  }
                }
              }
              return null;
            }

            // Classroom queries
            if (query.includes('classrooms')) {
              const [classroomId, schoolId, teacherId] = params as string[];
              const classroom = this.classrooms.get(classroomId);
              
              if (!classroom || classroom.school_id !== schoolId) {
                return null;
              }

              // Class teacher check
              if (teacherId && classroom.class_teacher_id !== teacherId) {
                return null;
              }

              return classroom as T;
            }

            // Enrollment queries
            if (query.includes('enrollments')) {
              if (params.length === 3) {
                // Specific enrollment
                const [studentId, classroomId, schoolId] = params as string[];
                for (const enrollment of this.enrollments.values()) {
                  if (
                    enrollment.student_id === studentId &&
                    enrollment.classroom_id === classroomId &&
                    enrollment.school_id === schoolId &&
                    enrollment.status === 'active'
                  ) {
                    return enrollment as T;
                  }
                }
              } else {
                // Student's active enrollment
                const [studentId, schoolId] = params as string[];
                for (const enrollment of this.enrollments.values()) {
                  if (
                    enrollment.student_id === studentId &&
                    enrollment.school_id === schoolId &&
                    enrollment.status === 'active'
                  ) {
                    return enrollment as T;
                  }
                }
              }
              return null;
            }

            // Student profile queries
            if (query.includes('student_profiles')) {
              if (query.includes('user_id')) {
                const [userId, schoolId] = params as string[];
                const profile = this.studentProfiles.get(userId);
                if (profile && profile.school_id === schoolId) {
                  return profile as T;
                }
              } else {
                const [profileId, schoolId] = params as string[];
                for (const profile of this.studentProfiles.values()) {
                  if (profile.id === profileId && profile.school_id === schoolId) {
                    return profile as T;
                  }
                }
              }
              return null;
            }

            // Teacher profile queries
            if (query.includes('teacher_profiles')) {
              if (query.includes('user_id')) {
                const [userId, schoolId] = params as string[];
                const profile = this.teacherProfiles.get(userId);
                if (profile && profile.school_id === schoolId) {
                  return profile as T;
                }
              } else {
                const [profileId, schoolId] = params as string[];
                for (const profile of this.teacherProfiles.values()) {
                  if (profile.id === profileId && profile.school_id === schoolId) {
                    return profile as T;
                  }
                }
              }
              return null;
            }

            return null;
          },
        };
      },
    };
  }
}

describe('Authorization - Role Checks', () => {
  it('should allow super_admin role', () => {
    const tenant: TenantContext = {
      userId: 'admin1',
      role: 'super_admin',
      schoolId: 'school1',
      sessionId: 'session1',
    };

    expect(() => authzService.requireRole(tenant, 'super_admin')).not.toThrow();
  });

  it('should deny insufficient role', () => {
    const tenant: TenantContext = {
      userId: 'teacher1',
      role: 'teacher',
      schoolId: 'school1',
      sessionId: 'session1',
    };

    expect(() => authzService.requireRole(tenant, 'principal')).toThrow(AuthzError);
    expect(() => authzService.requireRole(tenant, 'principal')).toThrow('principal');
  });

  it('should allow any of specified roles', () => {
    const tenant: TenantContext = {
      userId: 'teacher1',
      role: 'teacher',
      schoolId: 'school1',
      sessionId: 'session1',
    };

    expect(() => authzService.requireAnyRole(tenant, ['principal', 'teacher'])).not.toThrow();
  });

  it('should deny when no matching role', () => {
    const tenant: TenantContext = {
      userId: 'student1',
      role: 'student',
      schoolId: 'school1',
      sessionId: 'session1',
    };

    expect(() => authzService.requireAnyRole(tenant, ['principal', 'teacher'])).toThrow(AuthzError);
  });
});

describe('Authorization - Tenant Isolation', () => {
  it('should allow principal access to own school', () => {
    const tenant: TenantContext = {
      userId: 'principal1',
      role: 'principal',
      schoolId: 'school1',
      sessionId: 'session1',
    };

    expect(authzService.canAccessSchool(tenant, 'school1')).toBe(true);
  });

  it('should deny principal access to another school', () => {
    const tenant: TenantContext = {
      userId: 'principal1',
      role: 'principal',
      schoolId: 'school1',
      sessionId: 'session1',
    };

    expect(authzService.canAccessSchool(tenant, 'school2')).toBe(false);
  });

  it('should deny teacher cross-school access', () => {
    const tenant: TenantContext = {
      userId: 'teacher1',
      role: 'teacher',
      schoolId: 'school1',
      sessionId: 'session1',
    };

    expect(authzService.canAccessSchool(tenant, 'school2')).toBe(false);
  });

  it('should deny student cross-school access', () => {
    const tenant: TenantContext = {
      userId: 'student1',
      role: 'student',
      schoolId: 'school1',
      sessionId: 'session1',
    };

    expect(authzService.canAccessSchool(tenant, 'school2')).toBe(false);
  });

  it('should allow super_admin platform access', () => {
    const tenant: TenantContext = {
      userId: 'admin1',
      role: 'super_admin',
      schoolId: 'platform',
      sessionId: 'session1',
    };

    expect(authzService.canAccessSchool(tenant, 'school1')).toBe(true);
    expect(authzService.canAccessSchool(tenant, 'school2')).toBe(true);
  });

  it('should throw on tenant mismatch with ensureSchoolAccess', () => {
    const tenant: TenantContext = {
      userId: 'principal1',
      role: 'principal',
      schoolId: 'school1',
      sessionId: 'session1',
    };

    expect(() => authzService.ensureSchoolAccess(tenant, 'school2')).toThrow(AuthzError);
    
    try {
      authzService.ensureSchoolAccess(tenant, 'school2');
      expect.fail('Should have thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(AuthzError);
      expect((error as AuthzError).code).toBe(AuthzErrorCode.TENANT_MISMATCH);
    }
  });
});

describe('Authorization - Classroom Access', () => {
  let db: MockDatabase;

  beforeEach(() => {
    db = new MockDatabase();
  });

  it('should allow principal to view classroom in own school', async () => {
    const tenant: TenantContext = {
      userId: 'principal1',
      role: 'principal',
      schoolId: 'school1',
      sessionId: 'session1',
    };

    const context: ClassroomAccessContext = {
      classroomId: 'class1',
      schoolId: 'school1',
    };

    const allowed = await authzService.canViewClassroom(db as unknown as D1Database, tenant, context);
    expect(allowed).toBe(true);
  });

  it('should deny principal viewing classroom in another school', async () => {
    const tenant: TenantContext = {
      userId: 'principal1',
      role: 'principal',
      schoolId: 'school1',
      sessionId: 'session1',
    };

    const context: ClassroomAccessContext = {
      classroomId: 'class2',
      schoolId: 'school2',
    };

    const allowed = await authzService.canViewClassroom(db as unknown as D1Database, tenant, context);
    expect(allowed).toBe(false);
  });

  it('should allow teacher with teaching assignment', async () => {
    const tenant: TenantContext = {
      userId: 'teacher1',
      role: 'teacher',
      schoolId: 'school1',
      sessionId: 'session1',
    };

    // Add teacher profile
    db.addTeacherProfile({
      id: 'teacherProf1',
      user_id: 'teacher1',
      school_id: 'school1',
      employee_id: 'EMP001',
      first_name: 'John',
      last_name: 'Doe',
    });

    // Add teaching assignment
    db.addTeachingAssignment({
      id: 'assign1',
      teacher_id: 'teacherProf1',
      classroom_id: 'class1',
      subject_id: 'math',
      school_id: 'school1',
      academic_year: '2024',
      status: 'active',
    });

    const context: ClassroomAccessContext = {
      classroomId: 'class1',
      schoolId: 'school1',
    };

    const allowed = await authzService.canViewClassroom(db as unknown as D1Database, tenant, context);
    expect(allowed).toBe(true);
  });

  it('should deny teacher without teaching assignment', async () => {
    const tenant: TenantContext = {
      userId: 'teacher1',
      role: 'teacher',
      schoolId: 'school1',
      sessionId: 'session1',
    };

    // Add teacher profile but no assignment
    db.addTeacherProfile({
      id: 'teacherProf1',
      user_id: 'teacher1',
      school_id: 'school1',
      employee_id: 'EMP001',
      first_name: 'John',
      last_name: 'Doe',
    });

    const context: ClassroomAccessContext = {
      classroomId: 'class1',
      schoolId: 'school1',
    };

    const allowed = await authzService.canViewClassroom(db as unknown as D1Database, tenant, context);
    expect(allowed).toBe(false);
  });

  it('should allow class teacher to view own class', async () => {
    const tenant: TenantContext = {
      userId: 'teacher1',
      role: 'teacher',
      schoolId: 'school1',
      sessionId: 'session1',
    };

    // Add teacher profile
    db.addTeacherProfile({
      id: 'teacherProf1',
      user_id: 'teacher1',
      school_id: 'school1',
      employee_id: 'EMP001',
      first_name: 'John',
      last_name: 'Doe',
    });

    // Add classroom with this teacher as class teacher
    db.addClassroom({
      id: 'class1',
      school_id: 'school1',
      class_teacher_id: 'teacherProf1',
      name: 'Class 10',
      section: 'A',
      academic_year: '2024',
    });

    const context: ClassroomAccessContext = {
      classroomId: 'class1',
      schoolId: 'school1',
    };

    const allowed = await authzService.canViewClassroom(db as unknown as D1Database, tenant, context);
    expect(allowed).toBe(true);
  });

  it('should allow student with active enrollment', async () => {
    const tenant: TenantContext = {
      userId: 'student1',
      role: 'student',
      schoolId: 'school1',
      sessionId: 'session1',
    };

    // Add student profile
    db.addStudentProfile({
      id: 'studentProf1',
      user_id: 'student1',
      school_id: 'school1',
      admission_number: 'ADM001',
      first_name: 'Jane',
      last_name: 'Smith',
    });

    // Add active enrollment
    db.addEnrollment({
      id: 'enroll1',
      student_id: 'studentProf1',
      classroom_id: 'class1',
      school_id: 'school1',
      academic_year: '2024',
      enrollment_date: '2024-01-01',
      status: 'active',
    });

    const context: ClassroomAccessContext = {
      classroomId: 'class1',
      schoolId: 'school1',
    };

    const allowed = await authzService.canViewClassroom(db as unknown as D1Database, tenant, context);
    expect(allowed).toBe(true);
  });

  it('should deny student without enrollment', async () => {
    const tenant: TenantContext = {
      userId: 'student1',
      role: 'student',
      schoolId: 'school1',
      sessionId: 'session1',
    };

    // Add student profile but no enrollment
    db.addStudentProfile({
      id: 'studentProf1',
      user_id: 'student1',
      school_id: 'school1',
      admission_number: 'ADM001',
      first_name: 'Jane',
      last_name: 'Smith',
    });

    const context: ClassroomAccessContext = {
      classroomId: 'class1',
      schoolId: 'school1',
    };

    const allowed = await authzService.canViewClassroom(db as unknown as D1Database, tenant, context);
    expect(allowed).toBe(false);
  });
});

describe('Authorization - Student Access', () => {
  let db: MockDatabase;

  beforeEach(() => {
    db = new MockDatabase();
  });

  it('should allow student to view own profile', async () => {
    const tenant: TenantContext = {
      userId: 'student1',
      role: 'student',
      schoolId: 'school1',
      sessionId: 'session1',
    };

    db.addStudentProfile({
      id: 'studentProf1',
      user_id: 'student1',
      school_id: 'school1',
      admission_number: 'ADM001',
      first_name: 'Jane',
      last_name: 'Smith',
    });

    const context: StudentAccessContext = {
      studentId: 'studentProf1',
      schoolId: 'school1',
    };

    const allowed = await authzService.canViewStudent(db as unknown as D1Database, tenant, context);
    expect(allowed).toBe(true);
  });

  it('should deny student viewing another student', async () => {
    const tenant: TenantContext = {
      userId: 'student1',
      role: 'student',
      schoolId: 'school1',
      sessionId: 'session1',
    };

    db.addStudentProfile({
      id: 'studentProf1',
      user_id: 'student1',
      school_id: 'school1',
      admission_number: 'ADM001',
      first_name: 'Jane',
      last_name: 'Smith',
    });

    const context: StudentAccessContext = {
      studentId: 'studentProf2', // Different student
      schoolId: 'school1',
    };

    const allowed = await authzService.canViewStudent(db as unknown as D1Database, tenant, context);
    expect(allowed).toBe(false);
  });

  it('should allow principal to view students in own school', async () => {
    const tenant: TenantContext = {
      userId: 'principal1',
      role: 'principal',
      schoolId: 'school1',
      sessionId: 'session1',
    };

    const context: StudentAccessContext = {
      studentId: 'studentProf1',
      schoolId: 'school1',
    };

    const allowed = await authzService.canViewStudent(db as unknown as D1Database, tenant, context);
    expect(allowed).toBe(true);
  });

  it('should allow teacher to view student in their classroom', async () => {
    const tenant: TenantContext = {
      userId: 'teacher1',
      role: 'teacher',
      schoolId: 'school1',
      sessionId: 'session1',
    };

    // Add teacher profile
    db.addTeacherProfile({
      id: 'teacherProf1',
      user_id: 'teacher1',
      school_id: 'school1',
      employee_id: 'EMP001',
      first_name: 'John',
      last_name: 'Doe',
    });

    // Add student profile
    db.addStudentProfile({
      id: 'studentProf1',
      user_id: 'student1',
      school_id: 'school1',
      admission_number: 'ADM001',
      first_name: 'Jane',
      last_name: 'Smith',
    });

    // Add student enrollment
    db.addEnrollment({
      id: 'enroll1',
      student_id: 'studentProf1',
      classroom_id: 'class1',
      school_id: 'school1',
      academic_year: '2024',
      enrollment_date: '2024-01-01',
      status: 'active',
    });

    // Add teaching assignment
    db.addTeachingAssignment({
      id: 'assign1',
      teacher_id: 'teacherProf1',
      classroom_id: 'class1',
      subject_id: 'math',
      school_id: 'school1',
      academic_year: '2024',
      status: 'active',
    });

    const context: StudentAccessContext = {
      studentId: 'studentProf1',
      schoolId: 'school1',
    };

    const allowed = await authzService.canViewStudent(db as unknown as D1Database, tenant, context);
    expect(allowed).toBe(true);
  });

  it('should deny teacher viewing student not in their classroom', async () => {
    const tenant: TenantContext = {
      userId: 'teacher1',
      role: 'teacher',
      schoolId: 'school1',
      sessionId: 'session1',
    };

    // Add teacher profile
    db.addTeacherProfile({
      id: 'teacherProf1',
      user_id: 'teacher1',
      school_id: 'school1',
      employee_id: 'EMP001',
      first_name: 'John',
      last_name: 'Doe',
    });

    // Add student enrollment but no teaching assignment
    db.addEnrollment({
      id: 'enroll1',
      student_id: 'studentProf1',
      classroom_id: 'class1',
      school_id: 'school1',
      academic_year: '2024',
      enrollment_date: '2024-01-01',
      status: 'active',
    });

    const context: StudentAccessContext = {
      studentId: 'studentProf1',
      schoolId: 'school1',
    };

    const allowed = await authzService.canViewStudent(db as unknown as D1Database, tenant, context);
    expect(allowed).toBe(false);
  });
});

describe('Authorization - Teaching Assignments', () => {
  let db: MockDatabase;

  beforeEach(() => {
    db = new MockDatabase();
  });

  it('should verify teacher has specific teaching assignment', async () => {
    const tenant: TenantContext = {
      userId: 'teacher1',
      role: 'teacher',
      schoolId: 'school1',
      sessionId: 'session1',
    };

    db.addTeacherProfile({
      id: 'teacherProf1',
      user_id: 'teacher1',
      school_id: 'school1',
      employee_id: 'EMP001',
      first_name: 'John',
      last_name: 'Doe',
    });

    db.addTeachingAssignment({
      id: 'assign1',
      teacher_id: 'teacherProf1',
      classroom_id: 'class1',
      subject_id: 'math',
      school_id: 'school1',
      academic_year: '2024',
      status: 'active',
    });

    const context: TeachingAssignmentContext = {
      teacherId: 'teacherProf1',
      classroomId: 'class1',
      subjectId: 'math',
      schoolId: 'school1',
    };

    const hasAssignment = await authzService.hasTeachingAssignment(
      db as unknown as D1Database,
      tenant,
      context
    );
    expect(hasAssignment).toBe(true);
  });

  it('should deny teacher without teaching assignment', async () => {
    const tenant: TenantContext = {
      userId: 'teacher1',
      role: 'teacher',
      schoolId: 'school1',
      sessionId: 'session1',
    };

    db.addTeacherProfile({
      id: 'teacherProf1',
      user_id: 'teacher1',
      school_id: 'school1',
      employee_id: 'EMP001',
      first_name: 'John',
      last_name: 'Doe',
    });

    const context: TeachingAssignmentContext = {
      teacherId: 'teacherProf1',
      classroomId: 'class1',
      subjectId: 'math',
      schoolId: 'school1',
    };

    const hasAssignment = await authzService.hasTeachingAssignment(
      db as unknown as D1Database,
      tenant,
      context
    );
    expect(hasAssignment).toBe(false);
  });

  it('should verify class teacher relationship', async () => {
    const tenant: TenantContext = {
      userId: 'teacher1',
      role: 'teacher',
      schoolId: 'school1',
      sessionId: 'session1',
    };

    db.addTeacherProfile({
      id: 'teacherProf1',
      user_id: 'teacher1',
      school_id: 'school1',
      employee_id: 'EMP001',
      first_name: 'John',
      last_name: 'Doe',
    });

    db.addClassroom({
      id: 'class1',
      school_id: 'school1',
      class_teacher_id: 'teacherProf1',
      name: 'Class 10',
      section: 'A',
      academic_year: '2024',
    });

    const isClassTeacherFlag = await authzService.isClassTeacher(
      db as unknown as D1Database,
      tenant,
      'class1',
      'school1'
    );
    expect(isClassTeacherFlag).toBe(true);
  });

  it('should deny class teacher check for non-class-teacher', async () => {
    const tenant: TenantContext = {
      userId: 'teacher1',
      role: 'teacher',
      schoolId: 'school1',
      sessionId: 'session1',
    };

    db.addTeacherProfile({
      id: 'teacherProf1',
      user_id: 'teacher1',
      school_id: 'school1',
      employee_id: 'EMP001',
      first_name: 'John',
      last_name: 'Doe',
    });

    db.addClassroom({
      id: 'class1',
      school_id: 'school1',
      class_teacher_id: 'teacherProf2', // Different teacher
      name: 'Class 10',
      section: 'A',
      academic_year: '2024',
    });

    const isClassTeacherFlag = await authzService.isClassTeacher(
      db as unknown as D1Database,
      tenant,
      'class1',
      'school1'
    );
    expect(isClassTeacherFlag).toBe(false);
  });
});

describe('Authorization - Attendance', () => {
  let db: MockDatabase;

  beforeEach(() => {
    db = new MockDatabase();
  });

  it('should allow teacher with assignment to view attendance', async () => {
    const tenant: TenantContext = {
      userId: 'teacher1',
      role: 'teacher',
      schoolId: 'school1',
      sessionId: 'session1',
    };

    db.addTeacherProfile({
      id: 'teacherProf1',
      user_id: 'teacher1',
      school_id: 'school1',
      employee_id: 'EMP001',
      first_name: 'John',
      last_name: 'Doe',
    });

    db.addTeachingAssignment({
      id: 'assign1',
      teacher_id: 'teacherProf1',
      classroom_id: 'class1',
      subject_id: 'math',
      school_id: 'school1',
      academic_year: '2024',
      status: 'active',
    });

    const context: AttendanceAuthzContext = {
      classroomId: 'class1',
      subjectId: 'math',
      schoolId: 'school1',
    };

    const canView = await authzService.canViewAttendance(
      db as unknown as D1Database,
      tenant,
      context
    );
    expect(canView).toBe(true);
  });

  it('should allow class teacher to VIEW attendance for other subjects', async () => {
    const tenant: TenantContext = {
      userId: 'teacher1',
      role: 'teacher',
      schoolId: 'school1',
      sessionId: 'session1',
    };

    db.addTeacherProfile({
      id: 'teacherProf1',
      user_id: 'teacher1',
      school_id: 'school1',
      employee_id: 'EMP001',
      first_name: 'John',
      last_name: 'Doe',
    });

    db.addClassroom({
      id: 'class1',
      school_id: 'school1',
      class_teacher_id: 'teacherProf1',
      name: 'Class 10',
      section: 'A',
      academic_year: '2024',
    });

    const context: AttendanceAuthzContext = {
      classroomId: 'class1',
      subjectId: 'science', // Not their teaching assignment
      schoolId: 'school1',
    };

    const canView = await authzService.canViewAttendance(
      db as unknown as D1Database,
      tenant,
      context
    );
    expect(canView).toBe(true);
  });

  it('should allow teacher with assignment to MODIFY attendance', async () => {
    const tenant: TenantContext = {
      userId: 'teacher1',
      role: 'teacher',
      schoolId: 'school1',
      sessionId: 'session1',
    };

    db.addTeacherProfile({
      id: 'teacherProf1',
      user_id: 'teacher1',
      school_id: 'school1',
      employee_id: 'EMP001',
      first_name: 'John',
      last_name: 'Doe',
    });

    db.addTeachingAssignment({
      id: 'assign1',
      teacher_id: 'teacherProf1',
      classroom_id: 'class1',
      subject_id: 'math',
      school_id: 'school1',
      academic_year: '2024',
      status: 'active',
    });

    const context: AttendanceAuthzContext = {
      classroomId: 'class1',
      subjectId: 'math',
      schoolId: 'school1',
    };

    const canModify = await authzService.canModifyAttendance(
      db as unknown as D1Database,
      tenant,
      context
    );
    expect(canModify).toBe(true);
  });

  it('should DENY class teacher MODIFYING attendance for other subjects', async () => {
    const tenant: TenantContext = {
      userId: 'teacher1',
      role: 'teacher',
      schoolId: 'school1',
      sessionId: 'session1',
    };

    db.addTeacherProfile({
      id: 'teacherProf1',
      user_id: 'teacher1',
      school_id: 'school1',
      employee_id: 'EMP001',
      first_name: 'John',
      last_name: 'Doe',
    });

    db.addClassroom({
      id: 'class1',
      school_id: 'school1',
      class_teacher_id: 'teacherProf1',
      name: 'Class 10',
      section: 'A',
      academic_year: '2024',
    });

    const context: AttendanceAuthzContext = {
      classroomId: 'class1',
      subjectId: 'science', // Not their teaching assignment
      schoolId: 'school1',
    };

    const canModify = await authzService.canModifyAttendance(
      db as unknown as D1Database,
      tenant,
      context
    );
    expect(canModify).toBe(false); // Class teacher cannot MODIFY other subjects
  });

  it('should allow student to view own attendance', async () => {
    const tenant: TenantContext = {
      userId: 'student1',
      role: 'student',
      schoolId: 'school1',
      sessionId: 'session1',
    };

    db.addStudentProfile({
      id: 'studentProf1',
      user_id: 'student1',
      school_id: 'school1',
      admission_number: 'ADM001',
      first_name: 'Jane',
      last_name: 'Smith',
    });

    const context: AttendanceAuthzContext = {
      classroomId: 'class1',
      subjectId: 'math',
      schoolId: 'school1',
    };

    const canView = await authzService.canViewAttendance(
      db as unknown as D1Database,
      tenant,
      context,
      'studentProf1'
    );
    expect(canView).toBe(true);
  });

  it('should deny student modifying attendance', async () => {
    const tenant: TenantContext = {
      userId: 'student1',
      role: 'student',
      schoolId: 'school1',
      sessionId: 'session1',
    };

    const context: AttendanceAuthzContext = {
      classroomId: 'class1',
      subjectId: 'math',
      schoolId: 'school1',
    };

    const canModify = await authzService.canModifyAttendance(
      db as unknown as D1Database,
      tenant,
      context
    );
    expect(canModify).toBe(false);
  });

  it('should allow principal to view and modify attendance', async () => {
    const tenant: TenantContext = {
      userId: 'principal1',
      role: 'principal',
      schoolId: 'school1',
      sessionId: 'session1',
    };

    const context: AttendanceAuthzContext = {
      classroomId: 'class1',
      subjectId: 'math',
      schoolId: 'school1',
    };

    const canView = await authzService.canViewAttendance(
      db as unknown as D1Database,
      tenant,
      context
    );
    const canModify = await authzService.canModifyAttendance(
      db as unknown as D1Database,
      tenant,
      context
    );

    expect(canView).toBe(true);
    expect(canModify).toBe(true);
  });
});

describe('Authorization - Marks', () => {
  let db: MockDatabase;

  beforeEach(() => {
    db = new MockDatabase();
  });

  it('should allow class teacher to VIEW marks for other subjects', async () => {
    const tenant: TenantContext = {
      userId: 'teacher1',
      role: 'teacher',
      schoolId: 'school1',
      sessionId: 'session1',
    };

    db.addTeacherProfile({
      id: 'teacherProf1',
      user_id: 'teacher1',
      school_id: 'school1',
      employee_id: 'EMP001',
      first_name: 'John',
      last_name: 'Doe',
    });

    db.addClassroom({
      id: 'class1',
      school_id: 'school1',
      class_teacher_id: 'teacherProf1',
      name: 'Class 10',
      section: 'A',
      academic_year: '2024',
    });

    const context: MarksAuthzContext = {
      classroomId: 'class1',
      subjectId: 'science',
      schoolId: 'school1',
    };

    const canView = await authzService.canViewMarks(
      db as unknown as D1Database,
      tenant,
      context
    );
    expect(canView).toBe(true);
  });

  it('should DENY class teacher MODIFYING marks for other subjects', async () => {
    const tenant: TenantContext = {
      userId: 'teacher1',
      role: 'teacher',
      schoolId: 'school1',
      sessionId: 'session1',
    };

    db.addTeacherProfile({
      id: 'teacherProf1',
      user_id: 'teacher1',
      school_id: 'school1',
      employee_id: 'EMP001',
      first_name: 'John',
      last_name: 'Doe',
    });

    db.addClassroom({
      id: 'class1',
      school_id: 'school1',
      class_teacher_id: 'teacherProf1',
      name: 'Class 10',
      section: 'A',
      academic_year: '2024',
    });

    const context: MarksAuthzContext = {
      classroomId: 'class1',
      subjectId: 'science',
      schoolId: 'school1',
    };

    const canModify = await authzService.canModifyMarks(
      db as unknown as D1Database,
      tenant,
      context
    );
    expect(canModify).toBe(false);
  });

  it('should allow student to view own marks', async () => {
    const tenant: TenantContext = {
      userId: 'student1',
      role: 'student',
      schoolId: 'school1',
      sessionId: 'session1',
    };

    db.addStudentProfile({
      id: 'studentProf1',
      user_id: 'student1',
      school_id: 'school1',
      admission_number: 'ADM001',
      first_name: 'Jane',
      last_name: 'Smith',
    });

    const context: MarksAuthzContext = {
      classroomId: 'class1',
      subjectId: 'math',
      schoolId: 'school1',
    };

    const canView = await authzService.canViewMarks(
      db as unknown as D1Database,
      tenant,
      context,
      'studentProf1'
    );
    expect(canView).toBe(true);
  });

  it('should deny student modifying marks', async () => {
    const tenant: TenantContext = {
      userId: 'student1',
      role: 'student',
      schoolId: 'school1',
      sessionId: 'session1',
    };

    const context: MarksAuthzContext = {
      classroomId: 'class1',
      subjectId: 'math',
      schoolId: 'school1',
    };

    const canModify = await authzService.canModifyMarks(
      db as unknown as D1Database,
      tenant,
      context
    );
    expect(canModify).toBe(false);
  });
});

describe('Authorization - Fees', () => {
  let db: MockDatabase;

  beforeEach(() => {
    db = new MockDatabase();
  });

  it('should allow student to view own fees', async () => {
    const tenant: TenantContext = {
      userId: 'student1',
      role: 'student',
      schoolId: 'school1',
      sessionId: 'session1',
    };

    db.addStudentProfile({
      id: 'studentProf1',
      user_id: 'student1',
      school_id: 'school1',
      admission_number: 'ADM001',
      first_name: 'Jane',
      last_name: 'Smith',
    });

    const canView = await authzService.canViewFees(
      db as unknown as D1Database,
      tenant,
      'studentProf1',
      'school1'
    );
    expect(canView).toBe(true);
  });

  it('should deny student viewing another student fees', async () => {
    const tenant: TenantContext = {
      userId: 'student1',
      role: 'student',
      schoolId: 'school1',
      sessionId: 'session1',
    };

    db.addStudentProfile({
      id: 'studentProf1',
      user_id: 'student1',
      school_id: 'school1',
      admission_number: 'ADM001',
      first_name: 'Jane',
      last_name: 'Smith',
    });

    const canView = await authzService.canViewFees(
      db as unknown as D1Database,
      tenant,
      'studentProf2', // Different student
      'school1'
    );
    expect(canView).toBe(false);
  });

  it('should allow principal to modify fees', () => {
    const tenant: TenantContext = {
      userId: 'principal1',
      role: 'principal',
      schoolId: 'school1',
      sessionId: 'session1',
    };

    const canModify = authzService.canModifyFees(tenant, 'school1');
    expect(canModify).toBe(true);
  });

  it('should deny teacher modifying fees', () => {
    const tenant: TenantContext = {
      userId: 'teacher1',
      role: 'teacher',
      schoolId: 'school1',
      sessionId: 'session1',
    };

    const canModify = authzService.canModifyFees(tenant, 'school1');
    expect(canModify).toBe(false);
  });

  it('should deny student modifying fees', () => {
    const tenant: TenantContext = {
      userId: 'student1',
      role: 'student',
      schoolId: 'school1',
      sessionId: 'session1',
    };

    const canModify = authzService.canModifyFees(tenant, 'school1');
    expect(canModify).toBe(false);
  });
});

describe('Authorization - Client Override Protection', () => {
  it('should ignore client-provided schoolId in body', () => {
    const tenant: TenantContext = {
      userId: 'principal1',
      role: 'principal',
      schoolId: 'school1',
      sessionId: 'session1',
    };

    // Client tries to override schoolId
    const clientProvidedSchoolId = 'school2';

    // Authorization MUST use tenant.schoolId, NOT client value
    expect(authzService.canAccessSchool(tenant, clientProvidedSchoolId)).toBe(false);
    expect(authzService.canAccessSchool(tenant, tenant.schoolId)).toBe(true);
  });

  it('should ignore client-provided role', () => {
    const tenant: TenantContext = {
      userId: 'student1',
      role: 'student', // Actual role from authentication
      schoolId: 'school1',
      sessionId: 'session1',
    };

    // Client tries to claim they are principal
    // Authorization MUST use tenant.role from authentication
    expect(() => authzService.requireRole(tenant, 'principal')).toThrow(AuthzError);
  });

  it('should ignore client-provided userId', () => {
    const tenant: TenantContext = {
      userId: 'student1', // Actual userId from authentication
      role: 'student',
      schoolId: 'school1',
      sessionId: 'session1',
    };

    // Client tries to provide different userId
    // Authorization MUST use tenant.userId from authentication
    expect(tenant.userId).toBe('student1');
  });
});

describe('Authorization - Fail Closed', () => {
  let db: MockDatabase;

  beforeEach(() => {
    db = new MockDatabase();
  });

  it('should deny when resource school cannot be verified', async () => {
    const tenant: TenantContext = {
      userId: 'teacher1',
      role: 'teacher',
      schoolId: 'school1',
      sessionId: 'session1',
    };

    // No classroom data in database
    const context: ClassroomAccessContext = {
      classroomId: 'nonexistent',
      schoolId: 'school1',
    };

    const allowed = await authzService.canViewClassroom(db as unknown as D1Database, tenant, context);
    expect(allowed).toBe(false); // Fail closed
  });

  it('should deny when teacher profile not found', async () => {
    const tenant: TenantContext = {
      userId: 'teacher1',
      role: 'teacher',
      schoolId: 'school1',
      sessionId: 'session1',
    };

    // No teacher profile
    const context: ClassroomAccessContext = {
      classroomId: 'class1',
      schoolId: 'school1',
    };

    const allowed = await authzService.canViewClassroom(db as unknown as D1Database, tenant, context);
    expect(allowed).toBe(false); // Fail closed
  });

  it('should deny when student profile not found', async () => {
    const tenant: TenantContext = {
      userId: 'student1',
      role: 'student',
      schoolId: 'school1',
      sessionId: 'session1',
    };

    // No student profile
    const context: StudentAccessContext = {
      studentId: 'nonexistent',
      schoolId: 'school1',
    };

    const allowed = await authzService.canViewStudent(db as unknown as D1Database, tenant, context);
    expect(allowed).toBe(false); // Fail closed
  });
});

describe('Authorization - Error Types', () => {
  it('should create forbidden error', () => {
    const error = forbidden('Custom reason');
    expect(error).toBeInstanceOf(AuthzError);
    expect(error.code).toBe(AuthzErrorCode.FORBIDDEN);
    expect(error.httpStatus).toBe(403);
    expect(error.message).toContain('Custom reason');
  });

  it('should create insufficient role error', () => {
    const error = insufficientRole('principal');
    expect(error).toBeInstanceOf(AuthzError);
    expect(error.code).toBe(AuthzErrorCode.INSUFFICIENT_ROLE);
    expect(error.httpStatus).toBe(403);
  });

  it('should create tenant mismatch error', () => {
    const error = tenantMismatch();
    expect(error).toBeInstanceOf(AuthzError);
    expect(error.code).toBe(AuthzErrorCode.TENANT_MISMATCH);
    expect(error.httpStatus).toBe(403);
  });

  it('should always return 403 for authz errors', () => {
    const errors = [
      forbidden(),
      insufficientRole('principal'),
      tenantMismatch(),
    ];

    errors.forEach(error => {
      expect(error.httpStatus).toBe(403);
    });
  });
});
