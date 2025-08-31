// Database configuration constants
export const DATABASE_CONFIG = {
  LIMITS: {
    MAX_SAFETY_LIMIT: 50,
    DEFAULT_PAGE_SIZE: 20,
    MAX_PAGE_SIZE: 100,
    MAX_BULK_INSERT: 1000,
  },
  TIMEOUTS: {
    QUERY_TIMEOUT_MS: 30000,
    CONNECTION_TIMEOUT_MS: 5000,
  },
  CACHE: {
    TTL_SECONDS: 300,
    MAX_ENTRIES: 1000,
  }
} as const;

// Database operation types
export const DB_OPERATIONS = {
  CREATE: 'create',
  READ: 'read', 
  UPDATE: 'update',
  DELETE: 'delete',
  BULK_INSERT: 'bulk_insert',
  BULK_UPDATE: 'bulk_update',
  BULK_DELETE: 'bulk_delete',
} as const;

export type DbOperation = typeof DB_OPERATIONS[keyof typeof DB_OPERATIONS];