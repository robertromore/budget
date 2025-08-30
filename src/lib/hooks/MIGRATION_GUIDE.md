# TanStack Query + oRPC Migration Guide

This guide shows how to migrate from manual Svelte stores and direct oRPC calls to proper TanStack Query integration.

## ❌ Old Pattern (Manual Store Management)

```typescript
// OLD: Manual Svelte store
export class AccountsState {
  accounts: SvelteMap<number, Account> = $state() as SvelteMap<number, Account>;

  async deleteAccount(id: number) {
    this.accounts.delete(id);
    await orpc().accounts.remove({ id: id });
  }
}

// Usage in component
const accounts = AccountsState.get();
accounts.deleteAccount(accountId); // No loading states, error handling, or cache invalidation
```

## ✅ New Pattern (TanStack Query Hooks)

```typescript
// NEW: TanStack Query hooks
export function useDeleteAccount() {
  const queryClient = getQueryClient();
  
  return createMutation({
    mutationFn: (input: z.infer<typeof removeAccountFormSchema>) => 
      orpcClient.accounts.remove(input),
    onSuccess: (_, deletedInput) => {
      // Automatic cache updates
      queryClient.setQueryData(['accounts'], (oldData: Account[] = []) =>
        oldData.filter(account => account.id !== deletedInput.id)
      );
      
      // Automatic related cache invalidation
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
    },
  });
}

// Usage in component
const deleteAccountMutation = useDeleteAccount();
$: isDeleting = $deleteAccountMutation.isPending;
$: error = $deleteAccountMutation.error;

await $deleteAccountMutation.mutateAsync({ id: accountId });
```

## Benefits of TanStack Query Integration

### 1. Automatic Loading States
```svelte
<script>
  const accountsQuery = useAccounts();
  $: isLoading = $accountsQuery.isPending;
  $: error = $accountsQuery.error;
  $: accounts = $accountsQuery.data || [];
</script>

{#if isLoading}
  <div>Loading...</div>
{:else if error}
  <div>Error: {error.message}</div>
{:else}
  <!-- Render accounts -->
{/if}
```

### 2. Automatic Caching
```typescript
// Data is automatically cached and shared across components
const accountsQuery1 = useAccounts(); // Makes request
const accountsQuery2 = useAccounts(); // Uses cache, no duplicate request
```

### 3. Background Refetching
```typescript
// Automatically refetches stale data in the background
export function useAccounts() {
  return createQuery({
    queryKey: ['accounts'],
    queryFn: () => orpcClient.accounts.all(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: true, // Auto-refresh when user returns to tab
  });
}
```

### 4. Optimistic Updates
```typescript
export function useUpdateAccount() {
  return createMutation({
    mutationFn: (input) => orpcClient.accounts.save(input),
    // Immediately update UI before server responds
    onMutate: async (newAccount) => {
      await queryClient.cancelQueries({ queryKey: ['accounts', newAccount.id] });
      const previousAccount = queryClient.getQueryData(['accounts', newAccount.id]);
      queryClient.setQueryData(['accounts', newAccount.id], newAccount);
      return { previousAccount };
    },
    // Revert if server request fails
    onError: (err, newAccount, context) => {
      if (context?.previousAccount) {
        queryClient.setQueryData(['accounts', newAccount.id], context.previousAccount);
      }
    },
  });
}
```

### 5. Intelligent Cache Invalidation
```typescript
export function useCreateAccount() {
  return createMutation({
    mutationFn: (input) => orpcClient.accounts.save(input),
    onSuccess: (newAccount) => {
      // Update accounts list
      queryClient.setQueryData(['accounts'], (old = []) => [...old, newAccount]);
      
      // Cache individual account
      queryClient.setQueryData(['accounts', newAccount.id], newAccount);
      
      // Invalidate related data
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
    },
  });
}
```

## Migration Steps

### Step 1: Install Dependencies (Already Done)
- `@tanstack/svelte-query`
- `@orpc/tanstack-query`

### Step 2: Replace Store Usage
```svelte
<!-- OLD -->
<script>
  import { AccountsState } from "$lib/stores/entities/accounts.svelte";
  const accounts = AccountsState.get();
  // Manual loading management
</script>

<!-- NEW -->
<script>
  import { useAccounts, useDeleteAccount } from "$lib/hooks/accounts";
  const accountsQuery = useAccounts();
  const deleteAccountMutation = useDeleteAccount();
  
  $: accounts = $accountsQuery.data || [];
  $: isLoading = $accountsQuery.isPending;
</script>
```

### Step 3: Update Component Logic
```typescript
// OLD: Manual error handling
try {
  await orpc().accounts.remove({ id });
} catch (error) {
  // Manual error handling
}

// NEW: Automatic error handling
const deleteAccountMutation = useDeleteAccount();
await $deleteAccountMutation.mutateAsync({ id });
// Errors available in $deleteAccountMutation.error
```

### Step 4: Remove Manual Stores
Once all components are migrated, delete the manual store files:
- `src/lib/stores/entities/accounts.svelte.ts`
- `src/lib/stores/entities/transactions.svelte.ts`
- etc.

## Key Benefits Achieved

1. **Automatic Caching** - No more manual cache management
2. **Loading States** - Built-in pending/error states
3. **Background Updates** - Data stays fresh automatically
4. **Optimistic Updates** - Instant UI feedback
5. **Request Deduplication** - Eliminates duplicate network requests
6. **Cache Invalidation** - Smart cache updates across related data
7. **Offline Support** - Built-in offline capabilities
8. **DevTools** - Excellent debugging with TanStack Query DevTools

## Performance Impact

- **Reduced Bundle Size** - Remove custom store logic
- **Fewer Network Requests** - Intelligent caching and deduplication
- **Better UX** - Loading states and optimistic updates
- **Less State Management Code** - TanStack Query handles it all

## Next Steps

1. Start migrating one component at a time
2. Use the example hooks as patterns for other entities
3. Remove old store files once fully migrated
4. Add TanStack Query DevTools for development
5. Consider adding more advanced features like infinite queries for large lists