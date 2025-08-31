# Project Standards and Conventions

This document outlines the coding standards, naming conventions, and project-wide practices for the SvelteKit budget management application.

[TOC]

## Code Style Standards

### TypeScript Configuration

The project uses strict TypeScript configuration for maximum type safety:

```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "noImplicitReturns": true,
    "noImplicitThis": true,
    "noUncheckedIndexedAccess": true
  }
}
```

### Code Formatting

#### Prettier Configuration

```json
{
  "useTabs": false,
  "tabWidth": 2,
  "semi": true,
  "singleQuote": true,
  "quoteProps": "as-needed",
  "trailingComma": "es5",
  "bracketSpacing": true,
  "arrowParens": "avoid",
  "printWidth": 100,
  "plugins": ["prettier-plugin-svelte", "prettier-plugin-tailwindcss"]
}
```

#### Import Organization

Imports must be organized in the following order with blank lines between groups:

```typescript
// 1. External libraries
import { eq, and, desc } from 'drizzle-orm';
import { z } from 'zod';
import { TRPCError } from '@trpc/server';

// 2. Internal libraries ($lib imports)
import { db } from '$lib/server/shared/database';
import type { Account } from '$lib/schema';
import { BaseRepository } from '$lib/server/shared/database/base-repository';

// 3. Relative imports (minimize usage)
import { validateAccountData } from './validation';
import type { CreateAccountInput } from './types';
```

## Naming Conventions

### File and Directory Names

#### File Naming Patterns

- **Svelte components**: PascalCase (`AccountCard.svelte`, `ManageAccountForm.svelte`)
- **TypeScript files**: kebab-case (`account-service.ts`, `base-repository.ts`)
- **Directories**: kebab-case (`src/lib/server/shared/database/`)
- **Routes**: SvelteKit conventions (`+page.svelte`, `+layout.server.ts`)

#### Directory Structure

```text
src/lib/
├── components/
│   ├── dialogs/          # Modal components
│   ├── forms/            # Form components
│   ├── inputs/           # Input field components
│   ├── layout/           # Layout components
│   ├── shared/           # Shared utility components
│   └── ui/              # Base UI components (shadcn-svelte)
├── constants/           # Application constants
├── hooks/              # Svelte hooks and utilities
├── server/
│   ├── config/         # Configuration management
│   ├── domains/        # Business domains
│   └── shared/         # Shared server utilities
├── states/             # State management
│   ├── entities/       # Domain entity states
│   ├── ui/            # UI state management
│   └── views/         # View-specific states
└── types/             # Type definitions
```

### Variable and Function Names

#### JavaScript/TypeScript

```typescript
// Variables: camelCase
const accountBalance = 1000;
const isAccountActive = true;
const userPreferences = { theme: 'dark' };

// Functions: camelCase with descriptive verbs
function calculateTotalBalance(accounts: Account[]): number;
async function fetchAccountById(id: number): Promise<Account>;
function validateAccountSlug(slug: string): boolean;

// Constants: SCREAMING_SNAKE_CASE
const MAX_ACCOUNT_NAME_LENGTH = 100;
const DEFAULT_PAGE_SIZE = 20;
const API_BASE_URL = 'https://api.example.com';

// Types and Interfaces: PascalCase
interface AccountData {
  id: number;
  name: string;
}

type UserRole = 'admin' | 'user';

// Classes: PascalCase
class AccountService {
  private accountRepository: AccountRepository;
}

// Enum values: PascalCase
enum TransactionType {
  Income = 'income',
  Expense = 'expense',
  Transfer = 'transfer'
}
```

#### Svelte Components

```svelte
<script lang="ts">
  // Props: camelCase
  let { accountId, isVisible = true, onAccountSelect }: Props = $props();
  
  // Local variables: camelCase
  let isLoading = $state(false);
  let selectedAccount = $state<Account | null>(null);
  
  // Derived values: descriptive names
  let accountDisplayName = $derived(
    selectedAccount ? `${selectedAccount.name} (${selectedAccount.balance})` : ''
  );
  
  // Functions: camelCase with descriptive verbs
  function handleAccountClick(account: Account) {
    selectedAccount = account;
    onAccountSelect?.(account);
  }
  
  async function loadAccountData() {
    // Implementation
  }
</script>
```

