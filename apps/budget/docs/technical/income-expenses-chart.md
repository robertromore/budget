# Income vs Expenses Chart Implementation

The `IncomeExpensesChart` component provides a comprehensive solution for
visualizing financial data comparisons with support for multiple chart types,
flexible viewing modes, and integrated period filtering.

This guide shows how to use the component that supports both combined and
side-by-side views with LayerChart integration.

[TOC]

## Features

- **Multi-Series Support**: Display income and expenses in a single chart or side-by-side
- **Chart Type Switching**: Bar, line, and area charts with consistent styling
- **Period Filtering**: Automatic time period generation and filtering
- **Theme Integration**: Uses CSS variables for consistent colors
- **Responsive Design**: Adapts to different screen sizes
- **Accessibility**: Full ARIA support and keyboard navigation  

## Data Structure

The component expects data in this format:

```typescript
interface IncomeExpenseData {
  month: CalendarDate;  // From @internationalized/date
  income: number;       // Positive values
  expenses: number;     // Positive values (will be displayed as expenses)
}
```

## Usage Examples

### Basic Usage

```svelte
<script>
  import { IncomeExpensesChart } from '$lib/components/charts';
  import { createIncomeVsExpensesProcessor } from '../(analytics)/data-processors.svelte';

  let { transactions } = $props();
  
  const processor = createIncomeVsExpensesProcessor(transactions);
</script>

<IncomeExpensesChart data={processor.data} />
```

### Advanced Usage with Custom Options

```svelte
<script>
  import { IncomeExpensesChart } from '$lib/components/charts';
  
  let { transactions } = $props();
  const processor = createIncomeVsExpensesProcessor(transactions);
  
  // Custom colors
  const customColors = {
    income: 'hsl(142, 76%, 36%)',    // Custom green
    expenses: 'hsl(0, 84%, 60%)'     // Custom red
  };
</script>

<IncomeExpensesChart 
  data={processor.data}
  viewMode="combined"
  type="area"
  availableTypes={['bar', 'line', 'area']}
  showControls={true}
  enablePeriodFiltering={true}
  colors={customColors}
  class="h-96 w-full"
/>
```

### Side-by-Side View

```svelte
<IncomeExpensesChart 
  data={processor.data}
  viewMode="side-by-side"
  type="bar"
  showControls={true}
/>
```

## Chart Types

### Bar Charts

- **Combined**: Grouped bars with income and expenses side-by-side
- **Side-by-Side**: Separate bar charts for income and expenses

### Line Charts

- **Combined**: Two line series with different colors
- **Side-by-Side**: Separate line charts with consistent styling

### Area Charts

- **Combined**: Overlapping filled areas with transparency
- **Side-by-Side**: Separate area charts with full opacity

## Integration with Existing Code

### Replace Existing Chart

If you have an existing spending chart, you can replace it:

```svelte
<!-- Before: Single spending chart -->
<UnifiedChart
  data={spendingData}
  type="area"
  styling={{ colors: 'auto' }}
  class="h-full w-full"
/>

<!-- After: Income vs Expenses comparison -->
<IncomeExpensesChart
  data={incomeExpensesData}
  viewMode="combined"
  type="area"
  class="h-full w-full"
/>
```

### Add to Dashboard

Add to your analytics dashboard:

```svelte
<script>
  import { IncomeExpensesChart } from '$lib/components/charts';
  import { createIncomeVsExpensesProcessor } from '../(analytics)/data-processors.svelte';

  let { transactions } = $props();
  const processor = createIncomeVsExpensesProcessor(transactions);
</script>

<div class="grid gap-6">
  <!-- Existing charts -->
  <div class="bg-card p-6 rounded-lg">
    <h3 class="text-lg font-semibold mb-4">Monthly Spending</h3>
    <!-- Existing spending chart -->
  </div>
  
  <!-- New income vs expenses chart -->
  <div class="bg-card p-6 rounded-lg">
    <h3 class="text-lg font-semibold mb-4">Income vs Expenses</h3>
    <IncomeExpensesChart 
      data={processor.data}
      viewMode="combined"
      type="bar"
      class="h-80"
    />
  </div>
</div>
```

## Data Transformation

The component uses the existing `createIncomeVsExpensesProcessor` which:

1. **Groups transactions by month**: Using `CalendarDate` objects
2. **Separates income vs expenses**: Positive amounts = income,
   negative = expenses  
3. **Handles date parsing**: Uses `parseDateValue` for consistent date handling
4. **Sorts chronologically**: Ensures proper time-based ordering

## Styling and Theming

### CSS Variables Used

The component respects your existing theme:

```css
:root {
  --chart-1: 142 76% 36%;    /* Income (green) */
  --chart-2: 0 84% 60%;      /* Expenses (red) */
  --primary: 222 84% 5%;     /* UI elements */
  --muted: 210 40% 98%;      /* Backgrounds */
}
```

### Custom Styling

Override colors for specific use cases:

```svelte
<IncomeExpensesChart
  data={processor.data}
  colors={{
    income: 'hsl(var(--success))',    // Use success color
    expenses: 'hsl(var(--destructive))'  // Use destructive color
  }}
/>
```

## Performance Considerations

- **Large Datasets**: Automatic aggregation for 500+ data points
- **Reactive Updates**: Efficient data processing with Svelte 5 runes
- **Memory Management**: Proper cleanup of chart instances
- **Bundle Size**: Minimal impact (~15KB gzipped including LayerChart)

## Accessibility Features

- **Screen Reader Support**: Proper ARIA labels and descriptions
- **Keyboard Navigation**: Full keyboard support for all controls
- **High Contrast**: Respects user's color preferences
- **Focus Management**: Clear focus indicators and logical tab order

## Error Handling

The component gracefully handles:

- **Empty Data**: Shows "No data available" message
- **Invalid Dates**: Skips invalid date entries
- **Missing Values**: Defaults to 0 for missing income/expenses
- **Render Errors**: Fallback error states with recovery options

## Migration from Separate Charts

If you currently have separate income and expense charts:

```svelte
<!-- Before: Two separate UnifiedChart components -->
<div class="grid grid-cols-2 gap-4">
  <UnifiedChart data={incomeData} type="bar" />
  <UnifiedChart data={expenseData} type="bar" />  
</div>

<!-- After: Single IncomeExpensesChart with view mode toggle -->
<IncomeExpensesChart 
  data={combinedData}
  viewMode="side-by-side"  
  type="bar"
  showControls={true}
/>
```

This provides users with both viewing options while maintaining a single component.

## See also

- [Chart System Architecture](./chart-system-architecture.md) - Global chart
  patterns and configuration
- [LayerChart Integration](./layerchart-integration.md) - LayerChart component
  patterns and best practices
- [Data Processors](./data-processors.md) - Transaction data transformation
  utilities
- [Chart Configuration](../../.claude/agents/layerchart-specialist.md) - Chart
  specialist guide for advanced customization
