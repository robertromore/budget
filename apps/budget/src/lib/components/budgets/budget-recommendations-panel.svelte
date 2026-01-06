<script lang="ts">
import { Badge } from '$lib/components/ui/badge';
import { Button } from '$lib/components/ui/button';
import * as Select from '$lib/components/ui/select';
import {
  applyRecommendation,
  dismissRecommendation,
  listRecommendations,
  resetAppliedRecommendation,
} from '$lib/query/budgets';
import type { BudgetRecommendationWithRelations } from '$lib/schema/recommendations';
import { cn } from '$lib/utils';
import Filter from '@lucide/svelte/icons/filter';
import RotateCcw from '@lucide/svelte/icons/rotate-ccw';
import Sparkles from '@lucide/svelte/icons/sparkles';
import Users from '@lucide/svelte/icons/users';
import AnalyzeSpendingSheet from './analyze-spending-sheet.svelte';
import GroupRecommendationPreviewModal from './group-recommendation-preview-modal.svelte';
import { columns } from './recommendations/data/columns.svelte';
import RecommendationDataTable from './recommendations/recommendation-data-table.svelte';
import RecommendationDetailPanel from './recommendations/recommendation-detail-panel.svelte';

interface Props {
  budgetId?: number;
  accountId?: number;
  categoryId?: number;
  budgets?: any[]; // For preview modal
}

let { budgetId, accountId, categoryId, budgets = [] }: Props = $props();

let analyzeDialogOpen = $state(false);
let previewModalOpen = $state(false);
let selectedRecommendation = $state<BudgetRecommendationWithRelations | null>(null);
let typeFilter = $state<string>('all');

// Detail panel state (for sliding view)
let detailRecommendation = $state<BudgetRecommendationWithRelations | null>(null);
const showDetailPanel = $derived(detailRecommendation !== null);

// Build filters - exclude dismissed recommendations
const filters = $derived.by(() => {
  const f: any = {
    status: ['pending', 'applied'] as const, // Exclude dismissed
  };
  if (budgetId) f.budgetId = budgetId;
  if (accountId) f.accountId = accountId;
  if (categoryId) f.categoryId = categoryId;
  return f;
});

const recommendationsQuery = $derived(listRecommendations(filters).options());
const allRecommendations = $derived(recommendationsQuery.data ?? []);
const isLoading = $derived(recommendationsQuery.isLoading);

// Filter recommendations by type
const recommendations = $derived(() => {
  if (typeFilter === 'all') return allRecommendations;

  if (typeFilter === 'groups') {
    return allRecommendations.filter(
      (rec) =>
        rec.type === 'create_budget_group' ||
        rec.type === 'add_to_budget_group' ||
        rec.type === 'merge_budget_groups' ||
        rec.type === 'adjust_group_limit'
    );
  }

  if (typeFilter === 'budgets') {
    return allRecommendations.filter(
      (rec) =>
        rec.type === 'create_budget' ||
        rec.type === 'increase_budget' ||
        rec.type === 'decrease_budget' ||
        rec.type === 'merge_budgets' ||
        rec.type === 'seasonal_adjustment' ||
        rec.type === 'missing_category'
    );
  }

  return allRecommendations;
});

// Count recommendations by type
const groupRecommendationsCount = $derived(
  allRecommendations.filter(
    (rec) =>
      rec.type === 'create_budget_group' ||
      rec.type === 'add_to_budget_group' ||
      rec.type === 'merge_budget_groups' ||
      rec.type === 'adjust_group_limit'
  ).length
);

const budgetRecommendationsCount = $derived(
  allRecommendations.filter(
    (rec) =>
      rec.type === 'create_budget' ||
      rec.type === 'increase_budget' ||
      rec.type === 'decrease_budget' ||
      rec.type === 'merge_budgets' ||
      rec.type === 'seasonal_adjustment' ||
      rec.type === 'missing_category'
  ).length
);

// Count applied recommendations
const appliedRecommendations = $derived(
  allRecommendations.filter((rec) => rec.status === 'applied')
);

