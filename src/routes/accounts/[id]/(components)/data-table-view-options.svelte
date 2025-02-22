<script lang="ts" generics="TData">
  import MixerHorizontal from "svelte-radix/MixerHorizontal.svelte";
  import type { Table } from "@tanstack/table-core";
  import { buttonVariants } from "$lib/components/ui/button";
  import * as DropdownMenu from "$lib/components/ui/dropdown-menu";

  let { table }: { table: Table<TData> } = $props();
</script>

<DropdownMenu.Root>
  <DropdownMenu.Trigger
    class={buttonVariants({
      variant: "outline",
      size: "sm",
      class: "ml-auto hidden h-8 lg:flex",
    })}
  >
    <MixerHorizontal class="mr-2 size-4" />
    Display
  </DropdownMenu.Trigger>
  <DropdownMenu.Content>
    <DropdownMenu.Group>
      <DropdownMenu.GroupHeading>Toggle columns</DropdownMenu.GroupHeading>
      <DropdownMenu.Separator />
      {#each table
        .getAllColumns()
        .filter((col) => typeof col.accessorFn !== "undefined" && col.getCanHide()) as column}
        <DropdownMenu.CheckboxItem
          bind:checked={() => column.getIsVisible(), (v) => column.toggleVisibility(!!v)}
          class="capitalize"
          closeOnSelect={false}
        >
          {column.id}
        </DropdownMenu.CheckboxItem>
      {/each}
    </DropdownMenu.Group>
  </DropdownMenu.Content>
</DropdownMenu.Root>
