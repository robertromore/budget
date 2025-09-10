<script lang="ts">
  import { 
    Root as SelectRoot,
    Trigger as SelectTrigger,
    Content as SelectContent,
    Item as SelectItem,
    Label as SelectLabel,
    Value as SelectValue
  } from "bits-ui/dist/bits/select";
  import type { ChartType, ChartTypeOption } from '../config/chart-types';
  import { ALL_CHART_TYPES } from '../config/chart-types';

  interface Props {
    chartType?: ChartType;
    availableChartTypes?: ChartTypeOption[];
  }

  let { chartType = $bindable('bar'), availableChartTypes }: Props = $props();

  // Determine which chart types to show - use provided ones or all available
  const displayedChartTypes = $derived.by(() => {
    if (availableChartTypes && availableChartTypes.length > 0) {
      // Convert flat list to grouped structure for consistency
      return [{
        label: 'Available Charts',
        options: availableChartTypes
      }];
    }
    // Use all chart types if none specified
    return ALL_CHART_TYPES;
  });

  // Find the selected chart type option
  const selectedChartTypeOption = $derived.by(() => {
    for (const group of displayedChartTypes) {
      const option = group.options.find(opt => opt.value === chartType);
      if (option) return option;
    }
    return null;
  });
</script>

{#if displayedChartTypes.some(group => group.options.length > 0)}
  <div class="flex items-center gap-2">
    <span class="sr-only">Chart:</span>
    <SelectRoot
      type="single"
      bind:value={chartType}
    >
      <SelectTrigger class="w-48">
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
      </SelectTrigger>
      <SelectContent>
        {#each displayedChartTypes as group}
          {#if displayedChartTypes.length > 1}
            <SelectLabel>{group.label}</SelectLabel>
          {/if}
          {#each group.options as option}
            <SelectItem
              value={option.value}
              label={option.label}
            >
              <div class="flex items-center gap-2">
                {#if option.icon}
                  <option.icon class="h-4 w-4" />
                {/if}
                <div class="flex flex-col">
                  <span>{option.label}</span>
                  <span class="text-xs text-muted-foreground">{option.description}</span>
                </div>
              </div>
            </SelectItem>
          {/each}
        {/each}
      </SelectContent>
    </SelectRoot>
  </div>
{/if}
