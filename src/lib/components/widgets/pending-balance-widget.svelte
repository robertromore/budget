<script lang="ts">
  import type { WidgetProps } from '$lib/types/widgets';
  import WidgetCard from './widget-card.svelte';
  import { currencyFormatter } from '$lib/utils/formatters';

  let { config, data, onUpdate, onRemove, editMode = false }: WidgetProps = $props();
  
  const pendingBalance = data?.pendingBalance ?? 0;
</script>

<WidgetCard {config} {data} {onUpdate} {onRemove} {editMode}>
  <div class="text-sm font-medium text-muted-foreground">{config.title}</div>
  <div class="text-2xl font-bold {pendingBalance < 0 ? 'text-yellow-600' : ''}">
    {currencyFormatter.format(Math.abs(pendingBalance))}
  </div>
  {#if config.size === 'medium' || config.size === 'large'}
    <div class="text-xs text-muted-foreground mt-1">Uncleared Transactions</div>
  {/if}
</WidgetCard>