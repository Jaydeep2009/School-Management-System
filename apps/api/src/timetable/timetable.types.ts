/**
 * Timetable Types
 */

/**
 * Timetable status
 */
export type TimetableStatus = 'draft' | 'published' | 'archived';

/**
 * Day of week (1 = Monday, 7 = Sunday)
 */
export type DayOfWeek = 1 | 2 | 3 | 4 | 5 | 6 | 7;

/**
 * Timetable (from database)
 */
export interface Timetable {
  id: string;
  school_id: string;
  academic_year_id: string;
  classroom_id: string;
  version: number;
  name: string;
  status: TimetableStatus;
  image_url: string | null;
  created_by: string;
  published_at: number | null;
  archived_at: number | null;
  created_at: number;
  updated_at: number;
}

/**
 * Timetable Entry (from database)
 */
export interface TimetableEntry {
  id: string;
  timetable_id: string;
  day_of_week: DayOfWeek;
  period_no: number;
  subject_id: string;
  teacher_id: string | null;
  teacher_name: string | null;
  start_time: string | null;
  end_time: string | null;
  room: string | null;
  created_at: number;
  updated_at: number;
}

/**
 * Timetable with details (enriched response)
 */
export interface TimetableWithDetails extends Timetable {
  academic_year_label: string;
  classroom_code: string;
  classroom_grade: string;
  classroom_division: string;
}

/**
 * Timetable Entry with details (enriched response)
 */
export interface TimetableEntryWithDetails extends TimetableEntry {
  day_name: string;
  subject_code: string;
  subject_name: string;
  teacher_code: string;
  teacher_name: string;
}

/**
 * Create timetable request
 */
export interface CreateTimetableRequest {
  academic_year_id: string;
  classroom_id: string;
  name: string;
}

/**
 * Update timetable request
 */
export interface UpdateTimetableRequest {
  name?: string;
  status?: TimetableStatus;
}

/**
 * Create/Update timetable entry request
 */
export interface UpsertTimetableEntryRequest {
  day_of_week: DayOfWeek;
  period_no: number;
  subject_id: string;
  teacher_id?: string | null;
  teacher_name?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  room?: string | null;
}

/**
 * Timetable Excel row (for import)
 */
export interface TimetableImportRow {
  academic_year: string;
  classroom_code: string;
  day: string;
  period_no: number;
  start_time?: string;
  end_time?: string;
  subject_code: string;
  teacher_code: string;
  room?: string;
}

/**
 * Timetable conflict result
 */
export interface TimetableConflict {
  type: 'CLASS_CONFLICT' | 'TEACHER_CONFLICT';
  message: string;
  existing_entry?: TimetableEntryWithDetails;
}
