<script lang="ts">
import {Button} from '$lib/components/ui/button';
import {ResponsiveSheet} from '$lib/components/ui/responsive-sheet';
import {Separator} from '$lib/components/ui/separator';
import {Badge} from '$lib/components/ui/badge';
import {Checkbox} from '$lib/components/ui/checkbox';
import {Label} from '$lib/components/ui/label';
import {Input} from '$lib/components/ui/input';
import {ScrollArea} from '$lib/components/ui/scroll-area';
import PackagePlus from '@lucide/svelte/icons/package-plus';
import Search from '@lucide/svelte/icons/search';
import {seedDefaultCategories} from '$lib/query/categories';
import {rpc} from '$lib/query';
import {SvelteSet} from 'svelte/reactivity';

let sheetOpen = $state(false);
let searchQuery = $state('');
let selectedSlugs = new SvelteSet<string>();

// Fetch status of default categories
const statusQuery = rpc.categories.getDefaultCategoriesStatus().options();
const status = $derived(statusQuery.data);

// Seed mutation
const seedMutation = seedDefaultCategories.options();

const handleSeed = async () => {
  const slugsArray = Array.from(selectedSlugs);
  await seedMutation.mutateAsync({slugs: slugsArray});
  sheetOpen = false;
  selectedSlugs.clear();
  searchQuery = '';

  // Refetch status
  statusQuery.refetch();
};

const categoryTypeLabels: Record<string, string> = {
  income: 'Income',
  expense: 'Expense',
  savings: 'Savings',
  transfer: 'Transfer',
};

const categoryTypeColors: Record<string, string> = {
  income: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  expense: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  savings: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  transfer: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
};

// Filter available categories (not installed) and by search query
const availableCategories = $derived.by(() => {
  if (!status) return [];

  let categories = status.categories.filter((c) => !c.installed);

  if (searchQuery.trim()) {
    const query = searchQuery.toLowerCase();
    categories = categories.filter(
      (c) => c.name.toLowerCase().includes(query) || c.categoryType.toLowerCase().includes(query)
    );
  }

  return categories;
});

// Group categories by type
const groupedCategories = $derived.by(() => {
  const groups: Record<string, typeof availableCategories> = {};

  for (const category of availableCategories) {
    const type = category.categoryType ?? 'expense';
    if (!groups[type]) {
      groups[type] = [];
    }
    groups[type].push(category);
  }

  return groups;
});

// Toggle individual category
const toggleCategory = (slug: string, checked: boolean) => {
  if (checked) {
    selectedSlugs.add(slug);
  } else {
    selectedSlugs.delete(slug);
  }
};

// Toggle all in a group
const toggleGroup = (type: string, checked: boolean) => {
  const groupCategories = groupedCategories[type] || [];

  if (checked) {
    // Select all in group
    groupCategories.forEach((c) => selectedSlugs.add(c.slug));
  } else {
    // Deselect all in group
    groupCategories.forEach((c) => selectedSlugs.delete(c.slug));
  }
};

// Select all available categories
const selectAll = () => {
  availableCategories.forEach((c) => selectedSlugs.add(c.slug));
};

// Deselect all
const deselectAll = () => {
  selectedSlugs.clear();
};

// Only show button if there are available categories to add
const shouldShowButton = $derived((status?.available ?? 0) > 0);

// Check if a group is fully selected
const isGroupSelected = (type: string) => {
  const groupCategories = groupedCategories[type] || [];
  if (groupCategories.length === 0) return false;
  return groupCategories.every((c) => selectedSlugs.has(c.slug));
};

// Check if a group is partially selected
const isGroupPartiallySelected = (type: string) => {
  const groupCategories = groupedCategories[type] || [];
  if (groupCategories.length === 0) return false;
  const selectedCount = groupCategories.filter((c) => selectedSlugs.has(c.slug)).length;
  return selectedCount > 0 && selectedCount < groupCategories.length;
};

const selectedCount = $derived(selectedSlugs.size);
</script>

