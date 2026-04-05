# Extract Shared Server Code into `packages/core`

## Overview

Extract all framework-agnostic server code from `apps/budget/src/lib/` into a
new `packages/core` package so it can be reused by both the SvelteKit web app
and a future Electrobun desktop app.

## Current State Analysis

The server code is almost entirely framework-agnostic:

- 0 files in `src/lib/server/` import `svelte` or `@sveltejs/kit`
- 0 files in `src/lib/server/` import `$lib/components/` or `$lib/query/`
- 1 file in `src/lib/trpc/` imports `@sveltejs/kit` (type-only: `RequestEvent`
  in `context.ts`)

The coupling points are:

- 6 files use `$env/dynamic/private` for environment variables
- 1 file uses `RequestEvent` type (tRPC context)
- 1 line writes a cookie via `ctx.event.cookies.set()` (workspace switch)
- 2 util files (`dates.ts`, `formatters.ts`) mix pure logic with
  `$app/environment` and Svelte store imports
- ~400 import statements use the `$lib/` path alias (build-time, mechanical
  rewrite)

## Desired End State

After completion:

- `packages/core/` contains schema, server domains, tRPC router/routes, shared
  utils, types, config, db, auth, import system, and query layer definitions
- `apps/budget/` imports from `$core/` (via alias) instead of `$lib/server/`,
  `$lib/schema/`, `$lib/trpc/` (for server code)
- A new Electrobun app (`apps/desktop/`) can import the same `$core/` package
  with a different platform adapter (Bun.serve instead of SvelteKit handler)
- The SvelteKit web app works identically throughout migration (no user-facing
  changes)

### Verification

- `bun run check` passes after each phase
- `bun run build` passes after each phase
- `bun run test` passes after each phase
- The app runs and functions identically in dev mode

## What We're NOT Doing

