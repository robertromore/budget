# Backend Architecture

This document provides a comprehensive overview of the backend architecture, including domain organization, data access patterns, API design, and security implementation.

[TOC]

## Overview

The backend architecture follows domain-driven design principles with a clear separation of concerns across repository, service, and API layers. Built on tRPC for type-safe communication, the backend emphasizes security, performance, and maintainability.

## Architecture Layers

### Domain-Driven Organization

```
src/lib/server/domains/
├── accounts/           # Account management domain (fully implemented)
│   ├── index.ts       # Domain exports
│   ├── repository.ts  # Data access layer
│   ├── services.ts    # Business logic layer
│   ├── routes.ts      # tRPC API routes
│   └── validation.ts  # Domain validation schemas
├── categories/        # Category management domain
├── payees/           # Payee management domain
├── schedules/        # Recurring transaction schedules
├── transactions/     # Transaction management domain
└── views/            # Custom view configurations
```

### Shared Infrastructure

```
src/lib/server/shared/
├── database/         # Database abstractions and utilities
├── middleware/       # tRPC middleware components
├── trpc/            # tRPC configuration and procedures
├── types/           # Shared type definitions
└── validation/      # Common validation utilities
```

### Configuration Management

```
src/lib/server/config/
├── auth.ts          # Authentication configuration
├── database.ts      # Database settings and limits
├── index.ts         # Consolidated configuration exports
└── validation.ts    # Validation rules and constants
```

## Domain Architecture Pattern

### Repository Layer

The repository layer provides data access abstraction with a base repository class:

```typescript
export abstract class BaseRepository<
  TTable,
  TEntity,
  TCreateInput,
  TUpdateInput = Partial<TCreateInput>
> {
  constructor(
    protected db: any,
    protected table: TTable,
    protected entityName: string
  ) {}

  // Standard CRUD operations
  async findById(id: number): Promise<TEntity | null>;
  async findAll(options?: PaginationOptions): Promise<PaginatedResult<TEntity>>;
  async create(data: TCreateInput): Promise<TEntity>;
  async update(id: number, data: TUpdateInput): Promise<TEntity>;
  async delete(id: number): Promise<void>;
  async softDelete(id: number): Promise<TEntity>;
  
  // Bulk operations
  async bulkCreate(data: TCreateInput[]): Promise<TEntity[]>;
  async bulkDelete(ids: number[]): Promise<void>;
  
  // Utility methods
  async count(): Promise<number>;
  async exists(id: number): Promise<boolean>;
}
```

#### Domain-Specific Repository

Each domain extends the base repository with specialized methods:

```typescript
export class AccountRepository extends BaseRepository<
  typeof accounts,
  Account,
  CreateAccountInput,
  UpdateAccountInput
> {
  constructor() {
    super(db, accounts, 'Account');
  }

  async findBySlug(slug: string): Promise<Account | null> {
    const result = await this.db
      .select()
      .from(accounts)
      .where(and(
        eq(accounts.slug, slug),
        isNull(accounts.deletedAt)
      ))
      .limit(1);
    
    return result[0] || null;
  }

  async isSlugUnique(slug: string, excludeId?: number): Promise<boolean> {
    // Implementation
  }

  async findWithTransactions(id: number): Promise<AccountWithTransactions | null> {
    // Implementation
  }

  async searchByName(query: string, limit: number = 10): Promise<Account[]> {
    // Implementation
  }

  async updateBalance(id: number, newBalance: number): Promise<Account> {
    return await this.update(id, { balance: newBalance });
  }
}
```

### Service Layer

The service layer implements business logic and orchestrates repository operations:

