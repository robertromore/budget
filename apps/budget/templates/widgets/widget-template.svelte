<script lang="ts">
  import { Chart, Svg, Area, Spline, Bars, Arc } from '@layerchart-wrapper/charts';
  import type { WidgetProps, ChartType } from '$lib/types/widgets';
  import { colorUtils } from '@budget-shared/utils';
  import WidgetCard from './widget-card.svelte';

  let { config, data, onUpdate, onRemove, editMode = false }: WidgetProps = $props();

  // TODO: Replace with your data extraction logic
  const widgetData = data?.['{{DATA_KEY}}'] ?? [];
  const period = $derived(config.settings?.['period'] ?? 'month');
  const chartType = $derived(config.settings?.['chartType'] ?? '{{DEFAULT_CHART_TYPE}}');

  // Debug logging - remove in production
  $effect(() => {
    console.log('[{{WIDGET_NAME}}] Data prepared:', {
      dataLength: widgetData.length,
      chartType,
      config: config.settings
    });
  });

  // TODO: Implement your data transformation logic
  const processedData = $derived.by(() => {
    // Transform raw data into chart-ready format
    return widgetData.map((item: any, index: number) => ({
      // TODO: Map your data fields
      name: item.name || `Item ${index + 1}`,
      value: item.value || 0,
      // Add colors for pie/arc charts
      color: item.color || colorUtils.getChartColor(index)
    }));
  });

  // TODO: Configure chart series based on chart type
  const series = $derived([{
    data: processedData,
    type: chartType as ChartType,
    // Configure chart-specific properties
    ...(chartType === 'pie' || chartType === 'arc' ? {
      innerRadius: chartType === 'arc' ? 30 : 0,
      outerRadius: 80
    } : {}),
    colorIndex: 0
  }]);

  // TODO: Calculate summary statistics
  const totalValue = $derived(processedData.reduce((sum: number, item: any) => sum + item.value, 0));
  const itemCount = $derived(processedData.length);
</script>

<WidgetCard 
  {config} 
  {data} 
  {editMode}
  {...(onUpdate && { onUpdate })}
  {...(onRemove && { onRemove })}
>
  <div class="space-y-3">
    <div class="flex items-center justify-between">
      <div class="text-sm font-medium text-muted-foreground">{config.title}</div>
      <div class="text-xs text-muted-foreground capitalize">{period}</div>
    </div>

    {#if processedData.length > 0 && totalValue > 0}
      {#if config.size === 'small'}
        <!-- Small: Chart only with summary -->
        <div class="h-32 w-32 mx-auto">
          <Chart data={processedData} x="name" y="value" class="h-full w-full">
            <Svg>
              {#if chartType === 'bar'}
                <Bars {processedData} />
              {:else if chartType === 'area'}
                <Area {processedData} />
              {:else if chartType === 'pie' || chartType === 'arc'}
                <Arc {processedData} />
              {:else}
                <Spline {processedData} />
              {/if}
            </Svg>
          </Chart>
        </div>
        <div class="text-center text-xs text-muted-foreground">
          {itemCount} items • ${totalValue.toFixed(2)} total
        </div>
      {:else if config.size === 'medium'}
        <!-- Medium: Chart with compact legend below -->
        <div class="space-y-3">
          <div class="h-40 w-40 mx-auto">
            <Chart data={processedData} x="name" y="value" class="h-full w-full">
              <Svg>
                {#if chartType === 'bar'}
                  <Bars {processedData} />
                {:else if chartType === 'area'}
                  <Area {processedData} />
                {:else if chartType === 'pie' || chartType === 'arc'}
                  <Arc {processedData} />
                {:else}
                  <Spline {processedData} />
                {/if}
              </Svg>
            </Chart>
          </div>

          <div class="space-y-2">
            <div class="text-xs font-medium text-muted-foreground text-center">
              Total: ${totalValue.toFixed(2)}
            </div>
            <div class="grid grid-cols-2 gap-1 text-xs">
              {#each processedData.slice(0, 4) as item, i}
                <div class="flex items-center gap-1">
                  <div
                    class="w-2 h-2 rounded-full flex-shrink-0"
                    style="background-color: {item.color}"
                  ></div>
                  <span class="truncate text-xs">{item.name}</span>
                </div>
              {/each}
            </div>
            {#if processedData.length > 4}
              <div class="text-xs text-muted-foreground text-center">
                +{processedData.length - 4} more
              </div>
            {/if}
          </div>
        </div>
      {:else}
        <!-- Large: Side-by-side layout -->
        <div class="grid grid-cols-2 gap-4">
          <div class="h-48 w-48">
            <ChartWrapper
              data={processedData}
              {series}
              {...(chartType === 'bar' && { x: 'name', y: 'value' })}
              showLeftAxis={chartType === 'bar'}
              showBottomAxis={chartType === 'bar'}
              {...(chartType !== 'bar' && { padding: { left: 0, right: 0, top: 0, bottom: 0 } })}
              class="h-full w-full"
            />
          </div>

          <div class="space-y-2">
            <div class="text-xs font-medium text-muted-foreground">
              Total: ${totalValue.toFixed(2)}
            </div>

            <div class="space-y-1 max-h-40 overflow-y-auto">
              {#each processedData.slice(0, 8) as item, i}
                <div class="flex items-center justify-between text-xs">
                  <div class="flex items-center gap-2 min-w-0 flex-1">
                    <div
                      class="w-2 h-2 rounded-full flex-shrink-0"
                      style="background-color: {item.color}"
                    ></div>
                    <span class="truncate font-medium">{item.name}</span>
                  </div>
                  <div class="flex items-center gap-1 flex-shrink-0">
                    <span class="font-semibold">${item.value.toFixed(0)}</span>
                    <span class="text-muted-foreground">({((item.value / totalValue) * 100).toFixed(1)}%)</span>
                  </div>
                </div>
              {/each}
            </div>

            {#if processedData.length > 8}
              <div class="text-xs text-muted-foreground text-center pt-1 border-t">
                +{processedData.length - 8} more
              </div>
            {/if}
          </div>
        </div>
      {/if}
    {:else}
      <div class="text-center py-8 text-muted-foreground">
        <div class="text-sm">No data available</div>
      </div>
    {/if}
  </div>
</WidgetCard>