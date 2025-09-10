<script lang="ts">
  import * as DropdownMenu from "$lib/components/ui/dropdown-menu";
  import { AccountsState, type AccountSortField, type SortDirection } from "$lib/states/entities/accounts.svelte";
  import buttonVariants, { cn } from "$lib/utils";
  import ArrowDown from "@lucide/svelte/icons/arrow-down";
  import ArrowUp from "@lucide/svelte/icons/arrow-up";
  import Check from "@lucide/svelte/icons/check";

  let {
    size = "default",
    variant = "ghost",
  }: {
    size?: "default" | "sm" | "lg" | "icon";
    variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  } = $props();

  const accountsState = $derived(AccountsState.get());
  const currentSortField = $derived(accountsState.sortField);
  const currentSortDirection = $derived(accountsState.sortDirection);

  const sortOptions: { field: AccountSortField; label: string; description: string }[] = [
    { field: "name", label: "Name", description: "Sort by account name" },
    { field: "balance", label: "Balance", description: "Sort by account balance" },
    { field: "dateOpened", label: "Date Opened", description: "Sort by when account was opened" },
    { field: "status", label: "Status", description: "Sort by active/closed status" },
    { field: "createdAt", label: "Date Created", description: "Sort by creation date" },
  ];

  const getCurrentSortIcon = () => {
    return currentSortDirection === "asc" ? ArrowUp : ArrowDown;
  };

  const handleSort = (field: AccountSortField, direction: SortDirection) => {
    accountsState.setSorting(field, direction);
  };

  const getCurrentSortLabel = () => {
    const option = sortOptions.find(opt => opt.field === currentSortField);
    return `Sorting by: ${option?.label || "Name"}`;
  };
</script>

<DropdownMenu.Root>
  <DropdownMenu.Trigger
    class={cn(
      buttonVariants(variant, size),
      "gap-1 data-[state=open]:bg-accent w-auto",
      size === "icon" ? "w-8 h-8" : "px-2"
    )}
    title={`${getCurrentSortLabel()} (${currentSortDirection === "asc" ? "Ascending" : "Descending"})`}
  >
    {@const SortIcon = getCurrentSortIcon()}
    <SortIcon class="h-4 w-4" />
    {#if size !== "icon"}
      <span class="sr-only sm:not-sr-only sm:whitespace-nowrap text-xs">
        {getCurrentSortLabel()}
      </span>
    {/if}
  </DropdownMenu.Trigger>

  <DropdownMenu.Content align="end" class="w-52">
    <DropdownMenu.Label>Sort accounts by</DropdownMenu.Label>
    <DropdownMenu.Separator />

    {#each sortOptions as option}
      <DropdownMenu.Sub>
        <DropdownMenu.SubTrigger class="gap-2">
          {#if currentSortField === option.field}
            <Check class="h-4 w-4 text-primary" />
          {:else}
            <div class="h-4 w-4"></div>
          {/if}
          <div class="flex flex-col items-start">
            <span>{option.label}</span>
            <span class="text-xs text-muted-foreground">{option.description}</span>
          </div>
        </DropdownMenu.SubTrigger>

        <DropdownMenu.SubContent>
          <DropdownMenu.Item
            class="gap-2"
            onclick={() => handleSort(option.field, "asc")}
          >
            <ArrowUp class="h-4 w-4" />
            <span>Ascending</span>
            {#if currentSortField === option.field && currentSortDirection === "asc"}
              <Check class="h-4 w-4 ml-auto text-primary" />
            {/if}
          </DropdownMenu.Item>

          <DropdownMenu.Item
            class="gap-2"
            onclick={() => handleSort(option.field, "desc")}
          >
            <ArrowDown class="h-4 w-4" />
            <span>Descending</span>
            {#if currentSortField === option.field && currentSortDirection === "desc"}
              <Check class="h-4 w-4 ml-auto text-primary" />
            {/if}
          </DropdownMenu.Item>
        </DropdownMenu.SubContent>
      </DropdownMenu.Sub>
    {/each}
  </DropdownMenu.Content>
</DropdownMenu.Root>
