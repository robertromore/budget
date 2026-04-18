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
</script>

<!-- Selected wall is reachable by keyboard (Tab). The transparent hit-line
     stays pointer-only; the visible stroke carries the role + aria. -->
<g
  class="wall-node outline-none focus-visible:[&_line:nth-of-type(2)]:stroke-primary"
  role="button"
  aria-label={node.name ? `Wall: ${node.name}` : "Wall"}
  aria-pressed={selected}
  tabindex={selected ? 0 : -1}
  onkeydown={handleKeydown}
>
  <!--
    Invisible pointer hit-target. Keyboard interactions are handled by the
    outer `<g role="button">` wrapper (see its `onkeydown`); this line only
    exists so mouse clicks anywhere near the wall register as a hit. Mark
    it presentational so screen readers don't announce it as a second
    interactive region.
  -->
  <line
    role="presentation"
    aria-hidden="true"
    x1={node.posX}
    y1={node.posY}
    x2={node.x2 ?? node.posX}
    y2={node.y2 ?? node.posY}
    stroke="transparent"
    stroke-width="16"
    class="cursor-pointer"
    onmousedown={onmousedown}
    onclick={onclick}
  />
  <line
    x1={node.posX}
    y1={node.posY}
    x2={node.x2 ?? node.posX}
    y2={node.y2 ?? node.posY}
    class="stroke-foreground/70"
    stroke-width="6"
    stroke-linecap="round"
    opacity={node.opacity}
    style={node.color ? `stroke: ${node.color}` : ''}
  />
  {#if selected}
    <circle cx={node.posX} cy={node.posY} r="5" class="fill-primary" stroke="white" stroke-width="1.5" />
    <circle
      cx={node.x2 ?? node.posX}
      cy={node.y2 ?? node.posY}
      r="5"
      class="fill-primary"
      stroke="white"
      stroke-width="1.5"
    />
  {/if}
</g>
