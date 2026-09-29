/**
 * Profiles Routes
 * 
 * GET    /teachers/:userId - Get teacher profile
 * PUT    /teachers/:userId/profile - Update teacher profile
 * 
 * GET    /students/:userId - Get student profile
 * GET    /students/:userId/enrollment - Get current enrollment
 * GET    /students/:userId/enrollments - Get historical enrollments
 * PUT    /students/:userId/profile - Update student profile
 * 
 * GET    /birthdays/teachers - Get teacher birthdays
 * GET    /birthdays/students - Get student birthdays
 * 
 * Authorization: Role-based access control
 */

import { Hono } from 'hono';
import { requireAuth, requireSchoolTenant, type AuthContext } from '../auth/auth.middleware';
import * as profilesService from './profiles.service';
import { ProfileError } from './profiles.errors';
import type { BirthdayFilters } from './profiles.types';
import {
  updateTeacherProfileSchema,
  updateStudentProfileSchema,
  birthdayQuerySchema,
} from './profiles.schemas';
import { z } from 'zod';

const profiles = new Hono<AuthContext>();

/**
 * =====================================================================
 * TEACHER PROFILES
 * =====================================================================
 */

/**
 * GET /teachers/:userId
 * Get teacher profile
 * Authorization: Principal (any teacher), Teacher (self only)
 */
profiles.get('/teachers/:userId', requireAuth, async (c) => {
  try {
    const tenant = requireSchoolTenant(c);
    const userId = c.req.param('userId');

    if (!userId) {
      return c.json({ error: 'User ID is required' }, 400);
    }

    const profile = await profilesService.getTeacherProfile(c.env.DB, userId, tenant);

    return c.json({ data: profile }, 200);
  } catch (error) {
    if (error instanceof ProfileError) {
      return c.json({ error: error.message }, error.statusCode as any);
    }
    const message = error instanceof Error ? error.message : 'Failed to get teacher profile';
    return c.json({ error: message }, 500);
  }
});

/**
 * PUT /teachers/:userId/profile
 * Update teacher profile
 * Authorization: Principal (any teacher), Teacher (self only, limited fields)
 */
profiles.put('/teachers/:userId/profile', requireAuth, async (c) => {
  try {
    const tenant = requireSchoolTenant(c);
    const userId = c.req.param('userId');

    if (!userId) {
      return c.json({ error: 'User ID is required' }, 400);
    }

    const body = await c.req.json();
    const validated = updateTeacherProfileSchema.parse(body);

    const profile = await profilesService.updateTeacherProfile(c.env.DB, userId, validated, tenant);

    return c.json({ data: profile }, 200);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json({ error: 'Validation error', details: error.errors }, 400);
    }
    if (error instanceof ProfileError) {
      return c.json({ error: error.message }, error.statusCode as any);
    }
    const message = error instanceof Error ? error.message : 'Failed to update teacher profile';
    return c.json({ error: message }, 500);
  }
});

/**
 * =====================================================================
 * STUDENT PROFILES
 * =====================================================================
 */

/**
 * GET /students/:userId
 * Get student profile with current enrollment
 * Authorization: Principal, Teacher (class teacher only), Student (self only)
 */
profiles.get('/students/:userId', requireAuth, async (c) => {
  try {
    const tenant = requireSchoolTenant(c);
    const userId = c.req.param('userId');

    if (!userId) {
      return c.json({ error: 'User ID is required' }, 400);
    }

    const profile = await profilesService.getStudentProfileWithEnrollment(c.env.DB, userId, tenant);

    return c.json({ data: profile }, 200);
  } catch (error) {
    if (error instanceof ProfileError) {
      return c.json({ error: error.message }, error.statusCode as any);
    }
    const message = error instanceof Error ? error.message : 'Failed to get student profile';
    return c.json({ error: message }, 500);
  }
});

/**
 * GET /students/:userId/enrollment
 * Get student's current enrollment details
 * Authorization: Principal, Teacher (class teacher only), Student (self only)
 */
profiles.get('/students/:userId/enrollment', requireAuth, async (c) => {
  try {
    const tenant = requireSchoolTenant(c);
    const userId = c.req.param('userId');

    if (!userId) {
      return c.json({ error: 'User ID is required' }, 400);
    }

    const enrollment = await profilesService.getCurrentEnrollment(c.env.DB, userId, tenant);

    return c.json({ data: enrollment }, 200);
  } catch (error) {
    if (error instanceof ProfileError) {
      return c.json({ error: error.message }, error.statusCode as any);
    }
    const message = error instanceof Error ? error.message : 'Failed to get current enrollment';
    return c.json({ error: message }, 500);
  }
});

/**
 * GET /students/:userId/enrollments
 * Get student's historical enrollments
 * Authorization: Principal only
 */
profiles.get('/students/:userId/enrollments', requireAuth, async (c) => {
  try {
    const tenant = requireSchoolTenant(c);
    const userId = c.req.param('userId');

    if (!userId) {
      return c.json({ error: 'User ID is required' }, 400);
    }

    const enrollments = await profilesService.getHistoricalEnrollments(c.env.DB, userId, tenant);

    return c.json({ data: enrollments }, 200);
  } catch (error) {
    if (error instanceof ProfileError) {
      return c.json({ error: error.message }, error.statusCode as any);
    }
    const message = error instanceof Error ? error.message : 'Failed to get historical enrollments';
    return c.json({ error: message }, 500);
  }
});

