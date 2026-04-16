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
