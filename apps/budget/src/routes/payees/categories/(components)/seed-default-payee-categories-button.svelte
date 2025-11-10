<script lang="ts">
import { Button } from '$lib/components/ui/button';
import { ResponsiveSheet } from '$lib/components/ui/responsive-sheet';
import { Separator } from '$lib/components/ui/separator';
import { Badge } from '$lib/components/ui/badge';
import { Checkbox } from '$lib/components/ui/checkbox';
import { Label } from '$lib/components/ui/label';
import { Input } from '$lib/components/ui/input';
import { ScrollArea } from '$lib/components/ui/scroll-area';
import PackagePlus from '@lucide/svelte/icons/package-plus';
import Search from '@lucide/svelte/icons/search';
import { seedDefaultPayeeCategories, getDefaultPayeeCategoriesStatus, payeeCategoryKeys } from '$lib/query/payee-categories';
import { queryClient } from '$lib/query';
import { SvelteSet } from 'svelte/reactivity';
import { getIconByName } from '$lib/components/ui/icon-picker/icon-categories';

interface Props {
  onCategoriesAdded?: () => void;
}

let { onCategoriesAdded }: Props = $props();

let sheetOpen = $state(false);
let searchQuery = $state('');
let selectedSlugs = new SvelteSet<string>();

// Fetch status of default categories
const statusQuery = getDefaultPayeeCategoriesStatus().options();
const status = $derived(statusQuery.data);

// Seed mutation
const seedMutation = seedDefaultPayeeCategories.options();

const handleSeed = async () => {
  const slugsArray = Array.from(selectedSlugs);
  await seedMutation.mutateAsync({ slugs: slugsArray });
  sheetOpen = false;
  selectedSlugs.clear();
  searchQuery = '';

  // Invalidate and refetch all payee category queries
  await queryClient.invalidateQueries({ queryKey: payeeCategoryKeys.all() });
  await queryClient.invalidateQueries({ queryKey: payeeCategoryKeys.allWithCounts() });
  await queryClient.refetchQueries({ queryKey: payeeCategoryKeys.allWithCounts() });

  // Notify parent to refetch
  onCategoriesAdded?.();
};

// Filter available categories (not installed) and by search query
const availableCategories = $derived.by(() => {
  if (!status) return [];

  let categories = status.categories.filter(c => !c.installed);

  if (searchQuery.trim()) {
    const query = searchQuery.toLowerCase();
    categories = categories.filter(c =>
      c.name.toLowerCase().includes(query) ||
      c.description.toLowerCase().includes(query)
    );
  }

  return categories;
});

// Toggle individual category
const toggleCategory = (slug: string, checked: boolean) => {
  if (checked) {
    selectedSlugs.add(slug);
  } else {
    selectedSlugs.delete(slug);
  }
};

// Check if all available categories are selected
const allSelected = $derived(
  availableCategories.length > 0 &&
  availableCategories.every(c => selectedSlugs.has(c.slug))
);

// Toggle select/deselect all
const toggleSelectAll = () => {
  if (allSelected) {
    selectedSlugs.clear();
  } else {
    availableCategories.forEach(c => selectedSlugs.add(c.slug));
  }
};

// Only show button if there are available categories to add
const shouldShowButton = $derived((status?.available ?? 0) > 0);

const selectedCount = $derived(selectedSlugs.size);
</script>

{#if shouldShowButton}
  <Button variant="outline" onclick={() => sheetOpen = true}>
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
        <h2 class="text-lg font-semibold">Add Default Payee Categories</h2>
        <p class="text-sm text-muted-foreground">
          {#if status}
            Select from {status.available} popular payee organization categor{status.available === 1 ? 'y' : 'ies'}.
            {#if status.installed > 0}
              ({status.installed} already added)
            {/if}
          {/if}
        </p>
      </div>
    {/snippet}

    {#snippet content()}
      <div class="flex flex-col gap-4 h-full">
        <!-- Search -->
        <div class="relative">
          <Search class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search categories..."
            bind:value={searchQuery}
            class="pl-9"
          />
        </div>

        <!-- Selection actions -->
        <div class="flex items-center justify-between gap-2 text-sm">
          <div class="text-muted-foreground">
            {selectedCount} selected
          </div>
          <Button variant="ghost" size="sm" onclick={toggleSelectAll}>
            {allSelected ? 'Deselect All' : 'Select All'}
          </Button>
        </div>

        <Separator />

        <!-- Categories list -->
        <ScrollArea class="flex-1">
          <div class="space-y-2 pb-4">
            {#if availableCategories.length === 0}
              <div class="text-center py-8 text-muted-foreground">
                {#if searchQuery}
                  No categories found matching "{searchQuery}"
                {:else}
                  No categories available to add
                {/if}
              </div>
            {:else}
              {#each availableCategories as category}
                <div class="flex items-start gap-3 rounded-lg border p-3 hover:bg-accent/50 transition-colors">
                  <Checkbox
                    checked={selectedSlugs.has(category.slug)}
                    onCheckedChange={(checked) => toggleCategory(category.slug, checked ?? false)}
                    id={category.slug}
                    class="mt-1"
                  />
                  <Label
                    for={category.slug}
                    class="flex-1 cursor-pointer space-y-1"
                  >
                    <div class="flex items-center gap-2">
                      {#if category.icon}
                        {@const iconData = getIconByName(category.icon)}
                        {#if iconData?.icon}
                          <iconData.icon class="h-4 w-4" />
                        {/if}
                      {/if}
                      <span class="font-medium">{category.name}</span>
                    </div>
                    {#if category.description}
                      <p class="text-xs text-muted-foreground">
                        {category.description}
                      </p>
                    {/if}
                  </Label>
                </div>
              {/each}
            {/if}
          </div>
        </ScrollArea>
      </div>
    {/snippet}

    {#snippet footer()}
      <div class="flex gap-2 w-full">
        <Button variant="outline" onclick={() => sheetOpen = false} class="flex-1">
          Cancel
        </Button>
        <Button
          onclick={handleSeed}
          disabled={seedMutation.isPending || selectedCount === 0}
          class="flex-1"
        >
          {seedMutation.isPending ? 'Adding...' : `Add ${selectedCount} ${selectedCount === 1 ? 'Category' : 'Categories'}`}
        </Button>
      </div>
    {/snippet}
  </ResponsiveSheet>
{/if}
