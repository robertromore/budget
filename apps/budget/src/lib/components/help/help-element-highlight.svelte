<script lang="ts">
  import { helpMode } from "$lib/states/ui/help.svelte";
  import { cn } from "$lib/utils";

  interface Props {
    helpId: string;
    element: HTMLElement;
    /** Whether this highlight is within a modal context */
    isModal?: boolean;
  }

  let { helpId, element, isModal = false }: Props = $props();

  // Check if this element opens a modal
  const modalId = $derived(element.dataset.helpModal);

  const isHighlighted = $derived(helpMode.highlightedId === helpId);
  const isSheetOpen = $derived(helpMode.isSheetOpen);
  const title = $derived(helpMode.getElementTitle(helpId));

  // Track element position
  let rect = $state<DOMRect | null>(null);

  // Determine if label should appear below (when element is near top of screen)
  const showLabelBelow = $derived(rect ? rect.top < 60 : false);

  // Determine if label should appear on the right (when element is near left edge)
  const showLabelRight = $derived(rect ? rect.left < 200 : false);

  $effect(() => {
    // Update rect when element changes or on resize
    const updateRect = () => {
      rect = element.getBoundingClientRect();
    };

    updateRect();

    // Watch for position changes
    const resizeObserver = new ResizeObserver(updateRect);
    resizeObserver.observe(element);

    // Also update on scroll
    const scrollHandler = () => updateRect();
    window.addEventListener("scroll", scrollHandler, { passive: true });

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("scroll", scrollHandler);
    };
  });

  function handleClick() {
    if (modalId) {
      // This element opens a modal - trigger the modal with help
      helpMode.openModalWithHelp(modalId, element);
    } else {
      // Check if this is a tab element
      const isTab = element.getAttribute("role") === "tab";

      if (isTab) {
        // Click the underlying tab to switch it
        element.click();

        // Re-scan elements after tab content changes
        requestAnimationFrame(() => {
          helpMode.scanModalElements();
        });
      }

      // Show the documentation
      helpMode.openDocumentation(helpId);
    }
  }

  // Determine z-index based on context
  function getZIndex(): string {
    if (isModal) {
      // Modal elements use higher z-index
      return "z-100";
    }
    // Main elements use lower z-index when sheet is open
    return isSheetOpen ? "z-45" : "z-99";
  }

  const zIndex = $derived(getZIndex());

  function handleMouseEnter() {
    helpMode.highlightElement(helpId);
  }
</script>

{#if rect}
  <button
    type="button"
    class={cn(
      "pointer-events-auto fixed cursor-pointer rounded-lg transition-all duration-150",
      "focus:outline-none",
      zIndex,
      isHighlighted
        ? "bg-blue-600/10 shadow-[inset_0_0_0_2px_rgba(37,99,235,0.5),0_0_0_4px_rgba(37,99,235,0.2),0_0_20px_rgba(37,99,235,0.3)]"
        : "bg-blue-600/5 shadow-[inset_0_0_0_1px_rgba(37,99,235,0.3)] hover:bg-blue-600/10 hover:shadow-[inset_0_0_0_2px_rgba(37,99,235,0.4),0_0_12px_rgba(37,99,235,0.2)]"
    )}
    style="
      top: {rect.top - 4}px;
      left: {rect.left - 4}px;
      width: {rect.width + 8}px;
      height: {rect.height + 8}px;
    "
    onclick={handleClick}
    onmouseenter={handleMouseEnter}
    onmouseover={handleMouseEnter}
    onfocus={handleMouseEnter}
    aria-label="View help for {title}"
  >
    <!-- Label tooltip -->
    {#if isHighlighted && !isSheetOpen}
      <span
        class={cn(
          "bg-blue-600 text-white absolute whitespace-nowrap rounded px-2 py-1 text-xs font-medium shadow-lg",
          isModal ? "z-115" : "z-110",
          showLabelRight ? "left-full ml-2 top-1/2 -translate-y-1/2" : "left-0",
          !showLabelRight && (showLabelBelow ? "top-full mt-2" : "bottom-full mb-2")
        )}
      >
        {title}
        <span class="text-white/70 ml-1">
          {modalId ? "Click to open" : "Click for help"}
        </span>
      </span>
    {/if}
  </button>
{/if}
