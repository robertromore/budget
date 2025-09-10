<script lang="ts">
  import { Layers } from 'lucide-svelte';
  import { Label }  from "bits-ui";
  import { Slider }  from "bits-ui";
  import { Switch }  from "bits-ui";

  interface Props {
    showGrid: boolean;
    showHorizontal: boolean;
    showVertical: boolean;
    gridOpacity: number;
    allowGridChange?: boolean;
    calculatedGridOpacity?: number; // Show the accessibility-aware calculated opacity
  }

  let {
    showGrid = $bindable(false),
    showHorizontal = $bindable(true),
    showVertical = $bindable(false),
    gridOpacity = $bindable(0.5),
    allowGridChange = true,
    calculatedGridOpacity
  }: Props = $props();
</script>

{#if allowGridChange}
  <div class="space-y-3">
    <div class="flex items-center gap-2">
      <Layers class="h-4 w-4" />
      <Label class="text-sm font-medium">Grid Lines</Label>
    </div>

    <div class="space-y-3 pl-6">
      <!-- Main Grid Toggle -->
      <div class="flex items-center justify-between">
        <Label class="text-sm">Show Grid</Label>
        <Switch bind:checked={showGrid} />
      </div>

      {#if showGrid}
        <!-- Horizontal Grid Lines -->
        <div class="flex items-center justify-between">
          <Label class="text-sm text-muted-foreground">Horizontal Lines</Label>
          <Switch bind:checked={showHorizontal} />
        </div>

        <!-- Vertical Grid Lines -->
        <div class="flex items-center justify-between">
          <Label class="text-sm text-muted-foreground">Vertical Lines</Label>
          <Switch bind:checked={showVertical} />
        </div>

        <!-- Grid Opacity Slider -->
        <div class="space-y-2">
          <div class="flex items-center justify-between">
            <Label class="text-sm text-muted-foreground">Opacity</Label>
            <span class="text-xs text-muted-foreground font-mono">
              {Math.round(gridOpacity * 100)}%
            </span>
          </div>
          <Slider
            type="single"
            bind:value={gridOpacity}
            min={0.1}
            max={1.0}
            step={0.1}
            class="w-full"
          />
          {#if calculatedGridOpacity && calculatedGridOpacity !== gridOpacity}
            <div class="flex items-center justify-between text-xs">
              <span class="text-muted-foreground">Optimal accessible:</span>
              <span class="font-mono text-primary">
                {Math.round(calculatedGridOpacity * 100)}%
              </span>
            </div>
          {/if}
        </div>
      {/if}
    </div>
  </div>
{/if}
