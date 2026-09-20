/**
 * Promotion Errors
 * 
 * Error classes for promotion and year activation operations
 */

export class PromotionError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: number = 400,
    public readonly details?: any
  ) {
    super(message);
    this.name = 'PromotionError';
  }

  // Batch errors
  static batchNotFound(batchId: string): PromotionError {
    return new PromotionError(
      'Promotion batch not found',
      'PROMOTION_BATCH_NOT_FOUND',
      404,
      { batchId }
    );
  }

  static batchForbidden(batchId: string): PromotionError {
    return new PromotionError(
      'Access to promotion batch forbidden',
      'PROMOTION_BATCH_FORBIDDEN',
      403,
      { batchId }
    );
  }

  static batchInvalidStatus(batchId: string, currentStatus: string, requiredStatus: string): PromotionError {
    return new PromotionError(
      `Batch status is ${currentStatus}, required ${requiredStatus}`,
      'PROMOTION_INVALID_STATUS',
      400,
      { batchId, currentStatus, requiredStatus }
    );
  }

  static batchAlreadyApplied(batchId: string): PromotionError {
    return new PromotionError(
      'Promotion batch is already applied',
      'PROMOTION_BATCH_ALREADY_APPLIED',
      400,
      { batchId }
    );
  }

  static batchAlreadyCancelled(batchId: string): PromotionError {
    return new PromotionError(
      'Promotion batch is already cancelled',
      'PROMOTION_BATCH_ALREADY_CANCELLED',
      400,
      { batchId }
    );
  }

  static conflictingBatch(classroomId: string, toYearId: string): PromotionError {
    return new PromotionError(
      'A non-cancelled promotion batch already exists for this classroom and target year',
      'PROMOTION_CONFLICTING_BATCH',
      409,
      { classroomId, toYearId }
    );
  }

  // Academic year errors
  static yearNotFound(yearId: string): PromotionError {
    return new PromotionError(
      'Academic year not found',
      'PROMOTION_YEAR_NOT_FOUND',
      404,
      { yearId }
    );
  }

  static yearAlreadyCurrent(yearId: string): PromotionError {
    return new PromotionError(
      'Academic year is already current',
      'PROMOTION_YEAR_ALREADY_CURRENT',
      400,
      { yearId }
    );
  }

  static yearAlreadyClosed(yearId: string): PromotionError {
    return new PromotionError(
      'Academic year is already closed',
      'PROMOTION_YEAR_ALREADY_CLOSED',
      400,
      { yearId }
    );
  }

  static invalidYearOrder(): PromotionError {
    return new PromotionError(
      'Target year must be chronologically after source year',
      'PROMOTION_INVALID_YEAR_ORDER',
      400
    );
  }

  // Classroom/enrollment errors
  static classroomNotFound(classroomId: string): PromotionError {
    return new PromotionError(
      'Classroom not found',
      'PROMOTION_CLASSROOM_NOT_FOUND',
      404,
      { classroomId }
    );
  }

  static sourceClassroomInvalid(classroomId: string, yearId: string): PromotionError {
    return new PromotionError(
      'Source classroom does not belong to source academic year',
      'PROMOTION_SOURCE_CLASSROOM_INVALID',
      400,
      { classroomId, yearId }
    );
  }

  static targetClassroomInvalid(classroomId: string, yearId: string): PromotionError {
    return new PromotionError(
      'Target classroom does not belong to target academic year',
      'PROMOTION_TARGET_CLASSROOM_INVALID',
      400,
      { classroomId, yearId }
    );
  }

  // Student/enrollment errors
  static studentNotFound(studentId: string): PromotionError {
    return new PromotionError(
      'Student not found',
      'PROMOTION_STUDENT_NOT_FOUND',
      404,
      { studentId }
    );
  }

  static enrollmentNotFound(enrollmentId: string): PromotionError {
    return new PromotionError(
      'Enrollment not found',
      'PROMOTION_ENROLLMENT_NOT_FOUND',
      404,
      { enrollmentId }
    );
  }

  static duplicateStudent(studentId: string): PromotionError {
    return new PromotionError(
      'Student already exists in this promotion batch',
      'PROMOTION_DUPLICATE_STUDENT',
      409,
      { studentId }
    );
  }

  static conflictingEnrollment(studentId: string, yearId: string): PromotionError {
    return new PromotionError(
      'Student already has an active or planned enrollment in target year',
      'PROMOTION_CONFLICTING_ENROLLMENT',
      409,
      { studentId, yearId }
    );
  }

  static noActiveEnrollment(studentId: string): PromotionError {
    return new PromotionError(
      'Student has no active enrollment in source year',
      'PROMOTION_NO_ACTIVE_ENROLLMENT',
      400,
      { studentId }
    );
  }

  // Item errors
  static itemNotFound(itemId: string): PromotionError {
    return new PromotionError(
      'Promotion item not found',
      'PROMOTION_ITEM_NOT_FOUND',
      404,
      { itemId }
    );
  }

  static targetRequired(decision: string): PromotionError {
    return new PromotionError(
      `Decision '${decision}' requires target classroom`,
      'PROMOTION_TARGET_REQUIRED',
      400,
      { decision }
    );
  }

  static targetForbidden(decision: string): PromotionError {
    return new PromotionError(
      `Decision '${decision}' must not have target classroom`,
      'PROMOTION_TARGET_FORBIDDEN',
      400,
      { decision }
    );
  }

  // Planning/application errors
  static batchNotReady(batchId: string): PromotionError {
    return new PromotionError(
      'Promotion batch is not ready for this operation',
      'PROMOTION_BATCH_NOT_READY',
      400,
      { batchId }
    );
  }

  static batchHasNoItems(batchId: string): PromotionError {
    return new PromotionError(
      'Promotion batch has no items',
      'PROMOTION_BATCH_NO_ITEMS',
      400,
      { batchId }
    );
  }

  static planningValidationFailed(issues: any[]): PromotionError {
    return new PromotionError(
      'Batch planning validation failed',
      'PROMOTION_PLANNING_FAILED',
      400,
      { issues }
    );
  }

  // Activation errors
  static activationBlocked(issues: any[]): PromotionError {
    return new PromotionError(
      'Year activation is blocked by validation issues',
      'PROMOTION_ACTIVATION_BLOCKED',
      400,
      { issues }
    );
  }

  // Authorization errors
  static unauthorized(action: string): PromotionError {
    return new PromotionError(
      `Unauthorized to ${action}`,
      'PROMOTION_UNAUTHORIZED',
      403
    );
  }
}
