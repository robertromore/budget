<script lang="ts">
  import { Button } from '$lib/components/ui/button';
  import { Badge } from '$lib/components/ui/badge';
  import { BudgetSelector } from '$lib/components/budgets';
  import { BudgetsState } from '$lib/states/budgets.svelte';
  import type { TransactionsFormat } from '$lib/types';
  import { Wallet, Plus } from '@lucide/svelte';
  import { createBudgetTransaction } from '$lib/query/budgets';

  interface Props {
    transaction: TransactionsFormat;
    onBudgetAssign?: (transactionId: number, budgetId: number | null) => void;
  }

  let { transaction, onBudgetAssign }: Props = $props();

  const budgetsState = BudgetsState.get();
  const budgets = $derived(budgetsState.activeBudgets);

  // For now, we'll use mock data for budget assignments since we haven't implemented
  // the budget transaction system yet
  let assignedBudgetId = $state<number | null>(null);
  let isEditing = $state(false);
  let isAssigning = $state(false);

  // Get the assigned budget if any
  const assignedBudget = $derived.by(() => {
    if (!assignedBudgetId) return null;
    return budgetsState.getById(assignedBudgetId);
  });

  function getBudgetTypeColor(type: string): string {
    switch (type) {
      case 'account-monthly':
        return 'hsl(var(--blue))';
      case 'category-envelope':
        return 'hsl(var(--green))';
      case 'goal-based':
        return 'hsl(var(--purple))';
      case 'scheduled-expense':
        return 'hsl(var(--orange))';
      default:
        return 'hsl(var(--muted-foreground))';
    }
  }

  function getBudgetTypeLabel(type: string): string {
    switch (type) {
      case 'account-monthly':
        return 'Monthly';
      case 'category-envelope':
        return 'Envelope';
      case 'goal-based':
        return 'Goal';
      case 'scheduled-expense':
        return 'Scheduled';
      default:
        return type;
    }
  }

  async function handleBudgetSelect(budgetId: number | null) {
    if (budgetId === assignedBudgetId) return;

    isAssigning = true;
    try {
      // TODO: Implement actual budget transaction assignment
      // For now, just update local state
      assignedBudgetId = budgetId;
      onBudgetAssign?.(transaction.id, budgetId);
      isEditing = false;
    } catch (error) {
      console.error('Failed to assign budget:', error);
      // In a real app, show a toast notification
    } finally {
      isAssigning = false;
    }
  }

  function handleEditClick() {
    isEditing = true;
  }

  function handleCancel() {
    isEditing = false;
  }

  // Filter budgets that might apply to this transaction
  const applicableBudgets = $derived.by(() => {
    return budgets.filter(budget => {
      // For account-scoped budgets, check if the transaction's account matches
      if (budget.scope === 'account') {
        // TODO: Check budget-account associations
        return true; // For now, show all
      }

      // For category-scoped budgets, check if the transaction's category matches
      if (budget.scope === 'category' && transaction.categoryId) {
        // TODO: Check budget-category associations
        return true; // For now, show all
      }

      // Global budgets apply to all transactions
      if (budget.scope === 'global') {
        return true;
      }

      // Mixed scope budgets have complex rules
      if (budget.scope === 'mixed') {
        return true; // For now, show all
      }

      return false;
    });
  });
</script>

<div class="flex items-center gap-2 min-h-[32px]">
  {#if isEditing}
    <div class="flex items-center gap-2 min-w-[200px]">
      <BudgetSelector
        budgets={applicableBudgets}
        selectedBudgetId={assignedBudgetId}
        onSelect={handleBudgetSelect}
        placeholder="Assign to budget..."
        allowClear={true}
        disabled={isAssigning}
        class="flex-1"
      />
      <Button
        variant="ghost"
        size="sm"
        onclick={handleCancel}
        disabled={isAssigning}
        class="px-2"
      >
        Cancel
      </Button>
    </div>
  {:else if assignedBudget}
    <Button
      variant="ghost"
      size="sm"
      onclick={handleEditClick}
      class="h-auto p-1 hover:bg-accent"
    >
      <Badge
        variant="outline"
        style="border-color: {getBudgetTypeColor(assignedBudget.type)}; color: {getBudgetTypeColor(assignedBudget.type)}"
        class="text-xs"
      >
        {getBudgetTypeLabel(assignedBudget.type)}
      </Badge>
      <span class="ml-2 text-sm truncate max-w-[120px]">
        {assignedBudget.name}
      </span>
    </Button>
  {:else}
    <Button
      variant="ghost"
      size="sm"
      onclick={handleEditClick}
      class="text-muted-foreground hover:text-foreground"
    >
      <Plus class="h-3 w-3 mr-1" />
      <span class="text-xs">Assign Budget</span>
    </Button>
  {/if}
</div>