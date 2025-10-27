<script lang="ts">
import {Button, buttonVariants} from '$lib/components/ui/button';
import * as Empty from '$lib/components/ui/empty';
import * as AlertDialog from '$lib/components/ui/alert-dialog';
import Plus from '@lucide/svelte/icons/plus';
import Tag from '@lucide/svelte/icons/tag';
import BarChart3 from '@lucide/svelte/icons/bar-chart-3';
import FolderCog from '@lucide/svelte/icons/folder-cog';
import {CategoriesState} from '$lib/states/entities/categories.svelte';
import {
  deleteCategoryDialog,
  deleteCategoryId,
} from '$lib/states/ui/categories.svelte';
import {categorySearchState} from '$lib/states/ui/category-search.svelte';
import EntitySearchToolbar from '$lib/components/shared/search/entity-search-toolbar.svelte';
import CategorySearchFilters from './(components)/search/category-search-filters.svelte';
import CategorySearchResults from './(components)/search/category-search-results.svelte';
import CategoryTreeView from './(components)/tree/category-tree-view.svelte';
import SeedDefaultCategoriesButton from './(components)/seed-default-categories-button.svelte';
import GroupManagementSheet from './(components)/group-management-sheet.svelte';
import type {CategoryTreeNode} from '$lib/types/categories';
import {goto} from '$app/navigation';
import type {Category} from '$lib/schema';
import {reorderCategories, getCategoryHierarchyTree, bulkDeleteCategories as bulkDeleteCategoriesMutation} from '$lib/query/categories';
import type {CategoryWithGroup} from '$lib/server/domains/categories/repository';
import {rpc} from '$lib/query';

const categoriesState = $derived(CategoriesState.get());
const categories = $derived(categoriesState.categories.values());
const categoriesArray = $derived(Array.from(categories));
const hasNoCategories = $derived(categoriesArray.length === 0);

// Fetch categories with group information
const categoriesWithGroupsQuery = rpc.categories.listCategoriesWithGroups().options();
const categoriesWithGroups = $derived(categoriesWithGroupsQuery.data ?? []);

// Search state
const search = categorySearchState;
let searchResults = $state<Category[]>([]);
let isSearching = $state(false);
let isReorderMode = $state(false);
let showHierarchyView = $state(false);
let groupManagementSheetOpen = $state(false);

// Load hierarchy tree
const hierarchyTreeQuery = getCategoryHierarchyTree().options();
const hierarchyTree = $derived(hierarchyTreeQuery.data ?? []);

// Sort categories based on user selection or displayOrder
const sortedCategoriesArray = $derived.by(() => {
  // Create a map of category groups for quick lookup
  const groupsMap = new Map(categoriesWithGroups.map(c => [c.id, c.groupName || '']));

  return [...categoriesArray].sort((a, b) => {
    let comparison = 0;
    const groupA = groupsMap.get(a.id);
    const groupB = groupsMap.get(b.id);

    switch (search.sortBy) {
      case 'name':
        comparison = (a.name || '').localeCompare(b.name || '');
        break;
      case 'group':
        comparison = (groupA || '').localeCompare(groupB || '');
        break;
      case 'created':
        comparison = (a.createdAt || '').localeCompare(b.createdAt || '');
        break;
      default:
        // Default to displayOrder
        const orderA = a.displayOrder ?? 0;
        const orderB = b.displayOrder ?? 0;
        comparison = orderA - orderB;
    }

    return search.sortOrder === 'asc' ? comparison : -comparison;
  });
});

// Computed values - merge group data into categories
const displayedCategories = $derived.by(() => {
  const baseCategories = search.isSearchActive ? searchResults : sortedCategoriesArray;
  const groupsMap = new Map(categoriesWithGroups.map(c => [c.id, {
    groupId: c.groupId,
    groupName: c.groupName,
    groupColor: c.groupColor,
    groupIcon: c.groupIcon
  }]));

  return baseCategories.map(cat => {
    const groupData = groupsMap.get(cat.id);
    return {
      ...cat,
      groupId: groupData?.groupId || null,
      groupName: groupData?.groupName || null,
      groupColor: groupData?.groupColor || null,
      groupIcon: groupData?.groupIcon || null
    };
  });
});

