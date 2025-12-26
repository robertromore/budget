<script lang="ts">
import { Button, buttonVariants } from '$lib/components/ui/button';
import * as Empty from '$lib/components/ui/empty';
import * as AlertDialog from '$lib/components/ui/alert-dialog';
import Plus from '@lucide/svelte/icons/plus';
import Tag from '@lucide/svelte/icons/tag';
import BarChart3 from '@lucide/svelte/icons/bar-chart-3';
import FolderCog from '@lucide/svelte/icons/folder-cog';
import { headerActionsMode } from '$lib/stores/header-actions.svelte';
import { CategoriesState } from '$lib/states/entities/categories.svelte';
import { deleteCategoryDialog, deleteCategoryId } from '$lib/states/ui/categories.svelte';
import { categorySearchState } from '$lib/states/ui/category-search.svelte';
import { demoMode } from '$lib/states/ui/demo-mode.svelte';
import { spotlightTour } from '$lib/states/ui/spotlight-tour.svelte';
import EntitySearchToolbar from '$lib/components/shared/search/entity-search-toolbar.svelte';
import CategorySearchResults from './(components)/search/category-search-results.svelte';
import CategoryTreeView from './(components)/tree/category-tree-view.svelte';
import SeedDefaultCategoriesButton from './(components)/seed-default-categories-button.svelte';
import { getContext } from 'svelte';

// Get sheet controls from layout
const sheets = getContext<{
	openGroupManagement: () => void;
	openSeedDefaultCategories: () => void;
}>('categories-sheets');
import type { CategoryTreeNode } from '$lib/types/categories';
import { goto } from '$app/navigation';
import type { Category } from '$lib/schema';
import {
  reorderCategories,
  getCategoryHierarchyTree,
  bulkDeleteCategories as bulkDeleteCategoriesMutation,
} from '$lib/query/categories';
import type { CategoryWithGroup } from '$lib/server/domains/categories/repository';
import { rpc } from '$lib/query';

// Demo mode detection
const isDemoView = $derived(demoMode.isActive);
const isTourActive = $derived(spotlightTour.isActive);
const currentChapter = $derived(spotlightTour.currentChapter);

// Check if we're in categories-page chapter (interactable) vs navigation chapter (view-only)
const isCategoriesPageChapter = $derived(currentChapter?.startsWith('categories-page') ?? false);
const isViewOnly = $derived(isDemoView && isTourActive && !isCategoriesPageChapter);

const categoriesState = $derived(CategoriesState.get());
const categories = $derived(categoriesState.categories.values());

// Use demo data when in demo mode (no conversion needed - already Category type)
const categoriesArray = $derived<Category[]>(
  isDemoView
    ? demoMode.demoCategories
    : Array.from(categories)
);
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

// Load hierarchy tree
const hierarchyTreeQuery = getCategoryHierarchyTree().options();
const hierarchyTree = $derived(hierarchyTreeQuery.data ?? []);

// Computed values - merge group data into categories
const displayedCategories = $derived.by(() => {
  const baseCategories = search.query.trim() ? searchResults : categoriesArray;
  const groupsMap = new Map(
    categoriesWithGroups.map((c) => [
      c.id,
      {
        groupId: c.groupId,
        groupName: c.groupName,
        groupColor: c.groupColor,
        groupIcon: c.groupIcon,
      },
    ])
  );

  return baseCategories.map((cat) => {
    const groupData = groupsMap.get(cat.id);
    return {
      ...cat,
      groupId: groupData?.groupId || null,
      groupName: groupData?.groupName || null,
      groupColor: groupData?.groupColor || null,
      groupIcon: groupData?.groupIcon || null,
    };
  });
});


const shouldShowNoCategories = $derived.by(() => {
  return !search.query.trim() && hasNoCategories;
});

// Dialog state
let deleteDialogId = $derived(deleteCategoryId);
let deleteDialogOpen = $derived(deleteCategoryDialog);

// Bulk delete dialog state
let bulkDeleteDialogOpen = $state(false);
let categoriesToDelete = $state<Category[]>([]);
let isDeletingBulk = $state(false);

// Client-side text search function (advanced filters are in the table toolbar)
const performSearch = () => {
  if (!search.query.trim()) {
    searchResults = [];
    isSearching = false;
    return;
  }

  isSearching = true;

  try {
    const query = search.query.toLowerCase();
    const results = categoriesArray.filter(
      (category) =>
        category.name?.toLowerCase().includes(query) ||
        category.notes?.toLowerCase().includes(query)
    );

    searchResults = results;
    search.setResults(results);
  } catch (error) {
    console.error('Error searching categories:', error);
    searchResults = [];
  } finally {
    isSearching = false;
  }
};

// Track if this is the first run
let isFirstRun = true;

