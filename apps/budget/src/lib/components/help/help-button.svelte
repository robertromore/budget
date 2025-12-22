<script lang="ts">
  import { Button } from "$lib/components/ui/button";
  import * as Tooltip from "$lib/components/ui/tooltip";
  import { helpMode } from "$lib/states/ui/help.svelte";
  import { cn } from "$lib/utils";
  import CircleHelp from "@lucide/svelte/icons/circle-help";

  const isActive = $derived(helpMode.isActive);
</script>

<Tooltip.Root>
  <Tooltip.Trigger>
    {#snippet child({ props })}
      <Button
        {...props}
        variant="ghost"
        size="icon"
        onclick={() => helpMode.toggle()}
        aria-label={isActive ? "Exit help mode" : "Enter help mode"}
        aria-pressed={isActive}
        data-help-id="help-button"
        data-help-title="Help Mode"
        class={cn(
          "relative h-8 w-8",
          isActive && "bg-primary text-primary-foreground hover:bg-primary/90"
        )}
      >
        <CircleHelp class="h-4 w-4" />
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
      {isActive ? "Exit help mode" : "Help mode"}
      <kbd class="bg-accent-foreground ml-2 rounded px-1.5 py-0.5 font-mono text-xs">
        {navigator?.platform?.includes("Mac") ? "Cmd" : "Ctrl"}+Shift+/
      </kbd>
    </p>
  </Tooltip.Content>
</Tooltip.Root>