```typescript
export class AccountService {
  constructor(private repository: AccountRepository) {}

  async createAccount(data: CreateAccountInput): Promise<Account> {
    // Business logic validation
    await this.validateAccountCreation(data);
    
    // Ensure slug uniqueness
    if (!await this.repository.isSlugUnique(data.slug)) {
      throw new ValidationError('slug', 'Slug must be unique');
    }
    
    // Create account
    return await this.repository.create(data);
  }

  async updateAccount(id: number, data: UpdateAccountInput): Promise<Account> {
    // Verify account exists
    const existingAccount = await this.repository.findByIdOrThrow(id);
    
    // Validate slug uniqueness if changed
    if (data.slug && data.slug !== existingAccount.slug) {
      if (!await this.repository.isSlugUnique(data.slug, id)) {
        throw new ValidationError('slug', 'Slug must be unique');
      }
    }
    
    return await this.repository.update(id, data);
  }

  async deleteAccount(id: number): Promise<void> {
    // Business logic checks
    await this.validateAccountDeletion(id);
    
    // Soft delete to maintain referential integrity
    await this.repository.softDelete(id);
  }

  private async validateAccountCreation(data: CreateAccountInput): Promise<void> {
    // Custom business validation logic
    if (data.balance && data.balance < 0) {
      throw new ValidationError('balance', 'Initial balance cannot be negative');
    }
  }

  private async validateAccountDeletion(id: number): Promise<void> {
    // Check for related transactions, schedules, etc.
    // Prevent deletion if dependencies exist
  }
}
```

### API Routes Layer

tRPC routes provide type-safe API endpoints:

```typescript
export const accountRoutes = router({
  // Query operations
  getAll: authenticatedProcedure
    .input(z.object({
      page: z.number().default(1),
      pageSize: z.number().default(20)
    }))
    .query(async ({ input, ctx }) => {
      return await ctx.accountService.findAllAccounts(input);
    }),

  getById: authenticatedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input, ctx }) => {
      return await ctx.accountService.findAccountById(input.id);
    }),

  getBySlug: authenticatedProcedure
    .input(z.object({ slug: z.string() }))
    .query(async ({ input, ctx }) => {
      return await ctx.accountService.findAccountBySlug(input.slug);
    }),

  // Mutation operations
  create: rateLimitedProcedure
    .input(createAccountSchema)
    .mutation(async ({ input, ctx }) => {
      return await ctx.accountService.createAccount(input);
    }),

  update: rateLimitedProcedure
    .input(updateAccountSchema)
    .mutation(async ({ input, ctx }) => {
      const { id, ...data } = input;
      return await ctx.accountService.updateAccount(id, data);
    }),

  remove: rateLimitedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      await ctx.accountService.deleteAccount(input.id);
      return { success: true };
    }),

  // Bulk operations
  bulkDelete: bulkProcedure
    .input(z.object({ ids: z.array(z.number()) }))
    .mutation(async ({ input, ctx }) => {
      await ctx.accountService.bulkDeleteAccounts(input.ids);
      return { success: true, deletedCount: input.ids.length };
    })
});
```

## tRPC Architecture

### Procedure Types

The application defines multiple procedure types with different security and rate limiting characteristics:

```typescript
// Base procedure with error handling
const baseProcedure = t.procedure.use(errorHandler);

// Public procedure - no authentication required
export const publicProcedure = baseProcedure;

// Authenticated procedure - requires valid user session
export const authenticatedProcedure = baseProcedure.use(requireAuth);

// Admin procedure - requires admin role
export const adminProcedure = authenticatedProcedure.use(requireAdmin);

// Rate limited procedures
export const rateLimitedProcedure = authenticatedProcedure.use(mutationRateLimit);
export const bulkProcedure = authenticatedProcedure.use(bulkOperationRateLimit);
export const strictProcedure = authenticatedProcedure.use(strictRateLimit);
export const adminRateLimitedProcedure = adminProcedure.use(mutationRateLimit);
```

### Middleware Pipeline

#### Authentication Middleware

```typescript
export const requireAuth = t.middleware(({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'Authentication required'
    });
  }

  return next({
    ctx: {
      ...ctx,
      user: ctx.user
    }
  });
});

export const requireAdmin = t.middleware(({ ctx, next }) => {
  if (!ctx.user?.isAdmin) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'Admin access required'
    });
  }

  return next();
});
```

#### Rate Limiting Middleware

```typescript
// Standard mutation rate limit: 100 requests per minute
export const mutationRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  message: 'Too many requests, please try again later'
});

// Bulk operation rate limit: 10 requests per minute
export const bulkOperationRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: 'Too many bulk operations, please try again later'
});

// Strict rate limit for sensitive operations: 20 requests per minute
export const strictRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  message: 'Rate limit exceeded for sensitive operation'
});
```

#### Error Handling Middleware

