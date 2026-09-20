/**
 * Fees Management Errors
 * 
 * Error classes and codes for fee management operations
 */

export class FeesError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: number = 400,
    public readonly details?: any
  ) {
    super(message);
    this.name = 'FeesError';
  }

  // Category errors
  static categoryNotFound(categoryId: string): FeesError {
    return new FeesError(
      'Fee category not found',
      'CATEGORY_NOT_FOUND',
      404,
      { categoryId }
    );
  }

  static categoryCodeExists(code: string): FeesError {
    return new FeesError(
      'Fee category code already exists',
      'CATEGORY_CODE_EXISTS',
      409,
      { code }
    );
  }

  static categoryInactive(categoryId: string): FeesError {
    return new FeesError(
      'Fee category is inactive',
      'CATEGORY_INACTIVE',
      400,
      { categoryId }
    );
  }

  // Charge errors
  static chargeNotFound(chargeId: string): FeesError {
    return new FeesError(
      'Fee charge not found',
      'CHARGE_NOT_FOUND',
      404,
      { chargeId }
    );
  }

  static chargeAlreadyVoided(chargeId: string): FeesError {
    return new FeesError(
      'Fee charge is already voided',
      'CHARGE_ALREADY_VOIDED',
      400,
      { chargeId }
    );
  }

  static invalidChargeAmount(kind: string, amount: number): FeesError {
    return new FeesError(
      `Invalid amount for charge kind: ${kind}`,
      'INVALID_CHARGE_AMOUNT',
      400,
      { kind, amount }
    );
  }

  // Payment errors
  static paymentNotFound(paymentId: string): FeesError {
    return new FeesError(
      'Fee payment not found',
      'PAYMENT_NOT_FOUND',
      404,
      { paymentId }
    );
  }

  static paymentAlreadyVoided(paymentId: string): FeesError {
    return new FeesError(
      'Fee payment is already voided',
      'PAYMENT_ALREADY_VOIDED',
      400,
      { paymentId }
    );
  }

  static receiptNumberGenerationFailed(): FeesError {
    return new FeesError(
      'Failed to generate receipt number',
      'RECEIPT_NUMBER_GENERATION_FAILED',
      500
    );
  }

  // Student/enrollment errors
  static studentNotFound(studentId: string): FeesError {
    return new FeesError(
      'Student not found',
      'STUDENT_NOT_FOUND',
      404,
      { studentId }
    );
  }

  static enrollmentNotFound(enrollmentId: string): FeesError {
    return new FeesError(
      'Enrollment not found',
      'ENROLLMENT_NOT_FOUND',
      404,
      { enrollmentId }
    );
  }

  static studentNotEnrolled(studentId: string, academicYearId: string): FeesError {
    return new FeesError(
      'Student not enrolled in academic year',
      'STUDENT_NOT_ENROLLED',
      400,
      { studentId, academicYearId }
    );
  }

  // Academic year errors
  static academicYearNotFound(academicYearId: string): FeesError {
    return new FeesError(
      'Academic year not found',
      'ACADEMIC_YEAR_NOT_FOUND',
      404,
      { academicYearId }
    );
  }

  // Authorization errors
  static unauthorized(action: string): FeesError {
    return new FeesError(
      `Unauthorized to ${action}`,
      'UNAUTHORIZED',
      403
    );
  }

  // Validation errors
  static invalidAmount(): FeesError {
    return new FeesError(
      'Amount must be a positive integer in paise',
      'INVALID_AMOUNT',
      400
    );
  }

  static voidReasonRequired(): FeesError {
    return new FeesError(
      'Void reason is required',
      'VOID_REASON_REQUIRED',
      400
    );
  }
}