// Debounced search effect
$effect(() => {
  // Track search query reactively
  search.query;

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

const handleReorder = async (reorderedCategories: CategoryWithGroup[]) => {
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
  if (isReorderMode && search.query.trim()) {
    search.clearAllFilters();
  }
};

const toggleHierarchyView = () => {
  showHierarchyView = !showHierarchyView;
  // Clear search when entering hierarchy view
  if (showHierarchyView && search.query.trim()) {
    search.clearAllFilters();
  }
};

const addSubcategory = (parent: CategoryTreeNode) => {
  goto(`/categories/new?parentId=${parent.id}`);
};

// Computed: should show secondary buttons on page
const showSecondaryOnPage = $derived(headerActionsMode.value === 'off');
// Computed: should show primary button on page
const showPrimaryOnPage = $derived(headerActionsMode.value !== 'all');
</script>

<svelte:head>
  <title>Categories - Budget App</title>
  <meta name="description" content="Manage your transaction categories" />
</svelte:head>

<div class="space-y-6" class:pointer-events-none={isViewOnly}>
  <!-- Header -->
  <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between" data-help-id="categories-page-header" data-help-title="Categories Page" data-tour-id="categories-page">
    <div>
      <h1 class="text-2xl font-bold tracking-tight">Categories</h1>
      <p class="text-muted-foreground">
        {#if search.query.trim()}
          {searchResults.length} of {categoriesArray.length} categories
        {:else}
          {categoriesArray.length} categories total
        {/if}
      </p>
    </div>
    <div class="flex items-center gap-2">
      {#if showSecondaryOnPage}
        <SeedDefaultCategoriesButton data-tour-id="seed-categories-button" />
        <Button variant="outline" onclick={() => sheets.openGroupManagement()} data-tour-id="categories-groups-button">
          <FolderCog class="mr-2 h-4 w-4" />
          Group Management
        </Button>
        <Button variant="outline" href="/categories/analytics" data-tour-id="categories-analytics-button">
          <BarChart3 class="mr-2 h-4 w-4" />
          Analytics
        </Button>
      {/if}
      {#if showPrimaryOnPage}
        <Button href="/categories/new" data-tour-id="create-category-button">
          <Plus class="mr-2 h-4 w-4" />
          Add Category
        </Button>
      {/if}
    </div>
  </div>

  <!-- Search and Filters (hidden in hierarchy view) -->
  {#if !showHierarchyView}
    <div class="space-y-4">
      <!-- Search Toolbar -->
      <EntitySearchToolbar
        bind:searchQuery={search.query}
        bind:viewMode={search.viewMode}
        searchPlaceholder="Search categories..."
        onSearchChange={(query) => search.updateQuery(query)}
        onViewModeChange={(mode) => (search.viewMode = mode)}
        onClearAll={() => search.clearAllFilters()} />
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
          Get started by creating your first category. Organize your transactions by categories like
          groceries, utilities, entertainment, and more.
        </Empty.EmptyDescription>
      </Empty.EmptyHeader>
      <Empty.EmptyContent>
        <div class="flex flex-col items-center gap-2 sm:flex-row">
          <SeedDefaultCategoriesButton />
          <span class="text-muted-foreground text-sm">or</span>
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
        <p class="text-muted-foreground text-sm">View and manage parent-child relationships</p>
      </div>
      <CategoryTreeView
        nodes={hierarchyTree}
        onView={viewCategory}
        onEdit={editCategory}
        onDelete={deleteCategory}
        onAddChild={addSubcategory} />
    </div>
  {:else}
    <!-- Search Results -->
    <div data-help-id="categories-list" data-help-title="Categories List" data-tour-id="categories-list">
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
      onReorder={handleReorder} />
    </div>
  {/if}

  <!-- Reorder Mode Help -->
  {#if isReorderMode}
    <div class="text-muted-foreground rounded-lg bg-blue-50 p-3 text-sm dark:bg-blue-950/30">
      <strong>Reorder Mode:</strong> Drag categories to reorder them. Changes are saved
      automatically.
      {#if search.viewMode === 'list'}
        <span class="ml-1 text-orange-600 dark:text-orange-400"
          >(Switch to grid view to enable drag and drop)</span>
      {/if}
    </div>
  {/if}
</div>

<!-- Bulk Delete Confirmation Dialog -->
<AlertDialog.Root bind:open={bulkDeleteDialogOpen}>
  <AlertDialog.Content>
    <AlertDialog.Header>
      <AlertDialog.Title
        >Delete {categoriesToDelete.length} Categor{categoriesToDelete.length > 1
          ? 'ies'
          : 'y'}</AlertDialog.Title>
      <AlertDialog.Description>
        Are you sure you want to delete {categoriesToDelete.length} categor{categoriesToDelete.length >
        1
          ? 'ies'
          : 'y'}? This action cannot be undone.
      </AlertDialog.Description>
    </AlertDialog.Header>
    <AlertDialog.Footer>
      <AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
      <AlertDialog.Action
        onclick={confirmBulkDelete}
        disabled={isDeletingBulk}
        class={buttonVariants({ variant: 'destructive' })}>
        {isDeletingBulk ? 'Deleting...' : 'Delete'}
      </AlertDialog.Action>
    </AlertDialog.Footer>
  </AlertDialog.Content>
</AlertDialog.Root>
