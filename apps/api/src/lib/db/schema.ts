/**
 * Drizzle ORM schema definitions for the School Management System.
 * 
 * IMPORTANT: This schema mirrors the handwritten SQL migration in migrations/0001_init.sql.
 * DO NOT use `drizzle-kit generate` to recreate these tables.
 * The SQL migration is the source of truth and contains SQLite-specific features
 * (composite foreign keys, partial unique indexes, WITHOUT ROWID, CHECK constraints, triggers)
 * that Drizzle cannot fully represent.
 * 
 * This file provides typed schema/query definitions for application code.
 */

import { sqliteTable, text, integer, real, index, uniqueIndex, primaryKey } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

// =====================================================================
// 1. schools
// =====================================================================
export const schools = sqliteTable('schools', {
  id: text('id').primaryKey(),
  code: text('code').notNull().unique(),
  name: text('name').notNull(),
  timezone: text('timezone').notNull().default('Asia/Kolkata'),
  phone: text('phone'),
  email: text('email'),
  address: text('address'),
  status: text('status', { enum: ['active', 'suspended', 'archived'] }).notNull().default('active'),
  settings: text('settings').notNull().default('{}'),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
});

// =====================================================================
// 2. users
// =====================================================================
export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  schoolId: text('school_id').notNull().references(() => schools.id),
  loginId: text('login_id').notNull().unique(),
  role: text('role', { enum: ['principal', 'teacher', 'student'] }).notNull(),
  passwordHash: text('password_hash'),
  activationHash: text('activation_hash'),
  activationExpiresAt: integer('activation_expires_at'),
  status: text('status', { enum: ['active', 'disabled'] }).notNull().default('active'),
  tokenVersion: integer('token_version').notNull().default(0),
  mustChangePassword: integer('must_change_password', { mode: 'boolean' }).notNull().default(false),
  lastLoginAt: integer('last_login_at'),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
}, (table) => ({
  idSchoolIdx: uniqueIndex('users_id_school_idx').on(table.id, table.schoolId),
  schoolRoleIdx: index('idx_users_school_role').on(table.schoolId, table.role),
  schoolStatusIdx: index('idx_users_school_status').on(table.schoolId, table.status),
  // Partial index for single active principal per school
  activePrincipalIdx: uniqueIndex('uq_active_principal_per_school')
    .on(table.schoolId)
    .where(sql`role = 'principal' AND status = 'active'`),
}));

// =====================================================================
// 3. sessions (refresh tokens)
// =====================================================================
export const sessions = sqliteTable('sessions', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id),
  refreshHash: text('refresh_hash').notNull(),
  familyId: text('family_id').notNull(),
  expiresAt: integer('expires_at').notNull(),
  revokedAt: integer('revoked_at'),
  userAgent: text('user_agent'),
  createdAt: integer('created_at').notNull(),
}, (table) => ({
  userIdx: index('idx_sessions_user').on(table.userId),
  familyIdx: index('idx_sessions_family').on(table.familyId),
  expiryIdx: index('idx_sessions_expiry').on(table.expiresAt),
}));

// =====================================================================
// 4. teacher_profiles
// =====================================================================
export const teacherProfiles = sqliteTable('teacher_profiles', {
  userId: text('user_id').primaryKey(),
  schoolId: text('school_id').notNull(),
  employeeCode: text('employee_code').notNull(),
  firstName: text('first_name').notNull(),
  middleName: text('middle_name'),
  lastName: text('last_name').notNull(),
  phone: text('phone'),
  dateOfBirth: text('date_of_birth'),
  dobMd: text('dob_md'),
  joiningDate: text('joining_date'),
  status: text('status', { enum: ['active', 'inactive'] }).notNull().default('active'),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
}, (table) => ({
  schoolEmployeeIdx: uniqueIndex('teacher_profiles_school_employee_idx').on(table.schoolId, table.employeeCode),
  userSchoolIdx: uniqueIndex('teacher_profiles_user_school_idx').on(table.userId, table.schoolId),
  birthdayIdx: index('idx_teacher_birthday').on(table.schoolId, table.dobMd),
}));

