/**
 * School Management Errors
 */

export class SchoolError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 400
  ) {
    super(message);
    this.name = 'SchoolError';
  }

  static schoolNotFound(schoolId: string): SchoolError {
    return new SchoolError(
      `School not found: ${schoolId}`,
      'SCHOOL_NOT_FOUND',
      404
    );
  }

  static duplicateSchoolCode(code: string): SchoolError {
    return new SchoolError(
      `School code already exists: ${code}`,
      'DUPLICATE_SCHOOL_CODE',
      409
    );
  }

  static invalidSchoolStatus(current: string, expected: string): SchoolError {
    return new SchoolError(
      `Invalid school status: expected ${expected}, got ${current}`,
      'INVALID_SCHOOL_STATUS',
      400
    );
  }

  static schoolNotActive(schoolId: string): SchoolError {
    return new SchoolError(
      `School is not active: ${schoolId}`,
      'SCHOOL_NOT_ACTIVE',
      403
    );
  }

  static principalAlreadyExists(schoolId: string): SchoolError {
    return new SchoolError(
      `An active Principal already exists for this school`,
      'PRINCIPAL_ALREADY_EXISTS',
      409
    );
  }

  static codeImmutable(): SchoolError {
    return new SchoolError(
      'School code cannot be changed',
      'SCHOOL_CODE_IMMUTABLE',
      400
    );
  }
}
