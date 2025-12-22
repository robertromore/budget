<script lang="ts">
  import { helpMode } from "$lib/states/ui/help.svelte";
  import HelpElementHighlight from "./help-element-highlight.svelte";

  interface Props {
    /** The modal container element */
    container: HTMLElement;
    /** The modal ID */
    modalId: string;
  }

  let { container, modalId }: Props = $props();

  // Get elements from modal context
  const elements = $derived(helpMode.modalElements);

  // Re-scan when container changes or modal help becomes active
  $effect(() => {
    if (container && helpMode.isModalHelpActive) {
      helpMode.scanModalElements();
    }
  });
</script>

<!-- Render highlights for each element in the modal -->
{#each [...elements.entries()] as [helpId, element] (helpId)}
  <HelpElementHighlight {helpId} {element} isModal={true} />
{/each}
