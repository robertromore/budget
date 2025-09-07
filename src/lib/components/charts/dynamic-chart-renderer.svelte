<script lang="ts">
  import type { ChartType } from './chart-types';
  import {
    getComponentConfig,
    validateDataCompatibility
  } from './layerchart-registry';

  interface DynamicChartRendererProps {
    chartType: ChartType;
    data: any[];
    config?: Record<string, any>;
    seriesData?: any[];
    seriesColors?: string[];
    isMultiSeries: boolean;
    class?: string;
  }

  let {
    chartType,
    data,
    config = {},
    seriesData = [],
    seriesColors = [],
    isMultiSeries,
    class: className = ""
  }: DynamicChartRendererProps = $props();

  // Get component configuration from registry
  const componentConfig = $derived.by(() => getComponentConfig(chartType));

  // Validate data compatibility
  const validation = $derived(() => validateDataCompatibility(chartType, data));

  // Prepare component props
  const componentProps = $derived(() => {
    if (!componentConfig) return {};

    const baseProps: Record<string, any> = {
      data,
      class: className,
      ...config
    };

    // Add color props if available
    if (seriesColors.length > 0) {
      if (isMultiSeries && seriesColors.length > 1) {
        // Multi-series coloring handled by parent
      } else {
        // Only set fill/stroke if not explicitly set in config
        if (config['fill'] === undefined) {
          baseProps['fill'] = seriesColors[0];
        }
        if (config['stroke'] === undefined) {
          baseProps['stroke'] = seriesColors[0];
        }
      }
    }

    return baseProps;
  });

  // Get the actual component to render
  const ComponentToRender = $derived(() => {
    const config = componentConfig;
    return config?.component || null;
  });
</script>

{#if !componentConfig}
  <div class="flex items-center justify-center h-full">
    <p class="text-muted-foreground">Unsupported chart type: {chartType}</p>
  </div>
{:else if !validation().isValid}
  <div class="flex items-center justify-center h-full">
    <div class="text-center space-y-2">
      <p class="text-destructive font-medium">Data Validation Error</p>
      {#each validation().errors as error}
        <p class="text-sm text-muted-foreground">{error}</p>
      {/each}
    </div>
  </div>
{:else if ComponentToRender()}
  {#if isMultiSeries && seriesData.length > 0}
    <!-- Multi-series rendering -->
    {#each seriesData as series, index}
      {@const seriesColor = seriesColors[index % seriesColors.length] || 'hsl(var(--chart-1))'}
      {@const seriesProps = {
        ...componentProps(),
        data: series,
        fill: ['line', 'spline'].includes(chartType) ? 'none' : seriesColor,
        stroke: seriesColor
      }}
      {@const Component = ComponentToRender()}

      {#if Component}
        <Component {...seriesProps} />
      {/if}
    {/each}
  {:else}
    <!-- Single series rendering -->
    {@const Component = ComponentToRender()}
    {#if Component}
      <Component {...componentProps()} />
    {/if}
  {/if}
{:else}
  <div class="flex items-center justify-center h-full">
    <p class="text-muted-foreground">Component not available: {chartType}</p>
  </div>
{/if}
