# UnifiedChart System Documentation

A comprehensive chart system built on LayerChart with consistent styling, interactive controls, and flexible data visualization capabilities.

## Overview

The UnifiedChart system provides a single, consolidated component that handles all chart types and configurations through a clean, declarative API.

Key Features:
- **UnifiedChart**: Single component for all chart types and visualizations
- **Declarative Configuration**: Type-safe props for chart setup and styling
- **Global Chart Types**: Centralized type definitions with icons
- **Smart Period Filtering**: Automatic time-based data filtering
- **Theme Integration**: Seamless light/dark mode support
- **Accessibility**: Full keyboard navigation and screen reader support

## Architecture

```
UnifiedChart
├── config-resolver.ts     # Merges props into complete configuration
├── chart-config.ts        # TypeScript interfaces and defaults
├── chart-types.ts         # Global chart type definitions with icons
├── chart-type-selector.svelte    # Dropdown for chart type switching
└── chart-period-controls.svelte  # Time period filtering controls
```

## Basic Usage

```svelte
<script>
  import { UnifiedChart } from '$lib/components/charts';
  
  const data = [
    { x: 'Jan', y: 4500 },
    { x: 'Feb', y: 4800 },
    { x: 'Mar', y: 5200 }
  ];
</script>

<UnifiedChart
  {data}
  type="bar"
  class="h-96"
/>
```

## Configuration System

UnifiedChart uses a configuration-based approach with sensible defaults:

```svelte
<UnifiedChart
  {data}
  type="bar"
  axes={{
    x: { show: true, nice: false, rotateLabels: false },
    y: { show: true, nice: true, domain: [null, null] }
  }}
  styling={{
    colors: { scheme: 'theme', override: [] },
    dimensions: { padding: { left: 60, right: 20, top: 20, bottom: 40 } },
    grid: { show: true, horizontal: true, opacity: 0.1 },
    legend: { show: false, position: 'bottom' }
  }}
  interactions={{
    tooltip: { enabled: true, format: 'default' },
    zoom: { enabled: false },
    pan: { enabled: false },
    brush: { enabled: false }
  }}
  timeFiltering={{
    enabled: false,
    field: 'x',
    defaultPeriod: 0
  }}
  controls={{
    show: false,
    allowTypeChange: false,
    allowPeriodChange: false,
    availableTypes: []
  }}
/>
```

## Chart Types

### Bar Charts

```svelte
<UnifiedChart
  {data}
  type="bar"
  styling={{
    colors: { scheme: 'theme', override: ['hsl(var(--primary))'] }
  }}
/>
```

### Line Charts

```svelte
<UnifiedChart
  {data}
  type="line"
  styling={{
    colors: { scheme: 'theme', override: ['hsl(var(--primary))'] }
  }}
/>
```

### Area Charts

```svelte
<UnifiedChart
  {data}
  type="area"
  styling={{
    colors: { scheme: 'theme', override: ['hsl(var(--primary))'] }
  }}
/>
```

### Pie Charts

For pie charts, data should have `category` field or will group by `x` value:

```svelte
<UnifiedChart
  data={[
    { x: 'Groceries', y: 450, category: 'Groceries' },
    { x: 'Transport', y: 320, category: 'Transport' },
    { x: 'Dining', y: 280, category: 'Dining' }
  ]}
  type="pie"
/>
```

### Scatter Plots

```svelte
<UnifiedChart
  {data}
  type="scatter"
  styling={{
    colors: { scheme: 'theme', override: ['hsl(var(--primary))'] }
  }}
/>
```

## Interactive Controls

Enable chart type switching and period filtering:

```svelte
<script>
  import { UnifiedChart } from '$lib/components/charts';
  
  let chartType = $state('bar');
  let currentPeriod = $state(0);
  
  const data = [
    { x: '2025-01-01', y: 4500 },
    { x: '2025-02-01', y: 4800 },
    { x: '2025-03-01', y: 5200 }
  ];
</script>

<UnifiedChart
  {data}
  bind:type={chartType}
  timeFiltering={{
    enabled: true,
    field: 'x',
    defaultPeriod: currentPeriod
  }}
  controls={{
    show: true,
    allowTypeChange: true,
    allowPeriodChange: true,
    availableTypes: ['bar', 'line', 'area']
  }}
  class="h-96"
/>
```

## Period Filtering System

The system automatically generates intelligent time periods based on your data:

### Automatic Period Generation

```typescript
// Data spanning < 6 months → "All Time" only
// Data spanning 6+ months → "All Time", "Last 3 Months" 
// Data spanning 12+ months → "All Time", "Last 3/6 Months"
// Data spanning 18+ months → "All Time", "Last 3/6/12 Months"
// Current year data → Adds "Year to Date"
```

### Date Handling

The system uses `@internationalized/date` for proper date handling:

```svelte
<UnifiedChart
  data={transactionData}
  type="line"
  timeFiltering={{
    enabled: true,
    field: 'date',  // Should contain date strings or Date objects
    defaultPeriod: 0
  }}
  controls={{
    show: true,
    allowPeriodChange: true
  }}
/>
```

