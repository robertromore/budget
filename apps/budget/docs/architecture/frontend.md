# Frontend Architecture

This document details the frontend architecture of the SvelteKit budget management application, including component organization, state management, and UI patterns.

[TOC]

## Overview

The frontend architecture is built on SvelteKit with a focus on type safety, maintainability, and developer experience. The architecture emphasizes component reusability, clear separation of concerns, and reactive state management using Svelte 5 runes.

## Project Structure

```text
src/
├── lib/
│   ├── components/        # UI components organized by category
│   │   ├── dialogs/      # Modal dialogs for forms and confirmations
│   │   ├── forms/        # Form components for data input
│   │   ├── inputs/       # Input components and form controls
│   │   ├── layout/       # Layout components (sidebar, menu)
│   │   ├── shared/       # Shared utility components
│   │   └── ui/          # Base UI components (shadcn-svelte)
│   ├── constants/        # Application constants
│   ├── hooks/           # Custom Svelte hooks and utilities
│   ├── states/          # State management classes
│   │   ├── entities/    # Domain entity state management
│   │   ├── ui/          # UI state management
│   │   └── views/       # View-specific state
│   ├── types/           # TypeScript type definitions
│   └── utils/           # Utility functions and helpers
└── routes/              # SvelteKit routes and pages
    ├── accounts/        # Account management pages
    ├── categories/      # Category management pages
    ├── schedules/       # Schedule management pages
    └── views/           # Custom views management
```

## Component Architecture

### Component Organization Principles

1. **Hierarchical Structure**: Components are organized from specific to general
2. **Index Exports**: Each category has index.ts for clean imports
3. **Single Responsibility**: Each component has a focused purpose
4. **Composition**: Complex components built from simpler ones

### Component Categories

#### UI Components (`src/lib/components/ui/`)

Base design system components built on shadcn-svelte:

```typescript
// Example: Button component
export { default as Button } from './button.svelte';
export type { ButtonProps } from './button.svelte';

// Usage
import { Button } from '$lib/components/ui';
```

These components provide the foundation for all UI elements and maintain consistent styling and behavior across the application.

#### Input Components (`src/lib/components/inputs/`)

Specialized input components for form handling:

```text
inputs/
├── date/                 # Date-related inputs
│   ├── date-input.svelte
│   ├── advanced-date-input.svelte
│   └── repeating-date-input.svelte
├── numeric/              # Numeric inputs
│   ├── numeric-input.svelte
│   └── multi-numeric-input.svelte
├── entity-input.svelte   # Entity selection inputs
└── index.ts             # Exports all input components
```

#### Form Components (`src/lib/components/forms/`)

Domain-specific form components:

```svelte
<!-- Example: Account management form -->
<script lang="ts">
  import { superForm } from 'sveltekit-superforms';
  import { accountFormSchema } from '$lib/validation/accounts';
  import { Button, Input, Label } from '$lib/components/ui';
  
  interface Props {
    data: SuperValidated<typeof accountFormSchema>;
    action?: string;
  }
  
  const { data, action = '?/create' }: Props = $props();
  
  const { form, errors, enhance } = superForm(data);
</script>

<form method="post" {action} use:enhance>
  <div class="space-y-4">
    <div>
      <Label for="name">Account Name</Label>
      <Input
        id="name"
        name="name"
        bind:value={$form.name}
        error={$errors.name}
      />
    </div>
    
    <Button type="submit">Save Account</Button>
  </div>
</form>
```

#### Dialog Components (`src/lib/components/dialogs/`)

Modal dialogs for user interactions:

```svelte
<!-- Example: Add account dialog -->
<script lang="ts">
  import { Dialog, DialogContent, DialogHeader, DialogTitle } from '$lib/components/ui';
  import { ManageAccountForm } from '$lib/components/forms';
  
  interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    data: SuperValidated<typeof accountFormSchema>;
  }
  
  const { open, onOpenChange, data }: Props = $props();
</script>

<Dialog bind:open {onOpenChange}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Add New Account</DialogTitle>
    </DialogHeader>
    <ManageAccountForm {data} action="?/create" />
  </DialogContent>
</Dialog>
```

