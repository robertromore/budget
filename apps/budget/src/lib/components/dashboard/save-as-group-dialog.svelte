<script lang="ts">
import { goto } from '$app/navigation';
import { Button } from '$lib/components/ui/button';
import * as Dialog from '$lib/components/ui/dialog';
import { Input } from '$lib/components/ui/input';
import { Label } from '$lib/components/ui/label';
import { Textarea } from '$lib/components/ui/textarea';
import { rpc } from '$lib/query';

let {
  open = $bindable(false),
  dashboardId,
  defaultName = '',
}: {
  open?: boolean;
  dashboardId: number;
  defaultName?: string;
} = $props();

let name = $state('');
let description = $state('');
let saving = $state(false);

$effect(() => {
  if (open) {
    name = defaultName;
    description = '';
  }
});

async function handleSave() {
  if (!name.trim()) return;
  saving = true;
  try {
    const created = await rpc.widgetGroups.saveDashboardAsGroup.execute({
      dashboardId,
      name: name.trim(),
      description: description.trim() || null,
    });
    open = false;
    await goto(`/dashboard/groups/${created.slug}`);
  } finally {
    saving = false;
  }
}
</script>

<Dialog.Root bind:open>
  <Dialog.Content class="sm:max-w-md">
    <Dialog.Header>
      <Dialog.Title>Save as widget group</Dialog.Title>
      <Dialog.Description>
        Capture this dashboard's current widgets (with their sizes + settings) as a reusable group.
      </Dialog.Description>
    </Dialog.Header>
    <div class="space-y-4">
      <div class="space-y-2">
        <Label for="save-group-name">Name</Label>
        <Input id="save-group-name" bind:value={name} placeholder="My weekly brief" />
      </div>
      <div class="space-y-2">
        <Label for="save-group-description">Description (optional)</Label>
        <Textarea
          id="save-group-description"
          bind:value={description}
          placeholder="What this group is for…"
          rows={3} />
      </div>
    </div>
    <Dialog.Footer>
      <Button variant="outline" onclick={() => (open = false)}>Cancel</Button>
      <Button onclick={handleSave} disabled={!name.trim() || saving}>
        {saving ? 'Saving…' : 'Save group'}
      </Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>
