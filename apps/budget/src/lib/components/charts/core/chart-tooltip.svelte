<!--
  @component ChartTooltip
  Reusable tooltip component for all chart types in the unified chart system.
  Eliminates code duplication by providing a single, configurable tooltip implementation.

  Features:
  - Automatic single/multi-series detection
  - Smart formatting (currency, percentage, number)
  - Custom content support
  - Total calculation for multi-series
  - Theme-consistent styling
  - LayerChart integration
-->
<script lang="ts">
import {chartFormatters} from '$lib/utils/chart-formatters';
import {Tooltip, getChartContext} from 'layerchart';
import type {TooltipConfig, ChartDataPoint} from '../config/chart-config';

interface ChartTooltipProps {
  // Core configuration
  config: TooltipConfig;

  // Data context
  label?: string; // Optional label for single-series tooltips
  colors: string[]; // Color palette for series

  // View mode context (for side-by-side charts)
  viewModeLabel?: string; // e.g., "Income" or "Expenses" for split view
}

let {
  config = {enabled: true},
  label = 'Value',
  colors = [],
  viewModeLabel,
}: ChartTooltipProps = $props();

// Determine formatter function based on config
const formatValue = $derived.by(() => {
  if (!config.format || config.format === 'default') {
    return (value: number) => String(value);
  }

  if (typeof config.format === 'function') {
    const formatFn = config.format as (dataPoint: ChartDataPoint) => string;
    return (value: number, data?: any) => {
      // Pass the full data point to custom formatter
      if (data && typeof data === 'object') {
        return formatFn({...data, y: value});
      }
      return formatFn({x: 0, y: value});
    };
  }

  // Use predefined formatters
  switch (config.format) {
    case 'currency':
      return chartFormatters.currencyPrecise;
    case 'percentage':
      return chartFormatters.percentage;
    default:
      return chartFormatters.number;
  }
});

// Format date/time values for header
function formatHeader(xValue: any): string {
  if (!xValue) return '';

  if (xValue instanceof Date) {
    return xValue.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }

  // Handle string dates
  if (typeof xValue === 'string') {
    // Try to parse as date
    const dateAttempt = new Date(xValue);
    if (!isNaN(dateAttempt.getTime()) && xValue.includes('-')) {
      return dateAttempt.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    }
  }

  return String(xValue);
}

// Helper to extract value from various data structures
function extractValue(item: any): number {
  if (typeof item === 'number') return item;

  // Check for common value properties
  if (item?.value !== undefined) return item.value;
  if (item?.payload?.y !== undefined) return item.payload.y;
  if (item?.payload?.value !== undefined) return item.payload.value;
  if (item?.y !== undefined) return item.y;
  if (item?.amount !== undefined) return item.amount;

  return 0;
}

// Helper to extract label from various data structures
function extractLabel(item: any, index: number): string {
  if (item?.label) return item.label;
  if (item?.name) return item.name;
  if (item?.key) return item.key;
  if (item?.series) return item.series;
  if (item?.category) return item.category;

  // For view mode, use the provided label
  if (viewModeLabel) return viewModeLabel;

  return label || `Series ${index + 1}`;
}

// Helper to get color for an item
function getItemColor(item: any, index: number): string {
  if (item?.color) return item.color;
  return colors[index] || colors[0] || 'hsl(var(--chart-1))';
}

// Get LayerChart context for tooltip
const context = getChartContext();
</script>

{#if config.enabled !== false}
  <Tooltip.Root
    {context}
    x={config.position || 'pointer'}
    y={config.position || 'pointer'}
    {...config.xOffset !== undefined ? {xOffset: config.xOffset} : {}}
    {...config.yOffset !== undefined ? {yOffset: config.yOffset} : {}}
    {...config.anchor ? {anchor: config.anchor} : {}}
    {...config.variant ? {variant: config.variant} : {}}
    classes={{
      root: 'bg-background/95 backdrop-blur-sm border shadow-lg rounded-md px-3 py-2',
      content: 'text-sm',
      header: 'font-semibold mb-1',
    }}>
    {#snippet children({data, payload}: {data: any; payload: any[]})}
      {#if config.customContent && typeof config.customContent === 'function'}
        <!-- Custom tooltip content -->
        {@html config.customContent(data, payload || [])}
      {:else}
        <!-- Default tooltip content -->
        <Tooltip.Header>
          {formatHeader(data?.x)}
        </Tooltip.Header>

        <Tooltip.List>
          {#if payload && payload.length > 0}
            <!-- Multi-series tooltip -->
            {#each payload as item, index}
              {@const value = extractValue(item)}
              {@const itemLabel = extractLabel(item, index)}
              {@const itemColor = getItemColor(item, index)}

              <Tooltip.Item
                label={itemLabel}
                value={formatValue(value, item)}
                color={itemColor} />
            {/each}

            <!-- Show total for multi-series if configured -->
            {#if config.showTotal && payload.length > 1}
              {@const total = payload.reduce((sum: number, item: any) => {
                const val = extractValue(item);
                return sum + (typeof val === 'number' ? val : 0);
              }, 0)}

              <Tooltip.Separator />
              <Tooltip.Item label="Total" value={formatValue(total)} class="font-semibold" />
            {/if}
          {:else if data}
            <!-- Single series tooltip -->
            {@const value = extractValue(data)}
            {@const itemLabel = viewModeLabel || label || 'Value'}
            {@const itemColor = data.color || colors[0] || 'hsl(var(--chart-1))'}

              <Tooltip.Item label={itemLabel} value={formatValue(value, data)} color={itemColor} />
            {/if}
          {/if}
        </Tooltip.List>
      {/if}
    {/snippet}
  </Tooltip.Root>
{/if}
