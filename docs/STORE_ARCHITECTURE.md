# Store Architecture

## Overview

Stores are organized by domain to provide clear separation of concerns and better maintainability. All stores use Svelte 5's new reactivity system with `$state` and `$derived`.

## Organization

### `src/lib/stores/entities/` - Business Data
Core business domain stores that manage persistent data and API interactions.

- **`accounts.svelte.ts`** - Account management (CRUD operations)
- **`categories.svelte.ts`** - Category management with context provider
- **`payees.svelte.ts`** - Payee management with context provider  
- **`schedules.svelte.ts`** - Scheduled transaction management

### `src/lib/stores/ui/` - Interface State
UI-specific state that doesn't persist between sessions.

- **`global.svelte.ts`** - Global dialog states and UI flags
- **`date-filters.svelte.ts`** - Filter UI state management
- **`current-views.svelte.ts`** - View management and state

### `src/lib/stores/app/` - Application Context
Current application state and session-specific data.

- **`current-account.svelte.ts`** - Currently selected account context
- **`current-view.svelte.ts`** - Currently active view context

## Store Patterns

### Context Providers
Some stores use Svelte's context API for component tree access:

```typescript
// In stores/entities/categories.svelte.ts
export class CategoriesState {
  static get() {
    return getContext<CategoriesState>(KEY);
  }
  
  static set(categories: Category[]) {
    return setContext(KEY, new CategoriesState(categories));
  }
}
```

### Derived State
Many stores use `$derived` for computed values:

```typescript
// In current-account.svelte.ts
balance = $derived(currencyFormatter.format(this.account?.balance));
formatted: TransactionsFormat[] = $derived(
  transactionFormatter.format(this.transactions, 0) ?? []
);
```

### API Integration
Entity stores handle API calls through tRPC:

```typescript
async deleteAccount(id: number) {
  this.accounts.delete(id);
  await trpc().accountRoutes.remove.mutate({ id: id });
}
```

## Import Patterns

### Domain-based imports:
```typescript
// Entity data
import { AccountsState, CategoriesState } from "$lib/stores/entities";

// UI state  
import { newAccountDialog } from "$lib/stores/ui";

// App context
import { CurrentAccountState } from "$lib/stores/app";
```

### Specific imports:
```typescript
import { CurrentAccountState } from "$lib/stores/app/current-account.svelte";
import { categoriesContext } from "$lib/stores/entities/categories.svelte";
```

## Store Relationships

```
┌─ entities/ (Business Data)
│  ├─ accounts ──┐
│  ├─ categories ├── app/current-account (transforms data)
│  ├─ payees ────┘
│  └─ schedules
│
├─ ui/ (Interface State)  
│  ├─ global ────────── dialogs, UI flags
│  ├─ date-filters ──── filtering UI state
│  └─ current-views ─── view management
│
└─ app/ (Current Context)
   ├─ current-account ── selected account + derived data  
   └─ current-view ───── active view state
```

## Best Practices

1. **Domain Separation**: Keep business logic in `entities/`, UI state in `ui/`, and context in `app/`
2. **Use Context**: For stores needed by multiple components in a tree
3. **Derive State**: Use `$derived` instead of manually updating computed values
4. **Async Updates**: Handle API calls in store methods, update local state optimistically
5. **Clear Dependencies**: Import from specific files rather than barrel exports when debugging