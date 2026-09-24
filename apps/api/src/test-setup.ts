/**
 * Global test setup - runs before all tests
 * Applies D1 migrations to the test database
 */
import { env } from 'cloudflare:workers';
import { applyD1Migrations } from 'cloudflare:test';
import { beforeEach } from 'vitest';

// Type assertion for test environment
const testEnv = env as unknown as { DB: D1Database; TEST_MIGRATIONS?: any };

// Apply migrations once at startup
if (testEnv.TEST_MIGRATIONS) {
  await applyD1Migrations(testEnv.DB, testEnv.TEST_MIGRATIONS);
  console.log('✓ Applied D1 migrations to test database');
}

// Clean up data between tests (but keep schema)
beforeEach(async () => {
  // Delete data in reverse order of dependencies
  await testEnv.DB.exec(`
    DELETE FROM audit_log;
    DELETE FROM import_jobs;
    DELETE FROM assignment_attachments;
    DELETE FROM assignments;
    DELETE FROM marks;
    DELETE FROM assessments;
    DELETE FROM attendance_entries;
    DELETE FROM attendance_sessions;
    DELETE FROM promotion_items;
    DELETE FROM promotion_batches;
    DELETE FROM enrollments;
    DELETE FROM teaching_assignments;
    DELETE FROM subjects;
    DELETE FROM classrooms;
    DELETE FROM academic_years;
    DELETE FROM student_profiles;
    DELETE FROM teacher_profiles;
    DELETE FROM sessions;
    DELETE FROM users;
    DELETE FROM receipt_counters;
    DELETE FROM code_counters;
    DELETE FROM fee_payments;
    DELETE FROM fee_charges;
    DELETE FROM fee_categories;
    DELETE FROM schools;
  `);
});