{#if shouldShowButton}
  <Button variant="outline" onclick={() => (sheetOpen = true)}>
    <PackagePlus class="mr-2 h-4 w-4" />
    Add Default Categories
    {#if status && status.available > 0}
      <Badge variant="secondary" class="ml-2">
        {status.available}
      </Badge>
    {/if}
  </Button>

  <ResponsiveSheet bind:open={sheetOpen}>
    {#snippet header()}
      <div>
        <h2 class="text-lg font-semibold">Add Default Categories</h2>
        <p class="text-muted-foreground text-sm">
          {#if status}
            Select from {status.available} popular pre-configured categor{status.available === 1
              ? 'y'
              : 'ies'}.
            {#if status.installed > 0}
              ({status.installed} already added)
            {/if}
          {/if}
        </p>
      </div>
    {/snippet}

    {#snippet content()}
      <div class="flex h-full flex-col gap-4">
        <!-- Search -->
        <div class="relative">
          <Search class="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
          <Input
            type="search"
            placeholder="Search categories..."
            bind:value={searchQuery}
            class="pl-9" />
        </div>

        <!-- Selection actions -->
        <div class="flex items-center justify-between gap-2 text-sm">
          <div class="text-muted-foreground">
            {selectedCount} selected
          </div>
          <div class="flex gap-2">
            <Button variant="ghost" size="sm" onclick={selectAll}>Select All</Button>
            {#if selectedCount > 0}
              <Button variant="ghost" size="sm" onclick={deselectAll}>Clear</Button>
            {/if}
          </div>
        </div>

        <Separator />

        <!-- Categories list -->
        <ScrollArea class="flex-1">
          <div class="space-y-6 pb-4">
            {#if availableCategories.length === 0}
              <div class="text-muted-foreground py-8 text-center">
                {#if searchQuery}
                  No categories found matching "{searchQuery}"
                {:else}
                  No categories available to add
                {/if}
              </div>
            {:else}
              {#each Object.entries(groupedCategories) as [type, categories]}
                <div>
                  <!-- Group header -->
                  <div class="bg-background sticky top-0 z-10 mb-3 flex items-center gap-2 py-2">
                    <Checkbox
                      checked={isGroupSelected(type)}
                      indeterminate={isGroupPartiallySelected(type)}
                      onCheckedChange={(checked) => toggleGroup(type, checked ?? false)}
                      id={`group-${type}`} />
                    <Label
                      for={`group-${type}`}
                      class="flex cursor-pointer items-center gap-2 font-semibold">
                      <Badge class={categoryTypeColors[type]}>
                        {categoryTypeLabels[type] || type}
                      </Badge>
                      <span class="text-muted-foreground text-xs font-normal">
                        ({categories.length})
                      </span>
                    </Label>
                  </div>

                  <!-- Categories in group -->
                  <div class="space-y-2 pl-6">
                    {#each categories as category}
                      <div class="flex items-center gap-2">
                        <Checkbox
                          checked={selectedSlugs.has(category.slug)}
                          onCheckedChange={(checked) =>
                            toggleCategory(category.slug, checked ?? false)}
                          id={category.slug} />
                        <Label for={category.slug} class="flex-1 cursor-pointer text-sm">
                          {category.name}
                        </Label>
                      </div>
                    {/each}
                  </div>
                </div>
              {/each}
            {/if}
          </div>
        </ScrollArea>
      </div>
    {/snippet}

    {#snippet footer()}
      <div class="flex w-full gap-2">
        <Button variant="outline" onclick={() => (sheetOpen = false)} class="flex-1">Cancel</Button>
        <Button
          onclick={handleSeed}
          disabled={seedMutation.isPending || selectedCount === 0}
          class="flex-1">
          {seedMutation.isPending
            ? 'Adding...'
            : `Add ${selectedCount} ${selectedCount === 1 ? 'Category' : 'Categories'}`}
        </Button>
      </div>
    {/snippet}
  </ResponsiveSheet>
{/if}