#### Layout Components (`src/lib/components/layout/`)

Application layout components:

- **App Sidebar**: Navigation and account switching
- **Menu**: Application-wide menu system
- **Headers**: Page and section headers

#### Shared Components (`src/lib/components/shared/`)

Utility components used across the application:

- **Display Input**: Read-only data display
- **Filter Input**: Data filtering interfaces

## State Management

### State Organization

State management is organized into three main categories:

1. **Entity States**: Domain business objects
2. **UI States**: User interface state
3. **View States**: Page and view-specific state

### Entity State Management

Entity states manage domain objects using Svelte 5 runes:

```typescript
// Example: AccountsState
export class AccountsState {
  accounts: SvelteMap<number, Account> = $state() as SvelteMap<number, Account>;

  constructor(accounts: Account[]) {
    this.accounts = new SvelteMap(accounts.map((account) => [account.id, account]));
  }

  static get() {
    return getContext<AccountsState>(KEY);
  }

  static set(accounts: Account[]) {
    return setContext(KEY, new AccountsState(accounts));
  }

  getById(id: number): Account | undefined {
    return this.accounts.get(id);
  }

  addAccount(account: Account) {
    this.accounts.set(account.id, account);
  }

  async deleteAccount(id: number) {
    this.accounts.delete(id);
    await trpc(page).accountRoutes.remove.mutate({ id });
  }
}
```

### Context-Based State

State is provided through Svelte's context system:

```svelte
<!-- In layout or page component -->
<script lang="ts">
  import { AccountsState } from '$lib/states/entities/accounts.svelte';
  
  // Initialize state from server data
  AccountsState.set(data.accounts);
</script>

<!-- In child components -->
<script lang="ts">
  import { AccountsState } from '$lib/states/entities/accounts.svelte';
  
  const accountsState = AccountsState.get();
  
  // Reactive access to accounts
  const accounts = $derived(Array.from(accountsState.accounts.values()));
</script>
```

### UI State Patterns

UI state manages component interactions and user preferences:

```typescript
export class UIState {
  isLoading = $state(false);
  selectedItems = $state<Set<number>>(new Set());
  sortBy = $state<string>('name');
  sortOrder = $state<'asc' | 'desc'>('asc');

  // Derived state
  hasSelection = $derived(this.selectedItems.size > 0);
  selectedCount = $derived(this.selectedItems.size);

  // Actions
  toggleSelection(id: number) {
    if (this.selectedItems.has(id)) {
      this.selectedItems.delete(id);
    } else {
      this.selectedItems.add(id);
    }
  }

  clearSelection() {
    this.selectedItems.clear();
  }

  setSorting(field: string, order: 'asc' | 'desc') {
    this.sortBy = field;
    this.sortOrder = order;
  }
}
```

## Data Flow Patterns

### Server-Client Data Flow

1. **Initial Load**: Data loaded via SvelteKit's `load` functions
2. **Hydration**: Client state initialized from server data
3. **Mutations**: Client mutations via tRPC with optimistic updates
4. **Synchronization**: Server state synced with client changes

### Form Handling

Forms use SvelteKit's enhanced forms with superforms:

```typescript
// Page load function
export const load = async ({ locals }) => {
  const form = await superValidate(accountFormSchema);
  const accounts = await locals.trpc.accountRoutes.getAll.query();
  
  return { form, accounts };
};

// Action function
export const actions = {
  create: async ({ request, locals }) => {
    const form = await superValidate(request, accountFormSchema);
    
    if (!form.valid) {
      return fail(400, { form });
    }
    
    try {
      const account = await locals.trpc.accountRoutes.create.mutate(form.data);
      return { form, account };
    } catch (error) {
      return setError(form, '', 'Failed to create account');
    }
  }
};
```

## Routing and Navigation

### Route Organization

Routes follow domain-based organization:

```text
routes/
├── +layout.svelte         # Root layout
├── +page.svelte          # Dashboard/home
├── accounts/             # Account management
│   ├── +page.svelte     # Account list
│   └── [id]/            # Individual account
│       └── +page.svelte # Account detail
├── categories/           # Category management
├── schedules/           # Schedule management
└── views/               # Custom views
```

