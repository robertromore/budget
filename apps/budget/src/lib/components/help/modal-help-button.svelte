<script lang="ts">
  import { helpMode } from "$lib/states/ui/help.svelte";
  import CircleHelp from "@lucide/svelte/icons/circle-help";
  import { cn } from "$lib/utils";

  interface Props {
    /** The modal ID this button is associated with */
    modalId: string;
    /** Optional custom class */
    class?: string;
  }

  let { modalId, class: className }: Props = $props();

  // Only show when main help mode is active or modal help is active
  const isVisible = $derived(
    helpMode.isActive || helpMode.isModalHelpActive
  );

  // Show active indicator when modal help mode is on
  const isModalHelpActive = $derived(
    helpMode.isModalHelpActive && helpMode.getCurrentModalId() === modalId
  );

  function handleClick(e: Event) {
    e.stopPropagation();
    helpMode.toggleModalHelp();
  }
</script>

{#if isVisible}
  <button
    type="button"
    class={cn(
      "ring-offset-background focus-visible:ring-ring rounded-xs transition-opacity focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-hidden disabled:pointer-events-none",
      isModalHelpActive ? "opacity-100 text-primary" : "opacity-70 hover:opacity-100",
      className
    )}
    onclick={handleClick}
    title={isModalHelpActive ? "Hide element highlights" : "Show element highlights"}
  >
    <CircleHelp class="size-4" />
    <span class="sr-only">
      {isModalHelpActive ? "Hide help highlights" : "Show help highlights"}
    </span>
  </button>
{/if}