### CSS and Styling

#### Class Names

Use Tailwind utility classes primarily, with BEM methodology for custom classes:

```svelte
<!-- Prefer Tailwind utilities -->
<div class="flex items-center justify-between p-4 bg-white rounded-lg shadow-sm">
  <h2 class="text-lg font-semibold text-gray-900">Account Name</h2>
  <span class="text-sm text-gray-500">$1,234.56</span>
</div>

<!-- BEM for custom component classes -->
<div class="account-card account-card--selected">
  <div class="account-card__header">
    <h3 class="account-card__title">Checking Account</h3>
  </div>
  <div class="account-card__content">
    <span class="account-card__balance account-card__balance--positive">$1,234.56</span>
  </div>
</div>
```

#### CSS Custom Properties

```css
:root {
  /* Color scheme */
  --color-primary: #3b82f6;
  --color-primary-dark: #1d4ed8;
  --color-success: #10b981;
  --color-warning: #f59e0b;
  --color-error: #ef4444;
  
  /* Spacing */
  --spacing-xs: 0.25rem;
  --spacing-sm: 0.5rem;
  --spacing-md: 1rem;
  --spacing-lg: 1.5rem;
  --spacing-xl: 2rem;
  
  /* Typography */
  --font-size-xs: 0.75rem;
  --font-size-sm: 0.875rem;
  --font-size-base: 1rem;
  --font-size-lg: 1.125rem;
  --font-size-xl: 1.25rem;
}
```

## Database Conventions

### Table and Column Names

#### Table Names

- Use lowercase snake_case
- Use plural nouns
- Be descriptive and consistent

```sql
-- Good
CREATE TABLE accounts (...);
CREATE TABLE transaction_categories (...);
CREATE TABLE recurring_schedules (...);

-- Avoid
CREATE TABLE Account (...);
CREATE TABLE transactionCategory (...);
CREATE TABLE schedule (...);
```

#### Column Names

- Use lowercase snake_case
- Be descriptive
- Use consistent naming patterns

```sql
CREATE TABLE accounts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  balance REAL DEFAULT 0,
  notes TEXT,
  created_at INTEGER,
  updated_at INTEGER,
  deleted_at INTEGER  -- For soft deletes
);
```

#### Foreign Key Conventions

```sql
-- Pattern: {referenced_table_singular}_id
CREATE TABLE transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  account_id INTEGER NOT NULL,
  category_id INTEGER,
  payee_id INTEGER,
  FOREIGN KEY (account_id) REFERENCES accounts(id),
  FOREIGN KEY (category_id) REFERENCES categories(id),
  FOREIGN KEY (payee_id) REFERENCES payees(id)
);
```

#### Index Naming

```sql
-- Pattern: idx_{table}_{column(s)}
CREATE INDEX idx_accounts_slug ON accounts(slug);
CREATE INDEX idx_accounts_deleted_at ON accounts(deleted_at);
CREATE INDEX idx_transactions_account_date ON transactions(account_id, transaction_date);
```

### Schema Patterns

#### Timestamps

All tables should include standard timestamp fields:

```typescript
// Standard timestamp fields
createdAt: integer('created_at', { mode: 'timestamp' })
  .$defaultFn(() => new Date()),
updatedAt: integer('updated_at', { mode: 'timestamp' })
  .$onUpdateFn(() => new Date()),
deletedAt: integer('deleted_at', { mode: 'timestamp' }) // For soft deletes
```

#### Soft Deletes

Implement soft deletes for data integrity:

```typescript
// Repository method for soft delete
async softDelete(id: number): Promise<TEntity> {
  return await this.update(id, { deletedAt: new Date() } as TUpdateInput);
}

// Query methods should exclude soft deleted records
async findActive(): Promise<TEntity[]> {
  return await this.db
    .select()
    .from(this.table)
    .where(isNull((this.table as any).deletedAt));
}
```

