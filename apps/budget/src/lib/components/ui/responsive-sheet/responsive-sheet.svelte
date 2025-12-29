<script lang="ts">
import { MediaQuery } from 'svelte/reactivity';
import * as Sheet from '$lib/components/ui/sheet/index.js';
import * as Drawer from '$lib/components/ui/drawer/index.js';
import { fly } from 'svelte/transition';
import type { Snippet } from 'svelte';

interface Props {
  open?: boolean;
  onOpenChange?: ((open: boolean) => void) | undefined;
  side?: 'top' | 'right' | 'bottom' | 'left';
  trigger?: Snippet;
  header?: Snippet;
  content?: Snippet;
  footer?: Snippet;
  children?: Snippet;
  class?: string;
  triggerClass?: string;
  resizable?: boolean;
  defaultWidth?: number;
  minWidth?: number;
  maxWidth?: number;
  /** Hide the overlay backdrop (useful when sheet appears alongside another modal) */
  hideOverlay?: boolean;
  /** Control behavior when clicking outside the sheet */
  interactOutsideBehavior?: 'close' | 'ignore';
  /** Data tour ID for spotlight tour targeting */
  dataTourId?: string;
  /** Render as adjacent panel instead of overlay (pushes main content aside) */
  adjacent?: boolean;
}

let {
  open = $bindable(false),
  onOpenChange,
  side = 'right',
  trigger,
  header,
  content,
  footer,
  children,
  class: className,
  triggerClass,
  resizable = true,
  defaultWidth = 640,
  minWidth = 400,
  maxWidth = 1200,
  hideOverlay = false,
  interactOutsideBehavior,
  dataTourId,
  adjacent = false,
}: Props = $props();

const isDesktop = new MediaQuery('(min-width: 768px)');

// Resize state
let sheetWidth = $state(defaultWidth);
let isResizing = $state(false);

// Handle resize
function handleMouseDown(e: MouseEvent) {
  if (!resizable || !isDesktop.current) return;
  isResizing = true;
  e.preventDefault();
}

function handleMouseMove(e: MouseEvent) {
  if (!isResizing) return;

  const newWidth = side === 'right' ? window.innerWidth - e.clientX : e.clientX;

  sheetWidth = Math.max(minWidth, Math.min(maxWidth, newWidth));
}

function handleMouseUp() {
  isResizing = false;
}

// Handle open state changes
$effect(() => {
  if (onOpenChange) {
    onOpenChange(open);
  }
});

// Add/remove mouse event listeners for resize
$effect(() => {
  if (isResizing) {
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }
  return undefined;
});

// Adjacent mode: add padding to main content when panel is open
$effect(() => {
  if (adjacent && open && isDesktop.current) {
    const mainContent = document.querySelector('main') || document.querySelector('[data-main-content]');
    if (mainContent) {
      const element = mainContent as HTMLElement;
      const paddingProp = side === 'right' ? 'paddingRight' : 'paddingLeft';
      element.style.transition = 'padding 200ms ease-out';
      element.style[paddingProp] = `${sheetWidth}px`;

      return () => {
        element.style[paddingProp] = '';
      };
    }
  }
});
</script>

