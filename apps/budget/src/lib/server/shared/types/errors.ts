// Base domain error class
export class DomainError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 400,
    public field?: string
  ) {
    super(message);
    this.name = this.constructor.name;
    
    // Ensure proper prototype chain for instanceof checks
    Object.setPrototypeOf(this, DomainError.prototype);
  }
}

// Specific error types
export class ValidationError extends DomainError {
  constructor(message: string, field?: string) {
    super(message, 'VALIDATION_ERROR', 400, field);
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}

export class NotFoundError extends DomainError {
  constructor(resource: string, identifier?: string | number) {
    const message = identifier 
      ? `${resource} with ID ${identifier} not found`
      : `${resource} not found`;
    super(message, 'NOT_FOUND', 404);
    Object.setPrototypeOf(this, NotFoundError.prototype);
  }
}

export class ConflictError extends DomainError {
  constructor(message: string, field?: string) {
    super(message, 'CONFLICT', 409, field);
    Object.setPrototypeOf(this, ConflictError.prototype);
  }
}

export class UnauthorizedError extends DomainError {
  constructor(message: string = 'Unauthorized') {
    super(message, 'UNAUTHORIZED', 401);
    Object.setPrototypeOf(this, UnauthorizedError.prototype);
  }
}

export class ForbiddenError extends DomainError {
  constructor(message: string = 'Forbidden') {
    super(message, 'FORBIDDEN', 403);
    Object.setPrototypeOf(this, ForbiddenError.prototype);
  }
}

export class RateLimitError extends DomainError {
  constructor(retryAfterSeconds: number) {
    super(`Rate limit exceeded. Try again in ${retryAfterSeconds} seconds.`, 'TOO_MANY_REQUESTS', 429);
    Object.setPrototypeOf(this, RateLimitError.prototype);
  }
}

export class DatabaseError extends DomainError {
  constructor(message: string, operation?: string) {
    const fullMessage = operation ? `Database ${operation} failed: ${message}` : message;
    super(fullMessage, 'DATABASE_ERROR', 500);
    Object.setPrototypeOf(this, DatabaseError.prototype);
  }
}

// Error type utilities
export type DomainErrorType = 
  | ValidationError
  | NotFoundError
  | ConflictError
  | UnauthorizedError
  | ForbiddenError
  | RateLimitError
  | DatabaseError
  | DomainError;