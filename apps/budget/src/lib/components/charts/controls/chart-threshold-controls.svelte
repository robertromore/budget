<script lang="ts">
import {Label} from '$ui/components/ui/label';
import {Input} from '$ui/components/ui/input';
import {Switch} from '$lib/components/ui/switch';
import {Separator} from '$lib/components/ui/separator';
import * as Slider from '$lib/components/ui/slider';
import {DEFAULT_THRESHOLD_CONFIG} from '../config/chart-config';

interface ThresholdControlsProps {
  enabled: boolean;
  value: number;
  aboveColor?: string;
  belowColor?: string;
  aboveOpacity?: number;
  belowOpacity?: number;
  showLine?: boolean;
  lineOpacity?: number;
}

let {
  enabled = $bindable(DEFAULT_THRESHOLD_CONFIG.enabled),
  value = $bindable(DEFAULT_THRESHOLD_CONFIG.value),
  aboveColor = $bindable(DEFAULT_THRESHOLD_CONFIG.aboveColor),
  belowColor = $bindable(DEFAULT_THRESHOLD_CONFIG.belowColor),
  aboveOpacity = $bindable(DEFAULT_THRESHOLD_CONFIG.aboveOpacity),
  belowOpacity = $bindable(DEFAULT_THRESHOLD_CONFIG.belowOpacity),
  showLine = $bindable(DEFAULT_THRESHOLD_CONFIG.showLine),
  lineOpacity = $bindable(DEFAULT_THRESHOLD_CONFIG.lineOpacity),
}: ThresholdControlsProps = $props();

// Slider arrays for binding (ensuring they have proper values)
let aboveOpacityArray = $state([aboveOpacity ?? DEFAULT_THRESHOLD_CONFIG.aboveOpacity]);
let belowOpacityArray = $state([belowOpacity ?? DEFAULT_THRESHOLD_CONFIG.belowOpacity]);
let lineOpacityArray = $state([lineOpacity ?? DEFAULT_THRESHOLD_CONFIG.lineOpacity]);

// Update props when slider arrays change
$effect(() => {
  aboveOpacity = aboveOpacityArray[0] ?? DEFAULT_THRESHOLD_CONFIG.aboveOpacity;
});

$effect(() => {
  belowOpacity = belowOpacityArray[0] ?? DEFAULT_THRESHOLD_CONFIG.belowOpacity;
});

$effect(() => {
  lineOpacity = lineOpacityArray[0] ?? DEFAULT_THRESHOLD_CONFIG.lineOpacity;
});
</script>

<div class="space-y-4">
  <div class="flex items-center justify-between">
    <Label for="threshold-enabled">Enable Threshold</Label>
    <Switch id="threshold-enabled" bind:checked={enabled} />
  </div>

  {#if enabled}
    <Separator />

    <div class="space-y-3">
      <div class="space-y-2">
        <Label for="threshold-value">Threshold Value</Label>
        <Input id="threshold-value" type="number" bind:value step="0.01" class="h-8" />
      </div>

      <div class="space-y-2">
        <Label for="above-opacity">Above Threshold Opacity</Label>
        <Slider.Root bind:value={aboveOpacityArray} min={0} max={1} step={0.1} class="w-full" />
        <span class="text-muted-foreground text-xs">
          Opacity: {(aboveOpacity ?? DEFAULT_THRESHOLD_CONFIG.aboveOpacity).toFixed(1)}
        </span>
      </div>

      <div class="space-y-2">
        <Label for="below-opacity">Below Threshold Opacity</Label>
        <Slider.Root bind:value={belowOpacityArray} min={0} max={1} step={0.1} class="w-full" />
        <span class="text-muted-foreground text-xs">
          Opacity: {(belowOpacity ?? DEFAULT_THRESHOLD_CONFIG.belowOpacity).toFixed(1)}
        </span>
      </div>

      <Separator />

      <div class="space-y-2">
        <div class="flex items-center justify-between">
          <Label for="threshold-line">Show Threshold Line</Label>
          <Switch id="threshold-line" bind:checked={showLine} />
        </div>

        {#if showLine}
          <div class="space-y-2">
            <Label for="line-opacity" class="text-xs">Line Opacity</Label>
            <Slider.Root bind:value={lineOpacityArray} min={0} max={1} step={0.1} class="w-full" />
            <span class="text-muted-foreground text-xs">
              Opacity: {(lineOpacity ?? DEFAULT_THRESHOLD_CONFIG.lineOpacity).toFixed(1)}
            </span>
          </div>
        {/if}
      </div>
    </div>
  {/if}
</div>
