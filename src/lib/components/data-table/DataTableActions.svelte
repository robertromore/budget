
<script lang="ts">
  import * as DropdownMenu from "$lib/components/ui/dropdown-menu";
  import { Button } from "$lib/components/ui/button";
  import Icon from "@iconify/svelte";

  let { id, actions } = $props<{
    id: number,
    actions: { [action: string]: () => void }
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
      <Icon icon="lucide:more-horizontal" class="w-4 h-4" />
    </Button>
  </DropdownMenu.Trigger>
  <DropdownMenu.Content>
    <DropdownMenu.Group>
      <DropdownMenu.Item onclick={actions.edit}>
        Edit
      </DropdownMenu.Item>
      <DropdownMenu.Item>
        Delete
      </DropdownMenu.Item>
      <DropdownMenu.Item>
        Archive
      </DropdownMenu.Item>
    </DropdownMenu.Group>
  </DropdownMenu.Content>
</DropdownMenu.Root>

