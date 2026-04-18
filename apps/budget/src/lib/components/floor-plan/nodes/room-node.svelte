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
      onclick?.(new MouseEvent("click", { bubbles: true, shiftKey: e.shiftKey }));
      return;
    }
    onkeydown?.(e);
  }

  const nodeLabel = $derived.by(() => {
    const base =
      node.nodeType === "zone"
        ? "Zone"
        : node.nodeType === "site"
          ? "Site"
          : node.nodeType === "building"
            ? "Building"
            : node.nodeType === "level"
              ? "Level"
              : node.nodeType === "slab"
                ? "Slab"
                : node.nodeType === "ceiling"
                  ? "Ceiling"
                  : node.nodeType === "roof"
                    ? "Roof"
                    : "Room";
    return node.name ? `${base}: ${node.name}` : base;
  });

  const nonSelectedRectClass = $derived.by(() => {
    if (node.nodeType === "zone") return "fill-emerald-100 stroke-emerald-400";
    if (node.nodeType === "site") return "fill-sky-100 stroke-sky-400";
    if (node.nodeType === "building") return "fill-indigo-100 stroke-indigo-400";
    if (node.nodeType === "level") return "fill-slate-100 stroke-slate-400";
    if (node.nodeType === "slab") return "fill-zinc-200 stroke-zinc-500";
    if (node.nodeType === "ceiling") return "fill-cyan-100 stroke-cyan-400";
    if (node.nodeType === "roof") return "fill-rose-100 stroke-rose-400";
    if (node.nodeType === "stair") return "fill-amber-100 stroke-amber-500";
    return "fill-muted stroke-border";
  });
</script>

<!-- Selected nodes are reachable by keyboard (Tab); unselected stay out of
     the tab order so a large plan doesn't force the user to tab through
     every rectangle. Arrow keys on a focused selected node nudge it. -->
<g
  class="room-node cursor-pointer outline-none focus-visible:[&_rect:first-of-type]:stroke-primary"
  role="button"
  aria-label={nodeLabel}
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
    class={selected ? 'fill-accent stroke-primary' : nonSelectedRectClass}
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
