<script lang="ts">
  import * as AlertDialog from '$lib/components/ui/alert-dialog';
  import { Input } from '$lib/components/ui/input';
  import { Label } from '$lib/components/ui/label';
  import { Textarea } from '$lib/components/ui/textarea';
  import { updateRetailer } from '$lib/query/price-watcher';
  import type { PriceRetailer } from '$core/schema/price-retailers';

  interface Props {
    open: boolean;
    retailer: PriceRetailer;
  }

  let { open = $bindable(false), retailer }: Props = $props();

  let name = $state('');
  let website = $state('');
  let logoUrl = $state('');
  let color = $state('');
  let notes = $state('');

  const mutation = updateRetailer.options();

  $effect(() => {
    if (open) {
      name = retailer.name;
      website = retailer.website ?? '';
      logoUrl = retailer.logoUrl ?? '';
      color = retailer.color ?? '';
      notes = retailer.notes ?? '';
    }
  });

  async function handleSave() {
    await mutation.mutateAsync({
      id: retailer.id,
      data: {
        name: name || undefined,
        website: website || null,
        logoUrl: logoUrl || null,
        color: color || null,
        notes: notes || null,
      },
    });
    open = false;
  }
</script>

<AlertDialog.Root bind:open>
  <AlertDialog.Content class="max-w-md">
    <AlertDialog.Header>
      <AlertDialog.Title>Edit Retailer</AlertDialog.Title>
      <AlertDialog.Description>
        Customize how {retailer.name} appears across your products.
      </AlertDialog.Description>
    </AlertDialog.Header>

    <div class="space-y-4">
      <div class="space-y-2">
        <Label for="retailer-name">Display Name</Label>
        <Input id="retailer-name" bind:value={name} placeholder="e.g. Amazon" />
      </div>

      <div class="space-y-2">
        <Label for="retailer-website">Website</Label>
        <Input
          id="retailer-website"
          type="url"
          bind:value={website}
          placeholder="https://amazon.com" />
      </div>

      <div class="space-y-2">
        <Label for="retailer-logo">Logo URL</Label>
        <div class="flex items-center gap-3">
          {#if logoUrl}
            <img src={logoUrl} alt="" class="h-8 w-8 rounded border object-cover" />
          {:else if retailer.logoUrl}
            <img src={retailer.logoUrl} alt="" class="h-8 w-8 rounded border object-cover" />
          {/if}
          <Input
            id="retailer-logo"
            bind:value={logoUrl}
            placeholder="https://..." class="flex-1" />
        </div>
      </div>

      <div class="space-y-2">
        <Label for="retailer-color">Brand Color</Label>
        <div class="flex items-center gap-3">
          {#if color}
            <div class="h-8 w-8 rounded border" style:background-color={color}></div>
          {/if}
          <Input
            id="retailer-color"
            bind:value={color}
            placeholder="#ff9900"
            maxlength={7}
            class="flex-1" />
        </div>
      </div>

      <div class="space-y-2">
        <Label for="retailer-notes">Notes</Label>
        <Textarea
          id="retailer-notes"
          rows={3}
          placeholder="Optional notes..."
          class="resize-none"
          bind:value={notes} />
      </div>
    </div>

    <AlertDialog.Footer>
      <AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
      <AlertDialog.Action onclick={handleSave} disabled={mutation.isPending}>
        {mutation.isPending ? 'Saving...' : 'Save'}
      </AlertDialog.Action>
    </AlertDialog.Footer>
  </AlertDialog.Content>
</AlertDialog.Root>
