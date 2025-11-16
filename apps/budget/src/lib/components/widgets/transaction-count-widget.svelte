<script lang="ts">
import type { WidgetProps } from '$lib/types/widgets';
import { numberFormatter } from '$lib/utils/formatters';
import WidgetCard from './widget-card.svelte';

let { config, data, onUpdate, onRemove, editMode = false }: WidgetProps = $props();
</script>

<WidgetCard {config} {data} {editMode} {...onUpdate && { onUpdate }} {...onRemove && { onRemove }}>
  <div class="text-muted-foreground text-sm font-medium">{config.title}</div>
  <div class="text-2xl font-bold">{numberFormatter.format(data?.['transactionCount'] ?? 0)}</div>
  {#if config.size === 'medium' || config.size === 'large'}
    <div class="text-muted-foreground mt-1 text-xs">Total Transactions</div>
  {/if}
</WidgetCard>
