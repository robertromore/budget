
<script lang="ts">
  import * as DropdownMenu from "$lib/components/ui/dropdown-menu";
  import { Button } from "$lib/components/ui/button";

  let { id, actions } = $props<{
    id: number,
    actions: { [action: string]: (id: number) => void }
  }>();
</script>

<DropdownMenu.Root>
  <DropdownMenu.Trigger asChild let:builder>
    <Button
      variant="ghost"
      builders={[builder]}
      size="icon"
      class="relative w-8 h-8 p-0"
    >
      <span class="sr-only">Open menu</span>
      <span class="icon-[lucide--more-horizontal] size-4"></span>
    </Button>
  </DropdownMenu.Trigger>
  <DropdownMenu.Content>
    <DropdownMenu.Group>
      <DropdownMenu.Item onclick={() => actions.edit(id)}>
        Edit
      </DropdownMenu.Item>
      <DropdownMenu.Item onclick={() => actions.delete(id)}>
        Delete
      </DropdownMenu.Item>
      <DropdownMenu.Item>
        Archive
      </DropdownMenu.Item>
    </DropdownMenu.Group>
  </DropdownMenu.Content>
</DropdownMenu.Root>

