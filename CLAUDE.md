# Claude Code Configuration

This document provides context for Claude when working on this budget management application.

## Project Overview

A comprehensive personal finance application built as a Turbo monorepo with:
- **Main App**: `apps/budget/` - SvelteKit 5 application
- **UI Package**: `packages/ui/` - Shared shadcn-svelte components
- **Config Package**: `packages/config/` - Shared TypeScript/ESLint configs

## Technology Stack

| Layer | Technology |
|-------|------------|
| Framework | SvelteKit 5 with Svelte 5 runes (`$state`, `$derived`, `$props`, `$effect`) |
| Styling | Tailwind CSS + shadcn-svelte |
| API Layer | tRPC with Zod validation |
| Data Layer | TanStack Query via custom `defineQuery`/`defineMutation` factories |
| Database | SQLite with Drizzle ORM |
| Auth | Better Auth |
| Package Manager | Bun |
| Monorepo | Turbo |

## Architecture: Three-Layer Pattern

```
┌─────────────────────────────────────────────────────────────┐
│                        UI Layer                             │
│  Svelte components using rpc.* for data access              │
│  Location: src/routes/, src/lib/components/                 │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      Query Layer                            │
│  TanStack Query factories with cache management             │
│  Location: src/lib/query/                                   │
│  Usage: rpc.accounts.getAccount(id).options()               │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                     Service Layer                           │
│  tRPC routes → Domain services → Repositories               │
│  Location: src/lib/trpc/routes/, src/lib/server/domains/    │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                     Database Layer                          │
│  Drizzle ORM with SQLite                                   │
│  Location: src/lib/schema/, src/lib/server/db/             │
└─────────────────────────────────────────────────────────────┘
```

## Key Directories

### Schema (Database Models)
```
src/lib/schema/
├── accounts.ts          # Account types (checking, savings, credit_card, utility, etc.)
├── transactions.ts      # Transaction records with transfers
├── categories.ts        # Income/expense categories
├── payees.ts           # Payee management with aliases
├── schedules.ts        # Recurring transactions
├── budgets.ts          # Budget allocations
├── utility-usage.ts    # Utility tracking (electric, gas, water)
├── account-connections.ts  # Bank sync (SimpleFIN, Teller)
├── transfer-mappings.ts    # Saved transfer payee mappings
└── ...
```

### Query Layer (TanStack Query Factories)
```
src/lib/query/
├── _factory.ts         # defineQuery, defineMutation helpers
├── _client.ts          # queryClient, cachePatterns
├── index.ts            # Unified rpc namespace export
├── accounts.ts         # Account queries/mutations
├── transactions.ts     # Transaction operations
├── utility.ts          # Utility usage analytics
├── connections.ts      # Bank connection management
└── ...
```

### tRPC Routes
```
src/lib/trpc/
├── router.ts           # Main router aggregation
├── routes/
│   ├── accounts.ts
│   ├── transactions.ts
│   ├── utility.ts      # Utility analytics endpoints
│   ├── connections.ts  # Bank sync endpoints
│   └── ...
└── shared/
    └── errors.ts       # Error translation utilities
```

### Server Domains (Business Logic)
```
src/lib/server/domains/
├── accounts/           # Account management
├── transactions/       # Transaction CRUD, transfers
├── categories/         # Category management, aliases
├── payees/            # Payee matching, learning
├── connections/       # Bank connection providers
│   └── providers/
│       ├── simplefin.ts
│       └── teller.ts
├── utility/           # Utility usage tracking
├── transfers/         # Transfer mapping service
├── ml/               # Machine learning features
│   └── smart-categories/
└── ...
```

### Import System
```
src/lib/server/import/
├── import-orchestrator.ts  # Main import coordinator
├── validators/            # Row validation
├── matchers/             # Entity matching (payee, category)
├── cleanup/              # Post-import cleanup
└── utils/
    └── transfer-target-detector.ts
```

### UI Components
```
src/lib/components/
├── data-table/        # Reusable data table with TanStack Table
├── categories/        # Category selector, enhanced selector
├── payees/           # Payee selector, enhanced selector
├── import/           # Import preview table, cells
├── forms/            # Form components
└── ui/               # Base shadcn components
```

## Account Types

The app supports various account types defined in `src/lib/schema/accounts.ts`:

| Type | Description |
|------|-------------|
| `checking` | Standard checking account |
| `savings` | Savings account |
| `credit_card` | Credit card with balance tracking |
| `cash` | Cash/wallet tracking |
| `investment` | Investment accounts |
| `loan` | Loan tracking |
| `hsa` | Health Savings Account with medical expense tracking |
| `utility` | Utility accounts (electric, gas, water) with usage tracking |
| `other` | Generic account type |