// Mutations
const applyMutation = applyRecommendation.options();
const dismissMutation = dismissRecommendation.options();
const resetMutation = resetAppliedRecommendation.options();

function handleApply(recommendation: BudgetRecommendationWithRelations) {
  // Show preview modal for group recommendations
  const isGroupRecommendation =
    recommendation.type === 'create_budget_group' ||
    recommendation.type === 'add_to_budget_group' ||
    recommendation.type === 'merge_budget_groups' ||
    recommendation.type === 'adjust_group_limit';

  if (isGroupRecommendation) {
    selectedRecommendation = recommendation;
    previewModalOpen = true;
  } else {
    applyMutation.mutate(recommendation.id);
  }
}

function handleDismiss(recommendation: BudgetRecommendationWithRelations) {
  dismissMutation.mutate(recommendation.id);
}

function handleReset(recommendation: BudgetRecommendationWithRelations) {
  resetMutation.mutate(recommendation.id);
}

async function handleResetAll() {
  // Reset all recommendations sequentially to avoid SQLite locking
  for (const rec of appliedRecommendations) {
    try {
      await resetMutation.mutateAsync(rec.id);
    } catch (error) {
      console.error(`Failed to reset recommendation ${rec.id}:`, error);
    }
  }
}

async function handleBulkApply(recommendations: BudgetRecommendationWithRelations[]) {
  // Apply all recommendations sequentially to avoid SQLite locking
  for (const rec of recommendations) {
    try {
      await applyMutation.mutateAsync(rec.id);
    } catch (error) {
      console.error(`Failed to apply recommendation ${rec.id}:`, error);
    }
  }
}

async function handleBulkDismiss(recommendations: BudgetRecommendationWithRelations[]) {
  // Dismiss all recommendations sequentially to avoid SQLite locking
  for (const rec of recommendations) {
    try {
      await dismissMutation.mutateAsync(rec.id);
    } catch (error) {
      console.error(`Failed to dismiss recommendation ${rec.id}:`, error);
    }
  }
}

async function handleAcceptGroupRecommendation(recommendationId: number) {
  applyMutation.mutate(recommendationId);
}

async function handleRejectGroupRecommendation(recommendationId: number) {
  dismissMutation.mutate(recommendationId);
}

function handleClosePreviewModal() {
  selectedRecommendation = null;
  previewModalOpen = false;
}

// Detail panel handlers
function handleRowClick(recommendation: BudgetRecommendationWithRelations) {
  detailRecommendation = recommendation;
}

function handleDetailBack() {
  detailRecommendation = null;
}

function handleDetailApply(recommendation: BudgetRecommendationWithRelations) {
  handleApply(recommendation);
  detailRecommendation = null;
}

function handleDetailDismiss(recommendation: BudgetRecommendationWithRelations) {
  handleDismiss(recommendation);
  detailRecommendation = null;
}

// Create columns with handlers
const tableColumns = $derived(columns(handleApply, handleDismiss, handleReset));
</script>

