<script lang="ts">
import * as Card from '$lib/components/ui/card';
import { Badge } from '$lib/components/ui/badge';
import ResponsiveSheet from '$lib/components/ui/responsive-sheet/responsive-sheet.svelte';
import { WIDGET_CATALOG, type WidgetCategory } from '$lib/types/dashboard-widgets';
import Plus from '@lucide/svelte/icons/plus';

let {
  open = $bindable(false),
  onAddWidget,
}: {
  open?: boolean;
  onAddWidget?: (widgetType: string) => void;
} = $props();

const categories: { key: WidgetCategory; label: string }[] = [
  { key: 'metrics', label: 'Metrics' },
  { key: 'charts', label: 'Charts' },
  { key: 'lists', label: 'Lists' },
  { key: 'actions', label: 'Actions' },
];

function handleAdd(widgetType: string) {
  onAddWidget?.(widgetType);
}
</script>

<ResponsiveSheet
  bind:open
  side="right"
  defaultWidth={380}
  minWidth={320}
  maxWidth={500}>
  {#snippet header()}
    <div class="flex items-center gap-2">
      <Plus class="text-primary h-5 w-5" />
      <h2 class="text-lg font-semibold">Add Widget</h2>
    </div>
  {/snippet}

  {#snippet content()}
    {#each categories as cat}
      {@const widgets = WIDGET_CATALOG.filter((w) => w.category === cat.key)}
      {#if widgets.length > 0}
        <div class="mb-5">
          <h3 class="text-muted-foreground mb-2 text-xs font-semibold uppercase tracking-wider">
            {cat.label}
          </h3>
          <div class="space-y-2">
            {#each widgets as widget}
              <Card.Root
                class="cursor-pointer transition-colors hover:bg-accent/50"
                onclick={() => handleAdd(widget.type)}>
                <Card.Content class="flex items-center gap-3 p-3">
                  <div class="bg-primary/10 shrink-0 rounded-md p-1.5">
                    <Plus class="text-primary h-4 w-4" />
                  </div>
                  <div class="min-w-0 flex-1">
                    <div class="text-sm font-medium">{widget.label}</div>
                    <div class="text-muted-foreground truncate text-xs">
                      {widget.description}
                    </div>
                  </div>
                  <Badge variant="outline" class="text-xs">{widget.defaultSize}</Badge>
                </Card.Content>
              </Card.Root>
            {/each}
          </div>
        </div>
      {/if}
    {/each}
  {/snippet}
</ResponsiveSheet>
