<script lang="ts">
  import { ALL_CHART_TYPES } from '../../lib/config/chart-types';
  import { ChartBar, ChartLine, ChartPie } from '../../lib/icons';
  import UnifiedChart from '../../lib/unified-chart.svelte';

  const sampleData = [
    { x: '2024-01', y: 100, category: 'Series A' },
    { x: '2024-02', y: 150, category: 'Series A' },
    { x: '2024-03', y: 120, category: 'Series A' },
    { x: '2024-04', y: 180, category: 'Series A' },
    { x: '2024-05', y: 200, category: 'Series A' },
    { x: '2024-06', y: 170, category: 'Series A' }
  ];

  const pieData = [
    { x: 'Groceries', y: 400, category: 'Groceries' },
    { x: 'Transportation', y: 300, category: 'Transportation' },
    { x: 'Entertainment', y: 200, category: 'Entertainment' },
    { x: 'Utilities', y: 150, category: 'Utilities' }
  ];

  const scatterData = [
    { x: 10, y: 20, metadata: { size: 5 } },
    { x: 20, y: 25, metadata: { size: 8 } },
    { x: 30, y: 15, metadata: { size: 12 } },
    { x: 40, y: 35, metadata: { size: 6 } },
    { x: 50, y: 30, metadata: { size: 10 } }
  ];
</script>

<svelte:head>
  <title>Chart Examples - LayerChart Wrapper</title>
</svelte:head>

<div class="container mx-auto px-4 py-8">
  <div class="mb-8">
    <h1 class="text-3xl font-bold mb-4">Chart Examples</h1>
    <p class="text-muted-foreground">
      Interactive examples showing different chart types and configurations available in LayerChart Wrapper.
    </p>
  </div>

  <!-- Line Charts Section -->
  <section class="mb-12">
    <div class="flex items-center gap-2 mb-6">
      <ChartLine class="w-6 h-6" />
      <h2 class="text-2xl font-bold">Line & Area Charts</h2>
    </div>

    <div class="grid lg:grid-cols-2 gap-6">
      <div class="bg-card p-6 rounded-lg border">
        <h3 class="text-lg font-semibold mb-4">Basic Line Chart</h3>
        <div class="h-64 mb-4">
          <UnifiedChart
            data={sampleData}
            type="line"
            class="h-full w-full"
          />
        </div>
        <pre class="text-xs bg-muted p-3 rounded overflow-x-auto"><code>{`<UnifiedChart
  data={sampleData}
  type="line"
  x="date"
  y="value"
/>`}</code></pre>
      </div>

      <div class="bg-card p-6 rounded-lg border">
        <h3 class="text-lg font-semibold mb-4">Area Chart</h3>
        <div class="h-64 mb-4">
          <UnifiedChart
            data={sampleData}
            type="area"
            class="h-full w-full"
          />
        </div>
        <pre class="text-xs bg-muted p-3 rounded overflow-x-auto"><code>{`<UnifiedChart
  data={sampleData}
  type="area"
  x="date"
  y="value"
/>`}</code></pre>
      </div>
    </div>
  </section>

  <!-- Bar Charts Section -->
  <section class="mb-12">
    <div class="flex items-center gap-2 mb-6">
      <ChartBar class="w-6 h-6" />
      <h2 class="text-2xl font-bold">Bar Charts</h2>
    </div>

    <div class="bg-card p-6 rounded-lg border">
      <h3 class="text-lg font-semibold mb-4">Basic Bar Chart</h3>
      <div class="h-64 mb-4">
        <UnifiedChart
          data={sampleData}
          type="bar"
          class="h-full w-full"
        />
      </div>
      <pre class="text-xs bg-muted p-3 rounded overflow-x-auto"><code>{`<UnifiedChart
  data={sampleData}
  type="bar"
  x="date"
  y="value"
/>`}</code></pre>
    </div>
  </section>

  <!-- Pie Charts Section -->
  <section class="mb-12">
    <div class="flex items-center gap-2 mb-6">
      <ChartPie class="w-6 h-6" />
      <h2 class="text-2xl font-bold">Circular Charts</h2>
    </div>

    <div class="grid lg:grid-cols-2 gap-6">
      <div class="bg-card p-6 rounded-lg border">
        <h3 class="text-lg font-semibold mb-4">Pie Chart</h3>
        <div class="h-64 mb-4">
          <UnifiedChart
            data={pieData}
            type="pie"
            class="h-full w-full"
          />
        </div>
        <pre class="text-xs bg-muted p-3 rounded overflow-x-auto"><code>{`<UnifiedChart
  data={pieData}
  type="pie"
  x="category"
  y="value"
/>`}</code></pre>
      </div>

      <div class="bg-card p-6 rounded-lg border">
        <h3 class="text-lg font-semibold mb-4">Scatter Plot</h3>
        <div class="h-64 mb-4">
          <UnifiedChart
            data={scatterData}
            type="scatter"
            class="h-full w-full"
          />
        </div>
        <pre class="text-xs bg-muted p-3 rounded overflow-x-auto"><code>{`<UnifiedChart
  data={scatterData}
  type="scatter"
  x="x"
  y="y"
  r="size"
/>`}</code></pre>
      </div>
    </div>
  </section>

  <!-- Available Types -->
  <section class="mb-12">
    <h2 class="text-2xl font-bold mb-6">All Available Chart Types</h2>

    <div class="space-y-6">
      {#each ALL_CHART_TYPES as group}
        <div>
          <h3 class="text-lg font-semibold mb-3">{group.label}</h3>
          <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {#each group.options as chart}
              <div class="bg-muted p-4 rounded-lg border">
                <div class="flex items-center gap-2 mb-2">
                  <svelte:component this={chart.icon} class="w-4 h-4" />
                  <span class="font-medium">{chart.label}</span>
                </div>
                <p class="text-sm text-muted-foreground mb-2">{chart.description}</p>
                <code class="text-xs bg-background px-2 py-1 rounded">type="{chart.value}"</code>
              </div>
            {/each}
          </div>
        </div>
      {/each}
    </div>
  </section>

  <!-- Interactive Demo -->
  <section>
    <h2 class="text-2xl font-bold mb-6">Interactive Demo</h2>
    <div class="bg-card p-6 rounded-lg border">
      <p class="text-muted-foreground mb-4">
        Try different chart types with the same data to see how they render differently.
      </p>
      <div class="h-80">
        <UnifiedChart
          data={sampleData}
          type="line"
          controls={{
            show: true,
            allowTypeChange: true,
            allowPeriodChange: true,
            allowColorChange: true
          }}
          class="h-full w-full"
        />
      </div>
    </div>
  </section>
</div>
