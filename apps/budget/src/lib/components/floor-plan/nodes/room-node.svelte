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
    fill={node.color ?? "hsl(var(--muted))"}
    stroke={selected ? "hsl(var(--primary))" : "hsl(var(--border))"}
    stroke-width={selected ? 2.5 : 1.5}
    opacity={node.opacity}
    rx="2"
  />
  {#if node.name}
    <text
      x={node.posX + node.width / 2}
      y={node.posY + node.height / 2}
      text-anchor="middle"
      dominant-baseline="central"
      font-size="14"
      fill="hsl(var(--muted-foreground))"
      class="pointer-events-none select-none"
    >
      {node.name}
    </text>
  {/if}
  {#if selected}
    {#each [[node.posX, node.posY], [node.posX + node.width, node.posY], [node.posX, node.posY + node.height], [node.posX + node.width, node.posY + node.height]] as [cx, cy]}
      <rect x={cx - 4} y={cy - 4} width="8" height="8" fill="hsl(var(--primary))" stroke="white" stroke-width="1" />
    {/each}
  {/if}
</g>
