<script lang="ts">
  import { intelligenceInputMode } from "$lib/states/ui/intelligence-input.svelte";
  import { cn } from "$lib/utils";
  import Brain from "@lucide/svelte/icons/brain";
  import ChevronDown from "@lucide/svelte/icons/chevron-down";
  import Loader2 from "@lucide/svelte/icons/loader-2";
  import Sparkles from "@lucide/svelte/icons/sparkles";
  import IntelligenceInputModePicker from "./intelligence-input-mode-picker.svelte";

  interface Props {
    inputId: string;
    element: HTMLElement;
    /** Whether this highlight is within a modal context */
    isModal?: boolean;
  }

  let { inputId, element, isModal = false }: Props = $props();

  const isHighlighted = $derived(intelligenceInputMode.highlightedId === inputId);
  const isProcessing = $derived(intelligenceInputMode.isProcessing(inputId));
  const title = $derived(intelligenceInputMode.getElementTitle(inputId));
  const currentMode = $derived(intelligenceInputMode.getFieldMode(inputId));
  const availableModes = $derived(intelligenceInputMode.getElementModes(inputId));

  // Track element position
  let rect = $state<DOMRect | null>(null);

  // Mode picker state
  let showModePicker = $state(false);
  let pickerPosition = $state({ x: 0, y: 0 });

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

  async function handleClick(e: MouseEvent) {
    // Check for right-click or ctrl+click to open mode picker
    if (e.button === 2 || e.ctrlKey || e.metaKey) {
      e.preventDefault();
      openModePicker(e.clientX, e.clientY);
      return;
    }

    await intelligenceInputMode.triggerIntelligence(inputId);
  }

  function handleContextMenu(e: MouseEvent) {
    e.preventDefault();
    openModePicker(e.clientX, e.clientY);
  }

  function openModePicker(x: number, y: number) {
    pickerPosition = { x, y };
    showModePicker = true;
  }

  function handleModeSelect(e: CustomEvent<{ mode: "ml" | "llm" }>) {
    // Mode has been selected and saved, now trigger the action
    intelligenceInputMode.triggerIntelligence(inputId);
  }

  function handleModeButtonClick(e: MouseEvent) {
    e.stopPropagation();
    if (rect) {
      // Position picker near the mode button
      const labelY = showLabelBelow ? rect.bottom + 8 : rect.top - 8;
      openModePicker(rect.left, labelY);
    }
  }

  // Determine z-index based on context
  function getZIndex(): string {
    if (isModal) {
      return "z-100";
    }
    return "z-99";
  }

  const zIndex = $derived(getZIndex());

  function handleMouseEnter() {
    intelligenceInputMode.highlightElement(inputId);
  }
</script>

{#if rect}
  <button
    type="button"
    class={cn(
      "pointer-events-auto fixed rounded-lg border-2 transition-all duration-150",
      "focus:outline-none",
      zIndex,
      isProcessing
        ? "cursor-wait border-violet-600 bg-violet-500/20 animate-processing-pulse"
        : "cursor-pointer",
      !isProcessing && isHighlighted
        ? "border-violet-500 bg-violet-500/15 shadow-[0_0_0_2px_hsl(270,70%,60%,0.4),0_0_20px_hsl(270,70%,60%,0.3)]"
        : !isProcessing && "border-violet-400/60 bg-violet-500/5 hover:border-violet-500 hover:bg-violet-500/10"
    )}
    style="
      top: {rect.top - 4}px;
      left: {rect.left - 4}px;
      width: {rect.width + 8}px;
      height: {rect.height + 8}px;
    "
    onclick={handleClick}
    oncontextmenu={handleContextMenu}
    onmouseenter={handleMouseEnter}
    onmouseover={handleMouseEnter}
    onfocus={handleMouseEnter}
    aria-label="Enhance {title} with {currentMode === 'ml' ? 'ML' : 'LLM'}"
    data-processing={isProcessing}
    data-active={isHighlighted}
  >
    <!-- Label tooltip -->
    {#if isHighlighted || isProcessing}
      <span
        class={cn(
          "absolute flex items-center gap-1.5 whitespace-nowrap rounded px-2 py-1 text-xs font-medium shadow-lg",
          isProcessing ? "bg-violet-700" : "bg-violet-600",
          "text-white",
          isModal ? "z-115" : "z-110",
          showLabelRight ? "left-full ml-2 top-1/2 -translate-y-1/2" : "left-0",
          !showLabelRight && (showLabelBelow ? "top-full mt-2" : "bottom-full mb-2")
        )}
      >
        {#if isProcessing}
          <!-- Processing state with spinner -->
          <Loader2 class="h-3 w-3 animate-spin" />
          <span>{title}</span>
          <span class="text-white/70">Enhancing...</span>
        {:else}
          <!-- Mode indicator (clickable span to avoid nested button) -->
          <span
            role="button"
            tabindex={0}
            class="flex cursor-pointer items-center gap-0.5 rounded px-1 py-0.5 transition-colors hover:bg-white/20"
            onclick={handleModeButtonClick}
            onkeydown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                handleModeButtonClick(e as unknown as MouseEvent);
              }
            }}
            aria-label="Change intelligence mode"
          >
            {#if currentMode === "ml"}
              <Brain class="h-3 w-3" />
            {:else}
              <Sparkles class="h-3 w-3" />
            {/if}
            {#if availableModes.length > 1}
              <ChevronDown class="h-2.5 w-2.5" />
            {/if}
          </span>

          <span class="border-l border-white/30 pl-1.5">{title}</span>
          <span class="text-white/70">Click to enhance</span>
        {/if}
      </span>
    {/if}
  </button>
{/if}

<!-- Mode picker popup -->
{#if showModePicker}
  <IntelligenceInputModePicker
    {inputId}
    position={pickerPosition}
    onClose={() => (showModePicker = false)}
    on:select={handleModeSelect}
  />
{/if}

<style>
  @keyframes processing-pulse {
    0%, 100% {
      box-shadow: 0 0 0 3px hsl(270, 80%, 55%, 0.5), 0 0 25px hsl(270, 80%, 55%, 0.4);
      border-color: hsl(270, 80%, 55%);
    }
    50% {
      box-shadow: 0 0 0 5px hsl(270, 90%, 50%, 0.7), 0 0 35px hsl(270, 90%, 50%, 0.6);
      border-color: hsl(270, 90%, 50%);
    }
  }

  .animate-processing-pulse {
    animation: processing-pulse 1.2s ease-in-out infinite;
  }
</style>
