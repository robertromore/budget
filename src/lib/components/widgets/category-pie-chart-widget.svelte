<script lang="ts">
  import { ChartWrapper } from '$lib/components/charts';
  import type { WidgetProps, ChartType } from '$lib/types/widgets';
  import { colorUtils } from '$lib/utils/colors';
  import WidgetCard from './widget-card.svelte';

  let { config, data, onUpdate, onRemove, editMode = false }: WidgetProps = $props();

  const categoryData = data?.['categoryBreakdown'] ?? [];
  const period = $derived(config.settings?.['period'] ?? 'month');
  const chartType = $derived(config.settings?.['chartType'] ?? 'pie');

  // Debug logging to see what data we're getting
  $effect(() => {
    console.log('[Category Pie Chart] Chart data prepared:', {
      categoryData: categoryData.length,
      chartType,
      totalAmount,
      chartData: chartData.length,
      series: series.length,
      seriesData: series[0]?.data?.length
    });
  });

  // Calculate total and percentages
  const totalAmount = categoryData.reduce((sum: number, cat: any) => sum + cat.amount, 0);
  const categoriesWithPercentage = categoryData.map((cat: any) => ({
    ...cat,
    percentage: totalAmount > 0 ? (cat.amount / totalAmount) * 100 : 0
  }));

  // Prepare chart data based on chart type
  const chartData = $derived(categoriesWithPercentage.map((cat: any, index: number) => {
    if (chartType === 'bar') {
      return { x: cat.name, y: cat.amount };
    }
    // LayerChart Pie component expects just 'value' and 'color' properties
    return {
      value: cat.amount,
      color: cat.color || colorUtils.getChartColor(index),
      // Keep additional data in metadata for tooltips/legends
      metadata: {
        name: cat.name,
        percentage: cat.percentage
      }
    };
  }));

  // Create series configuration
  const series = $derived([{
    data: chartData,
    type: chartType as ChartType,
    innerRadius: chartType === 'arc' ? 30 : 0,
    outerRadius: chartType === 'pie' || chartType === 'arc' ? 80 : 100,
    colorIndex: 0
  }]);

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

    {#if chartData.length > 0 && totalAmount > 0}
      {#if config.size === 'small'}
        <!-- Small: Chart only with summary -->
        <div class="h-32 w-32 mx-auto">
          <ChartWrapper
            data={chartData}
            {series}
            {...(chartType === 'bar' && { x: 'x', y: 'y' })}
            showLeftAxis={chartType === 'bar'}
            showBottomAxis={chartType === 'bar'}
            {...(chartType !== 'bar' && { padding: { left: 0, right: 0, top: 0, bottom: 0 } })}
            class="h-full w-full"
          />
        </div>
        <div class="text-center text-xs text-muted-foreground">
          {categoriesWithPercentage.length} categories • ${totalAmount.toFixed(2)} total
        </div>
      {:else if config.size === 'medium'}
        <!-- Medium: Chart with compact legend below -->
        <div class="space-y-3">
          <div class="h-40 w-40 mx-auto">
            <ChartWrapper
              data={chartData}
              {series}
              {...(chartType === 'bar' && { x: 'x', y: 'y' })}
              showLeftAxis={chartType === 'bar'}
              showBottomAxis={chartType === 'bar'}
              {...(chartType !== 'bar' && { padding: { left: 0, right: 0, top: 0, bottom: 0 } })}
              class="h-full w-full"
            />
          </div>

          <div class="space-y-2">
            <div class="text-xs font-medium text-muted-foreground text-center">
              Total: ${totalAmount.toFixed(2)}
            </div>
            <div class="grid grid-cols-2 gap-1 text-xs">
              {#each categoriesWithPercentage.slice(0, 4) as category, i}
                <div class="flex items-center gap-1">
                  <div
                    class="w-2 h-2 rounded-full flex-shrink-0"
                    style="background-color: {category.color || colorUtils.getChartColor(i)}"
                  ></div>
                  <span class="truncate text-xs">{category.name}</span>
                </div>
              {/each}
            </div>
            {#if categoriesWithPercentage.length > 4}
              <div class="text-xs text-muted-foreground text-center">
                +{categoriesWithPercentage.length - 4} more
              </div>
            {/if}
          </div>
        </div>
      {:else}
        <!-- Large: Side-by-side layout -->
        <div class="grid grid-cols-2 gap-4">
          <div class="h-48 w-48">
            <ChartWrapper
              data={chartData}
              {series}
              {...(chartType === 'bar' && { x: 'x', y: 'y' })}
              showLeftAxis={chartType === 'bar'}
              showBottomAxis={chartType === 'bar'}
              {...(chartType !== 'bar' && { padding: { left: 0, right: 0, top: 0, bottom: 0 } })}
              class="h-full w-full"
            />
          </div>

          <div class="space-y-2">
            <div class="text-xs font-medium text-muted-foreground">
              Total: ${totalAmount.toFixed(2)}
            </div>

            <div class="space-y-1 max-h-40 overflow-y-auto">
              {#each categoriesWithPercentage.slice(0, 8) as category, i}
                <div class="flex items-center justify-between text-xs">
                  <div class="flex items-center gap-2 min-w-0 flex-1">
                    <div
                      class="w-2 h-2 rounded-full flex-shrink-0"
                      style="background-color: {category.color || colorUtils.getChartColor(i)}"
                    ></div>
                    <span class="truncate font-medium">{category.name}</span>
                  </div>
                  <div class="flex items-center gap-1 flex-shrink-0">
                    <span class="font-semibold">${category.amount.toFixed(0)}</span>
                    <span class="text-muted-foreground">({category.percentage.toFixed(1)}%)</span>
                  </div>
                </div>
              {/each}
            </div>

            {#if categoriesWithPercentage.length > 8}
              <div class="text-xs text-muted-foreground text-center pt-1 border-t">
                +{categoriesWithPercentage.length - 8} more
              </div>
            {/if}
          </div>
        </div>
      {/if}
    {:else}
      <div class="text-center py-8 text-muted-foreground">
        <div class="text-sm">No category data available</div>
      </div>
    {/if}
  </div>
</WidgetCard>