## API Design Standards

### tRPC Route Organization

#### Route Naming

Routes should follow RESTful conventions adapted for tRPC:

```typescript
export const accountRoutes = router({
  // Queries (GET operations)
  getAll: authenticatedProcedure.query(...),
  getById: authenticatedProcedure.query(...),
  getBySlug: authenticatedProcedure.query(...),
  
  // Mutations (POST/PUT/DELETE operations)
  create: rateLimitedProcedure.mutation(...),
  update: rateLimitedProcedure.mutation(...),
  remove: rateLimitedProcedure.mutation(...), // Use 'remove' instead of 'delete' (JS keyword)
  
  // Bulk operations
  bulkCreate: bulkProcedure.mutation(...),
  bulkUpdate: bulkProcedure.mutation(...),
  bulkDelete: bulkProcedure.mutation(...),
  
  // Search and filtering
  search: authenticatedProcedure.query(...),
  findByCategory: authenticatedProcedure.query(...)
});
```

#### Input Schema Validation

All API inputs must be validated using Zod schemas:

```typescript
// Define schemas with clear validation rules
export const createAccountSchema = z.object({
  name: z.string()
    .min(1, 'Name is required')
    .max(100, 'Name cannot exceed 100 characters')
    .regex(/^[a-zA-Z0-9\s\-']+$/, 'Name contains invalid characters'),
  
  slug: z.string()
    .min(1, 'Slug is required')
    .max(50, 'Slug cannot exceed 50 characters')
    .regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens')
    .transform(slug => slug.toLowerCase()),
  
  balance: z.number()
    .min(-999999.99, 'Balance too low')
    .max(999999.99, 'Balance too high')
    .optional()
    .default(0),
  
  notes: z.string()
    .max(500, 'Notes cannot exceed 500 characters')
    .optional()
    .transform(notes => notes?.trim() || undefined)
});

export const updateAccountSchema = createAccountSchema.partial().extend({
  id: z.number().int().positive()
});
```

#### Response Format

Consistent response formats for all endpoints:

```typescript
// Success responses
interface SuccessResponse<T> {
  data: T;
  message?: string;
}

// Error responses (handled by tRPC error middleware)
interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: any;
  };
}

// Paginated responses
interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    hasNext: boolean;
    hasPrevious: boolean;
  };
}
```

## Error Handling Standards

### Error Types and Codes

Standardized error types with consistent codes:

```typescript
// Base error class
export abstract class DomainError extends Error {
  abstract readonly code: string;
  
  constructor(
    message: string,
    public readonly details?: any
  ) {
    super(message);
    this.name = this.constructor.name;
  }
}

// Specific error types
export class ValidationError extends DomainError {
  readonly code = 'VALIDATION_ERROR';
}

export class NotFoundError extends DomainError {
  readonly code = 'NOT_FOUND';
  
  constructor(entity: string, identifier: string | number) {
    super(`${entity} not found: ${identifier}`);
  }
}

export class DuplicateError extends DomainError {
  readonly code = 'DUPLICATE_ERROR';
  
  constructor(entity: string, field: string, value: string) {
    super(`${entity} with ${field} '${value}' already exists`);
  }
}

export class AuthorizationError extends DomainError {
  readonly code = 'AUTHORIZATION_ERROR';
}

export class BusinessRuleError extends DomainError {
  readonly code = 'BUSINESS_RULE_ERROR';
}
```

### Error Messages

Error messages should be:

- Clear and actionable
- User-friendly for client-facing errors
- Detailed for development/logging

```typescript
// Good error messages
throw new ValidationError('Account name must be between 1 and 100 characters');
throw new NotFoundError('Account', accountId);
throw new BusinessRuleError('Cannot delete account with pending transactions');

// Avoid generic messages
throw new Error('Something went wrong');
throw new Error('Invalid input');
```

## Testing Standards

### Test File Organization

