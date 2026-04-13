<script lang="ts">
import { page } from '$app/state';
import { goto } from '$app/navigation';
import { Button } from '$lib/components/ui/button';
import { Separator } from '$lib/components/ui/separator';
import * as Select from '$lib/components/ui/select';
import { getHelpContent } from '$lib/content/help';
import { helpCategories, getTopicsForCategory, getCategoryForTopic } from '$lib/content/help/categories';
import { renderMarkdown } from '$lib/utils/markdown-renderer';
import ArrowLeft from '@lucide/svelte/icons/arrow-left';
import { HelpSidebar, HelpTopicList, HelpTopicDetail, HelpSearchPanel } from './(components)';

// Read state from URL params
const activeCategoryId = $derived(page.url.searchParams.get('category'));
const activeTopicId = $derived(page.url.searchParams.get('topic'));

// When navigating to a topic directly, derive its category
const effectiveCategoryId = $derived(
  activeCategoryId ?? (activeTopicId ? getCategoryForTopic(activeTopicId) ?? null : null)
);

const activeCategory = $derived(helpCategories.find((c) => c.id === effectiveCategoryId));
const topicIds = $derived(effectiveCategoryId ? getTopicsForCategory(effectiveCategoryId) : []);

// Derive the page title from the current view state
const pageTitle = $derived.by(() => {
  if (activeTopicId) {
    const content = getHelpContent(activeTopicId);
    if (content) {
      const parsed = renderMarkdown(content);
      return `${parsed.frontmatter.title ?? activeTopicId} - Help`;
    }
  }
  if (activeCategory) return `${activeCategory.label} - Help`;
  return 'Help & Documentation';
});

function navigateToCategory(categoryId: string) {
  if (categoryId) {
    goto(`/help?category=${categoryId}`, { keepFocus: true });
  } else {
    goto('/help', { keepFocus: true });
  }
}

function navigateToTopic(topicId: string) {
  const cat = getCategoryForTopic(topicId);
  if (cat) {
    goto(`/help?category=${cat}&topic=${topicId}`, { keepFocus: true });
  } else {
    goto(`/help?topic=${topicId}`, { keepFocus: true });
  }
}

function handleBack() {
  if (activeTopicId) {
    // From topic → go to its category list
    navigateToCategory(effectiveCategoryId ?? '');
  } else if (effectiveCategoryId) {
    // From category list → go to help home
    navigateToCategory('');
  } else {
    // From help home → go to app home
    goto('/');
  }
}
</script>

<svelte:head>
  <title>{pageTitle}</title>
</svelte:head>

<div class="container mx-auto py-8">
  <!-- Header -->
  <div class="mb-6 flex items-center gap-4">
    <Button variant="ghost" size="icon" onclick={handleBack}>
      <ArrowLeft class="h-4 w-4" />
    </Button>
    <div>
      <h1 class="text-2xl font-bold">Help & Documentation</h1>
      <p class="text-muted-foreground text-sm">Browse guides and reference for all features</p>
    </div>
  </div>

  <!-- Search -->
  <div class="mb-6">
    <HelpSearchPanel onTopicSelect={navigateToTopic} />
  </div>

  <!-- Mobile category selector -->
  <div class="mb-4 md:hidden">
    <Select.Root
      type="single"
      value={effectiveCategoryId ?? 'all'}
      onValueChange={(value) => { if (value) navigateToCategory(value === 'all' ? '' : value); }}>
      <Select.Trigger class="w-full">
        {activeCategory?.label ?? 'All Categories'}
      </Select.Trigger>
      <Select.Content>
        <Select.Item value="all">All Categories</Select.Item>
        {#each helpCategories as category}
          <Select.Item value={category.id}>{category.label}</Select.Item>
        {/each}
      </Select.Content>
    </Select.Root>
  </div>

  <div class="flex gap-8">
    <!-- Desktop sidebar -->
    <aside class="hidden w-56 shrink-0 md:block">
      <HelpSidebar
        activeCategoryId={effectiveCategoryId}
        onCategorySelect={navigateToCategory} />
    </aside>

    <Separator orientation="vertical" class="hidden h-auto md:block" />

    <!-- Main content -->
    <main class="min-w-0 flex-1">
      {#if activeTopicId}
        <!-- Topic detail view -->
        <HelpTopicDetail
          topicId={activeTopicId}
          onNavigateCategory={navigateToCategory}
          onNavigateTopic={navigateToTopic} />
      {:else if effectiveCategoryId}
        <!-- Topic list for selected category -->
        <div class="mb-4">
          <h2 class="text-lg font-semibold">{activeCategory?.label}</h2>
          {#if activeCategory?.description}
            <p class="text-muted-foreground text-sm">{activeCategory.description}</p>
          {/if}
        </div>
        <HelpTopicList topicIds={topicIds} onTopicSelect={navigateToTopic} />
      {:else}
        <!-- Category grid (home) -->
        <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {#each helpCategories as category}
            {@const Icon = category.icon}
            {@const count = getTopicsForCategory(category.id).length}
            <button
              type="button"
              onclick={() => navigateToCategory(category.id)}
              class="hover:bg-muted/50 flex items-start gap-4 rounded-lg border p-4 text-left transition-colors">
              <div class="bg-primary/10 text-primary rounded-lg p-2.5">
                <Icon class="h-5 w-5" />
              </div>
              <div class="min-w-0 flex-1">
                <p class="font-medium">{category.label}</p>
                <p class="text-muted-foreground mt-0.5 text-sm">{category.description}</p>
                <p class="text-muted-foreground mt-2 text-xs">{count} topic{count !== 1 ? 's' : ''}</p>
              </div>
            </button>
          {/each}
        </div>
      {/if}
    </main>
  </div>
</div>
