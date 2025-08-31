# Development Guidelines

This document outlines the development guidelines, conventions, and best
practices for contributing to the SvelteKit budget management application.

[TOC]

## Getting Started

### Prerequisites

- **Bun**: Primary runtime and package manager (v1.2+)
- **Node.js**: For compatibility (v18+)
- **Git**: Version control

### Initial Setup

```bash
# Clone the repository
git clone <repository-url>
cd budget

# Install dependencies using Bun
bun install

# Set up the database
bun run db:generate
bun run db:migrate
bun run db:seed

# Start development server
bun run dev
```

## Development Workflow

### Branch Strategy

- **main**: Production-ready code
- **feature/***: New features and enhancements
- **fix/***: Bug fixes
- **docs/***: Documentation updates

### Commit Message Format

Follow conventional commit format:

```text
type(scope): description

Types: feat, fix, docs, style, refactor, test, chore
Scope: domain name or area (accounts, ui, docs)

Examples:
feat(accounts): add balance calculation service
fix(auth): resolve session timeout issue
docs(api): update tRPC endpoint documentation
```

### Code Review Process

1. **Self-review**: Review your own code before creating PR
2. **Automated checks**: Ensure all tests and linting pass
3. **Peer review**: At least one team member review required
4. **Security review**: Required for authentication/authorization changes

## Code Style Guidelines

### TypeScript Standards

#### Strict Configuration

```typescript
// Always use strict TypeScript settings
{
  "strict": true,
  "noImplicitAny": true,
  "strictNullChecks": true,
  "noImplicitReturns": true
}
```

#### Type Definitions

```typescript
// Prefer interfaces for object shapes
interface User {
  id: number;
  name: string;
  email: string;
}

// Use types for unions and computed types
type Status = 'active' | 'inactive' | 'pending';
type UserWithStatus = User & { status: Status };

// Export types from domain-specific files
export type { User, Status, UserWithStatus };
```

#### Import Organization

```typescript
// 1. External libraries
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';

// 2. Internal libraries (using $lib alias)
import { db } from '$lib/server/shared/database';
import type { Account } from '$lib/schema';

// 3. Relative imports (minimal usage)
import { validateAccount } from './validation';
```

### Svelte Component Standards

#### Component Structure

```svelte
<!-- 1. Script tag with imports -->
<script lang="ts">
  import type { ComponentProps } from './types';
  import { Button } from '$lib/components/ui';
  
  // Props with defaults
  let { 
    title, 
    variant = 'default',
    disabled = false,
    ...props 
  }: ComponentProps = $props();
  
  // Local state
  let isOpen = $state(false);
  
  // Derived values
  let computedClass = $derived(`btn btn-${variant}`);
  
  // Functions
  function handleClick() {
    isOpen = !isOpen;
  }
</script>

<!-- 2. HTML template -->
<div class={computedClass}>
  <h2>{title}</h2>
  {#if isOpen}
    <p>Content here</p>
  {/if}
</div>

<!-- 3. Styles (if component-specific) -->
<style>
  .custom-style {
    /* Component-specific styles only */
  }
</style>
```

#### State Management in Components

```svelte
<script lang="ts">
  // Use Svelte 5 runes for reactive state
  let count = $state(0);
  let doubled = $derived(count * 2);
  
  // For complex state, use state classes
  import { AccountsState } from '$lib/states/entities/accounts.svelte';
  const accountsState = AccountsState.get();
  
  // Effects for side effects
  $effect(() => {
    console.log(`Count changed to: ${count}`);
  });
</script>
```

### CSS and Styling

#### Tailwind CSS Usage

```svelte
<!-- Prefer utility classes -->
<div class="flex items-center justify-between p-4 bg-white rounded-lg shadow-sm">
  <h3 class="text-lg font-semibold text-gray-900">Title</h3>
  <button class="px-3 py-2 text-sm bg-blue-500 text-white rounded hover:bg-blue-600">
    Action
  </button>
</div>

<!-- Use component classes for complex repeated patterns -->
<div class="card-primary">
  <!-- Content -->