```text
tests/
├── unit/                    # Unit tests
│   ├── utils/              # Utility function tests
│   ├── services/           # Service layer tests
│   └── components/         # Component tests
├── integration/            # Integration tests
│   ├── api/               # API endpoint tests
│   ├── database/          # Database operation tests
│   └── security/          # Security feature tests
└── e2e/                   # End-to-end tests
    ├── user-flows/        # Complete user workflows
    └── regression/        # Regression test suites
```

### Test Naming

```typescript
// Test suites: descriptive noun phrases
describe('AccountService', () => {
  describe('createAccount', () => {
    // Test cases: should statements describing expected behavior
    it('should create account with valid data', async () => {
      // Test implementation
    });
    
    it('should throw ValidationError for invalid name', async () => {
      // Test implementation
    });
    
    it('should generate unique slug when not provided', async () => {
      // Test implementation
    });
  });
  
  describe('updateAccount', () => {
    it('should update only provided fields', async () => {
      // Test implementation
    });
    
    it('should maintain slug uniqueness on update', async () => {
      // Test implementation
    });
  });
});
```

### Test Data Management

```typescript
// Use factories for test data creation
export const createTestAccount = (overrides?: Partial<Account>): Account => ({
  id: faker.number.int({ min: 1, max: 1000 }),
  name: faker.finance.accountName(),
  slug: faker.helpers.slugify(faker.finance.accountName()).toLowerCase(),
  balance: faker.number.float({ min: 0, max: 10000, multipleOf: 0.01 }),
  notes: faker.lorem.sentence(),
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
  ...overrides
});

// Use descriptive test data
const testAccount = createTestAccount({
  name: 'Primary Checking',
  slug: 'primary-checking',
  balance: 1500.00
});
```

## Documentation Standards

### Code Comments

#### When to Comment

```typescript
// Good: Explain why, not what
// Calculate compound interest using daily compounding
// This matches the bank's calculation method exactly
const dailyRate = annualRate / 365;
const compoundedAmount = principal * Math.pow(1 + dailyRate, days);

// Good: Complex business logic explanation
// Soft delete preserves referential integrity while allowing
// account restoration. Related transactions remain accessible.
async softDelete(id: number): Promise<Account> {
  return await this.update(id, { deletedAt: new Date() });
}

// Avoid: Obvious comments
const total = price + tax; // Add tax to price
```

#### JSDoc for Functions

```typescript
/**
 * Calculates the total balance across multiple accounts
 * @param accounts - Array of account objects
 * @param includeDeleted - Whether to include soft-deleted accounts
 * @returns Total balance as a number rounded to 2 decimal places
 * @throws {ValidationError} When accounts array is empty
 */
export function calculateTotalBalance(
  accounts: Account[], 
  includeDeleted: boolean = false
): number {
  // Implementation
}
```

### README Structure

Each domain/module should have a README following this structure:

```markdown
# Module Name

Brief description of the module's purpose and functionality.

## Usage

Basic usage examples with code snippets.

## API Reference

Key functions, classes, and their parameters.

## Examples

Practical examples showing common use cases.

## Related

Links to related modules or documentation.
```

## Performance Standards

### Database Query Guidelines

```typescript
// Good: Select only needed columns
const accounts = await db
  .select({
    id: accounts.id,
    name: accounts.name,
    balance: accounts.balance
  })
  .from(accounts)
  .where(isNull(accounts.deletedAt));

// Avoid: Select all columns when not needed
const accounts = await db.select().from(accounts);

// Good: Use indexes effectively
const account = await db
  .select()
  .from(accounts)
  .where(eq(accounts.slug, slug)) // slug has index
  .limit(1);

// Good: Paginate large results
const accounts = await db
  .select()
  .from(accounts)
  .limit(pageSize)
  .offset((page - 1) * pageSize);
```

### Frontend Performance

```typescript
// Good: Lazy loading for heavy components
const DataTable = lazy(() => import('./DataTable.svelte'));

// Good: Memoize expensive calculations
const expensiveResult = $derived.by(() => {
  if (!data.length) return null;
  return performExpensiveCalculation(data);
});

// Good: Debounce user input
let searchTerm = $state('');
let debouncedSearch = $derived.by(() => {
  return debounce(() => searchAccounts(searchTerm), 300);
});
```