// Sort options for toolbar
const categorySortOptions = [
  {value: 'name' as const, label: 'Name', order: 'asc' as const},
  {value: 'name' as const, label: 'Name', order: 'desc' as const},
  {value: 'group' as const, label: 'Group', order: 'asc' as const},
  {value: 'group' as const, label: 'Group', order: 'desc' as const},
  {value: 'created' as const, label: 'Created', order: 'desc' as const},
];

const shouldShowNoCategories = $derived.by(() => {
  return !search.isSearchActive && hasNoCategories;
});

// Dialog state
let deleteDialogId = $derived(deleteCategoryId);
let deleteDialogOpen = $derived(deleteCategoryDialog);

// Bulk delete dialog state
let bulkDeleteDialogOpen = $state(false);
let categoriesToDelete = $state<Category[]>([]);
let isDeletingBulk = $state(false);

// Client-side search and filter function
const performSearch = () => {
  if (!search.isSearchActive) {
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
    const groupsMap = new Map(categoriesWithGroups.map(c => [c.id, c.groupName || '']));
    results.sort((a, b) => {
      let comparison = 0;
      const groupA = groupsMap.get(a.id);
      const groupB = groupsMap.get(b.id);

      switch (search.sortBy) {
        case 'name':
          comparison = (a.name || '').localeCompare(b.name || '');
          break;
        case 'group':
          comparison = (groupA || '').localeCompare(groupB || '');
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

const bulkDeleteCategories = async (categories: Category[]) => {
  if (categories.length === 0) return;

  categoriesToDelete = categories;
  bulkDeleteDialogOpen = true;
};

// Create mutation instances at component initialization
const reorderMutation = reorderCategories.options();
const bulkDeleteMutation = bulkDeleteCategoriesMutation.options();

const confirmBulkDelete = async () => {
  if (isDeletingBulk || categoriesToDelete.length === 0) return;

  isDeletingBulk = true;
  try {
    const idsToDelete = categoriesToDelete.map((c) => c.id);
    await bulkDeleteMutation.mutateAsync(idsToDelete);

    bulkDeleteDialogOpen = false;
    categoriesToDelete = [];
  } catch (error) {
    console.error('Failed to delete categories:', error);
  } finally {
    isDeletingBulk = false;
  }
};

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
  if (isReorderMode && search.isSearchActive) {
    search.clearAllFilters();
  }
};

const toggleHierarchyView = () => {
  showHierarchyView = !showHierarchyView;
  // Clear search when entering hierarchy view
  if (showHierarchyView && search.isSearchActive) {
    search.clearAllFilters();
  }
};

const addSubcategory = (parent: CategoryTreeNode) => {
  goto(`/categories/new?parentId=${parent.id}`);
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
        {#if search.isSearchActive}
          {searchResults.length} of {categoriesArray.length} categories
        {:else}
          {categoriesArray.length} categories total
        {/if}
      </p>
    </div>
    <div class="flex items-center gap-2">
      <SeedDefaultCategoriesButton />
      <Button variant="outline" onclick={() => groupManagementSheetOpen = true}>
        <FolderCog class="mr-2 h-4 w-4" />
        Group Management
      </Button>
      <Button variant="outline" href="/categories/analytics">
        <BarChart3 class="mr-2 h-4 w-4" />
        Analytics Dashboard
      </Button>
      <Button href="/categories/new">
        <Plus class="mr-2 h-4 w-4" />
        Add Category
      </Button>
    </div>
  </div>

  <!-- Search and Filters (hidden in hierarchy view) -->
  {#if !showHierarchyView}
    <div class="space-y-4">
      <!-- Search Toolbar -->
      <EntitySearchToolbar
        bind:searchQuery={search.query}
        bind:filters={search.filters}
        bind:viewMode={search.viewMode}
        bind:sortBy={search.sortBy}
        bind:sortOrder={search.sortOrder}
        searchPlaceholder="Search categories..."
        sortOptions={categorySortOptions}
        activeFilterCount={Object.keys(search.filters).length}
        onSearchChange={(query) => search.updateQuery(query)}
        onFiltersChange={(filters) => search.updateFilters(filters)}
        onViewModeChange={(mode) => (search.viewMode = mode)}
        onSortChange={(sortBy, sortOrder) => {
          search.sortBy = sortBy;
          search.sortOrder = sortOrder;
        }}
        onClearAll={() => search.clearAllFilters()}>
        {#snippet filterContent()}
          <CategorySearchFilters
            filters={search.filters}
            onFilterChange={(key, value) => search.updateFilter(key, value)}
          />
        {/snippet}
      </EntitySearchToolbar>
    </div>
  {/if}

  <!-- Content -->
  {#if shouldShowNoCategories}
    <!-- Empty State - No Categories -->
    <Empty.Empty>
      <Empty.EmptyMedia variant="icon">
        <Tag class="size-6" />
      </Empty.EmptyMedia>
      <Empty.EmptyHeader>
        <Empty.EmptyTitle>No Categories Yet</Empty.EmptyTitle>
        <Empty.EmptyDescription>
          Get started by creating your first category. Organize your transactions by categories
          like groceries, utilities, entertainment, and more.
        </Empty.EmptyDescription>
      </Empty.EmptyHeader>
      <Empty.EmptyContent>
        <div class="flex flex-col items-center gap-2 sm:flex-row">
          <SeedDefaultCategoriesButton />
          <span class="text-sm text-muted-foreground">or</span>
          <Button href="/categories/new">
            <Plus class="mr-2 h-4 w-4" />
            Create Your First Category
          </Button>
        </div>
      </Empty.EmptyContent>
    </Empty.Empty>
  {:else if showHierarchyView}
    <!-- Hierarchy Tree View -->
    <div class="rounded-lg border p-6">
      <div class="mb-4">
        <h2 class="text-lg font-semibold">Category Hierarchy</h2>
        <p class="text-sm text-muted-foreground">View and manage parent-child relationships</p>
      </div>
      <CategoryTreeView
        nodes={hierarchyTree}
        onView={viewCategory}
        onEdit={editCategory}
        onDelete={deleteCategory}
        onAddChild={addSubcategory}
      />
    </div>
  {:else}
    <!-- Search Results -->
    <CategorySearchResults
      categories={displayedCategories}
      isLoading={isSearching}
      searchQuery={search.query}
      viewMode={search.viewMode}
      {isReorderMode}
      onView={viewCategory}
      onEdit={editCategory}
      onDelete={deleteCategory}
      onBulkDelete={bulkDeleteCategories}
      onViewAnalytics={viewAnalytics}
      onReorder={handleReorder}
    />
  {/if}

  <!-- Reorder Mode Help -->
  {#if isReorderMode}
    <div class="text-muted-foreground rounded-lg bg-blue-50 p-3 text-sm dark:bg-blue-950/30">
      <strong>Reorder Mode:</strong> Drag categories to reorder them. Changes are saved automatically.
      {#if search.viewMode === 'list'}
        <span class="text-orange-600 dark:text-orange-400 ml-1">(Switch to grid view to enable drag and drop)</span>
      {/if}
    </div>
  {/if}
</div>

<!-- Bulk Delete Confirmation Dialog -->
<AlertDialog.Root bind:open={bulkDeleteDialogOpen}>
  <AlertDialog.Content>
    <AlertDialog.Header>
      <AlertDialog.Title>Delete {categoriesToDelete.length} Categor{categoriesToDelete.length > 1 ? 'ies' : 'y'}</AlertDialog.Title>
      <AlertDialog.Description>
        Are you sure you want to delete {categoriesToDelete.length} categor{categoriesToDelete.length > 1 ? 'ies' : 'y'}? This action cannot be undone.
      </AlertDialog.Description>
    </AlertDialog.Header>
    <AlertDialog.Footer>
      <AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
      <AlertDialog.Action
        onclick={confirmBulkDelete}
        disabled={isDeletingBulk}
        class={buttonVariants({variant: 'destructive'})}>
        {isDeletingBulk ? 'Deleting...' : 'Delete'}
      </AlertDialog.Action>
    </AlertDialog.Footer>
  </AlertDialog.Content>
</AlertDialog.Root>

<!-- Group Management Sheet -->
<GroupManagementSheet bind:open={groupManagementSheetOpen} />
