<script lang="ts">
  import { helpMode } from '$lib/states/ui/help.svelte';
  import * as Tooltip from '$lib/components/ui/tooltip';
  import CircleHelp from '@lucide/svelte/icons/circle-help';
  import { cn } from '$lib/utils';

  interface Props {
    /** The help ID for the documentation to show */
    helpId: string;
    /** Optional custom class */
    class?: string;
  }

  let { helpId, class: className }: Props = $props();

  function handleClick(e: Event) {
    e.stopPropagation();
    e.preventDefault();
    // Only activate help mode (with highlights) if sheet isn't already open
    // If sheet is open, just switch to the new documentation
    if (!helpMode.isSheetOpen) {
      helpMode.activate();
    }
    helpMode.openDocumentation(helpId);
  }
</script>

<Tooltip.Root>
  <Tooltip.Trigger
    type="button"
    class={cn(
      'text-muted-foreground hover:text-foreground transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-sm',
      className
    )}
    onclick={handleClick}
  >
    <CircleHelp class="size-4" />
    <span class="sr-only">Help for this field</span>
  </Tooltip.Trigger>
  <Tooltip.Content>
    <p>Click to view help documentation</p>
  </Tooltip.Content>
</Tooltip.Root>
