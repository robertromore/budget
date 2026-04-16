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
      onclick?.(new MouseEvent("click", { bubbles: true }));
      return;
    }
    onkeydown?.(e);
  }
</script>

<g
  class="annotation-node cursor-pointer outline-none focus-visible:[&_circle]:stroke-primary"
  role="button"
  aria-label={node.name ? `Annotation: ${node.name}` : "Annotation"}
  aria-pressed={selected}
  tabindex={selected ? 0 : -1}
  onmousedown={onmousedown}
  onclick={onclick}
  onkeydown={handleKeydown}
>
  <circle
    cx={node.posX}
    cy={node.posY}
    r="12"
    class={selected ? 'fill-primary' : 'fill-ring'}
    stroke="white"
    stroke-width="2"
    opacity={node.opacity}
  />
  {#if node.name}
    <text
      x={node.posX}
      y={node.posY + 24}
      text-anchor="middle"
      font-size="11"
      class="fill-muted-foreground pointer-events-none select-none"
    >
      {node.name}
    </text>
  {/if}
</g>
