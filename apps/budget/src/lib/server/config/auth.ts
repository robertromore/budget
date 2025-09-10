// Authentication and authorization configuration
export const AUTH_CONFIG = {
  SESSION: {
    COOKIE_NAME: "session",
    MAX_AGE_SECONDS: 60 * 60 * 24 * 7, // 1 week
    SECURE: true,
    HTTP_ONLY: true,
    SAME_SITE: "strict" as const,
  },
  RATE_LIMITING: {
    LOGIN_ATTEMPTS: {
      MAX_ATTEMPTS: 5,
      WINDOW_MS: 15 * 60 * 1000, // 15 minutes
      LOCKOUT_DURATION_MS: 30 * 60 * 1000, // 30 minutes
    },
    PASSWORD_RESET: {
      MAX_ATTEMPTS: 3,
      WINDOW_MS: 60 * 60 * 1000, // 1 hour
    },
  },
  PASSWORD: {
    MIN_LENGTH: 8,
    MAX_LENGTH: 128,
    REQUIRE_UPPERCASE: true,
    REQUIRE_LOWERCASE: true,
    REQUIRE_NUMBERS: true,
    REQUIRE_SYMBOLS: false,
  },
} as const;

// User roles and permissions
export const USER_ROLES = {
  ADMIN: "admin",
  USER: "user",
  READONLY: "readonly",
} as const;

export const PERMISSIONS = {
  ACCOUNTS: {
    CREATE: "accounts:create",
    READ: "accounts:read",
    UPDATE: "accounts:update",
    DELETE: "accounts:delete",
  },
  TRANSACTIONS: {
    CREATE: "transactions:create",
    READ: "transactions:read",
    UPDATE: "transactions:update",
    DELETE: "transactions:delete",
  },
  CATEGORIES: {
    CREATE: "categories:create",
    READ: "categories:read",
    UPDATE: "categories:update",
    DELETE: "categories:delete",
  },
  PAYEES: {
    CREATE: "payees:create",
    READ: "payees:read",
    UPDATE: "payees:update",
    DELETE: "payees:delete",
  },
} as const;

export type UserRole = (typeof USER_ROLES)[keyof typeof USER_ROLES];
export type Permission =
  (typeof PERMISSIONS)[keyof typeof PERMISSIONS][keyof (typeof PERMISSIONS)[keyof typeof PERMISSIONS]];