// =====================================================================
// 5. student_profiles
// =====================================================================
export const studentProfiles = sqliteTable('student_profiles', {
  userId: text('user_id').primaryKey(),
  schoolId: text('school_id').notNull(),
  studentCode: text('student_code').notNull(),
  admissionNumber: text('admission_number').notNull(),
  firstName: text('first_name').notNull(),
  middleName: text('middle_name'),
  lastName: text('last_name').notNull(),
  gender: text('gender'),
  dateOfBirth: text('date_of_birth'),
  dobMd: text('dob_md'),
  phone: text('phone'),
  email: text('email'),
  address: text('address'),
  parentName: text('parent_name'),
  parentPhone: text('parent_phone'),
  parentEmail: text('parent_email'),
  status: text('status', { enum: ['active', 'inactive', 'withdrawn'] }).notNull().default('active'),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
}, (table) => ({
  schoolStudentIdx: uniqueIndex('student_profiles_school_student_idx').on(table.schoolId, table.studentCode),
  schoolAdmissionIdx: uniqueIndex('student_profiles_school_admission_idx').on(table.schoolId, table.admissionNumber),
  userSchoolIdx: uniqueIndex('student_profiles_user_school_idx').on(table.userId, table.schoolId),
  birthdayIdx: index('idx_student_birthday').on(table.schoolId, table.dobMd),
}));

// =====================================================================
// 6. academic_years
// =====================================================================
export const academicYears = sqliteTable('academic_years', {
  id: text('id').primaryKey(),
  schoolId: text('school_id').notNull().references(() => schools.id),
  label: text('label').notNull(),
  startsOn: text('starts_on').notNull(),
  endsOn: text('ends_on').notNull(),
  status: text('status', { enum: ['upcoming', 'current', 'closed'] }).notNull().default('upcoming'),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
}, (table) => ({
  schoolLabelIdx: uniqueIndex('academic_years_school_label_idx').on(table.schoolId, table.label),
  idSchoolIdx: uniqueIndex('academic_years_id_school_idx').on(table.id, table.schoolId),
  // Partial index for single current year per school
  currentYearIdx: uniqueIndex('uq_current_academic_year')
    .on(table.schoolId)
    .where(sql`status = 'current'`),
}));

// =====================================================================
// 7. classrooms
// =====================================================================
export const classrooms = sqliteTable('classrooms', {
  id: text('id').primaryKey(),
  schoolId: text('school_id').notNull(),
  academicYearId: text('academic_year_id').notNull(),
  classroomCode: text('classroom_code').notNull(),
  gradeName: text('grade_name').notNull(),
  divisionName: text('division_name').notNull(),
  gradeLevel: integer('grade_level').notNull(),
  classTeacherId: text('class_teacher_id'),
  status: text('status', { enum: ['active', 'inactive'] }).notNull().default('active'),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
}, (table) => ({
  schoolYearCodeIdx: uniqueIndex('classrooms_school_year_code_idx').on(table.schoolId, table.academicYearId, table.classroomCode),
  schoolYearGradeIdx: uniqueIndex('classrooms_school_year_grade_idx').on(table.schoolId, table.academicYearId, table.gradeName, table.divisionName),
  idSchoolIdx: uniqueIndex('classrooms_id_school_idx').on(table.id, table.schoolId),
  idSchoolYearIdx: uniqueIndex('classrooms_id_school_year_idx').on(table.id, table.schoolId, table.academicYearId),
  yearIdx: index('idx_classrooms_year').on(table.academicYearId, table.status),
  teacherIdx: index('idx_classrooms_teacher').on(table.classTeacherId),
}));

// =====================================================================
// 8. subjects
// =====================================================================
export const subjects = sqliteTable('subjects', {
  id: text('id').primaryKey(),
  schoolId: text('school_id').notNull().references(() => schools.id),
  subjectCode: text('subject_code').notNull(),
  name: text('name').notNull(),
  description: text('description'),
  status: text('status', { enum: ['active', 'inactive'] }).notNull().default('active'),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
}, (table) => ({
  schoolCodeIdx: uniqueIndex('subjects_school_code_idx').on(table.schoolId, table.subjectCode),
  idSchoolIdx: uniqueIndex('subjects_id_school_idx').on(table.id, table.schoolId),
  schoolStatusIdx: index('idx_subjects_school_status').on(table.schoolId, table.status),
}));

// =====================================================================
// 9. teaching_assignments
// =====================================================================
export const teachingAssignments = sqliteTable('teaching_assignments', {
  id: text('id').primaryKey(),
  schoolId: text('school_id').notNull(),
  classroomId: text('classroom_id').notNull(),
  subjectId: text('subject_id').notNull(),
  teacherId: text('teacher_id'),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
}, (table) => ({
  classroomSubjectIdx: uniqueIndex('teaching_assignments_classroom_subject_idx').on(table.classroomId, table.subjectId),
  teacherIdx: index('idx_teaching_assignments_teacher').on(table.teacherId),
}));

