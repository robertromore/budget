<script lang="ts">
/**
 * Draggable seam between the sidebar and the main content. Mirrors the
 * resize-handle pattern used by responsive-sheet.svelte: a thin
 * cursor-col-resize button with a hover-highlighted hit area and a centered
 * grip pill, mousedown + window-level listeners.
 *
 * Lives in the root layout, fixed to the viewport so its `left` follows the
 * current width regardless of where it sits in the DOM. Hidden on mobile
 * (sidebar collapses to a Sheet) and when the sidebar is closed.
 */
const MIN_WIDTH = 192;
const MAX_WIDTH = 448;

interface Props {
  width: number;
  /** Called continuously during drag with the new width (clamped). */
  onResize: (next: number) => void;
  /** Called on mouseup with the final width (for persistence). */
  onCommit: (final: number) => void;
  /** Hide while the sidebar is collapsed/offcanvas — the seam is meaningless then. */
  visible?: boolean;
  /**
   * Left rail offset. When > 0, the sidebar starts after the rail and the
   * resize handle has to sit at `railOffset + width`.
   */
  railOffset?: number;
}

let { width, onResize, onCommit, visible = true, railOffset = 0 }: Props = $props();

let isResizing = $state(false);

function clamp(v: number): number {
  return Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, Math.round(v)));
}

function handleMouseDown(e: MouseEvent) {
  e.preventDefault();
  isResizing = true;
}

function handleMouseMove(e: MouseEvent) {
  if (!isResizing) return;
  onResize(clamp(e.clientX - railOffset));
}

function handleMouseUp() {
  if (!isResizing) return;
  isResizing = false;
  onCommit(width);
}

function handleDoubleClick() {
  // Reset to the default and persist.
  const DEFAULT = 256;
  onResize(DEFAULT);
  onCommit(DEFAULT);
}

$effect(() => {
  if (isResizing) {
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    // The sidebar's `transition-[width] duration-200` makes the width change
    // animate over 200ms per step, which feels laggy under a drag. Flag the
    // body so the global CSS rule below disables the transition for the
    // duration of the drag.
    document.body.setAttribute('data-sidebar-resizing', '');

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      document.body.removeAttribute('data-sidebar-resizing');
    };
  }
  return undefined;
});
</script>

{#if visible}
  <button
    type="button"
    aria-label="Resize sidebar"
    style="left: {railOffset + width - 4}px;"
    class="group fixed top-0 z-30 hidden h-svh w-2 cursor-col-resize border-0 bg-transparent p-0 md:block"
    onmousedown={handleMouseDown}
    ondblclick={handleDoubleClick}>
    <div
      class={[
        'hover:bg-primary/10 group-active:bg-primary/20 absolute inset-0 transition-colors',
        isResizing && 'bg-primary/20',
      ]}>
    </div>
    <div
      class={[
        'absolute top-1/2 left-1/2 h-16 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full transition-colors',
        isResizing ? 'bg-primary' : 'bg-border group-hover:bg-primary/50',
      ]}>
    </div>
  </button>
{/if}

<style>
/*
 * Kill the sidebar's width transition while a resize is in progress so the
 * sidebar tracks the cursor instead of animating each tiny step over 200ms.
 * The shadcn sidebar wraps its inner elements under a `[data-side]` div, so
 * targeting `[data-side] > div` hits both the layout gap and the fixed
 * sidebar without affecting other transitions in the page.
 */
:global(body[data-sidebar-resizing] [data-side] > div) {
  transition: none !important;
}
</style>
