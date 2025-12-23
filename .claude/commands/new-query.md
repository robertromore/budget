# New Query/Mutation

Generate a new query or mutation following the project's query layer patterns.

## Usage

```
/new-query accounts getBalance          # Add query to accounts domain
/new-query --mutation payees merge      # Add mutation to payees domain
/new-query transactions --list          # Add list query
```

## Arguments

Parse from `$ARGUMENTS`:
- First arg: Domain name (e.g., `accounts`, `payees`, `transactions`)
- Second arg: Operation name (e.g., `getBalance`, `merge`, `archive`)
- Flags:
  - `--mutation` or `-m`: Create mutation instead of query
  - `--list`: List-style query (returns array)
  - `--detail`: Detail query with ID parameter

## Process

### 1. Validate Domain

Check that the domain exists:
- Query file: `apps/budget/src/lib/query/{domain}.ts`
- tRPC route: `apps/budget/src/lib/trpc/routes/{domain}.ts`

If not found, suggest using `/new-domain` first.

### 2. Analyze Existing Patterns

Read the query file to understand:
- How query keys are structured
- Return types used
- Cache invalidation patterns
- Success/error message patterns

### 3. Generate Query or Mutation

#### For Queries

```typescript
// List query pattern
export const list{Entity}s = () =>
  defineQuery<{Entity}[]>({
    queryKey: {domain}Keys.list(),
    queryFn: () => trpc().{domain}Routes.all.query() as Promise<{Entity}[]>,
    options: {
      ...queryPresets.static,
    },
  });

// Detail query pattern
export const get{Entity}Detail = (id: number) =>
  defineQuery<{Entity}>({
    queryKey: {domain}Keys.detail(id),
    queryFn: () => trpc().{domain}Routes.load.query({ id }) as Promise<{Entity}>,
    options: {
      staleTime: 60 * 1000,
    },
  });

// Custom query pattern
export const get{OperationName} = (param: ParamType) =>
  defineQuery<ReturnType>({
    queryKey: {domain}Keys.{operationName}(param),
    queryFn: () => trpc().{domain}Routes.{operationName}.query({ param }),
  });
```

#### For Mutations

```typescript
// Standard mutation pattern
export const {operationName} = defineMutation<InputType, ReturnType>({
  mutationFn: (input) =>
    trpc().{domain}Routes.{operationName}.mutate(input),
  onSuccess: (result) => {
    // Invalidate relevant caches
    cachePatterns.invalidatePrefix({domain}Keys.all());
    if (result?.id) {
      cachePatterns.invalidatePrefix({domain}Keys.detail(result.id));
    }
  },
  successMessage: "{Human readable success message}",
  errorMessage: "Failed to {operation description}",
});

// Mutation with dynamic success message
export const {operationName} = defineMutation<InputType, ReturnType>({
  mutationFn: (input) =>
    trpc().{domain}Routes.{operationName}.mutate(input),
  onSuccess: () => {
    cachePatterns.invalidatePrefix({domain}Keys.all());
  },
  successMessage: (data) => {
    return `Successfully processed ${data.count} items`;
  },
  errorMessage: (error) => {
    return error.message || "Operation failed";
  },
});
```

### 4. Update Query Keys

If the operation needs a new query key, add it:

```typescript
export const {domain}Keys = createQueryKeys("{domain}", {
  // Existing keys...
  lists: () => ["{domain}", "list"] as const,
  list: () => ["{domain}", "list"] as const,
  details: () => ["{domain}", "detail"] as const,
  detail: (id: number) => ["{domain}", "detail", id] as const,

  // NEW: Add for custom queries
  {operationName}: (param: ParamType) => ["{domain}", "{operationName}", param] as const,
});
```

### 5. Check tRPC Route Exists

Verify the corresponding tRPC procedure exists:

```typescript
// In src/lib/trpc/routes/{domain}.ts
{operationName}: publicProcedure
  .input(z.object({ ... }))
  .query(async ({ input, ctx }) => {
    // Implementation
  }),
```

If it doesn't exist, offer to create a stub.

## Example Outputs

### Query Generation

```
## Generated Query: getAccountBalance

Added to `src/lib/query/accounts.ts`:

\`\`\`typescript
export const getAccountBalance = (accountId: number) =>
  defineQuery<{ balance: number; pending: number }>({
    queryKey: accountKeys.balance(accountId),
    queryFn: () => trpc().accountRoutes.getBalance.query({ accountId }),
    options: {
      staleTime: 30 * 1000, // Balance changes frequently
    },
  });
\`\`\`

Updated query keys:

\`\`\`typescript
export const accountKeys = createQueryKeys("accounts", {
  // ... existing keys
  balance: (accountId: number) => ["accounts", "balance", accountId] as const,
});
\`\`\`

### Next Steps

1. Ensure tRPC route exists: `accountRoutes.getBalance`
2. Usage in component:
   \`\`\`typescript
   const balanceQuery = getAccountBalance(accountId).options();
   // Access: balanceQuery.data?.balance
   \`\`\`
```

### Mutation Generation

```
## Generated Mutation: archivePayee

Added to `src/lib/query/payees.ts`:

\`\`\`typescript
export const archivePayee = defineMutation<{ id: number }, Payee>({
  mutationFn: (input) =>
    trpc().payeeRoutes.archive.mutate(input),
  onSuccess: (archivedPayee) => {
    cachePatterns.invalidatePrefix(payeeKeys.all());
    cachePatterns.invalidatePrefix(payeeKeys.detail(archivedPayee.id));
  },
  successMessage: "Payee archived successfully",
  errorMessage: "Failed to archive payee",
});
\`\`\`

### Usage

\`\`\`typescript
// In component
const archiveMutation = archivePayee.options();

// Trigger
archiveMutation.mutate({ id: payeeId });

// Or imperative
await archivePayee.execute({ id: payeeId });
\`\`\`
```

## Query Layer Patterns Reference

### Dual Interface

Every query/mutation supports two interfaces:

```typescript
// Reactive (for components with TanStack Query)
const query = listAccounts().options();
// Access: query.data, query.isLoading, query.error

// Imperative (for one-off calls)
const accounts = await listAccounts().execute();
```

### Cache Invalidation

```typescript
// Invalidate all queries for a domain
cachePatterns.invalidatePrefix(accountKeys.all());

// Invalidate specific detail
cachePatterns.invalidatePrefix(accountKeys.detail(id));

// Set data directly (optimistic update)
cachePatterns.setQueryData(accountKeys.detail(id), updatedAccount);
```

### Query Presets

```typescript
// For rarely changing data
options: { ...queryPresets.static }  // staleTime: 10 minutes

// For real-time data
options: { ...queryPresets.realtime }  // refetch on focus

// For background data
options: { ...queryPresets.background }  // no refetch on focus
```

$ARGUMENTS
