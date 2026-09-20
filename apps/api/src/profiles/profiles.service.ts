/**
 * Profiles Service
 * 
 * Business logic for profile and birthday management
 */

import type { TenantContext } from '../auth/auth.types';
import type {
  TeacherProfile,
  StudentProfile,
  CurrentEnrollment,
  HistoricalEnrollment,
  StudentProfileWithEnrollment,
  UpdateTeacherProfileRequest,
  UpdateStudentProfileRequest,
  TeacherBirthday,
  StudentBirthday,
  BirthdayFilters,
} from './profiles.types';
import * as profilesRepo from './profiles.repository';
import * as profilesAuthz from './profiles.authorization';
import { ProfileError } from './profiles.errors';
import { logAudit } from '../lib/audit/audit.service';

/**
 * =====================================================================
 * TEACHER PROFILES
 * =====================================================================
 */

export async function getTeacherProfile(
  db: D1Database,
  teacherUserId: string,
  tenant: TenantContext
): Promise<TeacherProfile> {
  profilesAuthz.ensureCanViewTeacherProfile(tenant, teacherUserId);

  const profile = await profilesRepo.findTeacherProfile(db, teacherUserId, tenant.schoolId);

  if (!profile) {
    throw ProfileError.teacherNotFound(teacherUserId);
  }

  return profile;
}

export async function updateTeacherProfile(
  db: D1Database,
  teacherUserId: string,
  data: UpdateTeacherProfileRequest,
  tenant: TenantContext
): Promise<TeacherProfile> {
  profilesAuthz.ensureCanEditTeacherProfile(tenant, teacherUserId);

  // Get current profile for audit
  const before = await profilesRepo.findTeacherProfile(db, teacherUserId, tenant.schoolId);

  if (!before) {
    throw ProfileError.teacherNotFound(teacherUserId);
  }

  // Validate date_of_birth if provided
  if (data.date_of_birth !== undefined && data.date_of_birth !== null) {
    const dob = new Date(data.date_of_birth);
    if (isNaN(dob.getTime())) {
      throw ProfileError.invalidDate('date_of_birth');
    }
  }

  // Validate joining_date if provided
  if (data.joining_date !== undefined && data.joining_date !== null) {
    const joiningDate = new Date(data.joining_date);
    if (isNaN(joiningDate.getTime())) {
      throw ProfileError.invalidDate('joining_date');
    }
  }

  // Update profile
  await profilesRepo.updateTeacherProfile(db, teacherUserId, tenant.schoolId, data);

  // Get updated profile
  const after = await profilesRepo.findTeacherProfile(db, teacherUserId, tenant.schoolId);

  // Audit log
  await logAudit(db, tenant, 'teacher_profile_updated', 'teacher', teacherUserId, before, after);

  return after!;
}

/**
 * =====================================================================
 * STUDENT PROFILES
 * =====================================================================
 */

export async function getStudentProfile(
  db: D1Database,
  studentUserId: string,
  tenant: TenantContext
): Promise<StudentProfile> {
  profilesAuthz.ensureCanViewStudentProfile(tenant, studentUserId);

  const profile = await profilesRepo.findStudentProfile(db, studentUserId, tenant.schoolId);

  if (!profile) {
    throw ProfileError.studentNotFound(studentUserId);
  }

  // If teacher is requesting, verify they have access to this student
  // (class teacher or teaching assignment)
  if (tenant.role === 'teacher') {
    const hasAccess = await verifyTeacherStudentAccess(db, tenant.userId, studentUserId, tenant.schoolId);
    if (!hasAccess) {
      throw ProfileError.accessDenied('You do not have access to this student');
    }
  }

  return profile;
}

export async function getStudentProfileWithEnrollment(
  db: D1Database,
  studentUserId: string,
  tenant: TenantContext
): Promise<StudentProfileWithEnrollment> {
  const profile = await getStudentProfile(db, studentUserId, tenant);
  const currentEnrollment = await profilesRepo.findCurrentEnrollment(db, studentUserId, tenant.schoolId);

  return {
    ...profile,
    current_enrollment: currentEnrollment,
  };
}

