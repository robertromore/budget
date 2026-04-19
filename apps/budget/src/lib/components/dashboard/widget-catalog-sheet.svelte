<script lang="ts">
import * as Card from '$lib/components/ui/card';
import { Badge } from '$lib/components/ui/badge';
import ResponsiveSheet from '$lib/components/ui/responsive-sheet/responsive-sheet.svelte';
import { widgetStylePreference } from '$lib/stores/widget-style-preference.svelte';
import {
  WIDGET_CATALOG,
  WIDGET_STYLE_LABELS,
  type WidgetCategory,
  type WidgetStyle,
} from '$lib/types/dashboard-widgets';
import Check from '@lucide/svelte/icons/check';
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

type StyleFilter = 'all' | WidgetStyle;

const stylePills: Array<{ key: StyleFilter; label: string }> = [
  { key: 'all', label: 'All' },
  { key: 'classic', label: WIDGET_STYLE_LABELS.classic },
  { key: 'terminal', label: WIDGET_STYLE_LABELS.terminal },
  { key: 'narrative', label: WIDGET_STYLE_LABELS.narrative },
  { key: 'coach', label: WIDGET_STYLE_LABELS.coach },
  { key: 'copilot', label: WIDGET_STYLE_LABELS.copilot },
];

let activeStyle = $state<StyleFilter>(widgetStylePreference.value);

const canSetAsDefault = $derived(
  activeStyle !== 'all' && activeStyle !== widgetStylePreference.value
);

function saveAsDefault() {
  if (activeStyle === 'all') return;
  widgetStylePreference.value = activeStyle;
}

const filteredCatalog = $derived(
  activeStyle === 'all'
    ? WIDGET_CATALOG
    : WIDGET_CATALOG.filter((w) => w.style === activeStyle)
);

function handleAdd(widgetType: string) {
  onAddWidget?.(widgetType);
}

function styleBadgeClass(style: WidgetStyle): string {
  switch (style) {
    case 'terminal':
      return 'border-emerald-500/40 text-emerald-600 dark:text-emerald-400';
    case 'narrative':
      return 'border-violet-500/40 text-violet-600 dark:text-violet-400';
    case 'coach':
      return 'border-amber-500/40 text-amber-600 dark:text-amber-400';
    case 'copilot':
      return 'border-sky-500/40 text-sky-600 dark:text-sky-400';
    case 'classic':
    default:
      return 'border-muted-foreground/30 text-muted-foreground';
  }
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
    <div class="mb-3 -mx-1 flex flex-wrap gap-1 px-1">
      {#each stylePills as pill}
        <button
          type="button"
          class="flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition-colors {activeStyle ===
          pill.key
            ? 'bg-primary text-primary-foreground'
            : 'bg-muted text-muted-foreground hover:bg-accent hover:text-foreground'}"
          onclick={() => (activeStyle = pill.key)}>
          {pill.label}
          {#if pill.key !== 'all' && pill.key === widgetStylePreference.value}
            <Check class="h-3 w-3 opacity-70" />
          {/if}
        </button>
      {/each}
    </div>
    {#if canSetAsDefault}
      <button
        type="button"
        class="mb-3 text-primary hover:underline text-[11px]"
        onclick={saveAsDefault}>
        Set {WIDGET_STYLE_LABELS[activeStyle as WidgetStyle]} as my default style
      </button>
    {/if}

    {#each categories as cat}
      {@const widgets = filteredCatalog.filter((w) => w.category === cat.key)}
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
                  {#if widget.style !== 'classic'}
                    <Badge variant="outline" class="text-xs {styleBadgeClass(widget.style)}">
                      {WIDGET_STYLE_LABELS[widget.style]}
                    </Badge>
                  {:else}
                    <Badge variant="outline" class="text-xs">{widget.defaultSize}</Badge>
                  {/if}
                </Card.Content>
              </Card.Root>
            {/each}
          </div>
        </div>
      {/if}
    {/each}

    {#if filteredCatalog.length === 0}
      <p class="text-muted-foreground py-8 text-center text-sm">
        No widgets in this style yet.
      </p>
    {/if}
  {/snippet}
</ResponsiveSheet>