## Utility Accounts

Utility accounts have special features:
- **Usage Tracking**: Records consumption data (kWh, therms, gallons)
- **Rate Tiers**: Tiered pricing configuration
- **Analytics**: Anomaly detection, usage forecasting, bill projection
- **Import Integration**: Automatically creates utility_usage records

Key files:
- Schema: `src/lib/schema/utility-usage.ts`
- Service: `src/lib/server/domains/utility/`
- Analytics: `src/lib/utils/utility-analytics.ts`
- Routes: `src/lib/trpc/routes/utility.ts`
- Query: `src/lib/query/utility.ts`

## Bank Connections

Supports two providers for automatic transaction sync:
- **SimpleFIN**: $15/year, 16,000+ US institutions
- **Teller**: Free dev tier, official bank APIs

Key files:
- Schema: `src/lib/schema/account-connections.ts`
- Providers: `src/lib/server/domains/connections/providers/`
- Routes: `src/lib/trpc/routes/connections.ts`
- Query: `src/lib/query/connections.ts`

## Transfer Detection

The import system detects and handles transfers:
- **Transfer Mappings**: Saved payee-to-account mappings
- **Auto-detection**: Matches transactions between accounts
- **UI**: Convert/unlink transfer dialogs

Key files:
- Schema: `src/lib/schema/transfer-mappings.ts`
- Service: `src/lib/server/domains/transfers/`
- Detector: `src/lib/server/import/utils/transfer-target-detector.ts`

## Query Layer Patterns

### Defining Queries
```typescript
export const getAccount = (accountId: number) => {
  return defineQuery({
    queryKey: accountKeys.detail(accountId),
    queryFn: () => trpc().accountRoutes.getAccount.query({ accountId }),
    options: { staleTime: 60_000 },
  });
};
```

### Using in Components
```svelte
<script lang="ts">
  import { rpc } from '$lib/query';
  import { createQuery } from '@tanstack/svelte-query';

  const { accountId } = $props();
  const accountQuery = createQuery(rpc.accounts.getAccount(accountId).options());
</script>
```

### Mutations with Cache Updates
```typescript
export const updateAccount = defineMutation<UpdateInput, Account>({
  mutationFn: (data) => trpc().accountRoutes.update.mutate(data),
  onSuccess: (result, variables) => {
    cachePatterns.setQueryData(accountKeys.detail(result.id), result);
    cachePatterns.invalidatePrefix(accountKeys.lists());
  },
  successMessage: "Account updated",
  errorMessage: "Failed to update account",
});
```

## Common Commands

```bash
# Development
bun run dev              # Start all apps
bun run dev:budget       # Start budget app only

# Build & Check
bun run build            # Build all apps
bun run check            # Type check all apps

# Database
bun run db:generate      # Generate migrations
bun run db:migrate       # Run migrations
bun run db:push          # Push schema changes
bun run db:studio        # Open Drizzle Studio

# Testing
bun run test             # Run tests
```

## Svelte 5 Patterns

### Runes
```svelte
<script lang="ts">
  // Props with defaults
  let { value = 0, onchange }: Props = $props();

  // Reactive state
  let count = $state(0);

  // Derived values
  const doubled = $derived(count * 2);

  // Effects
  $effect(() => {
    console.log('Count changed:', count);
  });
</script>
```

### Component Structure
- Use `$props()` for component props
- Use `$state()` for local reactive state
- Use `$derived()` for computed values
- Use `$effect()` for side effects

## Import System Flow

1. **File Upload** → Parse CSV/OFX
2. **Column Mapping** → Map to normalized fields
3. **Validation** → Check dates, amounts, duplicates
4. **Entity Matching** → Match payees, categories
5. **Transfer Detection** → Identify transfers
6. **Preview** → User review with inline editing
7. **Import** → Create transactions (and utility records for utility accounts)

## Error Handling

### Service Layer
```typescript
throw new DomainError("NOT_FOUND", "Account not found");
```

### tRPC Layer
```typescript
throw translateDomainError(error); // Converts to TRPCError
```

### UI Layer
Handled by mutation's `errorMessage` or TanStack Query's error state.

## File Naming Conventions

- Components: `kebab-case.svelte`
- TypeScript: `kebab-case.ts`
- Route files: `+page.svelte`, `+page.server.ts`, `+layout.svelte`
- Schema: Singular table names (`account`, `transaction`)

## Development Notes

- Always use feature branches (never commit directly to main)
- Run `bun run check` before committing
- Use the query layer for all data operations in components
- Prefer `$derived` over `$effect` when possible
- Keep components focused and small