### Dynamic Routes

Individual entity pages use dynamic routing:

```svelte
<!-- routes/accounts/[id]/+page.svelte -->
<script lang="ts">
  import type { PageData } from './$types';
  import { AccountsState } from '$lib/states/entities/accounts.svelte';
  
  const { data }: { data: PageData } = $props();
  
  // Initialize state from page data
  AccountsState.set(data.accounts);
  
  const accountsState = AccountsState.get();
  const account = $derived(accountsState.getById(data.accountId));
</script>

{#if account}
  <h1>{account.name}</h1>
  <!-- Account details -->
{:else}
  <p>Account not found</p>
{/if}
```

### Navigation Guards

Protected routes implement authentication checks:

```typescript
// +layout.server.ts
export const load = async ({ locals, url }) => {
  if (!locals.user && !url.pathname.startsWith('/auth')) {
    throw redirect(302, '/auth/login');
  }
  
  return {
    user: locals.user
  };
};
```

## Component Communication

### Parent-Child Communication

Props and events for component communication:

```svelte
<!-- Parent component -->
<script lang="ts">
  import { ChildComponent } from './child';
  
  let selectedId = $state<number | null>(null);
  
  function handleSelection(id: number) {
    selectedId = id;
  }
</script>

<ChildComponent 
  items={items} 
  {selectedId}
  onselect={handleSelection}
/>

<!-- Child component -->
<script lang="ts">
  interface Props {
    items: Item[];
    selectedId?: number | null;
    onselect?: (id: number) => void;
  }
  
  const { items, selectedId, onselect }: Props = $props();
</script>

{#each items as item}
  <button 
    onclick={() => onselect?.(item.id)}
    class:selected={selectedId === item.id}
  >
    {item.name}
  </button>
{/each}
```

### Cross-Component Communication

Context and stores for complex communication:

```typescript
// Notification system
export class NotificationState {
  notifications = $state<Notification[]>([]);
  
  add(notification: Omit<Notification, 'id'>) {
    const id = Math.random().toString(36);
    this.notifications.push({ ...notification, id });
    
    // Auto-remove after delay
    setTimeout(() => this.remove(id), 5000);
  }
  
  remove(id: string) {
    const index = this.notifications.findIndex(n => n.id === id);
    if (index > -1) {
      this.notifications.splice(index, 1);
    }
  }
}
```

## Reactive Programming

### Svelte 5 Runes

The application extensively uses Svelte 5 runes for reactivity:

```svelte
<script lang="ts">
  // State rune for mutable values
  let count = $state(0);
  
  // Derived rune for computed values
  let doubled = $derived(count * 2);
  let message = $derived(`Count is ${count}, doubled is ${doubled}`);
  
  // Effect rune for side effects
  $effect(() => {
    console.log(`Count changed to: ${count}`);
    
    // Cleanup
    return () => {
      console.log('Effect cleanup');
    };
  });
  
  // Props rune for component props
  let { title, items = [] } = $props();
</script>
```

### Performance Optimizations

#### Lazy Loading

Components and routes loaded on demand:

```typescript
// Lazy component loading
const LazyComponent = lazy(() => import('./HeavyComponent.svelte'));

// Route-level code splitting happens automatically with SvelteKit
```

#### Memoization

Expensive computations are memoized:

```svelte
<script lang="ts">
  import { memoize } from '$lib/utils/memoize';
  
  const expensiveCalculation = memoize((data: ComplexData[]) => {
    // Complex computation
    return processData(data);
  });
  
  let data = $state<ComplexData[]>([]);
  let result = $derived(expensiveCalculation(data));
</script>
```

## Error Handling

### Component Error Boundaries

Error handling at component level:

```svelte
<!-- ErrorBoundary.svelte -->
<script lang="ts">
  interface Props {
    children: Snippet;
    fallback?: Snippet<[Error]>;
  }
  
  const { children, fallback }: Props = $props();
  
  let error = $state<Error | null>(null);
  
  $effect(() => {
    const handleError = (event: ErrorEvent) => {
      error = event.error;
    };
    
    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  });
</script>

{#if error && fallback}
  {@render fallback(error)}
{:else if error}
  <div class="error-boundary">
    <h2>Something went wrong</h2>
    <p>{error.message}</p>
  </div>
{:else}
  {@render children()}
{/if}
```

