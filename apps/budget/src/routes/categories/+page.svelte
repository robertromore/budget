<script lang="ts">
import {Button} from '$lib/components/ui/button';
import Plus from '@lucide/svelte/icons/plus';
import Tag from '@lucide/svelte/icons/tag';
import BarChart3 from '@lucide/svelte/icons/bar-chart-3';
import ArrowUpDown from '@lucide/svelte/icons/arrow-up-down';
import {CategoriesState} from '$lib/states/entities/categories.svelte';
import {
  deleteCategoryDialog,
  deleteCategoryId,
} from '$lib/states/ui/categories.svelte';
import {categorySearchState} from '$lib/states/ui/category-search.svelte';
import CategorySearchToolbar from '$lib/components/categories/category-search-toolbar.svelte';
import CategorySearchResults from '$lib/components/categories/category-search-results.svelte';
import {goto} from '$app/navigation';
import type {Category} from '$lib/schema';
import {reorderCategories} from '$lib/query/categories';

const categoriesState = $derived(CategoriesState.get());
const categories = $derived(categoriesState.categories.values());
const categoriesArray = $derived(Array.from(categories));
const hasNoCategories = $derived(categoriesArray.length === 0);

// Search state
const search = categorySearchState;
let searchResults = $state<Category[]>([]);
let isSearching = $state(false);
let isReorderMode = $state(false);

// Sort categories by displayOrder when not searching
const sortedCategoriesArray = $derived.by(() => {
  return [...categoriesArray].sort((a, b) => {
    const orderA = a.displayOrder ?? 0;
    const orderB = b.displayOrder ?? 0;
    return orderA - orderB;
  });
});

// Computed values
const displayedCategories = $derived.by(() => {
  return search.isSearchActive() ? searchResults : sortedCategoriesArray;
});

const shouldShowNoCategories = $derived.by(() => {
  return !search.isSearchActive() && hasNoCategories;
});

// Dialog state
let deleteDialogId = $derived(deleteCategoryId);
let deleteDialogOpen = $derived(deleteCategoryDialog);

// Client-side search and filter function
const performSearch = () => {
  if (!search.isSearchActive()) {
    searchResults = [];
    isSearching = false;
    return;
  }

  isSearching = true;

  try {
    let results = [...categoriesArray];

    // Filter by search query
    if (search.query.trim()) {
      const query = search.query.toLowerCase();
      results = results.filter(category =>
        category.name?.toLowerCase().includes(query) ||
        category.notes?.toLowerCase().includes(query)
      );
    }

    // Filter by hasParent
    if (search.filters.hasParent !== undefined) {
      results = results.filter(category =>
        search.filters.hasParent
          ? category.parentId !== null
          : category.parentId === null
      );
    }

    // Filter by categoryType
    if (search.filters.categoryType) {
      results = results.filter(category =>
        category.categoryType === search.filters.categoryType
      );
    }

    // Filter by isTaxDeductible
    if (search.filters.isTaxDeductible !== undefined) {
      results = results.filter(category =>
        category.isTaxDeductible === search.filters.isTaxDeductible
      );
    }

    // Filter by spendingPriority
    if (search.filters.spendingPriority) {
      results = results.filter(category =>
        category.spendingPriority === search.filters.spendingPriority
      );
    }

    // Filter by isSeasonal
    if (search.filters.isSeasonal !== undefined) {
      results = results.filter(category =>
        category.isSeasonal === search.filters.isSeasonal
      );
    }

    // Filter by isActive
    if (search.filters.isActive !== undefined) {
      results = results.filter(category =>
        category.isActive === search.filters.isActive
      );
    }

    // Sort results
    results.sort((a, b) => {
      let comparison = 0;

      switch (search.sortBy) {
        case 'name':
          comparison = (a.name || '').localeCompare(b.name || '');
          break;
        case 'created':
          comparison = (a.createdAt || '').localeCompare(b.createdAt || '');
          break;
        default:
          comparison = (a.name || '').localeCompare(b.name || '');
      }

      return search.sortOrder === 'asc' ? comparison : -comparison;
    });

    searchResults = results;
    search.setResults(results);
  } catch (error) {
    console.error('Error filtering categories:', error);
    searchResults = [];
  } finally {
    isSearching = false;
  }
};

// Track if this is the first run
let isFirstRun = true;

// Debounced search effect
$effect(() => {
  // Track search state reactively
  search.query;
  search.filters;
  search.sortBy;
  search.sortOrder;

  // Don't set loading state on initial mount
  if (!isFirstRun) {
    isSearching = true;
  }
  isFirstRun = false;

  const timeoutId = setTimeout(() => {
    performSearch();
  }, 300);

  return () => clearTimeout(timeoutId);
});