</div>
```

#### Component-Specific Styles

```svelte
<style>
  /* Only for styles that cannot be achieved with Tailwind */
  .custom-animation {
    animation: fadeIn 0.3s ease-in-out;
  }
  
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
</style>
```

## Architecture Patterns

### Domain-Driven Development

#### Adding a New Domain

1. **Create domain structure**:

   ```text
   src/lib/server/domains/new-domain/
   ├── index.ts
   ├── repository.ts
   ├── services.ts
   ├── routes.ts
   └── validation.ts
   ```

2. **Repository pattern**:

   ```typescript
   export class NewDomainRepository extends BaseRepository<
     typeof newDomainTable,
     NewDomain,
     CreateNewDomainInput,
     UpdateNewDomainInput
   > {
     constructor() {
       super(db, newDomainTable, 'NewDomain');
     }
     
     // Domain-specific methods
     async findBySlug(slug: string): Promise<NewDomain | null> {
       // Implementation
     }
   }
   ```

3. **Service layer**:

   ```typescript
   export class NewDomainService {
     constructor(private repository: NewDomainRepository) {}
     
     async createNewDomain(data: CreateNewDomainInput): Promise<NewDomain> {
       // Business logic validation
       await this.validateBusinessRules(data);
       
       // Create through repository
       return await this.repository.create(data);
     }
   }
   ```

4. **tRPC routes**:

   ```typescript
   export const newDomainRoutes = router({
     create: rateLimitedProcedure
       .input(createNewDomainSchema)
       .mutation(async ({ input, ctx }) => {
         return await ctx.newDomainService.createNewDomain(input);
       }),
   });
   ```

### State Management Patterns

#### Entity State Classes

```typescript
export class EntityState {
  entities: SvelteMap<number, Entity> = $state() as SvelteMap<number, Entity>;
  
  constructor(entities: Entity[]) {
    this.entities = new SvelteMap(entities.map(e => [e.id, e]));
  }
  
  static get() {
    return getContext<EntityState>(KEY);
  }
  
  static set(entities: Entity[]) {
    return setContext(KEY, new EntityState(entities));
  }
  
  // Business logic methods
  getById(id: number): Entity | undefined {
    return this.entities.get(id);
  }
  
  addEntity(entity: Entity) {
    this.entities.set(entity.id, entity);
  }
}
```

#### UI State Patterns

```typescript
export class UIState {
  isLoading = $state(false);
  selectedItems = $state<Set<number>>(new Set());
  filters = $state<FilterState>({});
  
  // Derived state
  hasSelection = $derived(this.selectedItems.size > 0);
  filteredCount = $derived(this.calculateFilteredCount());
  
  // Actions
  toggleSelection(id: number) {
    if (this.selectedItems.has(id)) {
      this.selectedItems.delete(id);
    } else {
      this.selectedItems.add(id);
    }
  }
}
```

## Testing Guidelines

### Unit Testing

#### Test Structure

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { calculateBalance } from '$lib/utils/balance';

describe('Balance Calculation', () => {
  describe('calculateBalance', () => {
    it('should calculate correct balance for positive transactions', () => {
      const transactions = [
        { amount: 100, type: 'credit' },
        { amount: 50, type: 'credit' }
      ];
      
      const balance = calculateBalance(transactions);
      
      expect(balance).toBe(150);
    });
    
    it('should handle empty transaction list', () => {
      expect(calculateBalance([])).toBe(0);
    });
  });
});
```

#### Mocking External Dependencies

```typescript
import { vi } from 'vitest';

// Mock tRPC client
const mockTrpc = {
  accounts: {
    create: vi.fn().mockResolvedValue({ id: 1, name: 'Test' })
  }
};

vi.mock('$lib/trpc/client', () => ({
  trpc: () => mockTrpc
}));
```

### Integration Testing

#### API Testing

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { testDb, createTestContext } from '../setup/test-db';
import { accountRoutes } from '$lib/server/domains/accounts/routes';

describe('Account API Integration', () => {
  beforeEach(async () => {
    await testDb.migrate();
  });
  
  it('should create account successfully', async () => {
    const ctx = createTestContext();
    const caller = accountRoutes.createCaller(ctx);
    
    const account = await caller.create({
      name: 'Test Account',
      slug: 'test-account'
    });
    
    expect(account).toMatchObject({
      id: expect.any(Number),
      name: 'Test Account',
      slug: 'test-account'
    });
  });
});
```

### End-to-End Testing

#### Page Testing with Playwright

```typescript
import { test, expect } from '@playwright/test';

test.describe('Account Management', () => {
  test('should create new account', async ({ page }) => {
    await page.goto('/accounts');
    
    // Click add account button
    await page.click('[data-testid="add-account-btn"]');
    
    // Fill form
    await page.fill('[data-testid="account-name"]', 'New Account');
    await page.fill('[data-testid="account-slug"]', 'new-account');
    
    // Submit form
    await page.click('[data-testid="submit-btn"]');
    
    // Verify account appears in list
    await expect(page.locator('[data-testid="account-item"]')).toContainText('New Account');
  });
});
```

## Database Guidelines

### Schema Design

#### Table Definition

```typescript
import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';

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

