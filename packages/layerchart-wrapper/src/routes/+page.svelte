<script lang="ts">
  import { ChartLine, Settings, Zap } from "../lib/icons";
</script>

<svelte:head>
  <title>LayerChart Wrapper - Unified Chart Component</title>
  <meta name="description" content="A wrapper around LayerChart providing a single component for switching between chart types and visual settings" />
</svelte:head>

<div class="container mx-auto px-4 py-8">
  <!-- Hero Section -->
  <div class="text-center mb-12">
    <div class="flex justify-center items-center gap-3 mb-4">
      <ChartLine class="w-12 h-12 text-primary" />
      <h1 class="text-4xl font-bold tracking-tight">LayerChart Wrapper</h1>
    </div>
    <p class="text-xl text-muted-foreground max-w-2xl mx-auto">
      A wrapper around LayerChart to provide a single component that allows the user to switch between charts, change visual settings, and more.
    </p>
  </div>

  <!-- Key Features -->
  <div class="grid md:grid-cols-3 gap-6 mb-12">
    <div class="bg-card p-6 rounded-lg border">
      <div class="flex items-center gap-3 mb-3">
        <ChartLine class="w-6 h-6 text-primary" />
        <h3 class="text-lg font-semibold">Unified Interface</h3>
      </div>
      <p class="text-muted-foreground">
        Single component interface for all LayerChart types: line, area, bar, pie, scatter, and specialized charts.
      </p>
    </div>

    <div class="bg-card p-6 rounded-lg border">
      <div class="flex items-center gap-3 mb-3">
        <Settings class="w-6 h-6 text-primary" />
        <h3 class="text-lg font-semibold">Dynamic Configuration</h3>
      </div>
      <p class="text-muted-foreground">
        Runtime chart type switching, theme customization, period filtering, and visual settings control.
      </p>
    </div>

    <div class="bg-card p-6 rounded-lg border">
      <div class="flex items-center gap-3 mb-3">
        <Zap class="w-6 h-6 text-primary" />
        <h3 class="text-lg font-semibold">LayerChart Powered</h3>
      </div>
      <p class="text-muted-foreground">
        Built on top of LayerChart's powerful visualization capabilities with added convenience and configuration.
      </p>
    </div>
  </div>

  <!-- Quick Start -->
  <div class="mb-12">
    <h2 class="text-2xl font-bold mb-6">Quick Start</h2>
    
    <div class="space-y-4">
      <div>
        <h3 class="text-lg font-semibold mb-2">Installation</h3>
        <pre class="bg-muted p-4 rounded-lg overflow-x-auto"><code>bun add @layerchart-wrapper/charts</code></pre>
      </div>

      <div>
        <h3 class="text-lg font-semibold mb-2">Basic Usage</h3>
        <pre class="bg-muted p-4 rounded-lg overflow-x-auto"><code>{`<script>
  import { UnifiedChart } from '@layerchart-wrapper/charts';
  
  const data = [
    { date: '2024-01', value: 100 },
    { date: '2024-02', value: 150 },
    { date: '2024-03', value: 120 }
  ];
</script>

<UnifiedChart 
  {data} 
  type="line" 
  x="date" 
  y="value" 
/>`}</code></pre>
      </div>
    </div>
  </div>

  <!-- Available Chart Types -->
  <div class="mb-12">
    <h2 class="text-2xl font-bold mb-6">Supported Chart Types</h2>
    
    <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {#each [
        { type: 'line', label: 'Line Chart', desc: 'Connected points showing trends' },
        { type: 'area', label: 'Area Chart', desc: 'Filled area under the line' },
        { type: 'bar', label: 'Bar Chart', desc: 'Rectangular bars for comparison' },
        { type: 'pie', label: 'Pie Chart', desc: 'Circular sectors showing proportions' },
        { type: 'scatter', label: 'Scatter Plot', desc: 'Individual data points' },
        { type: 'threshold', label: 'Threshold Chart', desc: 'Data above/below threshold' }
      ] as chart}
        <div class="bg-card p-4 rounded-lg border">
          <div class="font-medium mb-1">{chart.label}</div>
          <div class="text-sm text-muted-foreground">{chart.desc}</div>
          <div class="text-xs font-mono mt-2 text-primary">type="{chart.type}"</div>
        </div>
      {/each}
    </div>
  </div>

  <!-- Architecture Overview -->
  <div class="mb-12">
    <h2 class="text-2xl font-bold mb-6">Architecture</h2>
    
    <div class="bg-muted/50 p-6 rounded-lg">
      <div class="text-center space-y-4">
        <div class="bg-background p-3 rounded border inline-block">
          <strong>Your Application</strong>
        </div>
        <div class="text-muted-foreground">↓</div>
        <div class="bg-primary/10 p-3 rounded border inline-block">
          <strong>LayerChart Wrapper</strong><br />
          <span class="text-sm">UnifiedChart Component</span>
        </div>
        <div class="text-muted-foreground">↓</div>
        <div class="bg-background p-3 rounded border inline-block">
          <strong>LayerChart</strong><br />
          <span class="text-sm">Native Chart Components</span>
        </div>
      </div>
    </div>
  </div>

  <!-- Next Steps -->
  <div class="text-center">
    <h2 class="text-2xl font-bold mb-4">Ready to Get Started?</h2>
    <p class="text-muted-foreground mb-6">
      Explore the examples and API documentation to see LayerChart Wrapper in action.
    </p>
    <div class="flex justify-center gap-4">
      <a href="/examples" class="bg-primary text-primary-foreground px-6 py-2 rounded-lg font-medium hover:bg-primary/90 transition-colors">
        View Examples
      </a>
      <a href="/api" class="border border-border px-6 py-2 rounded-lg font-medium hover:bg-muted transition-colors">
        API Reference
      </a>
    </div>
  </div>
</div>