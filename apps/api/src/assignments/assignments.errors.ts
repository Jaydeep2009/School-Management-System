/**
 * Assignments Error Handling
 */

export enum AssignmentsErrorCode {
  ASSIGNMENT_NOT_FOUND = 'ASSIGNMENT_NOT_FOUND',
  ASSIGNMENT_FORBIDDEN = 'ASSIGNMENT_FORBIDDEN',
  ASSIGNMENT_ALREADY_PUBLISHED = 'ASSIGNMENT_ALREADY_PUBLISHED',
  ASSIGNMENT_ALREADY_CLOSED = 'ASSIGNMENT_ALREADY_CLOSED',
  ASSIGNMENT_INVALID_STATUS_TRANSITION = 'ASSIGNMENT_INVALID_STATUS_TRANSITION',
  ASSIGNMENT_INVALID_CLASSROOM = 'ASSIGNMENT_INVALID_CLASSROOM',
  ASSIGNMENT_INVALID_SUBJECT = 'ASSIGNMENT_INVALID_SUBJECT',
  
  ATTACHMENT_NOT_FOUND = 'ATTACHMENT_NOT_FOUND',
  ATTACHMENT_FORBIDDEN = 'ATTACHMENT_FORBIDDEN',
  ATTACHMENT_TOO_LARGE = 'ATTACHMENT_TOO_LARGE',
  ATTACHMENT_UNSUPPORTED_TYPE = 'ATTACHMENT_UNSUPPORTED_TYPE',
  ATTACHMENT_STORAGE_ERROR = 'ATTACHMENT_STORAGE_ERROR',
  ATTACHMENT_CANNOT_MODIFY_PUBLISHED = 'ATTACHMENT_CANNOT_MODIFY_PUBLISHED',
}

export class AssignmentsError extends Error {
  constructor(
    message: string,
    public code: AssignmentsErrorCode,
    public statusCode: number = 500
  ) {
    super(message);
    this.name = 'AssignmentsError';
  }

  static assignmentNotFound(id?: string): AssignmentsError {
    return new AssignmentsError(
      id ? `Assignment ${id} not found` : 'Assignment not found',
      AssignmentsErrorCode.ASSIGNMENT_NOT_FOUND,
      404
    );
  }

  static notAuthorized(message: string = 'Not authorized'): AssignmentsError {
    return new AssignmentsError(
      message,
      AssignmentsErrorCode.ASSIGNMENT_FORBIDDEN,
      403
    );
  }

  static alreadyPublished(): AssignmentsError {
    return new AssignmentsError(
      'Assignment is already published',
      AssignmentsErrorCode.ASSIGNMENT_ALREADY_PUBLISHED,
      400
    );
  }

  static alreadyClosed(): AssignmentsError {
    return new AssignmentsError(
      'Assignment is already closed',
      AssignmentsErrorCode.ASSIGNMENT_ALREADY_CLOSED,
      400
    );
  }

  static invalidStatusTransition(from: string, to: string): AssignmentsError {
    return new AssignmentsError(
      `Invalid status transition from ${from} to ${to}`,
      AssignmentsErrorCode.ASSIGNMENT_INVALID_STATUS_TRANSITION,
      400
    );
  }

  static invalidClassroom(): AssignmentsError {
    return new AssignmentsError(
      'Invalid classroom',
      AssignmentsErrorCode.ASSIGNMENT_INVALID_CLASSROOM,
      404
    );
  }

  static invalidSubject(): AssignmentsError {
    return new AssignmentsError(
      'Invalid subject',
      AssignmentsErrorCode.ASSIGNMENT_INVALID_SUBJECT,
      404
    );
  }

  static attachmentNotFound(id?: string): AssignmentsError {
    return new AssignmentsError(
      id ? `Attachment ${id} not found` : 'Attachment not found',
      AssignmentsErrorCode.ATTACHMENT_NOT_FOUND,
      404
    );
  }

  static attachmentTooLarge(maxSize: number): AssignmentsError {
    const maxMB = Math.round(maxSize / (1024 * 1024));
    return new AssignmentsError(
      `Attachment exceeds maximum size of ${maxMB}MB`,
      AssignmentsErrorCode.ATTACHMENT_TOO_LARGE,
      400
    );
  }

  static unsupportedAttachmentType(contentType: string): AssignmentsError {
    return new AssignmentsError(
      `Unsupported attachment type: ${contentType}`,
      AssignmentsErrorCode.ATTACHMENT_UNSUPPORTED_TYPE,
      400
    );
  }

  static attachmentStorageError(message: string): AssignmentsError {
    return new AssignmentsError(
      `Storage error: ${message}`,
      AssignmentsErrorCode.ATTACHMENT_STORAGE_ERROR,
      500
    );
  }

  static cannotModifyPublishedAttachments(): AssignmentsError {
    return new AssignmentsError(
      'Cannot modify attachments of published assignments',
      AssignmentsErrorCode.ATTACHMENT_CANNOT_MODIFY_PUBLISHED,
      400
    );
  }
}