<!-- Sliding container for list/detail views -->
<div class="relative h-full min-h-[400px] flex-1 overflow-hidden">
  <!-- List panel -->
  <div
    class={cn(
      'absolute inset-0 overflow-auto transition-transform duration-200 ease-out',
      showDetailPanel && '-translate-x-full'
    )}
  >
    <div class="space-y-4 p-1">
      <!-- Header -->
      <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div class="flex items-center gap-2">
          <Sparkles class="text-primary h-5 w-5" />
          <h2 class="text-lg font-semibold">Budget Recommendations</h2>
          {#if allRecommendations.length > 0}
            <span class="text-muted-foreground text-sm">
              ({allRecommendations.length} total)
            </span>
          {/if}
        </div>
        <div class="flex items-center gap-2">
          {#if appliedRecommendations.length > 0}
            <Button size="sm" variant="outline" onclick={handleResetAll}>
              <RotateCcw class="mr-2 h-4 w-4" />
              Reset All ({appliedRecommendations.length})
            </Button>
          {/if}
          <Button size="sm" onclick={() => (analyzeDialogOpen = true)}>
            <Sparkles class="mr-2 h-4 w-4" />
            Analyze Spending
          </Button>
        </div>
      </div>

      <!-- Filters -->
      {#if allRecommendations.length > 0}
        <div class="flex items-center gap-3">
          <div class="text-muted-foreground flex items-center gap-2 text-sm">
            <Filter class="h-4 w-4" />
            <span>Filter by:</span>
          </div>
          <Select.Root type="single" bind:value={typeFilter}>
            <Select.Trigger class="w-[200px]">
              {#if typeFilter === 'all'}
                All Recommendations
              {:else if typeFilter === 'groups'}
                Group Recommendations
              {:else}
                Budget Recommendations
              {/if}
            </Select.Trigger>
            <Select.Content>
              <Select.Item value="all">
                <div class="flex w-full items-center justify-between gap-3">
                  <span>All Recommendations</span>
                  {#if allRecommendations.length > 0}
                    <Badge variant="secondary" class="text-xs">
                      {allRecommendations.length}
                    </Badge>
                  {/if}
                </div>
              </Select.Item>
              <Select.Item value="groups">
                <div class="flex w-full items-center justify-between gap-3">
                  <div class="flex items-center gap-2">
                    <Users class="h-3 w-3" />
                    <span>Group Recommendations</span>
                  </div>
                  {#if groupRecommendationsCount > 0}
                    <Badge variant="secondary" class="text-xs">
                      {groupRecommendationsCount}
                    </Badge>
                  {/if}
                </div>
              </Select.Item>
              <Select.Item value="budgets">
                <div class="flex w-full items-center justify-between gap-3">
                  <span>Budget Recommendations</span>
                  {#if budgetRecommendationsCount > 0}
                    <Badge variant="secondary" class="text-xs">
                      {budgetRecommendationsCount}
                    </Badge>
                  {/if}
                </div>
              </Select.Item>
            </Select.Content>
          </Select.Root>

          {#if typeFilter === 'groups' && groupRecommendationsCount > 0}
            <Badge variant="outline" class="gap-1.5">
              <Users class="h-3 w-3" />
              {groupRecommendationsCount} group recommendation{groupRecommendationsCount !== 1
                ? 's'
                : ''}
            </Badge>
          {:else if typeFilter === 'budgets' && budgetRecommendationsCount > 0}
            <Badge variant="outline">
              {budgetRecommendationsCount} budget recommendation{budgetRecommendationsCount !== 1
                ? 's'
                : ''}
            </Badge>
          {/if}
        </div>
      {/if}

      <!-- Data Table -->
      {#if isLoading}
        <div class="flex items-center justify-center py-12">
          <div class="text-muted-foreground text-sm">Loading recommendations...</div>
        </div>
      {:else}
        <RecommendationDataTable
          columns={tableColumns}
          recommendations={recommendations()}
          onBulkApply={handleBulkApply}
          onBulkDismiss={handleBulkDismiss}
          onRowClick={handleRowClick}
        />
      {/if}
    </div>
  </div>

  <!-- Detail panel (slides from right) -->
  <div
    class={cn(
      'absolute inset-0 overflow-auto transition-transform duration-200 ease-out',
      !showDetailPanel && 'translate-x-full'
    )}
  >
    {#if detailRecommendation}
      <RecommendationDetailPanel
        recommendation={detailRecommendation}
        onBack={handleDetailBack}
        onApply={handleDetailApply}
        onDismiss={handleDetailDismiss}
      />
    {/if}
  </div>
</div>

<!-- Analyze Sheet -->
<AnalyzeSpendingSheet
  bind:open={analyzeDialogOpen}
  onOpenChange={(open) => (analyzeDialogOpen = open)} />

<!-- Group Recommendation Preview Modal -->
<GroupRecommendationPreviewModal
  bind:open={previewModalOpen}
  recommendation={selectedRecommendation}
  {budgets}
  onAccept={handleAcceptGroupRecommendation}
  onReject={handleRejectGroupRecommendation}
  onClose={handleClosePreviewModal} />
