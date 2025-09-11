<script lang="ts">
import {Target} from '$lib/components/icons';
import {Label} from '$ui/components/ui/label';
import {Switch} from '$lib/components/ui/switch';
import {Slider} from '$lib/components/ui/slider';

interface Props {
  showHighlightPoints: boolean;
  highlightPointRadius: number;
  allowHighlightChange?: boolean;
}

let {
  showHighlightPoints = $bindable(true),
  highlightPointRadius = $bindable(6),
  allowHighlightChange = true,
}: Props = $props();
</script>

{#if allowHighlightChange}
  <div class="space-y-3">
    <div class="flex items-center gap-2">
      <Target class="h-4 w-4" />
      <Label class="text-sm font-medium">Highlight Points</Label>
    </div>

    <div class="space-y-3 pl-6">
      <!-- Show Highlight Points Toggle -->
      <div class="flex items-center justify-between">
        <Label class="text-sm">Show Points</Label>
        <Switch bind:checked={showHighlightPoints} />
      </div>

      {#if showHighlightPoints}
        <!-- Point Size Slider -->
        <div class="space-y-2">
          <div class="flex items-center justify-between">
            <Label class="text-muted-foreground text-sm">Point Size</Label>
            <span class="text-muted-foreground font-mono text-xs">
              {highlightPointRadius}px
            </span>
          </div>
          <Slider
            type="single"
            bind:value={highlightPointRadius}
            min={3}
            max={12}
            step={1}
            class="w-full" />
          <div class="text-muted-foreground flex justify-between text-xs">
            <span>Small</span>
            <span>Large</span>
          </div>
        </div>
      {/if}
    </div>
  </div>
{/if}
