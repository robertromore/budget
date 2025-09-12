<script lang="ts">
import * as Select from '$lib/components/ui/select';

export type ViewModeOption = 'combined' | 'side-by-side' | 'stacked' | 'overlaid';

interface ViewModeConfig {
  value: ViewModeOption;
  label: string;
  description: string;
}

interface Props {
  viewMode: ViewModeOption;
  availableViewModes?: ViewModeOption[];
  showDescription?: boolean;
}

let {
  viewMode = $bindable('combined'),
  availableViewModes = ['combined', 'side-by-side'],
  showDescription = false,
}: Props = $props();

// All possible view mode configurations
const viewModeConfigs: Record<ViewModeOption, ViewModeConfig> = {
  combined: {
    value: 'combined',
    label: 'Combined',
    description: 'Show all series in a single chart',
  },
  'side-by-side': {
    value: 'side-by-side',
    label: 'Side by Side',
    description: 'Show each series in separate charts',
  },
  stacked: {
    value: 'stacked',
    label: 'Stacked',
    description: 'Stack series on top of each other',
  },
  overlaid: {
    value: 'overlaid',
    label: 'Overlaid',
    description: 'Overlay series with transparency',
  },
};

// Filter available view modes based on props
const availableConfigs = $derived.by(() => 
  availableViewModes.map((mode) => viewModeConfigs[mode]).filter(Boolean)
);

const selectedViewModeConfig = $derived.by(() => viewModeConfigs[viewMode] || viewModeConfigs.combined);
</script>

{#if availableConfigs.length > 1}
  <div class="flex items-center gap-2">
    <label for="view-mode-selector" class="text-sm font-medium">View:</label>
    <Select.Root type="single" bind:value={viewMode}>
      <Select.Trigger class="w-[140px]">
        <div class="flex items-center gap-2">
          <span>{selectedViewModeConfig.label}</span>
        </div>
      </Select.Trigger>
      <Select.Content>
        {#each availableConfigs as config}
          <Select.Item value={config.value}>
            <div class="flex flex-col">
              <span>{config.label}</span>
              {#if showDescription}
                <span class="text-muted-foreground text-xs">{config.description}</span>
              {/if}
            </div>
          </Select.Item>
        {/each}
      </Select.Content>
    </Select.Root>
  </div>
{/if}
