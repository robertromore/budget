<script lang="ts">
  import {Button} from "$lib/components/ui/button";
  import {Sparkles} from "@lucide/svelte/icons";
  import AnalyzeSpendingSheet from "./analyze-spending-sheet.svelte";
  import RecommendationSearchFilters from "./recommendation-search-filters.svelte";
  import RecommendationSearchResults from "./recommendation-search-results.svelte";
  import EntitySearchToolbar from "$lib/components/shared/search/entity-search-toolbar.svelte";
  import {listRecommendations, applyRecommendation, dismissRecommendation} from "$lib/query/budgets";
  import {recommendationSearchState} from "$lib/states/ui/recommendation-search.svelte";

  interface Props {
    budgetId?: number;
    accountId?: number;
    categoryId?: number;
  }

  let {budgetId, accountId, categoryId}: Props = $props();

  let analyzeDialogOpen = $state(false);

  // Use centralized search state
  const search = recommendationSearchState;

  // Merge props with filters
  const filters = $derived.by(() => {
    const f = {...search.filters};
    if (budgetId) f.budgetId = budgetId;
    if (accountId) f.accountId = accountId;
    if (categoryId) f.categoryId = categoryId;
    return f;
  });

  const recommendationsQuery = $derived(listRecommendations(filters).options());
  const recommendations = $derived(recommendationsQuery.data ?? []);
  const isLoading = $derived(recommendationsQuery.isLoading);

  // Sort options for toolbar
  const sortOptions = [
    {value: 'priority' as const, label: 'Priority', order: 'desc' as const},
    {value: 'priority' as const, label: 'Priority', order: 'asc' as const},
    {value: 'confidence' as const, label: 'Confidence', order: 'desc' as const},
    {value: 'confidence' as const, label: 'Confidence', order: 'asc' as const},
    {value: 'created' as const, label: 'Created', order: 'desc' as const},
    {value: 'created' as const, label: 'Created', order: 'asc' as const},
  ];

  // Apply filter to search state
  const filteredRecommendations = $derived.by(() => {
    let filtered = [...recommendations];

    // Apply search filter
    if (search.query.trim()) {
      const term = search.query.toLowerCase();
      filtered = filtered.filter(rec =>
        rec.title.toLowerCase().includes(term) ||
        rec.description.toLowerCase().includes(term)
      );
    }

    // Apply client-side sorting
    filtered.sort((a, b) => {
      // First, always sort by status: pending/applied/expired first, dismissed last
      const statusOrder = {
        pending: 1,
        applied: 2,
        expired: 3,
        dismissed: 4
      };
      const statusComparison = (statusOrder[a.status] || 0) - (statusOrder[b.status] || 0);
      if (statusComparison !== 0) {
        return statusComparison;
      }

      // Then apply the selected sort field
      let comparison = 0;
      switch (search.sortBy) {
        case 'created':
          comparison = (a.createdAt || '').localeCompare(b.createdAt || '');
          break;
        case 'confidence':
          comparison = (a.confidence || 0) - (b.confidence || 0);
          break;
        case 'priority': {
          const priorityOrder = {high: 3, medium: 2, low: 1};
          comparison = (priorityOrder[a.priority] || 0) - (priorityOrder[b.priority] || 0);
          break;
        }
        case 'type':
          comparison = a.type.localeCompare(b.type);
          break;
        default:
          comparison = 0;
      }
      return search.sortOrder === 'asc' ? comparison : -comparison;
    });

    return filtered;
  });

  // Mutations
  const applyMutation = applyRecommendation.options();
  const dismissMutation = dismissRecommendation.options();

  function handleApply(recommendation: typeof recommendations[0]) {
    applyMutation.mutate(recommendation.id);
  }

  function handleDismiss(recommendation: typeof recommendations[0]) {
    dismissMutation.mutate(recommendation.id);
  }
</script>

<div class="space-y-4">
  <!-- Header -->
  <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
    <div class="flex items-center gap-2">
      <Sparkles class="h-5 w-5 text-primary" />
      <h2 class="text-lg font-semibold">Budget Recommendations</h2>
    </div>
    <Button size="sm" onclick={() => (analyzeDialogOpen = true)}>
      <Sparkles class="mr-2 h-4 w-4" />
      Analyze Spending
    </Button>
  </div>

  <!-- Search Toolbar -->
  <EntitySearchToolbar
    bind:searchQuery={search.query}
    bind:filters={search.filters}
    bind:viewMode={search.viewMode}
    bind:sortBy={search.sortBy}
    bind:sortOrder={search.sortOrder}
    searchPlaceholder="Search recommendations..."
    {sortOptions}
    activeFilterCount={search.hasActiveFilters ? Object.keys(search.filters).length : 0}
    onSearchChange={(query) => search.updateQuery(query)}
    onFiltersChange={(filters) => search.updateFilters(filters)}
    onViewModeChange={(mode) => (search.viewMode = mode)}
    onSortChange={(sortBy, sortOrder) => {
      search.sortBy = sortBy as any;
      search.sortOrder = sortOrder;
    }}
    onClearAll={() => search.clearAllFilters()}>
    {#snippet filterContent()}
      <RecommendationSearchFilters
        filters={search.filters}
        onFilterChange={(key, value) => search.updateFilter(key, value)}
      />
    {/snippet}
  </EntitySearchToolbar>

  <!-- Recommendations List -->
  <RecommendationSearchResults
    recommendations={filteredRecommendations}
    {isLoading}
    searchQuery={search.query}
    viewMode={search.viewMode}
    onApply={handleApply}
    onDismiss={handleDismiss}
  />
</div>

<!-- Analyze Sheet -->
<AnalyzeSpendingSheet bind:open={analyzeDialogOpen} onOpenChange={(open) => (analyzeDialogOpen = open)} />
