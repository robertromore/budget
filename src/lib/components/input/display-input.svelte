<script lang="ts">
  import * as DropdownMenu from "$lib/components/ui/dropdown-menu";
  import * as Select from "$lib/components/ui/select";
  import * as Popover from "$lib/components/ui/popover";
  import { buttonVariants } from "$lib/components/ui/button";
  import SlidersHorizontal from "@lucide/svelte/icons/sliders-horizontal";
  import { cn } from "$lib/utils";
  import { Label } from "../ui/label";
  import { currentViews } from "$lib/stores/ui/current-views.svelte";
  import { Badge } from "../ui/badge";
  import type { SortingState, VisibilityState } from "@tanstack/table-core";
  import ChevronDown from "@lucide/svelte/icons/chevron-down";
  import CircleChevronUp from "@lucide/svelte/icons/chevron-up";
  import CircleChevronDown from "@lucide/svelte/icons/chevron-down";
  import { Switch } from "$lib/components/ui/switch";

  const currentView = $derived(currentViews.get().activeView);
  const table = $derived(currentView.table);
  const groupableColumns = $derived(table.getAllColumns().filter((column) => column.getCanGroup()));
  const sortableColumns = $derived(table.getAllColumns().filter((column) => column.getCanSort()));
  const visiableColumns = $derived(table.getAllColumns().filter((column) => column.getCanHide()));

  const grouping = $derived(currentView.view.getGrouping());
  const sorting = $derived(currentView.view.getSorting());
  const visibility = $derived(currentView.view.getVisibility());
  const visibleColumns = $derived(visiableColumns.filter(column => !Object.keys(visibility).includes(column.id) || visibility[column.id] === true))
</script>

