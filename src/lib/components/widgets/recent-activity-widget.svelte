<script lang="ts">
  import type { WidgetProps } from '$lib/types/widgets';
  import WidgetCard from './widget-card.svelte';

  let { config, data, onUpdate, onRemove, editMode = false }: WidgetProps = $props();
  
  const days = config.settings?.days ?? 30;
</script>

<WidgetCard {config} {data} {onUpdate} {onRemove} {editMode}>
  <div class="text-sm font-medium text-muted-foreground">{config.title}</div>
  <div class="text-2xl font-bold">{data?.recentActivity ?? 0}</div>
  <div class="text-xs text-muted-foreground">Last {days} days</div>
</WidgetCard>