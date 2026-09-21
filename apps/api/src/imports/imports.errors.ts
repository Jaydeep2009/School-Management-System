/**
 * Imports Error Definitions
 */

export class ImportError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number
  ) {
    super(message);
    this.name = 'ImportError';
  }

  static importNotFound(importId: string): ImportError {
    return new ImportError(
      `Import job not found: ${importId}`,
      'IMPORT_NOT_FOUND',
      404
    );
  }

  static accessDenied(reason?: string): ImportError {
    return new ImportError(
      reason || 'Access denied to import job',
      'IMPORT_ACCESS_DENIED',
      403
    );
  }

  static invalidStatus(currentStatus: string, requiredStatus: string): ImportError {
    return new ImportError(
      `Import job has status '${currentStatus}', expected '${requiredStatus}'`,
      'IMPORT_INVALID_STATUS',
      400
    );
  }

  static expired(importId: string): ImportError {
    return new ImportError(
      `Import job ${importId} has expired`,
      'IMPORT_EXPIRED',
      410
    );
  }

  static validationFailed(errors: unknown[]): ImportError {
    return new ImportError(
      `Import validation failed with ${errors.length} error(s)`,
      'IMPORT_VALIDATION_FAILED',
      400
    );
  }

  static unsupportedKind(kind: string): ImportError {
    return new ImportError(
      `Unsupported import kind: ${kind}`,
      'IMPORT_UNSUPPORTED_KIND',
      400
    );
  }

  static commitFailed(reason: string): ImportError {
    return new ImportError(
      `Import commit failed: ${reason}`,
      'IMPORT_COMMIT_FAILED',
      500
    );
  }

  static payloadTooLarge(): ImportError {
    return new ImportError(
      'Import payload exceeds maximum size',
      'IMPORT_PAYLOAD_TOO_LARGE',
      413
    );
  }

  static invalidPayload(reason: string): ImportError {
    return new ImportError(
      `Invalid import payload: ${reason}`,
      'IMPORT_INVALID_PAYLOAD',
      400
    );
  }
}