```typescript
export const errorHandler = t.middleware(({ next }) => {
  return next().catch((error) => {
    // Log error details
    logger.error('tRPC Error:', {
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });

    // Transform domain errors to tRPC errors
    if (error instanceof ValidationError) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: error.message,
        cause: error
      });
    }

    if (error instanceof NotFoundError) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: error.message,
        cause: error
      });
    }

    if (error instanceof DatabaseError) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Database operation failed',
        cause: error
      });
    }

    // Re-throw tRPC errors as-is
    if (error instanceof TRPCError) {
      throw error;
    }

    // Wrap unknown errors
    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected error occurred',
      cause: error
    });
  });
});
```

### Context Management

The tRPC context provides access to services and user information:

```typescript
export async function createContext({ request }: { request: Request }): Promise<Context> {
  // Extract user from session/JWT
  const user = await getUserFromRequest(request);
  
  // Initialize services
  const accountRepository = new AccountRepository();
  const accountService = new AccountService(accountRepository);
  
  // Add more services as domains are implemented
  
  return {
    user,
    accountService,
    // Additional services will be added here
  };
}

export type Context = {
  user?: User;
  accountService: AccountService;
};
```

## Database Architecture

### Schema Design

Database schemas are defined using Drizzle ORM with TypeScript types:

```typescript
export const accounts = sqliteTable('accounts', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  balance: real('balance').default(0),
  notes: text('notes'),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' })
    .$onUpdateFn(() => new Date()),
  deletedAt: integer('deleted_at', { mode: 'timestamp' })
});

// Indexes for performance
export const accountsIndexes = [
  index('idx_accounts_slug').on(accounts.slug),
  index('idx_accounts_deleted_at').on(accounts.deletedAt),
  index('idx_accounts_name').on(accounts.name)
];

// Auto-generated schemas for validation
export const insertAccountSchema = createInsertSchema(accounts);
export const selectAccountSchema = createSelectSchema(accounts);

// TypeScript types
export type Account = typeof accounts.$inferSelect;
export type InsertAccount = typeof accounts.$inferInsert;
```

### Migration Strategy

Database migrations are managed through Drizzle Kit:

```sql
-- Migration: 0001_add_accounts.sql
CREATE TABLE accounts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  balance REAL DEFAULT 0,
  notes TEXT,
  created_at INTEGER,
  updated_at INTEGER,
  deleted_at INTEGER
);

CREATE INDEX idx_accounts_slug ON accounts(slug);
CREATE INDEX idx_accounts_deleted_at ON accounts(deleted_at);
CREATE INDEX idx_accounts_name ON accounts(name);
```

### Connection Management

Database connections are managed centrally:

```typescript
import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';

const sqlite = new Database('sqlite.db');
export const db = drizzle(sqlite);

// Connection configuration
sqlite.pragma('journal_mode = WAL');
sqlite.pragma('foreign_keys = ON');
sqlite.pragma('synchronous = NORMAL');
```

## Security Implementation

### Input Validation

All inputs are validated using Zod schemas:

```typescript
export const createAccountSchema = z.object({
  name: z.string()
    .min(1, 'Name is required')
    .max(100, 'Name cannot exceed 100 characters')
    .regex(/^[a-zA-Z0-9\s-']+$/, 'Name contains invalid characters'),
  
  slug: z.string()
    .min(1, 'Slug is required')
    .max(50, 'Slug cannot exceed 50 characters')
    .regex(/^[a-z0-9-]+$/, 'Slug must contain only lowercase letters, numbers, and hyphens')
    .transform(slug => slug.toLowerCase()),
  
  balance: z.number()
    .optional()
    .default(0)
    .refine(val => val >= -999999.99 && val <= 999999.99, 'Balance out of range'),
  
  notes: z.string()
    .max(500, 'Notes cannot exceed 500 characters')
    .optional()
    .transform(notes => notes?.trim())
});
```

### SQL Injection Prevention

Using parameterized queries through Drizzle ORM:

```typescript
// Safe - uses parameterized query
const account = await db
  .select()
  .from(accounts)
  .where(eq(accounts.slug, userInput))
  .limit(1);

// All repository methods use parameterized queries
```

### Authentication & Authorization

Session-based authentication with role-based access control:

