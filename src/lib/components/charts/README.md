# Chart Wrapper Component

A flexible wrapper around layerchart that simplifies creating charts with consistent styling and behavior.

## Basic Usage

```svelte
<script>
  import { ChartWrapper } from '$lib/components/charts';
  
  const data = [
    { month: 'Jan', income: 4500, expenses: 1200 },
    { month: 'Feb', income: 4800, expenses: 1400 },
    { month: 'Mar', income: 5200, expenses: 1600 }
  ];
  
  const series = [
    {
      data: data.map(d => ({ x: d.month, y: d.income })),
      type: 'bar',
      colorIndex: 1,
      label: 'Income'
    },
    {
      data: data.map(d => ({ x: d.month, y: d.expenses })),
      type: 'bar', 
      colorIndex: 2,
      label: 'Expenses'
    }
  ];
</script>

<ChartWrapper
  {data}
  {series}
  x="month"
  y="value"
/>
```

## Chart Types

### Bar Charts
```svelte
const series = [
  { data: incomeData, type: 'bar', colorIndex: 1 },
  { data: expensesData, type: 'bar', colorIndex: 2 }
];
```

### Line Charts
```svelte
const series = [
  { data: incomeData, type: 'line', colorIndex: 1, strokeWidth: 3 },
  { data: expensesData, type: 'line', colorIndex: 2, strokeWidth: 3 }
];
```

### Area Charts
```svelte
const series = [
  { data: incomeData, type: 'area', colorIndex: 1, fillOpacity: 0.7 },
  { data: expensesData, type: 'area', colorIndex: 2, fillOpacity: 0.7 }
];
```

### Scatter Plots
```svelte
const series = [
  { 
    data: scatterData, 
    type: 'scatter', 
    colorIndex: 1, 
    r: 4 // Fixed radius
  },
  { 
    data: variableScatterData, 
    type: 'scatter', 
    colorIndex: 2, 
    r: (d) => d.size // Dynamic radius based on data
  }
];
```

### Pie Charts
```svelte
const series = [
  { 
    data: categoryData, 
    type: 'pie', 
    colorIndex: 1,
    innerRadius: 0,     // Full pie
    outerRadius: 100
  }
];
```

### Arc Charts (Donut Charts)
```svelte
const series = [
  { 
    data: categoryData, 
    type: 'arc', 
    colorIndex: 1,
    innerRadius: 40,    // Creates donut hole
    outerRadius: 100,
    startAngle: 0,
    endAngle: Math.PI * 2
  }
];
```

### Threshold Charts
```svelte
const series = [
  { 
    data: performanceData, 
    type: 'threshold', 
    colorIndex: 1,
    threshold: 0        // Line at y=0
  }
];
```

### Hull Charts (Convex Hull)
```svelte
const series = [
  { 
    data: clusterData, 
    type: 'hull', 
    colorIndex: 1,
    fillOpacity: 0.2,
    strokeWidth: 2
  }
];
```

### Calendar Charts
```svelte
const series = [
  { 
    data: dailyData,    // Data with date values
    type: 'calendar', 
    colorIndex: 1
  }
];
```

### Mixed Chart Types
```svelte
const series = [
  { data: targetData, type: 'line', color: '#666', strokeWidth: 2 },
  { data: actualData, type: 'bar', colorIndex: 1 },
  { data: outliers, type: 'scatter', colorIndex: 3, r: 3 }
];
```

## Configuration Options

### Data Structure
Each series needs data in `{ x: value, y: value }` format:
```javascript
const seriesData = [
  { x: 'Jan 2025', y: 4500 },
  { x: 'Feb 2025', y: 4800 }
];
```

