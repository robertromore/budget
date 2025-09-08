<script lang="ts">
  import { Switch } from '$lib/components/ui/switch';
  import { Label } from '$lib/components/ui/label';

  interface Props {
    showPoints: boolean;
    chartType: string;
  }

  let { showPoints = $bindable(false), chartType }: Props = $props();

  // Only show points toggle for line/spline charts
  const showPointsSelector = $derived(['line', 'spline'].includes(chartType));
</script>

{#if showPointsSelector}
  <div class="flex items-center gap-2">
    <Label for="points-selector" class="text-sm font-medium">Points:</Label>
    <Switch 
      bind:checked={showPoints}
      id="points-selector"
    />
    <span class="text-xs text-muted-foreground">
      {showPoints ? 'On' : 'Off'}
    </span>
  </div>
{/if}