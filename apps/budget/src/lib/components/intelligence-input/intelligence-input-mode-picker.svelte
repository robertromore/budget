<script lang="ts">
  import { IntelligenceInputSettings } from "$lib/query/intelligence-input-settings";
  import { intelligenceInputMode } from "$lib/states/ui/intelligence-input.svelte";
  import { cn } from "$lib/utils";
  import Brain from "@lucide/svelte/icons/brain";
  import Check from "@lucide/svelte/icons/check";
  import Sparkles from "@lucide/svelte/icons/sparkles";
  import X from "@lucide/svelte/icons/x";
  import { createEventDispatcher } from "svelte";

  interface Props {
    inputId: string;
    position: { x: number; y: number };
    onClose: () => void;
  }

  let { inputId, position, onClose }: Props = $props();

  const dispatch = createEventDispatcher<{
    select: { mode: "ml" | "llm" };
  }>();

  const currentMode = $derived(intelligenceInputMode.getFieldMode(inputId));
  const availableModes = $derived(intelligenceInputMode.getElementModes(inputId));
  const title = $derived(intelligenceInputMode.getElementTitle(inputId));

  // Mutation for persisting field mode
  const setFieldModeMutation = IntelligenceInputSettings.setFieldMode().options();

  function selectMode(mode: "ml" | "llm") {
    // Update local state
    intelligenceInputMode.setFieldMode(inputId, mode);

    // Persist to database
    setFieldModeMutation.mutate({ fieldId: inputId, mode });

    // Dispatch event for form to handle
    dispatch("select", { mode });

    // Close picker
    onClose();
  }

  function handleKeydown(e: KeyboardEvent) {
    switch (e.key) {
      case "Escape":
        e.preventDefault();
        e.stopPropagation();
        onClose();
        break;
      case "m":
      case "M":
        if (availableModes.includes("ml")) {
          e.preventDefault();
          selectMode("ml");
        }
        break;
      case "l":
      case "L":
        if (availableModes.includes("llm")) {
          e.preventDefault();
          selectMode("llm");
        }
        break;
    }
  }

  // Calculate position to keep picker in viewport
  const adjustedPosition = $derived(() => {
    const pickerWidth = 200;
    const pickerHeight = 120;
    const padding = 8;

    let x = position.x;
    let y = position.y;

    // Adjust if would overflow right edge
    if (typeof window !== "undefined") {
      if (x + pickerWidth > window.innerWidth - padding) {
        x = window.innerWidth - pickerWidth - padding;
      }
      // Adjust if would overflow bottom edge
      if (y + pickerHeight > window.innerHeight - padding) {
        y = position.y - pickerHeight - padding;
      }
    }

    return { x, y };
  });
</script>

<svelte:window onkeydown={handleKeydown} />

<!-- Backdrop to close picker -->
<button
  type="button"
  class="fixed inset-0 z-110"
  onclick={onClose}
  aria-label="Close mode picker"
></button>

<!-- Mode picker popup -->
<div
  class="fixed z-120 w-48 rounded-lg border bg-popover p-2 shadow-lg"
  style="left: {adjustedPosition().x}px; top: {adjustedPosition().y}px;"
  role="menu"
  aria-label="Select intelligence mode for {title}"
>
  <div class="mb-2 flex items-center justify-between border-b pb-2">
    <span class="text-xs font-medium text-muted-foreground">Intelligence Mode</span>
    <button
      type="button"
      class="rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
      onclick={onClose}
      aria-label="Close"
    >
      <X class="h-3 w-3" />
    </button>
  </div>

  <div class="space-y-1">
    {#if availableModes.includes("ml")}
      <button
        type="button"
        class={cn(
          "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors",
          "hover:bg-violet-100 dark:hover:bg-violet-900/30",
          currentMode === "ml" && "bg-violet-100 dark:bg-violet-900/30"
        )}
        onclick={() => selectMode("ml")}
        role="menuitem"
      >
        <Brain class="h-4 w-4 text-violet-600" />
        <span class="flex-1 text-left">ML Analysis</span>
        {#if currentMode === "ml"}
          <Check class="h-4 w-4 text-violet-600" />
        {:else}
          <kbd class="rounded bg-muted px-1 text-xs text-muted-foreground">M</kbd>
        {/if}
      </button>
    {/if}

    {#if availableModes.includes("llm")}
      <button
        type="button"
        class={cn(
          "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors",
          "hover:bg-violet-100 dark:hover:bg-violet-900/30",
          currentMode === "llm" && "bg-violet-100 dark:bg-violet-900/30"
        )}
        onclick={() => selectMode("llm")}
        role="menuitem"
      >
        <Sparkles class="h-4 w-4 text-violet-600" />
        <span class="flex-1 text-left">LLM Enhancement</span>
        {#if currentMode === "llm"}
          <Check class="h-4 w-4 text-violet-600" />
        {:else}
          <kbd class="rounded bg-muted px-1 text-xs text-muted-foreground">L</kbd>
        {/if}
      </button>
    {/if}
  </div>

  <div class="mt-2 border-t pt-2">
    <p class="text-xs text-muted-foreground">
      Click or press <kbd class="rounded bg-muted px-1">Enter</kbd> to enhance with selected mode
    </p>
  </div>
</div>
