<script lang="ts">
  import {Settings, Edit, Copy, Archive, Trash2, Download, RefreshCw} from "@lucide/svelte/icons";
  import * as DropdownMenu from "$lib/components/ui/dropdown-menu";
  import {Button} from "$lib/components/ui/button";
  import type {BudgetWithRelations} from "$lib/server/domains/budgets";
  import {duplicateBudget, updateBudget, deleteBudget} from "$lib/query/budgets";
  import {goto} from "$app/navigation";
  import {toast} from "svelte-sonner";

  interface Props {
    budget: BudgetWithRelations;
    class?: string;
  }

  let {
    budget,
    class: className,
  }: Props = $props();

  function handleEditBudget() {
    // Navigate to edit page
    goto(`/budgets/${budget.slug}/edit`);
  }

  async function handleDuplicateBudget() {
    try {
      const result = await duplicateBudget.execute({
        id: budget.id,
        newName: `${budget.name} (Copy)`,
      });

      toast.success("Budget duplicated successfully");

      // Navigate to the new budget
      if (result?.slug) {
        goto(`/budgets/${result.slug}`);
      }
    } catch (error) {
      console.error("Failed to duplicate budget:", error);
      toast.error("Failed to duplicate budget");
    }
  }

  async function handleArchiveBudget() {
    try {
      await updateBudget.execute({
        id: budget.id,
        data: {
          status: "archived",
        },
      });

      toast.success("Budget archived successfully");
    } catch (error) {
      console.error("Failed to archive budget:", error);
      toast.error("Failed to archive budget");
    }
  }

  async function handleDeleteBudget() {
    if (!confirm(`Are you sure you want to delete "${budget.name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      await deleteBudget.execute(budget.id);
      toast.success("Budget deleted successfully");
      goto("/budgets");
    } catch (error) {
      console.error("Failed to delete budget:", error);
      toast.error("Failed to delete budget");
    }
  }

  function handleExportBudget() {
    // Export budget data as JSON
    const exportData = {
      budget: {
        name: budget.name,
        type: budget.type,
        scope: budget.scope,
        status: budget.status,
        enforcementLevel: budget.enforcementLevel,
        metadata: budget.metadata,
      },
      accounts: budget.accounts?.map(a => a.account?.name),
      categories: budget.categories?.map(c => c.category?.name),
      periodTemplates: budget.periodTemplates,
    };

    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], {type: "application/json"});
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${budget.slug}-export.json`;
    link.click();
    URL.revokeObjectURL(url);

    toast.success("Budget data exported successfully");
  }

  async function handleRefreshBudget() {
    // Refresh budget data by invalidating query cache
    try {
      // Trigger a cache invalidation and refetch
      window.location.reload();
      toast.success("Budget data refreshed");
    } catch (error) {
      console.error("Failed to refresh budget:", error);
      toast.error("Failed to refresh budget data");
    }
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