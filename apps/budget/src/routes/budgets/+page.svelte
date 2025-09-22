<script lang="ts">
  import { Button } from '$lib/components/ui/button';
  import * as Card from '$lib/components/ui/card';
  import { Badge } from '$lib/components/ui/badge';
  import { Separator } from '$lib/components/ui/separator';
  import * as AlertDialog from '$lib/components/ui/alert-dialog';
  import type { Budget, BudgetGroup } from '$lib/schema/budgets';
  import { managingBudgetId, newBudgetDialog, deleteBudgetDialog, deleteBudgetId } from '$lib/states/ui/global.svelte';
  import { BudgetsState } from '$lib/states/budgets.svelte';
  import { formatCurrency } from '$lib/utils/formatters';
  import { Wallet, Edit, Trash, Plus, Target, Calendar, Repeat } from '@lucide/svelte';

  // Get existing budgets state from layout context
  const budgetsState = BudgetsState.get();
  const budgets: Budget[] = $derived(budgetsState.all);
  const groups: BudgetGroup[] = $derived(budgetsState.allGroups);

  // Delete confirmation dialog state
  let deleteDialogOpen = $state(false);
  let budgetToDelete = $state<Budget | null>(null);

  // Helper function to get budget type info
  function getBudgetTypeInfo(type: Budget['type']) {
    switch (type) {
      case 'account-monthly':
        return {
          label: 'Monthly Budget',
          icon: Calendar,
          color: 'hsl(var(--blue))',
          description: 'Monthly spending limit'
        };
      case 'category-envelope':
        return {
          label: 'Envelope Budget',
          icon: Wallet,
          color: 'hsl(var(--green))',
          description: 'Category-based allocation'
        };
      case 'goal-based':
        return {
          label: 'Goal Budget',
          icon: Target,
          color: 'hsl(var(--purple))',
          description: 'Savings or spending goal'
        };
      case 'scheduled-expense':
        return {
          label: 'Scheduled Budget',
          icon: Repeat,
          color: 'hsl(var(--orange))',
          description: 'Recurring expense planning'
        };
      default:
        return {
          label: 'Budget',
          icon: Wallet,
          color: 'hsl(var(--muted-foreground))',
          description: 'Budget'
        };
    }
  }

  // Helper function to get status color
  function getStatusVariant(status: Budget['status']) {
    switch (status) {
      case 'active':
        return 'default';
      case 'inactive':
        return 'secondary';
      case 'archived':
        return 'outline';
      default:
        return 'secondary';
    }
  }

  // Helper function to get enforcement level badge
  function getEnforcementInfo(level: Budget['enforcementLevel']) {
    switch (level) {
      case 'strict':
        return { label: 'Strict', variant: 'destructive' as const };
      case 'warning':
        return { label: 'Warning', variant: 'outline' as const };
      case 'none':
        return { label: 'Tracking', variant: 'secondary' as const };
      default:
        return { label: 'Tracking', variant: 'secondary' as const };
    }
  }

  // Show delete confirmation dialog
  function showDeleteDialog(budget: Budget) {
    budgetToDelete = budget;
    deleteDialogOpen = true;
  }

  // Delete budget after confirmation
  async function confirmDeleteBudget() {
    if (!budgetToDelete) return;

    try {
      await budgetsState.deleteBudget(budgetToDelete.id);
      deleteDialogOpen = false;
      budgetToDelete = null;
    } catch (error) {
      console.error('Failed to delete budget:', error);
      alert('Failed to delete budget. Please try again.');
    }
  }

  // Cancel delete dialog
  function cancelDelete() {
    deleteDialogOpen = false;
    budgetToDelete = null;
  }

  // Group budgets by type for better organization
  const budgetsByType = $derived.by(() => {
    const grouped = new Map<string, Budget[]>();
    for (const budget of budgets) {
      const typeInfo = getBudgetTypeInfo(budget.type);
      if (!grouped.has(budget.type)) {
        grouped.set(budget.type, []);
      }
      grouped.get(budget.type)!.push(budget);
    }
    return grouped;
  });
</script>

