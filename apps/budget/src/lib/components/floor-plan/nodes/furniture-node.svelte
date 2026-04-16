<script lang="ts">
  import type { FloorPlanNode } from "$core/schema/home/home-floor-plan-nodes";

  let {
    node,
    selected = false,
    onmousedown,
    onclick,
  }: {
    node: FloorPlanNode;
    selected?: boolean;
    onmousedown?: (e: MouseEvent) => void;
    onclick?: (e: MouseEvent) => void;
  } = $props();
</script>

<g
  class="furniture-node cursor-pointer"
  role="button"
  tabindex="-1"
  transform="rotate({node.rotation} {node.posX + node.width / 2} {node.posY + node.height / 2})"
  onmousedown={onmousedown}
  onclick={onclick}
>
  <rect
    x={node.posX}
    y={node.posY}
    width={node.width}
    height={node.height}
    fill={node.color ?? "#D97706"}
    stroke={selected ? "#3B82F6" : "#92400E"}
    stroke-width={selected ? 2 : 1}
    opacity={node.opacity}
    rx="3"
  />
  {#if node.name}
    <text
      x={node.posX + node.width / 2}
      y={node.posY + node.height / 2}
      text-anchor="middle"
      dominant-baseline="central"
      font-size="10"
      fill="white"
      class="pointer-events-none select-none"
    >
      {node.name}
    </text>
  {/if}
  {#if selected}
    <rect
      x={node.posX - 1}
      y={node.posY - 1}
      width={node.width + 2}
      height={node.height + 2}
      fill="none"
      stroke="#3B82F6"
      stroke-width="1.5"
      stroke-dasharray="4 2"
    />
  {/if}
</g>
