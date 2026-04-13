<script lang="ts">
import { getHelpContent } from '$lib/content/help';
import { renderMarkdown } from '$lib/utils/markdown-renderer';

interface Props {
  topicIds: string[];
  onTopicSelect: (id: string) => void;
}

let { topicIds, onTopicSelect }: Props = $props();

interface TopicMeta {
  id: string;
  title: string;
  description: string;
}

const topics = $derived.by(() => {
  const result: TopicMeta[] = [];
  for (const id of topicIds) {
    const content = getHelpContent(id);
    if (!content) continue;
    const parsed = renderMarkdown(content);
    result.push({
      id,
      title: parsed.frontmatter.title ?? id.replace(/-/g, ' '),
      description: parsed.frontmatter.description ?? '',
    });
  }
  return result.sort((a, b) => a.title.localeCompare(b.title));
});
</script>

<div class="space-y-1">
  {#each topics as topic (topic.id)}
    <button
      type="button"
      onclick={() => onTopicSelect(topic.id)}
      class="hover:bg-muted w-full rounded-md px-4 py-3 text-left transition-colors">
      <p class="text-sm font-medium">{topic.title}</p>
      {#if topic.description}
        <p class="text-muted-foreground mt-0.5 text-xs">{topic.description}</p>
      {/if}
    </button>
  {/each}
  {#if topics.length === 0}
    <p class="text-muted-foreground py-8 text-center text-sm">No topics in this category.</p>
  {/if}
</div>
