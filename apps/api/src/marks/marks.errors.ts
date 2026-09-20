/**
 * Marks & Assessments Error Handling
 */

export enum MarksErrorCode {
  ASSESSMENT_NOT_FOUND = 'ASSESSMENT_NOT_FOUND',
  ASSESSMENT_DUPLICATE = 'ASSESSMENT_DUPLICATE',
  ASSESSMENT_NOT_AUTHORIZED = 'ASSESSMENT_NOT_AUTHORIZED',
  ASSESSMENT_LOCKED = 'ASSESSMENT_LOCKED',
  ASSESSMENT_ALREADY_PUBLISHED = 'ASSESSMENT_ALREADY_PUBLISHED',
  ASSESSMENT_INVALID_CLASSROOM = 'ASSESSMENT_INVALID_CLASSROOM',
  ASSESSMENT_INVALID_SUBJECT = 'ASSESSMENT_INVALID_SUBJECT',
  ASSESSMENT_ACADEMIC_YEAR_CLOSED = 'ASSESSMENT_ACADEMIC_YEAR_CLOSED',
  
  MARKS_INVALID_STUDENT = 'MARKS_INVALID_STUDENT',
  MARKS_INVALID_ENROLLMENT = 'MARKS_INVALID_ENROLLMENT',
  MARKS_INVALID_STATUS = 'MARKS_INVALID_STATUS',
  MARKS_REQUIRED_FOR_GRADED = 'MARKS_REQUIRED_FOR_GRADED',
  MARKS_MUST_BE_NULL_FOR_ABSENT = 'MARKS_MUST_BE_NULL_FOR_ABSENT',
  MARKS_MUST_BE_NULL_FOR_EXEMPT = 'MARKS_MUST_BE_NULL_FOR_EXEMPT',
  MARKS_OVER_MAX = 'MARKS_OVER_MAX',
  MARKS_NOT_AUTHORIZED = 'MARKS_NOT_AUTHORIZED',
}

export class MarksError extends Error {
  constructor(
    message: string,
    public code: MarksErrorCode,
    public statusCode: number = 500
  ) {
    super(message);
    this.name = 'MarksError';
  }

  static assessmentNotFound(id?: string): MarksError {
    return new MarksError(
      id ? `Assessment ${id} not found` : 'Assessment not found',
      MarksErrorCode.ASSESSMENT_NOT_FOUND,
      404
    );
  }

  static assessmentDuplicate(): MarksError {
    return new MarksError(
      'An assessment with this name already exists for this classroom and subject',
      MarksErrorCode.ASSESSMENT_DUPLICATE,
      409
    );
  }

  static notAuthorized(message: string = 'Not authorized'): MarksError {
    return new MarksError(
      message,
      MarksErrorCode.ASSESSMENT_NOT_AUTHORIZED,
      403
    );
  }

  static assessmentLocked(): MarksError {
    return new MarksError(
      'Assessment is locked and cannot be modified',
      MarksErrorCode.ASSESSMENT_LOCKED,
      400
    );
  }

  static assessmentAlreadyPublished(): MarksError {
    return new MarksError(
      'Assessment is already published',
      MarksErrorCode.ASSESSMENT_ALREADY_PUBLISHED,
      400
    );
  }

  static invalidClassroom(): MarksError {
    return new MarksError(
      'Invalid classroom',
      MarksErrorCode.ASSESSMENT_INVALID_CLASSROOM,
      404
    );
  }

  static invalidSubject(): MarksError {
    return new MarksError(
      'Invalid subject',
      MarksErrorCode.ASSESSMENT_INVALID_SUBJECT,
      404
    );
  }

  static academicYearClosed(): MarksError {
    return new MarksError(
      'Cannot create assessment for closed academic year',
      MarksErrorCode.ASSESSMENT_ACADEMIC_YEAR_CLOSED,
      400
    );
  }

  static invalidStudent(): MarksError {
    return new MarksError(
      'Invalid student',
      MarksErrorCode.MARKS_INVALID_STUDENT,
      400
    );
  }

  static invalidEnrollment(): MarksError {
    return new MarksError(
      'Student is not enrolled in this classroom',
      MarksErrorCode.MARKS_INVALID_ENROLLMENT,
      400
    );
  }

  static marksOverMax(max: number): MarksError {
    return new MarksError(
      `Marks cannot exceed maximum marks of ${max}`,
      MarksErrorCode.MARKS_OVER_MAX,
      400
    );
  }

  static marksRequiredForGraded(): MarksError {
    return new MarksError(
      'Marks obtained is required for graded status',
      MarksErrorCode.MARKS_REQUIRED_FOR_GRADED,
      400
    );
  }

  static marksMustBeNullForAbsent(): MarksError {
    return new MarksError(
      'Marks obtained must be null for absent status',
      MarksErrorCode.MARKS_MUST_BE_NULL_FOR_ABSENT,
      400
    );
  }

  static marksMustBeNullForExempt(): MarksError {
    return new MarksError(
      'Marks obtained must be null for exempt status',
      MarksErrorCode.MARKS_MUST_BE_NULL_FOR_EXEMPT,
      400
    );
  }
}
