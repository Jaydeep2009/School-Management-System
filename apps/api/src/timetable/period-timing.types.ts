/**
 * Period Timing Types
 * Defines the structure of period timings (school day schedule)
 */

export interface PeriodTiming {
  id: string;
  school_id: string;
  academic_year_id: string;
  period_no: number;
  start_time: string; // "HH:MM" format
  end_time: string;   // "HH:MM" format
  label: string;      // "Period 1", "Break", "Lunch", etc.
  is_break: boolean;
  created_at: number;
  updated_at: number;
}

export interface CreatePeriodTimingInput {
  academic_year_id: string;
  period_no: number;
  start_time: string;
  end_time: string;
  label: string;
  is_break?: boolean;
}

export interface UpdatePeriodTimingInput {
  start_time?: string;
  end_time?: string;
  label?: string;
  is_break?: boolean;
}

export class PeriodTimingError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 400
  ) {
    super(message);
    this.name = 'PeriodTimingError';
  }
}
