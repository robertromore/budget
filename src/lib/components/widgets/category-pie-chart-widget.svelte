<script lang="ts">
  import { UnifiedChart } from '$lib/components/charts';
  import { transformData } from '$lib/utils/chart-data';
  import type { WidgetProps } from '$lib/types/widgets';
  import type { ChartType } from '$lib/components/charts/config/chart-types';
  import { colorUtils } from '$lib/utils/colors';
  import WidgetCard from './widget-card.svelte';

  let { config, data, onUpdate, onRemove, editMode = false }: WidgetProps = $props();

  const categoryData = data?.['categoryBreakdown'] ?? [];
  const period = $derived(config.settings?.['period'] ?? 'month');
  const chartType = $derived((config.settings?.['chartType'] ?? 'pie') as ChartType);

  // Calculate total and percentages
  const totalAmount = categoryData.reduce((sum: number, cat: any) => sum + cat.amount, 0);
  const categoriesWithPercentage = categoryData.map((cat: any) => ({
    ...cat,
    percentage: totalAmount > 0 ? (cat.amount / totalAmount) * 100 : 0
  }));

  // Transform data to ChartDataPoint format
  const chartData = $derived(
    transformData(categoriesWithPercentage, {
      x: 'name',
      y: 'amount',
      category: 'name'
    }).map((point, index) => ({
      ...point,
      metadata: {
        ...point.metadata,
        percentage: categoriesWithPercentage[index]?.percentage || 0,
        color: categoriesWithPercentage[index]?.color || colorUtils.getChartColor(index)
      }
    }))
  );

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
          <UnifiedChart
            data={chartData}
            type={chartType}
            styling={{
              colors: 'auto',
              legend: { show: false },
              dimensions: { padding: { top: 5, right: 5, bottom: 5, left: 5 } }
            }}
            axes={{
              x: { show: chartType === 'bar' },
              y: { show: chartType === 'bar' }
            }}
            controls={{
              show: false
            }}
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
            <UnifiedChart
              data={chartData}
              type={chartType}
              styling={{
                colors: 'auto',
                legend: { show: false },
                dimensions: { padding: { top: 10, right: 10, bottom: 10, left: 10 } }
              }}
              axes={{
                x: { show: chartType === 'bar' },
                y: { show: chartType === 'bar' }
              }}
              controls={{
                show: false
              }}
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
            <UnifiedChart
              data={chartData}
              type={chartType}
              styling={{
                colors: 'auto',
                legend: { show: false },
                dimensions: { padding: { top: 20, right: 20, bottom: 20, left: 20 } }
              }}
              axes={{
                x: { show: chartType === 'bar' },
                y: { show: chartType === 'bar', nice: true }
              }}
              controls={{
                show: false
              }}
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
