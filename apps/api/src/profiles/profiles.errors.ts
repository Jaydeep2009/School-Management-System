/**
 * Profiles Error Definitions
 * 
 * Typed errors for profile and birthday operations
 */

export class ProfileError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number
  ) {
    super(message);
    this.name = 'ProfileError';
  }

  static profileNotFound(userId: string): ProfileError {
    return new ProfileError(
      `Profile not found for user ${userId}`,
      'PROFILE_NOT_FOUND',
      404
    );
  }

  static teacherNotFound(teacherId: string): ProfileError {
    return new ProfileError(
      `Teacher profile not found: ${teacherId}`,
      'TEACHER_NOT_FOUND',
      404
    );
  }

  static studentNotFound(studentId: string): ProfileError {
    return new ProfileError(
      `Student profile not found: ${studentId}`,
      'STUDENT_NOT_FOUND',
      404
    );
  }

  static accessDenied(reason?: string): ProfileError {
    return new ProfileError(
      reason || 'Access denied to profile',
      'PROFILE_ACCESS_DENIED',
      403
    );
  }

  static validationFailed(field: string, reason: string): ProfileError {
    return new ProfileError(
      `Validation failed for ${field}: ${reason}`,
      'PROFILE_VALIDATION_FAILED',
      400
    );
  }

  static invalidDate(field: string): ProfileError {
    return new ProfileError(
      `Invalid date format for ${field}`,
      'PROFILE_INVALID_DATE',
      400
    );
  }

  static noCurrentEnrollment(studentId: string): ProfileError {
    return new ProfileError(
      `No current enrollment found for student ${studentId}`,
      'NO_CURRENT_ENROLLMENT',
      404
    );
  }

  static birthdayAccessDenied(reason?: string): ProfileError {
    return new ProfileError(
      reason || 'Access denied to birthday information',
      'BIRTHDAY_ACCESS_DENIED',
      403
    );
  }

  static invalidBirthdayFilter(): ProfileError {
    return new ProfileError(
      'Invalid birthday filter parameters',
      'INVALID_BIRTHDAY_FILTER',
      400
    );
  }
}
