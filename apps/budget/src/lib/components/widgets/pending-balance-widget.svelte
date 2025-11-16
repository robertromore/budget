<script lang="ts">
import type { WidgetProps } from '$lib/types/widgets';
import { currencyFormatter } from '$lib/utils/formatters';
import WidgetCard from './widget-card.svelte';

let { config, data, onUpdate, onRemove, editMode = false }: WidgetProps = $props();

const pendingBalance = data?.['pendingBalance'] ?? 0;
</script>

<WidgetCard {config} {data} {editMode} {...onUpdate && { onUpdate }} {...onRemove && { onRemove }}>
  <div class="text-muted-foreground text-sm font-medium">{config.title}</div>
  <div class="text-2xl font-bold {pendingBalance < 0 ? 'text-yellow-600' : ''}">
    {currencyFormatter.format(Math.abs(pendingBalance))}
  </div>
  {#if config.size === 'medium' || config.size === 'large'}
    <div class="text-muted-foreground mt-1 text-xs">Uncleared Transactions</div>
  {/if}
</WidgetCard>
