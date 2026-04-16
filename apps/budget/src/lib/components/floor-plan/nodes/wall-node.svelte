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

<g class="wall-node" role="button" tabindex="-1">
  <!-- Hit area (wider for easier selection) -->
  <line
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
  <!-- Visible wall -->
  <line
    x1={node.posX}
    y1={node.posY}
    x2={node.x2 ?? node.posX}
    y2={node.y2 ?? node.posY}
    stroke={node.color ?? "#374151"}
    stroke-width="6"
    stroke-linecap="round"
    opacity={node.opacity}
  />
  <!-- Selection indicators -->
  {#if selected}
    <circle cx={node.posX} cy={node.posY} r="5" fill="#3B82F6" stroke="white" stroke-width="1.5" />
    <circle
      cx={node.x2 ?? node.posX}
      cy={node.y2 ?? node.posY}
      r="5"
      fill="#3B82F6"
      stroke="white"
      stroke-width="1.5"
    />
  {/if}
</g>
