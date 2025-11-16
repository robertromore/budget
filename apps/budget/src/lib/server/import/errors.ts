/**
 * Import System Error Classes
 *
 * Custom error types for different import failure scenarios
 * with detailed context for debugging and user feedback.
 */

export class ImportError extends Error {
  constructor(
    message: string,
    public details?: any,
    public code?: string
  ) {
    super(message);
    this.name = "ImportError";
  }
}

export class FileValidationError extends ImportError {
  constructor(
    message: string,
    public fileType?: string
  ) {
    super(message, {fileType}, "FILE_VALIDATION_ERROR");
    this.name = "FileValidationError";
  }
}

export class ParseError extends ImportError {
  constructor(
    message: string,
    public row?: number,
    public column?: string
  ) {
    super(message, {row, column}, "PARSE_ERROR");
    this.name = "ParseError";
  }
}

export class ValidationError extends ImportError {
  constructor(
    message: string,
    public field: string,
    public value?: any,
    public row?: number
  ) {
    super(message, {field, value, row}, "VALIDATION_ERROR");
    this.name = "ValidationError";
  }
}

export class EntityMatchError extends ImportError {
  constructor(
    message: string,
    public entityType: "payee" | "category",
    public searchTerm: string
  ) {
    super(message, {entityType, searchTerm}, "ENTITY_MATCH_ERROR");
    this.name = "EntityMatchError";
  }
}

export class DuplicateTransactionError extends ImportError {
  constructor(
    message: string,
    public duplicateId: number,
    public confidence: number
  ) {
    super(message, {duplicateId, confidence}, "DUPLICATE_TRANSACTION_ERROR");
    this.name = "DuplicateTransactionError";
  }
}
