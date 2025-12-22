<script lang="ts">
  import type { Snippet } from "svelte";
  import { onMount, untrack } from "svelte";
  import { helpMode } from "$lib/states/ui/help.svelte";
  import ModalHelpOverlay from "./modal-help-overlay.svelte";

  interface Props {
    /** Unique identifier for this modal */
    modalId: string;
    /** Help ID to show documentation for when modal opens (defaults to modalId) */
    defaultHelpId?: string;
    /** Content to render inside the provider */
    children: Snippet;
  }

  let { modalId, defaultHelpId, children }: Props = $props();

  let container = $state<HTMLElement | null>(null);

  const isModalHelpActive = $derived(
    helpMode.isModalHelpActive && helpMode.getCurrentModalId() === modalId
  );

  // Set up modal context when component mounts (if help mode is active)
  onMount(() => {
    // Use untrack to read isActive without creating a dependency
    const isHelpActive = untrack(() => helpMode.isActive);

    if (container && isHelpActive) {
      // Register this modal with the help system
      helpMode.setModalContext(modalId, container);

      // If a specific help ID was provided, use it; otherwise use the modalId
      const helpId = defaultHelpId ?? modalId;
      helpMode.openDocumentation(helpId);
    }

    return () => {
      // Clean up modal context when unmounting
      if (helpMode.getCurrentModalId() === modalId) {
        helpMode.clearModalContext();
      }
    };
  });
</script>

<div
  bind:this={container}
  data-help-modal-id={modalId}
  class="relative contents"
>
  {@render children()}

  {#if isModalHelpActive && container}
    <ModalHelpOverlay {container} {modalId} />
  {/if}
</div>
