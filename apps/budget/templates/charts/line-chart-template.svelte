<script lang="ts">
  import { ChartWrapper } from '$lib/components/charts';
  import { ChartLine, ChartBar, TrendingUp } from '$lib/components/icons';
  import type { ChartSeries, ChartType } from '$lib/types/widgets';

  interface Props {
    data: Array<{
      date: string;
      value: number;
      label?: string;
    }>;
    title?: string;
    chartType?: ChartType;
    showControls?: boolean;
    period?: string;
    class?: string;
  }

  let { 
    data,
    title = '{{CHART_TITLE}}',
    chartType = $bindable('line'),
    showControls = true,
    period = 'month',
    class: className = 'h-80 w-full'
  }: Props = $props();

  // Transform data for chart consumption
  const chartData = $derived.by(() => {
    return data.map(item => ({
      x: item.date,
      y: item.value,
      date: new Date(item.date),
      value: item.value,
      label: item.label || item.date
    })).sort((a, b) => a.date.getTime() - b.date.getTime());
  });

  // Available chart types for this template
  const availableChartTypes = [
    { value: 'line', label: 'Line', icon: ChartLine, description: 'Smooth trend line' },
    { value: 'area', label: 'Area', icon: TrendingUp, description: 'Filled area chart' },
    { value: 'bar', label: 'Bar', icon: ChartBar, description: 'Bar chart' }
  ];

  // Chart series configuration
  const series: ChartSeries[] = $derived([{
    data: chartData,
    type: chartType,
    stroke: 'hsl(var(--primary))',
    fill: chartType === 'area' ? 'hsl(var(--primary) / 0.2)' : 'none',
    strokeWidth: 2,
    colorIndex: 0
  }]);

  // Calculate summary statistics
  const stats = $derived.by(() => {
    if (chartData.length === 0) return null;
    
    const values = chartData.map(d => d.value);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const avg = values.reduce((sum, val) => sum + val, 0) / values.length;
    const latest = values[values.length - 1];
    const previous = values[values.length - 2] || latest;
    const change = latest - previous;
    const changePercent = previous !== 0 ? (change / previous) * 100 : 0;
    
    return { min, max, avg, latest, change, changePercent };
  });
</script>

<div class="space-y-4">
  <!-- Header with title and stats -->
  <div class="flex items-center justify-between">
    <h3 class="text-lg font-semibold">{title}</h3>
    {#if stats}
      <div class="flex items-center gap-4 text-sm text-muted-foreground">
        <div>Latest: <span class="font-semibold">${stats.latest.toFixed(2)}</span></div>
        <div class:text-green-600={stats.change >= 0} class:text-red-600={stats.change < 0}>
          Change: {stats.change >= 0 ? '+' : ''}{stats.change.toFixed(2)} 
          ({stats.changePercent >= 0 ? '+' : ''}{stats.changePercent.toFixed(1)}%)
        </div>
      </div>
    {/if}
  </div>

  <!-- Chart controls -->
  {#if showControls}
    <div class="flex items-center justify-between gap-4 p-3 bg-muted/30 rounded-lg">
      <div class="flex items-center gap-6 text-sm">
        <!-- Chart type selector -->
        <div class="flex items-center gap-2">
          <span class="text-muted-foreground">Chart:</span>
          <div class="flex items-center gap-1 border rounded-md p-1">
            {#each availableChartTypes as type}
              <button
                class="flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors"
                class:bg-primary={chartType === type.value}
                class:text-primary-foreground={chartType === type.value}
                class:hover:bg-muted={chartType !== type.value}
                onclick={() => chartType = type.value}
              >
                <svelte:component this={type.icon} class="h-3 w-3" />
                {type.label}
              </button>
            {/each}
          </div>
        </div>

        <!-- Period indicator -->
        <div class="text-muted-foreground">
          Period: <span class="capitalize">{period}</span>
        </div>
      </div>
    </div>
  {/if}

  <!-- Chart -->
  <div class={className}>
    {#if chartData.length > 0}
      <ChartWrapper
        data={chartData}
        {series}
        x="x"
        y="y"
        showLeftAxis={true}
        showBottomAxis={true}
        rotateBottomLabels={chartData.length > 8}
        padding={{ left: 80, bottom: chartData.length > 8 ? 100 : 60, top: 20, right: 30 }}
        yNice={true}
        class="h-full w-full"
      />
    {:else}
      <div class="flex items-center justify-center h-full text-muted-foreground">
        <div class="text-center">
          <div class="text-lg mb-2">No Data Available</div>
          <div class="text-sm">Add some data to see the chart</div>
        </div>
      </div>
    {/if}
  </div>

  <!-- Data summary -->
  {#if stats && chartData.length > 0}
    <div class="grid grid-cols-4 gap-4 pt-4 border-t">
      <div class="text-center">
        <div class="text-sm text-muted-foreground">Average</div>
        <div class="font-semibold">${stats.avg.toFixed(2)}</div>
      </div>
      <div class="text-center">
        <div class="text-sm text-muted-foreground">Minimum</div>
        <div class="font-semibold">${stats.min.toFixed(2)}</div>
      </div>
      <div class="text-center">
        <div class="text-sm text-muted-foreground">Maximum</div>
        <div class="font-semibold">${stats.max.toFixed(2)}</div>
      </div>
      <div class="text-center">
        <div class="text-sm text-muted-foreground">Data Points</div>
        <div class="font-semibold">{chartData.length}</div>
      </div>
    </div>
  {/if}
</div>