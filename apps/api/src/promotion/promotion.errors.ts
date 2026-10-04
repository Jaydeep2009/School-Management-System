/**
 * Promotion Errors
 */

export class PromotionError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 400
  ) {
    super(message);
    this.name = 'PromotionError';
  }

  static enrollmentNotFound(enrollmentId: string): PromotionError {
    return new PromotionError(
      `Enrollment ${enrollmentId} not found`,
      'ENROLLMENT_NOT_FOUND',
      404
    );
  }

  static invalidAction(action: string): PromotionError {
    return new PromotionError(
      `Invalid promotion action: ${action}`,
      'INVALID_ACTION',
      400
    );
  }

  static alreadyPromoted(enrollmentId: string): PromotionError {
    return new PromotionError(
      `Student already has enrollment in target academic year`,
      'ALREADY_PROMOTED',
      400
    );
  }

  static classroomNotFound(classroomId: string): PromotionError {
    return new PromotionError(
      `Classroom ${classroomId} not found`,
      'CLASSROOM_NOT_FOUND',
      404
    );
  }

  static cannotPromoteGraduated(): PromotionError {
    return new PromotionError(
      `Cannot promote already graduated students`,
      'CANNOT_PROMOTE_GRADUATED',
      400
    );
  }
}
