<script lang="ts">
  import { ChartWrapper } from '$lib/components/charts';
  import { ChartBar, ChartPie } from '$lib/components/icons';
  import type { ChartSeries, ChartType } from '$lib/types/widgets';
  import { colorUtils } from '$lib/utils/colors';

  interface Props {
    data: Array<{
      name: string;
      value: number;
      color?: string;
    }>;
    title?: string;
    chartType?: ChartType;
    showControls?: boolean;
    showLegend?: boolean;
    class?: string;
  }

  let {
    data,
    title = '{{CHART_TITLE}}',
    chartType = $bindable('pie'),
    showControls = true,
    showLegend = true,
    class: className = 'h-80 w-full'
  }: Props = $props();

  // Transform data for chart consumption
  const chartData = $derived.by(() => {
    const total = data.reduce((sum, item) => sum + item.value, 0);

    return data.map((item, index) => ({
      name: item.name,
      value: item.value,
      percentage: total > 0 ? (item.value / total) * 100 : 0,
      color: item.color || colorUtils.getChartColor(index)
    }));
  });

  // Available chart types for this template
  const availableChartTypes = [
    { value: 'pie', label: 'Pie', icon: ChartPie, description: 'Full pie chart' },
    { value: 'arc', label: 'Donut', icon: ChartPie, description: 'Donut chart with center hole' },
    { value: 'bar', label: 'Bar', icon: ChartBar, description: 'Horizontal bars' }
  ];

  // Chart series configuration
  const series: ChartSeries[] = $derived([{
    data: chartData,
    type: chartType,
    innerRadius: chartType === 'arc' ? 30 : 0,
    outerRadius: chartType === 'pie' || chartType === 'arc' ? 100 : 80,
    colorIndex: 0
  }]);

  // Calculate statistics
  const stats = $derived.by(() => {
    const total = chartData.reduce((sum, item) => sum + item.value, 0);
    const largest = chartData.reduce((max, item) =>
      item.value > max.value ? item : max, chartData[0] || { name: '', value: 0 }
    );

    return {
      total,
      count: chartData.length,
      largest: largest?.name,
      largestValue: largest?.value || 0,
      largestPercent: largest?.percentage || 0
    };
  });
</script>

<div class="space-y-4">
  <!-- Header with title and stats -->
  <div class="flex items-center justify-between">
    <h3 class="text-lg font-semibold">{title}</h3>
    {#if stats.total > 0}
      <div class="text-sm text-muted-foreground">
        Total: <span class="font-semibold">${stats.total.toFixed(2)}</span>
        • {stats.count} categories
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

        <!-- Largest category info -->
        {#if stats.largest}
          <div class="text-muted-foreground">
            Largest: <span class="font-medium">{stats.largest}</span>
            ({stats.largestPercent.toFixed(1)}%)
          </div>
        {/if}
      </div>
    </div>
  {/if}

  <!-- Chart and Legend Layout -->
  <div class="grid {showLegend && chartData.length > 0 ? 'grid-cols-2' : 'grid-cols-1'} gap-6">
    <!-- Chart -->
    <div class={className}>
      {#if chartData.length > 0 && stats.total > 0}
        <ChartWrapper
          data={chartData}
          {series}
          {...(chartType === 'bar' && { x: 'name', y: 'value' })}
          showLeftAxis={chartType === 'bar'}
          showBottomAxis={chartType === 'bar'}
          {...(chartType !== 'bar' && { padding: { left: 0, right: 0, top: 0, bottom: 0 } })}
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

    <!-- Legend -->
    {#if showLegend && chartData.length > 0}
      <div class="space-y-2">
        <h4 class="font-medium text-sm">Categories</h4>
        <div class="space-y-2 max-h-64 overflow-y-auto">
          {#each chartData.sort((a, b) => b.value - a.value) as item}
            <div class="flex items-center justify-between text-sm">
              <div class="flex items-center gap-2 min-w-0 flex-1">
                <div
                  class="w-3 h-3 rounded-full shrink-0"
                  style="background-color: {item.color}"
                ></div>
                <span class="truncate font-medium">{item.name}</span>
              </div>
              <div class="flex items-center gap-1 shrink-0">
                <span class="font-semibold">${item.value.toFixed(0)}</span>
                <span class="text-muted-foreground">({item.percentage.toFixed(1)}%)</span>
              </div>
            </div>
          {/each}
        </div>
      </div>
    {/if}
  </div>

  <!-- Summary Statistics -->
  {#if stats.total > 0}
    <div class="flex items-center justify-center gap-8 pt-4 border-t text-sm">
      <div class="text-center">
        <div class="text-muted-foreground">Total Value</div>
        <div class="font-bold text-lg">${stats.total.toFixed(2)}</div>
      </div>
      <div class="text-center">
        <div class="text-muted-foreground">Categories</div>
        <div class="font-bold text-lg">{stats.count}</div>
      </div>
      <div class="text-center">
        <div class="text-muted-foreground">Average</div>
        <div class="font-bold text-lg">${(stats.total / stats.count).toFixed(2)}</div>
      </div>
    </div>
  {/if}
</div>