// =====================================================================
// 10. enrollments
// =====================================================================
export const enrollments = sqliteTable('enrollments', {
  id: text('id').primaryKey(),
  schoolId: text('school_id').notNull(),
  academicYearId: text('academic_year_id').notNull(),
  classroomId: text('classroom_id').notNull(),
  studentId: text('student_id').notNull(),
  rollNumber: integer('roll_number'),
  joinedOn: text('joined_on').notNull(),
  leftOn: text('left_on'),
  status: text('status', { enum: ['planned', 'active', 'completed', 'left', 'transferred'] }).notNull(),
  outcome: text('outcome', { enum: ['promoted', 'retained', 'graduated', 'left'] }),
  fromEnrollmentId: text('from_enrollment_id'), // Self-reference without .references()
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
}, (table) => ({
  idStudentIdx: uniqueIndex('enrollments_id_student_idx').on(table.id, table.studentId),
  // Partial index for single live enrollment per student per year
  liveEnrollmentIdx: uniqueIndex('uq_live_enrollment')
    .on(table.studentId, table.academicYearId)
    .where(sql`status IN ('active', 'planned')`),
  classStatusIdx: index('idx_enrollments_class_status').on(table.classroomId, table.status),
  studentYearIdx: index('idx_enrollments_student_year').on(table.studentId, table.academicYearId),
  schoolYearIdx: index('idx_enrollments_school_year').on(table.schoolId, table.academicYearId),
}));

// =====================================================================
// 11. promotion_batches
// =====================================================================
export const promotionBatches = sqliteTable('promotion_batches', {
  id: text('id').primaryKey(),
  schoolId: text('school_id').notNull(),
  fromAcademicYearId: text('from_academic_year_id').notNull(),
  toAcademicYearId: text('to_academic_year_id').notNull(),
  fromClassroomId: text('from_classroom_id').notNull(),
  createdBy: text('created_by').notNull(),
  status: text('status', { enum: ['draft', 'planned', 'applied', 'cancelled'] }).notNull().default('draft'),
  createdAt: integer('created_at').notNull(),
  plannedAt: integer('planned_at'),
  appliedAt: integer('applied_at'),
}, (table) => ({
  idSchoolIdx: uniqueIndex('promotion_batches_id_school_idx').on(table.id, table.schoolId),
  // Partial index for single non-cancelled batch per class per target year
  openBatchIdx: uniqueIndex('uq_open_promotion_batch')
    .on(table.fromClassroomId, table.toAcademicYearId)
    .where(sql`status <> 'cancelled'`),
}));

// =====================================================================
// 12. promotion_items
// =====================================================================
export const promotionItems = sqliteTable('promotion_items', {
  id: text('id').primaryKey(),
  promotionBatchId: text('promotion_batch_id').notNull().references(() => promotionBatches.id),
  studentId: text('student_id').notNull(),
  sourceEnrollmentId: text('source_enrollment_id').notNull(),
  targetClassroomId: text('target_classroom_id').references(() => classrooms.id),
  targetRollNumber: integer('target_roll_number'),
  decision: text('decision', { enum: ['promote', 'retain', 'graduate', 'leave'] }).notNull(),
  reason: text('reason'),
  targetEnrollmentId: text('target_enrollment_id'),
  createdAt: integer('created_at').notNull(),
}, (table) => ({
  batchStudentIdx: uniqueIndex('promotion_items_batch_student_idx').on(table.promotionBatchId, table.studentId),
  studentIdx: index('idx_promotion_items_student').on(table.studentId),
}));

// =====================================================================
// 13. attendance_sessions
// =====================================================================
export const attendanceSessions = sqliteTable('attendance_sessions', {
  id: text('id').primaryKey(),
  schoolId: text('school_id').notNull(),
  academicYearId: text('academic_year_id').notNull(),
  classroomId: text('classroom_id').notNull(),
  subjectId: text('subject_id').notNull(),
  sessionDate: text('session_date').notNull(),
  periodNo: integer('period_no').notNull().default(1),
  takenBy: text('taken_by').notNull().references(() => users.id),
  status: text('status', { enum: ['open', 'locked'] }).notNull().default('open'),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
}, (table) => ({
  classroomSubjectDatePeriodIdx: uniqueIndex('attendance_sessions_classroom_subject_date_period_idx')
    .on(table.classroomId, table.subjectId, table.sessionDate, table.periodNo),
  classDateIdx: index('idx_attendance_sessions_class_date').on(table.classroomId, table.sessionDate),
  schoolYearIdx: index('idx_attendance_sessions_school_year').on(table.schoolId, table.academicYearId),
}));