export async function getCurrentEnrollment(
  db: D1Database,
  studentUserId: string,
  tenant: TenantContext
): Promise<CurrentEnrollment> {
  profilesAuthz.ensureCanViewStudentProfile(tenant, studentUserId);

  // Verify teacher access if applicable
  if (tenant.role === 'teacher') {
    const hasAccess = await verifyTeacherStudentAccess(db, tenant.userId, studentUserId, tenant.schoolId);
    if (!hasAccess) {
      throw ProfileError.accessDenied('You do not have access to this student');
    }
  }

  const enrollment = await profilesRepo.findCurrentEnrollment(db, studentUserId, tenant.schoolId);

  if (!enrollment) {
    throw ProfileError.noCurrentEnrollment(studentUserId);
  }

  return enrollment;
}

export async function getHistoricalEnrollments(
  db: D1Database,
  studentUserId: string,
  tenant: TenantContext
): Promise<HistoricalEnrollment[]> {
  profilesAuthz.ensureCanViewStudentProfile(tenant, studentUserId);

  // Historical enrollments are principal-only
  if (tenant.role !== 'principal') {
    throw ProfileError.accessDenied('Only principals can view historical enrollments');
  }

  return await profilesRepo.findHistoricalEnrollments(db, studentUserId, tenant.schoolId);
}

export async function updateStudentProfile(
  db: D1Database,
  studentUserId: string,
  data: UpdateStudentProfileRequest,
  tenant: TenantContext
): Promise<StudentProfile> {
  profilesAuthz.ensureCanEditStudentProfile(tenant);

  // Get current profile for audit
  const before = await profilesRepo.findStudentProfile(db, studentUserId, tenant.schoolId);

  if (!before) {
    throw ProfileError.studentNotFound(studentUserId);
  }

  // Validate date_of_birth if provided
  if (data.date_of_birth !== undefined && data.date_of_birth !== null) {
    const dob = new Date(data.date_of_birth);
    if (isNaN(dob.getTime())) {
      throw ProfileError.invalidDate('date_of_birth');
    }
  }

  // Update profile
  await profilesRepo.updateStudentProfile(db, studentUserId, tenant.schoolId, data);

  // Get updated profile
  const after = await profilesRepo.findStudentProfile(db, studentUserId, tenant.schoolId);

  // Audit log
  await logAudit(db, tenant, 'student_profile_updated', 'student', studentUserId, before, after);

  return after!;
}

/**
 * =====================================================================
 * TEACHER ACCESS VERIFICATION
 * =====================================================================
 */

async function verifyTeacherStudentAccess(
  db: D1Database,
  teacherUserId: string,
  studentUserId: string,
  schoolId: string
): Promise<boolean> {
  // Get student's current enrollment
  const enrollment = await profilesRepo.findCurrentEnrollment(db, studentUserId, schoolId);

  if (!enrollment) {
    return false;
  }

  // Check if teacher is class teacher of student's classroom
  const classTeacherClassrooms = await profilesRepo.findClassTeacherClassrooms(db, teacherUserId, schoolId);

  return classTeacherClassrooms.includes(enrollment.classroom_id);
}

/**
 * =====================================================================
 * TEACHER BIRTHDAYS
 * =====================================================================
 */

export async function getTeacherBirthdays(
  db: D1Database,
  filters: BirthdayFilters,
  tenant: TenantContext
): Promise<TeacherBirthday[]> {
  profilesAuthz.ensureCanViewTeacherBirthdays(tenant);

  let birthdays: TeacherBirthday[];

  if (filters.month !== undefined) {
    birthdays = await profilesRepo.findTeacherBirthdaysInMonth(db, tenant.schoolId, filters.month);
  } else if (filters.today) {
    const today = getTodayMMDD();
    birthdays = await profilesRepo.findTeacherBirthdays(db, tenant.schoolId, today);
  } else if (filters.thisWeek) {
    // Get all birthdays and filter in memory for this week
    const allBirthdays = await profilesRepo.findTeacherBirthdays(db, tenant.schoolId);
    birthdays = filterBirthdaysThisWeek(allBirthdays);
  } else {
    // Return all birthdays
    birthdays = await profilesRepo.findTeacherBirthdays(db, tenant.schoolId);
  }

  // For teacher birthdays, principal can see full DOB if needed
  // For birthday lists, we mask the year
  return birthdays;
}

/**
 * =====================================================================
 * STUDENT BIRTHDAYS
 * =====================================================================
 */