### Form Validation

Client-side validation with superforms:

```svelte
<script lang="ts">
  import { superForm } from 'sveltekit-superforms';
  import { zodClient } from 'sveltekit-superforms/adapters';
  import { accountSchema } from '$lib/schemas/account';
  
  const { form, errors, constraints, enhance } = superForm(data.form, {
    validators: zodClient(accountSchema),
    onError({ result }) {
      // Handle form errors
      console.error('Form submission error:', result.error);
    }
  });
</script>

<form method="post" use:enhance>
  <input
    name="name"
    bind:value={$form.name}
    {...$constraints.name}
    class:error={$errors.name}
  />
  {#if $errors.name}
    <span class="error">{$errors.name}</span>
  {/if}
</form>
```

## Testing Strategies

### Component Testing

Unit tests for component logic:

```typescript
import { render, screen } from '@testing-library/svelte';
import { expect, test } from 'vitest';
import AccountCard from './AccountCard.svelte';

test('renders account information', () => {
  const account = {
    id: 1,
    name: 'Test Account',
    balance: 1000,
    slug: 'test-account'
  };
  
  render(AccountCard, { props: { account } });
  
  expect(screen.getByText('Test Account')).toBeInTheDocument();
  expect(screen.getByText('$1,000.00')).toBeInTheDocument();
});
```

### Integration Testing

Testing component interactions:

```typescript
import { render, screen, fireEvent } from '@testing-library/svelte';
import { expect, test } from 'vitest';
import AccountList from './AccountList.svelte';

test('filters accounts by search term', async () => {
  const accounts = [
    { id: 1, name: 'Checking Account' },
    { id: 2, name: 'Savings Account' }
  ];
  
  render(AccountList, { props: { accounts } });
  
  const searchInput = screen.getByRole('searchbox');
  await fireEvent.input(searchInput, { target: { value: 'Checking' } });
  
  expect(screen.getByText('Checking Account')).toBeInTheDocument();
  expect(screen.queryByText('Savings Account')).not.toBeInTheDocument();
});
```

## Performance Monitoring

### Bundle Analysis

Monitor bundle size and loading performance:

```bash
# Analyze bundle size
bun run build
bunx vite-bundle-analyzer dist

# Performance auditing
bunx lighthouse http://localhost:4173
```

### Runtime Performance

Monitor runtime performance metrics:

```typescript
// Performance monitoring
export function measurePerformance<T>(
  fn: () => T,
  label: string
): T {
  const start = performance.now();
  const result = fn();
  const end = performance.now();
  
  console.log(`${label}: ${end - start}ms`);
  return result;
}

// Usage
const processedData = measurePerformance(
  () => processLargeDataset(data),
  'Data processing'
);
```

## Accessibility

### ARIA Support

Semantic HTML with proper ARIA attributes:

```svelte
<div
  role="button"
  tabindex="0"
  aria-pressed={isPressed}
  aria-label="Toggle account visibility"
  onkeydown={handleKeydown}
  onclick={handleClick}
>
  Toggle
</div>
```

### Keyboard Navigation

Full keyboard accessibility:

```svelte
<script lang="ts">
  function handleKeydown(event: KeyboardEvent) {
    switch (event.key) {
      case 'Enter':
      case ' ':
        event.preventDefault();
        handleClick();
        break;
      case 'Escape':
        handleEscape();
        break;
    }
  }
</script>
```

### Screen Reader Support

Proper labeling and announcements:

```svelte
<div aria-live="polite" aria-atomic="true">
  {#if isLoading}
    <span class="sr-only">Loading accounts...</span>
  {:else}
    <span class="sr-only">{accounts.length} accounts loaded</span>
  {/if}
</div>
```

## See Also

- [Architecture Overview](architecture-overview.md)
- [Backend Architecture](backend-architecture.md)
- [Development Guidelines](development-guidelines.md)
- [Project Standards](project-standards.md)
