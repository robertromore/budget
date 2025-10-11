<script lang="ts">
import {EntitySearchResults, EntityCard} from '$lib/components/shared/search';
import * as Card from '$lib/components/ui/card';
import {Badge} from '$lib/components/ui/badge';
import {Button} from '$lib/components/ui/button';
import {cn, currencyFormatter} from '$lib/utils';
import {highlightMatches} from '$lib/utils/search';
import DollarSign from '@lucide/svelte/icons/dollar-sign';
import AlertTriangle from '@lucide/svelte/icons/alert-triangle';
import CheckCircle2 from '@lucide/svelte/icons/check-circle-2';
import Wallet from '@lucide/svelte/icons/wallet';
import Target from '@lucide/svelte/icons/target';
import Repeat from '@lucide/svelte/icons/repeat';
import Copy from '@lucide/svelte/icons/copy';
import Pencil from '@lucide/svelte/icons/pencil';
import Trash2 from '@lucide/svelte/icons/trash-2';
import type {BudgetWithRelations} from '$lib/server/domains/budgets';
import {calculateActualSpent} from '$lib/utils/budget-calculations';
import BudgetProgress from '$lib/components/budgets/budget-progress.svelte';
import BudgetDataTableContainer from '../budget-data-table-container.svelte';

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
</script>

<EntitySearchResults
  entities={budgets}
  {isLoading}
  {searchQuery}
  {viewMode}
  emptyIcon={DollarSign}
  emptyTitle="No budgets found"
  emptyDescription="Try adjusting your filters or search terms"
  onView={onView}
  onEdit={onEdit}
  onDelete={onDelete}
  onBulkDelete={onBulkDelete}
>
  {#snippet gridCard(budget)}
    {@const TypeIcon = getBudgetTypeIcon(budget.type)}
    {@const budgetStatus = getBudgetStatus(budget)}
    {@const statusDisplay = getStatusDisplay(budgetStatus)}
    {@const allocated = getAllocated(budget)}
    {@const consumed = getConsumed(budget)}
    {@const remaining = getRemaining(budget)}

    <EntityCard
      entity={budget}
      {onView}
      {onEdit}
      {onDelete}
      viewButtonLabel="View"
      showAnalyticsButton={false}
      cardClass={cn(budget.status !== 'active' && "opacity-75")}
    >
      {#snippet header(b)}
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
        <Card.Title class="flex items-start gap-2 pr-24 min-w-0">
          <TypeIcon class="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
          <div class="min-w-0 flex-1 overflow-hidden">
            <a
              href="/budgets/{b.slug}"
              class="font-medium truncate hover:underline block"
            >
              {@html highlightMatches(b.name || 'Unnamed Budget', searchQuery)}
            </a>
            <div class="text-xs text-muted-foreground mt-0.5 truncate">
              {formatBudgetType(b.type)}
            </div>
          </div>
        </Card.Title>

        {#if b.description}
          <Card.Description>
            <span class="text-sm line-clamp-2">
              {@html highlightMatches(
                b.description.length > 100 ? b.description.substring(0, 100) + '...' : b.description,
                searchQuery
              )}
            </span>
          </Card.Description>
        {/if}
      {/snippet}

      {#snippet content(b)}
        <!-- Budget Amounts -->
        <div class="space-y-2">
          <div class="flex justify-between text-sm gap-2 min-w-0">
            <span class="text-muted-foreground flex-shrink-0">Allocated:</span>
            <span class="font-medium truncate text-right">{currencyFormatter.format(allocated)}</span>
          </div>
          <div class="flex justify-between text-sm gap-2 min-w-0">
            <span class="text-muted-foreground flex-shrink-0">Consumed:</span>
            <span class="font-medium truncate text-right">{currencyFormatter.format(consumed)}</span>
          </div>
          <div class="flex justify-between text-sm gap-2 min-w-0">
            <span class="text-muted-foreground flex-shrink-0">Remaining:</span>
            <span class={cn("font-medium truncate text-right", remaining < 0 && "text-destructive")}>
              {currencyFormatter.format(remaining)}
            </span>
          </div>
        </div>

        <!-- Progress Bar -->
        <BudgetProgress
          {consumed}
          {allocated}
          status={budgetStatus}
          enforcementLevel={b.enforcementLevel ?? 'warning'}
          label=""
        />
      {/snippet}

      {#snippet badges(b)}
        <!-- Scope and Status Badges -->
        <div class="flex items-center gap-2 flex-wrap">
          <Badge variant="secondary" class="text-xs">
            {b.scope.charAt(0).toUpperCase() + b.scope.slice(1)}
          </Badge>
          {#if b.status !== 'active'}
            <Badge variant="outline" class="text-xs">
              {b.status.charAt(0).toUpperCase() + b.status.slice(1)}
            </Badge>
          {/if}
        </div>
      {/snippet}

      {#snippet footer(b)}
        <Button
          onclick={() => onView(b)}
          variant="outline"
          size="sm"
          class="flex-1"
          aria-label="View budget {b.name}">
          <DollarSign class="mr-1 h-3 w-3" />
          View
        </Button>

        <Button
          onclick={() => onEdit(b)}
          variant="outline"
          size="sm"
          aria-label="Edit budget {b.name}">
          <Pencil class="h-3 w-3" />
        </Button>

        <Button
          onclick={() => onDuplicate(b)}
          variant="outline"
          size="sm"
          aria-label="Duplicate budget {b.name}">
          <Copy class="h-3 w-3" />
        </Button>

        <Button
          onclick={() => onDelete(b)}
          variant="outline"
          size="sm"
          class="text-destructive hover:text-destructive"
          aria-label="Delete budget {b.name}">
          <Trash2 class="h-3 w-3" />
        </Button>
      {/snippet}
    </EntityCard>
  {/snippet}

  {#snippet listView()}
    <!-- List View with Data Table -->
    <BudgetDataTableContainer
      {isLoading}
      {budgets}
      {onView}
      {onEdit}
      {onDelete}
      {onDuplicate}
      {onArchive}
      {onBulkDelete}
      {onBulkArchive}
      bind:table
    />
  {/snippet}
</EntitySearchResults>

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
