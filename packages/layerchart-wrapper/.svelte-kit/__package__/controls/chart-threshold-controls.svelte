<script lang="ts">
  import { Label }  from "bits-ui";
  import { Separator }  from "bits-ui";
  import * as Slider  from "bits-ui";
  import { Switch }  from "bits-ui";
  import { DEFAULT_THRESHOLD_CONFIG } from '../config/chart-config';

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
    lineOpacity = $bindable(DEFAULT_THRESHOLD_CONFIG.lineOpacity)
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
    <Switch
      id="threshold-enabled"
      bind:checked={enabled}
    />
  </div>

  {#if enabled}
    <Separator />

    <div class="space-y-3">
      <div class="space-y-2">
        <Label for="threshold-value">Threshold Value</Label>
        <input
          id="threshold-value"
          type="number"
          bind:value
          step="0.01"
          class="flex h-8 w-full rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        />
      </div>

      <div class="space-y-2">
        <Label for="above-opacity">Above Threshold Opacity</Label>
        <Slider.Root
          type="multiple"
          bind:value={aboveOpacityArray}
          min={0}
          max={1}
          step={0.1}
          class="w-full"
        />
        <span class="text-xs text-muted-foreground">
          Opacity: {(aboveOpacity ?? DEFAULT_THRESHOLD_CONFIG.aboveOpacity).toFixed(1)}
        </span>
      </div>

      <div class="space-y-2">
        <Label for="below-opacity">Below Threshold Opacity</Label>
        <Slider.Root
          type="multiple"
          bind:value={belowOpacityArray}
          min={0}
          max={1}
          step={0.1}
          class="w-full"
        />
        <span class="text-xs text-muted-foreground">
          Opacity: {(belowOpacity ?? DEFAULT_THRESHOLD_CONFIG.belowOpacity).toFixed(1)}
        </span>
      </div>

      <Separator />

      <div class="space-y-2">
        <div class="flex items-center justify-between">
          <Label for="threshold-line">Show Threshold Line</Label>
          <Switch
            id="threshold-line"
            bind:checked={showLine}
          />
        </div>

        {#if showLine}
          <div class="space-y-2">
            <Label for="line-opacity" class="text-xs">Line Opacity</Label>
            <Slider.Root
              type="multiple"
              bind:value={lineOpacityArray}
              min={0}
              max={1}
              step={0.1}
              class="w-full"
            />
            <span class="text-xs text-muted-foreground">
              Opacity: {(lineOpacity ?? DEFAULT_THRESHOLD_CONFIG.lineOpacity).toFixed(1)}
            </span>
          </div>
        {/if}
      </div>
    </div>
  {/if}
</div>
