<script lang="ts">
  import type { WidgetProps } from '$lib/types/widgets';
  import WidgetCard from './widget-card.svelte';

  let { config, data, onUpdate, onRemove, editMode = false }: WidgetProps = $props();
</script>

<WidgetCard {config} {data} {onUpdate} {onRemove} {editMode}>
  <div class="text-sm font-medium text-muted-foreground">{config.title}</div>
  <div class="text-2xl font-bold">{data?.transactionCount ?? 0}</div>
  {#if config.size === 'medium' || config.size === 'large'}
    <div class="text-xs text-muted-foreground mt-1">Total Transactions</div>
  {/if}
</WidgetCard>