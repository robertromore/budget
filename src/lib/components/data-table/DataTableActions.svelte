<script lang="ts">
  import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
  import { Button } from '$lib/components/ui/button';

  let {
    id,
  }: {
    id: number;
  } = $props();
</script>

<DropdownMenu.Root>
  <DropdownMenu.Trigger asChild let:builder>
    <Button variant="ghost" builders={[builder]} size="icon" class="relative size-8 p-0">
      <span class="sr-only">Open menu</span>
      <span class="icon-[lucide--more-horizontal] size-4"></span>
    </Button>
  </DropdownMenu.Trigger>
  <DropdownMenu.Content>
    <DropdownMenu.Group>
      <!-- <DropdownMenu.Item onclick={() => actions.edit(ids)}>
        Edit
      </DropdownMenu.Item> -->
      <DropdownMenu.Item>Archive</DropdownMenu.Item>
      <DropdownMenu.Item>Delete</DropdownMenu.Item>
    </DropdownMenu.Group>
  </DropdownMenu.Content>
</DropdownMenu.Root>
