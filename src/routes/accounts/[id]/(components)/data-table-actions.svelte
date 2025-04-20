<script lang="ts">
  import * as DropdownMenu from "$lib/components/ui/dropdown-menu";
  import { Button } from "$lib/components/ui/button";
  import MoreHorizontal from "lucide-svelte/icons/more-horizontal";
  import DeleteTransactionDialog from "$lib/components/dialogs/delete-transaction-dialog.svelte";

  let {
    id,
  }: {
    id: number;
  } = $props();

  let deleteOpen = $state(false);
</script>

<DropdownMenu.Root>
  <DropdownMenu.Trigger>
    {#snippet child({ props })}
      <Button variant="ghost" size="icon" class="relative size-8 p-0" {...props}>
        <span class="sr-only">Open menu</span>
        <MoreHorizontal class="size-4" />
      </Button>
    {/snippet}
  </DropdownMenu.Trigger>
  <DropdownMenu.Content>
    <!-- <DropdownMenu.Group>
      <DropdownMenu.Sub>
        <DropdownMenu.SubTrigger>Open Sub Menu</DropdownMenu.SubTrigger>
        <DropdownMenu.SubContent>
          <DropdownMenu.Item>Sub Item 1</DropdownMenu.Item>
          <DropdownMenu.Item>Sub Item 2</DropdownMenu.Item>
        </DropdownMenu.SubContent>
      </DropdownMenu.Sub>
    </DropdownMenu.Group> -->
    <DropdownMenu.Group>
      <DropdownMenu.Item onSelect={() => (deleteOpen = true)}>Delete</DropdownMenu.Item>
    </DropdownMenu.Group>
  </DropdownMenu.Content>
</DropdownMenu.Root>

{#if deleteOpen}
  <DeleteTransactionDialog transactions={[id]} bind:dialogOpen={deleteOpen} />
{/if}