## Chart Type System

### Global Type Definitions

Always use the global chart types for consistency:

```typescript
import { ALL_CHART_TYPES } from '$lib/components/charts/chart-types';

// Available chart types with icons and descriptions
const availableTypes = ALL_CHART_TYPES.flatMap(group => 
  group.options.filter(option => 
    ['bar', 'line', 'area', 'pie'].includes(option.value)
  )
);
```

### Chart Type Groups

- **Line & Area**: `line`, `area`  
- **Bars & Columns**: `bar`
- **Circular**: `pie`, `arc`
- **Points & Scatter**: `scatter`
- **Specialized**: `threshold`, `hull`, `calendar`

## Data Format

UnifiedChart expects data in a consistent format:

```typescript
interface ChartDataPoint {
  x: string | number | Date;  // X-axis value
  y: number;                  // Y-axis value  
  category?: string;          // For grouping (pie charts, legends)
  // Additional fields preserved for custom usage
}
```

## Styling and Themes

### Theme Integration

```svelte
<UnifiedChart
  {data}
  type="bar"
  styling={{
    colors: { 
      scheme: 'theme',  // Use theme colors
      override: ['hsl(var(--primary))', 'hsl(var(--secondary))']
    }
  }}
/>
```

### Custom Dimensions

```svelte
<UnifiedChart
  {data}
  type="bar"  
  styling={{
    dimensions: {
      padding: { left: 80, right: 40, top: 20, bottom: 60 }
    }
  }}
/>
```

### Grid Customization

```svelte
<UnifiedChart
  {data}
  type="line"
  styling={{
    grid: {
      show: true,
      horizontal: true,
      opacity: 0.2
    }
  }}
/>
```

## Advanced Examples

### Financial Dashboard Chart

```svelte
<script>
  import { UnifiedChart } from '$lib/components/charts';
  
  let chartType = $state('bar');
  
  const monthlyData = [
    { x: '2025-01', y: 4500, category: 'January' },
    { x: '2025-02', y: 4800, category: 'February' },
    { x: '2025-03', y: 5200, category: 'March' }
  ];
</script>

<UnifiedChart
  data={monthlyData}
  bind:type={chartType}
  axes={{
    x: { show: true, rotateLabels: true },
    y: { show: true, nice: true }
  }}
  styling={{
    colors: { scheme: 'theme', override: ['hsl(var(--primary))'] },
    dimensions: { padding: { left: 80, bottom: 60 } },
    grid: { show: true, horizontal: true }
  }}
  timeFiltering={{
    enabled: true,
    field: 'x',
    defaultPeriod: 0
  }}
  controls={{
    show: true,
    allowTypeChange: true,
    allowPeriodChange: true,
    availableTypes: ['bar', 'line', 'area']
  }}
  class="h-96 w-full"
/>
```

### Category Pie Chart

```svelte
<UnifiedChart
  data={[
    { x: 'Groceries', y: 450, category: 'Groceries' },
    { x: 'Transportation', y: 320, category: 'Transportation' },
    { x: 'Dining Out', y: 280, category: 'Dining Out' },
    { x: 'Utilities', y: 220, category: 'Utilities' }
  ]}
  type="pie"
  styling={{
    colors: { scheme: 'theme' },
    legend: { show: true, position: 'right' }
  }}
  class="h-80"
/>
```

## Error Handling

UnifiedChart includes comprehensive validation:

```svelte
<!-- Shows error state if data is invalid -->
<UnifiedChart
  data={invalidData}
  type="bar" 
/>
```

Error conditions handled:
- Empty or null data arrays
- Missing required fields (`x`, `y`)
- Invalid chart type configurations
- Malformed date fields for time filtering

## Accessibility Features

- **Keyboard Navigation**: Full keyboard support for all controls
- **Screen Reader Support**: Proper ARIA labels and descriptions
- **Theme Compliance**: Colors automatically adapt for contrast
- **Semantic Structure**: Proper HTML hierarchy for assistive technologies

## Performance Considerations

- **Data Validation**: Validates data once and caches results
- **Reactive Computations**: Uses `$derived.by()` for efficient updates
- **Smart Filtering**: Only processes data when period actually changes
- **Color Resolution**: Caches resolved colors to prevent recalculation

## Migration from Legacy Components

If migrating from the old ChartWrapper system:

```svelte
<!-- Old ChartWrapper approach -->
<ChartWrapper
  {data}
  {series}
  x="month"
  showControls={true}
  availableChartTypes={types}
/>

<!-- New UnifiedChart approach -->
<UnifiedChart
  {data}
  type="bar"
  controls={{
    show: true,
    allowTypeChange: true,
    availableTypes: ['bar', 'line', 'area']
  }}
/>
```

## TypeScript Support

Full TypeScript support with comprehensive interfaces:

```typescript
import type { 
  UnifiedChartProps,
  ChartDataPoint,
  ChartType 
} from '$lib/components/charts';

const chartProps: UnifiedChartProps = {
  data: chartData,
  type: 'bar',
  // ... additional configuration
};
```