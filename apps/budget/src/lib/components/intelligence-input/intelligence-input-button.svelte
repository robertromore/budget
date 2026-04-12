<script lang="ts">
import { browser } from '$app/environment';
import { Button } from '$lib/components/ui/button';
import * as Tooltip from '$lib/components/ui/tooltip';
import { IntelligenceInputSettings } from '$lib/query/intelligence-input-settings';
import { LLMSettings } from '$lib/query';
import { intelligenceInputMode } from '$lib/states/ui/intelligence-input.svelte';
import { Kbd } from '$lib/components/ui/kbd';
import { cn } from '$lib/utils';
import Brain from '@lucide/svelte/icons/brain';
import { onMount } from 'svelte';

// Fetch preferences from query layer
const preferencesQuery = IntelligenceInputSettings.getPreferences().options();
const llmPreferencesQuery = LLMSettings.getPreferences().options();

// Sync state with preferences
$effect(() => {
  if (preferencesQuery.data) {
    intelligenceInputMode.setEnabled(preferencesQuery.data.enabled);
    intelligenceInputMode.setDefaultMode(preferencesQuery.data.defaultMode);
    intelligenceInputMode.loadFieldModes(preferencesQuery.data.fieldModes);
  }
});

// Sync LLM enabled state
$effect(() => {
  intelligenceInputMode.setLLMEnabled(llmPreferencesQuery.data?.enabled ?? false);
});

const isActive = $derived(intelligenceInputMode.isActive);
const isEnabled = $derived(intelligenceInputMode.isEnabled);
const showInHeader = $derived(preferencesQuery.data?.showInHeader ?? true);

// Track whether any intelligence fields exist on the current page
let hasFieldsOnPage = $state(false);

$effect(() => {
  if (!browser) return;

  const check = () => {
    hasFieldsOnPage = document.querySelectorAll('[data-intelligence-id]').length > 0;
  };

  check();

  const observer = new MutationObserver(check);
  observer.observe(document.body, { childList: true, subtree: true });

  return () => observer.disconnect();
});

let shortcutModifier = $state('Ctrl');

onMount(() => {
  shortcutModifier = navigator.platform.includes('Mac') ? '⌘' : 'Ctrl';
});
</script>

{#if isEnabled && showInHeader}
  <Tooltip.Root>
    <Tooltip.Trigger>
      {#snippet child({ props })}
        <Button
          {...props}
          variant="ghost"
          size="icon"
          onclick={() => intelligenceInputMode.toggle()}
          disabled={!hasFieldsOnPage && !isActive}
          aria-label={isActive ? 'Exit intelligence mode' : 'Enter intelligence mode'}
          aria-pressed={isActive}
          data-help-id="intelligence-input-button"
          data-help-title="Intelligence Input Mode"
          class={cn(
            'relative h-8 w-8',
            isActive && 'bg-violet-600 text-white hover:bg-violet-700'
          )}>
          <Brain class="h-4 w-4" />
          {#if isActive}
            <span class="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-success"></span>
          {/if}
        </Button>
      {/snippet}
    </Tooltip.Trigger>
    <Tooltip.Content>
      <p>
        {#if !hasFieldsOnPage && !isActive}
          No intelligence fields on this page
        {:else}
          {isActive ? 'Exit intelligence mode' : 'Intelligence mode'}
          <Kbd class="ml-2">{shortcutModifier}⇧I</Kbd>
        {/if}
      </p>
    </Tooltip.Content>
  </Tooltip.Root>
{/if}
