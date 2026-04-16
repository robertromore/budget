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
  class="room-node cursor-pointer"
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
    fill={node.color ?? "#F3F4F6"}
    stroke={selected ? "#3B82F6" : "#9CA3AF"}
    stroke-width={selected ? 2.5 : 1.5}
    opacity={node.opacity}
    rx="2"
  />
  <!-- Room label -->
  {#if node.name}
    <text
      x={node.posX + node.width / 2}
      y={node.posY + node.height / 2}
      text-anchor="middle"
      dominant-baseline="central"
      font-size="14"
      fill="#4B5563"
      class="pointer-events-none select-none"
    >
      {node.name}
    </text>
  {/if}
  <!-- Selection handles -->
  {#if selected}
    <rect
      x={node.posX - 4}
      y={node.posY - 4}
      width="8"
      height="8"
      fill="#3B82F6"
      stroke="white"
      stroke-width="1"
    />
    <rect
      x={node.posX + node.width - 4}
      y={node.posY - 4}
      width="8"
      height="8"
      fill="#3B82F6"
      stroke="white"
      stroke-width="1"
    />
    <rect
      x={node.posX - 4}
      y={node.posY + node.height - 4}
      width="8"
      height="8"
      fill="#3B82F6"
      stroke="white"
      stroke-width="1"
    />
    <rect
      x={node.posX + node.width - 4}
      y={node.posY + node.height - 4}
      width="8"
      height="8"
      fill="#3B82F6"
      stroke="white"
      stroke-width="1"
    />
  {/if}
</g>
