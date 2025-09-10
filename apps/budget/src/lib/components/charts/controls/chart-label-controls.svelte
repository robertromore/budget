<script lang="ts">
import {Tag} from '$lib/components/icons';
import {Label} from '$lib/components/ui/label';
import * as Select from '$lib/components/ui/select';
import {Switch} from '$lib/components/ui/switch';
import {Slider} from '$lib/components/ui/slider';

interface Props {
  showLabels: boolean;
  labelPlacement: 'inside' | 'outside' | 'center';
  labelOffset?: number;
  labelFormat?: string;
  allowLabelChange: boolean;
}

let {
  showLabels = $bindable(),
  labelPlacement = $bindable(),
  labelOffset = $bindable(4),
  labelFormat = $bindable('currency'),
  allowLabelChange,
}: Props = $props();

const placementOptions = [
  {value: 'outside', label: 'Outside'},
  {value: 'inside', label: 'Inside'},
  {value: 'center', label: 'Center'},
];

const formatOptions = [
  {value: 'default', label: 'Default'},
  {value: 'currency', label: 'Currency'},
  {value: 'percentage', label: 'Percentage'},
  {value: 'number', label: 'Number'},
];

// Compute default offset based on placement
const defaultOffset = $derived(labelPlacement === 'center' ? 0 : 4);
</script>

{#if allowLabelChange}
  <div class="space-y-3">
    <div class="flex items-center gap-2">
      <Tag class="h-4 w-4" />
      <Label class="text-sm font-medium">Labels</Label>
    </div>

    <div class="space-y-3 pl-6">
      <!-- Show Labels Toggle -->
      <div class="flex items-center justify-between">
        <Label class="text-sm">Show Labels</Label>
        <Switch
          bind:checked={showLabels}
          class="data-[state=checked]:bg-primary"
          aria-label="Toggle chart labels visibility" />
      </div>

      {#if showLabels}
        <!-- Placement Selection -->
        <div class="space-y-2">
          <Label class="text-muted-foreground text-sm">Placement</Label>
          <Select.Root
            type="single"
            value={labelPlacement}
            onValueChange={(value) => {
              if (value) labelPlacement = value as 'inside' | 'outside' | 'center';
            }}>
            <Select.Trigger class="w-full" aria-label="Label placement">
              {placementOptions.find((p) => p.value === labelPlacement)?.label || 'Outside'}
            </Select.Trigger>
            <Select.Content>
              {#each placementOptions as option}
                <Select.Item value={option.value}>
                  {option.label}
                </Select.Item>
              {/each}
            </Select.Content>
          </Select.Root>
        </div>

        <!-- Format Selection -->
        <div class="space-y-2">
          <Label class="text-muted-foreground text-sm">Format</Label>
          <Select.Root
            type="single"
            value={labelFormat}
            onValueChange={(value) => {
              if (value) labelFormat = value;
            }}>
            <Select.Trigger class="w-full" aria-label="Label format">
              {formatOptions.find((f) => f.value === labelFormat)?.label || 'Currency'}
            </Select.Trigger>
            <Select.Content>
              {#each formatOptions as option}
                <Select.Item value={option.value}>
                  {option.label}
                </Select.Item>
              {/each}
            </Select.Content>
          </Select.Root>
        </div>

        <!-- Offset Slider -->
        <div class="space-y-2">
          <div class="flex items-center justify-between">
            <Label class="text-muted-foreground text-sm">Offset</Label>
            <span class="text-muted-foreground font-mono text-xs">
              {labelOffset}px
            </span>
          </div>
          <Slider
            type="single"
            bind:value={labelOffset}
            min={0}
            max={20}
            step={1}
            class="w-full"
            aria-label="Label offset from data point" />
          {#if labelOffset !== defaultOffset}
            <button
              type="button"
              class="text-muted-foreground hover:text-foreground text-xs transition-colors"
              onclick={() => (labelOffset = defaultOffset)}>
              Reset to default ({defaultOffset}px)
            </button>
          {/if}
        </div>
      {/if}
    </div>
  </div>
{/if}
