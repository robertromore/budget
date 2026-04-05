<script lang="ts">
import { Button } from '$lib/components/ui/button';
import { Input } from '$lib/components/ui/input';
import { Label } from '$lib/components/ui/label';
import { Textarea } from '$lib/components/ui/textarea';
import * as Dialog from '$lib/components/ui/dialog';
import * as Select from '$lib/components/ui/select';
import IconPicker from '$lib/components/ui/icon-picker/icon-picker.svelte';
import { rpc } from '$lib/query';
import type { DashboardWithWidgets, DashboardLayoutConfig } from '$core/schema/dashboards';
import { slugify } from '$lib/utils/string-utilities';

let {
  open = $bindable(false),
  dashboard,
}: {
  open?: boolean;
  dashboard: DashboardWithWidgets;
} = $props();

let name = $state('');
let description = $state('');
let icon = $state('');
let columns = $state('4');
let gap = $state('normal');
let saving = $state(false);

// Reset form when dashboard changes or dialog opens
$effect(() => {
  if (open) {
    name = dashboard.name;
    description = dashboard.description ?? '';
    icon = dashboard.icon ?? '';
    columns = String(dashboard.layout?.columns ?? 4);
    gap = dashboard.layout?.gap ?? 'normal';
  }
});

async function handleSave() {
  saving = true;
  try {
    await rpc.dashboards.saveDashboard.execute({
      id: dashboard.id,
      name,
      slug: slugify(name),
      description: description || null,
      icon: icon || null,
      layout: {
        columns: Number(columns) as 1 | 2 | 3 | 4,
        gap: gap as DashboardLayoutConfig['gap'],
      },
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
      <Dialog.Title>Dashboard Settings</Dialog.Title>
      <Dialog.Description>Configure the layout and appearance of this dashboard</Dialog.Description>
    </Dialog.Header>

    <div class="space-y-4 py-2">
      <div class="space-y-2">
        <Label for="dash-name">Name</Label>
        <Input id="dash-name" bind:value={name} placeholder="My Dashboard" />
      </div>

      <div class="space-y-2">
        <Label for="dash-desc">Description</Label>
        <Textarea
          id="dash-desc"
          bind:value={description}
          placeholder="Optional description"
          rows={2} />
      </div>

      <div class="space-y-2">
        <Label>Icon</Label>
        <IconPicker
          value={icon}
          onchange={(e) => (icon = e.detail.value)} />
      </div>

      <div class="grid grid-cols-2 gap-4">
        <div class="space-y-2">
          <Label>Columns</Label>
          <Select.Root type="single" bind:value={columns}>
            <Select.Trigger>
              {columns} {Number(columns) === 1 ? 'column' : 'columns'}
            </Select.Trigger>
            <Select.Content>
              <Select.Item value="1">1 column</Select.Item>
              <Select.Item value="2">2 columns</Select.Item>
              <Select.Item value="3">3 columns</Select.Item>
              <Select.Item value="4">4 columns</Select.Item>
            </Select.Content>
          </Select.Root>
        </div>

        <div class="space-y-2">
          <Label>Spacing</Label>
          <Select.Root type="single" bind:value={gap}>
            <Select.Trigger class="capitalize">{gap}</Select.Trigger>
            <Select.Content>
              <Select.Item value="compact">Compact</Select.Item>
              <Select.Item value="normal">Normal</Select.Item>
              <Select.Item value="spacious">Spacious</Select.Item>
            </Select.Content>
          </Select.Root>
        </div>
      </div>
    </div>

    <Dialog.Footer>
      <Button variant="outline" onclick={() => (open = false)}>Cancel</Button>
      <Button onclick={handleSave} disabled={saving || !name.trim()}>
        {saving ? 'Saving...' : 'Save'}
      </Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>
