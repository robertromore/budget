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

<!-- svelte-ignore a11y_click_events_have_key_events -->
<g
  class="annotation-node cursor-pointer"
  role="button"
  tabindex="-1"
  onmousedown={onmousedown}
  onclick={onclick}
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
