<script lang="ts">
  import type { WidgetProps } from '$lib/types/widgets';
  import WidgetCard from './widget-card.svelte';
  import { ChartContainer, type ChartConfig } from '$lib/components/ui/chart';
  import { Chart, Svg, Arc } from 'layerchart';
  import { colorUtils } from '$lib/utils/colors';

  let { config, data, onUpdate, onRemove, editMode = false }: WidgetProps = $props();
  
  const categoryData = data?.categoryBreakdown ?? [];
  const period = config.settings?.period ?? 'month';
  
  // Prepare chart configuration with dynamic colors
  const chartConfig: ChartConfig = categoryData.reduce((acc, category, index) => {
    acc[category.name] = {
      label: category.name,
      color: category.color || colorUtils.getChartColor(index)
    };
    return acc;
  }, {} as ChartConfig);

  // Calculate total and percentages
  const totalAmount = categoryData.reduce((sum, cat) => sum + cat.amount, 0);
  const categoriesWithPercentage = categoryData.map(cat => ({
    ...cat,
    percentage: totalAmount > 0 ? (cat.amount / totalAmount) * 100 : 0
  }));

  // Prepare data for pie chart
  const pieData = categoriesWithPercentage.map((cat, index) => ({
    name: cat.name,
    value: cat.amount,
    percentage: cat.percentage,
    color: cat.color || colorUtils.getChartColor(index)
  }));

</script>

<WidgetCard {config} {data} {onUpdate} {onRemove} {editMode}>
  <div class="space-y-3">
    <div class="flex items-center justify-between">
      <div class="text-sm font-medium text-muted-foreground">{config.title}</div>
      <div class="text-xs text-muted-foreground capitalize">{period}</div>
    </div>

    {#if pieData.length > 0 && totalAmount > 0}
      {#if config.size === 'small'}
        <!-- Small: Chart only with summary -->
        <div class="h-16 w-16 mx-auto flex items-center justify-center">
          <ChartContainer config={chartConfig} class="h-full w-full">
            <Chart data={pieData} r="value">
              <Svg>
                <Arc 
                  startAngle={-90}
                  padAngle={0}
                  class="fill-primary"
                />
              </Svg>
            </Chart>
          </ChartContainer>
        </div>
        <div class="text-center text-xs text-muted-foreground">
          {categoriesWithPercentage.length} categories • ${totalAmount.toFixed(2)} total
        </div>
      {:else if config.size === 'medium'}
        <!-- Medium: Chart with compact legend below -->
        <div class="space-y-3">
          <div class="h-20 w-20 mx-auto flex items-center justify-center">
            <ChartContainer config={chartConfig} class="h-full w-full">
              <Chart data={pieData} r="value">
                <Svg>
                  <Arc 
                    startAngle={-90}
                    padAngle={0}
                    class="fill-primary"
                  />
                </Svg>
              </Chart>
            </ChartContainer>
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
          <div class="h-28 w-28 flex items-center justify-center">
            <ChartContainer config={chartConfig} class="h-full w-full">
              <Chart data={pieData} r="value">
                <Svg>
                  <Arc 
                    startAngle={-90}
                    padAngle={0}
                    class="fill-primary"
                  />
                </Svg>
              </Chart>
            </ChartContainer>
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