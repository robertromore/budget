<script lang="ts">
  import type { FloorPlanNode } from "$core/schema/home/home-floor-plan-nodes";

  let {
    node,
    selected = false,
    onmousedown,
    onclick,
    onkeydown,
  }: {
    node: FloorPlanNode;
    selected?: boolean;
    onmousedown?: (e: MouseEvent) => void;
    onclick?: (e: MouseEvent) => void;
    onkeydown?: (e: KeyboardEvent) => void;
  } = $props();

  /**
   * Internal keyboard adapter: Enter/Space synthesize a click (so the canvas
   * selection handler can run unmodified). Arrow keys are forwarded to the
   * parent so it can nudge the selection via the store.
   */
  function handleKeydown(e: KeyboardEvent) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onclick?.(new MouseEvent("click", { bubbles: true }));
      return;
    }
    onkeydown?.(e);
  }
</script>

<!-- Selected nodes are reachable by keyboard (Tab); unselected stay out of
     the tab order so a large plan doesn't force the user to tab through
     every rectangle. Arrow keys on a focused selected node nudge it. -->
<g
  class="room-node cursor-pointer outline-none focus-visible:[&_rect:first-of-type]:stroke-primary"
  role="button"
  aria-label={node.name ? `Room: ${node.name}` : "Room"}
  aria-pressed={selected}
  tabindex={selected ? 0 : -1}
  transform="rotate({node.rotation} {node.posX + node.width / 2} {node.posY + node.height / 2})"
  onmousedown={onmousedown}
  onclick={onclick}
  onkeydown={handleKeydown}
>
  <rect
    x={node.posX}
    y={node.posY}
    width={node.width}
    height={node.height}
    class={selected ? 'fill-accent stroke-primary' : 'fill-muted stroke-border'}
    stroke-width={selected ? 2.5 : 1.5}
    opacity={node.opacity}
    rx="2"
    style={node.color ? `fill: ${node.color}` : ''}
  />
  {#if node.name}
    <text
      x={node.posX + node.width / 2}
      y={node.posY + node.height / 2}
      text-anchor="middle"
      dominant-baseline="central"
      font-size="14"
      class="fill-muted-foreground pointer-events-none select-none"
    >
      {node.name}
    </text>
  {/if}
  {#if selected}
    {#each [[node.posX, node.posY], [node.posX + node.width, node.posY], [node.posX, node.posY + node.height], [node.posX + node.width, node.posY + node.height]] as [cx, cy]}
      <rect x={cx - 4} y={cy - 4} width="8" height="8" class="fill-primary" stroke="white" stroke-width="1" />
    {/each}
  {/if}
</g>