export async function getStudentBirthdays(
  db: D1Database,
  filters: BirthdayFilters,
  tenant: TenantContext
): Promise<StudentBirthday[]> {
  profilesAuthz.ensureCanViewStudentBirthdays(tenant);

  let classroomIds: string[] | undefined;

  // If teacher, restrict to their class teacher classrooms
  if (tenant.role === 'teacher') {
    classroomIds = await profilesRepo.findClassTeacherClassrooms(db, tenant.userId, tenant.schoolId);
    
    if (classroomIds.length === 0) {
      // Teacher is not a class teacher, return empty list
      return [];
    }
  }

  // If classroom filter is provided, use it (and verify teacher has access)
  if (filters.classroomId) {
    if (tenant.role === 'teacher') {
      if (!classroomIds?.includes(filters.classroomId)) {
        throw ProfileError.birthdayAccessDenied('You do not have access to this classroom');
      }
      classroomIds = [filters.classroomId];
    } else {
      classroomIds = [filters.classroomId];
    }
  }

  let birthdays: StudentBirthday[];

  if (filters.month !== undefined) {
    // For teacher with multiple classrooms, need to query each
    if (tenant.role === 'teacher' && classroomIds && classroomIds.length > 1 && !filters.classroomId) {
      birthdays = [];
      for (const classroomId of classroomIds) {
        const results = await profilesRepo.findStudentBirthdaysInMonth(
          db,
          tenant.schoolId,
          filters.month,
          classroomId
        );
        birthdays.push(...results);
      }
    } else {
      birthdays = await profilesRepo.findStudentBirthdaysInMonth(
        db,
        tenant.schoolId,
        filters.month,
        classroomIds?.[0]
      );
    }
  } else if (filters.today) {
    const today = getTodayMMDD();
    
    if (tenant.role === 'teacher' && classroomIds && classroomIds.length > 1 && !filters.classroomId) {
      birthdays = [];
      for (const classroomId of classroomIds) {
        const results = await profilesRepo.findStudentBirthdays(
          db,
          tenant.schoolId,
          today,
          classroomId
        );
        birthdays.push(...results);
      }
    } else {
      birthdays = await profilesRepo.findStudentBirthdays(
        db,
        tenant.schoolId,
        today,
        classroomIds?.[0]
      );
    }
  } else if (filters.thisWeek) {
    // Get all birthdays and filter in memory
    if (tenant.role === 'teacher' && classroomIds && classroomIds.length > 1 && !filters.classroomId) {
      birthdays = [];
      for (const classroomId of classroomIds) {
        const results = await profilesRepo.findStudentBirthdays(
          db,
          tenant.schoolId,
          undefined,
          classroomId
        );
        birthdays.push(...results);
      }
    } else {
      birthdays = await profilesRepo.findStudentBirthdays(
        db,
        tenant.schoolId,
        undefined,
        classroomIds?.[0]
      );
    }
    birthdays = filterBirthdaysThisWeek(birthdays);
  } else {
    // Return all birthdays (for principal or single classroom for teacher)
    if (tenant.role === 'teacher' && classroomIds && classroomIds.length > 1 && !filters.classroomId) {
      birthdays = [];
      for (const classroomId of classroomIds) {
        const results = await profilesRepo.findStudentBirthdays(
          db,
          tenant.schoolId,
          undefined,
          classroomId
        );
        birthdays.push(...results);
      }
    } else {
      birthdays = await profilesRepo.findStudentBirthdays(
        db,
        tenant.schoolId,
        undefined,
        classroomIds?.[0]
      );
    }
  }

  // For student birthdays, we DO NOT include full_dob in the response
  // Only day and month (dob_md) is exposed
  return birthdays;
}

/**
 * =====================================================================
 * HELPER FUNCTIONS
 * =====================================================================
 */

function getTodayMMDD(): string {
  const now = new Date();
  const month = (now.getUTCMonth() + 1).toString().padStart(2, '0');
  const day = now.getUTCDate().toString().padStart(2, '0');
  return `${month}-${day}`;
}

function filterBirthdaysThisWeek<T extends { dob_md: string }>(birthdays: T[]): T[] {
  const today = new Date();
  const todayMMDD = getTodayMMDD();
  
  // Get dates for the next 7 days
  const weekMMDDs = new Set<string>();
  for (let i = 0; i < 7; i++) {
    const date = new Date(today);
    date.setUTCDate(today.getUTCDate() + i);
    const month = (date.getUTCMonth() + 1).toString().padStart(2, '0');
    const day = date.getUTCDate().toString().padStart(2, '0');
    weekMMDDs.add(`${month}-${day}`);
  }

  return birthdays.filter(b => weekMMDDs.has(b.dob_md));
}
