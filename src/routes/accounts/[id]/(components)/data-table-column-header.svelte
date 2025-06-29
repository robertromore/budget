<script lang="ts" generics="TData, TValue">
  import EyeNone from "@lucide/svelte/icons/eye-off";
  import ArrowDown from "@lucide/svelte/icons/arrow-down";
  import ArrowUp from "@lucide/svelte/icons/arrow-up";
  import ArrowUpDown from "@lucide/svelte/icons/arrow-up-down";
  import type { HTMLAttributes } from "svelte/elements";
  import type { Column } from "@tanstack/table-core";
  import type { WithoutChildren } from "bits-ui";
  import { cn } from "$lib/utils.js";
  import * as DropdownMenu from "$lib/components/ui/dropdown-menu";
  import Button, { buttonVariants } from "$lib/components/ui/button/button.svelte";
  import { currentViews } from "$lib/states/current-views.svelte";

  type Props = HTMLAttributes<HTMLDivElement> & {
    column: Column<TData, TValue>;
    title: string;
  };

  let { column, class: className, title, ...restProps }: WithoutChildren<Props> = $props();

  const currentView = $derived(currentViews.get().activeView);
  const sortState = $derived(
    currentView.view.getSorting().find((sorter) => sorter.id === column.id)
  );
</script>

{#if !column?.getCanSort() && !column?.getCanHide()}
  <div class={cn(buttonVariants({ variant: "ghost", size: "sm" }), className)} {...restProps}>
    {title}
  </div>
{:else}
  <div class={cn("flex items-center", className)} {...restProps}>
    <DropdownMenu.Root>
      <DropdownMenu.Trigger>
        {#snippet child({ props })}
          <Button
            {...props}
            variant="ghost"
            size="sm"
            class="-ml-3 h-8 data-[state=open]:bg-accent"
          >
            <span>
              {title}
            </span>
            {#if column.getCanSort()}
              {#if sortState && sortState.desc}
                <ArrowDown class="ml-2 size-4" />
              {:else if sortState && !sortState.desc}
                <ArrowUp class="ml-2 size-4" />
              {:else}
                <ArrowUpDown class="ml-2 size-4" />
              {/if}
            {/if}
          </Button>
        {/snippet}
      </DropdownMenu.Trigger>
      <DropdownMenu.Content align="start">
        {#if column.getCanSort()}
          <DropdownMenu.Item onclick={() => currentView.updateTableSorter(column.id, false)}>
            <ArrowUp class="mr-2 size-3.5 text-muted-foreground/70" />
            Asc
          </DropdownMenu.Item>
          <DropdownMenu.Item onclick={() => currentView.updateTableSorter(column.id, true)}>
            <ArrowDown class="mr-2 size-3.5 text-muted-foreground/70" />
            Desc
          </DropdownMenu.Item>
          <DropdownMenu.Separator />
        {/if}
        <DropdownMenu.Item onclick={() => currentView.updateColumnVisibility(column.id, false)}>
          <EyeNone class="mr-2 size-3.5 text-muted-foreground/70" />
          Hide
        </DropdownMenu.Item>
      </DropdownMenu.Content>
    </DropdownMenu.Root>
  </div>
{/if}