## Security Standards

### Input Sanitization

All user inputs must be sanitized and validated:

```typescript
// Good: Comprehensive validation and sanitization
export const accountInputSchema = z.object({
  name: z.string()
    .trim()
    .min(1, 'Name is required')
    .max(100, 'Name too long')
    .regex(/^[a-zA-Z0-9\s\-'\.]+$/, 'Invalid characters in name')
    .transform(name => name.replace(/\s+/g, ' ')), // Normalize whitespace
  
  notes: z.string()
    .optional()
    .transform(notes => notes?.trim().slice(0, 500)) // Truncate and trim
});

// Avoid: Accepting raw user input
const account = await createAccount({
  name: req.body.name, // Potential XSS/injection
  notes: req.body.notes
});
```

### Authorization Patterns

```typescript
// Good: Explicit authorization checks
export const updateAccount = authenticatedProcedure
  .input(updateAccountSchema)
  .mutation(async ({ input, ctx }) => {
    const { id, ...data } = input;
    
    // Check ownership or admin privileges
    const account = await ctx.accountService.findById(id);
    if (account.userId !== ctx.user.id && !ctx.user.isAdmin) {
      throw new AuthorizationError('Cannot modify this account');
    }
    
    return await ctx.accountService.updateAccount(id, data);
  });
```

### Data Privacy

```typescript
// Good: Exclude sensitive data from responses
export function sanitizeUserData(user: User): PublicUser {
  const { password, sessionToken, ...publicData } = user;
  return publicData;
}

// Good: Use proper logging levels
logger.info('User login attempt', { 
  userId: user.id,
  // Don't log passwords, tokens, or PII
});
```

## Deployment Standards

### Environment Configuration

```typescript
// Use environment-specific configuration
export const config = {
  development: {
    database: './dev.db',
    logLevel: 'debug',
    enableDevtools: true
  },
  
  production: {
    database: process.env.DATABASE_URL,
    logLevel: 'error',
    enableDevtools: false
  },
  
  test: {
    database: ':memory:',
    logLevel: 'silent',
    enableDevtools: false
  }
}[process.env.NODE_ENV || 'development'];
```

### Build Standards

```json
{
  "scripts": {
    "dev": "bunx --bun vite dev",
    "build": "bunx --bun vite build",
    "preview": "bunx --bun vite preview",
    "test": "bun test",
    "test:coverage": "bun test --coverage",
    "lint": "bunx prettier --check . && bunx eslint .",
    "format": "bunx prettier --write .",
    "check": "bunx svelte-check --tsconfig ./tsconfig.json"
  }
}
```

## Git Workflow Standards

### Commit Message Format

Follow Conventional Commits specification:

```text
type(scope): description

[optional body]

[optional footer(s)]
```

#### Commit Types

- **feat**: New feature
- **fix**: Bug fix
- **docs**: Documentation only changes
- **style**: Changes that don't affect meaning (formatting, etc.)
- **refactor**: Code change that neither fixes a bug nor adds a feature
- **test**: Adding missing tests or correcting existing tests
- **chore**: Changes to build process or auxiliary tools

#### Examples

```text
feat(accounts): add balance calculation service

Implement service for calculating account balances including
pending transactions and scheduled deposits.

Closes #123

fix(auth): resolve session timeout issue

Sessions were expiring immediately due to incorrect
timestamp comparison in the middleware.

docs(api): update tRPC endpoint documentation

Add examples for bulk operations and error handling
patterns for the accounts API.

test(accounts): add integration tests for repository

Cover edge cases for soft delete functionality and
slug uniqueness validation.
```

### Branch Naming

- **Feature branches**: `feature/short-description`
- **Bug fixes**: `fix/short-description`
- **Documentation**: `docs/short-description`
- **Releases**: `release/v1.2.3`

## See Also

- [Architecture Overview](architecture-overview.md)
- [Development Guidelines](development-guidelines.md)
- [Frontend Architecture](frontend-architecture.md)
- [Test Architecture](test-architecture.md)
