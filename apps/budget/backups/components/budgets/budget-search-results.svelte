<script lang="ts">
import { Badge } from '$lib/components/ui/badge';
import { Button } from '$lib/components/ui/button';
import * as Card from '$lib/components/ui/card';
import { Skeleton } from '$lib/components/ui/skeleton';
import type { BudgetWithRelations } from '$lib/server/domains/budgets';
import { cn, currencyFormatter } from '$lib/utils';
import { calculateActualSpent } from '$lib/utils/budget-calculations';
import AlertTriangle from '@lucide/svelte/icons/alert-triangle';
import CheckCircle2 from '@lucide/svelte/icons/check-circle-2';
import Copy from '@lucide/svelte/icons/copy';
import DollarSign from '@lucide/svelte/icons/dollar-sign';
import Pencil from '@lucide/svelte/icons/pencil';
import Repeat from '@lucide/svelte/icons/repeat';
import Target from '@lucide/svelte/icons/target';
import Trash2 from '@lucide/svelte/icons/trash-2';
import Wallet from '@lucide/svelte/icons/wallet';
import BudgetDataTableContainer from '../../../routes/budgets/(components)/budget-data-table-container.svelte';
import { columns } from '../../../routes/budgets/(data)/columns.svelte';
import BudgetProgress from './budget-progress.svelte';

export type ViewMode = 'list' | 'grid';

interface Props {
  budgets: BudgetWithRelations[];
  isLoading: boolean;
  searchQuery: string;
  viewMode?: ViewMode;
  onView: (budget: BudgetWithRelations) => void;
  onEdit: (budget: BudgetWithRelations) => void;
  onDelete: (budget: BudgetWithRelations) => void;
  onDuplicate: (budget: BudgetWithRelations) => void;
  onArchive: (budget: BudgetWithRelations) => void;
  onBulkDelete: (budgets: BudgetWithRelations[]) => void;
  onBulkArchive: (budgets: BudgetWithRelations[]) => void;
}

let {
  budgets,
  isLoading,
  searchQuery,
  viewMode = 'grid',
  onView,
  onEdit,
  onDelete,
  onDuplicate,
  onArchive,
  onBulkDelete,
  onBulkArchive
}: Props = $props();

// Table binding for list view
let table = $state<any>();

function getAllocated(budget: BudgetWithRelations): number {
  const templates = budget.periodTemplates ?? [];
  const periods = templates.flatMap((template) => template.periods ?? []);
  if (!periods.length) return 0;

  const latest = periods.reduce((latest, current) =>
    latest.endDate > current.endDate ? latest : current
  );

  if (latest) return Math.abs(latest.allocatedAmount ?? 0);
  return Math.abs((budget.metadata as Record<string, unknown>)?.['allocatedAmount'] as number ?? 0);
}

function getConsumed(budget: BudgetWithRelations): number {
  return calculateActualSpent(budget);
}

function getRemaining(budget: BudgetWithRelations): number {
  return getAllocated(budget) - getConsumed(budget);
}

function getBudgetStatus(budget: BudgetWithRelations): 'on_track' | 'approaching' | 'over' | 'paused' {
  if (budget.status !== 'active') return 'paused';
  const allocated = getAllocated(budget);
  const consumed = getConsumed(budget);
  if (!allocated) return 'paused';

  const ratio = consumed / allocated;
  if (ratio > 1) return 'over';
  if (ratio >= 0.8) return 'approaching';
  return 'on_track';
}

function getStatusDisplay(status: string) {
  switch (status) {
    case 'on_track':
      return { icon: CheckCircle2, color: 'text-green-600', bgColor: 'bg-green-50 dark:bg-green-950', label: 'On Track' };
    case 'approaching':
      return { icon: AlertTriangle, color: 'text-orange-600', bgColor: 'bg-orange-50 dark:bg-orange-950', label: 'Approaching Limit' };
    case 'over':
      return { icon: AlertTriangle, color: 'text-red-600', bgColor: 'bg-red-50 dark:bg-red-950', label: 'Over Budget' };
    case 'paused':
      return { icon: AlertTriangle, color: 'text-gray-600', bgColor: 'bg-gray-50 dark:bg-gray-950', label: 'Paused' };
    default:
      return { icon: CheckCircle2, color: 'text-green-600', bgColor: 'bg-green-50 dark:bg-green-950', label: 'On Track' };
  }
}

function getBudgetTypeIcon(type: string) {
  switch (type) {
    case 'account-monthly':
      return Wallet;
    case 'category-envelope':
      return DollarSign;
    case 'goal-based':
      return Target;
    case 'scheduled-expense':
      return Repeat;
    default:
      return DollarSign;
  }
}

function formatBudgetType(type: string) {
  return type.replace('-', ' ').replace(/\b\w/g, (l) => l.toUpperCase());
}

function highlightMatches(text: string, query: string) {
  if (!query || !text) return text;

  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  return text.replace(regex, '<mark class="bg-yellow-200 dark:bg-yellow-800 rounded px-1">$1</mark>');
}
</script>

