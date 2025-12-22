<script lang="ts">
  import { Button } from "$lib/components/ui/button";
  import * as Tooltip from "$lib/components/ui/tooltip";
  import { IntelligenceInputSettings } from "$lib/query/intelligence-input-settings";
  import { intelligenceInputMode } from "$lib/states/ui/intelligence-input.svelte";
  import { cn } from "$lib/utils";
  import Brain from "@lucide/svelte/icons/brain";

  // Fetch preferences from query layer
  const preferencesQuery = IntelligenceInputSettings.getPreferences().options();

  // Sync state with preferences
  $effect(() => {
    if (preferencesQuery.data) {
      intelligenceInputMode.setEnabled(preferencesQuery.data.enabled);
      intelligenceInputMode.setDefaultMode(preferencesQuery.data.defaultMode);
      intelligenceInputMode.loadFieldModes(preferencesQuery.data.fieldModes);
    }
  });

  const isActive = $derived(intelligenceInputMode.isActive);
  const isEnabled = $derived(intelligenceInputMode.isEnabled);
  const showInHeader = $derived(preferencesQuery.data?.showInHeader ?? true);
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
          aria-label={isActive ? "Exit intelligence mode" : "Enter intelligence mode"}
          aria-pressed={isActive}
          data-help-id="intelligence-input-button"
          data-help-title="Intelligence Input Mode"
          class={cn(
            "relative h-8 w-8",
            isActive && "bg-violet-600 text-white hover:bg-violet-700"
          )}
        >
          <Brain class="h-4 w-4" />
          {#if isActive}
            <span
              class="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-green-500"
            ></span>
          {/if}
        </Button>
      {/snippet}
    </Tooltip.Trigger>
    <Tooltip.Content>
      <p>
        {isActive ? "Exit intelligence mode" : "Intelligence mode"}
        <kbd class="bg-accent-foreground ml-2 rounded px-1.5 py-0.5 font-mono text-xs">
          {navigator?.platform?.includes("Mac") ? "Cmd" : "Ctrl"}+Shift+I
        </kbd>
      </p>
    </Tooltip.Content>
  </Tooltip.Root>
{/if}
