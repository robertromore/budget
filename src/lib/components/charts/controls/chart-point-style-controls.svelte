<script lang="ts">
  import { Label } from '$lib/components/ui/label';
  import { Input } from '$lib/components/ui/input';
  import { Slider } from '$lib/components/ui/slider';
  import { Switch } from '$lib/components/ui/switch';
  import { Target } from '$lib/components/icons';
  import { DEFAULT_STYLING_CONFIG } from '../config/chart-config';

  interface Props {
    showPoints: boolean;
    pointRadius: number;
    pointStrokeWidth: number;
    pointFillOpacity: number;
    pointStrokeOpacity: number;
    chartType: string;
  }

  let {
    showPoints = $bindable(false),
    pointRadius = $bindable(DEFAULT_STYLING_CONFIG.points.radius ?? 6),
    pointStrokeWidth = $bindable(DEFAULT_STYLING_CONFIG.points.strokeWidth ?? 1),
    pointFillOpacity = $bindable(1.0),
    pointStrokeOpacity = $bindable(1.0),
    chartType
  }: Props = $props();

  const showPointControls = $derived(['line', 'spline', 'area'].includes(chartType));
</script>

{#if showPointControls}
  <div class="space-y-4">
    <!-- Enable Points Toggle -->
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-2">
        <Target class="h-4 w-4" />
        <Label class="text-sm font-medium">Show Points</Label>
      </div>
      <Switch bind:checked={showPoints} />
    </div>

    {#if showPoints}
      <!-- Point Size -->
      <div class="space-y-2">
        <Label class="text-sm font-medium">Point Size (px)</Label>
        <Input 
          type="number" 
          bind:value={pointRadius}
          min="1"
          max="20"
          class="w-full"
        />
      </div>

      <!-- Point Stroke Width -->
      <div class="space-y-2">
        <Label class="text-sm font-medium">Border Width (px)</Label>
        <Input 
          type="number" 
          bind:value={pointStrokeWidth}
          min="0"
          max="10"
          class="w-full"
        />
      </div>

      <!-- Fill Opacity -->
      <div class="space-y-2">
        <div class="flex items-center justify-between">
          <Label class="text-sm font-medium">Fill Opacity</Label>
          <span class="text-xs text-muted-foreground font-mono">
            {Math.round(pointFillOpacity * 100)}%
          </span>
        </div>
        <Slider
          type="single"
          bind:value={pointFillOpacity}
          min={0.1}
          max={1.0}
          step={0.1}
          class="w-full"
        />
      </div>

      <!-- Stroke Opacity (only if stroke is enabled) -->
      {#if pointStrokeWidth > 0}
        <div class="space-y-2">
          <div class="flex items-center justify-between">
            <Label class="text-sm font-medium">Border Opacity</Label>
            <span class="text-xs text-muted-foreground font-mono">
              {Math.round(pointStrokeOpacity * 100)}%
            </span>
          </div>
          <Slider
            type="single"
            bind:value={pointStrokeOpacity}
            min={0.1}
            max={1.0}
            step={0.1}
            class="w-full"
          />
        </div>
      {/if}
    {/if}
  </div>
{/if}