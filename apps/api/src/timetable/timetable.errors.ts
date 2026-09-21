/**
 * Timetable Error Definitions
 */

export class TimetableError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number
  ) {
    super(message);
    this.name = 'TimetableError';
  }

  static timetableNotFound(id: string): TimetableError {
    return new TimetableError(
      `Timetable not found: ${id}`,
      'TIMETABLE_NOT_FOUND',
      404
    );
  }

  static entryNotFound(id: string): TimetableError {
    return new TimetableError(
      `Timetable entry not found: ${id}`,
      'TIMETABLE_ENTRY_NOT_FOUND',
      404
    );
  }

  static accessDenied(reason?: string): TimetableError {
    return new TimetableError(
      reason || 'Access denied to timetable',
      'TIMETABLE_ACCESS_DENIED',
      403
    );
  }

  static classConflict(day: string, period: number): TimetableError {
    return new TimetableError(
      `Class already has a subject scheduled for ${day} period ${period}`,
      'TIMETABLE_CLASS_CONFLICT',
      409
    );
  }

  static teacherConflict(teacherCode: string, day: string, period: number): TimetableError {
    return new TimetableError(
      `Teacher ${teacherCode} is already teaching another class on ${day} period ${period}`,
      'TIMETABLE_TEACHER_CONFLICT',
      409
    );
  }

  static invalidTeachingAssignment(teacherCode: string, subjectCode: string): TimetableError {
    return new TimetableError(
      `Teacher ${teacherCode} does not have a valid teaching assignment for subject ${subjectCode}`,
      'TIMETABLE_INVALID_ASSIGNMENT',
      400
    );
  }

  static invalidStatus(currentStatus: string, requiredStatus: string): TimetableError {
    return new TimetableError(
      `Timetable has status '${currentStatus}', expected '${requiredStatus}'`,
      'TIMETABLE_INVALID_STATUS',
      400
    );
  }

  static publishedTimetableImmutable(): TimetableError {
    return new TimetableError(
      'Cannot modify a published timetable',
      'TIMETABLE_PUBLISHED_IMMUTABLE',
      403
    );
  }

  static validationFailed(field: string, reason: string): TimetableError {
    return new TimetableError(
      `Validation failed for ${field}: ${reason}`,
      'TIMETABLE_VALIDATION_FAILED',
      400
    );
  }

  static invalidTime(field: string): TimetableError {
    return new TimetableError(
      `Invalid time format for ${field}. Expected HH:MM`,
      'TIMETABLE_INVALID_TIME',
      400
    );
  }

  static classroomYearMismatch(): TimetableError {
    return new TimetableError(
      'Classroom does not belong to the specified academic year',
      'TIMETABLE_CLASSROOM_YEAR_MISMATCH',
      400
    );
  }
}
