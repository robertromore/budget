# tRPC Usage Guidelines

## Client-Side Usage

### ✅ **Correct Pattern**
```typescript
import { trpc } from "$lib/trpc/client";

// In state classes or components
await trpc().routeName.procedure.mutate(data);
const result = await trpc().routeName.procedure.query(params);
```

### ❌ **Avoid These Patterns**  
```typescript
// Don't pass unnecessary parameters
await trpc(page).routeName.procedure.mutate(data); // Wrong!

// Don't create multiple client instances unnecessarily
const client = createTRPCClient(); // Usually wrong - use trpc() function
```

## Server-Side Usage

### ✅ **Page Server Loading**
```typescript
import { createContext } from "$lib/trpc/context";
import { createCaller } from "$lib/trpc/router";

export const load: PageServerLoad = async () => {
  const caller = createCaller(await createContext());
  return {
    data: await caller.routeName.all()
  };
};
```

### ✅ **Form Actions**
```typescript
export const actions: Actions = {
  "action-name": async (event) => {
    const form = await superValidate(event, zod4(schema));
    if (!form.valid) return fail(400, { form });
    
    const result = await createCaller(await createContext())
      .routeName.procedure(form.data);
    
    return { form, result };
  }
};
```

## Procedure Naming Conventions

### Current Inconsistency
- Some routes use `Routes` suffix: `accountRoutes`, `categoriesRoutes`
- Others use `routes` suffix: `payeeRoutes`, `transactionRoutes`

### ✅ **Recommended Standard**
Use `Routes` (PascalCase) for consistency:
```typescript
// Route definitions
export const accountRoutes = { ... };
export const categoriesRoutes = { ... };

// Usage
trpc().accountRoutes.save.mutate(data);
trpc().categoriesRoutes.delete.mutate(ids);
```

## Error Handling

### ✅ **Consistent Error Pattern**
```typescript
import { TRPCError } from "@trpc/server";

// In procedures
if (!item) {
  throw new TRPCError({
    code: "NOT_FOUND", 
    message: "Item not found"
  });
}

// In client code
try {
  await trpc().routeName.procedure.mutate(data);
} catch (error) {
  // Handle tRPC errors
  console.error('API Error:', error);
}
```

## Type Safety

### ✅ **Leverage Full Type Safety**
```typescript
// Procedures automatically infer types
const result = await trpc().accounts.all.query();
// result is automatically typed as Account[]

// Input validation with Zod schemas
.input(insertAccountSchema)
.mutation(async ({ input }) => {
  // input is fully typed from schema
});
```

### ✅ **Export Procedure Types**
```typescript
// In route files, export types for reuse
export type AccountsRouter = typeof accountRoutes;
export type AccountInput = inferProcedureInput<AccountsRouter['save']>;
```

## Performance Best Practices

### ✅ **Client Caching**
```typescript
// The trpc() function handles browser client caching automatically
// No need to manage client instances manually
const data1 = await trpc().accounts.all.query(); // Creates/uses cached client
const data2 = await trpc().accounts.all.query(); // Reuses same client
```

### ✅ **Batch Related Operations**
```typescript
// Group related operations in single procedures when possible
const result = await trpc().accounts.saveWithTransactions.mutate({
  account: accountData,
  transactions: transactionData
});
```

## Common Anti-Patterns

### ❌ **Don't Recreate Context Unnecessarily**
```typescript
// Bad - creates context multiple times
const context1 = await createContext();
const result1 = await createCaller(context1).accounts.all();
const context2 = await createContext(); // Wasteful!
const result2 = await createCaller(context2).categories.all();

// Good - reuse context
const context = await createContext();
const caller = createCaller(context);
const result1 = await caller.accounts.all();
const result2 = await caller.categories.all();
```

### ❌ **Don't Mix Server/Client Patterns**
```typescript
// Bad - using server pattern in client code
const caller = createCaller(context); // Wrong context!
await caller.accounts.save(data);

// Good - use client function
await trpc().accounts.save.mutate(data);
```

## Migration Checklist

When refactoring tRPC code:

- [ ] ✅ Use consistent `trpc()` calls (no unnecessary parameters)
- [ ] ✅ Remove unused imports (`page` from `$app/state` etc.)
- [ ] ✅ Follow consistent naming conventions (`Routes` suffix)  
- [ ] ✅ Use proper error handling with TRPCError
- [ ] ✅ Leverage TypeScript inference - avoid manual typing
- [ ] ✅ Reuse context in server-side operations
- [ ] ✅ Group related operations for better performance