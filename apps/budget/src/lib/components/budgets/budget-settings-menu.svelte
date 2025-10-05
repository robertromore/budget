<script lang="ts">
  import {Settings, Edit, Copy, Archive, Trash2, Download, RefreshCw} from "@lucide/svelte/icons";
  import * as DropdownMenu from "$lib/components/ui/dropdown-menu";
  import {Button} from "$lib/components/ui/button";
  import type {BudgetWithRelations} from "$lib/server/domains/budgets";

  interface Props {
    budget: BudgetWithRelations;
    class?: string;
  }

  let {
    budget,
    class: className,
  }: Props = $props();

  function handleEditBudget() {
    // TODO: Open budget edit dialog
  }

  function handleDuplicateBudget() {
    // TODO: Implement budget duplication
  }

  function handleArchiveBudget() {
    // TODO: Implement budget archiving
  }

  function handleDeleteBudget() {
    // TODO: Implement budget deletion with confirmation
  }

  function handleExportBudget() {
    // TODO: Implement budget export (CSV/JSON)
  }

  function handleRefreshBudget() {
    // TODO: Implement budget data refresh
  }
</script>

<DropdownMenu.Root>
  <DropdownMenu.Trigger class={className}>
    <Button variant="outline" size="sm">
      <Settings class="h-4 w-4 mr-2" />
      Settings
    </Button>
  </DropdownMenu.Trigger>
  <DropdownMenu.Content align="end" class="w-48">
    <DropdownMenu.Label>Budget Actions</DropdownMenu.Label>
    <DropdownMenu.Separator />

    <DropdownMenu.Item onclick={handleEditBudget}>
      <Edit class="h-4 w-4 mr-2" />
      Edit Budget
    </DropdownMenu.Item>

    <DropdownMenu.Item onclick={handleDuplicateBudget}>
      <Copy class="h-4 w-4 mr-2" />
      Duplicate
    </DropdownMenu.Item>

    <DropdownMenu.Item onclick={handleRefreshBudget}>
      <RefreshCw class="h-4 w-4 mr-2" />
      Refresh Data
    </DropdownMenu.Item>

    <DropdownMenu.Separator />

    <DropdownMenu.Item onclick={handleExportBudget}>
      <Download class="h-4 w-4 mr-2" />
      Export Data
    </DropdownMenu.Item>

    <DropdownMenu.Separator />

    {#if budget.status === "active"}
      <DropdownMenu.Item onclick={handleArchiveBudget}>
        <Archive class="h-4 w-4 mr-2" />
        Archive Budget
      </DropdownMenu.Item>
    {/if}

    <DropdownMenu.Item onclick={handleDeleteBudget} class="text-destructive focus:text-destructive">
      <Trash2 class="h-4 w-4 mr-2" />
      Delete Budget
    </DropdownMenu.Item>
  </DropdownMenu.Content>
</DropdownMenu.Root>