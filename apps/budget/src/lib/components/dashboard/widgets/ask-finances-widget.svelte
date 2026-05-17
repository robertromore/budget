<!--
  Dashboard quick-launch for the AI chat. Surfaces the assistant as a
  first-class entry point next to the metric widgets so users discover
  it without hunting for the header icon.
-->
<script lang="ts">
import { Button } from '$lib/components/ui/button';
import { aiChat } from '$lib/states/ui/ai-chat.svelte';
import type { DashboardWidget } from '$core/schema/dashboards';
import Sparkles from '@lucide/svelte/icons/sparkles';

let { config }: { config: DashboardWidget } = $props();

interface Suggestion {
  label: string;
  prompt: string;
}

const allSuggestions: Suggestion[] = [
  { label: "What's my balance?", prompt: '/balance' },
  { label: 'Find savings', prompt: '/savings' },
  { label: 'Cash-flow forecast', prompt: '/forecast 3' },
  { label: 'Unusual transactions', prompt: '/anomalies 30' },
];

const visibleSuggestions = $derived.by(() => {
  switch (config.size) {
    case 'small':
      return [];
    case 'medium':
      return allSuggestions.slice(0, 2);
    case 'large':
      return allSuggestions.slice(0, 3);
    default:
      return allSuggestions;
  }
});

function ask(prompt?: string) {
  if (prompt) {
    aiChat.openWithPrompt(prompt, { page: 'dashboard' });
  } else {
    aiChat.open();
  }
}
</script>

<div class="flex flex-col gap-2">
  <Button variant="default" onclick={() => ask()} class="justify-start" size="sm">
    <Sparkles class="mr-2 h-4 w-4"></Sparkles>
    Ask Finances
  </Button>
  {#each visibleSuggestions as suggestion (suggestion.prompt)}
    <Button
      variant="outline"
      onclick={() => ask(suggestion.prompt)}
      class="justify-start text-xs"
      size="sm">
      {suggestion.label}
    </Button>
  {/each}
</div>
