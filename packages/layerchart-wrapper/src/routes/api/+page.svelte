<script lang="ts">
  import { Settings, Code, Package } from '../../lib/icons';
</script>

<svelte:head>
  <title>API Reference - LayerChart Wrapper</title>
</svelte:head>

<div class="container mx-auto px-4 py-8">
  <div class="mb-8">
    <h1 class="text-3xl font-bold mb-4">API Reference</h1>
    <p class="text-muted-foreground">
      Complete API documentation for LayerChart Wrapper components and configuration.
    </p>
  </div>

  <!-- UnifiedChart Component -->
  <section class="mb-12">
    <div class="flex items-center gap-2 mb-6">
      <Code class="w-6 h-6" />
      <h2 class="text-2xl font-bold">UnifiedChart</h2>
    </div>

    <div class="bg-card p-6 rounded-lg border mb-6">
      <h3 class="text-lg font-semibold mb-4">Props</h3>
      
      <div class="space-y-4">
        <div class="border rounded-lg">
          <div class="bg-muted px-4 py-2 font-mono text-sm">data: Array&lt;Record&lt;string, any&gt;&gt;</div>
          <div class="p-4">
            <p class="text-sm text-muted-foreground mb-2">
              <strong>Required.</strong> The dataset to visualize. Each item should contain the fields specified in x, y, and other mapping props.
            </p>
            <pre class="text-xs bg-muted p-2 rounded"><code>{`const data = [
  { date: '2024-01', value: 100, category: 'A' },
  { date: '2024-02', value: 150, category: 'B' }
];`}</code></pre>
          </div>
        </div>

        <div class="border rounded-lg">
          <div class="bg-muted px-4 py-2 font-mono text-sm">type: ChartType</div>
          <div class="p-4">
            <p class="text-sm text-muted-foreground mb-2">
              <strong>Required.</strong> The type of chart to render.
            </p>
            <p class="text-xs">
              <strong>Options:</strong> "line" | "area" | "bar" | "pie" | "scatter" | "arc" | "threshold" | "calendar" | "hull" | "spline"
            </p>
          </div>
        </div>

        <div class="border rounded-lg">
          <div class="bg-muted px-4 py-2 font-mono text-sm">x: string</div>
          <div class="p-4">
            <p class="text-sm text-muted-foreground">
              <strong>Required.</strong> The field name for the x-axis data mapping.
            </p>
          </div>
        </div>

        <div class="border rounded-lg">
          <div class="bg-muted px-4 py-2 font-mono text-sm">y: string</div>
          <div class="p-4">
            <p class="text-sm text-muted-foreground">
              <strong>Required.</strong> The field name for the y-axis data mapping.
            </p>
          </div>
        </div>

        <div class="border rounded-lg">
          <div class="bg-muted px-4 py-2 font-mono text-sm">r?: string | number</div>
          <div class="p-4">
            <p class="text-sm text-muted-foreground">
              <strong>Optional.</strong> For scatter plots, the field name for radius mapping or a fixed radius value.
            </p>
          </div>
        </div>

        <div class="border rounded-lg">
          <div class="bg-muted px-4 py-2 font-mono text-sm">color?: string</div>
          <div class="p-4">
            <p class="text-sm text-muted-foreground">
              <strong>Optional.</strong> Field name for color mapping or a fixed color value.
            </p>
          </div>
        </div>

        <div class="border rounded-lg">
          <div class="bg-muted px-4 py-2 font-mono text-sm">showControls?: boolean</div>
          <div class="p-4">
            <p class="text-sm text-muted-foreground">
              <strong>Optional.</strong> Whether to show interactive controls for chart type and settings. Defaults to false.
            </p>
          </div>
        </div>

        <div class="border rounded-lg">
          <div class="bg-muted px-4 py-2 font-mono text-sm">theme?: ChartTheme</div>
          <div class="p-4">
            <p class="text-sm text-muted-foreground">
              <strong>Optional.</strong> Theme configuration for colors and styling.
            </p>
          </div>
        </div>

        <div class="border rounded-lg">
          <div class="bg-muted px-4 py-2 font-mono text-sm">class?: string</div>
          <div class="p-4">
            <p class="text-sm text-muted-foreground">
              <strong>Optional.</strong> CSS classes to apply to the chart container.
            </p>
          </div>
        </div>
      </div>
    </div>

    <div class="bg-card p-6 rounded-lg border">
      <h3 class="text-lg font-semibold mb-4">Events</h3>
      
      <div class="space-y-4">
        <div class="border rounded-lg">
          <div class="bg-muted px-4 py-2 font-mono text-sm">on:typechange</div>
          <div class="p-4">
            <p class="text-sm text-muted-foreground">
              Dispatched when the chart type is changed through controls. Event detail contains the new type.
            </p>
          </div>
        </div>

        <div class="border rounded-lg">
          <div class="bg-muted px-4 py-2 font-mono text-sm">on:datapoint</div>
          <div class="p-4">
            <p class="text-sm text-muted-foreground">
              Dispatched when a data point is clicked or hovered. Event detail contains the data item.
            </p>
          </div>
        </div>
      </div>
    </div>
  </section>

  <!-- Chart Types -->
  <section class="mb-12">
    <div class="flex items-center gap-2 mb-6">
      <Settings class="w-6 h-6" />
      <h2 class="text-2xl font-bold">Chart Types</h2>
    </div>

    <div class="bg-card p-6 rounded-lg border">
      <div class="grid md:grid-cols-2 gap-6">
        <div>
          <h3 class="font-semibold mb-3">Line & Area Charts</h3>
          <ul class="space-y-2 text-sm">
            <li><code class="bg-muted px-1 rounded">line</code> - Connected data points</li>
            <li><code class="bg-muted px-1 rounded">area</code> - Filled area under line</li>
            <li><code class="bg-muted px-1 rounded">spline</code> - Smooth curved line</li>
          </ul>
        </div>
        
        <div>
          <h3 class="font-semibold mb-3">Bar Charts</h3>
          <ul class="space-y-2 text-sm">
            <li><code class="bg-muted px-1 rounded">bar</code> - Rectangular bars</li>
          </ul>
        </div>
        
        <div>
          <h3 class="font-semibold mb-3">Circular Charts</h3>
          <ul class="space-y-2 text-sm">
            <li><code class="bg-muted px-1 rounded">pie</code> - Full circle sectors</li>
            <li><code class="bg-muted px-1 rounded">arc</code> - Partial circle arcs</li>
          </ul>
        </div>
        
        <div>
          <h3 class="font-semibold mb-3">Specialized</h3>
          <ul class="space-y-2 text-sm">
            <li><code class="bg-muted px-1 rounded">scatter</code> - Individual points</li>
            <li><code class="bg-muted px-1 rounded">threshold</code> - Above/below line</li>
            <li><code class="bg-muted px-1 rounded">hull</code> - Convex hull outline</li>
            <li><code class="bg-muted px-1 rounded">calendar</code> - Time-based heatmap</li>
          </ul>
        </div>
      </div>
    </div>
  </section>

  <!-- Configuration -->
  <section class="mb-12">
    <div class="flex items-center gap-2 mb-6">
      <Package class="w-6 h-6" />
      <h2 class="text-2xl font-bold">Configuration Types</h2>
    </div>

    <div class="space-y-6">
      <div class="bg-card p-6 rounded-lg border">
        <h3 class="text-lg font-semibold mb-4">ChartSeries</h3>
        <pre class="text-sm bg-muted p-4 rounded overflow-x-auto"><code>{`interface ChartSeries {
  data: any[];
  type: ChartType;
  color?: string;
  colorIndex?: number;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  fillOpacity?: number;
  label?: string;
  
  // Scatter plot properties
  r?: number | ((d: any) => number);
  
  // Pie/arc properties
  innerRadius?: number;
  outerRadius?: number;
  startAngle?: number;
  endAngle?: number;
  
  // Threshold properties
  threshold?: number;
}`}</code></pre>
      </div>

      <div class="bg-card p-6 rounded-lg border">
        <h3 class="text-lg font-semibold mb-4">ChartTypeOption</h3>
        <pre class="text-sm bg-muted p-4 rounded overflow-x-auto"><code>{`interface ChartTypeOption {
  value: ChartType;
  label: string;
  icon: any;
  description: string;
}`}</code></pre>
      </div>

      <div class="bg-card p-6 rounded-lg border">
        <h3 class="text-lg font-semibold mb-4">ChartTypeGroup</h3>
        <pre class="text-sm bg-muted p-4 rounded overflow-x-auto"><code>{`interface ChartTypeGroup {
  label: string;
  options: ChartTypeOption[];
}`}</code></pre>
      </div>
    </div>
  </section>

  <!-- Usage Examples -->
  <section>
    <h2 class="text-2xl font-bold mb-6">Usage Examples</h2>
    
    <div class="space-y-6">
      <div class="bg-card p-6 rounded-lg border">
        <h3 class="text-lg font-semibold mb-4">Basic Line Chart</h3>
        <pre class="text-sm bg-muted p-4 rounded overflow-x-auto"><code>{`<script>
  import { UnifiedChart } from '@layerchart-wrapper/charts';
  
  const data = [
    { month: 'Jan', sales: 1000 },
    { month: 'Feb', sales: 1200 },
    { month: 'Mar', sales: 800 }
  ];
</script>

<UnifiedChart 
  {data} 
  type="line" 
  x="month" 
  y="sales" 
/>`}</code></pre>
      </div>

      <div class="bg-card p-6 rounded-lg border">
        <h3 class="text-lg font-semibold mb-4">Interactive Chart with Controls</h3>
        <pre class="text-sm bg-muted p-4 rounded overflow-x-auto"><code>{`<UnifiedChart 
  {data} 
  type="line" 
  x="month" 
  y="sales"
  showControls={true}
  on:typechange={(e) => console.log('New type:', e.detail)}
  on:datapoint={(e) => console.log('Point:', e.detail)}
  class="h-96 w-full"
/>`}</code></pre>
      </div>

      <div class="bg-card p-6 rounded-lg border">
        <h3 class="text-lg font-semibold mb-4">Scatter Plot with Size Mapping</h3>
        <pre class="text-sm bg-muted p-4 rounded overflow-x-auto"><code>{`<UnifiedChart 
  data={scatterData} 
  type="scatter" 
  x="income" 
  y="expenses"
  r="population"
  color="region"
/>`}</code></pre>
      </div>
    </div>
  </section>
</div>