# Current API Architecture (tRPC)

## Overview
The application currently uses tRPC v11 for end-to-end type-safe API communication between the SvelteKit frontend and backend.

## Architecture Pattern

```
Frontend (Client)           Backend (Server)
┌─────────────────────┐     ┌─────────────────────┐
│ Components          │────▶│ tRPC Routes         │
│ - States            │     │ - /lib/trpc/routes/ │
│ - Actions           │     │ - CRUD procedures   │
└─────────────────────┘     └─────────────────────┘
          │                           │
          ▼                           ▼
┌─────────────────────┐     ┌─────────────────────┐
│ tRPC Client         │     │ Database (SQLite)   │
│ /lib/trpc/client.ts │     │ - Drizzle ORM       │
└─────────────────────┘     │ - /lib/schema/      │
                            └─────────────────────┘
```

## File Structure

### Server-Side (`/lib/trpc/`)
```
trpc/
├── client.ts           # tRPC client configuration
├── context.ts          # Server context (database access)
├── router.ts           # Main router combining all routes
├── t.ts               # Base tRPC instance
├── trpc-server.ts     # SvelteKit adapter
├── middleware/
│   └── logger.ts      # Request logging middleware
└── routes/            # Domain-specific procedures
    ├── accounts.ts    # Account CRUD operations
    ├── categories.ts  # Category management
    ├── payees.ts      # Payee management
    ├── schedules.ts   # Schedule operations
    ├── transactions.ts# Transaction handling
    └── views.ts       # Custom view management
```

### Client-Side Usage Locations
```
Client Usage:
├── states/                    # State management classes
│   ├── accounts.svelte.ts    # trpc().accountRoutes.*
│   ├── categories.svelte.ts  # trpc().categoriesRoutes.*
│   ├── current-account.ts    # trpc().transactionRoutes.*
│   ├── payees.svelte.ts     # trpc().payeeRoutes.*
│   └── schedules.svelte.ts  # trpc().scheduleRoutes.*
├── models/
│   └── view.svelte.ts       # trpc().viewsRoutes.*
└── routes/                  # Server-side data loading
    ├── +layout.server.ts    # createCaller() for global data
    ├── accounts/+page.server.ts  # SSR account data
    ├── categories/+page.server.ts
    ├── payees/+page.server.ts
    ├── schedules/+page.server.ts
    └── views/+page.server.ts
```

## Usage Patterns

### 1. Client-Side State Management
```typescript
// Pattern: trpc().routeName.procedure.mutate/query
await trpc().transactionRoutes.save.mutate(updatedData);
await trpc().categoriesRoutes.delete.mutate({ entities: [1, 2, 3] });
```

### 2. Server-Side Actions  
```typescript
// Pattern: createCaller(context).routeName.procedure
const caller = createCaller(await createContext());
const result = await caller.accountRoutes.save(form.data);
```

### 3. Server-Side Page Loading
```typescript
// Pattern: createCaller for SSR data fetching
export const load: PageServerLoad = async () => {
  const caller = createCaller(await createContext());
  return {
    accounts: await caller.accountRoutes.all()
  };
};
```

## Current Issues & Inconsistencies

### 🔴 **Pattern Inconsistencies**
1. **Mixed client patterns**: Some use `trpc()`, others `trpc(page)`
2. **Inconsistent error handling**: Some procedures handle errors, others don't
3. **Context creation**: Multiple ways to create tRPC context

### 🟡 **Code Organization Issues**  
1. **Route naming**: Inconsistent suffixes (`Routes` vs `routes`)
2. **Procedure grouping**: Some related procedures split across files
3. **Type exports**: Types scattered across route files

### 🟢 **Working Well**
1. **End-to-end type safety**: Full TypeScript coverage
2. **Database integration**: Clean Drizzle ORM integration
3. **Validation**: Zod schemas for runtime validation
4. **Middleware**: Logging and error handling

## Recommended Improvements

### Phase 1: Standardization
1. **Consolidate client patterns** - Use consistent `trpc()` calls
2. **Standardize route naming** - Pick one convention and stick to it
3. **Centralize error handling** - Create consistent error patterns
4. **Document context usage** - Clear guidelines for server vs client

### Phase 2: Organization  
1. **Group related procedures** - Combine related operations
2. **Extract common types** - Centralize shared type definitions
3. **Simplify imports** - Create barrel exports for easier imports

### Phase 3: Future Migration Prep
1. **Abstract client calls** - Prepare for potential API layer changes  
2. **Separate concerns** - Clear separation between transport and business logic
3. **Create migration plan** - Document steps for future API changes