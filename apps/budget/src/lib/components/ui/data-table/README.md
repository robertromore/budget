# Data Table Card View System

This directory contains components for displaying tabular data in both table and card formats.

## Components

### DataDisplay
The main wrapper component that switches between table and card views based on the `viewMode` setting.

```svelte
<DataDisplay
  {table}
  viewMode={currentView?.view.getViewMode() ?? 'table'}
  tableView={(table) => {
    // Your table component
  }}
  cardView={(row) => {
    // Your card component for each row
  }}
/>
```

### TransactionCard
A card component specifically designed for displaying transaction data with support for:
- Payee information
- Category with icon and color
- Status badges
- Notes
- Balance
- Customizable visible fields

```svelte
<TransactionCard
  {transaction}
  visibleFields={{
    payee: true,
    category: true,
    status: true,
    notes: false,
    balance: false
  }}
  onclick={(tx) => console.log('Clicked:', tx)}
/>
```

### DataCardGrid
A responsive grid container for displaying cards with configurable columns:

```svelte
<DataCardGrid
  {table}
  card={(row) => <TransactionCard transaction={row} />}
  columns={{
    default: 1,
    sm: 2,
    md: 2,
    lg: 3,
    xl: 4
  }}
  gap={4}
/>
```

### AnalyticsCard
An example card for displaying analytics data (top categories, payees, etc.):

```svelte
<AnalyticsCard
  data={{
    id: 1,
    name: 'Groceries',
    amount: 450.50,
    count: 12,
    percentage: 15.2,
    icon: ShoppingCart,
    color: '#3b82f6'
  }}
  onclick={(data) => console.log('Clicked:', data)}
/>
```

## View Mode Integration

The view mode is stored in the view's display state and can be toggled via the DisplayInput component:

1. **View Model** (`src/lib/models/view.svelte.ts`):
   ```typescript
   currentView.view.getViewMode(); // 'table' | 'cards'
   currentView.view.setViewMode('cards');
   ```

2. **DisplayInput** (`src/lib/components/input/display-input.svelte`):
   - Users can toggle between table and card views
   - Setting is automatically saved to the view

3. **Schema** (`src/lib/schema/views.ts`):
   ```typescript
   viewMode: z.optional(z.enum(['table', 'cards']).default('table'))
   ```

## Usage Example

Here's a complete example of using the card view system:

```svelte
<script lang="ts">
import {DataDisplay, TransactionCard} from '$lib/components/ui/data-table';
import {currentViews} from '$lib/states/views';

const currentViewsState = $derived(currentViews.get());
const currentView = $derived(currentViewsState?.activeView);
const table = $derived(currentView?.table);
</script>

{#if table}
  <DataDisplay
    {table}
    viewMode={currentView?.view.getViewMode() ?? 'table'}
    tableView={(table) => {
      // Render your existing table component
      <Table.Root>
        <!-- ... -->
      </Table.Root>
    }}
    cardView={(transaction) => {
      <TransactionCard
        {transaction}
        onclick={(tx) => console.log('Transaction clicked:', tx)}
      />
    }}
    cardGridColumns={{
      default: 1,
      sm: 2,
      lg: 3
    }}
  />
{/if}
```

## Creating Custom Card Components

To create a custom card component for your data:

1. Accept your data type as a prop
2. Use the shadcn Card components (`Card.Root`, `Card.Header`, `Card.Content`, etc.)
3. Format data using the utilities from `$lib/utils/formatters` and `$lib/utils/date-formatters`
4. Add hover effects and click handlers as needed

Example:

```svelte
<script lang="ts" generics="TData">
import * as Card from '$lib/components/ui/card';

interface Props {
  data: TData;
  onclick?: (data: TData) => void;
}

let {data, onclick}: Props = $props();
</script>

<Card.Root
  class="transition-all hover:shadow-md cursor-pointer"
  onclick={() => onclick?.(data)}
>
  <Card.Header>
    <Card.Title>{data.title}</Card.Title>
  </Card.Header>
  <Card.Content>
    <!-- Your custom content -->
  </Card.Content>
</Card.Root>
```

## Responsive Grid Configuration

The DataCardGrid uses Tailwind's responsive grid classes. Configure columns for different breakpoints:

```typescript
{
  default: 1,  // Mobile: 1 column
  sm: 2,       // Small: 2 columns
  md: 2,       // Medium: 2 columns
  lg: 3,       // Large: 3 columns
  xl: 4        // Extra large: 4 columns
}
```

## Developer Control

The system is designed to give developers control over:
- Which data to display
- Which features are enabled (sorting, filtering, pagination)
- Default view mode
- Whether users can toggle between views
- Which fields are visible in cards
- Card layout and styling

Simply configure the components via props and let users customize within those constraints through the DisplayInput controls.