<Popover.Root>
  <Popover.Trigger class={cn(buttonVariants({ variant: "outline" }), "h-8")}>
    <SlidersHorizontal />
    Display
  </Popover.Trigger>
  <Popover.Content class="w-80">
    <div class="grid gap-2">
      <div class="grid grid-cols-3 items-center gap-4">
        <Label for="grouping">Grouping</Label>
        <Select.Root
          type="multiple"
          name="grouping"
          value={currentView.view.getGrouping()}
          onValueChange={(value) => {
            currentView.updateTableGrouping(value);
          }}
        >
          <Select.Trigger class="w-[180px]">
            {#if grouping.length === 0}
              <Badge variant="secondary">none selected</Badge>
            {:else}
              <div class="hidden space-x-1 lg:flex">
                {#if grouping.length > 2}
                  <Badge variant="secondary" class="rounded-sm px-1 font-normal">
                    {grouping.length} selected
                  </Badge>
                {:else}
                  {#each groupableColumns.filter( (column) => grouping.includes(column.id) ) as groupableColumn}
                    <Badge variant="secondary" class="rounded-sm px-1 font-normal">
                      {groupableColumn.columnDef.meta?.label}
                    </Badge>
                  {/each}
                {/if}
              </div>
            {/if}
          </Select.Trigger>
          <Select.Content>
            <Select.Group>
              {#each groupableColumns as column}
                <Select.Item value={column.id} label={column.columnDef.meta?.label}>
                  {column.columnDef.meta?.label}
                </Select.Item>
              {/each}
            </Select.Group>
          </Select.Content>
        </Select.Root>
      </div>
      <div class="grid grid-cols-3 items-center gap-4">
        <Label>Sorting</Label>
        <DropdownMenu.Root>
          <DropdownMenu.Trigger
            class={cn(
              "flex h-9 w-[180px] items-center justify-between whitespace-nowrap rounded-md border border-input bg-transparent px-3 py-2 text-sm text-muted-foreground shadow-sm ring-offset-background focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1"
            )}
          >
            {#if sorting.length === 0}
              <Badge variant="secondary">none selected</Badge>
            {:else}
              <div class="hidden space-x-1 lg:flex">
                {#if sorting.length > 2}
                  <Badge variant="secondary" class="rounded-sm px-1 text-xs font-semibold">
                    {sorting.length} selected
                  </Badge>
                {:else}
                  {#each sorting as sort}
                    {@const col = sortableColumns.find((column) => sort.id === column.id)}
                    {#if col}
                      <Badge variant="secondary" class="rounded-sm px-1 text-xs font-semibold">
                        {col.columnDef.meta?.label}
                        {#if sort.desc}
                          <CircleChevronDown class="ml-1 size-4" />
                        {:else}
                          <CircleChevronUp class="ml-1 size-4" />
                        {/if}
                      </Badge>
                    {/if}
                  {/each}
                {/if}
              </div>
            {/if}
            <ChevronDown class="size-4 opacity-50" />
          </DropdownMenu.Trigger>
          <DropdownMenu.Content>
            <DropdownMenu.Group>
              {#each sortableColumns as column}
                <DropdownMenu.Item
                  onSelect={() => {
                    let newState = currentView.view.getSorting();
                    if (!sorting.find((sorter) => sorter.id === column.id)) {
                      newState.push({
                        id: column.id,
                        desc: false,
                      });
                    } else {
                      newState = newState
                        .map((sorter) => {
                          if (sorter.id !== column.id) {
                            return sorter;
                          }
                          if (sorter.desc === true) {
                            return false;
                          }
                          if (sorter.desc === false) {
                            return Object.assign({}, sorter, { desc: true });
                          }
                          return {
                            id: column.id,
                            desc: false,
                          };
                        })
                        .filter(Boolean) as SortingState;
                    }
                    currentView.updateTableSorting(newState);
                  }}
                  closeOnSelect={false}
                >
                  {column.columnDef.meta?.label}
                  {@const sorter = sorting.find((sort) => sort.id === column.id)}
                  {#if sorter && sorter.desc}
                    <CircleChevronDown class="absolute right-0 mr-1" />
                  {:else if sorter && !sorter.desc}
                    <CircleChevronUp class="absolute right-0 mr-1" />
                  {/if}
                </DropdownMenu.Item>
              {/each}
            </DropdownMenu.Group>
          </DropdownMenu.Content>
        </DropdownMenu.Root>
      </div>
      <div class="grid grid-cols-3 items-center gap-4">
        <Label>Visibility</Label>
        <Select.Root
          type="multiple"
          name="visibility"
          value={visibleColumns.map(visibleColumn => visibleColumn.id)}
          onValueChange={(value) => {
            const visibility = Object.assign(
              {},
              ...visiableColumns.map(column => {
                return {[column.id as string]: false};
              }),
              ...value.map(id => {
                return {[id as string]: true};
              })
            ) as VisibilityState;
            currentView.updateTableVisibility(visibility);
          }}
        >
          <Select.Trigger class="w-[180px] text-muted-foreground">
            {#if visibleColumns.length === 0}
              <Badge variant="secondary">none selected</Badge>
            {:else}
              <div class="hidden space-x-1 lg:flex">
                {#if visibleColumns.length > 2}
                  <Badge variant="secondary" class="rounded-sm px-1 font-normal">
                    {visibleColumns.length} selected
                  </Badge>
                {:else}
                  {#each visibleColumns as visibleColumn}
                    <Badge variant="secondary" class="rounded-sm px-1 font-normal">
                      {visibleColumn.columnDef.meta?.label}
                    </Badge>
                  {/each}
                {/if}
              </div>
            {/if}
          </Select.Trigger>
          <Select.Content>
            <Select.Group>
              {#each visiableColumns as column}
                <Select.Item value={column.id} label={column.columnDef.meta?.label}>
                  {column.columnDef.meta?.label}
                </Select.Item>
              {/each}
            </Select.Group>
          </Select.Content>
        </Select.Root>
      </div>
    </div>
    <div class="mt-4 flex justify-start">
      <Switch
        id="expand-all"
        checked={typeof currentView.view.getExpanded() === "boolean" &&
          (currentView.view.getExpanded() as boolean)}
        onCheckedChange={(checked) => {
          currentView.updateTableAllRowsExpanded(checked ? true : {});
        }}
        aria-labelledby="Expand all rows"
        disabled={grouping.length === 0}
      />
      <Label
        for="expand-all"
        class="ml-1 text-sm font-medium peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
      >
        Expand All
      </Label>
    </div>
  </Popover.Content>
</Popover.Root>
