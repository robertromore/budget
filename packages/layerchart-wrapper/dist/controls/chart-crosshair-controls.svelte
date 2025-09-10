<script lang="ts">
  import { Crosshair } from '@lucide/svelte';
  import * as Select from "bits-ui";
  import { Label, Slider, Switch } from "bits-ui";

  interface Props {
    showCrosshair: boolean;
    crosshairAxis: 'x' | 'y' | 'both' | 'none';
    crosshairStyle: 'solid' | 'dashed' | 'dotted';
    crosshairOpacity: number;
    allowCrosshairChange?: boolean;
    calculatedOpacity?: number; // Show the accessibility-aware calculated opacity
  }

  let {
    showCrosshair = $bindable(true),
    crosshairAxis = $bindable('both'),
    crosshairStyle = $bindable('solid'),
    crosshairOpacity = $bindable(0.6),
    allowCrosshairChange = true,
    calculatedOpacity
  }: Props = $props();

  const axisOptions = [
    { value: 'both', label: 'Both Lines', description: 'Vertical and horizontal' },
    { value: 'x', label: 'Vertical Only', description: 'X-axis crosshair' },
    { value: 'y', label: 'Horizontal Only', description: 'Y-axis crosshair' },
    { value: 'none', label: 'None', description: 'No crosshair lines' }
  ];

  const styleOptions = [
    { value: 'solid', label: 'Solid', description: 'Solid line' },
    { value: 'dashed', label: 'Dashed', description: 'Dashed line' },
    { value: 'dotted', label: 'Dotted', description: 'Dotted line' }
  ];

  const selectedAxisOption = $derived.by(() =>
    axisOptions.find(option => option.value === crosshairAxis) || axisOptions[0]
  );

  const selectedStyleOption = $derived.by(() =>
    styleOptions.find(option => option.value === crosshairStyle) || styleOptions[0]
  );
</script>

{#if allowCrosshairChange}
  <div class="space-y-3">
    <div class="flex items-center gap-2">
      <Crosshair class="h-4 w-4" />
      <Label class="text-sm font-medium">Crosshair</Label>
    </div>

    <div class="space-y-3 pl-6">
      <!-- Enable Crosshair Toggle -->
      <div class="flex items-center justify-between">
        <Label class="text-sm">Show Crosshair</Label>
        <Switch bind:checked={showCrosshair} />
      </div>

      {#if showCrosshair}
        <!-- Crosshair Axis Selection -->
        <div class="space-y-2">
          <Label class="text-sm text-muted-foreground">Crosshair Type</Label>
          <Select.Root type="single" bind:value={crosshairAxis}>
            <Select.Trigger class="w-full">
              <div class="flex items-center justify-between w-full">
                <span>{selectedAxisOption?.label}</span>
                <span class="text-xs text-muted-foreground">
                  {selectedAxisOption?.description}
                </span>
              </div>
            </Select.Trigger>
            <Select.Content>
              {#each axisOptions as option}
                <Select.Item value={option.value}>
                  <div class="flex flex-col">
                    <span>{option.label}</span>
                    <span class="text-xs text-muted-foreground">{option.description}</span>
                  </div>
                </Select.Item>
              {/each}
            </Select.Content>
          </Select.Root>
        </div>

        <!-- Crosshair Style Selection -->
        <div class="space-y-2">
          <Label class="text-sm text-muted-foreground">Line Style</Label>
          <Select.Root type="single" bind:value={crosshairStyle}>
            <Select.Trigger class="w-full">
              <div class="flex items-center justify-between w-full">
                <span>{selectedStyleOption?.label}</span>
                <span class="text-xs text-muted-foreground">
                  {selectedStyleOption?.description}
                </span>
              </div>
            </Select.Trigger>
            <Select.Content>
              {#each styleOptions as option}
                <Select.Item value={option.value}>
                  <div class="flex items-center justify-between w-full">
                    <span>{option.label}</span>
                    {#if option.value === 'solid'}
                      <div class="ml-2 w-8 h-0.5 bg-current"></div>
                    {:else if option.value === 'dashed'}
                      <div class="ml-2 w-8 h-0.5"
                           style="background-image: repeating-linear-gradient(90deg, currentColor 0, currentColor 4px, transparent 4px, transparent 7px);"></div>
                    {:else if option.value === 'dotted'}
                      <div class="ml-2 w-8 h-0.5"
                           style="background-image: repeating-linear-gradient(90deg, currentColor 0, currentColor 2px, transparent 2px, transparent 4px);"></div>
                    {/if}
                  </div>
                </Select.Item>
              {/each}
            </Select.Content>
          </Select.Root>
        </div>

        <!-- Crosshair Opacity Slider -->
        <div class="space-y-2">
          <div class="flex items-center justify-between">
            <Label class="text-sm text-muted-foreground">Opacity</Label>
            <span class="text-xs text-muted-foreground font-mono">
              {Math.round(crosshairOpacity * 100)}%
            </span>
          </div>
          <Slider
            type="single"
            bind:value={crosshairOpacity}
            min={0.1}
            max={1.0}
            step={0.1}
            class="w-full"
          />
          {#if calculatedOpacity && calculatedOpacity !== crosshairOpacity}
            <div class="flex items-center justify-between text-xs">
              <span class="text-muted-foreground">Optimal accessible:</span>
              <span class="font-mono text-primary">
                {Math.round(calculatedOpacity * 100)}%
              </span>
            </div>
          {/if}
        </div>
      {/if}
    </div>
  </div>
{/if}
