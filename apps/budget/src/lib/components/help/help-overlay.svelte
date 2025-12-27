<script lang="ts">
  import { helpMode } from "$lib/states/ui/help.svelte";
  import { demoMode } from "$lib/states/ui/demo-mode.svelte";
  import { onMount } from "svelte";
  import HelpDocumentationSheet from "./help-documentation-sheet.svelte";
  import HelpElementHighlight from "./help-element-highlight.svelte";

  const isActive = $derived(helpMode.isActive);
  const isDemoModeActive = $derived(demoMode.isActive);
  const elements = $derived(helpMode.elements);
  const elementCount = $derived(helpMode.elementCount);
  const isSheetOpen = $derived(helpMode.isSheetOpen);
  const currentDocId = $derived(helpMode.currentDocId);
  const hasModalContext = $derived(helpMode.hasModalContext());

  // Re-scan for elements when help mode is activated or DOM changes
  $effect(() => {
    if (isActive) {
      helpMode.scanForElements();

      // Watch for DOM changes while active
      const observer = new MutationObserver(() => {
        helpMode.scanForElements();
      });

      observer.observe(document.body, {
        childList: true,
        subtree: true,
      });

      return () => observer.disconnect();
    }
  });

  // Announce to screen readers when help mode activates
  $effect(() => {
    if (isActive && elementCount > 0) {
      announceToScreenReader(
        `Help mode activated. ${elementCount} elements available. Use Tab to navigate, Enter to view help, Escape to exit.`
      );
    }
  });

  function announceToScreenReader(message: string) {
    const announcement = document.createElement("div");
    announcement.setAttribute("role", "status");
    announcement.setAttribute("aria-live", "polite");
    announcement.setAttribute("aria-atomic", "true");
    announcement.className = "sr-only";
    announcement.textContent = message;
    document.body.appendChild(announcement);

    setTimeout(() => announcement.remove(), 1000);
  }

  function handleOverlayClick() {
    helpMode.deactivate();
  }

  function handleSheetOpenChange(open: boolean) {
    if (!open) {
      helpMode.closeSheet();
    }
  }

  onMount(() => {
    // Initial scan if already active
    if (isActive) {
      helpMode.scanForElements();
    }
  });
</script>

<!-- Keyboard handler -->
<svelte:window onkeydown={helpMode.handleKeydown} />

{#if isActive}
  <!-- Only show backdrop and darkening when there's no modal context -->
  {#if !hasModalContext}
    <!-- Clickable backdrop to close help mode -->
    <button
      type="button"
      class="fixed inset-0 z-40 cursor-default"
      onclick={handleOverlayClick}
      aria-label="Close help mode"
    ></button>

    <!-- Subtle darkening overlay (pointer-events-none so highlights receive clicks) -->
    <div
      class="bg-black/10 dark:bg-black/20 pointer-events-none fixed inset-0"
      style="z-index: 41;"
      role="presentation"
    ></div>

    <!-- Element highlights (above the visual overlay) -->
    {#each Array.from(elements.entries()) as [helpId, element] (helpId)}
      <HelpElementHighlight {helpId} {element} />
    {/each}
  {/if}

  <!-- Instructions bar - moves up when demo mode banner is visible -->
  <div
    class="bg-blue-600 text-white pointer-events-none fixed left-1/2 z-130 -translate-x-1/2 rounded-lg px-4 py-2 text-sm shadow-lg transition-[bottom] duration-200"
    class:bottom-4={!isDemoModeActive}
    class:bottom-20={isDemoModeActive}
  >
    <span class="font-medium">Help Mode</span>
    <span class="mx-2 opacity-60">|</span>
    <span class="opacity-80">
      <kbd class="bg-white/20 rounded px-1">Tab</kbd> navigate
      <span class="mx-1 opacity-40">|</span>
      <kbd class="bg-white/20 rounded px-1">Enter</kbd> view help
      <span class="mx-1 opacity-40">|</span>
      <kbd class="bg-white/20 rounded px-1">Esc</kbd> exit
    </span>
  </div>

  <!-- Documentation sheet -->
  <HelpDocumentationSheet
    open={isSheetOpen}
    onOpenChange={handleSheetOpenChange}
    helpId={currentDocId}
  />
{/if}

<style>
  /* Screen reader only class */
  :global(.sr-only) {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border-width: 0;
  }
</style>
