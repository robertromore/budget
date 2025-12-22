<script lang="ts">
  import { intelligenceInputMode } from "$lib/states/ui/intelligence-input.svelte";
  import { onMount } from "svelte";
  import IntelligenceInputHighlight from "./intelligence-input-highlight.svelte";
  import Loader2 from "@lucide/svelte/icons/loader-2";
  import Sparkles from "@lucide/svelte/icons/sparkles";

  const isActive = $derived(intelligenceInputMode.isActive);
  const elements = $derived(intelligenceInputMode.elements);
  const elementCount = $derived(intelligenceInputMode.elementCount);
  const hasModalContext = $derived(intelligenceInputMode.hasModalContext());
  const highlightedId = $derived(intelligenceInputMode.highlightedId);
  const isProcessingAll = $derived(intelligenceInputMode.isProcessingAll);
  const processedCount = $derived(intelligenceInputMode.processedCount);
  const processingCount = $derived(intelligenceInputMode.processingIds.size);
  const currentMode = $derived(
    highlightedId ? intelligenceInputMode.getFieldMode(highlightedId) : null
  );

  function handleApplyAll() {
    intelligenceInputMode.triggerAllIntelligence();
  }

  // Re-scan for elements when intelligence mode is activated or DOM changes
  $effect(() => {
    if (isActive) {
      intelligenceInputMode.scanForElements();

      // Watch for DOM changes while active
      const observer = new MutationObserver(() => {
        intelligenceInputMode.scanForElements();
      });

      observer.observe(document.body, {
        childList: true,
        subtree: true,
      });

      return () => observer.disconnect();
    }
  });

  // Announce to screen readers when intelligence mode activates
  $effect(() => {
    if (isActive && elementCount > 0) {
      announceToScreenReader(
        `Intelligence input mode activated. ${elementCount} fields available. Use Tab to navigate, Enter to enhance, M for ML mode, L for LLM mode, Escape to exit.`
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
    intelligenceInputMode.deactivate();
  }

  onMount(() => {
    // Initial scan if already active
    if (isActive) {
      intelligenceInputMode.scanForElements();
    }
  });
</script>

<!-- Keyboard handler -->
<svelte:window onkeydown={intelligenceInputMode.handleKeydown} />

{#if isActive}
  <!-- Only show backdrop and darkening when there's no modal context -->
  {#if !hasModalContext}
    <!-- Clickable backdrop to close intelligence mode -->
    <button
      type="button"
      class="fixed inset-0 z-40 cursor-default"
      onclick={handleOverlayClick}
      aria-label="Close intelligence input mode"
    ></button>

    <!-- Subtle darkening overlay (pointer-events-none so highlights receive clicks) -->
    <div
      class="bg-violet-900/10 dark:bg-violet-950/20 pointer-events-none fixed inset-0"
      style="z-index: 41;"
      role="presentation"
    ></div>

    <!-- Element highlights (above the visual overlay) -->
    {#each Array.from(elements.entries()) as [inputId, element] (inputId)}
      <IntelligenceInputHighlight {inputId} {element} />
    {/each}
  {/if}

  <!-- Instructions bar -->
  <div
    class="fixed bottom-4 left-1/2 z-130 flex -translate-x-1/2 items-center gap-3 rounded-lg bg-violet-600 px-4 py-2 text-sm text-white shadow-lg"
  >
    <span class="pointer-events-none font-medium">Intelligence Mode</span>
    <span class="pointer-events-none opacity-60">|</span>

    <!-- Apply All button -->
    <button
      type="button"
      onclick={handleApplyAll}
      disabled={isProcessingAll || elementCount === 0}
      class="flex items-center gap-1.5 rounded bg-white/20 px-2 py-0.5 font-medium transition-colors hover:bg-white/30 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {#if isProcessingAll}
        <Loader2 class="h-3.5 w-3.5 animate-spin" />
        <span>Enhancing...</span>
        <span class="text-white/70">({processedCount}/{elementCount} done)</span>
      {:else}
        <Sparkles class="h-3.5 w-3.5" />
        <span>Apply All</span>
        <kbd class="ml-1 rounded bg-white/20 px-1 text-xs">A</kbd>
      {/if}
    </button>

    <span class="pointer-events-none opacity-60">|</span>
    <span class="pointer-events-none opacity-80">
      <kbd class="rounded bg-white/20 px-1">Tab</kbd> navigate
      <span class="mx-1 opacity-40">|</span>
      <kbd class="rounded bg-white/20 px-1">Enter</kbd> enhance
      <span class="mx-1 opacity-40">|</span>
      <kbd class="rounded bg-white/20 px-1">M</kbd>/<kbd class="rounded bg-white/20 px-1">L</kbd>
      {#if currentMode}
        <span class="ml-0.5 opacity-60">({currentMode.toUpperCase()})</span>
      {/if}
      <span class="mx-1 opacity-40">|</span>
      <kbd class="rounded bg-white/20 px-1">Esc</kbd> exit
    </span>
  </div>
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
