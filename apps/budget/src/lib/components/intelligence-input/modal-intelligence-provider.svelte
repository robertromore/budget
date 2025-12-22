<script lang="ts">
  import type { Snippet } from "svelte";
  import { intelligenceInputMode } from "$lib/states/ui/intelligence-input.svelte";
  import ModalIntelligenceOverlay from "./modal-intelligence-overlay.svelte";

  interface Props {
    /** Unique identifier for this modal */
    modalId: string;
    /** Default help content to show when modal opens (optional) */
    defaultHelpId?: string;
    /** Children content */
    children: Snippet;
  }

  let { modalId, defaultHelpId, children }: Props = $props();

  let container = $state<HTMLElement | null>(null);

  // Set up modal context when mounted
  $effect(() => {
    if (container && intelligenceInputMode.isActive) {
      intelligenceInputMode.setModalContext(modalId, container);
    }

    return () => {
      // Only clear if this is still the active modal
      if (intelligenceInputMode.getCurrentModalId() === modalId) {
        intelligenceInputMode.clearModalContext();
      }
    };
  });

  // Re-scan when intelligence mode becomes active while modal is open
  $effect(() => {
    if (intelligenceInputMode.isActive && container) {
      // Delay to ensure DOM is ready
      setTimeout(() => {
        if (intelligenceInputMode.getCurrentModalId() !== modalId) {
          intelligenceInputMode.setModalContext(modalId, container!);
        } else {
          intelligenceInputMode.scanModalElements();
        }
      }, 50);
    }
  });

  const isModalIntelligenceActive = $derived(
    intelligenceInputMode.isActive &&
    intelligenceInputMode.isModalIntelligenceActive &&
    intelligenceInputMode.getCurrentModalId() === modalId
  );
</script>

<div
  bind:this={container}
  data-intelligence-modal-id={modalId}
  class="relative"
>
  {@render children()}

  {#if isModalIntelligenceActive && container}
    <ModalIntelligenceOverlay {container} {modalId} />
  {/if}
</div>
