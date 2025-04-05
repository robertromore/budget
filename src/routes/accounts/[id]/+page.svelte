<script lang="ts">
  import DataTable from "./(components)/data-table.svelte";
  import { columns } from "./(data)/columns.svelte";
  import type { TransactionsFormat } from "$lib/types";
  import AddTransactionDialog from "$lib/components/dialogs/add-transaction-dialog.svelte";
  import { Button } from "$lib/components/ui/button";
  import Plus from "lucide-svelte/icons/plus";
  import Import from "lucide-svelte/icons/import";
  import DeleteTransactionDialog from "$lib/components/dialogs/delete-transaction-dialog.svelte";
  import type { Table } from "@tanstack/table-core";
  import * as DropdownMenu from "$lib/components/ui/dropdown-menu";
  import ChevronDown from "lucide-svelte/icons/chevron-down";
  import { currentAccount, CurrentAccountState } from "$lib/states/current-account.svelte";
  import { categoriesContext } from "$lib/states/categories.svelte";
  import { payeesContext } from "$lib/states/payees.svelte";
  import type { Account } from "$lib/schema";
  import { dateFiltersContext, DateFiltersState } from "$lib/states/date-filters.svelte";

  let { data } = $props();
  const account: Account | undefined = $derived(data.account);
  const currentAccountState: CurrentAccountState = $derived(new CurrentAccountState(data.account));
  const dateFiltersState: DateFiltersState = $derived(new DateFiltersState(data.dates));

  $effect.pre(() => {
    currentAccount.set(currentAccountState);
    dateFiltersContext.set(dateFiltersState);
  });

  const categories = categoriesContext.get();
  const payees = payeesContext.get();

  let addTransactionDialogOpen: boolean = $state(false);
  let deleteTransactionDialogOpen: boolean = $state(false);
  let table: Table<TransactionsFormat> | undefined = $state();
  const selectedTransactions = $derived(
    Object.values(table?.getSelectedRowModel().rowsById ?? {}).map((row) => row.original.id)
  );
</script>

<div class="mb-2 items-center">
  <h1 class="mr-5 text-3xl">{account?.name}</h1>
  <span class="text-sm text-muted-foreground">
    <strong>Balance:</strong>
    {currentAccountState?.balance}
  </span>
</div>

<p class="mb-2 text-sm text-muted-foreground">{account?.notes}</p>

{#if account}
  <AddTransactionDialog bind:dialogOpen={addTransactionDialogOpen} />

  <DeleteTransactionDialog
    transactions={selectedTransactions}
    bind:dialogOpen={deleteTransactionDialogOpen}
    onDelete={() => table?.resetRowSelection()}
  />
{/if}

<div class="flex items-center py-4">
  <Button class="mx-1 h-8" onclick={() => (addTransactionDialogOpen = true)}>
    <Plus class="size-4" />
    Add
  </Button>
  <Button variant="outline" class="mx-1 h-8">
    <Import class="size-4" />
    Import
  </Button>

  <div class="grow"></div>

  <DropdownMenu.Root>
    <DropdownMenu.Trigger>
      {#snippet child({ props })}
        <Button
          {...props}
          variant="outline"
          disabled={selectedTransactions.length === 0}
          class="h-8 p-2"
        >
          <ChevronDown class="mr-1 size-4" />
          {selectedTransactions.length} selected
        </Button>
      {/snippet}
    </DropdownMenu.Trigger>
    <DropdownMenu.Content class="w-40">
      <DropdownMenu.Group>
        <DropdownMenu.Item>
          Archive
          <DropdownMenu.Shortcut>⇧⌘A</DropdownMenu.Shortcut>
        </DropdownMenu.Item>
        <DropdownMenu.Item
          onclick={() => {
            deleteTransactionDialogOpen = true;
          }}
        >
          Delete
          <DropdownMenu.Shortcut>⇧⌘D</DropdownMenu.Shortcut>
        </DropdownMenu.Item>
      </DropdownMenu.Group>
    </DropdownMenu.Content>
  </DropdownMenu.Root>
</div>

<!-- <div class="flex items-center py-0">
  <Input class="max-w-sm" placeholder="Filter..." type="text" bind:value={globalFilter} />

  <div class="grow"></div>
</div> -->

<DataTable
  columns={columns(categories, payees, currentAccountState.updateTransaction)}
  transactions={currentAccountState.formatted}
  bind:table
/>