- Building the Electrobun app (that's a separate future effort)
- Changing any business logic or features
- Migrating the frontend (components, routes, stores, states)
- Changing the database or running migrations
- Modifying the tRPC API surface (all routes stay the same)
- Changing the auth flow or session handling

## Implementation Approach

Follow the existing monorepo pattern: `packages/core` exports raw TypeScript
source files (no build step), consumed via `$core/` path alias in
`svelte.config.js` (same as `$ui/` for `packages/ui`). Each phase is a separate
PR that passes all checks.

Files within `packages/core` use relative imports internally (no alias needed
within the package itself).

---

## Phase 0: In-Place Preparation

**Goal**: Decouple the 3 SvelteKit-specific integration points without moving
any files. The app continues working exactly as before.

### Phase 0a: Split `dates.ts` into Pure and Browser Modules

**Problem**: `dates.ts` imports `$app/environment` and
`$lib/stores/display-preferences.svelte` at the top level. 50+ server files
import from it.

**File**: `apps/budget/src/lib/utils/dates.ts`

**Changes**:

1. Create `apps/budget/src/lib/utils/dates-core.ts` containing all pure
   functions (no `$app/environment`, no Svelte store imports):
   - `timezone`, `currentDate` (from `@internationalized/date`)
   - `getSpecialDateValue`, `getDayOfWeek`, `getIsoWeekday`, `getDaysInMonth`
   - `getOrdinalSuffix`, `sameMonthAndYear`, `sameMonthOrFuture`,
     `sameMonthOrPast`
   - `getFirstDayInCalendarMonth`, `getFirstSpecifiedWeekdayInMonth`,
     `getFirstWeekday`
   - `getNextWeekday`, `getNextWeekdayFlexible`, `getNextWeekdayByLabel`
   - `getNthWeekdayOfMonth`, `getLastWeekdayOfMonth`
   - `parseDateValue`, `ensureDateValue`, `dateValueToJSDate`
   - `dateDifference`, `isSamePeriod`, `parseISOString`, `toISOString`
   - `getCurrentTimestamp`, `nowISOString`, `formatTimeAgo`
   - The `SpecialDateValue` type export
2. Keep `dates.ts` as a re-export barrel that imports everything from
   `dates-core.ts` and adds the browser-dependent function:
   - `formatDateDisplay` (uses `browser` and `displayPreferences`)
3. Update all server imports (`src/lib/server/`, `src/lib/trpc/`) to import
   from `$lib/utils/dates-core` instead of `$lib/utils/dates`
4. Frontend imports continue using `$lib/utils/dates` unchanged

### Phase 0b: Split `formatters.ts` into Pure and Browser Modules

**Problem**: `formatters.ts` imports `$app/environment` and
`$lib/stores/display-preferences.svelte`. 5 server files import from it.

**File**: `apps/budget/src/lib/utils/formatters.ts`

**Changes**:

1. Create `apps/budget/src/lib/utils/formatters-core.ts` containing pure
   functions:
   - `formatPercent`, `formatPercentChange`, `formatPercentRaw`
   - `formatFileSize`, `formatNumberFixed`, `formatCompact`
   - `formatDisplayValue`, `formatBudgetName`
   - `percentageFormatter`, `daysFormatter`
   - `toSignedAmount`
   - `recurringFormatter`, `periodFormatter`
2. Keep `formatters.ts` importing from `formatters-core.ts` and adding
   browser-dependent functions:
   - `formatCurrency`, `formatCurrencyAbs` (use `displayPreferences`)
   - `formatNumber` (uses `displayPreferences`)
   - `currencyFormatter`, `numberFormatter` (fallback instances)
   - `transactionFormatter` (imports schema types)
3. Update server imports to use `$lib/utils/formatters-core`
4. Note: `src/lib/server/utils/formatters.ts` already re-exports some of these;
   update it to import from `formatters-core` instead

### Phase 0c: Restructure Utils Barrel (`index.ts`)

**Problem**: `src/lib/utils/index.ts` re-exports `dates.ts` and
`formatters.ts` (which have Svelte deps). Server code importing from
`$lib/utils` transitively pulls in Svelte-dependent modules.

**File**: `apps/budget/src/lib/utils/index.ts`

**Changes**:

1. The barrel continues exporting everything for frontend compatibility
2. Server/tRPC files that import from `$lib/utils` (14 files) are updated to
   import specific modules instead (`$lib/utils/array-utilities`,
   `$lib/utils/object-utilities`, etc.)
3. This eliminates transitive Svelte dependencies for server code

### Phase 0d: Create Environment Abstraction

**Problem**: 6 files import `$env/dynamic/private`.

**Changes**:

1. Create `apps/budget/src/lib/server/env.ts`:

```typescript
export interface EnvProvider {
  get(key: string): string | undefined;
}

let provider: EnvProvider = {
  get: (key) => process.env[key] ?? Bun.env?.[key],
};

export function setEnvProvider(p: EnvProvider): void {
  provider = p;
}

export function getEnv(key: string): string | undefined {
  return provider.get(key);
}

export function requireEnv(key: string): string {
  const value = getEnv(key);
  if (!value) throw new Error(`Missing required environment variable: ${key}`);
  return value;
}
```

2. Update the 6 files to use `getEnv()` / `requireEnv()` instead of
   `env.VARIABLE`:
   - `server/auth/index.ts`
   - `server/email/index.ts`
   - `server/shared/security/encryption.ts`
   - `server/domains/connections/credential-encryption.ts`
   - `server/domains/connections/providers/teller.ts`
   - `server/domains/workspace-invitations/services.ts`
3. Create `apps/budget/src/lib/server/env-sveltekit.ts` that calls
   `setEnvProvider()` with `$env/dynamic/private`:

```typescript
import { env } from "$env/dynamic/private";
import { setEnvProvider } from "./env";

setEnvProvider({ get: (key) => env[key] });
```

4. Import `env-sveltekit.ts` in `hooks.server.ts` (runs once at startup)

### Phase 0e: Create RequestAdapter Interface for tRPC Context

**Problem**: `context.ts` accepts SvelteKit's `RequestEvent` and uses
`event.request.headers` and `event.cookies.get()`. One tRPC route uses
`ctx.event.cookies.set()`.

**File**: `apps/budget/src/lib/trpc/context.ts`

**Changes**:

1. Define `RequestAdapter` interface:

```typescript
export interface CookieOptions {
  path?: string;
  maxAge?: number;
  sameSite?: "strict" | "lax" | "none";
  httpOnly?: boolean;
  secure?: boolean;
}

export interface RequestAdapter {
  headers: Headers;
  getCookie(name: string): string | undefined;
  setCookie(name: string, value: string, options: CookieOptions): void;
}
```

2. Change `createContext` signature from `RequestEvent` to `RequestAdapter`:

```typescript
export async function createContext(request: RequestAdapter) {
  const { userId, sessionId } = await getSessionInfo(request.headers);
  const workspaceId = await getCurrentWorkspaceId(
    request.getCookie("workspaceId"),
    userId
  );
  return { db, userId, sessionId, workspaceId, request };
}
```

3. Update `getSessionInfo` to accept `headers: Headers` directly
4. Update `getCurrentWorkspaceId` to accept `cookieValue: string | undefined`
   instead of `event: RequestEvent`
5. Change the Context type: replace `event: RequestEvent` with
   `request: RequestAdapter`
6. Update `workspaces.ts:139` to use `ctx.request.setCookie()` instead of
   `ctx.event.cookies.set()`
7. Update `security-logging.ts` to use `ctx.request.headers` instead of
   `(ctx as any).event?.request`
8. Create SvelteKit adapter function in
   `apps/budget/src/lib/trpc/adapters/sveltekit.ts`:

```typescript
import type { RequestEvent } from "@sveltejs/kit";
import type { RequestAdapter } from "../context";

export function fromSvelteKit(event: RequestEvent): RequestAdapter {
  return {
    headers: event.request.headers,
    getCookie: (name) => event.cookies.get(name),
    setCookie: (name, value, opts) => event.cookies.set(name, value, {
      path: opts.path ?? "/",
      maxAge: opts.maxAge,
      sameSite: opts.sameSite as any,
      httpOnly: opts.httpOnly,
      secure: opts.secure,
    }),
  };
}
```

9. Update the catch-all tRPC handler
   (`routes/api/trpc/[...procedure]/+server.ts`) to use `fromSvelteKit(event)`
10. Update `+layout.server.ts` caller creation to use `fromSvelteKit(event)`

### Phase 0f: Update tRPC Logger Middleware

**Problem**: `middleware/logger.ts` imports `dev` from `$app/environment`.

**File**: `apps/budget/src/lib/trpc/middleware/logger.ts`

**Changes**:

Replace `import { dev } from "$app/environment"` with:

```typescript
const dev = process.env.NODE_ENV === "development";
```

### Success Criteria

#### Automated Verification

- `bun run check` passes
- `bun run build` passes
- `bun run test` passes

#### Manual Verification

- App starts in dev mode and functions identically
- Login, navigation, data fetching, mutations all work
- No console errors

---

## Phase 1: Create `packages/core` Scaffold

**Goal**: Set up the package structure with correct TypeScript, Turbo, and
workspace configuration.

### Changes Required

#### 1. Create `packages/core/package.json`

```json
{
  "name": "@budget/core",
  "version": "0.0.1",
  "private": true,
  "type": "module",
  "main": "./src/index.ts",
  "exports": {
    ".": "./src/index.ts",
    "./schema": "./src/schema/index.ts",
    "./schema/*": "./src/schema/*",
    "./server/*": "./src/server/*",
    "./trpc": "./src/trpc/index.ts",
    "./trpc/*": "./src/trpc/*",
    "./utils/*": "./src/utils/*",
    "./types/*": "./src/types/*",
    "./query": "./src/query/index.ts",
    "./query/*": "./src/query/*"
  },
  "files": ["src"],
  "scripts": {
    "build": "echo '@budget/core - no build needed'",
    "check": "tsc --noEmit"
  },
  "devDependencies": {
    "@budget/config": "workspace:*",
    "typescript": "^5.8.3"
  },
  "dependencies": {}
}
```

Dependencies will be added incrementally as files move in. The key runtime deps
that will be needed: `drizzle-orm`, `@libsql/client`,
`@internationalized/date`, `@trpc/server`, `zod`, `better-auth`,
`simple-statistics`, `fuzzysort`, `nanoid`, `bcryptjs`.

#### 2. Create `packages/core/tsconfig.json`

```json
{
  "extends": "@budget/config/tsconfig",
  "compilerOptions": {
    "baseUrl": ".",
    "rootDir": "src",
    "outDir": "dist",
    "paths": {
      "$core": ["./src"],
      "$core/*": ["./src/*"]
    }
  },
  "include": ["src/**/*.ts"],
  "exclude": ["node_modules", "dist"]
}
```

#### 3. Create `packages/core/turbo.json`

```json
{
  "extends": ["//"],
  "tasks": {
    "build": {
      "outputs": []
    }
  }
}
```

#### 4. Create `packages/core/src/index.ts`

Empty barrel file initially:

```typescript
// @budget/core - shared server code
// Exports are defined in package.json "exports" field
```

#### 5. Update `apps/budget/package.json`

Add to `dependencies`:

```json
"@budget/core": "workspace:*"
```

#### 6. Update `apps/budget/svelte.config.js`

Add `$core` alias alongside `$ui`:

```javascript
alias: {
  $ui: "../../packages/ui/src",
  "$ui/*": "../../packages/ui/src/*",
  $core: "../../packages/core/src",
  "$core/*": "../../packages/core/src/*",
},
```

#### 7. Run `bun install` to link the workspace package

### Success Criteria

#### Automated Verification

- `bun install` succeeds
- `bun run check` passes
- `bun run build` passes

---

## Phase 2: Move Schema and Shared Types

**Goal**: Move the foundational data layer that everything else depends on.

### Changes Required

#### 1. Move Schema Files

Move `apps/budget/src/lib/schema/` to `packages/core/src/schema/`.

Approximate file count: ~27 files.

Update all internal imports within the schema files from `$lib/utils/...` to
relative paths pointing at the core utils (which will move in Phase 3). For the
interim, create a temporary re-export shim in core or use relative paths back to
the app.

**Practical approach**: Since utils haven't moved yet, have the schema files
that need `normalize` from `string-utilities.ts` import it via a relative path
to a temporary shim:

Create `packages/core/src/utils/string-utilities.ts` as the first util to move
(only 1 schema file needs it: `schema/import-profiles.ts`).

#### 2. Move Shared Type Files

Move these 5 type files to `packages/core/src/types/`:

- `types/import.ts`
- `types/automation.ts`
- `types/encryption.ts`
- `types/onboarding.ts`
- `types/categories.ts`

These have zero Svelte dependencies.

#### 3. Update Consumer Imports

All files in `apps/budget/` that import from `$lib/schema/*` change to
`$core/schema/*`:

- ~149 files in `src/lib/server/`
- ~29 files in `src/lib/trpc/`
- Frontend files in `src/routes/`, `src/lib/components/`,
  `src/lib/query/`, `src/lib/states/`

For the 5 moved type files, update consumers from `$lib/types/import` to
`$core/types/import`, etc.

**Note**: The types barrel (`$lib/types/index.ts`) stays in the app and
re-exports from `$core/types/*` for frontend files that import from
`$lib/types`.

#### 4. Add Schema Dependencies to Core

Add to `packages/core/package.json` dependencies:

```json
"drizzle-orm": "catalog:",
"@internationalized/date": "catalog:",
"zod": "catalog:"
```

(Use whatever version resolution the monorepo uses.)

### Success Criteria

#### Automated Verification

- `bun run check` passes
- `bun run build` passes
- `bun run test` passes

#### Manual Verification

- Drizzle Studio opens and shows tables correctly
- DB migrations still work

---

## Phase 3: Move Shared Utils

**Goal**: Move the 15 server-compatible utility modules to core.

### Changes Required

#### 1. Move Pure Utils to `packages/core/src/utils/`

Files to move (all have zero Svelte dependencies):

- `dates-core.ts` (created in Phase 0a)
- `string-utilities.ts` (already started in Phase 2)
- `date-helpers.ts`
- `date-formatters.ts` (update its import of `getSpecialDateValue` to point at
  `dates-core` which is now in core)
- `array-utilities.ts`
- `object-utilities.ts`
- `math-utilities.ts`
- `chart-statistics.ts`
- `slug-utils.ts`
- `generate-unique-slug.ts`
- `cache.ts`
- `performance.ts`
- `payee-matching.ts`
- `icon-validation.ts`
- `formatters-core.ts` (created in Phase 0b)

#### 2. Update Consumer Imports

- ~90 files in `src/lib/server/` change from `$lib/utils/*` to `$core/utils/*`
- ~17 files in `src/lib/trpc/` change similarly
- Frontend files that import these utils either:
  - Import from `$core/utils/*` directly, OR
  - Continue using `$lib/utils/*` barrel which re-exports from `$core/utils/*`

#### 3. Update `$lib/utils/index.ts` Barrel

The app's utils barrel re-exports from core for backward compatibility:

```typescript
export * from "$core/utils/dates-core";
export * from "$core/utils/string-utilities";
export * from "$core/utils/array-utilities";
export * from "$core/utils/object-utilities";
export * from "$core/utils/math-utilities";
// ... etc

// App-specific utils (stay here)
export * from "./dates";
export * from "./formatters";
export * from "./bind-helpers";
```

#### 4. Add Utils Dependencies to Core

```json
"simple-statistics": "catalog:",
"fuzzysort": "catalog:",
"drizzle-orm": "catalog:"
```

(`slug-utils.ts` uses `drizzle-orm` for `like` queries;
`chart-statistics.ts` wraps `simple-statistics`)

### Success Criteria

#### Automated Verification

- `bun run check` passes
- `bun run build` passes
- `bun run test` passes (especially unit tests for utils)

---

## Phase 4: Move Server Layer

This is the largest phase, broken into sub-phases. Each sub-phase is a separate
PR.

### Phase 4a: Move `config/`

**Scope**: `src/lib/server/config/` (static constants, no deps on other server
code)

Files:

- `config/database.ts`
- `config/validation.ts`
- `config/auth.ts`
- `config/permissions.ts`
- Any other config files

Move to: `packages/core/src/server/config/`

Update consumers: Change `$lib/server/config/*` to `$core/server/config/*`.

### Phase 4b: Move `env.ts` and `db/`

**Scope**: The env abstraction (from Phase 0d) and database connection layer.

Files:

- `server/env.ts` (the `getEnv`/`requireEnv` abstraction)
- `server/db/index.ts` (Drizzle connection proxy)
- `server/db/migrate.ts`
- `server/db/factories/` (test factories)

Move to: `packages/core/src/server/env.ts` and
`packages/core/src/server/db/`

`env-sveltekit.ts` stays in the app (it imports `$env/dynamic/private`).

Add to core dependencies:

```json
"@libsql/client": "catalog:",
"drizzle-orm": "catalog:"
```

Update consumers of `$lib/server/db` to `$core/server/db`.

### Phase 4c: Move `shared/` (excluding service factory)

**Scope**: Base repository, database helpers, logging, security, middleware.

Files:

- `shared/database/base-repository.ts` and `index.ts`
- `shared/logging.ts`
- `shared/security/` (encryption, input sanitization, etc.)
- `shared/middleware/` (auth, validation, error-handling, workspace-auth)
- `shared/errors.ts` or error classes
- `shared/trpc/procedures.ts` (if it exists)

Move to: `packages/core/src/server/shared/`

**NOT moving yet**: `shared/container/service-factory.ts` (depends on all
domains, moves with Phase 4e).

### Phase 4d: Move `auth/`

**Scope**: Better Auth configuration and workspace setup.

Files:

- `server/auth/index.ts` (already refactored to use `getEnv()` in Phase 0d)
- `server/auth/password.ts`
- `server/auth/workspace-setup.ts`

Move to: `packages/core/src/server/auth/`

Add to core dependencies:

```json
"better-auth": "catalog:",
"bcryptjs": "catalog:"
```

### Phase 4e: Move `domains/` and Service Factory

**Scope**: All domain services, repositories, and the service factory. This is
the largest sub-phase (~130+ files).

Move `src/lib/server/domains/` to `packages/core/src/server/domains/`.
Move `src/lib/server/shared/container/` to
`packages/core/src/server/shared/container/` (service factory and lazy-service).

All internal cross-imports within domains use relative paths, so most imports
just work after the move. The imports that need updating are those that
reference `$lib/schema/*` (now `$core/schema/*`), `$lib/utils/*` (now
`$core/utils/*`), `$lib/server/db` (now `$core/server/db`), etc.

**The 17 files in `server/domains/` that import from `$lib/trpc/`**: These are
domain route files (e.g., `accounts/routes.ts`, `ml/*/routes.ts`) that import
tRPC procedure definitions. They will temporarily import from `$lib/trpc/t`
until Phase 5 moves the tRPC layer. Use `$core/trpc/t` after Phase 5.

### Phase 4f: Move `import/`

**Scope**: Import orchestrator, validators, matchers, cleanup, file processors.

Move `src/lib/server/import/` to `packages/core/src/server/import/`.

These files depend on domains, schema, and utils (all already in core by now).

### Phase 4g: Move `ai/` and `email/`

**Scope**: AI services and email service.

Move `src/lib/server/ai/` to `packages/core/src/server/ai/`.
Move `src/lib/server/email/` to `packages/core/src/server/email/`.

Add to core dependencies:

```json
"openai": "catalog:",
"@ai-sdk/openai": "catalog:"
```

(Plus any other AI/email-specific deps.)

### Phase 4 Success Criteria (applies to each sub-phase)

#### Automated Verification

- `bun run check` passes
- `bun run build` passes
- `bun run test` passes

#### Manual Verification

- App functions identically: create/edit/delete accounts, transactions
- Import flow works end-to-end
- Auth (login/logout) works

---

## Phase 5: Move tRPC Layer

**Goal**: Move the tRPC router, routes, middleware, and procedure definitions to
core.

### Changes Required

#### 1. Move tRPC Files to `packages/core/src/trpc/`

Files to move:

- `trpc/t.ts` (procedure definitions, middleware)
- `trpc/router.ts` (router assembly)
- `trpc/routes/` (all 45+ route files)
- `trpc/middleware/` (security-logging, logger, rate limiting, etc.)
- `trpc/shared/errors.ts` (error translation)
- `trpc/context.ts` (with `RequestAdapter` interface from Phase 0e)

#### 2. Files That Stay in the App

- `trpc/client.ts` (creates `httpBatchLink` to `/api/trpc` - deployment
  specific)
- `trpc/adapters/sveltekit.ts` (the `fromSvelteKit()` adapter from Phase 0e)
- `routes/api/trpc/[...procedure]/+server.ts` (SvelteKit catch-all handler)

#### 3. Update the App's tRPC Barrel

`apps/budget/src/lib/trpc/index.ts` becomes:

```typescript
// Re-export from core for backward compatibility
export { router, type Router, type RouterInputs, type RouterOutputs }
  from "$core/trpc/router";
export { createContext, type RequestAdapter, type Context, type AuthenticatedContext }
  from "$core/trpc/context";
export { t, publicProcedure, protectedProcedure, rateLimitedProcedure }
  from "$core/trpc/t";

// App-specific
export { trpc as client } from "./client";
```

#### 4. Add tRPC Dependencies to Core

```json
"@trpc/server": "catalog:",
"zod": "catalog:"
```

### Success Criteria

#### Automated Verification

- `bun run check` passes
- `bun run build` passes
- `bun run test` passes

#### Manual Verification

- All tRPC routes respond correctly
- Auth middleware blocks unauthenticated requests
- Mutations with cache invalidation work

---

## Phase 6: Move Query Layer

**Goal**: Move as much of the query layer as possible to core, with framework
abstractions for the Svelte-specific parts.

### Analysis

The query layer has two Svelte-specific dependencies:

1. `_client.ts` uses `browser` from `$app/environment` for the `enabled` flag
2. `_factory.ts` uses `createQuery`/`createMutation` from
   `@tanstack/svelte-query` and `toast` from `$lib/utils/toast-interceptor`
   (which uses `svelte-sonner`)

The domain query files (accounts.ts, transactions.ts, etc.) are configuration
objects that call `defineQuery`/`defineMutation` and `trpc()`.

### Strategy: Abstract the Framework Integration

#### 1. Create Framework-Agnostic Query Interfaces

Create `packages/core/src/query/_types.ts`:

```typescript
import type { QueryKey } from "@tanstack/query-core";

/**
 * Framework-agnostic query configuration.
 * Each platform (SvelteKit, Electrobun) provides its own
 * reactive implementation of createQuery/createMutation.
 */
export interface QueryConfig<TData, TError = Error> {
  queryKey: QueryKey;
  queryFn: () => Promise<TData>;
  options?: Record<string, unknown>;
}

export interface MutationConfig<TInput, TData, TError = Error> {
  mutationFn: (input: TInput) => Promise<TData>;
  onSuccess?: (data: TData, variables: TInput) => void;
  errorMessage?: string;
  successMessage?: string;
}

export type NotificationImportance = "critical" | "important" | "normal";
```

#### 2. Move Query Key Factories and Cache Patterns

These are pure data with no framework dependency:

- Move all `createQueryKeys()` definitions from each domain query file
- Move `cachePatterns` and `queryPresets` from `_client.ts` (after extracting
  the `browser` check)

Create `packages/core/src/query/_keys.ts` and
`packages/core/src/query/_cache.ts`.

#### 3. Move Domain Query Files

Move all domain query files (accounts.ts, transactions.ts, etc.) to
`packages/core/src/query/`.

Refactor them to export configuration objects rather than calling
`defineQuery`/`defineMutation` directly:

```typescript
// packages/core/src/query/accounts.ts
import { trpc } from "$core/trpc/client-factory";
import { cachePatterns } from "./_cache";

export const accountKeys = createQueryKeys("accounts", {
  lists: null,
  detail: (id: number) => [id],
  // ...
});

export const listAccounts = () => ({
  queryKey: accountKeys.lists(),
  queryFn: () => trpc().accountRoutes.all.query(),
  options: { staleTime: 10 * 60 * 1000 },
});

export const saveAccount = {
  mutationFn: (data: SaveAccountInput) =>
    trpc().accountRoutes.save.mutate(data),
  onSuccess: (result: Account) => {
    cachePatterns.invalidatePrefix(accountKeys.lists());
    cachePatterns.setQueryData(accountKeys.detail(result.id), result);
  },
  successMessage: "Account saved",
  errorMessage: "Failed to save account",
};
```

#### 4. Create tRPC Client Factory

Create `packages/core/src/trpc/client-factory.ts`:

```typescript
import type { Router } from "./router";
import type { CreateTRPCClient } from "@trpc/client";

let clientFactory: (() => CreateTRPCClient<Router>) | null = null;

export function setTrpcClientFactory(factory: () => CreateTRPCClient<Router>) {
  clientFactory = factory;
}

export function trpc(): CreateTRPCClient<Router> {
  if (!clientFactory) throw new Error("tRPC client not initialized");
  return clientFactory();
}
```

The SvelteKit app calls `setTrpcClientFactory()` with its existing
`httpBatchLink` client. An Electrobun app would call it with a localhost client.

#### 5. Keep Framework Wrappers in the App

`apps/budget/src/lib/query/_factory.ts` stays in the app. It imports
query configs from `$core/query/*` and wraps them with
`createQuery`/`createMutation` from `@tanstack/svelte-query`.

`apps/budget/src/lib/query/_client.ts` stays in the app (has `browser` check).

The app's `rpc` namespace re-exports from core, wrapping with the Svelte
factory:

```typescript
// apps/budget/src/lib/query/index.ts
import * as coreAccounts from "$core/query/accounts";
import { defineQuery, defineMutation } from "./_factory";

export const rpc = {
  accounts: {
    listAccounts: () => defineQuery(coreAccounts.listAccounts()),
    saveAccount: defineMutation(coreAccounts.saveAccount),
    // ...
  },
  // ... other domains
};
```

#### 6. Move the `rpc` Namespace to Core (Alternative)

If the above wrapping pattern is too verbose, an alternative is to move the
`rpc` namespace to core and have the factory accept a platform-provided
`createQuery`/`createMutation` adapter. This is more complex but keeps a
single source of truth.

The decision can be made during implementation based on what feels cleanest.

### Success Criteria

#### Automated Verification

- `bun run check` passes
- `bun run build` passes
- `bun run test` passes

#### Manual Verification

- All data fetching works (queries load, mutations execute)
- Cache invalidation works (creating a transaction updates the list)
- Toast notifications appear correctly

---

## Phase 7: SvelteKit Adapter Wiring

**Goal**: Clean up the app to have a thin adapter layer that bridges SvelteKit
to core.

### Changes Required

#### 1. Create `apps/budget/src/lib/platform/sveltekit.ts`

Central initialization file that wires SvelteKit-specific pieces:

```typescript
import "$lib/server/env-sveltekit"; // Initialize env provider
import { setTrpcClientFactory } from "$core/trpc/client-factory";
import { trpc } from "$lib/trpc/client";

// Initialize tRPC client factory for the query layer
setTrpcClientFactory(trpc);
```

Import this in `hooks.server.ts` and the root `+layout.svelte`.

#### 2. Clean Up Re-exports

Ensure `apps/budget/src/lib/trpc/index.ts` and
`apps/budget/src/lib/query/index.ts` cleanly re-export from core with
minimal wrapping.

#### 3. Document the Adapter Pattern

Add a section to the root `CLAUDE.md` explaining:

- `packages/core` contains all shared server code
- `$core/` alias maps to `packages/core/src/`
- Platform-specific code lives in `apps/<platform>/src/lib/platform/`
- The `RequestAdapter` interface for creating new platform adapters
- The `setEnvProvider()` and `setTrpcClientFactory()` initialization pattern

### Success Criteria

#### Automated Verification

- `bun run check` passes
- `bun run build` passes
- `bun run test` passes
- `bun run lint` passes

#### Manual Verification

- Full app walkthrough: login, view accounts, create transaction, import file,
  switch workspaces, logout
- No console errors or warnings

---

## Testing Strategy

### Unit Tests

- Utils tests should work unchanged (just update import paths)
- Domain service tests should work unchanged
- Add tests for `RequestAdapter` implementations
- Add tests for `getEnv`/`requireEnv`

### Integration Tests

- tRPC route tests should work unchanged (use `createCaller` with a test
  `RequestAdapter`)
- Database tests work unchanged (same Drizzle + SQLite)

### Manual Testing Steps

After each phase:

1. Start dev server (`bun run dev`)
2. Log in
3. Navigate to accounts, transactions, budgets
4. Create and edit a transaction
5. Import a CSV file
6. Switch workspaces
7. Check that scheduled transactions appear
8. Verify auth redirect (visit protected page while logged out)

---

## Performance Considerations

- No runtime performance impact: code moves between packages but executes
  identically
- Build time may increase slightly due to additional TypeScript path resolution
  across packages, but the "no-build" pattern for core minimizes this
- Vite's dependency optimization (`optimizeDeps.include`) in the budget app may
  need entries for `@budget/core` if Vite doesn't pre-bundle it correctly

---

## Migration Notes

- Each phase is a separate branch/PR
- Phases must be merged in order (each builds on the previous)
- The `$lib/` to `$core/` import rewriting is the most tedious part but is
  purely mechanical (find-and-replace with verification)
- If any phase reveals unexpected coupling, stop and address the coupling
  in-place before proceeding with the move
- Git history: use `git mv` where possible to preserve file history

---

## References

- Existing shared package pattern: `packages/ui/package.json`
- TypeScript path config: `packages/ui/tsconfig.json`
- Monorepo workspace config: root `package.json` workspaces field
- SvelteKit alias pattern: `apps/budget/svelte.config.js` (`$ui` alias)
- tRPC fetch adapter: `@trpc/server/adapters/fetch` (works with any
  `Request`/`Response`)