```typescript
export async function authenticate(request: Request): Promise<User | null> {
  const sessionId = getSessionFromRequest(request);
  if (!sessionId) return null;
  
  const session = await getValidSession(sessionId);
  if (!session) return null;
  
  return await getUserById(session.userId);
}

export function authorizeAdmin(user: User | null): void {
  if (!user?.isAdmin) {
    throw new AuthorizationError('Admin access required');
  }
}

export function authorizeOwnership(user: User, resourceUserId: number): void {
  if (user.id !== resourceUserId && !user.isAdmin) {
    throw new AuthorizationError('Access denied to resource');
  }
}
```

## Error Handling

### Custom Error Types

Domain-specific error hierarchy:

```typescript
export abstract class DomainError extends Error {
  abstract code: string;
  
  constructor(message: string, public details?: any) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class ValidationError extends DomainError {
  code = 'VALIDATION_ERROR';
  
  constructor(field: string, message: string) {
    super(`Validation failed for ${field}: ${message}`);
  }
}

export class NotFoundError extends DomainError {
  code = 'NOT_FOUND';
  
  constructor(entity: string, identifier: string | number) {
    super(`${entity} not found: ${identifier}`);
  }
}

export class DatabaseError extends DomainError {
  code = 'DATABASE_ERROR';
  
  constructor(message: string, operation: string) {
    super(`Database ${operation} failed: ${message}`);
  }
}

export class AuthenticationError extends DomainError {
  code = 'AUTHENTICATION_ERROR';
}

export class AuthorizationError extends DomainError {
  code = 'AUTHORIZATION_ERROR';
}
```

### Error Propagation

Consistent error handling across layers:

```typescript
// Repository layer - catch and wrap database errors
async findById(id: number): Promise<TEntity | null> {
  try {
    const result = await this.db
      .select()
      .from(this.table)
      .where(eq((this.table as any).id, id))
      .limit(1);
    
    return result[0] || null;
  } catch (error) {
    throw new DatabaseError(`Failed to find ${this.entityName}`, 'findById');
  }
}

// Service layer - business logic error handling
async createAccount(data: CreateAccountInput): Promise<Account> {
  try {
    await this.validateAccountCreation(data);
    return await this.repository.create(data);
  } catch (error) {
    if (error instanceof DomainError) {
      throw error;
    }
    throw new DomainError('Failed to create account', 'ACCOUNT_CREATION_FAILED', error);
  }
}

// Route layer - HTTP status mapping via tRPC middleware
```

## Performance Optimizations

### Database Optimization

- **Indexes**: Strategic indexing on frequently queried columns
- **Connection pooling**: Efficient connection reuse
- **Query optimization**: Minimal data transfer with selective queries
- **Bulk operations**: Batch processing for multiple records

### Caching Strategy

```typescript
// In-memory caching for frequently accessed data
const cache = new Map<string, { data: any; expires: number }>();

export function getCached<T>(key: string): T | null {
  const item = cache.get(key);
  if (!item || Date.now() > item.expires) {
    cache.delete(key);
    return null;
  }
  return item.data;
}

export function setCache<T>(key: string, data: T, ttl: number = 300000): void {
  cache.set(key, {
    data,
    expires: Date.now() + ttl
  });
}
```

### Pagination and Limiting

Built-in pagination with configurable limits:

```typescript
async findAll(options?: PaginationOptions): Promise<PaginatedResult<TEntity>> {
  const {
    page = 1,
    pageSize = DATABASE_CONFIG.LIMITS.DEFAULT_PAGE_SIZE,
    offset,
    limit
  } = options || {};

  // Enforce maximum page size
  const actualLimit = limit || Math.min(pageSize, DATABASE_CONFIG.LIMITS.MAX_PAGE_SIZE);
  const actualOffset = offset !== undefined ? offset : (page - 1) * actualLimit;

  // Get total count
  const [{ total }] = await this.db
    .select({ total: count() })
    .from(this.table);

  // Get paginated data
  const data = await this.db
    .select()
    .from(this.table)
    .limit(actualLimit)
    .offset(actualOffset)
    .orderBy(desc((this.table as any).id));

  return {
    data,
    total: total || 0,
    page,
    pageSize: actualLimit,
    hasNext: actualOffset + actualLimit < (total || 0),
    hasPrevious: actualOffset > 0,
  };
}
```

## Monitoring and Logging

### Structured Logging