const deleteCategory = (category: Category) => {
  deleteDialogId.current = category.id;
  deleteDialogOpen.setTrue();
};

const viewCategory = (category: Category) => {
  goto(`/categories/${category.slug}`);
};

const editCategory = (category: Category) => {
  goto(`/categories/${category.slug}/edit`);
};

const viewAnalytics = (category: Category) => {
  goto(`/categories/${category.slug}/analytics`);
};

// Create mutation instance at component initialization
const reorderMutation = reorderCategories.options();

const handleReorder = async (reorderedCategories: Category[]) => {
  const updates = reorderedCategories.map((cat) => ({
    id: cat.id,
    displayOrder: cat.displayOrder ?? 0,
  }));

  try {
    await reorderMutation.mutateAsync(updates);

    // Update CategoriesState with new displayOrder values
    reorderedCategories.forEach((cat) => {
      categoriesState.updateCategory(cat);
    });
  } catch (error) {
    console.error('[handleReorder] Error:', error);
  }
};

const toggleReorderMode = () => {
  isReorderMode = !isReorderMode;
  // Clear search when entering reorder mode
  if (isReorderMode && search.isSearchActive()) {
    search.clearAllFilters();
  }
};
</script>

<svelte:head>
  <title>Categories - Budget App</title>
  <meta name="description" content="Manage your transaction categories" />
</svelte:head>

<div class="space-y-6">
  <!-- Header -->
  <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
    <div>
      <h1 class="text-2xl font-bold tracking-tight">Categories</h1>
      <p class="text-muted-foreground">
        {#if search.isSearchActive()}
          {searchResults.length} of {categoriesArray.length} categories
        {:else}
          {categoriesArray.length} categories total
        {/if}
      </p>
    </div>
    <div class="flex items-center gap-2">
      <Button variant="outline" href="/categories/analytics" disabled={isReorderMode}>
        <BarChart3 class="mr-2 h-4 w-4" />
        Analytics Dashboard
      </Button>
      <Button
        variant={isReorderMode ? 'default' : 'outline'}
        onclick={toggleReorderMode}
        disabled={hasNoCategories}
      >
        <ArrowUpDown class="mr-2 h-4 w-4" />
        {isReorderMode ? 'Done' : 'Reorder'}
      </Button>
      <Button href="/categories/new" disabled={isReorderMode}>
        <Plus class="mr-2 h-4 w-4" />
        Add Category
      </Button>
    </div>
  </div>

  <!-- Search and Filters -->
  <div class="space-y-4">
    <!-- Search Toolbar -->
    <CategorySearchToolbar
      bind:searchQuery={search.query}
      bind:filters={search.filters}
      bind:viewMode={search.viewMode}
      bind:sortBy={search.sortBy}
      bind:sortOrder={search.sortOrder}
      onSearchChange={(query) => search.updateQuery(query)}
      onFiltersChange={(filters) => search.updateFilters(filters)}
      onViewModeChange={(mode) => search.viewMode = mode}
      onSortChange={(sortBy, sortOrder) => {
        search.sortBy = sortBy;
        search.sortOrder = sortOrder;
      }}
      onClearAll={() => search.clearAllFilters()}
    />
  </div>

  <!-- Content -->
  {#if shouldShowNoCategories}
    <!-- Empty State - No Categories -->
    <div class="rounded-lg border border-blue-200 bg-blue-50 p-8 text-center">
      <div class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100">
        <Tag class="h-8 w-8 text-blue-600" />
      </div>
      <h2 class="mb-2 text-xl font-semibold text-blue-900">No Categories Yet</h2>
      <p class="mb-6 text-blue-700 max-w-md mx-auto">
        Get started by creating your first category. You can organize your transactions by categories
        like groceries, utilities, entertainment, and more.
      </p>
      <Button
        href="/categories/new"
        class="bg-blue-600 hover:bg-blue-700">
        <Plus class="mr-2 h-4 w-4" />
        Create Your First Category
      </Button>
    </div>
  {:else}
    <!-- Search Results -->
    <CategorySearchResults
      categories={displayedCategories}
      isLoading={isSearching}
      searchQuery={search.query}
      isReorderMode={isReorderMode}
      onView={viewCategory}
      onEdit={editCategory}
      onDelete={deleteCategory}
      onViewAnalytics={viewAnalytics}
      onReorder={handleReorder}
    />
  {/if}

  <!-- Reorder Mode Help -->
  {#if isReorderMode}
    <div class="text-muted-foreground rounded-lg bg-blue-50 p-3 text-sm dark:bg-blue-950/30">
      <strong>Reorder Mode:</strong> Drag categories to reorder them. Changes are saved automatically.
    </div>
  {/if}
</div>