{#if isDesktop.current && adjacent}
  <!-- Adjacent panel mode - no overlay, sits beside main content -->
  {#if trigger}
    <button type="button" class={triggerClass} onclick={() => (open = !open)}>
      {@render trigger()}
    </button>
  {/if}
  {#if open}
    <aside
      class="bg-background border-border fixed top-0 z-40 flex h-full flex-col border-l shadow-lg {side === 'right' ? 'right-0' : 'left-0 border-l-0 border-r'} {className || ''}"
      style="width: {sheetWidth}px;"
      transition:fly={{ x: side === 'right' ? sheetWidth : -sheetWidth, duration: 200 }}
      data-tour-id={dataTourId}>
      {#if resizable}
        <button
          type="button"
          class="absolute top-0 {side === 'right'
            ? 'left-0 -ml-1'
            : 'right-0 -mr-1'} group z-50 h-full w-2 cursor-col-resize border-0 bg-transparent p-0"
          onmousedown={handleMouseDown}
          aria-label="Resize panel">
          <div class="hover:bg-primary/10 active:bg-primary/20 absolute inset-0 transition-colors">
          </div>
          <div
            class="absolute top-1/2 {side === 'right'
              ? 'left-0'
              : 'right-0'} bg-border group-hover:bg-primary/50 h-16 w-1 -translate-y-1/2 rounded-full transition-colors">
          </div>
        </button>
      {/if}
      {#if header}
        <header class="flex h-16 shrink-0 items-center border-b px-6">
          {@render header()}
        </header>
      {/if}
      <div class="@container flex-1 overflow-auto">
        {#if content}
          <div class="px-6 py-6">
            {@render content()}
          </div>
        {:else if children}
          <div class="px-6 py-6">
            {@render children()}
          </div>
        {/if}
      </div>
      {#if footer}
        <footer class="border-t px-6 py-4">
          {@render footer()}
        </footer>
      {/if}
    </aside>
  {/if}
{:else if isDesktop.current}
  <!-- Overlay sheet mode -->
  <Sheet.Root bind:open>
    {#if trigger}
      <Sheet.Trigger type="button" class={triggerClass}>
        {@render trigger()}
      </Sheet.Trigger>
    {/if}
    <Sheet.Content
      {side}
      class="flex flex-col {className || ''}"
      style="width: {sheetWidth}px; max-width: {sheetWidth}px;"
      overlayClass={hideOverlay ? 'hidden' : undefined}
      {interactOutsideBehavior}
      data-tour-id={dataTourId}>
      {#if resizable}
        <button
          type="button"
          class="absolute top-0 {side === 'right'
            ? 'left-0 -ml-1'
            : 'right-0 -mr-1'} group z-50 h-full w-2 cursor-col-resize border-0 bg-transparent p-0"
          onmousedown={handleMouseDown}
          aria-label="Resize panel">
          <div class="hover:bg-primary/10 active:bg-primary/20 absolute inset-0 transition-colors">
          </div>
          <div
            class="absolute top-1/2 {side === 'right'
              ? 'left-0'
              : 'right-0'} bg-border group-hover:bg-primary/50 h-16 w-1 -translate-y-1/2 rounded-full transition-colors">
          </div>
        </button>
      {/if}
      {#if header}
        <Sheet.Header class="border-b px-6 py-6">
          {@render header()}
        </Sheet.Header>
      {/if}
      <div class="@container flex-1 overflow-auto">
        {#if content}
          <div class="px-6 py-6">
            {@render content()}
          </div>
        {:else if children}
          <div class="px-6 py-6">
            {@render children()}
          </div>
        {/if}
      </div>
      {#if footer}
        <Sheet.Footer class="border-t px-6 py-4">
          {@render footer()}
        </Sheet.Footer>
      {/if}
    </Sheet.Content>
  </Sheet.Root>
{:else}
  <Drawer.Root bind:open>
    {#if trigger}
      <Drawer.Trigger type="button" class={triggerClass}>
        {@render trigger()}
      </Drawer.Trigger>
    {/if}
    <Drawer.Content class="flex max-h-[85vh] flex-col">
      {#if header}
        <Drawer.Header class="border-b px-6 py-6 text-left">
          {@render header()}
        </Drawer.Header>
      {/if}
      <div class="@container flex-1 overflow-auto">
        {#if content}
          <div class="px-6 py-6">
            {@render content()}
          </div>
        {:else if children}
          <div class="px-6 py-6">
            {@render children()}
          </div>
        {/if}
      </div>
      {#if footer}
        <Drawer.Footer class="border-t px-6 py-4">
          {@render footer()}
        </Drawer.Footer>
      {:else}
        <Drawer.Footer class="border-t px-6 py-4">
          <Drawer.Close class="w-full">Close</Drawer.Close>
        </Drawer.Footer>
      {/if}
    </Drawer.Content>
  </Drawer.Root>
{/if}

<style>
/* Prevent text selection during resize */
:global(body.resizing) {
  user-select: none;
  cursor: col-resize !important;
}
</style>