<div class="container mx-auto p-6">
  <div class="flex items-center justify-between mb-6">
    <div>
      <h1 class="text-3xl font-bold tracking-tight">Budgets</h1>
      <p class="text-muted-foreground">Manage your spending limits and financial goals</p>
    </div>
    <Button
      onclick={() => {
        managingBudgetId.current = 0;
        newBudgetDialog.current = true;
      }}
    >
      <Plus class="h-4 w-4 mr-2" />
      Create Budget
    </Button>
  </div>

  {#if !budgets || budgets.length === 0}
    <Card.Root class="p-8 text-center">
      <Wallet class="h-12 w-12 mx-auto text-muted-foreground mb-4" />
      <h3 class="text-lg font-semibold mb-2">No budgets yet</h3>
      <p class="text-muted-foreground mb-4">Create your first budget to track spending and achieve your financial goals</p>
      <Button
        onclick={() => {
          managingBudgetId.current = 0;
          newBudgetDialog.current = true;
        }}
      >
        <Plus class="h-4 w-4 mr-2" />
        Create Budget
      </Button>
    </Card.Root>
  {:else}
    <!-- Budget Type Groups -->
    {#each Array.from(budgetsByType.entries()) as [type, typeBudgets]}
      {@const typeInfo = getBudgetTypeInfo(type)}
      <div class="mb-8">
        <div class="flex items-center gap-2 mb-4">
          <typeInfo.icon class="h-5 w-5" style="color: {typeInfo.color}" />
          <h2 class="text-xl font-semibold">{typeInfo.label}s</h2>
          <Badge variant="outline" class="text-xs">
            {typeBudgets.length}
          </Badge>
        </div>

        <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {#each typeBudgets as budget}
            <Card.Root class="hover:shadow-md transition-shadow relative">
              <div class="absolute top-3 right-3 z-10 flex gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  class="h-8 w-8"
                  onclick={() => {
                    managingBudgetId.current = budget.id;
                    newBudgetDialog.current = true;
                  }}
                >
                  <Edit class="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  class="h-8 w-8 text-destructive"
                  onclick={() => showDeleteDialog(budget)}
                >
                  <Trash class="h-4 w-4" />
                </Button>
              </div>

              <a href="/budgets/{budget.id}" class="block">
                <Card.Header class="pb-3 pr-20">
                  <div class="flex-1">
                    <Card.Title class="text-lg hover:text-primary transition-colors">
                      {budget.name}
                    </Card.Title>
                    <div class="flex items-center gap-2 mt-1">
                      <Badge variant={getStatusVariant(budget.status)}>
                        {budget.status}
                      </Badge>
                      {#snippet enforcementBadge()}
                        {@const enforcementInfo = getEnforcementInfo(budget.enforcementLevel)}
                        <Badge variant={enforcementInfo.variant} class="text-xs">
                          {enforcementInfo.label}
                        </Badge>
                      {/snippet}
                      {@render enforcementBadge()}
                    </div>
                  </div>
                </Card.Header>

                <Card.Content class="pt-0">
                  <div class="space-y-3">
                    <!-- Budget Description -->
                    {#if budget.description}
                      <p class="text-sm text-muted-foreground line-clamp-2">
                        {budget.description}
                      </p>
                    {/if}

                    <Separator />

                    <!-- Budget Scope -->
                    <div class="flex items-center gap-2 text-sm">
                      <span class="text-muted-foreground">Scope:</span>
                      <Badge variant="outline" class="text-xs capitalize">
                        {budget.scope}
                      </Badge>
                    </div>

                    <!-- Budget Metadata (type-specific info) -->
                    {#if budget.metadata && Object.keys(budget.metadata).length > 0}
                      <div class="text-xs text-muted-foreground">
                        <div class="flex items-center justify-between">
                          <span>Type-specific settings configured</span>
                          <Badge variant="outline" class="text-xs">
                            {Object.keys(budget.metadata).length} setting{Object.keys(budget.metadata).length !== 1 ? 's' : ''}
                          </Badge>
                        </div>
                      </div>
                    {/if}

                    <!-- Created Date -->
                    <div class="text-xs text-muted-foreground">
                      Created: {new Date(budget.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                </Card.Content>
              </a>
            </Card.Root>
          {/each}
        </div>
      </div>
    {/each}
  {/if}
</div>

<!-- Delete Confirmation Dialog -->
<AlertDialog.Root bind:open={deleteDialogOpen}>
  <AlertDialog.Portal>
    <AlertDialog.Overlay />
    <AlertDialog.Content>
      <AlertDialog.Header>
        <AlertDialog.Title>Delete Budget</AlertDialog.Title>
        <AlertDialog.Description>
          Are you sure you want to delete the budget "{budgetToDelete?.name}"? This action cannot be undone and will remove all associated budget data.
        </AlertDialog.Description>
      </AlertDialog.Header>
      <AlertDialog.Footer>
        <AlertDialog.Cancel onclick={cancelDelete}>Cancel</AlertDialog.Cancel>
        <AlertDialog.Action onclick={confirmDeleteBudget} class="bg-destructive text-destructive-foreground hover:bg-destructive/90">
          Delete
        </AlertDialog.Action>
      </AlertDialog.Footer>
    </AlertDialog.Content>
  </AlertDialog.Portal>
</AlertDialog.Root>