```typescript
export const logger = {
  info(message: string, meta?: object) {
    console.log(JSON.stringify({
      level: 'info',
      message,
      timestamp: new Date().toISOString(),
      ...meta
    }));
  },
  
  error(message: string, meta?: object) {
    console.error(JSON.stringify({
      level: 'error',
      message,
      timestamp: new Date().toISOString(),
      ...meta
    }));
  },
  
  warn(message: string, meta?: object) {
    console.warn(JSON.stringify({
      level: 'warn',
      message,
      timestamp: new Date().toISOString(),
      ...meta
    }));
  }
};

// Usage in services
logger.info('Account created', {
  accountId: account.id,
  userId: ctx.user.id,
  operation: 'create_account'
});
```

### Health Checks

```typescript
export async function healthCheck(): Promise<HealthStatus> {
  const checks = {
    database: await checkDatabase(),
    memory: checkMemoryUsage(),
    uptime: process.uptime()
  };
  
  return {
    status: Object.values(checks).every(Boolean) ? 'healthy' : 'unhealthy',
    checks,
    timestamp: new Date().toISOString()
  };
}
```

## Testing Architecture

### Unit Testing Services

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AccountService } from '../services';
import { AccountRepository } from '../repository';
import { ValidationError } from '$lib/server/shared/types/errors';

describe('AccountService', () => {
  let service: AccountService;
  let mockRepository: vi.Mocked<AccountRepository>;

  beforeEach(() => {
    mockRepository = {
      create: vi.fn(),
      findBySlug: vi.fn(),
      isSlugUnique: vi.fn(),
    } as any;
    
    service = new AccountService(mockRepository);
  });

  describe('createAccount', () => {
    it('should create account with valid data', async () => {
      const accountData = {
        name: 'Test Account',
        slug: 'test-account',
        balance: 100
      };

      mockRepository.isSlugUnique.mockResolvedValue(true);
      mockRepository.create.mockResolvedValue({ id: 1, ...accountData });

      const result = await service.createAccount(accountData);

      expect(mockRepository.isSlugUnique).toHaveBeenCalledWith('test-account');
      expect(mockRepository.create).toHaveBeenCalledWith(accountData);
      expect(result).toMatchObject({ id: 1, ...accountData });
    });

    it('should throw error for duplicate slug', async () => {
      mockRepository.isSlugUnique.mockResolvedValue(false);

      await expect(service.createAccount({
        name: 'Test',
        slug: 'duplicate'
      })).rejects.toThrow(ValidationError);
    });
  });
});
```

### Integration Testing APIs

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { createTestDatabase, createTestContext } from '../setup';
import { accountRoutes } from '../routes';

describe('Account API Integration', () => {
  beforeEach(async () => {
    await createTestDatabase();
  });

  it('should create account via API', async () => {
    const ctx = createTestContext({ user: { id: 1, isAdmin: false } });
    const caller = accountRoutes.createCaller(ctx);

    const account = await caller.create({
      name: 'API Test Account',
      slug: 'api-test-account'
    });

    expect(account).toMatchObject({
      id: expect.any(Number),
      name: 'API Test Account',
      slug: 'api-test-account'
    });
  });
});
```

## Deployment Considerations

### Environment Configuration

```typescript
export const config = {
  database: {
    url: process.env.DATABASE_URL || './data/sqlite.db',
    maxConnections: parseInt(process.env.DB_MAX_CONNECTIONS || '10'),
  },
  
  auth: {
    sessionSecret: process.env.SESSION_SECRET || generateSecret(),
    sessionMaxAge: parseInt(process.env.SESSION_MAX_AGE || '86400'), // 24 hours
  },
  
  api: {
    rateLimitWindow: parseInt(process.env.RATE_LIMIT_WINDOW || '60000'), // 1 minute
    rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX || '100'),
  }
};
```

### Production Optimizations

- **Connection pooling**: Production database connection management
- **Caching layers**: Redis or in-memory caching for frequently accessed data
- **Load balancing**: Horizontal scaling capabilities
- **Monitoring**: Application performance monitoring and alerting

## See Also

- [Architecture Overview](architecture-overview.md)
- [Frontend Architecture](frontend-architecture.md)  
- [Development Guidelines](development-guidelines.md)
- [Project Standards](project-standards.md)