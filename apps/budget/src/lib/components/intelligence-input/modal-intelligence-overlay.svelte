<script lang="ts">
  import { intelligenceInputMode } from "$lib/states/ui/intelligence-input.svelte";
  import IntelligenceInputHighlight from "./intelligence-input-highlight.svelte";

  interface Props {
    container: HTMLElement;
    modalId: string;
  }

  let { container, modalId }: Props = $props();

  // Get modal elements from state
  const modalElements = $derived(intelligenceInputMode.modalElements);

  // Convert to array for iteration
  const elementsArray = $derived(
    Array.from(modalElements.entries()).map(([inputId, element]) => ({
      inputId,
      element,
    }))
  );

  // Re-scan when container changes
  $effect(() => {
    if (container && intelligenceInputMode.getCurrentModalId() === modalId) {
      // Small delay to ensure DOM is ready
      setTimeout(() => {
        intelligenceInputMode.scanModalElements();
      }, 10);
    }
  });
</script>

<!--
  Modal intelligence overlay renders highlights for elements within the modal.
  Unlike the main overlay, this doesn't render a darkening backdrop since
  the modal already provides visual separation.
-->
{#each elementsArray as { inputId, element } (inputId)}
  <IntelligenceInputHighlight {inputId} {element} isModal={true} />
{/each}