### Series Configuration
```typescript
interface ChartSeries {
  data: any[];                    // Chart data points
  type: 'bar' | 'area' | 'line' | 'scatter' | 'pie' | 'arc' | 'threshold' | 'calendar' | 'hull';  // Chart type
  color?: string;                 // Explicit color (e.g., '#ff0000')
  colorIndex?: number;            // Theme color index (0-7)
  fill?: string;                  // Override fill color
  stroke?: string;                // Override stroke color  
  strokeWidth?: number;           // Line/stroke width
  fillOpacity?: number;           // Area fill opacity (0-1)
  label?: string;                 // Series label for legends
  
  // Scatter plot properties
  r?: number | ((d: any) => number); // Point radius (fixed or function)
  
  // Pie/Arc chart properties
  innerRadius?: number;           // Inner radius for donuts (0 for full pie)
  outerRadius?: number;           // Outer radius
  startAngle?: number;            // Start angle for arcs
  endAngle?: number;              // End angle for arcs
  
  // Threshold chart properties
  threshold?: number;             // Threshold line position
}
```

### Chart Props
```typescript
interface Props {
  // Data and chart configuration
  data: any[];                    // Combined data for scaling
  series: ChartSeries[];          // Series to render
  
  // Chart setup
  x?: string;                     // X-axis data key
  y?: string | string[];          // Y-axis data key(s)
  
  // Styling and layout
  padding?: object;               // Chart padding
  yDomain?: [number|null, number|null]; // Y-axis domain
  xDomain?: [number|null, number|null]; // X-axis domain
  yNice?: boolean;                // Nice Y-axis values
  xNice?: boolean;                // Nice X-axis values
  
  // Axes configuration
  showLeftAxis?: boolean;         // Show left Y-axis
  showBottomAxis?: boolean;       // Show bottom X-axis  
  showRightAxis?: boolean;        // Show right Y-axis
  showTopAxis?: boolean;          // Show top X-axis
  rotateBottomLabels?: boolean;   // Rotate X-axis labels
  
  // Grid and styling
  showGrid?: boolean;             // Show full grid
  showHorizontalGrid?: boolean;   // Show horizontal grid only
  showVerticalGrid?: boolean;     // Show vertical grid only
  showRule?: boolean;             // Show rule line
  
  // Chart-specific options
  chartType?: 'cartesian' | 'polar' | 'radial'; // Chart coordinate system
  innerRadius?: number;           // For polar charts
  outerRadius?: number;           // For polar charts
  
  // Legends and labels
  showLegend?: boolean;           // Show legend
  showLabels?: boolean;           // Show data labels
  
  // Styling
  class?: string;                 // Container CSS class
}
```

## Advanced Examples

### Financial Dashboard Chart
```svelte
<script>
  import { ChartWrapper } from '$lib/components/charts';
  
  const financialData = processTransactions(transactions);
  
  const series = [
    {
      data: financialData.map(d => ({ x: d.month, y: d.income })),
      type: 'bar',
      colorIndex: 1, // Green
      label: 'Income'
    },
    {
      data: financialData.map(d => ({ x: d.month, y: d.expenses })),
      type: 'bar',
      colorIndex: 2, // Red  
      label: 'Expenses'
    },
    {
      data: financialData.map(d => ({ x: d.month, y: d.target })),
      type: 'line',
      color: '#666',
      strokeWidth: 2,
      label: 'Target'
    }
  ];
</script>

<ChartWrapper
  data={financialData}
  {series}
  x="month"
  padding={{ left: 100, bottom: 60, top: 20, right: 30 }}
  yNice={true}
  class="h-96 w-full"
/>
```

### Performance Chart
```svelte
<ChartWrapper
  {data}
  series={[
    { data: performanceData, type: 'area', colorIndex: 3, fillOpacity: 0.3 },
    { data: benchmarkData, type: 'line', color: '#000', strokeWidth: 1 }
  ]}
  x="date" 
  yDomain={[0, 100]}
  rotateBottomLabels={false}
/>
```

## Theme Integration

The wrapper automatically integrates with your color theme:
- Use `colorIndex` (0-7) to use theme colors from `colorUtils`
- Use `color` for explicit colors  
- Colors automatically adapt to light/dark themes

## Error Handling

The wrapper handles common layerchart issues:
- Ensures proper data structure
- Sets sensible defaults for missing props
- Handles color fallbacks gracefully