// =====================================================================
// 14. attendance_entries (WITHOUT ROWID)
// =====================================================================
export const attendanceEntries = sqliteTable('attendance_entries', {
  sessionId: text('session_id').notNull().references(() => attendanceSessions.id),
  studentId: text('student_id').notNull(),
  enrollmentId: text('enrollment_id').notNull(),
  status: text('status', { enum: ['present', 'absent'] }).notNull(),
  updatedBy: text('updated_by').notNull().references(() => users.id),
  updatedAt: integer('updated_at').notNull(),
}, (table) => ({
  pk: primaryKey({ columns: [table.sessionId, table.studentId] }),
  studentIdx: index('idx_attendance_entries_student').on(table.studentId),
}));

// =====================================================================
// 15. assessments
// =====================================================================
export const assessments = sqliteTable('assessments', {
  id: text('id').primaryKey(),
  schoolId: text('school_id').notNull(),
  academicYearId: text('academic_year_id').notNull(),
  classroomId: text('classroom_id').notNull(),
  subjectId: text('subject_id').notNull(),
  name: text('name').notNull(),
  maxMarks: real('max_marks').notNull(),
  weightage: real('weightage'),
  heldOn: text('held_on'),
  isPublished: integer('is_published', { mode: 'boolean' }).notNull().default(false),
  isLocked: integer('is_locked', { mode: 'boolean' }).notNull().default(false),
  createdBy: text('created_by').notNull(),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
}, (table) => ({
  classroomSubjectNameIdx: uniqueIndex('assessments_classroom_subject_name_idx')
    .on(table.classroomId, table.subjectId, table.name),
  schoolYearIdx: index('idx_assessments_school_year').on(table.schoolId, table.academicYearId),
}));

// =====================================================================
// 16. marks (WITHOUT ROWID)
// =====================================================================
export const marks = sqliteTable('marks', {
  assessmentId: text('assessment_id').notNull().references(() => assessments.id),
  studentId: text('student_id').notNull(),
  enrollmentId: text('enrollment_id').notNull(),
  marksObtained: real('marks_obtained'),
  status: text('status', { enum: ['graded', 'absent', 'exempt'] }).notNull().default('graded'),
  updatedBy: text('updated_by').notNull().references(() => users.id),
  updatedAt: integer('updated_at').notNull(),
}, (table) => ({
  pk: primaryKey({ columns: [table.assessmentId, table.studentId] }),
  studentIdx: index('idx_marks_student').on(table.studentId),
}));

// =====================================================================
// 17. assignments
// =====================================================================
export const assignments = sqliteTable('assignments', {
  id: text('id').primaryKey(),
  schoolId: text('school_id').notNull(),
  academicYearId: text('academic_year_id').notNull(),
  classroomId: text('classroom_id').notNull(),
  subjectId: text('subject_id').notNull(),
  createdBy: text('created_by').notNull(),
  title: text('title').notNull(),
  description: text('description'),
  dueAt: integer('due_at'),
  status: text('status', { enum: ['draft', 'published', 'closed'] }).notNull().default('draft'),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
}, (table) => ({
  classSubjectIdx: index('idx_assignments_class_subject').on(table.classroomId, table.subjectId),
}));

// =====================================================================
// 18. assignment_attachments
// =====================================================================
export const assignmentAttachments = sqliteTable('assignment_attachments', {
  id: text('id').primaryKey(),
  assignmentId: text('assignment_id').notNull().references(() => assignments.id),
  fileName: text('file_name').notNull(),
  r2Key: text('r2_key').notNull().unique(),
  contentType: text('content_type'),
  sizeBytes: integer('size_bytes'),
  uploadedBy: text('uploaded_by').notNull().references(() => users.id),
  createdAt: integer('created_at').notNull(),
}, (table) => ({
  assignmentIdx: index('idx_assignment_attachments_assignment').on(table.assignmentId),
}));

// =====================================================================
// 19. fee_categories
// =====================================================================
export const feeCategories = sqliteTable('fee_categories', {
  id: text('id').primaryKey(),
  schoolId: text('school_id').notNull().references(() => schools.id),
  code: text('code').notNull(),
  name: text('name').notNull(),
  status: text('status', { enum: ['active', 'inactive'] }).notNull().default('active'),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
}, (table) => ({
  schoolCodeIdx: uniqueIndex('fee_categories_school_code_idx').on(table.schoolId, table.code),
  idSchoolIdx: uniqueIndex('fee_categories_id_school_idx').on(table.id, table.schoolId),
}));