/**
 * PUT /students/:userId/profile
 * Update student profile
 * Authorization: Principal only
 */
profiles.put('/students/:userId/profile', requireAuth, async (c) => {
  try {
    const tenant = requireSchoolTenant(c);
    const userId = c.req.param('userId');

    if (!userId) {
      return c.json({ error: 'User ID is required' }, 400);
    }

    const body = await c.req.json();
    const validated = updateStudentProfileSchema.parse(body);

    const profile = await profilesService.updateStudentProfile(c.env.DB, userId, validated, tenant);

    return c.json({ data: profile }, 200);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json({ error: 'Validation error', details: error.errors }, 400);
    }
    if (error instanceof ProfileError) {
      return c.json({ error: error.message }, error.statusCode as any);
    }
    const message = error instanceof Error ? error.message : 'Failed to update student profile';
    return c.json({ error: message }, 500);
  }
});

/**
 * =====================================================================
 * BIRTHDAYS
 * =====================================================================
 */

/**
 * GET /birthdays/upcoming
 * Get upcoming birthdays (combined teachers and students)
 * Query params: thisWeek (true/false)
 * Authorization: Principal only
 */
profiles.get('/birthdays/upcoming', requireAuth, async (c) => {
  try {
    const tenant = requireSchoolTenant(c);
    
    const thisWeek = c.req.query('thisWeek') === 'true';
    
    const filters: BirthdayFilters = {
      thisWeek: thisWeek || undefined,
    };

    // Get both teacher and student birthdays
    const [teacherBirthdays, studentBirthdays] = await Promise.all([
      profilesService.getTeacherBirthdays(c.env.DB, filters, tenant),
      profilesService.getStudentBirthdays(c.env.DB, filters, tenant),
    ]);

    // Helper to calculate days until birthday
    const calculateDaysUntil = (dobMd: string): number => {
      const [month, day] = dobMd.split('-').map(Number);
      const today = new Date();
      const currentYear = today.getFullYear();
      
      let birthdayThisYear = new Date(currentYear, month - 1, day);
      
      // If birthday has passed this year, calculate for next year
      if (birthdayThisYear < today) {
        birthdayThisYear = new Date(currentYear + 1, month - 1, day);
      }
      
      const diffTime = birthdayThisYear.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      return diffDays;
    };

    // Combine and format with proper types for frontend
    const combined = [
      ...teacherBirthdays.map(t => ({
        user_id: t.user_id,
        role: 'teacher' as const,
        full_name: `${t.first_name} ${t.last_name}`,
        date_of_birth: t.full_dob || '',
        days_until: calculateDaysUntil(t.dob_md),
      })),
      ...studentBirthdays.map(s => ({
        user_id: s.user_id,
        role: 'student' as const,
        full_name: `${s.first_name} ${s.last_name}`,
        date_of_birth: s.full_dob || '',
        classroom: `${s.grade_name} ${s.division_name}`,
        days_until: calculateDaysUntil(s.dob_md),
      })),
    ];

    // Sort by days until birthday
    combined.sort((a, b) => a.days_until - b.days_until);

    return c.json({ data: combined }, 200);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json({ error: 'Validation error', details: error.errors }, 400);
    }
    if (error instanceof ProfileError) {
      return c.json({ error: error.message }, error.statusCode as any);
    }
    const message = error instanceof Error ? error.message : 'Failed to get upcoming birthdays';
    return c.json({ error: message }, 500);
  }
});

/**
 * GET /birthdays/teachers
 * Get teacher birthdays
 * Query params: month (1-12), today (true/false), thisWeek (true/false)
 * Authorization: Principal only
 */
profiles.get('/birthdays/teachers', requireAuth, async (c) => {
  try {
    const tenant = requireSchoolTenant(c);
    const query = c.req.query();

    const validated = birthdayQuerySchema.parse(query);

    const filters = {
      month: validated.month,
      today: validated.today === 'true',
      thisWeek: validated.thisWeek === 'true',
    };

    const birthdays = await profilesService.getTeacherBirthdays(c.env.DB, filters, tenant);

    return c.json({ data: birthdays }, 200);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json({ error: 'Invalid query parameters', details: error.errors }, 400);
    }
    if (error instanceof ProfileError) {
      return c.json({ error: error.message }, error.statusCode as any);
    }
    const message = error instanceof Error ? error.message : 'Failed to get teacher birthdays';
    return c.json({ error: message }, 500);
  }
});

/**
 * GET /birthdays/students
 * Get student birthdays
 * Query params: month (1-12), today (true/false), thisWeek (true/false), classroomId (uuid)
 * Authorization: Principal (school-wide), Teacher (class teacher classrooms only)
 */
profiles.get('/birthdays/students', requireAuth, async (c) => {
  try {
    const tenant = requireSchoolTenant(c);
    const query = c.req.query();

    const validated = birthdayQuerySchema.parse(query);

    const filters = {
      month: validated.month,
      today: validated.today === 'true',
      thisWeek: validated.thisWeek === 'true',
      classroomId: validated.classroomId,
    };

    const birthdays = await profilesService.getStudentBirthdays(c.env.DB, filters, tenant);

    return c.json({ data: birthdays }, 200);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json({ error: 'Invalid query parameters', details: error.errors }, 400);
    }
    if (error instanceof ProfileError) {
      return c.json({ error: error.message }, error.statusCode as any);
    }
    const message = error instanceof Error ? error.message : 'Failed to get student birthdays';
    return c.json({ error: message }, 500);
  }
});

export default profiles;
