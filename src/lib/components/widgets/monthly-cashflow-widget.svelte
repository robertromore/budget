<script lang="ts">
  import type { WidgetProps } from '$lib/types/widgets';
  import WidgetCard from './widget-card.svelte';

  let { config, data, onUpdate, onRemove, editMode = false }: WidgetProps = $props();

  const cashFlow = data?.monthlyCashFlow ?? 0;
  const isPositive = cashFlow >= 0;
</script>

<WidgetCard {config} {data} {onUpdate} {onRemove} {editMode}>
  <div class="text-sm font-medium text-muted-foreground">{config.title}</div>
  <div class="text-2xl font-bold {isPositive ? 'text-green-600' : 'text-red-600'}">
    ${Math.abs(cashFlow).toFixed(2)}
  </div>
  {#if config.size === 'medium' || config.size === 'large'}
    <div class="text-xs text-muted-foreground mt-1 flex items-center gap-1">
      <span class="w-2 h-2 rounded-full {isPositive ? 'bg-green-500' : 'bg-red-500'}"></span>
      {isPositive ? 'Net Income' : 'Net Spending'} This Month
    </div>
  {/if}
</WidgetCard>