// Auto-generated schemas
export const insertAccountSchema = createInsertSchema(accounts);
export const selectAccountSchema = createSelectSchema(accounts);
export type Account = typeof accounts.$inferSelect;
export type InsertAccount = typeof accounts.$inferInsert;
```

#### Migration Strategy

```typescript
// migrations/0001_add_accounts.sql
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
```

## Error Handling

### Custom Error Types

```typescript
export class DomainError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: any
  ) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class ValidationError extends DomainError {
  constructor(field: string, message: string) {
    super(`Validation failed for ${field}: ${message}`, 'VALIDATION_ERROR');
  }
}

export class NotFoundError extends DomainError {
  constructor(entity: string, identifier: string | number) {
    super(`${entity} not found: ${identifier}`, 'NOT_FOUND');
  }
}
```

### Error Handling in Services

```typescript
export class AccountService {
  async createAccount(data: CreateAccountInput): Promise<Account> {
    try {
      // Validate business rules
      if (await this.repository.findBySlug(data.slug)) {
        throw new ValidationError('slug', 'Slug must be unique');
      }
      
      return await this.repository.create(data);
    } catch (error) {
      if (error instanceof DomainError) {
        throw error;
      }
      
      // Wrap unexpected errors
      throw new DomainError(
        'Failed to create account',
        'ACCOUNT_CREATION_FAILED',
        error
      );
    }
  }
}
```

## Performance Best Practices

### Database Optimization

1. **Use indexes**: Index frequently queried columns
2. **Pagination**: Always paginate large result sets
3. **Selective queries**: Only select needed columns
4. **Connection pooling**: Reuse database connections

### Frontend Optimization

1. **Lazy loading**: Load components and data on demand
2. **Memoization**: Cache expensive computations
3. **Bundle splitting**: Code split by routes and features
4. **Tree shaking**: Remove unused code

### State Management

1. **Minimal state**: Only store what's necessary
2. **Derived values**: Compute values from existing state
3. **Batched updates**: Group related state changes
4. **Cleanup**: Remove unused state and event listeners

## Security Best Practices

### Input Validation

```typescript
// Always validate inputs at multiple layers
const createAccountSchema = z.object({
  name: z.string()
    .min(1, 'Name is required')
    .max(100, 'Name too long')
    .regex(/^[a-zA-Z0-9\s-]+$/, 'Invalid characters'),
  slug: z.string()
    .min(1, 'Slug is required')
    .max(50, 'Slug too long')
    .regex(/^[a-z0-9-]+$/, 'Invalid slug format')
});
```

### Authentication

```typescript
// Always check authentication in protected routes
export const authenticatedProcedure = baseProcedure.use(requireAuth);

// Example usage
export const accountRoutes = router({
  create: authenticatedProcedure
    .input(createAccountSchema)
    .mutation(async ({ input, ctx }) => {
      // User is guaranteed to be authenticated
      return await ctx.accountService.createAccount(input);
    })
});
```

### Authorization

```typescript
// Check permissions for sensitive operations
export const adminProcedure = authenticatedProcedure.use(requireAdmin);

// Resource-level authorization
export const deleteAccount = authenticatedProcedure
  .input(z.object({ id: z.number() }))
  .mutation(async ({ input, ctx }) => {
    const account = await ctx.accountService.getById(input.id);
    
    // Check if user owns the account or is admin
    if (account.userId !== ctx.user.id && !ctx.user.isAdmin) {
      throw new AuthorizationError('Cannot delete account');
    }
    
    return await ctx.accountService.deleteAccount(input.id);
  });
```

## Debugging and Monitoring

### Logging

```typescript
import { logger } from '$lib/server/shared/logger';

// Structured logging
logger.info('Account created', {
  accountId: account.id,
  userId: ctx.user.id,
  timestamp: new Date().toISOString()
});

logger.error('Failed to create account', {
  error: error.message,
  input: data,
  userId: ctx.user.id
});
```

### Development Tools

- **tRPC DevTools**: Monitor API calls and responses
- **Svelte DevTools**: Inspect component state and props
- **Database GUI**: Use Drizzle Studio for database inspection

## See Also

- [Architecture Overview](architecture-overview.md)
- [Frontend Architecture](frontend-architecture.md)
- [Backend Architecture](backend-architecture.md)
- [Project Standards](project-standards.md)
