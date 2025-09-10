// Validation configuration constants
export const VALIDATION_CONFIG = {
  ACCOUNT: {
    NAME: { MIN: 2, MAX: 50 },
    SLUG: { MIN: 2, MAX: 30 },
    NOTES: { MAX: 500 },
  },
  TRANSACTION: {
    AMOUNT: { MIN: -1000000, MAX: 1000000 },
    DESCRIPTION: { MAX: 200 },
    NOTES: { MAX: 500 },
  },
  CATEGORY: {
    NAME: { MIN: 1, MAX: 50 },
    DESCRIPTION: { MAX: 200 },
  },
  PAYEE: {
    NAME: { MIN: 1, MAX: 100 },
    DESCRIPTION: { MAX: 200 },
  },
  SCHEDULE: {
    NAME: { MIN: 1, MAX: 100 },
    AMOUNT: { MIN: -1000000, MAX: 1000000 },
    NOTES: { MAX: 500 },
  },
  VIEW: {
    NAME: { MIN: 1, MAX: 50 },
    DESCRIPTION: { MAX: 200 },
  }
} as const;

// Input sanitization patterns
export const SANITIZATION_PATTERNS = {
  // Dangerous patterns to reject
  XSS_PATTERNS: ['<', '>', '{', '}', '${', '<%', '%>', '{{', '}}'],
  SQL_INJECTION_PATTERNS: ["'", '"', ';', '--', '/*', '*/', 'union', 'select', 'drop', 'delete', 'insert', 'update'],
  
  // Safe characters for different field types
  NAME_ALLOWED: /^[a-zA-Z0-9\s\-_.()&]+$/,
  SLUG_ALLOWED: /^[a-z0-9\-_]+$/,
  DESCRIPTION_ALLOWED: /^[a-zA-Z0-9\s\-_.()&,!?:;]+$/,
} as const;