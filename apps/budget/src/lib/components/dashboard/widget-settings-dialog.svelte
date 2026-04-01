<script lang="ts">
import { Button } from '$lib/components/ui/button';
import { Input } from '$lib/components/ui/input';
import { Label } from '$lib/components/ui/label';
import * as Dialog from '$lib/components/ui/dialog';
import * as Select from '$lib/components/ui/select';
import { Switch } from '$lib/components/ui/switch';
import { rpc } from '$lib/query';
import type { DashboardWidget } from '$lib/schema/dashboards';
import { getWidgetDefinition } from '$lib/types/dashboard-widgets';

let {
  open = $bindable(false),
  widget,
}: {
  open?: boolean;
  widget: DashboardWidget | null;
} = $props();

let title = $state('');
let size = $state('medium');
let columnSpan = $state('1');
let period = $state('');
let limit = $state('');
let saving = $state(false);

const definition = $derived(widget ? getWidgetDefinition(widget.widgetType) : null);

$effect(() => {
  if (open && widget) {
    title = widget.title ?? '';
    size = widget.size;
    columnSpan = String(widget.columnSpan);
    period = (widget.settings as any)?.period ?? '';
    limit = String((widget.settings as any)?.limit ?? '');
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

    await rpc.dashboards.updateWidget.execute({
      id: widget.id,
      title: title.trim() || null,
      size: size as any,
      columnSpan: Number(columnSpan),
      settings,
    });
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
    </div>

    <Dialog.Footer>
      <Button variant="outline" onclick={() => (open = false)}>Cancel</Button>
      <Button onclick={handleSave} disabled={saving}>
        {saving ? 'Saving...' : 'Save'}
      </Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>
