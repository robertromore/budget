<script lang="ts">
import { Button } from '$lib/components/ui/button';
import { Input } from '$lib/components/ui/input';
import { Label } from '$lib/components/ui/label';
import * as Dialog from '$lib/components/ui/dialog';
import * as Select from '$lib/components/ui/select';
import { Switch } from '$lib/components/ui/switch';
import { rpc } from '$lib/query';
import type { DashboardWidget } from '$core/schema/dashboards';
import { getWidgetDefinition } from '$lib/types/dashboard-widgets';
import {
  COPILOT_COLOR_IDS,
  COPILOT_COLOR_LABELS,
  copilotColorOr,
  copilotPalette,
  type CopilotColor,
} from './widgets/copilot-colors';
import Check from '@lucide/svelte/icons/check';

let {
  open = $bindable(false),
  widget,
  onSave,
}: {
  open?: boolean;
  widget: DashboardWidget | null;
  onSave?: (update: {
    id: number;
    title: string | null;
    size: DashboardWidget['size'];
    columnSpan: number;
    settings: Record<string, unknown>;
  }) => Promise<void>;
} = $props();

let title = $state('');
let size = $state('medium');
let columnSpan = $state('1');
let period = $state('');
let limit = $state('');
let stylePinned = $state(false);
let gradientColor = $state<CopilotColor>('sky');
let saving = $state(false);

const definition = $derived(widget ? getWidgetDefinition(widget.widgetType) : null);
const isCopilot = $derived(definition?.style === 'copilot');

$effect(() => {
  if (open && widget) {
    title = widget.title ?? '';
    size = widget.size;
    columnSpan = String(widget.columnSpan);
    period = (widget.settings as any)?.period ?? '';
    limit = String((widget.settings as any)?.limit ?? '');
    stylePinned = widget.stylePinned ?? false;
    gradientColor = copilotColorOr((widget.settings as any)?.gradientColor);
  }
});

async function handleSave() {
  if (!widget) return;
  saving = true;
  try {
    const settings: Record<string, unknown> = { ...(widget.settings ?? {}) };
    if (period) settings.period = period;
    else delete settings.period;
    if (limit && Number(limit) > 0) settings.limit = Number(limit);
    else delete settings.limit;
    if (isCopilot) {
      if (gradientColor === 'sky') delete settings.gradientColor;
      else settings.gradientColor = gradientColor;
    }

    const update = {
      id: widget.id,
      title: title.trim() || null,
      size: size as DashboardWidget['size'],
      columnSpan: Number(columnSpan),
      settings,
    };
    if (onSave) {
      await onSave(update);
    } else {
      await rpc.dashboards.updateWidget.execute(update);
    }

    // Pin state persists via a separate call only when it changed — and
    // only when not using a caller-provided onSave override (which handles
    // all persistence itself, e.g. the group-editor route).
    if (!onSave && stylePinned !== (widget.stylePinned ?? false)) {
      await rpc.dashboards.updateWidget.execute({
        id: widget.id,
        stylePinned,
      });
    }

    open = false;
  } finally {
    saving = false;
  }
}
</script>

<Dialog.Root bind:open>
  <Dialog.Content class="sm:max-w-md">
    <Dialog.Header>
      <Dialog.Title>Widget Settings</Dialog.Title>
      <Dialog.Description>
        {definition?.label ?? widget?.widgetType ?? 'Widget'}
      </Dialog.Description>
    </Dialog.Header>

    <div class="space-y-4 py-2">
      <div class="space-y-2">
        <Label for="widget-title">Custom Title</Label>
        <Input
          id="widget-title"
          bind:value={title}
          placeholder={definition?.label ?? 'Default title'} />
        <p class="text-muted-foreground text-xs">Leave blank to use the default</p>
      </div>

      <div class="grid grid-cols-2 gap-4">
        <div class="space-y-2">
          <Label>Size</Label>
          <Select.Root type="single" bind:value={size}>
            <Select.Trigger class="capitalize">{size}</Select.Trigger>
            <Select.Content>
              {#each definition?.availableSizes ?? ['small', 'medium', 'large', 'full'] as s}
                <Select.Item value={s} class="capitalize">{s}</Select.Item>
              {/each}
            </Select.Content>
          </Select.Root>
        </div>

        <div class="space-y-2">
          <Label>Column Span</Label>
          <Select.Root type="single" bind:value={columnSpan}>
            <Select.Trigger>{columnSpan} {Number(columnSpan) === 1 ? 'col' : 'cols'}</Select.Trigger>
            <Select.Content>
              <Select.Item value="1">1 col</Select.Item>
              <Select.Item value="2">2 cols</Select.Item>
              <Select.Item value="3">3 cols</Select.Item>
              <Select.Item value="4">4 cols</Select.Item>
            </Select.Content>
          </Select.Root>
        </div>
      </div>

      {#if definition?.category === 'charts' || definition?.category === 'lists'}
        <div class="grid grid-cols-2 gap-4">
          <div class="space-y-2">
            <Label>Time Period</Label>
            <Select.Root type="single" bind:value={period}>
              <Select.Trigger class="capitalize">{period || 'None'}</Select.Trigger>
              <Select.Content>
                <Select.Item value="">None</Select.Item>
                <Select.Item value="week">Week</Select.Item>
                <Select.Item value="month">Month</Select.Item>
                <Select.Item value="quarter">Quarter</Select.Item>
                <Select.Item value="year">Year</Select.Item>
              </Select.Content>
            </Select.Root>
          </div>

          <div class="space-y-2">
            <Label for="widget-limit">Max Items</Label>
            <Input
              id="widget-limit"
              type="number"
              bind:value={limit}
              placeholder="e.g. 5"
              min="1"
              max="50" />
          </div>
        </div>
      {/if}

      {#if isCopilot}
        <div class="space-y-2">
          <Label>Gradient color</Label>
          <div class="flex flex-wrap gap-2">
            {#each COPILOT_COLOR_IDS as color}
              {@const palette = copilotPalette(color)}
              {@const selected = gradientColor === color}
              <button
                type="button"
                class="group relative flex h-9 w-9 items-center justify-center rounded-full border-2 transition-all {selected
                  ? 'border-foreground ring-2 ring-foreground/20'
                  : 'border-transparent hover:border-muted-foreground/30'}"
                title={COPILOT_COLOR_LABELS[color]}
                aria-label={COPILOT_COLOR_LABELS[color]}
                aria-pressed={selected}
                onclick={() => (gradientColor = color)}>
                <span class="h-6 w-6 rounded-full {palette.swatch}"></span>
                {#if selected}
                  <Check class="absolute h-3.5 w-3.5 text-white drop-shadow-sm" />
                {/if}
              </button>
            {/each}
          </div>
          <p class="text-muted-foreground text-xs">
            Applies only to copilot-style widgets.
          </p>
        </div>
      {/if}

      {#if !onSave}
        <div class="flex items-start justify-between gap-3 rounded-md border bg-muted/30 p-3">
          <div class="space-y-1">
            <Label for="widget-style-pin" class="cursor-pointer">Pin style</Label>
            <p class="text-muted-foreground text-xs leading-tight">
              Keep this widget on its current style when the dashboard is restyled.
            </p>
          </div>
          <Switch id="widget-style-pin" bind:checked={stylePinned} />
        </div>
      {/if}
    </div>

    <Dialog.Footer>
      <Button variant="outline" onclick={() => (open = false)}>Cancel</Button>
      <Button onclick={handleSave} disabled={saving}>
        {saving ? 'Saving...' : 'Save'}
      </Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>
