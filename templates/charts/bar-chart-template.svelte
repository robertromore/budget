<script lang="ts">
  import { ChartWrapper } from '$lib/components/charts';
  import { ChartBar, ChartLine, TrendingUp } from '$lib/components/icons';
  import type { ChartSeries, ChartType } from '$lib/types/widgets';

  interface Props {
    data: Array<{
      category: string;
      value: number;
      secondaryValue?: number; // For grouped bar charts (e.g., income vs expenses)
      color?: string;
      secondaryColor?: string;
    }>;
    title?: string;
    chartType?: ChartType;
    showControls?: boolean;
    isGrouped?: boolean; // Whether to show secondary values
    orientation?: 'vertical' | 'horizontal';
    class?: string;
  }

  let { 
    data,
    title = '{{CHART_TITLE}}',
    chartType = $bindable('bar'),
    showControls = true,
    isGrouped = false,
    orientation = 'vertical',
    class: className = 'h-80 w-full'
  }: Props = $props();

  // Transform data for chart consumption
  const chartData = $derived.by(() => {
    return data.map((item, index) => ({
      x: item.category,
      y: item.value,
      y2: item.secondaryValue || 0,
      category: item.category,
      value: item.value,
      secondaryValue: item.secondaryValue,
      color: item.color || `hsl(var(--chart-${(index % 12) + 1}))`,
      secondaryColor: item.secondaryColor || `hsl(var(--chart-${((index + 6) % 12) + 1}))`
    }));
  });

  // Available chart types for this template
  const availableChartTypes = [
    { value: 'bar', label: 'Bar', icon: ChartBar, description: 'Bar chart' },
    { value: 'line', label: 'Line', icon: ChartLine, description: 'Line chart' },
    { value: 'area', label: 'Area', icon: TrendingUp, description: 'Area chart' }
  ];

  // Chart series configuration
  const series: ChartSeries[] = $derived(() => {
    const primarySeries = {
      data: chartData,
      type: chartType,
      fill: chartType === 'bar' ? 'hsl(var(--primary))' : 'none',
      stroke: 'hsl(var(--primary))',
      strokeWidth: 2,
      colorIndex: 0,
      label: '{{PRIMARY_SERIES_LABEL}}'
    };

    if (isGrouped && chartData.some(d => d.secondaryValue && d.secondaryValue > 0)) {
      const secondarySeries = {
        data: chartData.map(d => ({ ...d, y: d.y2 })),
        type: chartType,
        fill: chartType === 'bar' ? 'hsl(var(--secondary))' : 'none',
        stroke: 'hsl(var(--secondary))',
        strokeWidth: 2,
        colorIndex: 1,
        label: '{{SECONDARY_SERIES_LABEL}}'
      };
      return [primarySeries, secondarySeries];
    }

    return [primarySeries];
  });

  // Calculate statistics
  const stats = $derived.by(() => {
    const values = chartData.map(d => d.value);
    const secondaryValues = chartData.map(d => d.secondaryValue || 0);
    
    const primarySum = values.reduce((sum, val) => sum + val, 0);
    const secondarySum = secondaryValues.reduce((sum, val) => sum + val, 0);
    const primaryAvg = values.length > 0 ? primarySum / values.length : 0;
    const secondaryAvg = secondaryValues.length > 0 ? secondarySum / secondaryValues.length : 0;
    
    const highest = chartData.reduce((max, item) => 
      item.value > max.value ? item : max, chartData[0] || { category: '', value: 0 }
    );
    
    return { 
      primarySum, 
      secondarySum, 
      primaryAvg, 
      secondaryAvg, 
      count: chartData.length,
      highest: highest?.category,
      highestValue: highest?.value || 0
    };
  });
</script>

<div class="space-y-4">
  <!-- Header with title and stats -->
  <div class="flex items-center justify-between">
    <h3 class="text-lg font-semibold">{title}</h3>
    {#if stats.count > 0}
      <div class="flex items-center gap-4 text-sm text-muted-foreground">
        <div>Total: <span class="font-semibold">${stats.primarySum.toFixed(2)}</span></div>
        {#if isGrouped && stats.secondarySum > 0}
          <div>Secondary: <span class="font-semibold">${stats.secondarySum.toFixed(2)}</span></div>
        {/if}
        <div>Categories: <span class="font-semibold">{stats.count}</span></div>
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

        <!-- Grouped toggle -->
        {#if data.some(d => d.secondaryValue && d.secondaryValue > 0)}
          <label class="flex items-center gap-2">
            <input type="checkbox" bind:checked={isGrouped} class="rounded" />
            <span class="text-muted-foreground">Show comparison</span>
          </label>
        {/if}

        <!-- Highest category info -->
        {#if stats.highest}
          <div class="text-muted-foreground">
            Highest: <span class="font-medium">{stats.highest}</span> 
            (${stats.highestValue.toFixed(2)})
          </div>
        {/if}
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
        rotateBottomLabels={chartData.length > 6}
        padding={{ 
          left: 80, 
          bottom: chartData.length > 6 ? 120 : 80, 
          top: 20, 
          right: isGrouped ? 80 : 30 
        }}
        yNice={true}
        showLegend={isGrouped && series.length > 1}
        class="h-full w-full"
      />
    {:else}
      <div class="flex items-center justify-center h-full text-muted-foreground">
        <div class="text-center">
          <div class="text-lg mb-2">No Data Available</div>
          <div class="text-sm">Add some categories to see the chart</div>
        </div>
      </div>
    {/if}
  </div>

  <!-- Data summary -->
  {#if stats.count > 0}
    <div class="grid {isGrouped ? 'grid-cols-4' : 'grid-cols-3'} gap-4 pt-4 border-t">
      <div class="text-center">
        <div class="text-sm text-muted-foreground">Average</div>
        <div class="font-semibold">${stats.primaryAvg.toFixed(2)}</div>
      </div>
      <div class="text-center">
        <div class="text-sm text-muted-foreground">Highest</div>
        <div class="font-semibold">${stats.highestValue.toFixed(2)}</div>
      </div>
      <div class="text-center">
        <div class="text-sm text-muted-foreground">Categories</div>
        <div class="font-semibold">{stats.count}</div>
      </div>
      {#if isGrouped && stats.secondarySum > 0}
        <div class="text-center">
          <div class="text-sm text-muted-foreground">Secondary Avg</div>
          <div class="font-semibold">${stats.secondaryAvg.toFixed(2)}</div>
        </div>
      {/if}
    </div>
  {/if}
</div>