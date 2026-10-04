/**
 * Period Timing Service
 * Business logic for period timings
 */

import * as periodTimingRepo from './period-timing.repository';
import type {
  PeriodTiming,
  CreatePeriodTimingInput,
  UpdatePeriodTimingInput,
} from './period-timing.types';
import { PeriodTimingError } from './period-timing.types';

/**
 * Validate time format (HH:MM)
 */
function validateTimeFormat(time: string): boolean {
  return /^([01]\d|2[0-3]):([0-5]\d)$/.test(time);
}

/**
 * List period timings for academic year
 */
export async function list(
  db: D1Database,
  schoolId: string,
  academicYearId: string
): Promise<PeriodTiming[]> {
  return periodTimingRepo.findByAcademicYear(db, schoolId, academicYearId);
}

/**
 * Get period timing by ID
 */
export async function getById(
  db: D1Database,
  id: string,
  schoolId: string
): Promise<PeriodTiming> {
  const timing = await periodTimingRepo.findById(db, id, schoolId);
  
  if (!timing) {
    throw new PeriodTimingError(
      'Period timing not found',
      'PERIOD_TIMING_NOT_FOUND',
      404
    );
  }

  return timing;
}

/**
 * Create period timing
 */
export async function create(
  db: D1Database,
  schoolId: string,
  input: CreatePeriodTimingInput
): Promise<PeriodTiming> {
  // Validate times
  if (!validateTimeFormat(input.start_time)) {
    throw new PeriodTimingError(
      'Invalid start time format. Use HH:MM (e.g., 08:00)',
      'INVALID_START_TIME',
      400
    );
  }

  if (!validateTimeFormat(input.end_time)) {
    throw new PeriodTimingError(
      'Invalid end time format. Use HH:MM (e.g., 09:00)',
      'INVALID_END_TIME',
      400
    );
  }

  if (input.start_time >= input.end_time) {
    throw new PeriodTimingError(
      'End time must be after start time',
      'INVALID_TIME_RANGE',
      400
    );
  }

  // Check for duplicate period number
  const exists = await periodTimingRepo.existsByPeriodNo(
    db,
    schoolId,
    input.academic_year_id,
    input.period_no
  );

  if (exists) {
    throw new PeriodTimingError(
      `Period ${input.period_no} already exists for this academic year`,
      'DUPLICATE_PERIOD_NO',
      400
    );
  }

  const now = Date.now();
  const id = crypto.randomUUID();

  return periodTimingRepo.create(db, {
    id,
    school_id: schoolId,
    academic_year_id: input.academic_year_id,
    period_no: input.period_no,
    start_time: input.start_time,
    end_time: input.end_time,
    label: input.label,
    is_break: input.is_break || false,
    created_at: now,
    updated_at: now,
  });
}

/**
 * Update period timing
 */
export async function update(
  db: D1Database,
  id: string,
  schoolId: string,
  input: UpdatePeriodTimingInput
): Promise<PeriodTiming> {
  // Check if exists
  const existing = await getById(db, id, schoolId);

  // Validate times if provided
  if (input.start_time && !validateTimeFormat(input.start_time)) {
    throw new PeriodTimingError(
      'Invalid start time format. Use HH:MM (e.g., 08:00)',
      'INVALID_START_TIME',
      400
    );
  }

  if (input.end_time && !validateTimeFormat(input.end_time)) {
    throw new PeriodTimingError(
      'Invalid end time format. Use HH:MM (e.g., 09:00)',
      'INVALID_END_TIME',
      400
    );
  }

  const startTime = input.start_time || existing.start_time;
  const endTime = input.end_time || existing.end_time;

  if (startTime >= endTime) {
    throw new PeriodTimingError(
      'End time must be after start time',
      'INVALID_TIME_RANGE',
      400
    );
  }

  const now = Date.now();

  return periodTimingRepo.update(db, id, schoolId, {
    ...input,
    updated_at: now,
  });
}

/**
 * Delete period timing
 */
export async function remove(
  db: D1Database,
  id: string,
  schoolId: string
): Promise<void> {
  // Check if exists
  await getById(db, id, schoolId);

  // TODO: Check if period timing is used in any timetable entries
  // If yes, prevent deletion or cascade delete

  await periodTimingRepo.remove(db, id, schoolId);
}

/**
 * Initialize default period timings for academic year
 */
export async function initializeDefaults(
  db: D1Database,
  schoolId: string,
  academicYearId: string
): Promise<PeriodTiming[]> {
  // Check if already has period timings
  const existing = await periodTimingRepo.findByAcademicYear(
    db,
    schoolId,
    academicYearId
  );

  if (existing.length > 0) {
    throw new PeriodTimingError(
      'Period timings already exist for this academic year',
      'ALREADY_INITIALIZED',
      400
    );
  }

  return periodTimingRepo.createDefaults(db, schoolId, academicYearId);
}

export { PeriodTimingError };
