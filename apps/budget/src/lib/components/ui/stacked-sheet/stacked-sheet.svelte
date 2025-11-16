<script lang="ts">
import { MediaQuery } from 'svelte/reactivity';
import * as Sheet from '$lib/components/ui/sheet/index.js';
import * as Drawer from '$lib/components/ui/drawer/index.js';
import type { Snippet } from 'svelte';

interface StackedSheetItem {
  id: string;
  title: string;
  content: Snippet;
  header?: Snippet;
  footer?: Snippet;
  class?: string;
}

interface Props {
  sheets: StackedSheetItem[];
  activeSheetId?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onSheetChange?: (sheetId: string) => void;
  side?: 'top' | 'right' | 'bottom' | 'left';
  offsetDistance?: number;
  trigger?: Snippet;
  class?: string;
}

let {
  sheets = [],
  activeSheetId = $bindable(sheets[0]?.id || ''),
  open = $bindable(false),
  onOpenChange,
  onSheetChange,
  side = 'right',
  offsetDistance = 24,
  trigger,
  class: className = '',
}: Props = $props();

const isDesktop = new MediaQuery('(min-width: 768px)');

// Find active sheet and its index
const activeSheet = $derived(sheets.find((sheet) => sheet.id === activeSheetId));
const activeIndex = $derived(sheets.findIndex((sheet) => sheet.id === activeSheetId));

// Track previous open state to detect transitions
let previousOpen = $state(open);
let internalOpen = $state(open);
let previousActiveIndex = $state(activeIndex);
let isNavigatingBack = $state(false);

// Sync external open with internal
$effect(() => {
  internalOpen = open;
});

// Track navigation direction
$effect(() => {
  if (activeIndex < previousActiveIndex) {
    isNavigatingBack = true;
    // Clear the flag after animation would have completed
    setTimeout(() => {
      isNavigatingBack = false;
    }, 50);
  }
  previousActiveIndex = activeIndex;
});

// Handle internal open changes
$effect(() => {
  // Reset to first sheet when transitioning from closed to open
  if (internalOpen && !previousOpen) {
    activeSheetId = sheets[0]?.id || '';
  }

  // When trying to close from a nested sheet, go back instead
  if (!internalOpen && previousOpen && activeIndex > 0) {
    // Navigate back instead of closing
    const currentIndex = sheets.findIndex((sheet) => sheet.id === activeSheetId);
    if (currentIndex > 0) {
      activeSheetId = sheets[currentIndex - 1].id;
    }
    // Prevent the close from propagating
    internalOpen = true;
    open = true;
  } else {
    // Propagate open state to parent
    open = internalOpen;
  }

  previousOpen = internalOpen;
  onOpenChange?.(open);
});

// Handle sheet navigation
function navigateToSheet(sheetId: string) {
  activeSheetId = sheetId;
  onSheetChange?.(sheetId);
}

function handleKeyDown(event: KeyboardEvent) {
  if (event.key === 'Escape' && activeIndex > 0) {
    event.preventDefault();
    // Navigate back
    const currentIndex = sheets.findIndex((sheet) => sheet.id === activeSheetId);
    if (currentIndex > 0) {
      activeSheetId = sheets[currentIndex - 1].id;
    }
  }
}
</script>

<svelte:window on:keydown={handleKeyDown} />

{#if isDesktop.current}
  <!-- Desktop: Sheet with stacked visual effect -->
  <Sheet.Root bind:open={internalOpen}>
    {#if trigger}
      <Sheet.Trigger type="button">
        {@render trigger()}
      </Sheet.Trigger>
    {/if}

    {#each sheets as sheet, index (sheet.id)}
      {#if index <= activeIndex}
        <Sheet.Content
          {side}
          class="flex flex-col {!isNavigatingBack && index < activeIndex
            ? 'transition-transform duration-300 ease-in-out'
            : ''} {sheet.class || ''} {className}"
          style="
            z-index: {50 + index};
            transform: translateX({!isNavigatingBack && index < activeIndex
            ? -offsetDistance * (activeIndex - index)
            : 0}px);
            opacity: {index === activeIndex ? 1 : 0.7};
            pointer-events: {index === activeIndex ? 'auto' : 'none'};
          ">
          {#if sheet.header}
            <Sheet.Header class="border-b px-6 py-6">
              {#if index > 0 && sheets[index - 1]}
                <button
                  type="button"
                  onclick={goBack}
                  class="text-muted-foreground hover:text-foreground mb-2 flex items-center gap-2 text-sm">
                  ← Back to {sheets[index - 1].title}
                </button>
              {/if}
              {@render sheet.header()}
            </Sheet.Header>
          {:else if sheet.title}
            <Sheet.Header class="border-b px-6 py-6">
              {#if index > 0 && sheets[index - 1]}
                <button
                  type="button"
                  onclick={goBack}
                  class="text-muted-foreground hover:text-foreground mb-2 flex items-center gap-2 text-sm">
                  ← Back to {sheets[index - 1].title}
                </button>
              {/if}
              <Sheet.Title>{sheet.title}</Sheet.Title>
            </Sheet.Header>
          {/if}

          <div class="flex-1 overflow-auto">
            <div class="px-6 py-6">
              {@render sheet.content()}
            </div>
          </div>

          {#if sheet.footer}
            <Sheet.Footer class="border-t px-6 py-4">
              {@render sheet.footer()}
            </Sheet.Footer>
          {/if}
        </Sheet.Content>
      {/if}
    {/each}
  </Sheet.Root>
{:else}
  <!-- Mobile: Nested drawers -->
  <Drawer.Root bind:open={internalOpen}>
    {#if trigger}
      <Drawer.Trigger type="button">
        {@render trigger()}
      </Drawer.Trigger>
    {/if}

    {#if activeSheet}
      <Drawer.Content class="flex max-h-[85vh] flex-col">
        {#if activeSheet.header}
          <Drawer.Header class="border-b px-6 py-6 text-left">
            {#if activeIndex > 0 && sheets[activeIndex - 1]}
              <button
                type="button"
                onclick={goBack}
                class="text-muted-foreground hover:text-foreground mb-2 flex items-center gap-2 text-sm">
                ← Back to {sheets[activeIndex - 1].title}
              </button>
            {/if}
            {@render activeSheet.header()}
          </Drawer.Header>
        {:else if activeSheet.title}
          <Drawer.Header class="border-b px-6 py-6 text-left">
            {#if activeIndex > 0 && sheets[activeIndex - 1]}
              <button
                type="button"
                onclick={goBack}
                class="text-muted-foreground hover:text-foreground mb-2 flex items-center gap-2 text-sm">
                ← Back to {sheets[activeIndex - 1].title}
              </button>
            {/if}
            <Drawer.Title>{activeSheet.title}</Drawer.Title>
          </Drawer.Header>
        {/if}

        <div class="flex-1 overflow-auto">
          <div class="px-6 py-6">
            {@render activeSheet.content()}
          </div>
        </div>

        {#if activeSheet.footer}
          <Drawer.Footer class="border-t px-6 py-4">
            {@render activeSheet.footer()}
          </Drawer.Footer>
        {:else}
          <Drawer.Footer class="border-t px-6 py-4">
            <Drawer.Close class="w-full">Close</Drawer.Close>
          </Drawer.Footer>
        {/if}
      </Drawer.Content>
    {/if}
  </Drawer.Root>
{/if}