// =====================================================================
// 20. fee_charges
// =====================================================================
export const feeCharges = sqliteTable('fee_charges', {
  id: text('id').primaryKey(),
  schoolId: text('school_id').notNull(),
  studentId: text('student_id').notNull(),
  academicYearId: text('academic_year_id').notNull(),
  enrollmentId: text('enrollment_id'),
  feeCategoryId: text('fee_category_id'),
  kind: text('kind', { enum: ['fee', 'concession', 'carry_forward'] }).notNull().default('fee'),
  title: text('title').notNull(),
  amountPaise: integer('amount_paise').notNull(),
  dueOn: text('due_on'),
  createdBy: text('created_by').notNull(),
  createdAt: integer('created_at').notNull(),
  voidedAt: integer('voided_at'),
  voidedBy: text('voided_by'),
  voidReason: text('void_reason'),
}, (table) => ({
  studentYearIdx: index('idx_fee_charges_student_year').on(table.studentId, table.academicYearId),
  schoolYearIdx: index('idx_fee_charges_school_year').on(table.schoolId, table.academicYearId),
}));

// =====================================================================
// 21. fee_payments
// =====================================================================
export const feePayments = sqliteTable('fee_payments', {
  id: text('id').primaryKey(),
  schoolId: text('school_id').notNull(),
  studentId: text('student_id').notNull(),
  academicYearId: text('academic_year_id').notNull(),
  receiptNo: text('receipt_no').notNull(),
  amountPaise: integer('amount_paise').notNull(),
  paidOn: text('paid_on').notNull(),
  method: text('method', { enum: ['cash', 'upi', 'bank_transfer', 'other'] }).notNull(),
  reference: text('reference'),
  recordedBy: text('recorded_by').notNull(),
  createdAt: integer('created_at').notNull(),
  voidedAt: integer('voided_at'),
  voidedBy: text('voided_by'),
  voidReason: text('void_reason'),
}, (table) => ({
  schoolReceiptIdx: uniqueIndex('fee_payments_school_receipt_idx').on(table.schoolId, table.receiptNo),
  studentYearIdx: index('idx_fee_payments_student_year').on(table.studentId, table.academicYearId),
  schoolDateIdx: index('idx_fee_payments_school_date').on(table.schoolId, table.paidOn),
}));

// =====================================================================
// 22. receipt_counters
// =====================================================================
export const receiptCounters = sqliteTable('receipt_counters', {
  schoolId: text('school_id').notNull().references(() => schools.id),
  financialYear: text('financial_year').notNull(),
  lastNumber: integer('last_number').notNull().default(0),
}, (table) => ({
  pk: primaryKey({ columns: [table.schoolId, table.financialYear] }),
}));

// =====================================================================
// 23. code_counters
// =====================================================================
export const codeCounters = sqliteTable('code_counters', {
  schoolId: text('school_id').notNull().references(() => schools.id),
  kind: text('kind', { enum: ['principal', 'teacher', 'student'] }).notNull(),
  lastNumber: integer('last_number').notNull().default(0),
}, (table) => ({
  pk: primaryKey({ columns: [table.schoolId, table.kind] }),
}));

// =====================================================================
// 24. import_jobs
// =====================================================================
export const importJobs = sqliteTable('import_jobs', {
  id: text('id').primaryKey(),
  schoolId: text('school_id').notNull().references(() => schools.id),
  kind: text('kind', { enum: ['students', 'attendance', 'marks', 'fee-payments', 'fee-charges', 'promotion'] }).notNull(),
  actorId: text('actor_id').notNull().references(() => users.id),
  payloadHash: text('payload_hash').notNull(),
  payload: text('payload'),
  summary: text('summary'),
  status: text('status', { enum: ['previewed', 'committing', 'committed', 'failed', 'expired'] }).notNull(),
  expiresAt: integer('expires_at').notNull(),
  createdAt: integer('created_at').notNull(),
  committedAt: integer('committed_at'),
}, (table) => ({
  schoolStatusIdx: index('idx_import_jobs_school_status').on(table.schoolId, table.status),
  expiryIdx: index('idx_import_jobs_expiry').on(table.expiresAt),
}));

// =====================================================================
// 25. audit_log
// =====================================================================
export const auditLog = sqliteTable('audit_log', {
  id: text('id').primaryKey(),
  schoolId: text('school_id'),
  actorId: text('actor_id').notNull(),
  actorRole: text('actor_role', { enum: ['super_admin', 'principal', 'teacher', 'student', 'system'] }).notNull(),
  action: text('action').notNull(),
  entity: text('entity').notNull(),
  entityId: text('entity_id'),
  before: text('before'),
  after: text('after'),
  at: integer('at').notNull(),
}, (table) => ({
  schoolTimeIdx: index('idx_audit_school_time').on(table.schoolId, table.at),
  entityIdx: index('idx_audit_entity').on(table.entity, table.entityId),
}));