{#if isLoading}
  <!-- Loading State -->
  {#if viewMode === 'grid'}
    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
      {#each Array(8) as _}
        <Card.Root>
          <Card.Header>
            <Skeleton class="h-6 w-3/4" />
            <Skeleton class="h-4 w-full" />
          </Card.Header>
          <Card.Content>
            <div class="space-y-2">
              <Skeleton class="h-4 w-1/2" />
              <Skeleton class="h-4 w-2/3" />
            </div>
          </Card.Content>
          <Card.Footer>
            <div class="flex gap-2">
              <Skeleton class="h-8 w-16" />
              <Skeleton class="h-8 w-16" />
              <Skeleton class="h-8 w-16" />
            </div>
          </Card.Footer>
        </Card.Root>
      {/each}
    </div>
  {:else}
    <div class="rounded-md border">
      <div class="p-12 text-center">
        <Skeleton class="mx-auto h-8 w-48" />
      </div>
    </div>
  {/if}
{:else if budgets.length === 0}
  <!-- Empty State -->
  <div class="text-center py-12">
    <DollarSign class="mx-auto h-12 w-12 text-muted-foreground mb-4" />
    <h3 class="text-lg font-medium text-muted-foreground mb-2">No budgets found</h3>
    <p class="text-sm text-muted-foreground">
      {#if searchQuery}
        No budgets match your search criteria for "{searchQuery}".
      {:else}
        Try adjusting your filters or search terms.
      {/if}
    </p>
  </div>
{:else if viewMode === 'grid'}
  <!-- Results Grid -->
  <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
    {#each budgets as budget (budget.id)}
      {@const TypeIcon = getBudgetTypeIcon(budget.type)}
      {@const budgetStatus = getBudgetStatus(budget)}
      {@const statusDisplay = getStatusDisplay(budgetStatus)}
      {@const allocated = getAllocated(budget)}
      {@const consumed = getConsumed(budget)}
      {@const remaining = getRemaining(budget)}

      <Card.Root class={cn(
        "relative transition-all duration-200 hover:shadow-md",
        budget.status !== 'active' && "opacity-75"
      )}>
        <Card.Header class="pb-3">
          <!-- Status Badge -->
          <div class="absolute top-3 right-3">
            <Badge
              variant="outline"
              class={cn("text-xs", statusDisplay.color, statusDisplay.bgColor)}>
              <statusDisplay.icon class="mr-1 h-3 w-3" />
              {statusDisplay.label}
            </Badge>
          </div>

          <!-- Name and Type -->
          <Card.Title class="flex items-start gap-2 pr-24">
            <TypeIcon class="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
            <div class="min-w-0 flex-1">
              <a
                href="/budgets/{budget.slug}"
                class="font-medium truncate hover:underline block"
              >
                {@html highlightMatches(budget.name || 'Unnamed Budget', searchQuery)}
              </a>
              <div class="text-xs text-muted-foreground mt-0.5">
                {formatBudgetType(budget.type)}
              </div>
            </div>
          </Card.Title>

          {#if budget.description}
            <Card.Description>
              <span class="text-sm line-clamp-2">
                {@html highlightMatches(
                  budget.description.length > 100 ? budget.description.substring(0, 100) + '...' : budget.description,
                  searchQuery
                )}
              </span>
            </Card.Description>
          {/if}
        </Card.Header>

        <Card.Content class="space-y-3 pb-3">
          <!-- Budget Amounts -->
          <div class="space-y-2">
            <div class="flex justify-between text-sm">
              <span class="text-muted-foreground">Allocated:</span>
              <span class="font-medium">{currencyFormatter.format(allocated)}</span>
            </div>
            <div class="flex justify-between text-sm">
              <span class="text-muted-foreground">Consumed:</span>
              <span class="font-medium">{currencyFormatter.format(consumed)}</span>
            </div>
            <div class="flex justify-between text-sm">
              <span class="text-muted-foreground">Remaining:</span>
              <span class={cn("font-medium", remaining < 0 && "text-destructive")}>
                {currencyFormatter.format(remaining)}
              </span>
            </div>
          </div>

          <!-- Progress Bar -->
          <BudgetProgress
            {consumed}
            {allocated}
            status={budgetStatus}
            enforcementLevel={budget.enforcementLevel ?? 'warning'}
            label=""
          />

          <!-- Scope Badge -->
          <div class="flex items-center gap-2">
            <Badge variant="secondary" class="text-xs">
              {budget.scope.charAt(0).toUpperCase() + budget.scope.slice(1)}
            </Badge>
            {#if budget.status !== 'active'}
              <Badge variant="outline" class="text-xs">
                {budget.status.charAt(0).toUpperCase() + budget.status.slice(1)}
              </Badge>
            {/if}
          </div>
        </Card.Content>

        <Card.Footer class="flex gap-1.5">
          <Button
            onclick={() => onView(budget)}
            variant="outline"
            size="sm"
            class="flex-1"
            aria-label="View budget {budget.name}">
            <DollarSign class="mr-1 h-3 w-3" />
            View
          </Button>

          <Button
            onclick={() => onEdit(budget)}
            variant="outline"
            size="sm"
            aria-label="Edit budget {budget.name}">
            <Pencil class="h-3 w-3" />
          </Button>

          <Button
            onclick={() => onDuplicate(budget)}
            variant="outline"
            size="sm"
            aria-label="Duplicate budget {budget.name}">
            <Copy class="h-3 w-3" />
          </Button>

          <Button
            onclick={() => onDelete(budget)}
            variant="outline"
            size="sm"
            class="text-destructive hover:text-destructive"
            aria-label="Delete budget {budget.name}">
            <Trash2 class="h-3 w-3" />
          </Button>
        </Card.Footer>
      </Card.Root>
    {/each}
  </div>
{:else}
  <!-- List View with Data Table -->
  <BudgetDataTableContainer
    {isLoading}
    {budgets}
    {columns}
    {onView}
    {onEdit}
    {onDelete}
    {onDuplicate}
    {onArchive}
    {onBulkDelete}
    {onBulkArchive}
    bind:table
  />
{/if}

<style>
  .line-clamp-2 {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    word-break: break-word;
  }
</style>
