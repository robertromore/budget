<script lang="ts">
import { Button } from '$lib/components/ui/button';
import { getHelpContent, hasHelpContent } from '$lib/content/help';
import { helpCategories, getCategoryForTopic } from '$lib/content/help/categories';
import { renderMarkdown } from '$lib/utils/markdown-renderer';
import { goto } from '$app/navigation';
import ArrowRight from '@lucide/svelte/icons/arrow-right';
import ChevronRight from '@lucide/svelte/icons/chevron-right';

interface Props {
  topicId: string;
  onNavigateCategory: (categoryId: string) => void;
  onNavigateTopic: (topicId: string) => void;
}

let { topicId, onNavigateCategory, onNavigateTopic }: Props = $props();

const parsedContent = $derived.by(() => {
  const content = getHelpContent(topicId);
  if (!content) return null;
  return renderMarkdown(content);
});

const title = $derived(parsedContent?.frontmatter.title ?? topicId.replace(/-/g, ' '));
const htmlContent = $derived(parsedContent?.html ?? '');
const navigateTo = $derived(parsedContent?.frontmatter.navigateTo as string | undefined);

interface RelatedTopic {
  id: string;
  title: string;
}

const relatedTopics = $derived.by(() => {
  const ids: string[] = (parsedContent?.frontmatter.related ?? []).filter((id: string) => hasHelpContent(id));
  return ids.map((id) => {
    const content = getHelpContent(id);
    if (!content) return { id, title: id.replace(/-/g, ' ') };
    const parsed = renderMarkdown(content);
    return { id, title: parsed.frontmatter.title ?? id.replace(/-/g, ' ') };
  }) as RelatedTopic[];
});

const categoryId = $derived(getCategoryForTopic(topicId));
const category = $derived(helpCategories.find((c) => c.id === categoryId));

function handleNavigateTo() {
  if (navigateTo) goto(navigateTo);
}
</script>

<!-- Breadcrumb -->
<div class="text-muted-foreground mb-4 flex items-center gap-1 text-sm">
  <button type="button" class="hover:text-foreground transition-colors" onclick={() => onNavigateCategory('')}>
    Help
  </button>
  {#if category}
    <ChevronRight class="h-3.5 w-3.5" />
    <button type="button" class="hover:text-foreground transition-colors" onclick={() => onNavigateCategory(category.id)}>
      {category.label}
    </button>
  {/if}
  <ChevronRight class="h-3.5 w-3.5" />
  <span class="text-foreground font-medium">{title}</span>
</div>

<!-- Article -->
{#if parsedContent}
  <article class="prose dark:prose-invert max-w-none">
    <!-- eslint-disable-next-line svelte/no-at-html-tags -->
    {@html htmlContent}
  </article>

  <!-- Navigate to feature -->
  {#if navigateTo}
    <div class="mt-8 border-t pt-6">
      <Button onclick={handleNavigateTo} class="w-full">
        Go there
        <ArrowRight class="ml-2 h-4 w-4" />
      </Button>
    </div>
  {/if}

  <!-- Related topics -->
  {#if relatedTopics.length > 0}
    <div class="mt-8 border-t pt-6">
      <h3 class="mb-3 text-sm font-medium">Related Topics</h3>
      <div class="flex flex-wrap gap-2">
        {#each relatedTopics as topic}
          <Button variant="outline" size="sm" onclick={() => onNavigateTopic(topic.id)}>
            {topic.title}
          </Button>
        {/each}
      </div>
    </div>
  {/if}
{:else}
  <div class="text-muted-foreground py-12 text-center">
    <p>Documentation not found for "{topicId}".</p>
  </div>
{/if}
