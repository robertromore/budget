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

  // Track if we've already set up the modal context
  let hasSetupContext = $state(false);

  // Handle clicks on non-highlighted elements to exit help mode
  function handleContainerClick(e: MouseEvent) {
    // Only process if modal help is active
    if (!isModalHelpActive) return;

    const target = e.target as HTMLElement;

    // Check if click was on a help highlight button (they have aria-label starting with "View help")
    const isHelpHighlight = target.closest('button[aria-label^="View help"]');
    if (isHelpHighlight) return;

    // Allow tab clicks without closing help mode
    const isTabClick = target.closest('[role="tab"]');
    if (isTabClick) {
      // Re-scan elements after tab content changes
      requestAnimationFrame(() => {
        helpMode.scanModalElements();
      });
      return;
    }

    // Click was on a non-highlighted element, exit help mode
    helpMode.deactivate();
  }

  // Set up modal context when help mode becomes active
  function setupModalContext() {
    if (!container || hasSetupContext) return;

    hasSetupContext = true;
    // Register this modal with the help system
    helpMode.setModalContext(modalId, container);

    // If a specific help ID was provided, use it; otherwise use the modalId
    const helpId = defaultHelpId ?? modalId;
    helpMode.openDocumentation(helpId);
  }

  // Watch for help mode activation after component is mounted
  $effect(() => {
    if (helpMode.isActive && container && !hasSetupContext) {
      // Small delay to ensure DOM is ready (no animation delay needed since sheet is already open)
      const timeoutId = setTimeout(setupModalContext, 50);
      return () => clearTimeout(timeoutId);
    }
  });

  // Reset setup flag when help mode is deactivated
  $effect(() => {
    if (!helpMode.isActive) {
      hasSetupContext = false;
    }
  });

  // Set up modal context when component mounts (if help mode is active)
  onMount(() => {
    // Use untrack to read isActive without creating a dependency
    const isHelpActive = untrack(() => helpMode.isActive);
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    if (container && isHelpActive) {
      // Delay registration to allow sheet animation to complete
      // Sheet animation is 500ms (see sheet-content.svelte), add a small buffer
      timeoutId = setTimeout(setupModalContext, 550);
    }

    // Add click listener to detect clicks on non-highlighted elements
    document.addEventListener("click", handleContainerClick, true);

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      document.removeEventListener("click", handleContainerClick, true);
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
