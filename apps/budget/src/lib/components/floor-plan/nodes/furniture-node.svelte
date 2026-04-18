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

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onclick?.(new MouseEvent("click", { bubbles: true, shiftKey: e.shiftKey }));
      return;
    }
    onkeydown?.(e);
  }

  const nodeLabel = $derived.by(() => {
    if (node.nodeType === "door") return `Door: ${node.name ?? "Door"}`;
    if (node.nodeType === "window") return `Window: ${node.name ?? "Window"}`;
    if (node.nodeType === "appliance") return `Appliance: ${node.name ?? "Appliance"}`;
    if (node.nodeType === "item") return `Item: ${node.name ?? "Item"}`;
    return `Furniture: ${node.name ?? "Furniture"}`;
  });

  /**
   * Anchor convention:
   *   - Doors/windows: posX/posY is the CENTRE (the projection point on the
   *     wall). `store.placeOpening` stores the wall-projection directly,
   *     and the 3D wall-CSG code projects the same (posX, posY) onto the
   *     wall segment to position the cut. 2D must render centre-anchored
   *     to stay consistent across views.
   *   - Furniture / appliances: posX/posY is the TOP-LEFT corner. Keeps
   *     click-to-place semantics the same as before these changes.
   */
  const isOpening = $derived(node.nodeType === "door" || node.nodeType === "window");
  const rectX = $derived(isOpening ? node.posX - node.width / 2 : node.posX);
  const rectY = $derived(isOpening ? node.posY - node.height / 2 : node.posY);
  const centerX = $derived(isOpening ? node.posX : node.posX + node.width / 2);
  const centerY = $derived(isOpening ? node.posY : node.posY + node.height / 2);
</script>

<g
  class="furniture-node cursor-pointer outline-none focus-visible:[&_rect:first-of-type]:stroke-primary"
  role="button"
  aria-label={nodeLabel}
  aria-pressed={selected}
  tabindex={selected ? 0 : -1}
  transform="rotate({node.rotation} {centerX} {centerY})"
  onmousedown={onmousedown}
  onclick={onclick}
  onkeydown={handleKeydown}
>
  <rect
    x={rectX}
    y={rectY}
    width={node.width}
    height={node.height}
    class={selected ? 'fill-accent stroke-primary' : 'fill-accent stroke-accent-foreground/30'}
    stroke-width={selected ? 2 : 1}
    opacity={node.opacity}
    rx="3"
    style={node.color ? `fill: ${node.color}` : ''}
  />
  {#if node.name}
    <text
      x={centerX}
      y={centerY}
      text-anchor="middle"
      dominant-baseline="central"
      font-size="10"
      class="fill-accent-foreground pointer-events-none select-none"
    >
      {node.name}
    </text>
  {/if}
  {#if selected}
    <rect
      x={rectX - 1}
      y={rectY - 1}
      width={node.width + 2}
      height={node.height + 2}
      fill="none"
      class="stroke-primary"
      stroke-width="1.5"
      stroke-dasharray="4 2"
    />
  {/if}
  {#if isOpening && node.parentId === null}
    <!-- Unparented opening marker. Positioned at the top-right corner of
         the rect (not the centre) so it doesn't occlude the name text on
         short windows/doors. Placed outside the rotated transform via the
         group's own rotation so the dot stays at a predictable spot. -->
    <circle
      cx={rectX + node.width + 3}
      cy={rectY - 3}
      r="3"
      class="fill-destructive"
      stroke="white"
      stroke-width="1"
    >
      <title>Not attached to a wall — drag onto a wall to create a 3D opening</title>
    </circle>
  {/if}
</g>
