/**
 * Attendance Module Error Handling
 */

export enum AttendanceErrorCode {
  SESSION_NOT_FOUND = 'ATTENDANCE_SESSION_NOT_FOUND',
  SESSION_LOCKED = 'ATTENDANCE_SESSION_LOCKED',
  SESSION_DUPLICATE = 'ATTENDANCE_DUPLICATE_SESSION',
  NOT_AUTHORIZED = 'ATTENDANCE_NOT_AUTHORIZED',
  EDIT_WINDOW_EXPIRED = 'ATTENDANCE_EDIT_WINDOW_EXPIRED',
  INVALID_STUDENT = 'ATTENDANCE_INVALID_STUDENT',
  INVALID_ENROLLMENT = 'ATTENDANCE_INVALID_ENROLLMENT',
  INVALID_STATUS = 'ATTENDANCE_INVALID_STATUS',
  ACADEMIC_YEAR_CLOSED = 'ATTENDANCE_ACADEMIC_YEAR_CLOSED',
  INVALID_CLASSROOM = 'ATTENDANCE_INVALID_CLASSROOM',
  INVALID_SUBJECT = 'ATTENDANCE_INVALID_SUBJECT',
  INVALID_ASSIGNMENT = 'ATTENDANCE_INVALID_ASSIGNMENT',
}

export class AttendanceError extends Error {
  constructor(
    public code: AttendanceErrorCode,
    message: string,
    public statusCode: number = 400
  ) {
    super(message);
    this.name = 'AttendanceError';
  }

  static sessionNotFound(sessionId?: string): AttendanceError {
    return new AttendanceError(
      AttendanceErrorCode.SESSION_NOT_FOUND,
      sessionId ? `Attendance session not found: ${sessionId}` : 'Attendance session not found',
      404
    );
  }

  static sessionLocked(): AttendanceError {
    return new AttendanceError(
      AttendanceErrorCode.SESSION_LOCKED,
      'Attendance session is locked',
      400
    );
  }

  static duplicateSession(): AttendanceError {
    return new AttendanceError(
      AttendanceErrorCode.SESSION_DUPLICATE,
      'Attendance session already exists for this classroom, subject, date, and period',
      409
    );
  }

  static notAuthorized(reason?: string): AttendanceError {
    return new AttendanceError(
      AttendanceErrorCode.NOT_AUTHORIZED,
      reason || 'Not authorized to perform this attendance operation',
      403
    );
  }

  static editWindowExpired(): AttendanceError {
    return new AttendanceError(
      AttendanceErrorCode.EDIT_WINDOW_EXPIRED,
      'Teacher edit window has expired for this attendance session',
      403
    );
  }

  static invalidStudent(reason?: string): AttendanceError {
    return new AttendanceError(
      AttendanceErrorCode.INVALID_STUDENT,
      reason || 'Invalid student for this attendance session',
      400
    );
  }

  static invalidEnrollment(): AttendanceError {
    return new AttendanceError(
      AttendanceErrorCode.INVALID_ENROLLMENT,
      'Student is not enrolled in the session classroom',
      400
    );
  }

  static academicYearClosed(): AttendanceError {
    return new AttendanceError(
      AttendanceErrorCode.ACADEMIC_YEAR_CLOSED,
      'Cannot modify attendance for closed academic year',
      400
    );
  }

  static invalidClassroom(): AttendanceError {
    return new AttendanceError(
      AttendanceErrorCode.INVALID_CLASSROOM,
      'Classroom not found or does not belong to your school',
      404
    );
  }

  static invalidSubject(): AttendanceError {
    return new AttendanceError(
      AttendanceErrorCode.INVALID_SUBJECT,
      'Subject not found or does not belong to your school',
      404
    );
  }

  static invalidAssignment(): AttendanceError {
    return new AttendanceError(
      AttendanceErrorCode.INVALID_ASSIGNMENT,
      'No teaching assignment found for this classroom and subject',
      403
    );
  }
}
