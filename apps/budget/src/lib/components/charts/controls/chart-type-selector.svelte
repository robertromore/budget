<script lang="ts">
import * as Select from '$lib/components/ui/select';
import type {ChartType, ChartTypeOption} from '../config/chart-types';
import {ALL_CHART_TYPES} from '../config/chart-types';

interface Props {
  chartType?: ChartType;
  availableChartTypes?: ChartTypeOption[];
}

let {chartType = $bindable('bar'), availableChartTypes}: Props = $props();

// Determine which chart types to show - use provided ones or all available
const displayedChartTypes = $derived.by(() => {
  if (availableChartTypes && availableChartTypes.length > 0) {
    // Convert flat list to grouped structure for consistency
    return [
      {
        label: 'Available Charts',
        options: availableChartTypes,
      },
    ];
  }
  // Use all chart types if none specified
  return ALL_CHART_TYPES;
});

// Find the selected chart type option
const selectedChartTypeOption = $derived.by(() => {
  for (const group of displayedChartTypes) {
    const option = group.options.find((opt) => opt.value === chartType);
    if (option) return option;
  }
  return null;
});
</script>

{#if displayedChartTypes.some((group) => group.options.length > 0)}
  <div class="flex items-center gap-2">
    <span class="sr-only">Chart:</span>
    <Select.Root type="single" bind:value={chartType}>
      <Select.Trigger class="w-48">
        <div class="flex items-center gap-2">
          {#if selectedChartTypeOption}
            {@const option = selectedChartTypeOption!}
            {#if option.icon}
              <option.icon class="h-4 w-4" />
            {/if}
            <span>{option.label}</span>
          {:else}
            <span>Select a chart</span>
          {/if}
        </div>
      </Select.Trigger>
      <Select.Content>
        {#each displayedChartTypes as group}
          {#if displayedChartTypes.length > 1}
            <Select.Label>{group.label}</Select.Label>
          {/if}
          {#each group.options as option}
            <Select.Item value={option.value} label={option.label}>
              <div class="flex items-center gap-2">
                {#if option.icon}
                  <option.icon class="h-4 w-4" />
                {/if}
                <div class="flex flex-col">
                  <span>{option.label}</span>
                  <span class="text-muted-foreground text-xs">{option.description}</span>
                </div>
              </div>
            </Select.Item>
          {/each}
        {/each}
      </Select.Content>
    </Select.Root>
  </div>
{/if}
